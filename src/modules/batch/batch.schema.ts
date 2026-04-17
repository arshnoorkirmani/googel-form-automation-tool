import { z } from "zod";

import { ACTIVE_RUN_MODES } from "@/modules/submission/submission.types";
import { submissionSchema } from "@/modules/submission/submission.schema";

export const batchExecutionSchema = z.object({
  rows: z.array(submissionSchema).max(50),
  mode: z.enum(ACTIVE_RUN_MODES).default("SUBMIT")
});
