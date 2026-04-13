import type { Locator, Page } from "playwright";

import {
  normalizeDateForForm,
  toIsoDateString,
  type DateTimeValue
} from "@/lib/utils/date-time";
import { FORM_BUTTONS } from "@/server/automation/form/form-locators";

function escapeForRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function exactTextRegex(value: string): RegExp {
  const normalized = value
    .trim()
    .split(/\s+/)
    .map((segment) => escapeForRegex(segment))
    .join("\\s+");

  return new RegExp(`^\\s*${normalized}\\s*$`, "i");
}

function getOptionCandidates(optionText: string): string[] {
  const normalized = optionText.trim().toLowerCase();

  if (normalized === "other") {
    return ["Other", "Others"];
  }

  if (normalized === "super bonus plus plan") {
    return ["Super Bonus Plus Plan", "Super Bonus Plus"];
  }

  return [optionText];
}

export async function waitForFormReady(page: Page): Promise<void> {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForSelector("body", { timeout: 60_000 });
}

export function questionLocator(page: Page, label: string): Locator {
  const matchingItems = page
    .locator('div[role="listitem"]')
    .filter({
      has: page.locator("span.M7eMe").filter({ hasText: exactTextRegex(label) })
    });

  const interactiveItem = matchingItems
    .filter({
      has: page.locator(
        'input, textarea, [role="listbox"], [role="checkbox"], [type="date"]'
      )
    })
    .first();

  return interactiveItem.or(matchingItems.first()).first();
}

export async function ensureQuestion(page: Page, label: string): Promise<Locator> {
  const question = questionLocator(page, label);
  await question.waitFor({ state: "visible", timeout: 20_000 });
  return question;
}

export async function clickNext(page: Page): Promise<void> {
  const nextButton = page.getByRole("button", { name: FORM_BUTTONS.next }).first();
  await nextButton.click();
}

export async function clickSubmit(page: Page): Promise<void> {
  const submitButton = page
    .getByRole("button", { name: FORM_BUTTONS.submit })
    .first();
  await submitButton.click();
}

export async function fillTextQuestion(
  page: Page,
  label: string,
  value: string
): Promise<void> {
  const question = await ensureQuestion(page, label);
  const input = question.locator("input[type='text'], textarea").first();
  await input.waitFor({ state: "visible", timeout: 10_000 });
  await input.fill(value);
}

export async function checkCheckboxQuestion(
  page: Page,
  label: string
): Promise<void> {
  let checkbox = page
    .locator('[role="checkbox"][aria-label*="email to be included with my response"]')
    .first();

  if ((await checkbox.count()) === 0) {
    const question = await ensureQuestion(page, label);
    checkbox = question.getByRole("checkbox").first();
  }

  await checkbox.waitFor({ state: "visible", timeout: 10_000 });

  const checked =
    (await checkbox.getAttribute("aria-checked")) === "true" ||
    (await checkbox.isChecked().catch(() => false));

  if (!checked) {
    await checkbox.click();
  }
}

async function resolveDropdownTrigger(scope: Locator): Promise<Locator> {
  const selectors = [
    "[role='combobox']",
    "[role='listbox']",
    "[aria-haspopup='listbox']"
  ];

  for (const selector of selectors) {
    const candidate = scope.locator(selector).first();
    if ((await candidate.count()) > 0) {
      return candidate;
    }
  }

  throw new Error("Could not find a dropdown trigger.");
}

export async function selectDropdownQuestion(
  page: Page,
  label: string,
  optionText: string
): Promise<void> {
  const question = await ensureQuestion(page, label);
  const trigger = await resolveDropdownTrigger(question);
  await trigger.click();

  const overlayOptions = question.locator(".OA0qNb").first();
  if ((await overlayOptions.count()) > 0) {
    try {
      await overlayOptions.waitFor({ state: "visible", timeout: 2_000 });
      await selectVisibleOption(overlayOptions, optionText);
      return;
    } catch {
      // Fall through to other dropdown strategies.
    }
  }

  const expandedListbox = question
    .locator('[role="listbox"][aria-expanded="true"]')
    .first();
  if ((await expandedListbox.count()) > 0) {
    try {
      await expandedListbox.waitFor({ state: "visible", timeout: 2_000 });
      await selectVisibleOption(expandedListbox, optionText);
      return;
    } catch {
      // Fall through to the broad question scope fallback.
    }
  }

  await selectVisibleOption(question, optionText);
}

export async function selectVisibleOption(
  scope: Locator | Page,
  optionText: string
): Promise<void> {
  const candidates = getOptionCandidates(optionText);
  let lastError: Error | null = null;

  for (const candidateText of candidates) {
    try {
      const option = scope
        .locator('[role="option"]:visible')
        .filter({ hasText: exactTextRegex(candidateText) })
        .first();

      await option.waitFor({ state: "visible", timeout: 5_000 });
      await option.click();
      return;
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error(`Option "${candidateText}" was not selectable.`);
    }
  }

  throw lastError ?? new Error(`Option "${optionText}" was not selectable.`);
}

export async function fillDateTimeQuestion(
  page: Page,
  label: string,
  value: DateTimeValue
): Promise<void> {
  const question = await ensureQuestion(page, label);
  const inputs = question.locator("input");
  const inputCount = await inputs.count();

  if (inputCount < 3) {
    throw new Error(
      `Expected date and time inputs for "${label}", but found ${inputCount}.`
    );
  }

  const dateInput = inputs.nth(0);
  const hourInput = inputs.nth(1);
  const minuteInput = inputs.nth(2);
  const dateInputType = await dateInput.getAttribute("type");

  let dateAccepted = false;
  const dateCandidates =
    dateInputType === "date"
      ? [toIsoDateString(value.date)]
      : normalizeDateForForm(value.date);

  for (const candidate of dateCandidates) {
    try {
      await dateInput.fill(candidate);
      const currentValue = await dateInput.inputValue();

      if (currentValue.length > 0) {
        dateAccepted = true;
        break;
      }
    } catch {
      // Try the next date format candidate.
    }
  }

  if (!dateAccepted) {
    throw new Error(`Unable to fill the date field for "${label}".`);
  }

  await hourInput.fill(value.hour);
  await minuteInput.fill(value.minute);

  const meridiemListbox = question
    .locator('[role="listbox"]')
    .first();
  const selectedMeridiem = (
    await meridiemListbox
      .locator('[role="option"][aria-selected="true"]')
      .first()
      .textContent()
  )?.trim();

  if (selectedMeridiem?.toUpperCase() !== value.meridiem) {
    await meridiemListbox.click();
    await selectVisibleOption(meridiemListbox, value.meridiem);
  }
}

export async function waitForQuestionLabel(
  page: Page,
  label: string
): Promise<void> {
  await page
    .locator(`text=/${escapeForRegex(label)}/i`)
    .first()
    .waitFor({ state: "visible", timeout: 20_000 });
}

export async function getBodyText(page: Page): Promise<string> {
  return page.locator("body").innerText();
}
