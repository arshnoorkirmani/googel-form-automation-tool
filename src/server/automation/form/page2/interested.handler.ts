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
  const interestedReason = submission.interestedReason;
  const interestedNextTransaction = submission.interestedNextTransaction;
  const interestedPlanPitched = submission.interestedPlanPitched;

  if (!interestedReason || !interestedNextTransaction || !interestedPlanPitched) {
    throw new Error("Interested branch payload is incomplete.");
  }

  await selectDropdownQuestion(
    page,
    PAGE_LABELS.interestedReason!,
    interestedReason!
  );
  await fillDateTimeQuestion(
    page,
    PAGE_LABELS.interestedNextTransaction!,
    interestedNextTransaction!
  );
  await selectDropdownQuestion(
    page,
    PAGE_LABELS.interestedPlanPitched!,
    interestedPlanPitched!
  );
  await clickNext(page);
}
