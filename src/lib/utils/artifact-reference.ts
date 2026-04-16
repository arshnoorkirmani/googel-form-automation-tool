import { sanitizeFileName } from "@/lib/utils/file-name";

const MONGO_ARTIFACT_PREFIX = "mongo";
const LOG_STREAM_PREFIX = "logs";

export function buildMongoArtifactReference(
  artifactId: string,
  fileName: string
): string {
  return `${MONGO_ARTIFACT_PREFIX}/${encodeURIComponent(artifactId)}/${encodeURIComponent(
    sanitizeFileName(fileName)
  )}`;
}

export function buildLogStreamReference(streamId: string): string {
  return `${LOG_STREAM_PREFIX}/${encodeURIComponent(streamId)}.jsonl`;
}

export function isMongoArtifactReference(reference: string): boolean {
  return reference.startsWith(`${MONGO_ARTIFACT_PREFIX}/`);
}

export function isLogStreamReference(reference: string): boolean {
  return reference.startsWith(`${LOG_STREAM_PREFIX}/`);
}

export function resolveArtifactUrl(reference?: string): string | null {
  if (!reference) {
    return null;
  }

  if (isMongoArtifactReference(reference) || isLogStreamReference(reference)) {
    return `/api/artifacts/${reference}`;
  }

  const relativePath = reference
    .split("artifacts")
    .pop()
    ?.replace(/\\/g, "/");

  if (!relativePath) {
    return null;
  }

  return `/api/artifacts${
    relativePath.startsWith("/") ? relativePath : `/${relativePath}`
  }`;
}

export function formatArtifactReference(reference?: string): string {
  if (!reference) {
    return "";
  }

  if (isMongoArtifactReference(reference) || isLogStreamReference(reference)) {
    const segments = reference.split("/");
    return decodeURIComponent(segments.at(-1) ?? reference);
  }

  return reference;
}
