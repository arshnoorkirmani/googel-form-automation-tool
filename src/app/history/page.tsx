export const dynamic = "force-dynamic";

import { HistoryTable } from "@/components/history/history-table";
import { RuntimeStateCard } from "@/components/shared/runtime-state-card";
import { toServerErrorMessage } from "@/server/errors/app-error";
import { historyRepository } from "@/server/history/history-repository";
import { getOptionalOperatorContext } from "@/server/operator/operator-context";

export default async function HistoryPage() {
  try {
    const operator = await getOptionalOperatorContext();
    const history = operator ? await historyRepository.list(operator.operatorId) : [];

    return (
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            Persisted Activity
          </p>
          <h2 className="mt-1 text-xl font-semibold text-text">Run History</h2>
        </div>
        <HistoryTable history={history} />
      </div>
    );
  } catch (error) {
    return (
      <RuntimeStateCard
        eyebrow="History"
        title="Run history is temporarily unavailable"
        message={toServerErrorMessage(error)}
      />
    );
  }
}
