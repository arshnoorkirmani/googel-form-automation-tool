import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import type { RunRecord } from "@/server/runs/run-types";

type HistoryTableProps = {
  history: RunRecord[];
};

export function HistoryTable({ history }: HistoryTableProps) {
  if (history.length === 0) {
    return (
      <EmptyState
        title="No run history yet"
        description="Once operators start dry runs or submissions, persisted run records will appear here."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-panel">
      <table className="min-w-full divide-y divide-line">
        <thead className="bg-surface-alt">
          <tr className="text-left text-xs uppercase tracking-[0.15em] text-muted">
            <th className="px-4 py-3">Run ID</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Mode</th>
            <th className="px-4 py-3">Call Status</th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3">Artifacts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line text-sm text-text">
          {history.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3 font-mono text-xs">{row.id}</td>
              <td className="px-4 py-3">
                <StatusBadge status={row.status} />
              </td>
              <td className="px-4 py-3">{row.mode}</td>
              <td className="px-4 py-3">{row.callStatus}</td>
              <td className="px-4 py-3">
                {new Date(row.createdAt).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-xs text-muted">
                {row.artifacts.screenshotPath ? (
                  <div>{row.artifacts.screenshotPath}</div>
                ) : (
                  <div>No screenshot</div>
                )}
                {row.artifacts.logFilePath ? <div>{row.artifacts.logFilePath}</div> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
