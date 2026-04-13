import type { Page } from "playwright";

import type { SubmissionPayload } from "@/modules/submission/submission.schema";
import { authService, ReAuthRequiredError } from "@/server/auth/auth-service";
import {
  browserFactory,
  type BrowserSession
} from "@/server/automation/browser-factory";
import { withRetries } from "@/server/automation/retry";
import { fillBranchPage } from "@/server/automation/form/page2/branch-router";
import { fillCommonPage } from "@/server/automation/form/page1-common";
import { fillRemarksPage } from "@/server/automation/form/page3-remarks";
import { sessionValidator } from "@/server/auth/session-validator";
import { configService } from "@/server/config/config-service";
import { historyRepository } from "@/server/history/history-repository";
import { createLogger } from "@/server/logging/logger";
import { artifactService } from "@/server/reports/artifact-service";
import { runStore } from "@/server/runs/run-store";
import type { RunRecord } from "@/server/runs/run-types";

class AutomationRunner {
  async execute(runId: string, submission: SubmissionPayload): Promise<RunRecord> {
    const logger = createLogger(runId);
    const config = await configService.getConfig();
    let session: BrowserSession | null = null;
    let page: Page | null = null;

    runStore.setRunning(runId);

    try {
      await authService.assertValidSession();
      runStore.addProgress(runId, "SESSION_LOADED", "Saved session loaded");
      await logger.info("run.session.loaded", {
        callStatus: submission.callStatus,
        mode: submission.mode
      });

      session = await browserFactory.createSession({
        debug: submission.debug,
        useSavedSession: true
      });

      await withRetries(
        async () => {
          if (!session) {
            throw new Error("Browser session could not be created.");
          }

          if (page) {
            await page.close().catch(() => undefined);
          }

          page = await session.context.newPage();
          await page.goto(config.formUrl, {
            waitUntil: "domcontentloaded",
            timeout: 60_000
          });

          const validation = await sessionValidator.validateFormAccess(page);
          if (validation.state !== "VALID") {
            throw new ReAuthRequiredError(validation.reason);
          }

          await fillCommonPage(page, submission);
          await fillBranchPage(page, submission);
        },
        Math.max(1, config.maxRetries),
        async (attempt, error) => {
          await logger.warn("run.pre_submit.retry", {
            attempt,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      );

      runStore.addProgress(runId, "FORM_OPENED", "Form opened");
      runStore.addProgress(runId, "COMMON_FIELDS_FILLED", "Common fields filled");
      runStore.addProgress(runId, "BRANCH_FIELDS_FILLED", "Branch page filled");

      if (!page) {
        throw new Error("Browser page was not created.");
      }

      const remarksResult = await fillRemarksPage(page, submission);
      runStore.addProgress(runId, "REMARKS_FILLED", "Remarks filled");
      const finalStep = remarksResult.submitted
        ? "SUBMIT_COMPLETED"
        : "DRY_RUN_COMPLETED";
      const finalLabel = remarksResult.submitted
        ? "Submit completed"
        : "Dry run completed";

      runStore.addProgress(runId, finalStep, finalLabel, remarksResult.confirmationMessage);

      const previewPath = await artifactService.captureScreenshot(
        page,
        runId,
        remarksResult.submitted ? "submitted" : "dry-run-final"
      );
      const reportPath = await artifactService.writeJsonArtifact(
        runId,
        "run-report",
        {
          submission,
          result: remarksResult,
          completedAt: new Date().toISOString()
        }
      );

      const logFilePath = await logger.getLogFilePath();
      runStore.attachArtifacts(runId, {
        screenshotPath: previewPath,
        reportPath,
        logFilePath
      });

      const succeeded = runStore.succeed(
        runId,
        remarksResult.confirmationMessage,
        remarksResult.submitted
      );

      await logger.info("run.completed", {
        submitted: remarksResult.submitted,
        screenshotPath: previewPath
      });
      await historyRepository.append(succeeded);
      return succeeded;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown automation error.";

      if (page) {
        try {
          const screenshotPath = await artifactService.captureScreenshot(
            page,
            runId,
            "failure"
          );
          runStore.attachArtifacts(runId, { screenshotPath });
        } catch {
          // Ignore secondary screenshot failures.
        }
      }

      const failed = runStore.fail(runId, errorMessage);
      runStore.addProgress(runId, "FAILED", "Run failed", errorMessage, "failed");

      const logFilePath = await logger.getLogFilePath();
      runStore.attachArtifacts(runId, { logFilePath });
      await logger.error("run.failed", {
        error: errorMessage,
        requiresReauth: error instanceof ReAuthRequiredError
      });
      await historyRepository.append(runStore.get(runId) ?? failed);

      throw error;
    } finally {
      if (session) {
        await session.context.close().catch(() => undefined);
        await session.browser.close().catch(() => undefined);
      }
    }
  }
}

export const automationRunner = new AutomationRunner();
