"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { apiClient } from "@/lib/api/client";

type OperatorIdentityCardProps = {
  initialOperatorEmail?: string;
};

export function OperatorIdentityCard({
  initialOperatorEmail
}: OperatorIdentityCardProps) {
  const router = useRouter();
  const [email, setEmail] = useState(initialOperatorEmail ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      try {
        const result = await apiClient.setOperatorIdentity(email);
        setEmail(result.operator.email);
        setFeedback(
          "Operator identity saved. Auth, history, and batch persistence are now scoped to this user."
        );
        router.refresh();
      } catch (error) {
        setFeedback(
          error instanceof Error ? error.message : "Could not save operator identity."
        );
      }
    });

  const clear = () =>
    startTransition(async () => {
      try {
        await apiClient.clearOperatorIdentity();
        setEmail("");
        setFeedback("Operator identity cleared.");
        router.refresh();
      } catch (error) {
        setFeedback(
          error instanceof Error ? error.message : "Could not clear operator identity."
        );
      }
    });

  return (
    <section className="rounded-2xl border border-line bg-surface p-6 shadow-panel">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">
        Operator Identity
      </p>
      <h3 className="mt-1 text-lg font-semibold text-text">
        User-Scoped Data Isolation
      </h3>
      <p className="mt-3 max-w-3xl text-sm text-muted">
        Set your `@blackbuck.com` work email before using auth setup, runs, or batch
        automation. MongoDB auth state, history, and batch records are isolated to this
        operator.
      </p>

      <label className="mt-5 block max-w-xl">
        <span className="mb-2 block text-sm font-medium text-text">
          Operator Email
        </span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@blackbuck.com"
          className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-text outline-none focus:border-accent"
        />
      </label>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          Save Operator
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={isPending || !initialOperatorEmail}
          className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium text-text disabled:opacity-60"
        >
          Clear
        </button>
      </div>

      {feedback ? <p className="mt-4 text-sm text-muted">{feedback}</p> : null}
    </section>
  );
}
