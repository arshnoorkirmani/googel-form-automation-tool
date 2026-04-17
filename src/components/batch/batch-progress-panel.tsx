"use client";

import { useEffect, useRef, useState } from "react";

import {
  RANDOM_CALL_STATUS_UI_LABEL,
  isRandomCallStatusSelection
} from "@/modules/submission/submission.support";
import { delaySecondsToFormsPerMinute } from "@/lib/utils/timing";
import type { BatchItemRecord, BatchRunRecord } from "@/server/runs/batch-store";

export function BatchProgressPanel({
  batchId,
  onBack
}: {
  batchId: string;
  onBack: () => void;
}) {
  const [activeRun, setActiveRun] = useState<BatchRunRecord | null>(null);
  const pollerRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const countdownRef = useRef<number | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const [screenshotModal, setScreenshotModal] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isRetryingAll, setIsRetryingAll] = useState(false);
  const [actionPending, setActionPending] = useState<
    "PAUSE" | "RESUME" | "STOP" | null
  >(null);

  useEffect(() => {
    const fetchStatus = async () => {
      if (inFlightRef.current || document.hidden) {
        return;
      }

      inFlightRef.current = true;
      try {
        const response = await fetch(`/api/batch-runs/${batchId}`);
        if (!response.ok) {
          return;
        }

        const { batchRun } = await response.json();
        if (!batchRun) {
          return;
        }

        setActiveRun(batchRun);

        if (
          batchRun.status === "COMPLETED" ||
          batchRun.status === "FAILED" ||
          batchRun.status === "STOPPED"
        ) {
          if (pollerRef.current) {
            window.clearInterval(pollerRef.current);
            pollerRef.current = null;
          }
        }
      } catch {
        // Ignore transient network errors while polling.
      } finally {
        inFlightRef.current = false;
      }
    };

    void fetchStatus();
    pollerRef.current = window.setInterval(fetchStatus, 3000);

    return () => {
      if (pollerRef.current) {
        window.clearInterval(pollerRef.current);
      }
    };
  }, [batchId]);

  useEffect(() => {
    const waiting = activeRun?.waitingUntil && activeRun.status === "RUNNING";
    if (!waiting) {
      if (countdownRef.current) {
        window.clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      return;
    }

    countdownRef.current = window.setInterval(() => {
      setNowMs(Date.now());
    }, 250);

    return () => {
      if (countdownRef.current) {
        window.clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [activeRun?.waitingUntil, activeRun?.status]);

  const handleRetry = async (foNumber: string) => {
    if (!activeRun) return;

    try {
      setIsRetrying(true);
      await fetch(`/api/batch-runs/${activeRun.batchId}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: [foNumber] })
      });
    } catch {
      // Ignore retry request errors here; polling will reflect latest state.
    } finally {
      setIsRetrying(false);
    }
  };

  const handleRetryAll = async (itemIds: string[]) => {
    if (!activeRun || itemIds.length === 0) return;

    try {
      setIsRetryingAll(true);
      await fetch(`/api/batch-runs/${activeRun.batchId}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds })
      });
    } catch {
      // Ignore retry-all request errors here; polling will reflect latest state.
    } finally {
      setIsRetryingAll(false);
    }
  };

  const handleAction = async (action: "PAUSE" | "RESUME" | "STOP") => {
    if (!activeRun) return;

    try {
      setActionPending(action);
      await fetch(`/api/batch-runs/${activeRun.batchId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
    } catch {
      // Ignore action request errors here; polling will reflect latest state.
    } finally {
      setActionPending(null);
    }
  };

  const getStatusClasses = (status: BatchItemRecord["status"]) => {
    switch (status) {
      case "PENDING":
        return "text-muted bg-surface-alt";
      case "RUNNING":
        return "text-blue-600 bg-blue-50";
      case "SUCCEEDED":
        return "text-emerald-700 bg-emerald-50";
      case "FAILED":
        return "text-rose-700 bg-rose-50";
      default:
        return "text-text bg-surface-alt";
    }
  };

  const waitingUntil = activeRun?.waitingUntil
    ? Date.parse(activeRun.waitingUntil)
    : null;
  const remainingSeconds =
    waitingUntil !== null ? Math.max(0, (waitingUntil - nowMs) / 1000) : null;
  const selectedRandomStatuses = activeRun?.submission.randomCallStatusPool ?? [];
  const failedItems =
    activeRun?.items.filter((item) => item.status === "FAILED") ?? [];
  const canRetryAll =
    failedItems.length > 0 &&
    !!activeRun &&
    !["RUNNING", "PAUSING", "STOPPING"].includes(activeRun.status);

  if (!activeRun) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-line bg-surface p-10 shadow-panel">
        <p className="animate-pulse text-sm text-muted">Loading batch status...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted">
              Batch Progress
            </p>
            <h2 className="mt-1 flex items-center gap-3 text-xl font-semibold text-text">
              Batch: {activeRun.batchId.slice(0, 8)}
              <span
                className={`rounded-xl border px-3 py-1 text-xs ${
                  activeRun.status === "FAILED" ||
                  activeRun.status === "STOPPED" ||
                  activeRun.status === "STOPPING"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : activeRun.status === "COMPLETED"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : activeRun.status === "PAUSED" ||
                          activeRun.status === "PAUSING"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-blue-200 bg-blue-50 text-blue-700"
                }`}
              >
                {activeRun.status.replace("_", " ")}
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {activeRun.status === "RUNNING" ? (
              <button
                onClick={() => handleAction("PAUSE")}
                disabled={actionPending !== null}
                className="rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-surface-alt disabled:opacity-50"
              >
                {actionPending === "PAUSE" ? "Pausing..." : "Pause"}
              </button>
            ) : null}
            {activeRun.status === "PAUSED" || activeRun.status === "PAUSING" ? (
              <button
                onClick={() => handleAction("RESUME")}
                disabled={actionPending !== null}
                className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {actionPending === "RESUME" ? "Resuming..." : "Resume"}
              </button>
            ) : null}
            {activeRun.status === "RUNNING" ||
            activeRun.status === "PAUSED" ||
            activeRun.status === "PAUSING" ? (
              <button
                onClick={() => handleAction("STOP")}
                disabled={actionPending !== null}
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
              >
                {actionPending === "STOP" ? "Stopping..." : "Stop"}
              </button>
            ) : null}
            {activeRun.status === "COMPLETED" ||
            activeRun.status === "FAILED" ||
            activeRun.status === "STOPPED" ? (
              <button
                type="button"
                onClick={onBack}
                className="rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-surface-alt"
              >
                Back to Form
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-line bg-surface-alt px-4 py-3 text-sm text-muted">
          <p className="font-medium text-text">
            Configured delay: {activeRun.submission.delaySeconds ?? 10} sec
          </p>
          {typeof activeRun.submission.delaySeconds === "number" ? (
            <p className="mt-1 text-xs text-muted">
              Approx.{" "}
              {delaySecondsToFormsPerMinute(
                activeRun.submission.delaySeconds
              )?.toFixed(2) ?? "n/a"}{" "}
              forms/min
            </p>
          ) : null}
          <p className="mt-2 text-xs text-muted">
            Call Status:{" "}
            {isRandomCallStatusSelection(activeRun.submission.callStatus)
              ? RANDOM_CALL_STATUS_UI_LABEL
              : activeRun.submission.callStatus}
          </p>
          {isRandomCallStatusSelection(activeRun.submission.callStatus) ? (
            <p className="mt-1 text-xs text-muted">
              Allowed random pool:{" "}
              {selectedRandomStatuses.length > 0
                ? selectedRandomStatuses.join(", ")
                : "None selected"}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-muted">
            Rows: {activeRun.totalRows} · Success: {activeRun.successCount} · Failed:{" "}
            {activeRun.failedCount} · Pending: {activeRun.pendingCount}
          </p>
        </div>

        {activeRun.status === "PAUSED" || activeRun.status === "PAUSING" ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Paused. Waiting will resume after you click Resume.
          </div>
        ) : null}

        {activeRun.status === "RUNNING" && remainingSeconds !== null ? (
          <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Next form starts in {remainingSeconds.toFixed(1)}s
          </div>
        ) : null}

        {canRetryAll ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-alt px-4 py-3 text-sm text-muted">
            <span>{failedItems.length} failed rows</span>
            <button
              type="button"
              onClick={() => handleRetryAll(failedItems.map((item) => item.foNumber))}
              disabled={isRetryingAll}
              className="rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-surface-alt disabled:opacity-50"
            >
              {isRetryingAll ? "Retrying..." : "Retry All Failed"}
            </button>
          </div>
        ) : null}

        {activeRun.errorMessage ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Critical Error: {activeRun.errorMessage}
          </p>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-alt font-medium text-muted">
              <tr>
                <th className="px-4 py-3">FO Number</th>
                <th className="px-4 py-3">Call Status</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Retry</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {activeRun.items.map((item) => {
                const screenshotPath = item.screenshotPath;

                return (
                  <tr key={item.foNumber} className="hover:bg-surface-alt/50">
                    <td className="px-4 py-3 font-medium text-text">{item.foNumber}</td>
                    <td className="px-4 py-3 text-muted">
                      {item.callStatus ??
                        (isRandomCallStatusSelection(activeRun.submission.callStatus)
                          ? "Random from selected pool"
                          : activeRun.submission.callStatus)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-md px-2 py-1 text-xs ${getStatusClasses(item.status)}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {item.durationMs ? `${Math.round(item.durationMs / 1000)}s` : "-"}
                    </td>
                    <td className="px-4 py-3 text-muted">{item.retryCount}</td>
                    <td className="px-4 py-3 text-muted">
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "-"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {item.status === "FAILED" && item.errorMessage}
                      {item.status === "SUCCEEDED" && item.confirmationMessage}
                      {item.status === "RUNNING" && "Processing..."}
                      {item.status === "PENDING" && "-"}
                    </td>
                    <td className="space-x-2 px-4 py-3 text-right">
                      {screenshotPath ? (
                        <button
                          className="text-xs text-blue-600 hover:underline"
                          onClick={() => {
                            const artifactPath =
                              "/api/artifacts/" +
                              screenshotPath
                                .split("artifacts")
                                .pop()
                                ?.replace(/\\/g, "/");

                            setScreenshotModal(artifactPath);
                          }}
                        >
                          Screenshot
                        </button>
                      ) : null}
                      {item.status === "FAILED" ? (
                        <button
                          disabled={isRetrying || activeRun.status === "RUNNING"}
                          onClick={() => handleRetry(item.foNumber)}
                          className="text-xs text-rose-600 hover:underline disabled:opacity-50"
                        >
                          Retry
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {screenshotModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setScreenshotModal(null)}
          />
          <div className="relative flex max-h-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="text-lg font-semibold text-text">Screenshot</h2>
              <button
                onClick={() => setScreenshotModal(null)}
                className="text-muted hover:text-text"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-100 p-4">
              <img
                src={screenshotModal}
                alt="Screenshot"
                className="block max-w-full"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
