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
  operatorId?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  status: RunState;
  mode: RunMode;
  callStatus: SupportedCallStatus;
  foNumber: string;
  omc?: string;
  remarks: string;
  submission: SubmissionPayload;
  progress: ProgressEvent[];
  errorMessage?: string;
  artifacts: RunArtifacts;
  result?: {
    submitted: boolean;
    confirmationMessage: string;
    dryRun?: boolean;
  };
};

export function createQueuedRunRecord(
  id: string,
  submission: SubmissionPayload,
  operatorId?: string
): RunRecord {
  return {
    id,
    operatorId,
    createdAt: new Date().toISOString(),
    status: "QUEUED",
    mode: submission.mode,
    callStatus: submission.callStatus as SupportedCallStatus,
    foNumber: submission.foNumber,
    omc: submission.omc,
    remarks: submission.remarks,
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
