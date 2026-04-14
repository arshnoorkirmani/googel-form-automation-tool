import { NextResponse } from "next/server";

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
        return NextResponse.json({ error: "Batch not found" }, { status: 404 });
      }

      return NextResponse.json(
        {
          error:
            "Batch exists in persisted history, but it is not active in memory and cannot be controlled anymore."
        },
        { status: 409 }
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
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await batchHistoryRepository.upsert(updatedRun);
    return NextResponse.json({ batchRun: updatedRun }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to perform batch action." },
      { status: 400 }
    );
  }
}
