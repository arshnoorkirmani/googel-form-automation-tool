import type { Page } from "playwright";

import { currentFormDefinition } from "@/lib/forms/current-form-definition";

export type SessionValidationResult = {
  state: "VALID" | "REAUTH_REQUIRED" | "FORBIDDEN";
  reason: string;
  detectedEmail?: string;
};

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@blackbuck\.com/i;

export function extractBlackbuckEmail(text: string): string | undefined {
  return text.match(EMAIL_PATTERN)?.[0];
}

export function interpretSessionSignals(
  url: string,
  bodyText: string
): SessionValidationResult {
  const normalizedText = bodyText.toLowerCase();
  const detectedEmail = extractBlackbuckEmail(bodyText);

  if (
    url.includes("accounts.google.com") ||
    normalizedText.includes("sign in to continue") ||
    normalizedText.includes("choose an account")
  ) {
    return {
      state: "REAUTH_REQUIRED",
      reason: "Google requested a fresh sign-in.",
      detectedEmail
    };
  }

  if (
    normalizedText.includes("you need permission") ||
    normalizedText.includes("request access") ||
    normalizedText.includes("can only be viewed by users in the owner's organization")
  ) {
    return {
      state: "FORBIDDEN",
      reason: "The current session cannot access the restricted form.",
      detectedEmail
    };
  }

  const likelyFormLoaded = currentFormDefinition.sessionValidationLabels.every(
    (label) => normalizedText.includes(label.toLowerCase())
  );

  if (likelyFormLoaded) {
    return {
      state: "VALID",
      reason: "Saved session can access the form.",
      detectedEmail
    };
  }

  return {
    state: "REAUTH_REQUIRED",
    reason: "Could not confirm the saved session from the Google Form page.",
    detectedEmail
  };
}

export class SessionValidator {
  async validateFormAccess(page: Page): Promise<SessionValidationResult> {
    await page.waitForLoadState("domcontentloaded");
    const bodyText = (await page.locator("body").innerText()).trim();
    return interpretSessionSignals(page.url(), bodyText);
  }
}

export const sessionValidator = new SessionValidator();
