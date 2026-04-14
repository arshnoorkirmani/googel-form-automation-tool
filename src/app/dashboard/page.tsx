export const dynamic = "force-dynamic";

import { AuthStatusCard } from "@/components/dashboard/auth-status-card";
import { RunSummaryCard } from "@/components/dashboard/run-summary-card";
import { HistoryTable } from "@/components/history/history-table";
import { authService } from "@/server/auth/auth-service";
import { authSetupManager } from "@/server/auth/auth-setup-manager";
import { configService } from "@/server/config/config-service";
import { historyRepository } from "@/server/history/history-repository";
import { getOptionalOperatorContext } from "@/server/operator/operator-context";

export default async function DashboardPage() {
  const config = await configService.getConfig();
  const operator = await getOptionalOperatorContext();
  const history = operator ? await historyRepository.list(operator.operatorId) : [];
  const successful = history.filter((run) => run.status === "SUCCEEDED").length;
  const failed = history.filter((run) => run.status === "FAILED").length;

  const authStatus = operator
    ? await authService.getStatus(operator, false)
    : {
        state: "MISSING" as const,
        reason: "Set your @blackbuck.com operator email in Settings to isolate auth and history.",
        sessionStorageLocation: "MongoDB (operator not configured)"
      };
  const initialStatus =
    operator && authSetupManager.getActiveSession(operator.operatorId)
    ? {
        ...authStatus,
        state: "SETUP_IN_PROGRESS" as const
      }
    : authStatus;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <RunSummaryCard label="Total Runs" value={String(history.length)} />
        <RunSummaryCard
          label="Successful Runs"
          value={String(successful)}
          tone="success"
        />
        <RunSummaryCard label="Failed Runs" value={String(failed)} tone="danger" />
      </div>

      <AuthStatusCard
        initialStatus={initialStatus}
        interactiveSetupEnabled={config.auth.interactiveSetupEnabled}
        operatorConfigured={Boolean(operator)}
      />

      <section className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            Recent Activity
          </p>
          <h2 className="mt-1 text-xl font-semibold text-text">Latest Runs</h2>
        </div>
        <HistoryTable history={history.slice(0, 5)} />
      </section>
    </div>
  );
}
