import { MongoClient, type Db } from "mongodb";

import { configService } from "@/server/config/config-service";

declare global {
  // eslint-disable-next-line no-var
  var __mongoClientPromise__: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var __mongoDbPromise__: Promise<Db> | undefined;
}

async function createMongoClient(): Promise<MongoClient> {
  const config = await configService.getConfig();
  const uri = config.mongodb.uri;

  if (!uri) {
    throw new Error(
      "MONGODB_URI is required for persisted auth state, history, and batch records."
    );
  }

  const client = new MongoClient(uri, {
    appName: config.appName,
    serverSelectionTimeoutMS: 10_000
  });

  await client.connect();
  return client;
}

export async function getMongoClient(): Promise<MongoClient> {
  if (!globalThis.__mongoClientPromise__) {
    globalThis.__mongoClientPromise__ = createMongoClient();
  }

  return globalThis.__mongoClientPromise__;
}

export async function getMongoDb(): Promise<Db> {
  if (!globalThis.__mongoDbPromise__) {
    globalThis.__mongoDbPromise__ = (async () => {
      const config = await configService.getConfig();
      const client = await getMongoClient();
      return client.db(config.mongodb.dbName);
    })();
  }

  return globalThis.__mongoDbPromise__;
}

export async function pingMongo(): Promise<void> {
  const db = await getMongoDb();
  await db.command({ ping: 1 });
}
