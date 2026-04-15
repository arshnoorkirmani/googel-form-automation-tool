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

const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const GET_REQUEST_ATTEMPTS = 2;

type ApiErrorResponse = {
  error?:
    | string
    | {
        code?: string;
        message?: string;
        retryable?: boolean;
      };
};

class ApiClientError extends Error {
  readonly statusCode?: number;
  readonly retryable: boolean;

  constructor(
    message: string,
    options: { statusCode?: number; retryable?: boolean } = {}
  ) {
    super(message);
    this.name = "ApiClientError";
    this.statusCode = options.statusCode;
    this.retryable = options.retryable ?? false;
  }
}

function extractApiError(
  payload: ApiErrorResponse | null,
  status: number
): ApiClientError {
  if (!payload?.error) {
    return new ApiClientError(`Request failed with ${status}`, {
      statusCode: status
    });
  }

  if (typeof payload.error === "string") {
    return new ApiClientError(payload.error, {
      statusCode: status,
      retryable: status >= 500
    });
  }

  return new ApiClientError(payload.error.message ?? `Request failed with ${status}`, {
    statusCode: status,
    retryable: payload.error.retryable ?? status >= 500
  });
}

async function requestJson<T>(
  input: string,
  init?: RequestInit
): Promise<T> {
  const method = init?.method?.toUpperCase() ?? "GET";
  const attemptCount = method === "GET" ? GET_REQUEST_ATTEMPTS : 1;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attemptCount; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort("request-timeout"),
      DEFAULT_REQUEST_TIMEOUT_MS
    );

    try {
      const response = await fetch(input, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(init?.headers ?? {})
        },
        cache: "no-store",
        signal: controller.signal
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ApiErrorResponse | null;
        throw extractApiError(payload, response.status);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ApiClientError) {
        lastError = error;
        if (attempt < attemptCount && error.retryable) {
          continue;
        }
        throw error;
      }

      if (error instanceof DOMException && error.name === "AbortError") {
        lastError = new ApiClientError(
          "The request timed out while contacting the server. Please retry.",
          {
            statusCode: 504,
            retryable: true
          }
        );
      } else if (error instanceof TypeError) {
        lastError = new ApiClientError(
          "The server could not be reached. Check the network connection and try again.",
          {
            retryable: true
          }
        );
      } else {
        lastError = error;
      }

      if (attempt >= attemptCount) {
        throw lastError;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError ?? new ApiClientError("The request could not be completed.");
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
