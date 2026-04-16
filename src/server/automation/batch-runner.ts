import type { Page } from "playwright";

import type { BatchSubmissionPayload } from "@/modules/submission/batch.schema";
import type { SubmissionPayload } from "@/modules/submission/submission.schema";
import { authService, ReAuthRequiredError } from "@/server/auth/auth-service";
import { sessionValidator } from "@/server/auth/session-validator";
import { browserFactory, type BrowserSession } from "@/server/automation/browser-factory";
import { fillBranchPage } from "@/server/automation/form/page2/branch-router";
import { fillCommonPage } from "@/server/automation/form/page1-common";
import { fillRemarksPage } from "@/server/automation/form/page3-remarks";
import { withRetries } from "@/server/automation/retry";
import { configService } from "@/server/config/config-service";
import { createLogger } from "@/server/logging/logger";
import type { OperatorContext } from "@/server/operator/operator-context";
import { artifactService } from "@/server/reports/artifact-service";
import { batchHistoryRepository } from "@/server/runs/batch-history-repository";
import { batchStore, type BatchRunRecord } from "@/server/runs/batch-store";
import { waitForFormReady } from "./form/form-helpers";

const RANDOM_UNSUPPORTED_OPTIONS = [
  "Call Disconnected",
  "Call Drop",
  "Not Connected",
  "Language Barrier"
];

function getRandomUnsupported() {
  const index = Math.floor(Math.random() * RANDOM_UNSUPPORTED_OPTIONS.length);
  return RANDOM_UNSUPPORTED_OPTIONS[index]!;
}

class BatchAutomationRunner {
  async execute(
    batchId: string,
    submission: BatchSubmissionPayload,
    operator: OperatorContext
  ): Promise<void> {
    const logger = createLogger(batchId, { operatorId: operator.operatorId });
    const config = await configService.getConfig();
    let session: BrowserSession | null = null;
    let page: Page | null = null;

    await this.persistCurrentBatch(batchStore.setBatchRunning(batchId));

    try {
      await authService.assertValidSession(operator);
      await logger.info("batch.session.loaded", { mode: submission.mode });

      session = await browserFactory.createSession({
        debug: submission.debug,
        useSavedSession: true
      }, operator);

      if (!session) {
        throw new Error("Browser session could not be created.");
      }

      page = await session.context.newPage();

      let needsFullNavigation = true;

      const ensurePage = async () => {
        if (!session) {
          throw new Error("Browser session could not be created.");
        }
        if (!page || page.isClosed()) {
          page = await session.context.newPage();
          needsFullNavigation = true;
        }
      };

      for (const foNumber of submission.foNumberList) {
        // ---------------- Lifecycle Hooks ----------------
        while (true) {
          const rec = batchStore.get(batchId);
          if (!rec) break;
          
          if (rec.status === "STOPPING" || rec.status === "STOPPED") {
            await this.persistCurrentBatch(batchStore.setBatchStopped(batchId));
            return; // Will gracefully trigger the finally block to close the browser
          }
          
          if (rec.status === "PAUSING" || rec.status === "PAUSED") {
            if (rec.status === "PAUSING") {
              await this.persistCurrentBatch(batchStore.setBatchPaused(batchId));
            }
            await new Promise(r => setTimeout(r, 1000));
          } else {
            break;
          }
        }
        // -------------------------------------------------

        let currentCallStatus = submission.callStatus;
        if (currentCallStatus === "Random Unsupported") {
          currentCallStatus = getRandomUnsupported();
        }

        await this.persistCurrentBatch(
          batchStore.setItemRunning(batchId, foNumber, currentCallStatus)
        );

        try {
          const singleFormPayload: SubmissionPayload = {
            ...submission,
            foNumber,
            callStatus: currentCallStatus as any
            // The typing issue here is because submission.callStatus allows "Random Unsupported"
          };

          let remarksResult:
            | {
                confirmationMessage: string;
                submitted: boolean;
              }
            | undefined;

          await withRetries(
            async () => {
              await ensurePage();
              const currentPage = page;

              if (!currentPage) {
                throw new Error("Browser page was not available for batch processing.");
              }

              if (needsFullNavigation) {
                await currentPage.goto(config.formUrl, {
                  waitUntil: "domcontentloaded",
                  timeout: 60_000
                });
                const validation = await sessionValidator.validateFormAccess(
                  currentPage
                );
                if (validation.state !== "VALID") {
                  throw new ReAuthRequiredError(validation.reason);
                }
              }

              await fillCommonPage(currentPage, singleFormPayload);
              await fillBranchPage(currentPage, singleFormPayload);
              remarksResult = await fillRemarksPage(currentPage, singleFormPayload);
            },
            Math.max(1, config.maxRetries),
            async (attempt, error) => {
              await logger.warn("batch.item.retry", {
                batchId,
                foNumber,
                attempt,
                error: error instanceof Error ? error.message : String(error)
              });
              needsFullNavigation = true;

              if (page && !page.isClosed()) {
                await page.close().catch(() => undefined);
              }
              page = null;
            }
          );

          if (!remarksResult) {
            throw new Error("Batch submission did not produce a confirmation state.");
          }

          if (!page) {
            throw new Error("Browser page was not available after batch retries.");
          }

          const screenshotPath = await artifactService.captureScreenshot(
            page,
            batchId,
            `success-${foNumber}`,
            operator.operatorId
          );

          await this.persistCurrentBatch(
            batchStore.setItemSucceeded(
              batchId,
              foNumber,
              remarksResult.confirmationMessage,
              screenshotPath,
              currentCallStatus
            )
          );

          // Use user-configured delay directly (seconds → ms), fallback to 10s
          const delaySec = typeof submission.delaySeconds === "number" && submission.delaySeconds > 0
            ? submission.delaySeconds
            : 10;
          await this.waitWithControl(batchId, delaySec);

          // Handle next loop iteration
          if (submission.mode === "SUBMIT" && remarksResult.submitted) {
            // Click "Submit another response"
            // Wait for form to become ready again.
            // On Google Forms, the link is an <a> tag pointing to the form URL.
            const anotherResponseLink = page.locator("a", { hasText: "Submit another response" }).first();
            
            if (await anotherResponseLink.count() > 0) {
              await anotherResponseLink.click();
              await waitForFormReady(page);
              needsFullNavigation = false;
            } else {
              needsFullNavigation = true;
            }
          } else {
             // In DRY_RUN, it stays on the last page. To run next, we MUST navigate.
             needsFullNavigation = true;
          }

        } catch (itemError) {
          const itemErrorMessage = itemError instanceof Error ? itemError.message : "Unknown item error";
          let itemScreenshotPath: string | undefined;
          try {
            if (page) {
              itemScreenshotPath = await artifactService.captureScreenshot(
                page,
                batchId,
                `error-${foNumber}`,
                operator.operatorId
              );
            }
          } catch {}

          await this.persistCurrentBatch(
            batchStore.setItemFailed(
              batchId,
              foNumber,
              itemErrorMessage,
              itemScreenshotPath,
              currentCallStatus
            )
          );

          // If an item failed, it is likely the form state is tangled.
          // Force a full re-navigation for the next item.
          needsFullNavigation = true;
          if (page?.isClosed()) {
            try {
              page = await session.context.newPage();
            } catch {
              // ignore recovery errors, next loop will try to recover
            }
          }

          // If auth issue, throw entirely
          if (itemError instanceof ReAuthRequiredError) {
            throw itemError;
          }
        }
      }

      await this.persistCurrentBatch(batchStore.setBatchCompleted(batchId));
      await logger.info("batch.completed", { batchId });

    } catch (batchError) {
      const errorMessage = batchError instanceof Error ? batchError.message : "Fail to run batch.";
      await this.persistCurrentBatch(batchStore.setBatchFailed(batchId, errorMessage));
      await logger.error("batch.failed", { error: errorMessage });
    } finally {
      if (session) {
        await session.context.close().catch(() => undefined);
        await session.browser.close().catch(() => undefined);
      }
    }
  }

  // Support retry functionality
  async retry(
    batchId: string,
    itemIds: string[],
    operator: OperatorContext
  ): Promise<void> {
    const record = batchStore.get(batchId);
    if (!record) throw new Error("Batch not found.");

    await this.execute(batchId, {
      ...record.submission,
      foNumberList: itemIds
    }, operator);
  }

  private async waitWithControl(batchId: string, delaySeconds: number): Promise<void> {
    let remainingMs = Math.max(0, delaySeconds * 1000);
    if (remainingMs <= 0) {
      return;
    }

    let paused = false;

    while (remainingMs > 0) {
      const record = batchStore.get(batchId);
      if (!record) {
        return;
      }

      if (record.status === "STOPPING" || record.status === "STOPPED") {
        await this.persistCurrentBatch(batchStore.setBatchStopped(batchId));
        return;
      }

      if (record.status === "PAUSING" || record.status === "PAUSED") {
        if (!paused) {
          if (record.status === "PAUSING") {
            await this.persistCurrentBatch(batchStore.setBatchPaused(batchId));
          }
          await this.persistCurrentBatch(batchStore.clearWaiting(batchId));
          paused = true;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }

      if (paused) {
        paused = false;
        await this.persistCurrentBatch(
          batchStore.setWaiting(batchId, remainingMs / 1000, new Date())
        );
      } else if (!record.waitingUntil) {
        await this.persistCurrentBatch(
          batchStore.setWaiting(batchId, remainingMs / 1000, new Date())
        );
      }

      const chunkMs = Math.min(remainingMs, 500);
      await new Promise((resolve) => setTimeout(resolve, chunkMs));
      remainingMs -= chunkMs;
    }

    await this.persistCurrentBatch(batchStore.clearWaiting(batchId));
  }

  private async persistCurrentBatch(record: BatchRunRecord): Promise<void> {
    await batchHistoryRepository.upsert(record);
  }
}

export const batchAutomationRunner = new BatchAutomationRunner();
