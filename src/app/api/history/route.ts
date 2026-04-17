import { NextResponse } from "next/server";

import { historyRepository } from "@/server/history/history-repository";
import { batchHistoryRepository } from "@/server/runs/batch-history-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [history, batchRuns] = await Promise.all([
    historyRepository.list(),
    batchHistoryRepository.list()
  ]);
  return NextResponse.json({ history, batchRuns });
}
