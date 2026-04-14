"use client";

import { useEffect, useState } from "react";

import { apiClient } from "@/lib/api/client";
import type {
  ClearAction,
  StorageSummary
} from "@/server/storage/storage-service";

export function DataManagementView() {
  const [summary, setSummary] = useState<StorageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<ClearAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getStorageSummary();
      setSummary(data.summary);
      setMessage(null);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not load storage summary."
      );
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
      const payload = await apiClient.clearStorage(action);
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
          <h3 className="text-lg font-semibold text-text">Run History</h3>
          <p className="mt-1 text-sm text-muted">
            {summary.historyEntries} entries in {summary.historyStore.toLowerCase()}
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
          <h3 className="text-lg font-semibold text-text">Logs</h3>
          <p className="mt-1 text-sm text-muted">
            {summary.logFiles} file logs in storage/logs
          </p>
          <p className="mt-2 text-xs text-muted">
            {summary.logPersistenceEnabled
              ? "File logging is enabled in addition to stdout."
              : "File logging is disabled; Render/runtime logs stay in stdout only."}
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
          <p className="mt-2 text-xs text-muted">
            {summary.artifactPersistenceEnabled
              ? `Screenshots: ${summary.screenshotPersistenceEnabled ? "on" : "off"}, JSON reports: ${summary.reportPersistenceEnabled ? "on" : "off"}`
              : "Artifact persistence is disabled by default."}
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
          <h3 className="text-lg font-semibold text-text">Batch State</h3>
          <p className="mt-1 text-sm text-muted">
            {summary.batchRunsInMemory} active/in-memory batches, {summary.batchRunsPersisted} persisted in MongoDB
          </p>
          {summary.batchHasActiveRun ? (
            <p className="mt-2 text-xs text-amber-700">
              Stop active batch runs before clearing.
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => runClear("CLEAR_BATCH")}
            disabled={busyAction !== null || summary.batchHasActiveRun}
            className="mt-4 rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-surface-alt disabled:opacity-60"
          >
            Clear Batch Results
          </button>
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
              : "No session state found."}{" "}
            {summary.authMetadataPresent ? "Metadata present." : "No metadata."}{" "}
            Stored in {summary.authStore.toLowerCase()}.
          </p>
          {!summary.operatorConfigured ? (
            <p className="mt-2 text-xs text-muted">
              Set operator identity in Settings to inspect or clear user-scoped auth,
              history, and batch data.
            </p>
          ) : null}
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
        Deployment-sensitive settings now come from environment variables.
        `config/app.config.json` only provides default values for local/runtime
        behavior.
      </div>
    </div>
  );
}
