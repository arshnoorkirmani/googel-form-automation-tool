import { z } from "zod";

import { submissionSchema } from "@/modules/submission/submission.schema";

export const batchExecutionSchema = z.object({
  rows: z.array(submissionSchema).max(50),
  mode: z.enum(["DRY_RUN", "SUBMIT"]).default("DRY_RUN")
});
