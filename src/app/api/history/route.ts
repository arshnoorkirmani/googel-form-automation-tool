import { NextResponse } from "next/server";

import { historyRepository } from "@/server/history/history-repository";
import { requireOperatorContext } from "@/server/operator/operator-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const operator = await requireOperatorContext();
  const history = await historyRepository.list(operator.operatorId);
  return NextResponse.json({ history });
}
