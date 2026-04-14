export const dynamic = "force-dynamic";

import { HistoryTable } from "@/components/history/history-table";
import { historyRepository } from "@/server/history/history-repository";
import { getOptionalOperatorContext } from "@/server/operator/operator-context";

export default async function HistoryPage() {
  const operator = await getOptionalOperatorContext();
  const history = operator ? await historyRepository.list(operator.operatorId) : [];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">
          Local Reports
        </p>
        <h2 className="mt-1 text-xl font-semibold text-text">Run History</h2>
      </div>
      <HistoryTable history={history} />
    </div>
  );
}
