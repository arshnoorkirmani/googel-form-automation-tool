import { NextResponse } from "next/server";

import { historyRepository } from "@/server/history/history-repository";
import { createErrorResponse } from "@/server/http/route-response";
import { requireOperatorContext } from "@/server/operator/operator-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const operator = await requireOperatorContext();
    const history = await historyRepository.list(operator.operatorId);
    return NextResponse.json({ history });
  } catch (error) {
    return createErrorResponse(error);
  }
}
