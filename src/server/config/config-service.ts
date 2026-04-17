import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { toAbsolutePath } from "@/lib/utils/path";
import {
  ACTIVE_RUN_MODES,
  LEGACY_RUN_MODES,
  type RunMode
} from "@/modules/submission/submission.types";

export const AUTOMATION_SPEED_MODES = ["slow", "normal", "fast"] as const;
export type AutomationSpeedMode = (typeof AUTOMATION_SPEED_MODES)[number];

type DelayRange = {
  min: number;
  max: number;
};

type AutomationSpeedProfile = {
  speedMode: AutomationSpeedMode;
  typingDelay: DelayRange;
  fieldDelay: DelayRange;
  pageDelay: DelayRange;
};

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
    batchRunsFile: string;
    batchRowsFile: string;
    logsDir: string;
    artifactsDir: string;
  };
};

export type AppConfig = Omit<RawAppConfig, "paths"> & {
  automation: AutomationSpeedProfile;
  persistence: {
    screenshotsEnabled: boolean;
    runReportsEnabled: boolean;
  };
  paths: {
    storageState: string;
    authMetadata: string;
    historyFile: string;
    batchRunsFile: string;
    batchRowsFile: string;
    logsDir: string;
    artifactsDir: string;
  };
};

function readNumberEnv(
  name: string,
  fallback: number,
  options: { min?: number; integer?: boolean } = {}
): number {
  const raw = process.env[name]?.trim();

  if (!raw) {
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

function readBooleanEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim();

  if (!raw) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

function readRunModeEnv(name: string, fallback: RunMode): RunMode {
  const raw = process.env[name]?.trim();
  const normalizedFallback = LEGACY_RUN_MODES.includes(fallback as "DRY_RUN")
    ? "SUBMIT"
    : fallback;

  if (!raw) {
    return normalizedFallback;
  }

  if (ACTIVE_RUN_MODES.includes(raw as "SUBMIT")) {
    return raw as RunMode;
  }

  if (LEGACY_RUN_MODES.includes(raw as "DRY_RUN")) {
    return "SUBMIT";
  }

  throw new Error(
    `${name} must be one of: ${ACTIVE_RUN_MODES.join(", ")}. Legacy DRY_RUN values are normalized to SUBMIT.`
  );
}

function readAutomationSpeedModeEnv(
  fallback: AutomationSpeedMode
): AutomationSpeedMode {
  const raw = process.env.AUTOMATION_SPEED_MODE?.trim().toLowerCase();

  if (!raw) {
    return fallback;
  }

  if (AUTOMATION_SPEED_MODES.includes(raw as AutomationSpeedMode)) {
    return raw as AutomationSpeedMode;
  }

  throw new Error(
    `AUTOMATION_SPEED_MODE must be one of: ${AUTOMATION_SPEED_MODES.join(", ")}.`
  );
}

function getAutomationSpeedProfile(
  speedMode: AutomationSpeedMode
): AutomationSpeedProfile {
  switch (speedMode) {
    case "slow":
      return {
        speedMode,
        typingDelay: { min: 80, max: 120 },
        fieldDelay: { min: 1000, max: 2000 },
        pageDelay: { min: 1500, max: 3000 }
      };
    case "fast":
      return {
        speedMode,
        typingDelay: { min: 10, max: 30 },
        fieldDelay: { min: 100, max: 500 },
        pageDelay: { min: 1500, max: 3000 }
      };
    case "normal":
    default:
      return {
        speedMode,
        typingDelay: { min: 40, max: 80 },
        fieldDelay: { min: 500, max: 1200 },
        pageDelay: { min: 1500, max: 3000 }
      };
  }
}

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
      defaultMode: readRunModeEnv("DEFAULT_MODE", parsed.defaultMode),
      maxRetries: readNumberEnv("MAX_RETRIES", parsed.maxRetries, {
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
      automation: getAutomationSpeedProfile(
        readAutomationSpeedModeEnv("normal")
      ),
      persistence: {
        screenshotsEnabled: readBooleanEnv("PERSIST_SCREENSHOTS", false),
        runReportsEnabled: readBooleanEnv("PERSIST_RUN_REPORTS", false)
      },
      paths: {
        storageState: toAbsolutePath(parsed.paths.storageState),
        authMetadata: toAbsolutePath(parsed.paths.authMetadata),
        historyFile: toAbsolutePath(parsed.paths.historyFile),
        batchRunsFile: toAbsolutePath(parsed.paths.batchRunsFile),
        batchRowsFile: toAbsolutePath(parsed.paths.batchRowsFile),
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
      path.dirname(config.paths.batchRunsFile),
      path.dirname(config.paths.batchRowsFile),
      config.paths.logsDir,
      config.paths.artifactsDir
    ];

    for (const directory of directories) {
      await mkdir(directory, { recursive: true });
    }

    await this.ensureFile(config.paths.historyFile, "[]\n");
    await this.ensureFile(config.paths.batchRunsFile, "[]\n");
    await this.ensureFile(config.paths.batchRowsFile, "[]\n");
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
