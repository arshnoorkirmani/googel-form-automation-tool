import type { BatchSubmissionPayload } from "@/modules/submission/batch.schema";
import type { SubmissionPayload } from "@/modules/submission/submission.schema";
import type { AuthStatus } from "@/server/auth/auth.types";
import type {
  ClearAction,
  StorageSummary
} from "@/server/storage/storage-service";
import type { BatchRunRecord } from "@/server/runs/batch-store";
import type { RunRecord } from "@/server/runs/run-types";

export type OperatorIdentity = {
  operatorId: string;
  email: string;
};

type ApiErrorResponse = {
  error?:
    | string
    | {
        code?: string;
        message?: string;
        retryable?: boolean;
      };
};

function extractErrorMessage(
  payload: ApiErrorResponse | null,
  status: number
): string {
  if (!payload?.error) {
    return `Request failed with ${status}`;
  }

  if (typeof payload.error === "string") {
    return payload.error;
  }

  return payload.error.message ?? `Request failed with ${status}`;
}

async function requestJson<T>(
  input: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    throw new Error(extractErrorMessage(payload, response.status));
  }

  return (await response.json()) as T;
}

export const apiClient = {
  getAuthStatus(validate = true) {
    return requestJson<{ status: AuthStatus }>(
      `/api/auth/status?validate=${validate ? "1" : "0"}`
    );
  },
  getOperatorIdentity() {
    return requestJson<{ operator: OperatorIdentity | null }>("/api/operator");
  },
  setOperatorIdentity(email: string) {
    return requestJson<{ operator: OperatorIdentity }>("/api/operator", {
      method: "POST",
      body: JSON.stringify({ email })
    });
  },
  clearOperatorIdentity() {
    return requestJson<{ ok: true }>("/api/operator", {
      method: "DELETE"
    });
  },
  startAuthSetup() {
    return requestJson<{ message: string; startedAt: string; formUrl: string }>(
      "/api/auth/setup/start",
      {
        method: "POST"
      }
    );
  },
  completeAuthSetup() {
    return requestJson<{
      message: string;
      savedAt: string;
      detectedEmail?: string;
    }>("/api/auth/setup/complete", {
      method: "POST"
    });
  },
  cancelAuthSetup() {
    return requestJson<{ ok: true }>("/api/auth/setup/cancel", {
      method: "POST"
    });
  },
  createRun(payload: SubmissionPayload) {
    return requestJson<{ run: RunRecord }>("/api/runs", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  createBatchRun(payload: BatchSubmissionPayload) {
    return requestJson<{ batchRun: BatchRunRecord }>("/api/batch-runs", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  getRun(runId: string) {
    return requestJson<{ run: RunRecord | null }>(`/api/runs/${runId}`);
  },
  getBatchRun(batchId: string) {
    return requestJson<{ batchRun: BatchRunRecord | null }>(
      `/api/batch-runs/${batchId}`
    );
  },
  performBatchAction(batchId: string, action: "PAUSE" | "RESUME" | "STOP") {
    return requestJson<{ batchRun: BatchRunRecord }>(
      `/api/batch-runs/${batchId}/action`,
      {
        method: "POST",
        body: JSON.stringify({ action })
      }
    );
  },
  retryBatchItems(batchId: string, itemIds: string[]) {
    return requestJson<{ success: true; batchRun: BatchRunRecord | null }>(
      `/api/batch-runs/${batchId}/retry`,
      {
        method: "POST",
        body: JSON.stringify({ itemIds })
      }
    );
  },
  getHistory() {
    return requestJson<{ history: RunRecord[] }>("/api/history");
  },
  getStorageSummary() {
    return requestJson<{ summary: StorageSummary }>("/api/storage");
  },
  clearStorage(action: ClearAction) {
    return requestJson<{ summary: StorageSummary }>("/api/storage", {
      method: "POST",
      body: JSON.stringify({ action })
    });
  }
};
