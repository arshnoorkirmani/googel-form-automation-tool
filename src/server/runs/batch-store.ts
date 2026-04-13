import { type RunRecord } from "@/server/runs/run-types";
import { type BatchSubmissionPayload } from "@/modules/submission/batch.schema";

export type BatchItemStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";

export type BatchItemRecord = {
  foNumber: string;
  callStatus?: string;
  status: BatchItemStatus;
  errorMessage?: string;
  confirmationMessage?: string;
  screenshotPath?: string;
  startedAt?: string;
  completedAt?: string;
};

export type BatchRunRecord = {
  batchId: string;
  status: "QUEUED" | "RUNNING" | "PAUSING" | "PAUSED" | "STOPPING" | "STOPPED" | "COMPLETED" | "FAILED";
  submission: BatchSubmissionPayload;
  items: BatchItemRecord[];
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  waitingUntil?: string;
  waitingStartedAt?: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __batchStore__: Map<string, BatchRunRecord> | undefined;
}

class BatchStore {
  private readonly store =
    globalThis.__batchStore__ ?? (globalThis.__batchStore__ = new Map());

  create(batchId: string, submission: BatchSubmissionPayload): BatchRunRecord {
    const record: BatchRunRecord = {
      batchId,
      status: "QUEUED",
      submission,
      items: submission.foNumberList.map((foNumber) => ({
        foNumber,
        status: "PENDING"
      }))
    };
    this.store.set(batchId, record);
    return record;
  }

  get(batchId: string): BatchRunRecord | null {
    return this.store.get(batchId) ?? null;
  }

  list(): BatchRunRecord[] {
    return Array.from(this.store.values());
  }

  clearAll(): void {
    this.store.clear();
  }

  setBatchRunning(batchId: string): BatchRunRecord {
    const current = this.mustGet(batchId);
    const updated: BatchRunRecord = {
      ...current,
      status: "RUNNING",
      startedAt: current.startedAt ?? new Date().toISOString()
    };
    this.store.set(batchId, updated);
    return updated;
  }

  requestPause(batchId: string): BatchRunRecord {
    const current = this.mustGet(batchId);
    if (current.status !== "RUNNING") return current;
    const updated: BatchRunRecord = { ...current, status: "PAUSING" };
    this.store.set(batchId, updated);
    return updated;
  }

  setBatchPaused(batchId: string): BatchRunRecord {
    const current = this.mustGet(batchId);
    const updated: BatchRunRecord = { ...current, status: "PAUSED" };
    this.store.set(batchId, updated);
    return updated;
  }

  resumeBatch(batchId: string): BatchRunRecord {
    const current = this.mustGet(batchId);
    if (current.status !== "PAUSED" && current.status !== "PAUSING") return current;
    const updated: BatchRunRecord = { ...current, status: "RUNNING" };
    this.store.set(batchId, updated);
    return updated;
  }

  requestStop(batchId: string): BatchRunRecord {
    const current = this.mustGet(batchId);
    if (current.status === "COMPLETED" || current.status === "FAILED" || current.status === "STOPPED") return current;
    const updated: BatchRunRecord = { ...current, status: "STOPPING" };
    this.store.set(batchId, updated);
    return updated;
  }

  setBatchStopped(batchId: string): BatchRunRecord {
    const current = this.mustGet(batchId);
    const updated: BatchRunRecord = { 
      ...current, 
      status: "STOPPED",
      waitingUntil: undefined,
      waitingStartedAt: undefined,
      completedAt: new Date().toISOString()
    };
    this.store.set(batchId, updated);
    return updated;
  }

  setBatchCompleted(batchId: string): BatchRunRecord {
    const current = this.mustGet(batchId);
    const updated: BatchRunRecord = {
      ...current,
      status: "COMPLETED",
      waitingUntil: undefined,
      waitingStartedAt: undefined,
      completedAt: new Date().toISOString()
    };
    this.store.set(batchId, updated);
    return updated;
  }

  setBatchFailed(batchId: string, errorMessage: string): BatchRunRecord {
    const current = this.mustGet(batchId);
    const updated: BatchRunRecord = {
      ...current,
      status: "FAILED",
      waitingUntil: undefined,
      waitingStartedAt: undefined,
      completedAt: new Date().toISOString(),
      errorMessage
    };
    this.store.set(batchId, updated);
    return updated;
  }

  setItemRunning(batchId: string, foNumber: string, callStatus?: string): BatchRunRecord {
    return this.updateItem(batchId, foNumber, (item) => ({
      ...item,
      callStatus: callStatus ?? item.callStatus,
      status: "RUNNING",
      startedAt: item.startedAt ?? new Date().toISOString()
    }));
  }

  setItemSucceeded(
    batchId: string,
    foNumber: string,
    confirmationMessage: string,
    screenshotPath?: string,
    callStatus?: string
  ): BatchRunRecord {
    return this.updateItem(batchId, foNumber, (item) => ({
      ...item,
      status: "SUCCEEDED",
      callStatus: callStatus ?? item.callStatus,
      confirmationMessage,
      screenshotPath: screenshotPath ?? item.screenshotPath,
      completedAt: new Date().toISOString()
    }));
  }

  setItemFailed(
    batchId: string,
    foNumber: string,
    errorMessage: string,
    screenshotPath?: string,
    callStatus?: string
  ): BatchRunRecord {
    return this.updateItem(batchId, foNumber, (item) => ({
      ...item,
      status: "FAILED",
      callStatus: callStatus ?? item.callStatus,
      errorMessage,
      screenshotPath: screenshotPath ?? item.screenshotPath,
      completedAt: new Date().toISOString()
    }));
  }

  setItemPending(batchId: string, foNumber: string): BatchRunRecord {
    return this.updateItem(batchId, foNumber, (item) => ({
      ...item,
      status: "PENDING",
      errorMessage: undefined,
      confirmationMessage: undefined,
      screenshotPath: undefined,
      startedAt: undefined,
      completedAt: undefined
    }));
  }

  setWaiting(batchId: string, delaySeconds: number, now = new Date()): BatchRunRecord {
    const current = this.mustGet(batchId);
    const updated: BatchRunRecord = {
      ...current,
      waitingStartedAt: now.toISOString(),
      waitingUntil: new Date(now.getTime() + delaySeconds * 1000).toISOString()
    };
    this.store.set(batchId, updated);
    return updated;
  }

  clearWaiting(batchId: string): BatchRunRecord {
    const current = this.mustGet(batchId);
    const updated: BatchRunRecord = {
      ...current,
      waitingStartedAt: undefined,
      waitingUntil: undefined
    };
    this.store.set(batchId, updated);
    return updated;
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

    const updated: BatchRunRecord = { ...current, items };
    this.store.set(batchId, updated);
    return updated;
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
