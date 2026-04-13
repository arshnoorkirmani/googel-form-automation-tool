import { mkdir } from "node:fs/promises";
import path from "node:path";

export function resolveFromRoot(...segments: string[]): string {
  return path.resolve(process.cwd(), ...segments);
}

export function toAbsolutePath(relativePath: string): string {
  return path.isAbsolute(relativePath)
    ? relativePath
    : resolveFromRoot(relativePath);
}

export async function ensureDirectory(directoryPath: string): Promise<void> {
  await mkdir(directoryPath, { recursive: true });
}

export function sanitizeFileName(value: string): string {
  return value.replace(/[^a-z0-9._-]+/gi, "-").replace(/-+/g, "-");
}
