import type { BatchSubmissionPayload } from "@/modules/submission/batch.schema";
import { RANDOM_CALL_STATUS_OPTIONS } from "@/modules/submission/submission.types";
import { batchStore } from "@/server/runs/batch-store";

describe("batchStore", () => {
  it("tracks counts, timestamps, and retry metadata for batch rows", () => {
    const batchId = `test-batch-${Date.now()}`;
    const submission: BatchSubmissionPayload = {
      foNumberList: ["FO-1001", "FO-1002"] as string[],
      callStatus: "Not Interested",
      omc: "HPCL",
      noOfTrucks: "5",
      fuelingPotential: "2200",
      fuelingFrequency: "4",
      remarks: "Operational note",
      mode: "SUBMIT",
      debug: false,
      delaySeconds: 10,
      randomCallStatusPool: [...RANDOM_CALL_STATUS_OPTIONS],
      notInterestedReason: "Load Issue"
    };

    const created = batchStore.create(batchId, submission);
    expect(created.totalRows).toBe(2);
    expect(created.pendingCount).toBe(2);

    batchStore.setItemRunning(batchId, "FO-1001", submission.callStatus);
    const failed = batchStore.setItemFailed(
      batchId,
      "FO-1001",
      "Validation failed",
      undefined,
      submission.callStatus
    );

    expect(failed.failedCount).toBe(1);
    expect(failed.items.find((item) => item.foNumber === "FO-1001")?.durationMs).toBeTypeOf(
      "number"
    );

    const retried = batchStore.setItemPending(batchId, "FO-1001", {
      incrementRetry: true
    });
    expect(
      retried.items.find((item) => item.foNumber === "FO-1001")?.retryCount
    ).toBe(1);
    expect(retried.pendingCount).toBe(2);
  });
});
