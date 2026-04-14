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
import { batchAutomationRunner } from "@/server/automation/batch-runner";
import { runQueue } from "@/server/runs/run-queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { batchId } = await params;
    const operator = await requireOperatorContext();
    let batchRun = batchStore.get(batchId);

    if (!batchRun || batchRun.operatorId !== operator.operatorId) {
      const persisted = await batchHistoryRepository.getById(
        batchId,
        operator.operatorId
      );
      if (!persisted) {
        throw notFoundError("Batch not found.");
      }

      batchRun = batchStore.hydrate(
        await batchHistoryRepository.recoverIfStale(persisted)
      );
    }

    if (
      ["RUNNING", "PAUSING", "PAUSED", "STOPPING"].includes(batchRun.status)
    ) {
      throw conflictError(
        "This batch is still active. Pause or stop it before retrying rows."
      );
    }

    const payload = await request.json();
    const { itemIds } = payload as { itemIds: string[] };

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      throw badRequestError("itemIds must be a non-empty array.");
    }

    const knownFoNumbers = new Set(batchRun.items.map((item) => item.foNumber));
    const unknownItemId = itemIds.find((itemId) => !knownFoNumbers.has(itemId));

    if (unknownItemId) {
      throw badRequestError(
        `Batch item ${unknownItemId} does not exist in this batch.`
      );
    }

    for (const foNumber of itemIds) {
      batchStore.setItemPending(batchId, foNumber);
    }

    const updatedBatchRun = batchStore.setBatchRunning(batchId);
    await batchHistoryRepository.upsert(updatedBatchRun);

    runQueue.enqueue(async () => {
      try {
        await batchAutomationRunner.retry(batchId, itemIds, operator);
      } catch {
        // Runner handles state.
      }
    });

    return NextResponse.json({
      success: true,
      batchRun: batchStore.get(batchId)
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
