import type { SubmissionPayload } from "@/modules/submission/submission.schema";
import type { RunMode, SupportedCallStatus } from "@/modules/submission/submission.types";

export type RunState = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";

export type ProgressStepId =
  | "QUEUED"
  | "SESSION_LOADED"
  | "FORM_OPENED"
  | "COMMON_FIELDS_FILLED"
  | "BRANCH_FIELDS_FILLED"
  | "REMARKS_FILLED"
  | "DRY_RUN_COMPLETED"
  | "SUBMIT_COMPLETED"
  | "FAILED";

export type ProgressEvent = {
  stepId: ProgressStepId;
  label: string;
  status: "pending" | "active" | "completed" | "failed";
  at: string;
  detail?: string;
};

export type RunArtifacts = {
  screenshotPath?: string;
  reportPath?: string;
  logFilePath?: string;
};

export type RunRecord = {
  id: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  status: RunState;
  mode: RunMode;
  callStatus: SupportedCallStatus;
  submission: SubmissionPayload;
  progress: ProgressEvent[];
  errorMessage?: string;
  artifacts: RunArtifacts;
  result?: {
    dryRun: boolean;
    submitted: boolean;
    confirmationMessage: string;
  };
};

export function createQueuedRunRecord(
  id: string,
  submission: SubmissionPayload
): RunRecord {
  return {
    id,
    createdAt: new Date().toISOString(),
    status: "QUEUED",
    mode: submission.mode,
    callStatus: submission.callStatus as SupportedCallStatus,
    submission,
    progress: [
      {
        stepId: "QUEUED",
        label: "Run queued",
        status: "completed",
        at: new Date().toISOString()
      }
    ],
    artifacts: {}
  };
}
