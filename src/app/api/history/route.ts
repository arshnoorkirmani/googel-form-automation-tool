import { NextResponse } from "next/server";

import { historyRepository } from "@/server/history/history-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const history = await historyRepository.list();
  return NextResponse.json({ history });
}
