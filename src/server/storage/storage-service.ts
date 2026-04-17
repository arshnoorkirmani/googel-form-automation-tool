import { access, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { configService } from "@/server/config/config-service";
import { historyRepository } from "@/server/history/history-repository";
import { batchHistoryRepository } from "@/server/runs/batch-history-repository";
import { batchStore } from "@/server/runs/batch-store";
import { runStore } from "@/server/runs/run-store";

type StorageSummary = {
  submissionEntries: number;
  batchRunEntries: number;
  batchRowEntries: number;
  logFiles: number;
  artifactFiles: number;
  artifactRuns: number;
  sampleFiles: number;
  authSessionPresent: boolean;
  authMetadataPresent: boolean;
  configPresent: boolean;
  activeRunsInMemory: number;
  batchRunsInMemory: number;
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
    const samplesDir = path.resolve(process.cwd(), "storage", "samples");
    const configPath = path.resolve(process.cwd(), "config", "app.config.json");

    const [submissionEntries, batchRunEntries, batchRowEntries, logFiles, artifactFiles, artifactRuns, sampleFiles] =
      await Promise.all([
        historyRepository.list().then((records) => records.length),
        batchHistoryRepository.countRuns(),
        batchHistoryRepository.countRows(),
        countFiles(logsDir, {
          excludeNames: [".gitkeep"]
        }),
        countFiles(artifactsDir, {
          recursive: true,
          excludeNames: [".gitkeep"]
        }),
        countDirectories(artifactsDir, {
          excludeNames: [".gitkeep"]
        }),
        countFiles(samplesDir, {
          excludeNames: [".gitkeep"]
        })
      ]);

    const batchRuns = batchStore.list();
    const batchHasActiveRun = batchRuns.some((run) =>
      ["RUNNING", "PAUSING", "PAUSED", "STOPPING"].includes(run.status)
    );

    return {
      submissionEntries,
      batchRunEntries,
      batchRowEntries,
      logFiles,
      artifactFiles,
      artifactRuns,
      sampleFiles,
      authSessionPresent: await exists(config.paths.storageState),
      authMetadataPresent: await exists(config.paths.authMetadata),
      configPresent: await exists(configPath),
      activeRunsInMemory: runStore.listActive().length,
      batchRunsInMemory: batchRuns.length,
      batchHasActiveRun
    };
  }

  async clear(action: ClearAction): Promise<void> {
    const config = await configService.getConfig();
    const samplesDir = path.resolve(process.cwd(), "storage", "samples");

    if (action === "CLEAR_HISTORY" || action === "CLEAR_NON_AUTH") {
      await writeFile(config.paths.historyFile, "[]\n", "utf8");
      await batchHistoryRepository.clear();
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
      await rm(config.paths.storageState, { force: true });
      await rm(config.paths.authMetadata, { force: true });
    }
  }

}

export const storageService = new StorageService();
export type { StorageSummary, ClearAction };
