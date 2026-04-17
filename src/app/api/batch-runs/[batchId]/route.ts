import { NextResponse } from "next/server";
import { batchHistoryRepository } from "@/server/runs/batch-history-repository";
import { batchStore } from "@/server/runs/batch-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { batchId } = await params;
  const batchRun =
    batchStore.get(batchId) ?? (await batchHistoryRepository.getById(batchId));

  if (!batchRun) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return NextResponse.json({ batchRun });
}
