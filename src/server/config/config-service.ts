import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { toAbsolutePath } from "@/lib/utils/path";
import type { RunMode } from "@/modules/submission/submission.types";

type RawAppConfig = {
  appName: string;
  formUrl: string;
  defaultMode: RunMode;
  maxRetries: number;
  maxBatchRows: number;
  debug: {
    enabled: boolean;
    slowMoMs: number;
  };
  paths: {
    storageState: string;
    authMetadata: string;
    historyFile: string;
    logsDir: string;
    artifactsDir: string;
  };
};

export type AppConfig = Omit<RawAppConfig, "paths"> & {
  paths: {
    storageState: string;
    authMetadata: string;
    historyFile: string;
    logsDir: string;
    artifactsDir: string;
  };
};

class ConfigService {
  private cache: AppConfig | null = null;

  async getConfig(): Promise<AppConfig> {
    if (this.cache) {
      return this.cache;
    }

    const configPath = path.resolve(process.cwd(), "config/app.config.json");
    const raw = await readFile(configPath, "utf8");
    const parsed = JSON.parse(raw) as RawAppConfig;

    const resolved: AppConfig = {
      ...parsed,
      formUrl: process.env.APP_FORM_URL ?? parsed.formUrl,
      defaultMode:
        (process.env.DEFAULT_MODE as RunMode | undefined) ?? parsed.defaultMode,
      maxRetries: Number(process.env.MAX_RETRIES ?? parsed.maxRetries),
      debug: {
        enabled: parsed.debug.enabled,
        slowMoMs: Number(
          process.env.DEBUG_SLOW_MO_MS ?? parsed.debug.slowMoMs
        )
      },
      paths: {
        storageState: toAbsolutePath(parsed.paths.storageState),
        authMetadata: toAbsolutePath(parsed.paths.authMetadata),
        historyFile: toAbsolutePath(parsed.paths.historyFile),
        logsDir: toAbsolutePath(parsed.paths.logsDir),
        artifactsDir: toAbsolutePath(parsed.paths.artifactsDir)
      }
    };

    await this.ensureRuntimeFiles(resolved);

    this.cache = resolved;
    return resolved;
  }

  async refresh(): Promise<AppConfig> {
    this.cache = null;
    return this.getConfig();
  }

  private async ensureRuntimeFiles(config: AppConfig): Promise<void> {
    const directories = [
      path.dirname(config.paths.storageState),
      path.dirname(config.paths.authMetadata),
      path.dirname(config.paths.historyFile),
      config.paths.logsDir,
      config.paths.artifactsDir
    ];

    for (const directory of directories) {
      await mkdir(directory, { recursive: true });
    }

    await this.ensureFile(config.paths.historyFile, "[]\n");
  }

  private async ensureFile(filePath: string, defaultContent: string) {
    try {
      await access(filePath);
    } catch {
      await writeFile(filePath, defaultContent, "utf8");
    }
  }
}

export const configService = new ConfigService();
