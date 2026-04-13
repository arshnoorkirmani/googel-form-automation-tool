import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const directories = [
  "storage/auth",
  "storage/history",
  "storage/logs",
  "storage/artifacts",
  "storage/samples"
];

async function ensureStorage(): Promise<void> {
  for (const directory of directories) {
    await mkdir(path.resolve(process.cwd(), directory), { recursive: true });
  }

  const historyFile = path.resolve(process.cwd(), "storage/history/runs.json");
  try {
    await access(historyFile);
  } catch {
    await writeFile(historyFile, "[]\n", "utf8");
  }
}

ensureStorage().then(() => {
  process.stdout.write("Storage prepared.\n");
});
