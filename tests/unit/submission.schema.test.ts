import { submissionSchema } from "@/modules/submission/submission.schema";

describe("submissionSchema", () => {
  it("accepts a valid Interested submission", () => {
    const payload = {
      foNumber: "FO-1001",
      callStatus: "Interested",
      omc: "IOCL",
      noOfTrucks: "3",
      fuelingPotential: "1500",
      fuelingFrequency: "2",
      remarks: "Interested customer.",
      mode: "SUBMIT",
      debug: false,
      interestedReason: "Will Recharge Later",
      interestedNextTransaction: {
        date: "22-04-2026",
        hour: "11",
        minute: "20",
        meridiem: "AM"
      },
      interestedPlanPitched: "Bonus"
    };

    expect(submissionSchema.parse(payload)).toMatchObject(payload);
  });

  it("normalizes legacy dry-run payloads to submit mode", () => {
    const payload = {
      foNumber: "FO-1005",
      callStatus: "Call Drop",
      omc: "RIL",
      noOfTrucks: "2",
      fuelingPotential: "1200",
      fuelingFrequency: "1",
      remarks: "Legacy payload",
      mode: "DRY_RUN",
      debug: false
    };

    expect(submissionSchema.parse(payload).mode).toBe("SUBMIT");
  });

  it("rejects unsupported call statuses", () => {
    const result = submissionSchema.safeParse({
      foNumber: "FO-1002",
      callStatus: "Random Unsupported",
      omc: "RIL",
      noOfTrucks: "2",
      fuelingPotential: "1200",
      fuelingFrequency: "1",
      remarks: "Unsupported branch.",
      mode: "SUBMIT",
      debug: false
    });

    expect(result.success).toBe(false);
  });
});
