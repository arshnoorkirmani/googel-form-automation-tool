import { chromium, type Browser, type BrowserContext } from "playwright";

import { configService } from "@/server/config/config-service";

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
    options: BrowserSessionOptions = {}
  ): Promise<BrowserSession> {
    const config = await configService.getConfig();
    const debug = options.debug ?? false;

    const browser = await chromium.launch({
      headless: !debug,
      slowMo: debug ? config.debug.slowMoMs : 0
    });

    const context = await browser.newContext({
      viewport: {
        width: 1440,
        height: 900
      },
      storageState: options.useSavedSession ? config.paths.storageState : undefined
    });

    return {
      browser,
      context
    };
  }
}

export const browserFactory = new BrowserFactory();
