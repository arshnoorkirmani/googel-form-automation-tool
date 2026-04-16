import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { getOptionalOperatorContext } from "@/server/operator/operator-context";
import { configService } from "@/server/config/config-service";
import { logEntryRepository } from "@/server/logging/log-entry-repository";
import { runtimeArtifactRepository } from "@/server/reports/runtime-artifact-repository";

const MIME_TYPES: Record<string, string> = {
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp"
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function serveMongoArtifact(artifactId: string) {
  const operator = await getOptionalOperatorContext();
  const artifact = await runtimeArtifactRepository.getById(artifactId);

  if (!artifact) {
    return NextResponse.json({ error: "Artifact not found." }, { status: 404 });
  }

  if (artifact.operatorId && artifact.operatorId !== operator?.operatorId) {
    return NextResponse.json({ error: "Artifact not found." }, { status: 404 });
  }

  return new NextResponse(Buffer.from(artifact.dataBase64, "base64"), {
    headers: {
      "Cache-Control": "private, max-age=60",
      "Content-Type": artifact.mimeType
    }
  });
}

async function serveLogStream(streamId: string) {
  const operator = await getOptionalOperatorContext();
  const entries = await logEntryRepository.listStream(streamId);

  if (entries.length === 0) {
    return NextResponse.json({ error: "Artifact not found." }, { status: 404 });
  }

  const protectedEntry = entries.find((entry) => entry.operatorId);
  if (protectedEntry?.operatorId !== undefined && protectedEntry.operatorId !== operator?.operatorId) {
    return NextResponse.json({ error: "Artifact not found." }, { status: 404 });
  }

  const payload = `${entries
    .map(({ createdAt: _createdAt, operatorId: _operatorId, ...entry }) => JSON.stringify(entry))
    .join("\n")}\n`;

  return new NextResponse(payload, {
    headers: {
      "Cache-Control": "private, max-age=60",
      "Content-Type": "application/x-ndjson; charset=utf-8"
    }
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ artifactPath: string[] }> }
) {
  const { artifactPath } = await context.params;

  if (!artifactPath?.length) {
    return NextResponse.json({ error: "Artifact path is required." }, { status: 400 });
  }

  if (artifactPath[0] === "mongo" && artifactPath[1]) {
    return serveMongoArtifact(decodeURIComponent(artifactPath[1]));
  }

  if (artifactPath[0] === "logs" && artifactPath[1]) {
    const streamId = decodeURIComponent(artifactPath[1].replace(/\.jsonl$/i, ""));
    return serveLogStream(streamId);
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
