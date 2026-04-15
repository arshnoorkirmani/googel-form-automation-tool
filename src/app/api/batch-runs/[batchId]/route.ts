import { NextResponse } from "next/server";

import { notFoundError } from "@/server/errors/app-error";
import { createErrorResponse } from "@/server/http/route-response";
import { requireOperatorContext } from "@/server/operator/operator-context";
import { batchHistoryRepository } from "@/server/runs/batch-history-repository";
import { batchStore } from "@/server/runs/batch-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { batchId } = await params;
    const operator = await requireOperatorContext();
    const inMemory = batchStore.get(batchId);
    const batchRun = inMemory
      ? inMemory.operatorId === operator.operatorId
        ? inMemory
        : null
      : await batchHistoryRepository
          .getById(batchId, operator.operatorId)
          .then((record) =>
            record ? batchHistoryRepository.recoverIfStale(record) : null
          );

    if (!batchRun) {
      throw notFoundError("Batch not found.");
    }

    return NextResponse.json({ batchRun });
  } catch (error) {
    return createErrorResponse(error);
  }
}
