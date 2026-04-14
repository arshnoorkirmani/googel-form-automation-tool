import { chromium } from "playwright";

import { authSessionRepository } from "@/server/auth/auth-session-repository";
import type {
  AuthMetadata,
  AuthStatus
} from "@/server/auth/auth.types";
import { configService } from "@/server/config/config-service";
import { createLogger } from "@/server/logging/logger";
import {
  sessionValidator,
  type SessionValidationResult
} from "@/server/auth/session-validator";

export class ReAuthRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReAuthRequiredError";
  }
}

class AuthService {
  private readonly logger = createLogger("auth");

  async getStatus(validate = false): Promise<AuthStatus> {
    const hasStateFile = await this.hasSavedSession();
    const sessionStorageLocation =
      await authSessionRepository.getStorageLocation();

    if (!hasStateFile) {
      return {
        state: "MISSING",
        reason: "No saved browser session was found.",
        sessionStorageLocation
      };
    }

    const metadata = await this.readMetadata();

    if (!validate) {
      return {
        state: metadata?.state ?? "VALID",
        detectedEmail: metadata?.detectedEmail,
        savedAt: metadata?.savedAt,
        lastValidatedAt: metadata?.lastValidatedAt,
        reason: metadata?.reason,
        sessionStorageLocation
      };
    }

    const result = await this.validateSavedSession();

    return {
      state: result.state === "VALID" ? "VALID" : result.state,
      detectedEmail: result.detectedEmail,
      savedAt: metadata?.savedAt,
      lastValidatedAt: new Date().toISOString(),
      reason: result.reason,
      sessionStorageLocation
    };
  }

  async hasSavedSession(): Promise<boolean> {
    return authSessionRepository.hasStorageState();
  }

  async validateSavedSession(): Promise<SessionValidationResult> {
    const config = await configService.getConfig();
    const storageState = await authSessionRepository.getStorageState();

    if (!storageState) {
      return {
        state: "REAUTH_REQUIRED",
        reason: "No saved browser session was found."
      };
    }

    const browser = await chromium.launch({
      headless: true,
      slowMo: 0
    });

    const context = await browser.newContext({
      storageState,
      viewport: {
        width: 1440,
        height: 900
      }
    });

    const page = await context.newPage();

    try {
      await page.goto(config.formUrl, {
        waitUntil: "domcontentloaded",
        timeout: 60_000
      });

      const result = await sessionValidator.validateFormAccess(page);
      await authSessionRepository.saveMetadata({
        state: result.state,
        savedAt: (await this.readMetadata())?.savedAt,
        lastValidatedAt: new Date().toISOString(),
        detectedEmail: result.detectedEmail,
        reason: result.reason
      });
      await this.logger.info("auth.session.validated", result);
      return result;
    } finally {
      await context.close();
      await browser.close();
    }
  }

  async assertValidSession(): Promise<void> {
    const status = await this.getStatus(true);

    if (status.state !== "VALID") {
      throw new ReAuthRequiredError(
        status.reason ?? "Saved Google session is no longer valid."
      );
    }
  }

  async saveMetadata(metadata: AuthMetadata): Promise<void> {
    await authSessionRepository.saveMetadata(metadata);
  }

  async readMetadata(): Promise<AuthMetadata | null> {
    return authSessionRepository.readMetadata();
  }
}

export const authService = new AuthService();
