import { access, readdir, rm } from "node:fs/promises";
import path from "node:path";

import { authSessionRepository } from "@/server/auth/auth-session-repository";
import { configService } from "@/server/config/config-service";
import { historyRepository } from "@/server/history/history-repository";
import { logEntryRepository } from "@/server/logging/log-entry-repository";
import type { OperatorContext } from "@/server/operator/operator-context";
import { runtimeArtifactRepository } from "@/server/reports/runtime-artifact-repository";
import { batchHistoryRepository } from "@/server/runs/batch-history-repository";
import { batchStore } from "@/server/runs/batch-store";

type StorageSummary = {
  historyEntries: number;
  historyStore: "MONGODB";
  logFiles: number;
  logStore: "MONGODB";
  logPersistenceEnabled: boolean;
  logFileMirroringEnabled: boolean;
  artifactFiles: number;
  artifactRuns: number;
  artifactStore: "MONGODB";
  artifactPersistenceEnabled: boolean;
  screenshotPersistenceEnabled: boolean;
  reportPersistenceEnabled: boolean;
  artifactFileMirroringEnabled: boolean;
  sampleFiles: number;
  authSessionPresent: boolean;
  authMetadataPresent: boolean;
  authStore: "MONGODB";
  operatorConfigured: boolean;
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
  async getSummary(operator: OperatorContext | null): Promise<StorageSummary> {
    const config = await configService.getConfig();
    const logsDir = config.paths.logsDir;
    const artifactsDir = config.paths.artifactsDir;
    const samplesDir = config.paths.samplesDir;
    const configPath = path.resolve(process.cwd(), "config", "app.config.json");

    const mirroredLogFiles = await countFiles(logsDir, {
      excludeNames: [".gitkeep"]
    });
    const mirroredArtifactFiles = await countFiles(artifactsDir, {
      recursive: true,
      excludeNames: [".gitkeep"]
    });
    const mirroredArtifactRuns = await countDirectories(artifactsDir, {
      excludeNames: [".gitkeep"]
    });
    const sampleFiles = await countFiles(samplesDir, {
      excludeNames: [".gitkeep"]
    });
    const persistedLogStreams = await logEntryRepository.countStreams();
    const persistedArtifacts = await runtimeArtifactRepository.count();
    const persistedArtifactRuns = await runtimeArtifactRepository.countRuns();

    const batchRuns = operator
      ? batchStore.listByOperator(operator.operatorId)
      : [];
    const batchHasActiveRun = batchRuns.some((run) =>
      ["RUNNING", "PAUSING", "PAUSED", "STOPPING"].includes(run.status)
    );
    const authMetadata = operator
      ? await authSessionRepository.readMetadata(operator)
      : null;

    return {
      historyEntries: operator ? await historyRepository.count(operator.operatorId) : 0,
      historyStore: "MONGODB",
      logFiles: persistedLogStreams || mirroredLogFiles,
      logStore: "MONGODB",
      logPersistenceEnabled: config.persistence.mongodbLogsEnabled,
      logFileMirroringEnabled: config.persistence.logFilesEnabled,
      artifactFiles: persistedArtifacts || mirroredArtifactFiles,
      artifactRuns: persistedArtifactRuns || mirroredArtifactRuns,
      artifactStore: "MONGODB",
      artifactPersistenceEnabled:
        config.persistence.mongodbScreenshotsEnabled ||
        config.persistence.mongodbRunReportsEnabled ||
        config.persistence.screenshotsEnabled ||
        config.persistence.runReportsEnabled,
      screenshotPersistenceEnabled:
        config.persistence.mongodbScreenshotsEnabled ||
        config.persistence.screenshotsEnabled,
      reportPersistenceEnabled:
        config.persistence.mongodbRunReportsEnabled ||
        config.persistence.runReportsEnabled,
      artifactFileMirroringEnabled:
        config.persistence.screenshotsEnabled ||
        config.persistence.runReportsEnabled,
      sampleFiles,
      authSessionPresent: operator
        ? await authSessionRepository.hasStorageState(operator)
        : false,
      authMetadataPresent: authMetadata !== null,
      authStore: "MONGODB",
      operatorConfigured: Boolean(operator),
      configPresent: await exists(configPath),
      batchRunsInMemory: batchRuns.length,
      batchRunsPersisted: operator
        ? await batchHistoryRepository.count(operator.operatorId)
        : 0,
      batchHasActiveRun
    };
  }

  async clear(
    action: ClearAction,
    operator: OperatorContext | null
  ): Promise<void> {
    const config = await configService.getConfig();
    const samplesDir = config.paths.samplesDir;

    if (action === "CLEAR_HISTORY" || action === "CLEAR_NON_AUTH") {
      if (!operator) {
        throw new Error("Set operator identity before clearing user-scoped history.");
      }
      await historyRepository.clear(operator.operatorId);
    }

    if (action === "CLEAR_LOGS" || action === "CLEAR_NON_AUTH") {
      await Promise.all([
        logEntryRepository.clear(),
        clearDirectory(config.paths.logsDir, { excludeNames: [".gitkeep"] })
      ]);
    }

    if (action === "CLEAR_ARTIFACTS" || action === "CLEAR_NON_AUTH") {
      await Promise.all([
        runtimeArtifactRepository.clear(),
        clearDirectory(config.paths.artifactsDir, { excludeNames: [".gitkeep"] })
      ]);
    }

    if (action === "CLEAR_SAMPLES" || action === "CLEAR_NON_AUTH") {
      await clearDirectory(samplesDir, { excludeNames: [".gitkeep"] });
    }

    if (action === "CLEAR_BATCH" || action === "CLEAR_NON_AUTH") {
      if (!operator) {
        throw new Error("Set operator identity before clearing user-scoped batch data.");
      }
      const batchRuns = batchStore.listByOperator(operator.operatorId);
      const hasActive = batchRuns.some((run) =>
        ["RUNNING", "PAUSING", "PAUSED", "STOPPING"].includes(run.status)
      );
      if (hasActive) {
        throw new Error("Stop all active batch runs before clearing batch data.");
      }
      batchStore.clearForOperator(operator.operatorId);
      await batchHistoryRepository.clear(operator.operatorId);
    }

    if (action === "CLEAR_AUTH") {
      if (!operator) {
        throw new Error("Set operator identity before clearing user-scoped auth data.");
      }
      await authSessionRepository.clear(operator);
    }
  }
}

export const storageService = new StorageService();
export type { StorageSummary, ClearAction };
