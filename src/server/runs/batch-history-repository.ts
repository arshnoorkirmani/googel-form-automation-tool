import { configService } from "@/server/config/config-service";
import type {
  BatchItemRecord,
  BatchRunRecord
} from "@/server/runs/batch-store";
import {
  readJsonFile,
  writeJsonFile
} from "@/server/storage/json-file-store";

type StoredBatchRunRecord = Omit<BatchRunRecord, "items">;

function normalizeBatchItem(item: BatchItemRecord): BatchItemRecord {
  return {
    ...item,
    retryCount: item.retryCount ?? 0,
    createdAt: item.createdAt ?? new Date().toISOString(),
    updatedAt: item.updatedAt ?? item.completedAt ?? item.startedAt ?? item.createdAt
  };
}

function normalizeBatchRecord(record: BatchRunRecord): BatchRunRecord {
  const items = Array.isArray(record.items)
    ? record.items.map((item) => normalizeBatchItem(item))
    : [];
  const successCount = items.filter((item) => item.status === "SUCCEEDED").length;
  const failedCount = items.filter((item) => item.status === "FAILED").length;
  const runningCount = items.filter((item) => item.status === "RUNNING").length;
  const pendingCount = items.filter((item) => item.status === "PENDING").length;

  return {
    ...record,
    createdAt: record.createdAt ?? record.startedAt ?? new Date().toISOString(),
    items,
    totalRows: record.totalRows ?? items.length,
    successCount: record.successCount ?? successCount,
    failedCount: record.failedCount ?? failedCount,
    pendingCount: record.pendingCount ?? pendingCount,
    runningCount: record.runningCount ?? runningCount,
    durationMs:
      record.durationMs ??
      (record.startedAt && record.completedAt
        ? Math.max(0, Date.parse(record.completedAt) - Date.parse(record.startedAt))
        : undefined)
  };
}

function toStoredBatchRun(record: BatchRunRecord): StoredBatchRunRecord {
  const { items, ...summary } = normalizeBatchRecord(record);
  return summary;
}

class BatchHistoryRepository {
  async list(): Promise<BatchRunRecord[]> {
    const [runs, rows] = await Promise.all([this.readRuns(), this.readRows()]);

    return runs
      .map((run) =>
        normalizeBatchRecord({
          ...run,
          items: rows.filter((row) => row.batchId === run.batchId)
        })
      )
      .sort((left, right) => {
        const leftStamp = left.startedAt ?? left.createdAt;
        const rightStamp = right.startedAt ?? right.createdAt;
        return rightStamp.localeCompare(leftStamp);
      });
  }

  async getById(batchId: string): Promise<BatchRunRecord | null> {
    const [runs, rows] = await Promise.all([this.readRuns(), this.readRows()]);
    const run = runs.find((entry) => entry.batchId === batchId);

    if (!run) {
      return null;
    }

    return normalizeBatchRecord({
      ...run,
      items: rows.filter((row) => row.batchId === batchId)
    });
  }

  async upsert(record: BatchRunRecord): Promise<void> {
    const normalized = normalizeBatchRecord(record);
    const [runs, rows] = await Promise.all([this.readRuns(), this.readRows()]);
    const nextRuns = runs.filter((entry) => entry.batchId !== normalized.batchId);
    nextRuns.unshift(toStoredBatchRun(normalized));

    const nextRows = rows.filter((row) => row.batchId !== normalized.batchId);
    nextRows.unshift(...normalized.items.map((item) => normalizeBatchItem(item)));

    await Promise.all([
      this.writeRuns(nextRuns),
      this.writeRows(nextRows)
    ]);
  }

  async countRuns(): Promise<number> {
    return (await this.readRuns()).length;
  }

  async countRows(): Promise<number> {
    return (await this.readRows()).length;
  }

  async clear(): Promise<void> {
    await Promise.all([this.writeRuns([]), this.writeRows([])]);
  }

  private async readRuns(): Promise<StoredBatchRunRecord[]> {
    const filePath = (await configService.getConfig()).paths.batchRunsFile;
    return readJsonFile<StoredBatchRunRecord[]>(filePath, []);
  }

  private async readRows(): Promise<BatchItemRecord[]> {
    const filePath = (await configService.getConfig()).paths.batchRowsFile;
    const rows = await readJsonFile<BatchItemRecord[]>(filePath, []);
    return rows.map((row) => normalizeBatchItem(row));
  }

  private async writeRuns(records: StoredBatchRunRecord[]): Promise<void> {
    const filePath = (await configService.getConfig()).paths.batchRunsFile;
    await writeJsonFile(filePath, records);
  }

  private async writeRows(records: BatchItemRecord[]): Promise<void> {
    const filePath = (await configService.getConfig()).paths.batchRowsFile;
    await writeJsonFile(filePath, records);
  }
}

export const batchHistoryRepository = new BatchHistoryRepository();
