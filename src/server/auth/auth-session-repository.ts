import type { Collection } from "mongodb";
import type { BrowserContext } from "playwright";

import type { AuthMetadata } from "@/server/auth/auth.types";
import { configService } from "@/server/config/config-service";
import { getMongoDb } from "@/server/database/mongodb";
import type { OperatorContext } from "@/server/operator/operator-context";

export type BrowserStorageState = Awaited<
  ReturnType<BrowserContext["storageState"]>
>;

type AuthSessionMetadataDocument = AuthMetadata & {
  _id: string;
  operatorId: string;
  operatorEmail: string;
  createdAt: string;
  updatedAt: string;
};

type AuthSessionStateDocument = {
  _id: string;
  operatorId: string;
  operatorEmail: string;
  storageState: BrowserStorageState;
  savedAt: string;
  createdAt: string;
  updatedAt: string;
};

class AuthSessionRepository {
  private readonly metadataCollectionName = "authSessionMetadata";
  private readonly stateCollectionName = "authSessionStates";

  async readMetadata(operator: OperatorContext): Promise<AuthMetadata | null> {
    const collection = await this.getMetadataCollection();
    const sessionKey = await this.getSessionKey(operator);
    const document = await collection.findOne({ _id: sessionKey });

    if (!document) {
      return null;
    }

    const { _id, createdAt, updatedAt, ...metadata } = document;
    return metadata;
  }

  async saveMetadata(
    operator: OperatorContext,
    metadata: AuthMetadata
  ): Promise<void> {
    const collection = await this.getMetadataCollection();
    const sessionKey = await this.getSessionKey(operator);
    const now = new Date().toISOString();

    await collection.updateOne(
      { _id: sessionKey },
      {
        $set: {
          operatorId: operator.operatorId,
          operatorEmail: operator.email,
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

  async getStorageState(
    operator: OperatorContext
  ): Promise<BrowserStorageState | null> {
    const collection = await this.getStateCollection();
    const sessionKey = await this.getSessionKey(operator);
    const document = await collection.findOne({ _id: sessionKey });

    return document?.storageState ?? null;
  }

  async saveStorageState(
    operator: OperatorContext,
    storageState: BrowserStorageState
  ): Promise<void> {
    const collection = await this.getStateCollection();
    const sessionKey = await this.getSessionKey(operator);
    const now = new Date().toISOString();

    await collection.updateOne(
      { _id: sessionKey },
      {
        $set: {
          operatorId: operator.operatorId,
          operatorEmail: operator.email,
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

  async hasStorageState(operator: OperatorContext): Promise<boolean> {
    const collection = await this.getStateCollection();
    const sessionKey = await this.getSessionKey(operator);
    const count = await collection.countDocuments({ _id: sessionKey }, { limit: 1 });
    return count > 0;
  }

  async clear(operator: OperatorContext): Promise<void> {
    const sessionKey = await this.getSessionKey(operator);
    const [metadataCollection, stateCollection] = await Promise.all([
      this.getMetadataCollection(),
      this.getStateCollection()
    ]);

    await Promise.all([
      metadataCollection.deleteOne({ _id: sessionKey }),
      stateCollection.deleteOne({ _id: sessionKey })
    ]);
  }

  async getStorageLocation(operator: OperatorContext): Promise<string> {
    const config = await configService.getConfig();
    return `MongoDB ${config.mongodb.dbName}.${this.stateCollectionName}/${operator.operatorId}`;
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

  private async getSessionKey(operator: OperatorContext): Promise<string> {
    const config = await configService.getConfig();
    return `${operator.operatorId}:${config.auth.sessionKey}`;
  }
}

export const authSessionRepository = new AuthSessionRepository();
