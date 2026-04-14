import { mkdir } from "node:fs/promises";
import path from "node:path";

const directories = [
  "storage/logs",
  "storage/artifacts",
  "storage/samples"
];

async function ensureStorage(): Promise<void> {
  for (const directory of directories) {
    await mkdir(path.resolve(process.cwd(), directory), { recursive: true });
  }
}

ensureStorage().then(() => {
  process.stdout.write("Storage prepared.\n");
});
