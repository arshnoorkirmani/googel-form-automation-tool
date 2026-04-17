import type { Page } from "playwright";

import type { SubmissionPayload } from "@/modules/submission/submission.schema";
import { PAGE_LABELS } from "@/modules/submission/submission.support";
import {
  clickNext,
  fillDateTimeQuestion
} from "@/server/automation/form/form-helpers";

export async function handleCallBackBranch(
  page: Page,
  submission: SubmissionPayload
): Promise<void> {
  const callBackNextCall = submission.callBackNextCall;

  if (!callBackNextCall) {
    throw new Error("Call Back branch payload is incomplete.");
  }

  await fillDateTimeQuestion(
    page,
    PAGE_LABELS.callBackNextCall!,
    callBackNextCall!
  );
  await clickNext(page);
}
