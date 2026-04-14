"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { CommonFieldsSection } from "@/components/submission/common-fields-section";
import { BranchFieldsSection } from "@/components/submission/branch-fields-section";
import { ModeToggle } from "@/components/submission/mode-toggle";
import { FieldError } from "@/components/shared/field-error";
import { createDefaultSubmissionValues } from "@/modules/submission/submission.defaults";
import { clearBranchFields } from "@/modules/submission/submission.support";
import { batchSubmissionSchema, type BatchSubmissionPayload } from "@/modules/submission/batch.schema";
import {
  BATCH_DELAY_LIMITS,
  clampDelaySeconds,
  delaySecondsToFormsPerMinute,
  formsPerMinuteToDelaySeconds
} from "@/lib/utils/timing";
import { apiClient, type OperatorIdentity } from "@/lib/api/client";
import type { AuthStatus } from "@/server/auth/auth.types";
import type { BatchRunRecord } from "@/server/runs/batch-store";

type BatchFormType = Omit<BatchSubmissionPayload, "foNumberList"> & { foNumberInput: string };

function parseFoNumbers(input: string): string[] {
  try {
     const parsed = JSON.parse(input);
     if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch (e) {
     // Not JSON
  }
  return input
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function BatchSubmissionForm({
  onBatchCreated
}: {
  onBatchCreated: (batchRun: BatchRunRecord) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    getValues,
    watch,
    setError,
    clearErrors,
    setValue
  } = useForm<BatchFormType>({
    defaultValues: {
      ...createDefaultSubmissionValues(),
      foNumberInput: "",
      delaySeconds: 10
    } as any
  });

  const [runError, setRunError] = useState<string | null>(null);
  const [operator, setOperator] = useState<OperatorIdentity | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [rateInput, setRateInput] = useState("");
  const [rateError, setRateError] = useState<string | null>(null);
  const [rateHint, setRateHint] = useState<string | null>(null);

  const watchedValues = watch();
  const callStatus = watchedValues.callStatus;
  const delaySecondsRaw = watchedValues.delaySeconds;
  const delaySecondsValue = Number.isFinite(delaySecondsRaw)
    ? delaySecondsRaw
    : Number(delaySecondsRaw);
  const effectiveDelaySeconds = Number.isFinite(delaySecondsValue) && delaySecondsValue > 0
    ? delaySecondsValue
    : null;
  const effectiveRate =
    effectiveDelaySeconds ? delaySecondsToFormsPerMinute(effectiveDelaySeconds) : null;

  useEffect(() => {
    let mounted = true;

    void Promise.all([
      apiClient.getOperatorIdentity(),
      apiClient.getAuthStatus(true)
    ])
      .then(([operatorResult, authResult]) => {
        if (!mounted) {
          return;
        }

        setOperator(operatorResult.operator);
        setAuthStatus(authResult.status);
      })
      .finally(() => {
        if (mounted) {
          setAuthLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const onCallStatusChange = (nextValue: string) => {
    const currentValues = getValues();
    const resetValues = clearBranchFields(currentValues as any);
    reset({
      ...resetValues,
      callStatus: nextValue as any
    });
  };

  const handleRateChange = (nextValue: string) => {
    setRateInput(nextValue);
    setRateHint(null);

    if (!nextValue.trim()) {
      setRateError(null);
      return;
    }

    const parsed = Number(nextValue);
    if (!Number.isFinite(parsed)) {
      setRateError("Enter a numeric forms-per-minute value.");
      return;
    }

    if (parsed <= 0) {
      setRateError("Forms per minute must be greater than 0.");
      return;
    }

    const computed = formsPerMinuteToDelaySeconds(parsed);
    if (!computed) {
      setRateError("Unable to calculate delay from this value.");
      return;
    }

    const clamped = clampDelaySeconds(computed);
    if (clamped !== computed) {
      setRateHint(
        `Capped to ${BATCH_DELAY_LIMITS.minSeconds}-${BATCH_DELAY_LIMITS.maxSeconds} sec range.`
      );
    }

    setValue("delaySeconds", Number(clamped.toFixed(2)), {
      shouldValidate: true,
      shouldDirty: true
    });
    setRateError(null);
  };

  const onSubmit = handleSubmit((values) => {
    clearErrors();
    const foNumberList = parseFoNumbers(values.foNumberInput);
    
    // We manually map it to the payload
    const payloadObject = {
      ...values,
      foNumberList
    };

    const parsed = batchSubmissionSchema.safeParse(payloadObject);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        if (path === "foNumberList") {
          setError("foNumberInput", { message: issue.message });
        } else {
          setError(path as any, { message: issue.message });
        }
      });
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/batch-runs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });

        if (!response.ok) {
           const err = await response.json();
           throw new Error(err.error || "Failed to start batch");
        }
        const created = await response.json();
        onBatchCreated(created.batchRun);
        setRunError(null);
      } catch (error) {
        setRunError(
          error instanceof Error ? error.message : "Failed to start batch automation."
        );
      }
    });
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-panel">
        <p className="text-xs uppercase tracking-[0.18em] text-muted">
          Bulk Workflow
        </p>
        <h2 className="mt-1 text-xl font-semibold text-text">
          Batch Submission
        </h2>
        <p className="mt-3 max-w-3xl text-sm text-muted">
          Provide a list of FO Numbers. The system will loop through them without closing the browser, entering the default shared values provided below into each line.
        </p>
      </div>

      <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
        {!authLoading && !operator ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">Operator identity required before batch runs can start.</p>
            <p className="mt-1">
              Open{" "}
              <Link href="/settings" className="font-medium underline">
                Settings
              </Link>{" "}
              and save your `@blackbuck.com` operator email first.
            </p>
          </div>
        ) : null}

        {!authLoading && operator && authStatus && authStatus.state !== "VALID" ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">Login setup required before batch runs can start.</p>
            <p className="mt-1">
              {authStatus.reason ?? "No reusable browser session is available."}
            </p>
          </div>
        ) : null}

        <section className="rounded-2xl border border-line bg-surface p-6 shadow-panel">
           <div className="mb-5">
             <h3 className="text-lg font-semibold text-text">FO Numbers Input</h3>
             <p className="text-xs text-muted">Comma separated or line separated or JSON array format</p>
           </div>
           <label className="block">
              <textarea
                {...register("foNumberInput")}
                rows={5}
                className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-text outline-none focus:border-accent font-mono"
                placeholder="FO-101&#10;FO-102&#10;FO-103"
              />
              <FieldError message={errors.foNumberInput?.message?.toString()} />
           </label>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-6 shadow-panel">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-text">Timer Pacing</h3>
          </div>
          <label className="block max-w-xs">
              <span className="mb-2 block text-sm font-medium text-text">Delay Between Forms (seconds)</span>
              <input
                type="number"
                min={1}
                max={300}
                placeholder="10"
                {...register("delaySeconds", { valueAsNumber: true })}
                className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-accent"
              />
              <FieldError message={errors.delaySeconds?.message?.toString()} />
              <p className="mt-1.5 text-xs text-muted">
                Har form submit hone ke baad itne seconds ruk ke agla shuru hoga
              </p>
          </label>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-text">
                Target Forms per Minute
              </span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="30"
                value={rateInput}
                onChange={(event) => handleRateChange(event.target.value)}
                className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-accent"
              />
              <FieldError message={rateError ?? undefined} />
              {rateHint ? (
                <p className="mt-1.5 text-xs text-amber-700">{rateHint}</p>
              ) : null}
            </label>
            <div className="rounded-xl border border-dashed border-line bg-surface-alt px-4 py-3 text-sm text-muted">
              {effectiveDelaySeconds ? (
                <>
                  <p className="font-medium text-text">
                    Effective delay: {effectiveDelaySeconds.toFixed(2)} sec
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {effectiveRate
                      ? `Approx. ${effectiveRate.toFixed(2)} forms/min`
                      : "Rate unavailable for this delay."}
                  </p>
                </>
              ) : (
                <p>Enter a valid delay or rate to see the effective timing.</p>
              )}
            </div>
          </div>
        </section>

        <CommonFieldsSection
          register={register as any}
          errors={errors as any}
          callStatus={callStatus}
          onCallStatusChange={onCallStatusChange}
          hideFoNumber={true}
        />

        <BranchFieldsSection
          callStatus={callStatus}
          register={register as any}
          errors={errors as any}
        />

        <section className="rounded-2xl border border-line bg-surface p-6 shadow-panel">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">
              Page 3
            </p>
            <h3 className="mt-1 text-lg font-semibold text-text">Remarks</h3>
          </div>
          <label className="block">
            <textarea
              {...register("remarks")}
              rows={5}
              className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-text"
              placeholder="Enter the required final remarks"
            />
            <FieldError message={errors.remarks?.message?.toString()} />
          </label>
        </section>

        <ModeToggle register={register as any} />

        {runError ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {runError}
          </p>
        ) : null}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onSubmit}
            disabled={isPending || authLoading || !operator || authStatus?.state !== "VALID"}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Start Batch Loop
          </button>
        </div>
      </form>
    </div>
  );
}
