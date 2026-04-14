import { NextResponse } from "next/server";

import {
  badRequestError,
  conflictError,
  notFoundError
} from "@/server/errors/app-error";
import { createErrorResponse } from "@/server/http/route-response";
import { requireOperatorContext } from "@/server/operator/operator-context";
import { batchHistoryRepository } from "@/server/runs/batch-history-repository";
import { batchStore } from "@/server/runs/batch-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { action } = await request.json();
    const { batchId } = await params;
    const operator = await requireOperatorContext();

    const inMemory = batchStore.get(batchId);
    if (!inMemory || inMemory.operatorId !== operator.operatorId) {
      const persisted = await batchHistoryRepository.getById(
        batchId,
        operator.operatorId
      );
      if (!persisted) {
        throw notFoundError("Batch not found.");
      }

      throw conflictError(
        "Batch exists in persisted history, but it is not active in memory and cannot be controlled anymore."
      );
    }

    let updatedRun;
    switch (action) {
      case "PAUSE":
        updatedRun = batchStore.requestPause(batchId);
        break;
      case "RESUME":
        updatedRun = batchStore.resumeBatch(batchId);
        break;
      case "STOP":
        updatedRun = batchStore.requestStop(batchId);
        break;
      default:
        throw badRequestError("Invalid action.");
    }

    await batchHistoryRepository.upsert(updatedRun);
    return NextResponse.json({ batchRun: updatedRun }, { status: 200 });
  } catch (error) {
    return createErrorResponse(error);
  }
}
