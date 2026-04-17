import { NextResponse } from "next/server";
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

    let existingBatch = batchStore.get(batchId);
    if (!existingBatch) {
      const persisted = await batchHistoryRepository.getById(batchId);
      if (persisted) {
        existingBatch = batchStore.hydrate(persisted);
      }
    }

    if (!existingBatch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
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
