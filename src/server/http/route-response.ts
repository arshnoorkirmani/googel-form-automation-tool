import { NextResponse } from "next/server";

import { toApiErrorPayload, toAppError } from "@/server/errors/app-error";

export function createErrorResponse(error: unknown): NextResponse {
  const appError = toAppError(error);

  return NextResponse.json(toApiErrorPayload(appError), {
    status: appError.statusCode
  });
}
