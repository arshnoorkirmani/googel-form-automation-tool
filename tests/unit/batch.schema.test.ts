import { batchSubmissionSchema } from "@/modules/submission/batch.schema";

describe("batchSubmissionSchema", () => {
  it("requires at least one allowed random call status when random mode is selected", () => {
    const result = batchSubmissionSchema.safeParse({
      foNumberList: ["FO-2001"],
      callStatus: "Random Unsupported",
      randomCallStatusPool: [],
      omc: "HPCL",
      noOfTrucks: "4",
      fuelingPotential: "900",
      fuelingFrequency: "2",
      remarks: "Batch random mode",
      mode: "SUBMIT",
      debug: false,
      delaySeconds: 10
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path[0] === "randomCallStatusPool")).toBe(
      true
    );
  });

  it("accepts a checked random call status pool", () => {
    const result = batchSubmissionSchema.safeParse({
      foNumberList: ["FO-2002"],
      callStatus: "Random Unsupported",
      randomCallStatusPool: ["Call Drop", "Not Connected"],
      omc: "IOCL",
      noOfTrucks: "6",
      fuelingPotential: "1400",
      fuelingFrequency: "3",
      remarks: "Batch random mode",
      mode: "SUBMIT",
      debug: false,
      delaySeconds: 10
    });

    expect(result.success).toBe(true);
  });
});
