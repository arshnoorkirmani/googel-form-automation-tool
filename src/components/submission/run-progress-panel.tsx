import { StatusBadge } from "@/components/shared/status-badge";
import type { RunRecord } from "@/server/runs/run-types";

type RunProgressPanelProps = {
  run: RunRecord | null;
};

export function RunProgressPanel({ run }: RunProgressPanelProps) {
  if (!run) {
    return (
      <section className="rounded-2xl border border-line bg-surface p-6 shadow-panel">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            Automation Progress
          </p>
          <h3 className="mt-1 text-lg font-semibold text-text">No active run</h3>
        </div>
        <p className="mt-4 text-sm text-muted">
          Start a dry run or a submit run to see live progress, status, logs, and
          artifacts here.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-6 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            Automation Progress
          </p>
          <h3 className="mt-1 text-lg font-semibold text-text">{run.id}</h3>
        </div>
        <StatusBadge status={run.status} />
      </div>

      <div className="mt-5 space-y-3">
        {run.progress.map((event) => (
          <div
            key={`${event.stepId}-${event.at}`}
            className="rounded-xl border border-line bg-surface-alt px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-text">{event.label}</p>
              <span className="text-xs uppercase tracking-[0.12em] text-muted">
                {event.status}
              </span>
            </div>
            {event.detail ? (
              <p className="mt-1 text-sm text-muted">{event.detail}</p>
            ) : null}
            <p className="mt-2 text-xs text-muted">
              {new Date(event.at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {run.errorMessage ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {run.errorMessage}
        </p>
      ) : null}

      {run.artifacts.screenshotPath || run.artifacts.logFilePath ? (
        <div className="mt-5 space-y-1 text-xs text-muted">
          {run.artifacts.screenshotPath ? (
            <p>Screenshot: {run.artifacts.screenshotPath}</p>
          ) : null}
          {run.artifacts.logFilePath ? <p>Log: {run.artifacts.logFilePath}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
