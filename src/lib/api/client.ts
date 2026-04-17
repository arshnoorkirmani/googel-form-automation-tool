import type { SubmissionPayload } from "@/modules/submission/submission.schema";
import type { BatchRunRecord } from "@/server/runs/batch-store";
import type { RunRecord } from "@/server/runs/run-types";
import type { AuthStatus } from "@/server/auth/auth-service";

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
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    throw new Error(payload?.error ?? `Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export const apiClient = {
  getAuthStatus(validate = true) {
    return requestJson<{ status: AuthStatus }>(
      `/api/auth/status?validate=${validate ? "1" : "0"}`
    );
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
  getRun(runId: string) {
    return requestJson<{ run: RunRecord | null }>(`/api/runs/${runId}`);
  },
  getHistory() {
    return requestJson<{ history: RunRecord[]; batchRuns: BatchRunRecord[] }>(
      "/api/history"
    );
  }
};
