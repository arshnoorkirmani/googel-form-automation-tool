import { NextResponse } from "next/server";

import { getOptionalOperatorContext } from "@/server/operator/operator-context";
import { badRequestError } from "@/server/errors/app-error";
import { createErrorResponse } from "@/server/http/route-response";
import {
  storageService,
  type ClearAction
} from "@/server/storage/storage-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const operator = await getOptionalOperatorContext();
    const summary = await storageService.getSummary(operator);
    return NextResponse.json({ summary });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { action?: ClearAction };
    const action = payload.action;

    if (!action) {
      throw badRequestError("Missing storage action.");
    }

    const operator = await getOptionalOperatorContext();
    await storageService.clear(action, operator);
    const summary = await storageService.getSummary(operator);
    return NextResponse.json({ summary });
  } catch (error) {
    return createErrorResponse(error);
  }
}
