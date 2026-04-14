export const dynamic = "force-dynamic";

import { AuthStatusCard } from "@/components/dashboard/auth-status-card";
import { authService } from "@/server/auth/auth-service";
import { authSetupManager } from "@/server/auth/auth-setup-manager";
import { configService } from "@/server/config/config-service";

export default async function SettingsPage() {
  const config = await configService.getConfig();
  const authStatus = await authService.getStatus(false);
  const initialStatus = authSetupManager.getActiveSession()
    ? {
        ...authStatus,
        state: "SETUP_IN_PROGRESS" as const
      }
    : authStatus;

  return (
    <div className="space-y-6">
      <AuthStatusCard
        initialStatus={initialStatus}
        interactiveSetupEnabled={config.auth.interactiveSetupEnabled}
      />

      <section className="rounded-2xl border border-line bg-surface p-6 shadow-panel">
        <p className="text-xs uppercase tracking-[0.18em] text-muted">
          Runtime Settings
        </p>
        <h2 className="mt-1 text-xl font-semibold text-text">Runtime Configuration</h2>

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
            <p className="text-sm font-medium text-text">Interactive Auth Setup</p>
            <p className="mt-2 text-sm text-muted">
              {config.auth.interactiveSetupEnabled ? "Enabled" : "Disabled"}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
