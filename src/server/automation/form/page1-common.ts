import type { Page } from "playwright";

import type { SubmissionPayload } from "@/modules/submission/submission.schema";
import { PAGE_LABELS } from "@/modules/submission/submission.support";
import {
  checkCheckboxQuestion,
  clickNext,
  fillTextQuestion,
  selectDropdownQuestion,
  waitForFormReady
} from "@/server/automation/form/form-helpers";

export async function fillCommonPage(
  page: Page,
  submission: SubmissionPayload
): Promise<void> {
  await waitForFormReady(page);
  await checkCheckboxQuestion(page, PAGE_LABELS.emailCheckbox);
  await fillTextQuestion(page, PAGE_LABELS.foNumber, submission.foNumber);
  await selectDropdownQuestion(page, PAGE_LABELS.callStatus, submission.callStatus);
  if (submission.omc) {
    await selectDropdownQuestion(page, PAGE_LABELS.omc, submission.omc);
  }
  await fillTextQuestion(page, PAGE_LABELS.noOfTrucks, submission.noOfTrucks);
  await fillTextQuestion(
    page,
    PAGE_LABELS.fuelingPotential,
    submission.fuelingPotential
  );
  await fillTextQuestion(
    page,
    PAGE_LABELS.fuelingFrequency,
    submission.fuelingFrequency
  );
  await clickNext(page);
}
