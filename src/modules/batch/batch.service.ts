import type { BatchExecutionPlan } from "@/modules/batch/batch.types";

export class BatchService {
  createExecutionPlan(): BatchExecutionPlan {
    return {
      maxRows: 50,
      strategy: "CONTINUE_ON_ERROR",
      rows: []
    };
  }

  ensureBatchMvpGuard(): never {
    throw new Error(
      "Batch automation is scaffolded for future work and is not enabled in the MVP."
    );
  }
}

export const batchService = new BatchService();
