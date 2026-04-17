import type { Locator, Page } from "playwright";

import {
  normalizeDateForForm,
  toIsoDateString,
  type DateTimeValue
} from "@/lib/utils/date-time";
import { FORM_BUTTONS } from "@/server/automation/form/form-locators";
import { configService } from "@/server/config/config-service";

const CALL_STATUS_LABEL = "Call Status";
const CALL_STATUS_SELECTION_MAX_ATTEMPTS = 3;

type DropdownSelectionSnapshot = {
  matchedValue: string | null;
  rawValue: string;
};

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function waitForHumanDelay(
  page: Page,
  range: { min: number; max: number }
): Promise<void> {
  await page.waitForTimeout(randomBetween(range.min, range.max));
}

async function waitForFieldDelay(page: Page): Promise<void> {
  const config = await configService.getConfig();
  await waitForHumanDelay(page, config.automation.fieldDelay);
}

async function waitForPageDelay(page: Page): Promise<void> {
  const config = await configService.getConfig();
  await waitForHumanDelay(page, config.automation.pageDelay);
}

async function typeTextLikeHuman(
  input: Locator,
  value: string
): Promise<void> {
  const config = await configService.getConfig();
  const typingDelay = config.automation.typingDelay;

  await input.click();
  await input.fill("");

  for (const character of value) {
    await input.type(character, {
      delay: randomBetween(typingDelay.min, typingDelay.max)
    });
  }
}

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

function normalizeTextValue(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
}

function isCallStatusLabel(label: string): boolean {
  return normalizeTextValue(label) === normalizeTextValue(CALL_STATUS_LABEL);
}

function findMatchingCandidate(
  text: string,
  candidates: readonly string[]
): string | null {
  const normalizedText = normalizeTextValue(text);

  for (const candidate of candidates) {
    if (normalizedText === normalizeTextValue(candidate)) {
      return candidate;
    }
  }

  const segments = text
    .split(/\r?\n/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  for (const segment of segments) {
    const matchedCandidate = candidates.find(
      (candidate) => normalizeTextValue(segment) === normalizeTextValue(candidate)
    );

    if (matchedCandidate) {
      return matchedCandidate;
    }
  }

  return null;
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

export async function clickNext(
  page: Page,
  buttonName: string | RegExp = FORM_BUTTONS.next
): Promise<void> {
  const nextButton = page.getByRole("button", { name: buttonName }).first();
  await nextButton.click();
  await waitForPageDelay(page);
}

export async function clickSubmit(
  page: Page,
  buttonName: string | RegExp = FORM_BUTTONS.submit
): Promise<void> {
  const submitButton = page
    .getByRole("button", { name: buttonName })
    .first();
  await submitButton.click();
  await waitForPageDelay(page);
}

export async function fillTextQuestion(
  page: Page,
  label: string,
  value: string
): Promise<void> {
  const question = await ensureQuestion(page, label);
  const input = question.locator("input[type='text'], textarea").first();
  await input.waitFor({ state: "visible", timeout: 10_000 });
  await typeTextLikeHuman(input, value);
  await waitForFieldDelay(page);
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

  await waitForFieldDelay(page);
}

async function readLocatorText(locator: Locator): Promise<string> {
  if ((await locator.count()) === 0) {
    return "";
  }

  const innerText = await locator.innerText().catch(() => "");
  if (innerText.trim().length > 0) {
    return innerText.trim();
  }

  const textContent = (await locator.textContent().catch(() => "")) ?? "";
  return textContent.trim();
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

async function prepareDropdownTrigger(
  question: Locator,
  trigger: Locator
): Promise<void> {
  await question.scrollIntoViewIfNeeded().catch(() => undefined);
  await trigger.waitFor({ state: "visible", timeout: 10_000 });
}

async function waitForVisibleDropdownOption(
  page: Page,
  optionText: string
): Promise<void> {
  const candidates = getOptionCandidates(optionText);
  let lastError: Error | null = null;

  for (const candidateText of candidates) {
    try {
      await page
        .locator('[role="option"]:visible')
        .filter({ hasText: exactTextRegex(candidateText) })
        .first()
        .waitFor({ state: "visible", timeout: 5_000 });
      return;
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error(`Option "${candidateText}" was not visible.`);
    }
  }

  throw lastError ?? new Error(`Option "${optionText}" was not visible.`);
}

async function getDropdownSelectionSnapshot(
  question: Locator,
  trigger: Locator,
  optionText: string
): Promise<DropdownSelectionSnapshot> {
  const candidates = getOptionCandidates(optionText);
  const textSources = [
    question.locator("[role='combobox'][aria-expanded='false']").first(),
    question.locator("[role='listbox'][aria-expanded='false']").first(),
    trigger,
    question.locator("[role='option'][aria-selected='true']").first()
  ];

  let rawValue = "";

  for (const source of textSources) {
    const text = await readLocatorText(source);
    if (!text) {
      continue;
    }

    if (!rawValue) {
      rawValue = text;
    }

    const matchedValue = findMatchingCandidate(text, candidates);
    if (matchedValue) {
      return {
        matchedValue,
        rawValue: text
      };
    }
  }

  return {
    matchedValue: null,
    rawValue
  };
}

async function waitForAppliedDropdownSelection(
  page: Page,
  question: Locator,
  trigger: Locator,
  optionText: string
): Promise<DropdownSelectionSnapshot> {
  const deadline = Date.now() + 1_500;
  let snapshot = await getDropdownSelectionSnapshot(question, trigger, optionText);

  while (!snapshot.matchedValue && Date.now() < deadline) {
    await page.waitForTimeout(150);
    snapshot = await getDropdownSelectionSnapshot(question, trigger, optionText);
  }

  return snapshot;
}

async function closeDropdownIfOpen(
  page: Page,
  trigger: Locator
): Promise<void> {
  await page.keyboard.press("Escape").catch(() => undefined);
  await page.waitForTimeout(150);

  const isExpanded =
    (await trigger.getAttribute("aria-expanded").catch(() => null)) === "true";

  if (isExpanded) {
    await trigger.click().catch(() => undefined);
    await page.waitForTimeout(150);
  }
}

async function selectCallStatusQuestion(
  page: Page,
  question: Locator,
  optionText: string
): Promise<void> {
  const trigger = await resolveDropdownTrigger(question);
  await prepareDropdownTrigger(question, trigger);

  let lastObservedValue = "";

  for (
    let attempt = 1;
    attempt <= CALL_STATUS_SELECTION_MAX_ATTEMPTS;
    attempt += 1
  ) {
    console.info(
      `[form] Call Status selection attempt ${attempt}/${CALL_STATUS_SELECTION_MAX_ATTEMPTS}: intended="${optionText}"`
    );

    try {
      if (attempt > 1) {
        await closeDropdownIfOpen(page, trigger);
      }

      await prepareDropdownTrigger(question, trigger);
      await trigger.click();
      await waitForVisibleDropdownOption(page, optionText);
      await selectVisibleOption(page, optionText);

      const selectionSnapshot = await waitForAppliedDropdownSelection(
        page,
        question,
        trigger,
        optionText
      );

      lastObservedValue =
        selectionSnapshot.matchedValue ?? selectionSnapshot.rawValue ?? "";

      console.info(
        `[form] Call Status selected value after click: "${lastObservedValue}"`
      );

      if (selectionSnapshot.matchedValue) {
        if (!lastObservedValue.trim()) {
          throw new Error("Call Status selection failed after retries");
        }

        await waitForFieldDelay(page);
        return;
      }
    } catch (error) {
      lastObservedValue =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : lastObservedValue;
    }

    if (attempt < CALL_STATUS_SELECTION_MAX_ATTEMPTS) {
      console.warn(
        `[form] Call Status retry ${attempt}/${CALL_STATUS_SELECTION_MAX_ATTEMPTS}: intended="${optionText}", selected="${lastObservedValue}"`
      );
    }
  }

  throw new Error("Call Status selection failed after retries");
}

export async function selectDropdownQuestion(
  page: Page,
  label: string,
  optionText: string
): Promise<void> {
  const question = await ensureQuestion(page, label);

  if (isCallStatusLabel(label)) {
    await selectCallStatusQuestion(page, question, optionText);
    return;
  }

  const trigger = await resolveDropdownTrigger(question);
  await prepareDropdownTrigger(question, trigger);
  await trigger.click();

  const overlayOptions = question.locator(".OA0qNb").first();
  if ((await overlayOptions.count()) > 0) {
    try {
      await overlayOptions.waitFor({ state: "visible", timeout: 2_000 });
      await selectVisibleOption(overlayOptions, optionText);
      await waitForFieldDelay(page);
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
      await waitForFieldDelay(page);
      return;
    } catch {
      // Fall through to the broad question scope fallback.
    }
  }

  await selectVisibleOption(question, optionText);
  await waitForFieldDelay(page);
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

  await waitForFieldDelay(page);
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
