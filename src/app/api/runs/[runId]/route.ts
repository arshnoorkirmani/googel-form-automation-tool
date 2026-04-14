import { NextResponse } from "next/server";

import { notFoundError } from "@/server/errors/app-error";
import { historyRepository } from "@/server/history/history-repository";
import { createErrorResponse } from "@/server/http/route-response";
import { requireOperatorContext } from "@/server/operator/operator-context";
import { runStore } from "@/server/runs/run-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await context.params;
    const operator = await requireOperatorContext();
    const inMemory = runStore.get(runId);
    const run =
      inMemory?.operatorId === operator.operatorId
        ? inMemory
        : await historyRepository.getById(runId, operator.operatorId);

    if (!run) {
      throw notFoundError("Run not found.");
    }

    return NextResponse.json({ run });
  } catch (error) {
    return createErrorResponse(error);
  }
}
