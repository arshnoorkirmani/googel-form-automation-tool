import { chromium, type Browser, type BrowserContext } from "playwright";

import { authSessionRepository } from "@/server/auth/auth-session-repository";
import { configService } from "@/server/config/config-service";
import type { OperatorContext } from "@/server/operator/operator-context";

export type BrowserSessionOptions = {
  debug?: boolean;
  useSavedSession?: boolean;
};

export type BrowserSession = {
  browser: Browser;
  context: BrowserContext;
};

class BrowserFactory {
  async createSession(
    options: BrowserSessionOptions = {},
    operator?: OperatorContext
  ): Promise<BrowserSession> {
    const config = await configService.getConfig();
    const debug = options.debug ?? false;
    const persistedStorageState = options.useSavedSession
      ? operator
        ? await authSessionRepository.getStorageState(operator)
        : null
      : undefined;

    if (options.useSavedSession && !persistedStorageState) {
      throw new Error("No saved browser session is available in MongoDB.");
    }

    const storageState = persistedStorageState ?? undefined;

    const browser = await chromium.launch({
      headless: !debug,
      slowMo: debug ? config.debug.slowMoMs : 0,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const context = await browser.newContext({
      viewport: {
        width: 1440,
        height: 900
      },
      storageState
    });

    return {
      browser,
      context
    };
  }
}

export const browserFactory = new BrowserFactory();
