import { NextResponse } from "next/server";

import {
  storageService,
  type ClearAction
} from "@/server/storage/storage-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const summary = await storageService.getSummary();
  return NextResponse.json({ summary });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { action?: ClearAction };
    const action = payload.action;

    if (!action) {
      return NextResponse.json(
        { error: "Missing storage action." },
        { status: 400 }
      );
    }

    await storageService.clear(action);
    const summary = await storageService.getSummary();
    return NextResponse.json({ summary });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to clear storage."
      },
      { status: 400 }
    );
  }
}
