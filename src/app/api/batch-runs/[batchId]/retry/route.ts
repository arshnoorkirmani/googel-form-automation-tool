import { NextResponse } from "next/server";

import { batchStore } from "@/server/runs/batch-store";
import { batchAutomationRunner } from "@/server/automation/batch-runner";
import { runQueue } from "@/server/runs/run-queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { batchId } = await params;
  const batchRun = batchStore.get(batchId);

  if (!batchRun) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const payload = await request.json();
  const { itemIds } = payload as { itemIds: string[] };

  if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
    return new NextResponse("itemIds must be a non-empty array", { status: 400 });
  }

  // Reset states for failed items to PENDING
  for (const foNumber of itemIds) {
      batchStore.setItemPending(batchId, foNumber);
  }

  // Set the batch run state back to running
  batchStore.setBatchRunning(batchId);

  runQueue.enqueue(async () => {
    try {
      await batchAutomationRunner.retry(batchId, itemIds);
    } catch {
      // Runner handles state.
    }
  });

  return NextResponse.json({ success: true, batchRun: batchStore.get(batchId) });
}
