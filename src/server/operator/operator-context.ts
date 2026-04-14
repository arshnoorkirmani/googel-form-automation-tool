import { cookies } from "next/headers";

import {
  badRequestError,
  preconditionRequiredError
} from "@/server/errors/app-error";

export const OPERATOR_COOKIE_NAME = "operator_email";

export type OperatorContext = {
  operatorId: string;
  email: string;
};

const BLACKBUCK_EMAIL_PATTERN = /^[A-Z0-9._%+-]+@blackbuck\.com$/i;

export function normalizeOperatorEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidOperatorEmail(value: string): boolean {
  return BLACKBUCK_EMAIL_PATTERN.test(normalizeOperatorEmail(value));
}

export function buildOperatorContext(email: string): OperatorContext {
  const normalizedEmail = normalizeOperatorEmail(email);

  if (!isValidOperatorEmail(normalizedEmail)) {
    throw badRequestError("Use a valid @blackbuck.com operator email.");
  }

  return {
    operatorId: normalizedEmail,
    email: normalizedEmail
  };
}

export async function getOptionalOperatorContext(): Promise<OperatorContext | null> {
  const cookieStore = await cookies();
  const email = cookieStore.get(OPERATOR_COOKIE_NAME)?.value;

  if (!email) {
    return null;
  }

  try {
    return buildOperatorContext(email);
  } catch {
    return null;
  }
}

export async function requireOperatorContext(): Promise<OperatorContext> {
  const operator = await getOptionalOperatorContext();

  if (!operator) {
    throw preconditionRequiredError(
      "Operator identity is not configured. Open Settings and set your @blackbuck.com email first."
    );
  }

  return operator;
}
