import type { Page } from "playwright";

import type { SubmissionPayload } from "@/modules/submission/submission.schema";
import { PAGE_LABELS } from "@/modules/submission/submission.support";
import {
  clickNext,
  fillDateTimeQuestion,
  selectDropdownQuestion
} from "@/server/automation/form/form-helpers";

export async function handleInterestedBranch(
  page: Page,
  submission: SubmissionPayload
): Promise<void> {
  if (
    !submission.interestedReason ||
    !submission.interestedNextTransaction ||
    !submission.interestedPlanPitched
  ) {
    throw new Error("Interested branch payload is incomplete.");
  }

  await selectDropdownQuestion(
    page,
    PAGE_LABELS.interestedReason,
    submission.interestedReason
  );
  await fillDateTimeQuestion(
    page,
    PAGE_LABELS.interestedNextTransaction,
    submission.interestedNextTransaction
  );
  await selectDropdownQuestion(
    page,
    PAGE_LABELS.interestedPlanPitched,
    submission.interestedPlanPitched
  );
  await clickNext(page);
}
