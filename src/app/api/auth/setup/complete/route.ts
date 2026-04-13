import { NextResponse } from "next/server";

import { authSetupManager } from "@/server/auth/auth-setup-manager";

export const runtime = "nodejs";

export async function POST() {
  try {
    const result = await authSetupManager.complete();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not complete auth setup."
      },
      { status: 400 }
    );
  }
}
