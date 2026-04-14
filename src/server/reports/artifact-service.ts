import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Page } from "playwright";

import { sanitizeFileName } from "@/lib/utils/path";
import { configService } from "@/server/config/config-service";

class ArtifactService {
  async ensureRunDirectory(runId: string): Promise<string> {
    const config = await configService.getConfig();
    const target = path.join(config.paths.artifactsDir, sanitizeFileName(runId));
    await mkdir(target, { recursive: true });
    return target;
  }

  async captureScreenshot(
    page: Page,
    runId: string,
    name: string
  ): Promise<string | undefined> {
    const config = await configService.getConfig();
    if (!config.persistence.screenshotsEnabled) {
      return undefined;
    }

    const runDirectory = await this.ensureRunDirectory(runId);
    const filePath = path.join(
      runDirectory,
      `${sanitizeFileName(name)}-${Date.now()}.png`
    );

    await page.screenshot({ path: filePath, fullPage: true });
    return filePath;
  }

  async writeJsonArtifact(
    runId: string,
    name: string,
    payload: unknown
  ): Promise<string | undefined> {
    const config = await configService.getConfig();
    if (!config.persistence.runReportsEnabled) {
      return undefined;
    }

    const runDirectory = await this.ensureRunDirectory(runId);
    const filePath = path.join(runDirectory, `${sanitizeFileName(name)}.json`);
    await writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
    return filePath;
  }
}

export const artifactService = new ArtifactService();
