import { describe, expect, it } from "vitest";

import { batchStore } from "@/server/runs/batch-store";

const operatorId = "tester@blackbuck.com";

describe("batchStore", () => {
  it("supports pause, resume, stop, waiting, and retry reset flows", () => {
    batchStore.clearForOperator(operatorId);

    const record = batchStore.create(
      "batch-test",
      {
        foNumberList: ["FO-1", "FO-2"],
        callStatus: "Interested",
        omc: "IOCL",
        noOfTrucks: "2",
        fuelingPotential: "1000",
        fuelingFrequency: "1",
        remarks: "test",
        mode: "DRY_RUN",
        debug: false,
        interestedReason: "Will Recharge Later",
        interestedNextTransaction: {
          date: "20-04-2026",
          hour: "11",
          minute: "30",
          meridiem: "AM"
        },
        interestedPlanPitched: "Bonus",
        delaySeconds: 5
      },
      operatorId
    );

    expect(record.status).toBe("QUEUED");

    expect(batchStore.setBatchRunning(record.batchId).status).toBe("RUNNING");
    expect(batchStore.requestPause(record.batchId).status).toBe("PAUSING");
    expect(batchStore.setBatchPaused(record.batchId).status).toBe("PAUSED");
    expect(batchStore.resumeBatch(record.batchId).status).toBe("RUNNING");

    const waiting = batchStore.setWaiting(record.batchId, 5);
    expect(waiting.waitingStartedAt).toBeDefined();
    expect(waiting.waitingUntil).toBeDefined();
    expect(batchStore.clearWaiting(record.batchId).waitingUntil).toBeUndefined();

    batchStore.setItemFailed(record.batchId, "FO-1", "network");
    const reset = batchStore.setItemPending(record.batchId, "FO-1");
    const retriedItem = reset.items.find((item) => item.foNumber === "FO-1");

    expect(retriedItem?.status).toBe("PENDING");
    expect(retriedItem?.errorMessage).toBeUndefined();

    expect(batchStore.requestStop(record.batchId).status).toBe("STOPPING");
    const stopped = batchStore.setBatchStopped(record.batchId);
    expect(stopped.status).toBe("STOPPED");
    expect(stopped.completedAt).toBeDefined();
    expect(stopped.waitingUntil).toBeUndefined();

    batchStore.clearForOperator(operatorId);
  });
});
