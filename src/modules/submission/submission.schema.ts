import { z } from "zod";

import { isValidDateString } from "@/lib/utils/date-time";
import {
  INTERESTED_OPTIONS,
  NOT_INTERESTED_OPTIONS,
  OMC_OPTIONS,
  PLAN_PITCHED_OPTIONS,
  RUN_MODES,
  SUPPORTED_CALL_STATUSES
} from "@/modules/submission/submission.types";

const dateTimeValueSchema = z.object({
  date: z
    .string()
    .trim()
    .regex(/^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-(20\d{2})$/, {
      message: "Use dd-mm-yyyy"
    })
    .refine(isValidDateString, "Enter a valid date"),
  hour: z.string().regex(/^(0?[1-9]|1[0-2])$/, "Use 1-12"),
  minute: z.string().regex(/^[0-5][0-9]$/, "Use 00-59"),
  meridiem: z.enum(["AM", "PM"])
});

const optionalStringSelect = (values: readonly string[], message: string) =>
  z.preprocess(
    (input) => (input === "" ? undefined : input),
    z
      .string()
      .optional()
      .refine(
        (value) => !value || values.includes(value),
        message
      )
  );

const optionalDateTimeValueSchema = z.preprocess(
  (input) => {
    if (
      input &&
      typeof input === "object" &&
      "date" in input &&
      "hour" in input &&
      "minute" in input &&
      "meridiem" in input
    ) {
      const typedInput = input as Record<string, string>;
      const isBlank =
        !typedInput.date &&
        !typedInput.hour &&
        !typedInput.minute &&
        !typedInput.meridiem;

      if (isBlank) {
        return undefined;
      }
    }

    return input;
  },
  dateTimeValueSchema.optional()
);

export const baseSubmissionSchema = z
  .object({
    foNumber: z.string().trim().min(1, "FO Number is required"),
    callStatus: z
      .string()
      .trim()
      .min(1, "Call Status is required")
      .refine(
        (value) =>
          SUPPORTED_CALL_STATUSES.includes(
            value as (typeof SUPPORTED_CALL_STATUSES)[number]
          ),
        "This Call Status is not supported yet"
      ),
    omc: optionalStringSelect(OMC_OPTIONS, "Select a valid OMC"),
    noOfTrucks: z
      .string()
      .trim()
      .regex(/^\d+$/, "No of Trucks must be numeric"),
    fuelingPotential: z.string().trim().min(1, "Fueling Potential is required"),
    fuelingFrequency: z.string().trim().min(1, "Fueling Frequency is required"),
    remarks: z.string().trim().min(1, "Remarks are required"),
    mode: z.enum(RUN_MODES).default("DRY_RUN"),
    debug: z.boolean().default(false),
    interestedReason: optionalStringSelect(
      INTERESTED_OPTIONS,
      "Select a valid Interested value"
    ),
    interestedNextTransaction: optionalDateTimeValueSchema,
    interestedPlanPitched: optionalStringSelect(
      PLAN_PITCHED_OPTIONS,
      "Select a valid Plan Pitched value"
    ),
    followUpNextCall: optionalDateTimeValueSchema,
    followUpPlanPitched: optionalStringSelect(
      PLAN_PITCHED_OPTIONS,
      "Select a valid Follow Up Plan Pitched value"
    ),
    callBackNextCall: optionalDateTimeValueSchema,
    notInterestedReason: optionalStringSelect(
      NOT_INTERESTED_OPTIONS,
      "Select a valid Not Interested value"
    )
  });

export const submissionSchema = baseSubmissionSchema
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

export type SubmissionPayload = z.infer<typeof submissionSchema>;
