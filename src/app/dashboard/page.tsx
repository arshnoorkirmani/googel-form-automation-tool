export const dynamic = "force-dynamic";

import { AuthStatusCard } from "@/components/dashboard/auth-status-card";
import { RunSummaryCard } from "@/components/dashboard/run-summary-card";
import { OperationsHistoryView } from "@/components/history/operations-history-view";
import { authService } from "@/server/auth/auth-service";
import { authSetupManager } from "@/server/auth/auth-setup-manager";
import { historyRepository } from "@/server/history/history-repository";
import { batchHistoryRepository } from "@/server/runs/batch-history-repository";
import { batchStore } from "@/server/runs/batch-store";
import { runStore } from "@/server/runs/run-store";

export default async function DashboardPage() {
  const [history, batchRuns] = await Promise.all([
    historyRepository.list(),
    batchHistoryRepository.list()
  ]);
  const activeRuns = runStore.listActive();
  const activeBatches = batchStore
    .list()
    .filter((batch) =>
      ["QUEUED", "RUNNING", "PAUSING", "PAUSED", "STOPPING"].includes(batch.status)
    );
  const todayKey = new Date().toDateString();
  const todaysRuns = history.filter(
    (run) => new Date(run.createdAt).toDateString() === todayKey
  ).length;
  const failed =
    history.filter((run) => run.status === "FAILED").length +
    batchRuns.filter((batch) => batch.status === "FAILED").length;

  const authStatus = await authService.getStatus(false);
  const initialStatus = authSetupManager.getActiveSession()
    ? {
        ...authStatus,
        state: "SETUP_IN_PROGRESS" as const
      }
    : authStatus;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <RunSummaryCard label="Today's Runs" value={String(todaysRuns)} />
        <RunSummaryCard
          label="Active Work"
          value={String(activeRuns.length + activeBatches.length)}
          tone="success"
        />
        <RunSummaryCard label="Failed Records" value={String(failed)} tone="danger" />
      </div>

      <AuthStatusCard initialStatus={initialStatus} />

      <OperationsHistoryView
        submissions={history}
        batchRuns={batchRuns}
        activeRuns={activeRuns}
        activeBatches={activeBatches}
        showFilters={false}
      />
    </div>
  );
}
