import { chromium } from "playwright";

import { authSessionRepository } from "@/server/auth/auth-session-repository";
import type {
  AuthMetadata,
  AuthStatus
} from "@/server/auth/auth.types";
import { configService } from "@/server/config/config-service";
import { createLogger } from "@/server/logging/logger";
import type { OperatorContext } from "@/server/operator/operator-context";
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

  async getStatus(
    operator: OperatorContext,
    validate = false
  ): Promise<AuthStatus> {
    const hasStateFile = await this.hasSavedSession(operator);
    const sessionStorageLocation =
      await authSessionRepository.getStorageLocation(operator);

    if (!hasStateFile) {
      return {
        state: "MISSING",
        operatorEmail: operator.email,
        reason: "No saved browser session was found.",
        sessionStorageLocation
      };
    }

    const metadata = await this.readMetadata(operator);

    if (!validate) {
      return {
        state: metadata?.state ?? "VALID",
        operatorEmail: operator.email,
        detectedEmail: metadata?.detectedEmail,
        savedAt: metadata?.savedAt,
        lastValidatedAt: metadata?.lastValidatedAt,
        reason: metadata?.reason,
        sessionStorageLocation
      };
    }

    const result = await this.validateSavedSession(operator);

    return {
      state: result.state === "VALID" ? "VALID" : result.state,
      operatorEmail: operator.email,
      detectedEmail: result.detectedEmail,
      savedAt: metadata?.savedAt,
      lastValidatedAt: new Date().toISOString(),
      reason: result.reason,
      sessionStorageLocation
    };
  }

  async hasSavedSession(operator: OperatorContext): Promise<boolean> {
    return authSessionRepository.hasStorageState(operator);
  }

  async validateSavedSession(
    operator: OperatorContext
  ): Promise<SessionValidationResult> {
    const config = await configService.getConfig();
    const storageState = await authSessionRepository.getStorageState(operator);

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
      await authSessionRepository.saveMetadata(operator, {
        state: result.state,
        savedAt: (await this.readMetadata(operator))?.savedAt,
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

  async assertValidSession(operator: OperatorContext): Promise<void> {
    const status = await this.getStatus(operator, true);

    if (status.state !== "VALID") {
      throw new ReAuthRequiredError(
        status.reason ?? "Saved Google session is no longer valid."
      );
    }
  }

  async saveMetadata(
    operator: OperatorContext,
    metadata: AuthMetadata
  ): Promise<void> {
    await authSessionRepository.saveMetadata(operator, metadata);
  }

  async readMetadata(operator: OperatorContext): Promise<AuthMetadata | null> {
    return authSessionRepository.readMetadata(operator);
  }
}

export const authService = new AuthService();
