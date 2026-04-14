"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Link from "next/link";

import { apiClient } from "@/lib/api/client";
import { formatDateTimeSummary } from "@/lib/utils/date-time";
import { CommonFieldsSection } from "@/components/submission/common-fields-section";
import { BranchFieldsSection } from "@/components/submission/branch-fields-section";
import { ModeToggle } from "@/components/submission/mode-toggle";
import { PreviewDialog } from "@/components/submission/preview-dialog";
import { RunProgressPanel } from "@/components/submission/run-progress-panel";
import { FieldError } from "@/components/shared/field-error";
import { createDefaultSubmissionValues } from "@/modules/submission/submission.defaults";
import {
  clearBranchFields,
  isUnsupportedCallStatus
} from "@/modules/submission/submission.support";
import {
  submissionSchema,
  type SubmissionPayload
} from "@/modules/submission/submission.schema";
import type { OperatorIdentity } from "@/lib/api/client";
import type {
  SubmissionFormValues,
  SubmissionSummaryItem
} from "@/modules/submission/submission.types";
import type { AuthStatus } from "@/server/auth/auth.types";
import type { RunRecord } from "@/server/runs/run-types";

function buildPreviewItems(values: SubmissionFormValues): SubmissionSummaryItem[] {
  const items: SubmissionSummaryItem[] = [
    { label: "Mode", value: values.mode },
    { label: "FO Number", value: values.foNumber },
    { label: "Call Status", value: values.callStatus || "-" },
    { label: "OMC", value: values.omc || "-" },
    { label: "No of Trucks", value: values.noOfTrucks },
    { label: "Fueling Potential", value: values.fuelingPotential },
    { label: "Fueling Frequency", value: values.fuelingFrequency },
    { label: "Remarks", value: values.remarks }
  ];

  switch (values.callStatus) {
    case "Interested":
      if (values.interestedReason) {
        items.push({ label: "Interested", value: values.interestedReason });
      }
      if (values.interestedNextTransaction) {
        items.push({
          label: "Next Transaction Date",
          value: formatDateTimeSummary(values.interestedNextTransaction)
        });
      }
      if (values.interestedPlanPitched) {
        items.push({
          label: "Plan Pitched",
          value: values.interestedPlanPitched
        });
      }
      break;
    case "Follow Up":
      if (values.followUpNextCall) {
        items.push({
          label: "Follow Up Next Call",
          value: formatDateTimeSummary(values.followUpNextCall)
        });
      }
      if (values.followUpPlanPitched) {
        items.push({
          label: "Follow Up Plan Pitched",
          value: values.followUpPlanPitched
        });
      }
      break;
    case "Call Back":
      if (values.callBackNextCall) {
        items.push({
          label: "Call Back Next Call",
          value: formatDateTimeSummary(values.callBackNextCall)
        });
      }
      break;
    case "Not Interested":
      if (values.notInterestedReason) {
        items.push({
          label: "Not Interested",
          value: values.notInterestedReason
        });
      }
      break;
    default:
      break;
  }

  return items;
}

export function SubmissionForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    getValues,
    watch,
    setError
  } = useForm<SubmissionFormValues>({
    resolver: zodResolver(submissionSchema),
    defaultValues: createDefaultSubmissionValues()
  });

  const [previewOpen, setPreviewOpen] = useState(false);
  const [stagedPayload, setStagedPayload] = useState<SubmissionPayload | null>(null);
  const [activeRun, setActiveRun] = useState<RunRecord | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [operator, setOperator] = useState<OperatorIdentity | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const pollerRef = useRef<number | null>(null);

  const watchedValues = watch();
  const callStatus = watchedValues.callStatus;
  const mode = watchedValues.mode;

  useEffect(() => {
    return () => {
      if (pollerRef.current) {
        window.clearInterval(pollerRef.current);
      }
    };
  }, []);

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
      .catch((error) => {
        if (!mounted) {
          return;
        }

        setRunError(
          error instanceof Error
            ? error.message
            : "Could not load auth session status."
        );
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

  const previewItems = useMemo(
    () => buildPreviewItems(watchedValues),
    [watchedValues]
  );

  const onCallStatusChange = (nextValue: string) => {
    const currentValues = getValues();
    const resetValues = clearBranchFields(currentValues);
    reset({
      ...resetValues,
      callStatus: nextValue as SubmissionFormValues["callStatus"]
    });
  };

  const onPreview = handleSubmit((values) => {
    if (authStatus && authStatus.state !== "VALID") {
      setRunError(
        authStatus.reason ??
          "Login setup is required before starting a dry run or submit."
      );
      return;
    }

    if (values.callStatus && isUnsupportedCallStatus(values.callStatus)) {
      setError("callStatus", {
        type: "manual",
        message: "This Call Status is not supported yet."
      });
      return;
    }

    const parsed = submissionSchema.parse(values);
    setStagedPayload(parsed);
    setPreviewOpen(true);
    setRunError(null);
  });

  const startRun = () => {
    if (!stagedPayload) {
      return;
    }

    startTransition(async () => {
      try {
        const created = await apiClient.createRun(stagedPayload);
        setActiveRun(created.run);
        setPreviewOpen(false);
        setRunError(null);

        if (pollerRef.current) {
          window.clearInterval(pollerRef.current);
        }

        pollerRef.current = window.setInterval(async () => {
          try {
            const latest = await apiClient.getRun(created.run.id);

            if (!latest.run) {
              return;
            }

            setActiveRun(latest.run);
            setRunError(null);

            if (
              latest.run.status === "SUCCEEDED" ||
              latest.run.status === "FAILED"
            ) {
              if (pollerRef.current) {
                window.clearInterval(pollerRef.current);
                pollerRef.current = null;
              }
            }
          } catch (error) {
            setRunError(
              error instanceof Error
                ? error.message
                : "Could not refresh run status."
            );
          }
        }, 1500);
      } catch (error) {
        setRunError(
          error instanceof Error ? error.message : "Failed to start automation."
        );
      }
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
      <div className="space-y-6">
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-panel">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted">
                Primary Workflow
              </p>
              <h2 className="mt-1 text-xl font-semibold text-text">
                New Submission
              </h2>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Default mode is Dry Run
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-sm text-muted">
            Fill the common fields, choose one of the supported Call Status branches,
            preview the payload, and then run a safe dry run or a real submit.
          </p>
        </div>

        {authLoading ? (
          <div className="rounded-2xl border border-line bg-surface-alt p-4 text-sm text-muted">
            Checking saved auth session...
          </div>
        ) : null}

        {!authLoading && authStatus && authStatus.state !== "VALID" ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">Login setup required before runs can start.</p>
            <p className="mt-1">
              {authStatus.reason ?? "No reusable browser session is available."}
            </p>
            <p className="mt-2">
              Open{" "}
              <Link href="/settings" className="font-medium underline">
                Settings
              </Link>{" "}
              or{" "}
              <Link href="/dashboard" className="font-medium underline">
                Dashboard
              </Link>{" "}
              and complete `Start Login Setup` first.
            </p>
          </div>
        ) : null}

        {!authLoading && !operator ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">Operator identity required before runs can start.</p>
            <p className="mt-1">
              Open{" "}
              <Link href="/settings" className="font-medium underline">
                Settings
              </Link>{" "}
              and save your `@blackbuck.com` operator email first.
            </p>
          </div>
        ) : null}

        <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
          <CommonFieldsSection
            register={register}
            errors={errors}
            callStatus={callStatus}
            onCallStatusChange={onCallStatusChange}
          />
          <BranchFieldsSection
            callStatus={callStatus}
            register={register}
            errors={errors}
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

          <ModeToggle register={register} />

          {runError ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {runError}
            </p>
          ) : null}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onPreview}
              disabled={authLoading || !operator || authStatus?.state !== "VALID"}
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white"
            >
              Preview Submission
            </button>
          </div>
        </form>
      </div>

      <RunProgressPanel run={activeRun} />

      <PreviewDialog
        open={previewOpen}
        mode={mode}
        items={previewItems}
        onClose={() => setPreviewOpen(false)}
        onConfirm={startRun}
        busy={isPending}
      />
    </div>
  );
}
