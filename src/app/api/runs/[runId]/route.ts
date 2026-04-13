import { NextResponse } from "next/server";

import { historyRepository } from "@/server/history/history-repository";
import { runStore } from "@/server/runs/run-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> }
) {
  const { runId } = await context.params;
  const run = runStore.get(runId) ?? (await historyRepository.getById(runId));

  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  return NextResponse.json({ run });
}
