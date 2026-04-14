import type { Collection, IndexDescription } from "mongodb";

import type { BatchRunRecord } from "@/server/runs/batch-store";
import { getMongoDb } from "@/server/database/mongodb";

type BatchRunRecordDocument = BatchRunRecord & {
  _id: string;
  updatedAt: string;
};

const ACTIVE_BATCH_STATES = new Set<BatchRunRecord["status"]>([
  "QUEUED",
  "RUNNING",
  "PAUSING",
  "PAUSED",
  "STOPPING"
]);

declare global {
  // eslint-disable-next-line no-var
  var __batchHistoryIndexesPromise__: Promise<void> | undefined;
}

async function ensureIndexes(
  collection: Collection<BatchRunRecordDocument>
): Promise<void> {
  if (!globalThis.__batchHistoryIndexesPromise__) {
    globalThis.__batchHistoryIndexesPromise__ = collection.createIndexes([
      {
        key: { operatorId: 1, startedAt: -1 } as IndexDescription["key"],
        name: "operatorId_startedAt_desc"
      },
      {
        key: { operatorId: 1, status: 1, startedAt: -1 } as IndexDescription["key"],
        name: "operatorId_status_startedAt_desc"
      }
    ]).then(() => undefined);
  }

  await globalThis.__batchHistoryIndexesPromise__;
}

function toBatchRunRecord(document: BatchRunRecordDocument): BatchRunRecord {
  const { _id, updatedAt, ...record } = document;
  return record;
}

class BatchHistoryRepository {
  private readonly collectionName = "batchRuns";

  async getById(
    batchId: string,
    operatorId: string
  ): Promise<BatchRunRecord | null> {
    const collection = await this.getCollection();
    const document = await collection.findOne({ _id: batchId, operatorId });

    return document ? toBatchRunRecord(document) : null;
  }

  async upsert(record: BatchRunRecord): Promise<void> {
    const collection = await this.getCollection();

    await collection.updateOne(
      { _id: record.batchId },
      {
        $set: {
          ...record,
          updatedAt: new Date().toISOString()
        }
      },
      { upsert: true }
    );
  }

  async recoverIfStale(record: BatchRunRecord): Promise<BatchRunRecord> {
    if (!ACTIVE_BATCH_STATES.has(record.status)) {
      return record;
    }

    const recovered: BatchRunRecord = {
      ...record,
      status: "FAILED",
      completedAt: record.completedAt ?? new Date().toISOString(),
      waitingStartedAt: undefined,
      waitingUntil: undefined,
      errorMessage:
        record.errorMessage ??
        "Batch execution was interrupted because the runtime restarted or the active in-memory queue was cleared."
    };

    await this.upsert(recovered);
    return recovered;
  }

  async count(operatorId: string): Promise<number> {
    const collection = await this.getCollection();
    return collection.countDocuments({ operatorId });
  }

  async clear(operatorId: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.deleteMany({ operatorId });
  }

  private async getCollection(): Promise<Collection<BatchRunRecordDocument>> {
    const db = await getMongoDb();
    const collection = db.collection<BatchRunRecordDocument>(this.collectionName);
    await ensureIndexes(collection);
    return collection;
  }
}

export const batchHistoryRepository = new BatchHistoryRepository();
