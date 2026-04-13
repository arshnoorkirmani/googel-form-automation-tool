import { NextResponse } from "next/server";

import { authSetupManager } from "@/server/auth/auth-setup-manager";

export const runtime = "nodejs";

export async function POST() {
  try {
    await authSetupManager.cancel();
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
