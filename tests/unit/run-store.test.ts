import { runStore } from "@/server/runs/run-store";

describe("runStore", () => {
  it("creates and transitions a run", () => {
    const runId = `test-run-${Date.now()}`;
    const submission = {
      foNumber: "FO-1003",
      callStatus: "Not Interested",
      omc: "HPCL",
      noOfTrucks: "5",
      fuelingPotential: "2200",
      fuelingFrequency: "4",
      remarks: "No interest right now.",
      mode: "SUBMIT",
      debug: false,
      notInterestedReason: "Load Issue"
    } as const;

    runStore.create(runId, submission);
    runStore.setRunning(runId);
    runStore.addProgress(runId, "FORM_OPENED", "Form opened");
    const completed = runStore.succeed(runId, "Form submitted successfully.", true);

    expect(completed.status).toBe("SUCCEEDED");
    expect(completed.result?.submitted).toBe(true);
    expect(completed.foNumber).toBe("FO-1003");
    expect(completed.remarks).toBe("No interest right now.");
    expect(completed.durationMs).toBeTypeOf("number");
    expect(runStore.get(runId)?.progress.length).toBeGreaterThan(1);
  });
});
