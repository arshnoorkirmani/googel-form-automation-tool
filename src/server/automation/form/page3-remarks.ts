import type { Page } from "playwright";

import type { SubmissionPayload } from "@/modules/submission/submission.schema";
import { PAGE_LABELS } from "@/modules/submission/submission.support";
import {
  clickSubmit,
  fillTextQuestion,
  getBodyText
} from "@/server/automation/form/form-helpers";

export async function fillRemarksPage(
  page: Page,
  submission: SubmissionPayload
): Promise<{ confirmationMessage: string; submitted: boolean }> {
  await fillTextQuestion(page, PAGE_LABELS.remarks, submission.remarks);

  if (submission.mode === "DRY_RUN") {
    return {
      confirmationMessage: "Dry run completed on the final page without submitting.",
      submitted: false
    };
  }

  await clickSubmit(page);
  await page.waitForLoadState("networkidle");

  const bodyText = await getBodyText(page);
  const confirmationMessage =
    bodyText.includes("Your response has been recorded")
      ? "Form submitted successfully."
      : "Submit button was clicked. Verify confirmation on the page.";

  return {
    confirmationMessage,
    submitted: true
  };
}
