import { MongoClient, type Db } from "mongodb";

import { configService } from "@/server/config/config-service";
import { dependencyUnavailableError } from "@/server/errors/app-error";

const MONGO_CONNECT_RETRIES = 2;
const MONGO_RETRY_DELAY_MS = 750;

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
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
    socketTimeoutMS: 20_000
  });

  let lastError: unknown;

  for (let attempt = 1; attempt <= MONGO_CONNECT_RETRIES; attempt += 1) {
    try {
      await client.connect();
      return client;
    } catch (error) {
      lastError = error;

      if (attempt < MONGO_CONNECT_RETRIES) {
        await new Promise((resolve) =>
          setTimeout(resolve, MONGO_RETRY_DELAY_MS * attempt)
        );
      }
    }
  }

  throw lastError;
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
