import { MongoClient, type Db } from "mongodb";

import { configService } from "@/server/config/config-service";
import { dependencyUnavailableError } from "@/server/errors/app-error";

declare global {
  // eslint-disable-next-line no-var
  var __mongoClientPromise__: Promise<MongoClient> | undefined;
}

async function createMongoClient(): Promise<MongoClient> {
  const config = await configService.getConfig();
  const uri = config.mongodb.uri;

  if (!uri) {
    throw dependencyUnavailableError(
      "MongoDB is not configured. Set MONGODB_URI before using persisted auth, history, or batch data.",
      undefined,
      false
    );
  }

  const client = new MongoClient(uri, {
    appName: config.appName,
    serverSelectionTimeoutMS: 10_000
  });

  await client.connect();
  return client;
}

function resetMongoClientPromise(): void {
  globalThis.__mongoClientPromise__ = undefined;
}

export async function getMongoClient(): Promise<MongoClient> {
  if (!globalThis.__mongoClientPromise__) {
    globalThis.__mongoClientPromise__ = createMongoClient().catch((error) => {
      resetMongoClientPromise();
      throw error;
    });
  }

  return globalThis.__mongoClientPromise__;
}

export async function getMongoDb(): Promise<Db> {
  const config = await configService.getConfig();
  const client = await getMongoClient();
  return client.db(config.mongodb.dbName);
}

export async function pingMongo(): Promise<void> {
  const db = await getMongoDb();
  await db.command({ ping: 1 });
}
