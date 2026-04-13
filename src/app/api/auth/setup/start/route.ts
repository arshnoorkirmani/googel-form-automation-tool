import { NextResponse } from "next/server";

import { authSetupManager } from "@/server/auth/auth-setup-manager";

export const runtime = "nodejs";

export async function POST() {
  try {
    const result = await authSetupManager.start();
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
