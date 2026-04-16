import type { Collection, IndexDescription } from "mongodb";

import type { LogEntry } from "@/server/logging/logger";
import { getMongoDb } from "@/server/database/mongodb";

type LogEntryDocument = LogEntry & {
  streamId: string;
  operatorId?: string;
  createdAt: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __runtimeLogIndexesPromise__: Promise<void> | undefined;
}

async function ensureIndexes(
  collection: Collection<LogEntryDocument>
): Promise<void> {
  if (!globalThis.__runtimeLogIndexesPromise__) {
    globalThis.__runtimeLogIndexesPromise__ = collection
      .createIndexes([
        {
          key: { streamId: 1, timestamp: 1 } as IndexDescription["key"],
          name: "streamId_timestamp_asc"
        },
        {
          key: { operatorId: 1, timestamp: -1 } as IndexDescription["key"],
          name: "operatorId_timestamp_desc"
        }
      ])
      .then(() => undefined)
      .catch((error) => {
        globalThis.__runtimeLogIndexesPromise__ = undefined;
        throw error;
      });
  }

  await globalThis.__runtimeLogIndexesPromise__;
}

class LogEntryRepository {
  private readonly collectionName = "runtimeLogs";

  async append(params: {
    streamId: string;
    operatorId?: string;
    entry: LogEntry;
  }): Promise<void> {
    const collection = await this.getCollection();
    await collection.insertOne({
      ...params.entry,
      streamId: params.streamId,
      operatorId: params.operatorId,
      createdAt: params.entry.timestamp
    });
  }

  async listStream(streamId: string): Promise<LogEntryDocument[]> {
    const collection = await this.getCollection();
    return collection.find({ streamId }).sort({ timestamp: 1 }).toArray();
  }

  async countStreams(): Promise<number> {
    const collection = await this.getCollection();
    const streamIds = await collection.distinct("streamId");
    return streamIds.length;
  }

  async clear(): Promise<void> {
    const collection = await this.getCollection();
    await collection.deleteMany({});
  }

  private async getCollection(): Promise<Collection<LogEntryDocument>> {
    const db = await getMongoDb();
    const collection = db.collection<LogEntryDocument>(this.collectionName);
    await ensureIndexes(collection);
    return collection;
  }
}

export const logEntryRepository = new LogEntryRepository();
