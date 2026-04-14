import { NextResponse } from "next/server";

import { authSetupManager } from "@/server/auth/auth-setup-manager";
import { createErrorResponse } from "@/server/http/route-response";
import { requireOperatorContext } from "@/server/operator/operator-context";

export const runtime = "nodejs";

export async function POST() {
  try {
    const operator = await requireOperatorContext();
    await authSetupManager.cancel(operator.operatorId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return createErrorResponse(error);
  }
}
