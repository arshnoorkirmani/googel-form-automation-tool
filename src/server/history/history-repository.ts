import type { Collection, IndexDescription } from "mongodb";

import type { RunRecord } from "@/server/runs/run-types";
import { getMongoDb } from "@/server/database/mongodb";

type RunRecordDocument = RunRecord & {
  _id: string;
  updatedAt: string;
};

const ACTIVE_RUN_STATES = new Set<RunRecord["status"]>(["QUEUED", "RUNNING"]);

declare global {
  // eslint-disable-next-line no-var
  var __historyIndexesPromise__: Promise<void> | undefined;
}

async function ensureIndexes(
  collection: Collection<RunRecordDocument>
): Promise<void> {
  if (!globalThis.__historyIndexesPromise__) {
    globalThis.__historyIndexesPromise__ = collection.createIndexes([
      {
        key: { createdAt: -1 } as IndexDescription["key"],
        name: "createdAt_desc"
      },
      {
        key: { status: 1, createdAt: -1 } as IndexDescription["key"],
        name: "status_createdAt_desc"
      }
    ]).then(() => undefined);
  }

  await globalThis.__historyIndexesPromise__;
}

function toRunRecord(document: RunRecordDocument): RunRecord {
  const { _id, updatedAt, ...record } = document;
  return record;
}

class HistoryRepository {
  async list(): Promise<RunRecord[]> {
    const collection = await this.getCollection();
    const documents = await collection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return Promise.all(
      documents.map((document) => this.recoverIfStale(toRunRecord(document)))
    );
  }

  async getById(runId: string): Promise<RunRecord | null> {
    const collection = await this.getCollection();
    const document = await collection.findOne({ _id: runId });
    return document ? this.recoverIfStale(toRunRecord(document)) : null;
  }

  async append(record: RunRecord): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne(
      { _id: record.id },
      {
        $set: {
          ...record,
          updatedAt: new Date().toISOString()
        }
      },
      { upsert: true }
    );
  }

  async count(): Promise<number> {
    const collection = await this.getCollection();
    return collection.countDocuments();
  }

  async clear(): Promise<void> {
    const collection = await this.getCollection();
    await collection.deleteMany({});
  }

  async recoverIfStale(record: RunRecord): Promise<RunRecord> {
    if (!ACTIVE_RUN_STATES.has(record.status)) {
      return record;
    }

    const recovered: RunRecord = {
      ...record,
      status: "FAILED",
      completedAt: record.completedAt ?? new Date().toISOString(),
      errorMessage:
        record.errorMessage ??
        "Run execution was interrupted because the runtime restarted before completion.",
      progress: [
        ...record.progress,
        {
          stepId: "FAILED",
          label: "Run interrupted",
          status: "failed",
          at: new Date().toISOString(),
          detail:
            "The queued or running job disappeared from memory before it completed."
        }
      ]
    };

    await this.append(recovered);
    return recovered;
  }

  private async getCollection(): Promise<Collection<RunRecordDocument>> {
    const db = await getMongoDb();
    const collection = db.collection<RunRecordDocument>("runHistory");
    await ensureIndexes(collection);
    return collection;
  }
}

export const historyRepository = new HistoryRepository();
