import type { Browser, BrowserContext, Page } from "playwright";
import { chromium } from "playwright";

import { authSessionRepository } from "@/server/auth/auth-session-repository";
import { authService } from "@/server/auth/auth-service";
import { configService } from "@/server/config/config-service";
import { createLogger } from "@/server/logging/logger";
import { sessionValidator } from "@/server/auth/session-validator";

type SetupSession = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  startedAt: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __authSetupSession__: SetupSession | undefined;
}

class AuthSetupManager {
  private readonly logger = createLogger("auth-setup");

  getActiveSession(): SetupSession | null {
    return globalThis.__authSetupSession__ ?? null;
  }

  async start(): Promise<{
    startedAt: string;
    message: string;
    formUrl: string;
  }> {
    const config = await configService.getConfig();

    if (!config.auth.interactiveSetupEnabled) {
      throw new Error(
        "Interactive login setup is disabled in this environment. Refresh the Google session from a trusted local workstation that uses the same MongoDB connection."
      );
    }

    const active = this.getActiveSession();

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
      slowMo: 150
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
      browser,
      context,
      page,
      startedAt: new Date().toISOString()
    };

    globalThis.__authSetupSession__ = session;

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

  async complete(): Promise<{
    savedAt: string;
    detectedEmail?: string;
    message: string;
  }> {
    const active = this.getActiveSession();

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
    await authSessionRepository.saveStorageState(storageState);

    const savedAt = new Date().toISOString();
    await authService.saveMetadata({
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

    await this.closeActiveSession();

    return {
      savedAt,
      detectedEmail: result.detectedEmail,
      message: "Saved browser session is ready to reuse."
    };
  }

  async cancel(): Promise<void> {
    await this.closeActiveSession();
    await this.logger.warn("auth.setup.cancelled");
  }

  private async closeActiveSession(): Promise<void> {
    const active = this.getActiveSession();

    if (!active) {
      return;
    }

    await active.context.close();
    await active.browser.close();
    globalThis.__authSetupSession__ = undefined;
  }
}

export const authSetupManager = new AuthSetupManager();
