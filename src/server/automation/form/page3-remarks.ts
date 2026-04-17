import type { Page } from "playwright";

import type { SubmissionPayload } from "@/modules/submission/submission.schema";
import {
  submitConfiguredRemarksPage
} from "@/server/automation/form/form-engine";

export async function fillRemarksPage(
  page: Page,
  submission: SubmissionPayload
): Promise<{ confirmationMessage: string; submitted: boolean }> {
  return submitConfiguredRemarksPage(page, submission);
}
