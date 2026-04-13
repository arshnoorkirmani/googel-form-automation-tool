import { access, readFile, writeFile } from "node:fs/promises";

import { chromium } from "playwright";

import { configService } from "@/server/config/config-service";
import { createLogger } from "@/server/logging/logger";
import {
  sessionValidator,
  type SessionValidationResult
} from "@/server/auth/session-validator";

type AuthMetadata = {
  state: "MISSING" | "VALID" | "REAUTH_REQUIRED" | "FORBIDDEN";
  savedAt?: string;
  lastValidatedAt?: string;
  detectedEmail?: string;
  reason?: string;
};

export type AuthStatus = {
  state: AuthMetadata["state"] | "SETUP_IN_PROGRESS";
  detectedEmail?: string;
  savedAt?: string;
  lastValidatedAt?: string;
  reason?: string;
  sessionFilePath: string;
};

export class ReAuthRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReAuthRequiredError";
  }
}

class AuthService {
  private readonly logger = createLogger("auth");

  async getStatus(validate = false): Promise<AuthStatus> {
    const config = await configService.getConfig();
    const hasStateFile = await this.hasSavedSession();

    if (!hasStateFile) {
      return {
        state: "MISSING",
        reason: "No saved browser session was found.",
        sessionFilePath: config.paths.storageState
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
        sessionFilePath: config.paths.storageState
      };
    }

    const result = await this.validateSavedSession();

    return {
      state: result.state === "VALID" ? "VALID" : result.state,
      detectedEmail: result.detectedEmail,
      savedAt: metadata?.savedAt,
      lastValidatedAt: new Date().toISOString(),
      reason: result.reason,
      sessionFilePath: config.paths.storageState
    };
  }

  async hasSavedSession(): Promise<boolean> {
    const config = await configService.getConfig();

    try {
      await access(config.paths.storageState);
      return true;
    } catch {
      return false;
    }
  }

  async validateSavedSession(): Promise<SessionValidationResult> {
    const config = await configService.getConfig();
    const browser = await chromium.launch({
      headless: true,
      slowMo: 0
    });

    const context = await browser.newContext({
      storageState: config.paths.storageState,
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
      await this.writeMetadata({
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
    await this.writeMetadata(metadata);
  }

  async readMetadata(): Promise<AuthMetadata | null> {
    const config = await configService.getConfig();

    try {
      const raw = await readFile(config.paths.authMetadata, "utf8");
      return JSON.parse(raw) as AuthMetadata;
    } catch {
      return null;
    }
  }

  private async writeMetadata(metadata: AuthMetadata): Promise<void> {
    const config = await configService.getConfig();
    await writeFile(
      config.paths.authMetadata,
      JSON.stringify(metadata, null, 2),
      "utf8"
    );
  }
}

export const authService = new AuthService();
