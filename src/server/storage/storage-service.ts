import { access, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { configService } from "@/server/config/config-service";
import { batchStore } from "@/server/runs/batch-store";

type StorageSummary = {
  historyEntries: number;
  historyFilePresent: boolean;
  logFiles: number;
  artifactFiles: number;
  artifactRuns: number;
  sampleFiles: number;
  authSessionPresent: boolean;
  authMetadataPresent: boolean;
  configPresent: boolean;
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
    const historyFilePresent = await exists(config.paths.historyFile);
    const logsDir = config.paths.logsDir;
    const artifactsDir = config.paths.artifactsDir;
    const samplesDir = path.resolve(process.cwd(), "storage", "samples");
    const configPath = path.resolve(process.cwd(), "config", "app.config.json");

    const historyEntries = historyFilePresent
      ? await this.countHistoryEntries(config.paths.historyFile)
      : 0;

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

    return {
      historyEntries,
      historyFilePresent,
      logFiles,
      artifactFiles,
      artifactRuns,
      sampleFiles,
      authSessionPresent: await exists(config.paths.storageState),
      authMetadataPresent: await exists(config.paths.authMetadata),
      configPresent: await exists(configPath),
      batchRunsInMemory: batchRuns.length,
      batchHasActiveRun
    };
  }

  async clear(action: ClearAction): Promise<void> {
    const config = await configService.getConfig();
    const samplesDir = path.resolve(process.cwd(), "storage", "samples");

    if (action === "CLEAR_HISTORY" || action === "CLEAR_NON_AUTH") {
      await writeFile(config.paths.historyFile, "[]\n", "utf8");
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
    }

    if (action === "CLEAR_AUTH") {
      await rm(config.paths.storageState, { force: true });
      await rm(config.paths.authMetadata, { force: true });
    }
  }

  private async countHistoryEntries(historyFile: string): Promise<number> {
    try {
      const raw = await readFile(historyFile, "utf8");
      const parsed = JSON.parse(raw) as unknown[];
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  }
}

export const storageService = new StorageService();
export type { StorageSummary, ClearAction };
