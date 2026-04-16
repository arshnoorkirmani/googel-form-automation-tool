import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import { sanitizeFileName } from "@/lib/utils/file-name";
import { toAbsolutePath } from "@/lib/utils/path";
import {
  RUN_MODES,
  type RunMode
} from "@/modules/submission/submission.types";

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
    mongodbLogsEnabled: boolean;
    mongodbScreenshotsEnabled: boolean;
    mongodbRunReportsEnabled: boolean;
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

function readNumberEnv(
  name: string,
  fallback: number,
  options: { min?: number; integer?: boolean } = {}
): number {
  const raw = process.env[name];

  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be a valid number.`);
  }

  if (options.integer && !Number.isInteger(parsed)) {
    throw new Error(`${name} must be an integer.`);
  }

  if (options.min !== undefined && parsed < options.min) {
    throw new Error(`${name} must be greater than or equal to ${options.min}.`);
  }

  return parsed;
}

function readRunModeEnv(name: string, fallback: RunMode): RunMode {
  const raw = process.env[name]?.trim();

  if (!raw) {
    return fallback;
  }

  if (RUN_MODES.includes(raw as RunMode)) {
    return raw as RunMode;
  }

  throw new Error(`${name} must be one of: ${RUN_MODES.join(", ")}.`);
}

function readUrlEnv(name: string, fallback: string): string {
  const raw = process.env[name]?.trim();
  const value = raw || fallback;

  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Unsupported URL protocol.");
    }
    return parsed.toString();
  } catch {
    throw new Error(`${name} must be a valid http or https URL.`);
  }
}

function readMongoUriEnv(): string | undefined {
  const raw = process.env.MONGODB_URI?.trim();

  if (!raw) {
    return undefined;
  }

  if (raw.startsWith("mongodb://") || raw.startsWith("mongodb+srv://")) {
    return raw;
  }

  throw new Error(
    "MONGODB_URI must start with mongodb:// or mongodb+srv://."
  );
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
    const appName = process.env.APP_NAME?.trim() || parsed.appName;
    const mongodbUri = readMongoUriEnv();

    const resolved: AppConfig = {
      ...parsed,
      appName,
      formUrl: readUrlEnv("APP_FORM_URL", parsed.formUrl),
      defaultMode: readRunModeEnv("DEFAULT_MODE", parsed.defaultMode),
      maxRetries: readNumberEnv("MAX_RETRIES", parsed.maxRetries, {
        min: 1,
        integer: true
      }),
      maxBatchRows: readNumberEnv("MAX_BATCH_ROWS", parsed.maxBatchRows, {
        min: 1,
        integer: true
      }),
      debug: {
        enabled: parsed.debug.enabled,
        slowMoMs: readNumberEnv("DEBUG_SLOW_MO_MS", parsed.debug.slowMoMs, {
          min: 0,
          integer: true
        })
      },
      auth: {
        interactiveSetupEnabled: readBooleanEnv(
          "AUTH_INTERACTIVE_SETUP_ENABLED",
          process.env.NODE_ENV !== "production"
        ),
        sessionKey: process.env.AUTH_SESSION_KEY?.trim() || "default"
      },
      mongodb: {
        uri: mongodbUri,
        dbName:
          process.env.MONGODB_DB_NAME?.trim() || defaultDatabaseName(appName)
      },
      persistence: {
        logFilesEnabled: isProduction
          ? false
          : readBooleanEnv("PERSIST_LOG_FILES", false),
        screenshotsEnabled: isProduction
          ? false
          : readBooleanEnv("PERSIST_SCREENSHOTS", false),
        runReportsEnabled: isProduction
          ? false
          : readBooleanEnv("PERSIST_RUN_REPORTS", false),
        mongodbLogsEnabled:
          Boolean(mongodbUri) && readBooleanEnv("MONGODB_PERSIST_LOGS", true),
        mongodbScreenshotsEnabled:
          Boolean(mongodbUri) &&
          readBooleanEnv("MONGODB_PERSIST_SCREENSHOTS", isProduction),
        mongodbRunReportsEnabled:
          Boolean(mongodbUri) &&
          readBooleanEnv("MONGODB_PERSIST_RUN_REPORTS", isProduction)
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
