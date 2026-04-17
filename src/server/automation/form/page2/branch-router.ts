import type { Page } from "playwright";

import type { SubmissionPayload } from "@/modules/submission/submission.schema";
import {
  fillConfiguredPage,
  performConfiguredPageTransition,
  resolveConfiguredBranchPage
} from "@/server/automation/form/form-engine";

export async function fillBranchPage(
  page: Page,
  submission: SubmissionPayload
): Promise<void> {
  const branchPageId = resolveConfiguredBranchPage(submission.callStatus);

  if (!branchPageId) {
    return;
  }

  await fillConfiguredPage(page, branchPageId, submission);
  await performConfiguredPageTransition(page, branchPageId);
}
