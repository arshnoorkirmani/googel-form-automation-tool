import { NextResponse } from "next/server";

import { historyRepository } from "@/server/history/history-repository";
import { requireOperatorContext } from "@/server/operator/operator-context";
import { runStore } from "@/server/runs/run-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> }
) {
  const { runId } = await context.params;
  const operator = await requireOperatorContext();
  const inMemory = runStore.get(runId);
  const run =
    inMemory?.operatorId === operator.operatorId
      ? inMemory
      : await historyRepository.getById(runId, operator.operatorId);

  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  return NextResponse.json({ run });
}
