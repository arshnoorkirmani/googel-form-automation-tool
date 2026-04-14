import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { configService } from "@/server/config/config-service";

const MIME_TYPES: Record<string, string> = {
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp"
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ artifactPath: string[] }> }
) {
  const { artifactPath } = await context.params;

  if (!artifactPath?.length) {
    return NextResponse.json({ error: "Artifact path is required." }, { status: 400 });
  }

  const config = await configService.getConfig();
  const artifactsRoot = path.resolve(config.paths.artifactsDir);
  const target = path.resolve(artifactsRoot, ...artifactPath);

  if (target !== artifactsRoot && !target.startsWith(`${artifactsRoot}${path.sep}`)) {
    return NextResponse.json({ error: "Invalid artifact path." }, { status: 400 });
  }

  try {
    const payload = await readFile(target);
    const extension = path.extname(target).toLowerCase();

    return new NextResponse(payload, {
      headers: {
        "Cache-Control": "private, max-age=60",
        "Content-Type":
          MIME_TYPES[extension] ?? "application/octet-stream"
      }
    });
  } catch {
    return NextResponse.json({ error: "Artifact not found." }, { status: 404 });
  }
}
