import { NextResponse } from "next/server";

import { authSetupManager } from "@/server/auth/auth-setup-manager";
import { requireOperatorContext } from "@/server/operator/operator-context";

export const runtime = "nodejs";

export async function POST() {
  try {
    const operator = await requireOperatorContext();
    const result = await authSetupManager.start(operator);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not start auth setup."
      },
      { status: 500 }
    );
  }
}
