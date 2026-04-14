import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import { sanitizeFileName, toAbsolutePath } from "@/lib/utils/path";
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
    logsDir: string;
    artifactsDir: string;
    samplesDir: string;
  };
};

export type AppConfig = Omit<RawAppConfig, "paths"> & {
  auth: {
    interactiveSetupEnabled: boolean;
    sessionKey: string;
  };
  mongodb: {
    uri?: string;
    dbName: string;
  };
  persistence: {
    logFilesEnabled: boolean;
    screenshotsEnabled: boolean;
    runReportsEnabled: boolean;
  };
  paths: {
    logsDir: string;
    artifactsDir: string;
    samplesDir: string;
  };
};

function readBooleanEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];

  if (raw === undefined) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}

function defaultDatabaseName(appName: string): string {
  return sanitizeFileName(appName).replace(/-+/g, "_").toLowerCase();
}

class ConfigService {
  private cache: AppConfig | null = null;

  async getConfig(): Promise<AppConfig> {
    if (this.cache) {
      return this.cache;
    }

    const isProduction = process.env.NODE_ENV === "production";
    const configPath = path.resolve(process.cwd(), "config/app.config.json");
    const raw = await readFile(configPath, "utf8");
    const parsed = JSON.parse(raw) as RawAppConfig;

    const resolved: AppConfig = {
      ...parsed,
      appName: process.env.APP_NAME ?? parsed.appName,
      formUrl: process.env.APP_FORM_URL ?? parsed.formUrl,
      defaultMode:
        (process.env.DEFAULT_MODE as RunMode | undefined) ?? parsed.defaultMode,
      maxRetries: Number(process.env.MAX_RETRIES ?? parsed.maxRetries),
      maxBatchRows: Number(process.env.MAX_BATCH_ROWS ?? parsed.maxBatchRows),
      debug: {
        enabled: parsed.debug.enabled,
        slowMoMs: Number(
          process.env.DEBUG_SLOW_MO_MS ?? parsed.debug.slowMoMs
        )
      },
      auth: {
        interactiveSetupEnabled: readBooleanEnv(
          "AUTH_INTERACTIVE_SETUP_ENABLED",
          process.env.NODE_ENV !== "production"
        ),
        sessionKey: process.env.AUTH_SESSION_KEY?.trim() || "default"
      },
      mongodb: {
        uri: process.env.MONGODB_URI?.trim() || undefined,
        dbName:
          process.env.MONGODB_DB_NAME?.trim() ||
          defaultDatabaseName(process.env.APP_NAME ?? parsed.appName)
      },
      // Production safety: regardless of env var values, all local file
      // persistence is forced off in production to handle Render's ephemeral FS.
      persistence: {
        logFilesEnabled: isProduction ? false : readBooleanEnv("PERSIST_LOG_FILES", false),
        screenshotsEnabled: isProduction ? false : readBooleanEnv("PERSIST_SCREENSHOTS", false),
        runReportsEnabled: isProduction ? false : readBooleanEnv("PERSIST_RUN_REPORTS", false)
      },
      paths: {
        logsDir: toAbsolutePath(parsed.paths.logsDir),
        artifactsDir: toAbsolutePath(parsed.paths.artifactsDir),
        samplesDir: toAbsolutePath(parsed.paths.samplesDir)
      }
    };

    // In production (Render), skip local directory creation — the filesystem
    // is ephemeral and no critical data should be written there.
    if (!isProduction) {
      await this.ensureRuntimeFiles(resolved);
    }

    this.cache = resolved;
    return resolved;
  }

  async refresh(): Promise<AppConfig> {
    this.cache = null;
    return this.getConfig();
  }

  private async ensureRuntimeFiles(config: AppConfig): Promise<void> {
    const directories = [
      config.paths.logsDir,
      config.paths.artifactsDir,
      config.paths.samplesDir
    ];

    for (const directory of directories) {
      await mkdir(directory, { recursive: true });
    }
  }
}

export const configService = new ConfigService();
