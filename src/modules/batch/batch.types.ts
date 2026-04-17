import type { SubmissionPayload } from "@/modules/submission/submission.schema";

export type BatchMode = "SUBMIT";

export type BatchRow = {
  rowNumber: number;
  submission: SubmissionPayload;
};

export type BatchExecutionPlan = {
  maxRows: number;
  strategy: "CONTINUE_ON_ERROR";
  rows: BatchRow[];
};
