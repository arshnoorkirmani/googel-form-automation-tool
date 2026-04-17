import type { Page } from "playwright";

import type { SubmissionPayload } from "@/modules/submission/submission.schema";
import {
  fillConfiguredPage,
  performConfiguredPageTransition
} from "@/server/automation/form/form-engine";
import {
  waitForFormReady
} from "@/server/automation/form/form-helpers";

export async function fillCommonPage(
  page: Page,
  submission: SubmissionPayload
): Promise<void> {
  await waitForFormReady(page);
  await fillConfiguredPage(page, "common", submission);
  await performConfiguredPageTransition(page, "common");
}
