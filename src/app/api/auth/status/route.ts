import { NextResponse } from "next/server";

import { authService } from "@/server/auth/auth-service";
import { authSetupManager } from "@/server/auth/auth-setup-manager";
import { getOptionalOperatorContext } from "@/server/operator/operator-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const validate = searchParams.get("validate") === "1";
  const operator = await getOptionalOperatorContext();

  if (!operator) {
    return NextResponse.json({
      status: {
        state: "MISSING",
        reason:
          "Set your @blackbuck.com operator email in Settings before using auth setup or runs.",
        sessionStorageLocation: "MongoDB (operator not configured)"
      }
    });
  }

  const status = await authService.getStatus(operator, validate);

  if (authSetupManager.getActiveSession(operator.operatorId)) {
    return NextResponse.json({
      status: {
        ...status,
        state: "SETUP_IN_PROGRESS"
      }
    });
  }

  return NextResponse.json({ status });
}
