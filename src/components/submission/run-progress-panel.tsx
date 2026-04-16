import { StatusBadge } from "@/components/shared/status-badge";
import {
  formatArtifactReference,
  resolveArtifactUrl
} from "@/lib/utils/artifact-reference";
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

      {run.artifacts.screenshotPath ||
      run.artifacts.reportPath ||
      run.artifacts.logFilePath ? (
        <div className="mt-5 space-y-1 text-xs text-muted">
          {run.artifacts.screenshotPath ? (
            <p>
              Screenshot:{" "}
              <a
                className="text-blue-600 hover:underline"
                href={resolveArtifactUrl(run.artifacts.screenshotPath) ?? "#"}
                target="_blank"
                rel="noreferrer"
              >
                {formatArtifactReference(run.artifacts.screenshotPath)}
              </a>
            </p>
          ) : null}
          {run.artifacts.reportPath ? (
            <p>
              Report:{" "}
              <a
                className="text-blue-600 hover:underline"
                href={resolveArtifactUrl(run.artifacts.reportPath) ?? "#"}
                target="_blank"
                rel="noreferrer"
              >
                {formatArtifactReference(run.artifacts.reportPath)}
              </a>
            </p>
          ) : null}
          {run.artifacts.logFilePath ? (
            <p>
              Log:{" "}
              <a
                className="text-blue-600 hover:underline"
                href={resolveArtifactUrl(run.artifacts.logFilePath) ?? "#"}
                target="_blank"
                rel="noreferrer"
              >
                {formatArtifactReference(run.artifacts.logFilePath)}
              </a>
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
