import { appendFile } from "node:fs/promises";
import path from "node:path";

import { configService } from "@/server/config/config-service";

export type LogLevel = "INFO" | "WARN" | "ERROR";

export type LogContext = Record<string, unknown>;

type LogEntry = {
  timestamp: string;
  level: LogLevel;
  runId?: string;
  event: string;
  context?: LogContext;
};

export class StructuredLogger {
  constructor(private readonly runId?: string) {}

  async info(event: string, context?: LogContext): Promise<void> {
    await this.write("INFO", event, context);
  }

  async warn(event: string, context?: LogContext): Promise<void> {
    await this.write("WARN", event, context);
  }

  async error(event: string, context?: LogContext): Promise<void> {
    await this.write("ERROR", event, context);
  }

  async getLogFilePath(): Promise<string> {
    const config = await configService.getConfig();
    const fileName = this.runId
      ? `${this.runId}.jsonl`
      : `${new Date().toISOString().slice(0, 10)}.jsonl`;

    return path.join(config.paths.logsDir, fileName);
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
    const logFilePath = await this.getLogFilePath();

    await appendFile(logFilePath, serialized, "utf8");
    process.stdout.write(serialized);
  }
}

export function createLogger(runId?: string): StructuredLogger {
  return new StructuredLogger(runId);
}
