import { configService } from "@/server/config/config-service";
import type { RunRecord } from "@/server/runs/run-types";
import {
  readJsonFile,
  writeJsonFile
} from "@/server/storage/json-file-store";

function normalizeRunRecord(record: RunRecord): RunRecord {
  const createdAt = record.createdAt ?? new Date().toISOString();
  const startedAt = record.startedAt;
  const completedAt = record.completedAt;
  const durationMs =
    record.durationMs ??
    (startedAt && completedAt
      ? Math.max(0, Date.parse(completedAt) - Date.parse(startedAt))
      : undefined);
  const normalizedResult = record.result
    ? {
        ...record.result,
        submitted:
          record.result.submitted ??
          !(record.result.dryRun ?? false)
      }
    : undefined;

  return {
    ...record,
    createdAt,
    durationMs,
    foNumber: record.foNumber ?? record.submission?.foNumber ?? "-",
    callStatus:
      record.callStatus ??
      (record.submission?.callStatus as RunRecord["callStatus"]) ??
      "Call Disconnected",
    omc: record.omc ?? record.submission?.omc,
    remarks: record.remarks ?? record.submission?.remarks ?? "",
    progress: Array.isArray(record.progress) ? record.progress : [],
    artifacts: record.artifacts ?? {},
    result: normalizedResult
  };
}

class HistoryRepository {
  async list(): Promise<RunRecord[]> {
    const filePath = (await configService.getConfig()).paths.historyFile;
    const parsed = await readJsonFile<RunRecord[]>(filePath, []);

    return parsed
      .map((record) => normalizeRunRecord(record))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async getById(runId: string): Promise<RunRecord | null> {
    const all = await this.list();
    return all.find((record) => record.id === runId) ?? null;
  }

  async append(record: RunRecord): Promise<void> {
    const filePath = (await configService.getConfig()).paths.historyFile;
    const all = await this.list();
    const normalized = normalizeRunRecord(record);
    const deduped = all.filter((item) => item.id !== record.id);
    deduped.unshift(normalized);
    await writeJsonFile(filePath, deduped);
  }
}

export const historyRepository = new HistoryRepository();
