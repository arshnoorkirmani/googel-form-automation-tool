import { access, readdir, rm } from "node:fs/promises";
import path from "node:path";

import { authSessionRepository } from "@/server/auth/auth-session-repository";
import { configService } from "@/server/config/config-service";
import { historyRepository } from "@/server/history/history-repository";
import { batchHistoryRepository } from "@/server/runs/batch-history-repository";
import { batchStore } from "@/server/runs/batch-store";

type StorageSummary = {
  historyEntries: number;
  historyStore: "MONGODB";
  logFiles: number;
  logPersistenceEnabled: boolean;
  artifactFiles: number;
  artifactRuns: number;
  artifactPersistenceEnabled: boolean;
  screenshotPersistenceEnabled: boolean;
  reportPersistenceEnabled: boolean;
  sampleFiles: number;
  authSessionPresent: boolean;
  authMetadataPresent: boolean;
  authStore: "MONGODB";
  configPresent: boolean;
  batchRunsInMemory: number;
  batchRunsPersisted: number;
  batchHasActiveRun: boolean;
};

type ClearAction =
  | "CLEAR_HISTORY"
  | "CLEAR_LOGS"
  | "CLEAR_ARTIFACTS"
  | "CLEAR_SAMPLES"
  | "CLEAR_BATCH"
  | "CLEAR_NON_AUTH"
  | "CLEAR_AUTH";

async function exists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function countFiles(
  dir: string,
  options?: { recursive?: boolean; excludeNames?: string[] }
): Promise<number> {
  if (!(await exists(dir))) {
    return 0;
  }

  const entries = await readdir(dir, { withFileTypes: true });
  const exclude = new Set(options?.excludeNames ?? []);
  let count = 0;

  for (const entry of entries) {
    if (exclude.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (options?.recursive) {
        count += await countFiles(fullPath, options);
      }
      continue;
    }

    if (entry.isFile()) {
      count += 1;
    }
  }

  return count;
}

async function countDirectories(
  dir: string,
  options?: { excludeNames?: string[] }
): Promise<number> {
  if (!(await exists(dir))) {
    return 0;
  }

  const entries = await readdir(dir, { withFileTypes: true });
  const exclude = new Set(options?.excludeNames ?? []);
  return entries.filter((entry) => entry.isDirectory() && !exclude.has(entry.name))
    .length;
}

async function clearDirectory(
  dir: string,
  options?: { excludeNames?: string[] }
): Promise<void> {
  if (!(await exists(dir))) {
    return;
  }

  const entries = await readdir(dir, { withFileTypes: true });
  const exclude = new Set(options?.excludeNames ?? []);

  await Promise.all(
    entries.map(async (entry) => {
      if (exclude.has(entry.name)) {
        return;
      }
      const fullPath = path.join(dir, entry.name);
      await rm(fullPath, { recursive: true, force: true });
    })
  );
}

class StorageService {
  async getSummary(): Promise<StorageSummary> {
    const config = await configService.getConfig();
    const logsDir = config.paths.logsDir;
    const artifactsDir = config.paths.artifactsDir;
    const samplesDir = config.paths.samplesDir;
    const configPath = path.resolve(process.cwd(), "config", "app.config.json");

    const logFiles = await countFiles(logsDir, {
      excludeNames: [".gitkeep"]
    });
    const artifactFiles = await countFiles(artifactsDir, {
      recursive: true,
      excludeNames: [".gitkeep"]
    });
    const artifactRuns = await countDirectories(artifactsDir, {
      excludeNames: [".gitkeep"]
    });
    const sampleFiles = await countFiles(samplesDir, {
      excludeNames: [".gitkeep"]
    });

    const batchRuns = batchStore.list();
    const batchHasActiveRun = batchRuns.some((run) =>
      ["RUNNING", "PAUSING", "PAUSED", "STOPPING"].includes(run.status)
    );
    const authMetadata = await authSessionRepository.readMetadata();

    return {
      historyEntries: await historyRepository.count(),
      historyStore: "MONGODB",
      logFiles,
      logPersistenceEnabled: config.persistence.logFilesEnabled,
      artifactFiles,
      artifactRuns,
      artifactPersistenceEnabled:
        config.persistence.screenshotsEnabled || config.persistence.runReportsEnabled,
      screenshotPersistenceEnabled: config.persistence.screenshotsEnabled,
      reportPersistenceEnabled: config.persistence.runReportsEnabled,
      sampleFiles,
      authSessionPresent: await authSessionRepository.hasStorageState(),
      authMetadataPresent: authMetadata !== null,
      authStore: "MONGODB",
      configPresent: await exists(configPath),
      batchRunsInMemory: batchRuns.length,
      batchRunsPersisted: await batchHistoryRepository.count(),
      batchHasActiveRun
    };
  }

  async clear(action: ClearAction): Promise<void> {
    const config = await configService.getConfig();
    const samplesDir = config.paths.samplesDir;

    if (action === "CLEAR_HISTORY" || action === "CLEAR_NON_AUTH") {
      await historyRepository.clear();
    }

    if (action === "CLEAR_LOGS" || action === "CLEAR_NON_AUTH") {
      await clearDirectory(config.paths.logsDir, { excludeNames: [".gitkeep"] });
    }

    if (action === "CLEAR_ARTIFACTS" || action === "CLEAR_NON_AUTH") {
      await clearDirectory(config.paths.artifactsDir, { excludeNames: [".gitkeep"] });
    }

    if (action === "CLEAR_SAMPLES" || action === "CLEAR_NON_AUTH") {
      await clearDirectory(samplesDir, { excludeNames: [".gitkeep"] });
    }

    if (action === "CLEAR_BATCH" || action === "CLEAR_NON_AUTH") {
      const batchRuns = batchStore.list();
      const hasActive = batchRuns.some((run) =>
        ["RUNNING", "PAUSING", "PAUSED", "STOPPING"].includes(run.status)
      );
      if (hasActive) {
        throw new Error("Stop all active batch runs before clearing batch data.");
      }
      batchStore.clearAll();
      await batchHistoryRepository.clear();
    }

    if (action === "CLEAR_AUTH") {
      await authSessionRepository.clear();
    }
  }
}

export const storageService = new StorageService();
export type { StorageSummary, ClearAction };
