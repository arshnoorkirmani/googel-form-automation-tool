export const dynamic = "force-dynamic";

import { AuthStatusCard } from "@/components/dashboard/auth-status-card";
import { OperatorIdentityCard } from "@/components/dashboard/operator-identity-card";
import { RuntimeStateCard } from "@/components/shared/runtime-state-card";
import { authService } from "@/server/auth/auth-service";
import { authSetupManager } from "@/server/auth/auth-setup-manager";
import { configService } from "@/server/config/config-service";
import { toServerErrorMessage } from "@/server/errors/app-error";
import { getOptionalOperatorContext } from "@/server/operator/operator-context";

export default async function SettingsPage() {
  try {
    const config = await configService.getConfig();
    const operator = await getOptionalOperatorContext();
    const authStatus = operator
      ? await authService.getStatus(operator, false)
      : {
          state: "MISSING" as const,
          reason: "Set your @blackbuck.com operator email first.",
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
        <OperatorIdentityCard initialOperatorEmail={operator?.email} />
        <AuthStatusCard
          initialStatus={initialStatus}
          interactiveSetupEnabled={config.auth.interactiveSetupEnabled}
          operatorConfigured={Boolean(operator)}
        />

        <section className="rounded-2xl border border-line bg-surface p-6 shadow-panel">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            Runtime Settings
          </p>
          <h2 className="mt-1 text-xl font-semibold text-text">
            Runtime Configuration
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-line bg-surface-alt p-4">
              <p className="text-sm font-medium text-text">Form URL</p>
              <p className="mt-2 break-all text-sm text-muted">{config.formUrl}</p>
            </div>
            <div className="rounded-xl border border-line bg-surface-alt p-4">
              <p className="text-sm font-medium text-text">Default Mode</p>
              <p className="mt-2 text-sm text-muted">{config.defaultMode}</p>
            </div>
            <div className="rounded-xl border border-line bg-surface-alt p-4">
              <p className="text-sm font-medium text-text">Retry Attempts</p>
              <p className="mt-2 text-sm text-muted">{config.maxRetries}</p>
            </div>
            <div className="rounded-xl border border-line bg-surface-alt p-4">
              <p className="text-sm font-medium text-text">Debug Slow Motion</p>
              <p className="mt-2 text-sm text-muted">{config.debug.slowMoMs} ms</p>
            </div>
            <div className="rounded-xl border border-line bg-surface-alt p-4">
              <p className="text-sm font-medium text-text">MongoDB Database</p>
              <p className="mt-2 text-sm text-muted">{config.mongodb.dbName}</p>
            </div>
            <div className="rounded-xl border border-line bg-surface-alt p-4">
              <p className="text-sm font-medium text-text">
                Interactive Auth Setup
              </p>
              <p className="mt-2 text-sm text-muted">
                {config.auth.interactiveSetupEnabled ? "Enabled" : "Disabled"}
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  } catch (error) {
    return (
      <RuntimeStateCard
        eyebrow="Settings"
        title="Settings are temporarily unavailable"
        message={toServerErrorMessage(error)}
      />
    );
  }
}
