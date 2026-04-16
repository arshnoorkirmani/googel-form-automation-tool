import { randomUUID } from "node:crypto";

import type { Collection, IndexDescription } from "mongodb";

import { buildMongoArtifactReference } from "@/lib/utils/artifact-reference";
import { getMongoDb } from "@/server/database/mongodb";

export type RuntimeArtifactKind = "SCREENSHOT" | "REPORT";

type RuntimeArtifactDocument = {
  _id: string;
  operatorId?: string;
  runId: string;
  kind: RuntimeArtifactKind;
  fileName: string;
  mimeType: string;
  dataBase64: string;
  sizeBytes: number;
  createdAt: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __runtimeArtifactIndexesPromise__: Promise<void> | undefined;
}

async function ensureIndexes(
  collection: Collection<RuntimeArtifactDocument>
): Promise<void> {
  if (!globalThis.__runtimeArtifactIndexesPromise__) {
    globalThis.__runtimeArtifactIndexesPromise__ = collection
      .createIndexes([
        {
          key: { runId: 1, createdAt: -1 } as IndexDescription["key"],
          name: "runId_createdAt_desc"
        },
        {
          key: { operatorId: 1, createdAt: -1 } as IndexDescription["key"],
          name: "operatorId_createdAt_desc"
        },
        {
          key: { kind: 1, createdAt: -1 } as IndexDescription["key"],
          name: "kind_createdAt_desc"
        }
      ])
      .then(() => undefined)
      .catch((error) => {
        globalThis.__runtimeArtifactIndexesPromise__ = undefined;
        throw error;
      });
  }

  await globalThis.__runtimeArtifactIndexesPromise__;
}

class RuntimeArtifactRepository {
  private readonly collectionName = "runtimeArtifacts";

  async create(params: {
    operatorId?: string;
    runId: string;
    kind: RuntimeArtifactKind;
    fileName: string;
    mimeType: string;
    content: Buffer;
  }): Promise<string> {
    const collection = await this.getCollection();
    const artifactId = randomUUID();

    await collection.insertOne({
      _id: artifactId,
      operatorId: params.operatorId,
      runId: params.runId,
      kind: params.kind,
      fileName: params.fileName,
      mimeType: params.mimeType,
      dataBase64: params.content.toString("base64"),
      sizeBytes: params.content.byteLength,
      createdAt: new Date().toISOString()
    });

    return buildMongoArtifactReference(artifactId, params.fileName);
  }

  async getById(artifactId: string): Promise<RuntimeArtifactDocument | null> {
    const collection = await this.getCollection();
    return collection.findOne({ _id: artifactId });
  }

  async count(): Promise<number> {
    const collection = await this.getCollection();
    return collection.countDocuments();
  }

  async countRuns(): Promise<number> {
    const collection = await this.getCollection();
    const runIds = await collection.distinct("runId");
    return runIds.length;
  }

  async clear(): Promise<void> {
    const collection = await this.getCollection();
    await collection.deleteMany({});
  }

  private async getCollection(): Promise<Collection<RuntimeArtifactDocument>> {
    const db = await getMongoDb();
    const collection = db.collection<RuntimeArtifactDocument>(this.collectionName);
    await ensureIndexes(collection);
    return collection;
  }
}

export const runtimeArtifactRepository = new RuntimeArtifactRepository();
