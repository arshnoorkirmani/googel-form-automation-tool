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
  const notInterestedReason = submission.notInterestedReason;

  if (!notInterestedReason) {
    throw new Error("Not Interested branch payload is incomplete.");
  }

  await selectDropdownQuestion(
    page,
    PAGE_LABELS.notInterestedReason!,
    notInterestedReason!
  );
  await clickNext(page);
}
