import type { Browser, BrowserContext, Page } from "playwright";
import { chromium } from "playwright";

import { authSessionRepository } from "@/server/auth/auth-session-repository";
import { authService } from "@/server/auth/auth-service";
import { configService } from "@/server/config/config-service";
import { createLogger } from "@/server/logging/logger";
import {
  normalizeOperatorEmail,
  type OperatorContext
} from "@/server/operator/operator-context";
import { sessionValidator } from "@/server/auth/session-validator";

type SetupSession = {
  operatorId: string;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  startedAt: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __authSetupSessions__: Map<string, SetupSession> | undefined;
}

class AuthSetupManager {
  private readonly logger = createLogger("auth-setup");
  private readonly sessions =
    globalThis.__authSetupSessions__ ??
    (globalThis.__authSetupSessions__ = new Map());

  getActiveSession(operatorId: string): SetupSession | null {
    return this.sessions.get(operatorId) ?? null;
  }

  async start(operator: OperatorContext): Promise<{
    startedAt: string;
    message: string;
    formUrl: string;
  }> {
    const config = await configService.getConfig();

    if (!config.auth.interactiveSetupEnabled || process.env.NODE_ENV === "production" || process.env.RENDER) {
      throw new Error(
        "Interactive login setup is disabled in this cloud environment. Please run the app locally on your computer to sign in. Once signed in locally, your session will be securely saved to MongoDB and automatically used by the cloud server."
      );
    }

    const active = this.getActiveSession(operator.operatorId);

    if (active) {
      return {
        startedAt: active.startedAt,
        message:
          "A manual login window is already open. Complete sign-in there, then click Finish Login Setup.",
        formUrl: config.formUrl
      };
    }

    const browser = await chromium.launch({
      headless: false,
      slowMo: 150,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const context = await browser.newContext({
      viewport: {
        width: 1440,
        height: 900
      }
    });
    const page = await context.newPage();
    await page.goto(config.formUrl, { waitUntil: "domcontentloaded" });

    const session: SetupSession = {
      operatorId: operator.operatorId,
      browser,
      context,
      page,
      startedAt: new Date().toISOString()
    };

    this.sessions.set(operator.operatorId, session);

    await this.logger.info("auth.setup.started", {
      startedAt: session.startedAt
    });

    return {
      startedAt: session.startedAt,
      message:
        "Manual login window opened. Sign in with your authorized @blackbuck.com account, open the form fully, then return here and click Finish Login Setup.",
      formUrl: config.formUrl
    };
  }

  async complete(operator: OperatorContext): Promise<{
    savedAt: string;
    detectedEmail?: string;
    message: string;
  }> {
    const active = this.getActiveSession(operator.operatorId);

    if (!active) {
      throw new Error("No login setup window is active.");
    }

    const config = await configService.getConfig();
    await active.page.goto(config.formUrl, { waitUntil: "domcontentloaded" });
    const result = await sessionValidator.validateFormAccess(active.page);

    if (result.state !== "VALID") {
      throw new Error(result.reason);
    }

    const storageState = await active.context.storageState();
    const detectedEmail = result.detectedEmail
      ? normalizeOperatorEmail(result.detectedEmail)
      : undefined;

    if (detectedEmail && detectedEmail !== operator.operatorId) {
      throw new Error(
        `The signed-in Google account (${detectedEmail}) does not match the configured operator (${operator.email}).`
      );
    }

    await authSessionRepository.saveStorageState(operator, storageState);

    const savedAt = new Date().toISOString();
    await authService.saveMetadata(operator, {
      state: "VALID",
      savedAt,
      lastValidatedAt: savedAt,
      detectedEmail: result.detectedEmail,
      reason: "Session saved successfully."
    });

    await this.logger.info("auth.setup.completed", {
      savedAt,
      detectedEmail: result.detectedEmail
    });

    await this.closeActiveSession(operator.operatorId);

    return {
      savedAt,
      detectedEmail: result.detectedEmail,
      message: "Saved browser session is ready to reuse."
    };
  }

  async cancel(operatorId: string): Promise<void> {
    await this.closeActiveSession(operatorId);
    await this.logger.warn("auth.setup.cancelled");
  }

  private async closeActiveSession(operatorId: string): Promise<void> {
    const active = this.getActiveSession(operatorId);

    if (!active) {
      return;
    }

    await active.context.close();
    await active.browser.close();
    this.sessions.delete(operatorId);
  }
}

export const authSetupManager = new AuthSetupManager();
