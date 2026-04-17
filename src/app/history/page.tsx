export const dynamic = "force-dynamic";

import { OperationsHistoryView } from "@/components/history/operations-history-view";
import { historyRepository } from "@/server/history/history-repository";
import { batchHistoryRepository } from "@/server/runs/batch-history-repository";
import { batchStore } from "@/server/runs/batch-store";
import { runStore } from "@/server/runs/run-store";

export default async function HistoryPage() {
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

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">
          Local Reports
        </p>
        <h2 className="mt-1 text-xl font-semibold text-text">Operations History</h2>
      </div>
      <OperationsHistoryView
        submissions={history}
        batchRuns={batchRuns}
        activeRuns={activeRuns}
        activeBatches={activeBatches}
      />
    </div>
  );
}
