import { type BatchSubmissionPayload } from "@/modules/submission/batch.schema";
import { createRunId } from "@/lib/utils/id";

export type BatchItemStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
export type BatchRunStatus =
  | "QUEUED"
  | "RUNNING"
  | "PAUSING"
  | "PAUSED"
  | "STOPPING"
  | "STOPPED"
  | "COMPLETED"
  | "FAILED";

export type BatchItemRecord = {
  rowId: string;
  batchId: string;
  foNumber: string;
  callStatus?: string;
  remarksUsed?: string;
  status: BatchItemStatus;
  errorMessage?: string;
  confirmationMessage?: string;
  screenshotPath?: string;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
};

export type BatchRunRecord = {
  batchId: string;
  operatorId?: string;
  createdAt: string;
  status: BatchRunStatus;
  submission: BatchSubmissionPayload;
  items: BatchItemRecord[];
  totalRows: number;
  successCount: number;
  failedCount: number;
  pendingCount: number;
  runningCount: number;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  errorMessage?: string;
  waitingUntil?: string;
  waitingStartedAt?: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __batchStore__: Map<string, BatchRunRecord> | undefined;
}

function calculateDurationMs(
  startedAt?: string,
  completedAt?: string
): number | undefined {
  if (!startedAt || !completedAt) {
    return undefined;
  }

  return Math.max(0, Date.parse(completedAt) - Date.parse(startedAt));
}

function decorateRecord(record: BatchRunRecord): BatchRunRecord {
  const successCount = record.items.filter((item) => item.status === "SUCCEEDED").length;
  const failedCount = record.items.filter((item) => item.status === "FAILED").length;
  const runningCount = record.items.filter((item) => item.status === "RUNNING").length;
  const pendingCount = record.items.filter((item) => item.status === "PENDING").length;

  return {
    ...record,
    totalRows: record.items.length,
    successCount,
    failedCount,
    pendingCount,
    runningCount,
    durationMs:
      record.durationMs ??
      calculateDurationMs(record.startedAt, record.completedAt)
  };
}

class BatchStore {
  private readonly store =
    globalThis.__batchStore__ ?? (globalThis.__batchStore__ = new Map());

  hydrate(record: BatchRunRecord): BatchRunRecord {
    const normalized = decorateRecord(record);
    this.store.set(normalized.batchId, normalized);
    return normalized;
  }

  create(
    batchId: string,
    submission: BatchSubmissionPayload,
    operatorId?: string
  ): BatchRunRecord {
    const createdAt = new Date().toISOString();
    const record = decorateRecord({
      batchId,
      operatorId,
      createdAt,
      status: "QUEUED",
      submission,
      items: submission.foNumberList.map((foNumber) => ({
        rowId: createRunId("row"),
        batchId,
        foNumber,
        remarksUsed: submission.remarks,
        status: "PENDING",
        retryCount: 0,
        createdAt,
        updatedAt: createdAt
      })),
      totalRows: submission.foNumberList.length,
      successCount: 0,
      failedCount: 0,
      pendingCount: submission.foNumberList.length,
      runningCount: 0
    });

    this.store.set(batchId, record);
    return record;
  }

  get(batchId: string): BatchRunRecord | null {
    return this.store.get(batchId) ?? null;
  }

  list(): BatchRunRecord[] {
    return Array.from(this.store.values()).map((record) => decorateRecord(record));
  }

  clearAll(): void {
    this.store.clear();
  }

  setBatchRunning(batchId: string): BatchRunRecord {
    const current = this.mustGet(batchId);
    return this.save({
      ...current,
      status: "RUNNING",
      startedAt: current.startedAt ?? new Date().toISOString(),
      completedAt: undefined,
      durationMs: undefined,
      errorMessage: undefined
    });
  }

  requestPause(batchId: string): BatchRunRecord {
    const current = this.mustGet(batchId);
    if (current.status !== "RUNNING") {
      return current;
    }

    return this.save({ ...current, status: "PAUSING" });
  }

  setBatchPaused(batchId: string): BatchRunRecord {
    const current = this.mustGet(batchId);
    return this.save({ ...current, status: "PAUSED" });
  }

  resumeBatch(batchId: string): BatchRunRecord {
    const current = this.mustGet(batchId);
    if (current.status !== "PAUSED" && current.status !== "PAUSING") {
      return current;
    }

    return this.save({ ...current, status: "RUNNING" });
  }

  requestStop(batchId: string): BatchRunRecord {
    const current = this.mustGet(batchId);
    if (["COMPLETED", "FAILED", "STOPPED"].includes(current.status)) {
      return current;
    }

    return this.save({ ...current, status: "STOPPING" });
  }

  setBatchStopped(batchId: string): BatchRunRecord {
    const current = this.mustGet(batchId);
    const completedAt = new Date().toISOString();

    return this.save({
      ...current,
      status: "STOPPED",
      waitingUntil: undefined,
      waitingStartedAt: undefined,
      completedAt,
      durationMs: calculateDurationMs(current.startedAt, completedAt)
    });
  }

  setBatchCompleted(batchId: string): BatchRunRecord {
    const current = this.mustGet(batchId);
    const completedAt = new Date().toISOString();

    return this.save({
      ...current,
      status: "COMPLETED",
      waitingUntil: undefined,
      waitingStartedAt: undefined,
      completedAt,
      durationMs: calculateDurationMs(current.startedAt, completedAt)
    });
  }

  setBatchFailed(batchId: string, errorMessage: string): BatchRunRecord {
    const current = this.mustGet(batchId);
    const completedAt = new Date().toISOString();

    return this.save({
      ...current,
      status: "FAILED",
      waitingUntil: undefined,
      waitingStartedAt: undefined,
      completedAt,
      durationMs: calculateDurationMs(current.startedAt, completedAt),
      errorMessage
    });
  }

  setItemRunning(
    batchId: string,
    foNumber: string,
    callStatus?: string
  ): BatchRunRecord {
    return this.updateItem(batchId, foNumber, (item) => {
      const startedAt = item.startedAt ?? new Date().toISOString();

      return {
        ...item,
        callStatus: callStatus ?? item.callStatus,
        status: "RUNNING",
        remarksUsed: item.remarksUsed,
        startedAt,
        updatedAt: new Date().toISOString(),
        completedAt: undefined,
        durationMs: undefined
      };
    });
  }

  setItemSucceeded(
    batchId: string,
    foNumber: string,
    confirmationMessage: string,
    screenshotPath?: string,
    callStatus?: string
  ): BatchRunRecord {
    return this.updateItem(batchId, foNumber, (item) => {
      const completedAt = new Date().toISOString();
      const startedAt = item.startedAt ?? item.createdAt;

      return {
        ...item,
        status: "SUCCEEDED",
        callStatus: callStatus ?? item.callStatus,
        confirmationMessage,
        errorMessage: undefined,
        screenshotPath: screenshotPath ?? item.screenshotPath,
        updatedAt: completedAt,
        completedAt,
        durationMs: calculateDurationMs(startedAt, completedAt)
      };
    });
  }

  setItemFailed(
    batchId: string,
    foNumber: string,
    errorMessage: string,
    screenshotPath?: string,
    callStatus?: string
  ): BatchRunRecord {
    return this.updateItem(batchId, foNumber, (item) => {
      const completedAt = new Date().toISOString();
      const startedAt = item.startedAt ?? item.createdAt;

      return {
        ...item,
        status: "FAILED",
        callStatus: callStatus ?? item.callStatus,
        confirmationMessage: undefined,
        errorMessage,
        screenshotPath: screenshotPath ?? item.screenshotPath,
        updatedAt: completedAt,
        completedAt,
        durationMs: calculateDurationMs(startedAt, completedAt)
      };
    });
  }

  setItemPending(
    batchId: string,
    foNumber: string,
    options?: { incrementRetry?: boolean }
  ): BatchRunRecord {
    return this.updateItem(batchId, foNumber, (item) => ({
      ...item,
      status: "PENDING",
      errorMessage: undefined,
      confirmationMessage: undefined,
      screenshotPath: undefined,
      startedAt: undefined,
      completedAt: undefined,
      durationMs: undefined,
      retryCount: item.retryCount + (options?.incrementRetry ? 1 : 0),
      updatedAt: new Date().toISOString()
    }));
  }

  setWaiting(
    batchId: string,
    delaySeconds: number,
    now = new Date()
  ): BatchRunRecord {
    const current = this.mustGet(batchId);

    return this.save({
      ...current,
      waitingStartedAt: now.toISOString(),
      waitingUntil: new Date(now.getTime() + delaySeconds * 1000).toISOString()
    });
  }

  clearWaiting(batchId: string): BatchRunRecord {
    const current = this.mustGet(batchId);

    return this.save({
      ...current,
      waitingStartedAt: undefined,
      waitingUntil: undefined
    });
  }

  private updateItem(
    batchId: string,
    foNumber: string,
    updater: (item: BatchItemRecord) => BatchItemRecord
  ): BatchRunRecord {
    const current = this.mustGet(batchId);
    const items = current.items.map((item) =>
      item.foNumber === foNumber ? updater(item) : item
    );

    return this.save({ ...current, items });
  }

  private save(record: BatchRunRecord): BatchRunRecord {
    const normalized = decorateRecord(record);
    this.store.set(normalized.batchId, normalized);
    return normalized;
  }

  private mustGet(batchId: string): BatchRunRecord {
    const record = this.get(batchId);
    if (!record) {
      throw new Error(`Batch ${batchId} was not found in memory.`);
    }
    return record;
  }
}

export const batchStore = new BatchStore();
