import { NextResponse } from "next/server";

import { authService } from "@/server/auth/auth-service";
import { authSetupManager } from "@/server/auth/auth-setup-manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const validate = searchParams.get("validate") === "1";
  const status = await authService.getStatus(validate);

  if (authSetupManager.getActiveSession()) {
    return NextResponse.json({
      status: {
        ...status,
        state: "SETUP_IN_PROGRESS"
      }
    });
  }

  return NextResponse.json({ status });
}
