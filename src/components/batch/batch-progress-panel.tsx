"use client";

import { useEffect, useRef, useState } from "react";

import type { BatchRunRecord, BatchItemRecord } from "@/server/runs/batch-store";
import { delaySecondsToFormsPerMinute } from "@/lib/utils/timing";

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

  useEffect(() => {
    const fetchStatus = async () => {
      if (inFlightRef.current) {
        return;
      }
      if (document.hidden) {
        return;
      }
      inFlightRef.current = true;
      try {
        const response = await fetch(`/api/batch-runs/${batchId}`);
        if (response.ok) {
          const { batchRun } = await response.json();
          if (batchRun) {
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
          }
        }
      } catch {
        // ignore network error
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
      // the poller will pick up the RUNNING state
    } catch {
      // Handle error visually if necessary
    } finally {
      setIsRetrying(false);
    }
  };

  const handleAction = async (action: "PAUSE" | "RESUME" | "STOP") => {
    if (!activeRun) return;
    try {
       await fetch(`/api/batch-runs/${activeRun.batchId}/action`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ action })
       });
    } catch {}
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

  if (!activeRun) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-10 shadow-panel flex items-center justify-center">
        <p className="text-sm text-muted animate-pulse">Loading batch status…</p>
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
                <span className={`rounded-xl border px-3 py-1 text-xs ${activeRun.status === "FAILED" || activeRun.status === "STOPPED" || activeRun.status === "STOPPING" ? "border-rose-200 bg-rose-50 text-rose-700" : activeRun.status === "COMPLETED" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : activeRun.status === "PAUSED" || activeRun.status === "PAUSING" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-blue-200 bg-blue-50 text-blue-700"}`}>
                   {activeRun.status.replace("_", " ")}
                </span>
             </h2>
           </div>
           
           <div className="flex items-center gap-3">
              {activeRun.status === "RUNNING" && (
                 <button onClick={() => handleAction("PAUSE")} className="rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-surface-alt">Pause</button>
              )}
              {(activeRun.status === "PAUSED" || activeRun.status === "PAUSING") && (
                 <button onClick={() => handleAction("RESUME")} className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">Resume</button>
              )}
              {(activeRun.status === "RUNNING" || activeRun.status === "PAUSED" || activeRun.status === "PAUSING") && (
                 <button onClick={() => handleAction("STOP")} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100">Stop</button>
              )}

              {(activeRun.status === "COMPLETED" || activeRun.status === "FAILED" || activeRun.status === "STOPPED") && (
                 <button
                    type="button"
                    onClick={onBack}
                    className="rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-surface-alt"
                 >
                    Back to Form
                 </button>
              )}
           </div>
        </div>

        <div className="mt-4 rounded-xl border border-line bg-surface-alt px-4 py-3 text-sm text-muted">
          <p className="font-medium text-text">
            Configured delay: {activeRun.submission.delaySeconds ?? 10} sec
          </p>
          {typeof activeRun.submission.delaySeconds === "number" ? (
            <p className="mt-1 text-xs text-muted">
              Approx.{" "}
              {delaySecondsToFormsPerMinute(activeRun.submission.delaySeconds)?.toFixed(2) ??
                "n/a"}{" "}
              forms/min
            </p>
          ) : null}
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

        {activeRun.errorMessage && (
           <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
             Critical Error: {activeRun.errorMessage}
           </p>
        )}

        <div className="mt-6 overflow-hidden rounded-xl border border-line">
           <table className="w-full text-left text-sm">
              <thead className="bg-surface-alt font-medium text-muted">
                 <tr>
                    <th className="px-4 py-3">FO Number</th>
                    <th className="px-4 py-3">Call Status</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Message</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-line">
                 {activeRun.items.map((item) => (
                    <tr key={item.foNumber} className="hover:bg-surface-alt/50">
                       <td className="px-4 py-3 font-medium text-text">{item.foNumber}</td>
                       <td className="px-4 py-3 text-muted">
                         {item.callStatus ??
                           (activeRun.submission.callStatus === "Random Unsupported"
                             ? "-"
                             : activeRun.submission.callStatus)}
                       </td>
                       <td className="px-4 py-3">
                          <span className={`inline-block rounded-md px-2 py-1 text-xs ${getStatusClasses(item.status)}`}>
                             {item.status}
                          </span>
                       </td>
                       <td className="px-4 py-3 text-muted">
                          {item.status === "FAILED" && item.errorMessage}
                          {item.status === "SUCCEEDED" && item.confirmationMessage}
                          {item.status === "RUNNING" && "Processing..."}
                       </td>
                       <td className="px-4 py-3 text-right space-x-2">
                          {item.screenshotPath && (
                             <button 
                               className="text-xs text-blue-600 hover:underline"
                               onClick={() => setScreenshotModal(
                                 "/api/artifacts/" + item.screenshotPath?.split("artifacts").pop()?.replace(/\\/g, "/")
                               )}
                             >
                                Image
                             </button>
                          )}
                          {item.status === "FAILED" && (
                             <button
                               disabled={isRetrying || activeRun.status === "RUNNING"}
                               onClick={() => handleRetry(item.foNumber)}
                               className="text-xs text-rose-600 hover:underline disabled:opacity-50"
                             >
                                Retry
                             </button>
                          )}
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>

      {screenshotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setScreenshotModal(null)}
          />
          <div className="relative flex max-h-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
               <h2 className="text-lg font-semibold text-text">Screenshot</h2>
               <button onClick={() => setScreenshotModal(null)} className="text-muted hover:text-text">
                  Close
               </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-100">
               {/* Because the screenshot isn't in public dir we rely on a hypothetical artifact proxy or direct img.
                   Wait, NextJs requires it in public/ if using <Image />, or we just use <img> for local dev. */}
               <img src={screenshotModal} alt="Screenshot" className="block max-w-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
