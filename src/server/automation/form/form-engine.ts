import type { Page } from "playwright";

import {
  currentFormDefinition,
  type CurrentFormFieldKey,
  type CurrentFormPageId
} from "@/lib/forms/current-form-definition";
import type { SubmissionPayload } from "@/modules/submission/submission.schema";
import {
  checkCheckboxQuestion,
  clickNext,
  clickSubmit,
  fillDateTimeQuestion,
  fillTextQuestion,
  getBodyText,
  selectDropdownQuestion
} from "@/server/automation/form/form-helpers";

type SubmissionValue = SubmissionPayload[Exclude<keyof SubmissionPayload, symbol>];

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === "boolean") {
    return value === false;
  }

  return false;
}

function getSubmissionValue(
  fieldKey: CurrentFormFieldKey,
  submission: SubmissionPayload
): SubmissionValue | boolean | string {
  const field = currentFormDefinition.fields[fieldKey];
  if (field.valueSource.kind === "static") {
    return field.valueSource.value;
  }

  return submission[field.valueSource.key as keyof SubmissionPayload];
}

async function fillConfiguredField(
  page: Page,
  fieldKey: CurrentFormFieldKey,
  submission: SubmissionPayload
): Promise<void> {
  const field = currentFormDefinition.fields[fieldKey];
  const rawValue = getSubmissionValue(fieldKey, submission);

  if (isEmptyValue(rawValue)) {
    if (field.required) {
      throw new Error(`Required field "${field.label}" is missing from the payload.`);
    }
    return;
  }

  switch (field.interaction) {
    case "check":
      await checkCheckboxQuestion(page, field.label);
      return;
    case "type":
      await fillTextQuestion(page, field.label, String(rawValue));
      return;
    case "select":
      await selectDropdownQuestion(page, field.label, String(rawValue));
      return;
    case "dateTime": {
      if (!rawValue || typeof rawValue !== "object") {
        throw new Error(`Date/time field "${field.label}" is missing from the payload.`);
      }
      await fillDateTimeQuestion(
        page,
        field.label,
        rawValue as NonNullable<SubmissionPayload["interestedNextTransaction"]>
      );
      return;
    }
    default:
      throw new Error(`Unsupported field interaction for "${field.label}".`);
  }
}

export async function fillConfiguredPage(
  page: Page,
  pageId: CurrentFormPageId,
  submission: SubmissionPayload
): Promise<void> {
  const pageDefinition = currentFormDefinition.pages[pageId];

  for (const fieldKey of pageDefinition.fields) {
    await fillConfiguredField(page, fieldKey, submission);
  }
}

export async function performConfiguredPageTransition(
  page: Page,
  pageId: CurrentFormPageId
): Promise<void> {
  const pageDefinition = currentFormDefinition.pages[pageId];

  switch (pageDefinition.transition.action) {
    case "next":
      await clickNext(page, currentFormDefinition.buttons.next);
      return;
    case "submit":
      await clickSubmit(page, currentFormDefinition.buttons.submit);
      return;
    case "none":
      return;
    default:
      throw new Error(`Unsupported page transition for "${pageDefinition.title}".`);
  }
}

export function resolveConfiguredBranchPage(
  callStatus: string
): CurrentFormPageId | null {
  return currentFormDefinition.branching.pageByValue[callStatus] ?? null;
}

export function buildConfiguredPagePlan(
  submission: SubmissionPayload
): CurrentFormPageId[] {
  const plan: CurrentFormPageId[] = ["common"];
  const branchPage = resolveConfiguredBranchPage(submission.callStatus);

  if (branchPage) {
    plan.push(branchPage);
  }

  plan.push("remarks");
  return plan;
}

export async function submitConfiguredRemarksPage(
  page: Page,
  submission: SubmissionPayload
): Promise<{ confirmationMessage: string; submitted: true }> {
  await fillConfiguredPage(page, "remarks", submission);
  await performConfiguredPageTransition(page, "remarks");
  await page.waitForLoadState("networkidle");

  const bodyText = await getBodyText(page);
  const confirmationMessage = bodyText.includes(
    currentFormDefinition.submitBehavior.confirmationText
  )
    ? "Form submitted successfully."
    : "Submit button was clicked. Verify confirmation on the page.";

  return {
    confirmationMessage,
    submitted: true
  };
}
