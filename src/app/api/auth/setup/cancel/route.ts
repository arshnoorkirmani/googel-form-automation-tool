import { NextResponse } from "next/server";

import { authSetupManager } from "@/server/auth/auth-setup-manager";
import { requireOperatorContext } from "@/server/operator/operator-context";

export const runtime = "nodejs";

export async function POST() {
  try {
    const operator = await requireOperatorContext();
    await authSetupManager.cancel(operator.operatorId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not cancel auth setup."
      },
      { status: 500 }
    );
  }
}
