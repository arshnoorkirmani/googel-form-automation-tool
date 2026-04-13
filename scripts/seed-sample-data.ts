import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

async function seed(): Promise<void> {
  const samplesDir = path.resolve(process.cwd(), "storage/samples");
  await mkdir(samplesDir, { recursive: true });

  await copyFile(
    path.resolve(process.cwd(), "storage/samples/sample-submission.json"),
    path.resolve(process.cwd(), "storage/samples/sample-submission.seed.json")
  );

  process.stdout.write("Sample data seeded.\n");
}

seed();
