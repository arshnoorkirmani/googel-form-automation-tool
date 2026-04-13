import type { Page } from "playwright";

import type { SubmissionPayload } from "@/modules/submission/submission.schema";
import { PAGE_LABELS } from "@/modules/submission/submission.support";
import {
  clickNext,
  selectDropdownQuestion
} from "@/server/automation/form/form-helpers";

export async function handleNotInterestedBranch(
  page: Page,
  submission: SubmissionPayload
): Promise<void> {
  if (!submission.notInterestedReason) {
    throw new Error("Not Interested branch payload is incomplete.");
  }

  await selectDropdownQuestion(
    page,
    PAGE_LABELS.notInterestedReason,
    submission.notInterestedReason
  );
  await clickNext(page);
}
