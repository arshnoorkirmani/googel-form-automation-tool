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
      mode: "DRY_RUN",
      debug: false,
      notInterestedReason: "Load Issue"
    } as const;

    runStore.create(runId, submission);
    runStore.setRunning(runId);
    runStore.addProgress(runId, "FORM_OPENED", "Form opened");
    const completed = runStore.succeed(runId, "Dry run completed.", false);

    expect(completed.status).toBe("SUCCEEDED");
    expect(completed.result?.dryRun).toBe(true);
    expect(runStore.get(runId)?.progress.length).toBeGreaterThan(1);
  });
});
