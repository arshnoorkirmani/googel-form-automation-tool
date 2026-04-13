import { readFile, writeFile } from "node:fs/promises";

import { configService } from "@/server/config/config-service";
import type { RunRecord } from "@/server/runs/run-types";

class HistoryRepository {
  async list(): Promise<RunRecord[]> {
    const filePath = (await configService.getConfig()).paths.historyFile;
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as RunRecord[];

    return parsed.sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    );
  }

  async getById(runId: string): Promise<RunRecord | null> {
    const all = await this.list();
    return all.find((record) => record.id === runId) ?? null;
  }

  async append(record: RunRecord): Promise<void> {
    const filePath = (await configService.getConfig()).paths.historyFile;
    const all = await this.list();
    const deduped = all.filter((item) => item.id !== record.id);
    deduped.unshift(record);
    await writeFile(filePath, JSON.stringify(deduped, null, 2), "utf8");
  }
}

export const historyRepository = new HistoryRepository();
