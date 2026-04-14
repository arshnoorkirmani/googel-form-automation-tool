import {
  createQueuedRunRecord,
  type ProgressEvent,
  type ProgressStepId,
  type RunRecord
} from "@/server/runs/run-types";

declare global {
  // eslint-disable-next-line no-var
  var __runStore__: Map<string, RunRecord> | undefined;
}

class RunStore {
  private readonly store =
    globalThis.__runStore__ ?? (globalThis.__runStore__ = new Map());

  create(
    runId: string,
    submission: RunRecord["submission"],
    operatorId: string
  ): RunRecord {
    const record = createQueuedRunRecord(runId, submission, operatorId);
    this.store.set(runId, record);
    return record;
  }

  get(runId: string): RunRecord | null {
    return this.store.get(runId) ?? null;
  }

  listActive(): RunRecord[] {
    return [...this.store.values()].filter(
      (record) => record.status === "QUEUED" || record.status === "RUNNING"
    );
  }

  setRunning(runId: string): RunRecord {
    const current = this.mustGet(runId);
    const updated: RunRecord = {
      ...current,
      status: "RUNNING",
      startedAt: current.startedAt ?? new Date().toISOString()
    };

    this.store.set(runId, updated);
    return updated;
  }

  addProgress(
    runId: string,
    stepId: ProgressStepId,
    label: string,
    detail?: string,
    status: ProgressEvent["status"] = "completed"
  ): RunRecord {
    const current = this.mustGet(runId);
    const progressEvent: ProgressEvent = {
      stepId,
      label,
      status,
      at: new Date().toISOString(),
      detail
    };

    const updated: RunRecord = {
      ...current,
      progress: [...current.progress, progressEvent]
    };

    this.store.set(runId, updated);
    return updated;
  }

  attachArtifacts(
    runId: string,
    artifacts: Partial<RunRecord["artifacts"]>
  ): RunRecord {
    const current = this.mustGet(runId);
    const updated: RunRecord = {
      ...current,
      artifacts: {
        ...current.artifacts,
        ...artifacts
      }
    };

    this.store.set(runId, updated);
    return updated;
  }

  succeed(
    runId: string,
    confirmationMessage: string,
    submitted: boolean
  ): RunRecord {
    const current = this.mustGet(runId);
    const updated: RunRecord = {
      ...current,
      status: "SUCCEEDED",
      completedAt: new Date().toISOString(),
      result: {
        dryRun: !submitted,
        submitted,
        confirmationMessage
      }
    };

    this.store.set(runId, updated);
    return updated;
  }

  fail(runId: string, errorMessage: string): RunRecord {
    const current = this.mustGet(runId);
    const updated: RunRecord = {
      ...current,
      status: "FAILED",
      completedAt: new Date().toISOString(),
      errorMessage
    };

    this.store.set(runId, updated);
    return updated;
  }

  private mustGet(runId: string): RunRecord {
    const record = this.get(runId);

    if (!record) {
      throw new Error(`Run ${runId} was not found in memory.`);
    }

    return record;
  }
}

export const runStore = new RunStore();
