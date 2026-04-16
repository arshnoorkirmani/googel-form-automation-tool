import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Page } from "playwright";

import { sanitizeFileName } from "@/lib/utils/file-name";
import { configService } from "@/server/config/config-service";
import { runtimeArtifactRepository } from "@/server/reports/runtime-artifact-repository";

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
    name: string,
    operatorId?: string
  ): Promise<string | undefined> {
    const config = await configService.getConfig();
    const fileName = `${sanitizeFileName(name)}-${Date.now()}.png`;

    if (
      !config.persistence.screenshotsEnabled &&
      !config.persistence.mongodbScreenshotsEnabled
    ) {
      return undefined;
    }

    const screenshotBuffer = Buffer.from(
      await page.screenshot({
        fullPage: true
      })
    );
    let localFilePath: string | undefined;

    if (config.persistence.screenshotsEnabled) {
      const runDirectory = await this.ensureRunDirectory(runId);
      localFilePath = path.join(runDirectory, fileName);
      await writeFile(localFilePath, screenshotBuffer);
    }

    if (config.persistence.mongodbScreenshotsEnabled) {
      return runtimeArtifactRepository.create({
        operatorId,
        runId,
        kind: "SCREENSHOT",
        fileName,
        mimeType: "image/png",
        content: screenshotBuffer
      });
    }

    return localFilePath;
  }

  async writeJsonArtifact(
    runId: string,
    name: string,
    payload: unknown,
    operatorId?: string
  ): Promise<string | undefined> {
    const config = await configService.getConfig();
    const fileName = `${sanitizeFileName(name)}.json`;

    if (
      !config.persistence.runReportsEnabled &&
      !config.persistence.mongodbRunReportsEnabled
    ) {
      return undefined;
    }

    const serialized = JSON.stringify(payload, null, 2);
    const content = Buffer.from(serialized, "utf8");
    let localFilePath: string | undefined;

    if (config.persistence.runReportsEnabled) {
      const runDirectory = await this.ensureRunDirectory(runId);
      localFilePath = path.join(runDirectory, fileName);
      await writeFile(localFilePath, serialized, "utf8");
    }

    if (config.persistence.mongodbRunReportsEnabled) {
      return runtimeArtifactRepository.create({
        operatorId,
        runId,
        kind: "REPORT",
        fileName,
        mimeType: "application/json; charset=utf-8",
        content
      });
    }

    return localFilePath;
  }
}

export const artifactService = new ArtifactService();
