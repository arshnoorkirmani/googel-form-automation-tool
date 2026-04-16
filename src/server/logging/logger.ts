import { appendFile } from "node:fs/promises";
import path from "node:path";

import { buildLogStreamReference } from "@/lib/utils/artifact-reference";
import { sanitizeFileName } from "@/lib/utils/file-name";
import { configService } from "@/server/config/config-service";
import { logEntryRepository } from "@/server/logging/log-entry-repository";

export type LogLevel = "INFO" | "WARN" | "ERROR";

export type LogContext = Record<string, unknown>;

export type LogEntry = {
  timestamp: string;
  level: LogLevel;
  runId?: string;
  event: string;
  context?: LogContext;
};

type StructuredLoggerOptions = {
  operatorId?: string;
};

export class StructuredLogger {
  constructor(
    private readonly runId?: string,
    private readonly options: StructuredLoggerOptions = {}
  ) {}

  async info(event: string, context?: LogContext): Promise<void> {
    await this.write("INFO", event, context);
  }

  async warn(event: string, context?: LogContext): Promise<void> {
    await this.write("WARN", event, context);
  }

  async error(event: string, context?: LogContext): Promise<void> {
    await this.write("ERROR", event, context);
  }

  async getLogFilePath(): Promise<string | undefined> {
    const config = await configService.getConfig();

    if (config.persistence.mongodbLogsEnabled) {
      return buildLogStreamReference(this.getStreamId());
    }

    if (!config.persistence.logFilesEnabled) {
      return undefined;
    }

    return this.getLocalLogFilePath(config.paths.logsDir);
  }

  private getStreamId(): string {
    return sanitizeFileName(
      this.runId ?? `system-${new Date().toISOString().slice(0, 10)}`
    );
  }

  private getLocalLogFilePath(logsDir: string): string {
    const fileName = this.runId
      ? `${this.runId}.jsonl`
      : `${new Date().toISOString().slice(0, 10)}.jsonl`;

    return path.join(logsDir, fileName);
  }

  private async write(
    level: LogLevel,
    event: string,
    context?: LogContext
  ): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      runId: this.runId,
      event,
      context
    };

    const serialized = `${JSON.stringify(entry)}\n`;
    const config = await configService.getConfig();

    if (config.persistence.logFilesEnabled) {
      await appendFile(this.getLocalLogFilePath(config.paths.logsDir), serialized, "utf8");
    }

    if (config.persistence.mongodbLogsEnabled) {
      await logEntryRepository.append({
        streamId: this.getStreamId(),
        operatorId: this.options.operatorId,
        entry
      });
    }

    process.stdout.write(serialized);
  }
}

export function createLogger(
  runId?: string,
  options?: StructuredLoggerOptions
): StructuredLogger {
  return new StructuredLogger(runId, options);
}
