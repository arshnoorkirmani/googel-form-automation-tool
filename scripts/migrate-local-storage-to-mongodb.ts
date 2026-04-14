import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  authSessionRepository,
  type BrowserStorageState
} from "@/server/auth/auth-session-repository";
import type { AuthMetadata } from "@/server/auth/auth.types";
import { historyRepository } from "@/server/history/history-repository";
import {
  buildOperatorContext,
  normalizeOperatorEmail
} from "@/server/operator/operator-context";
import type { RunRecord } from "@/server/runs/run-types";

async function exists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonIfExists<T>(targetPath: string): Promise<T | null> {
  if (!(await exists(targetPath))) {
    return null;
  }

  const raw = await readFile(targetPath, "utf8");
  return JSON.parse(raw) as T;
}

async function migrate(): Promise<void> {
  const operatorEmail = process.env.LEGACY_MIGRATION_OPERATOR_EMAIL?.trim();

  if (!operatorEmail) {
    throw new Error(
      "LEGACY_MIGRATION_OPERATOR_EMAIL is required to map legacy local data to a specific user."
    );
  }

  const operator = buildOperatorContext(normalizeOperatorEmail(operatorEmail));
  const legacyHistoryPath = path.resolve(process.cwd(), "storage/history/runs.json");
  const legacyAuthMetadataPath = path.resolve(
    process.cwd(),
    "storage/auth/auth-metadata.json"
  );
  const legacyStorageStatePath = path.resolve(
    process.cwd(),
    "storage/auth/storage-state.json"
  );

  const [history, authMetadata, storageState] = await Promise.all([
    readJsonIfExists<RunRecord[]>(legacyHistoryPath),
    readJsonIfExists<AuthMetadata>(legacyAuthMetadataPath),
    readJsonIfExists<unknown>(legacyStorageStatePath)
  ]);

  let migratedRuns = 0;
  if (history?.length) {
    for (const run of history) {
      await historyRepository.append({
        ...run,
        operatorId: operator.operatorId
      } as RunRecord);
      migratedRuns += 1;
    }
  }

  if (authMetadata) {
    await authSessionRepository.saveMetadata(operator, authMetadata);
  }

  if (storageState) {
    await authSessionRepository.saveStorageState(
      operator,
      storageState as BrowserStorageState
    );
  }

  process.stdout.write(
    [
      `Migrated run records: ${migratedRuns}`,
      `Migrated operator: ${operator.email}`,
      `Migrated auth metadata: ${authMetadata ? "yes" : "no"}`,
      `Migrated browser session state: ${storageState ? "yes" : "no"}`
    ].join("\n") + "\n"
  );
}

void migrate();
