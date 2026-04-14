import type { Collection } from "mongodb";
import type { BrowserContext } from "playwright";

import type { AuthMetadata } from "@/server/auth/auth.types";
import { configService } from "@/server/config/config-service";
import { getMongoDb } from "@/server/database/mongodb";

export type BrowserStorageState = Awaited<
  ReturnType<BrowserContext["storageState"]>
>;

type AuthSessionMetadataDocument = AuthMetadata & {
  _id: string;
  createdAt: string;
  updatedAt: string;
};

type AuthSessionStateDocument = {
  _id: string;
  storageState: BrowserStorageState;
  savedAt: string;
  createdAt: string;
  updatedAt: string;
};

class AuthSessionRepository {
  private readonly metadataCollectionName = "authSessionMetadata";
  private readonly stateCollectionName = "authSessionStates";

  async readMetadata(): Promise<AuthMetadata | null> {
    const collection = await this.getMetadataCollection();
    const sessionKey = await this.getSessionKey();
    const document = await collection.findOne({ _id: sessionKey });

    if (!document) {
      return null;
    }

    const { _id, createdAt, updatedAt, ...metadata } = document;
    return metadata;
  }

  async saveMetadata(metadata: AuthMetadata): Promise<void> {
    const collection = await this.getMetadataCollection();
    const sessionKey = await this.getSessionKey();
    const now = new Date().toISOString();

    await collection.updateOne(
      { _id: sessionKey },
      {
        $set: {
          ...metadata,
          updatedAt: now
        },
        $setOnInsert: {
          createdAt: now
        }
      },
      { upsert: true }
    );
  }

  async getStorageState(): Promise<BrowserStorageState | null> {
    const collection = await this.getStateCollection();
    const sessionKey = await this.getSessionKey();
    const document = await collection.findOne({ _id: sessionKey });

    return document?.storageState ?? null;
  }

  async saveStorageState(storageState: BrowserStorageState): Promise<void> {
    const collection = await this.getStateCollection();
    const sessionKey = await this.getSessionKey();
    const now = new Date().toISOString();

    await collection.updateOne(
      { _id: sessionKey },
      {
        $set: {
          storageState,
          savedAt: now,
          updatedAt: now
        },
        $setOnInsert: {
          createdAt: now
        }
      },
      { upsert: true }
    );
  }

  async hasStorageState(): Promise<boolean> {
    const collection = await this.getStateCollection();
    const sessionKey = await this.getSessionKey();
    const count = await collection.countDocuments({ _id: sessionKey }, { limit: 1 });
    return count > 0;
  }

  async clear(): Promise<void> {
    const sessionKey = await this.getSessionKey();
    const [metadataCollection, stateCollection] = await Promise.all([
      this.getMetadataCollection(),
      this.getStateCollection()
    ]);

    await Promise.all([
      metadataCollection.deleteOne({ _id: sessionKey }),
      stateCollection.deleteOne({ _id: sessionKey })
    ]);
  }

  async getStorageLocation(): Promise<string> {
    const config = await configService.getConfig();
    return `MongoDB ${config.mongodb.dbName}.${this.stateCollectionName}/${config.auth.sessionKey}`;
  }

  private async getMetadataCollection(): Promise<
    Collection<AuthSessionMetadataDocument>
  > {
    const db = await getMongoDb();
    return db.collection<AuthSessionMetadataDocument>(this.metadataCollectionName);
  }

  private async getStateCollection(): Promise<Collection<AuthSessionStateDocument>> {
    const db = await getMongoDb();
    return db.collection<AuthSessionStateDocument>(this.stateCollectionName);
  }

  private async getSessionKey(): Promise<string> {
    const config = await configService.getConfig();
    return config.auth.sessionKey;
  }
}

export const authSessionRepository = new AuthSessionRepository();
