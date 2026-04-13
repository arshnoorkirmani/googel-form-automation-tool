import { z } from "zod";

import { baseSubmissionSchema } from "./submission.schema";
import { SUPPORTED_CALL_STATUSES } from "./submission.types";

export const batchSubmissionSchema = baseSubmissionSchema
  .omit({ foNumber: true })
  .extend({
    foNumberList: z
      .array(z.string().trim().min(1))
      .min(1, "At least one FO Number is required")
      .max(50, "Maximum 50 FO Numbers allowed per batch"),
    delaySeconds: z.coerce.number().int().min(1, "Minimum 1 second delay").max(300, "Maximum 300 seconds delay").default(10),
    callStatus: z
      .string()
      .trim()
      .min(1, "Call Status is required")
      .refine(
        (value) =>
          SUPPORTED_CALL_STATUSES.includes(
            value as (typeof SUPPORTED_CALL_STATUSES)[number]
          ) || value === "Random Unsupported",
        "Select a valid Call Status or Random Unsupported"
      )
  })
  .superRefine((values, context) => {
    switch (values.callStatus) {
      case "Interested":
        if (!values.interestedReason) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["interestedReason"],
            message: "Interested value is required"
          });
        }
        if (!values.interestedNextTransaction) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["interestedNextTransaction"],
            message: "Next Transaction Date is required"
          });
        }
        if (!values.interestedPlanPitched) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["interestedPlanPitched"],
            message: "Plan Pitched is required"
          });
        }
        break;
      case "Follow Up":
        if (!values.followUpNextCall) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["followUpNextCall"],
            message: "Follow Up next call date is required"
          });
        }
        if (!values.followUpPlanPitched) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["followUpPlanPitched"],
            message: "Follow Up Plan Pitched is required"
          });
        }
        break;
      case "Call Back":
        if (!values.callBackNextCall) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["callBackNextCall"],
            message: "Call Back next call time is required"
          });
        }
        break;
      case "Not Interested":
        if (!values.notInterestedReason) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["notInterestedReason"],
            message: "Not Interested reason is required"
          });
        }
        break;
      default:
        break;
    }
  });

export type BatchSubmissionPayload = z.infer<typeof batchSubmissionSchema>;
