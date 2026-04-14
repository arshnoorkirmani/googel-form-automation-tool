"use client";

import { useState, useTransition } from "react";

import { apiClient } from "@/lib/api/client";
import { StatusBadge } from "@/components/shared/status-badge";
import type { AuthStatus } from "@/server/auth/auth.types";

type AuthStatusCardProps = {
  initialStatus: AuthStatus;
  interactiveSetupEnabled: boolean;
};

export function AuthStatusCard({
  initialStatus,
  interactiveSetupEnabled
}: AuthStatusCardProps) {
  const [status, setStatus] = useState(initialStatus);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refresh = () =>
    startTransition(async () => {
      try {
        const result = await apiClient.getAuthStatus(true);
        setStatus(result.status);
        setFeedback("Session status refreshed.");
      } catch (error) {
        setFeedback(
          error instanceof Error ? error.message : "Could not refresh auth status."
        );
      }
    });

  const startSetup = () =>
    startTransition(async () => {
      try {
        const result = await apiClient.startAuthSetup();
        setFeedback(result.message);
        const statusResult = await apiClient.getAuthStatus(false);
        setStatus({
          ...statusResult.status,
          state: "SETUP_IN_PROGRESS"
        });
      } catch (error) {
        setFeedback(
          error instanceof Error ? error.message : "Could not start login setup."
        );
      }
    });

  const completeSetup = () =>
    startTransition(async () => {
      try {
        const result = await apiClient.completeAuthSetup();
        setFeedback(result.message);
        const statusResult = await apiClient.getAuthStatus(true);
        setStatus(statusResult.status);
      } catch (error) {
        setFeedback(
          error instanceof Error ? error.message : "Could not finish login setup."
        );
      }
    });

  const cancelSetup = () =>
    startTransition(async () => {
      try {
        await apiClient.cancelAuthSetup();
        setFeedback("Login setup session cancelled.");
        const statusResult = await apiClient.getAuthStatus(false);
        setStatus(statusResult.status);
      } catch (error) {
        setFeedback(
          error instanceof Error ? error.message : "Could not cancel login setup."
        );
      }
    });

  return (
    <section className="rounded-2xl border border-line bg-surface p-6 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            Auth Session
          </p>
          <h3 className="mt-1 text-lg font-semibold text-text">
            Browser Session Reuse
          </h3>
        </div>
        <StatusBadge status={status.state} />
      </div>

      <div className="mt-5 space-y-2 text-sm text-muted">
        <p>
          Session storage:
          <span className="ml-2 font-mono text-xs text-text">
            {status.sessionStorageLocation}
          </span>
        </p>
        {status.detectedEmail ? (
          <p>
            Detected account:
            <span className="ml-2 font-medium text-text">{status.detectedEmail}</span>
          </p>
        ) : null}
        {status.savedAt ? <p>Saved at: {new Date(status.savedAt).toLocaleString()}</p> : null}
        {status.lastValidatedAt ? (
          <p>
            Last checked: {new Date(status.lastValidatedAt).toLocaleString()}
          </p>
        ) : null}
        {status.reason ? <p>{status.reason}</p> : null}
        {!interactiveSetupEnabled ? (
          <p>
            Interactive login setup is disabled here. Refresh or bootstrap the
            session from a trusted local workstation that uses the same MongoDB
            connection.
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={refresh}
          className="rounded-xl border border-line bg-surface-alt px-4 py-2 text-sm font-medium text-text"
          disabled={isPending}
        >
          Refresh Status
        </button>
        <button
          type="button"
          onClick={startSetup}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white"
          disabled={isPending || !interactiveSetupEnabled}
        >
          Start Login Setup
        </button>
        <button
          type="button"
          onClick={completeSetup}
          className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium text-text"
          disabled={isPending || !interactiveSetupEnabled}
        >
          Finish Login Setup
        </button>
        <button
          type="button"
          onClick={cancelSetup}
          className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium text-text"
          disabled={isPending || !interactiveSetupEnabled}
        >
          Cancel
        </button>
      </div>

      {feedback ? <p className="mt-4 text-sm text-muted">{feedback}</p> : null}
    </section>
  );
}
