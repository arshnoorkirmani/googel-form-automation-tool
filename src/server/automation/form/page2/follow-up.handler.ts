import type { Page } from "playwright";

import type { SubmissionPayload } from "@/modules/submission/submission.schema";
import { PAGE_LABELS } from "@/modules/submission/submission.support";
import {
  clickNext,
  fillDateTimeQuestion,
  selectDropdownQuestion
} from "@/server/automation/form/form-helpers";

export async function handleFollowUpBranch(
  page: Page,
  submission: SubmissionPayload
): Promise<void> {
  const followUpNextCall = submission.followUpNextCall;
  const followUpPlanPitched = submission.followUpPlanPitched;

  if (!followUpNextCall || !followUpPlanPitched) {
    throw new Error("Follow Up branch payload is incomplete.");
  }

  await fillDateTimeQuestion(
    page,
    PAGE_LABELS.followUpNextCall!,
    followUpNextCall!
  );
  await selectDropdownQuestion(
    page,
    PAGE_LABELS.followUpPlanPitched!,
    followUpPlanPitched!
  );
  await clickNext(page);
}
