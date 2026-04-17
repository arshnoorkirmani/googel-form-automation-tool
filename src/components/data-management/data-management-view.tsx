"use client";

import { useEffect, useState } from "react";

type StorageSummary = {
  submissionEntries: number;
  batchRunEntries: number;
  batchRowEntries: number;
  logFiles: number;
  artifactFiles: number;
  artifactRuns: number;
  sampleFiles: number;
  authSessionPresent: boolean;
  authMetadataPresent: boolean;
  configPresent: boolean;
  activeRunsInMemory: number;
  batchRunsInMemory: number;
  batchHasActiveRun: boolean;
};

type ClearAction =
  | "CLEAR_HISTORY"
  | "CLEAR_LOGS"
  | "CLEAR_ARTIFACTS"
  | "CLEAR_SAMPLES"
  | "CLEAR_BATCH"
  | "CLEAR_NON_AUTH"
  | "CLEAR_AUTH";

export function DataManagementView() {
  const [summary, setSummary] = useState<StorageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<ClearAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/storage");
      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSummary();
  }, []);

  const confirmAction = (action: ClearAction) => {
    if (action === "CLEAR_AUTH") {
      const result = window.prompt(
        "Type CLEAR AUTH to remove saved session data."
      );
      return result?.trim().toUpperCase() === "CLEAR AUTH";
    }

    if (action === "CLEAR_NON_AUTH") {
      return window.confirm(
        "This will clear history, logs, artifacts, samples, and batch memory. Continue?"
      );
    }

    return window.confirm("Are you sure you want to proceed?");
  };

  const runClear = async (action: ClearAction) => {
    if (!confirmAction(action)) {
      return;
    }

    setBusyAction(action);
    setMessage(null);

    try {
      const response = await fetch("/api/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to clear data.");
      }

      setSummary(payload.summary);
      setMessage("Action completed successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setBusyAction(null);
    }
  };

  if (loading || !summary) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-10 shadow-panel">
        <p className="text-sm text-muted">Loading storage summary…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-panel">
        <p className="text-xs uppercase tracking-[0.18em] text-muted">
          Data Management
        </p>
        <h2 className="mt-1 text-xl font-semibold text-text">
          Storage Cleanup
        </h2>
        <p className="mt-3 max-w-3xl text-sm text-muted">
          Review stored data and clear individual categories when needed. Auth
          session data is protected behind a stronger confirmation step.
        </p>
      </div>

      {message ? (
        <p className="rounded-xl border border-line bg-surface-alt px-4 py-3 text-sm text-muted">
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-panel">
          <h3 className="text-lg font-semibold text-text">Submission History</h3>
          <p className="mt-1 text-sm text-muted">
            {summary.submissionEntries} entries in storage/history/runs.json
          </p>
          <button
            type="button"
            onClick={() => runClear("CLEAR_HISTORY")}
            disabled={busyAction !== null}
            className="mt-4 rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-surface-alt disabled:opacity-60"
          >
            Clear History
          </button>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-panel">
          <h3 className="text-lg font-semibold text-text">Batch History</h3>
          <p className="mt-1 text-sm text-muted">
            {summary.batchRunEntries} batch summaries and {summary.batchRowEntries} batch rows
          </p>
          <button
            type="button"
            onClick={() => runClear("CLEAR_BATCH")}
            disabled={busyAction !== null || summary.batchHasActiveRun}
            className="mt-4 rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-surface-alt disabled:opacity-60"
          >
            Clear Batch History
          </button>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-panel">
          <h3 className="text-lg font-semibold text-text">Logs</h3>
          <p className="mt-1 text-sm text-muted">
            {summary.logFiles} log files in storage/logs
          </p>
          <button
            type="button"
            onClick={() => runClear("CLEAR_LOGS")}
            disabled={busyAction !== null}
            className="mt-4 rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-surface-alt disabled:opacity-60"
          >
            Clear Logs
          </button>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-panel">
          <h3 className="text-lg font-semibold text-text">Screenshots & Reports</h3>
          <p className="mt-1 text-sm text-muted">
            {summary.artifactFiles} files across {summary.artifactRuns} runs in
            storage/artifacts
          </p>
          <button
            type="button"
            onClick={() => runClear("CLEAR_ARTIFACTS")}
            disabled={busyAction !== null}
            className="mt-4 rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-surface-alt disabled:opacity-60"
          >
            Clear Artifacts
          </button>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-panel">
          <h3 className="text-lg font-semibold text-text">Batch Memory</h3>
          <p className="mt-1 text-sm text-muted">
            {summary.activeRunsInMemory} active single runs and {summary.batchRunsInMemory} batch runs in memory
          </p>
          {summary.batchHasActiveRun ? (
            <p className="mt-2 text-xs text-amber-700">
              Stop active batch runs before clearing.
            </p>
          ) : null}
          <p className="mt-4 text-xs text-muted">
            In-memory batch state is cleared together with batch history when you use
            the batch history cleanup above.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-panel">
          <h3 className="text-lg font-semibold text-text">Sample Data</h3>
          <p className="mt-1 text-sm text-muted">
            {summary.sampleFiles} files in storage/samples
          </p>
          <button
            type="button"
            onClick={() => runClear("CLEAR_SAMPLES")}
            disabled={busyAction !== null}
            className="mt-4 rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-surface-alt disabled:opacity-60"
          >
            Clear Samples
          </button>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-panel">
          <h3 className="text-lg font-semibold text-text">Auth Session</h3>
          <p className="mt-1 text-sm text-muted">
            {summary.authSessionPresent
              ? "Saved session detected."
              : "No session file found."}{" "}
            {summary.authMetadataPresent ? "Metadata present." : "No metadata."}
          </p>
          <button
            type="button"
            onClick={() => runClear("CLEAR_AUTH")}
            disabled={busyAction !== null}
            className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
          >
            Clear Auth/Session Data
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-5 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-text">
              Clear All Non-Auth Data
            </h3>
            <p className="mt-1 text-sm text-muted">
              Clears history, logs, artifacts, samples, and batch memory. Auth
              session data is kept intact.
            </p>
          </div>
          <button
            type="button"
            onClick={() => runClear("CLEAR_NON_AUTH")}
            disabled={busyAction !== null}
            className="rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-surface-alt disabled:opacity-60"
          >
            Clear Non-Auth Data
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface-alt p-4 text-xs text-muted">
        App settings are stored in config/app.config.json. Edit the file directly
        if you need to update defaults.
      </div>
    </div>
  );
}
