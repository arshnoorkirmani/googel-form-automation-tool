import {
  ALL_CALL_STATUSES,
  NO_BRANCH_CALL_STATUSES,
  SUPPORTED_CALL_STATUSES,
  type CallStatus,
  type SubmissionFormValues,
  UNSUPPORTED_CALL_STATUSES
} from "@/modules/submission/submission.types";

export const PAGE_LABELS = {
  emailCheckbox: "Email",
  foNumber: "FO Number",
  callStatus: "Call Status",
  omc: "OMC",
  noOfTrucks: "No of Trucks",
  fuelingPotential: "Fueling Potential",
  fuelingFrequency: "Fueling Frequency",
  interestedReason: "Interested",
  interestedNextTransaction: "Next Transaction Date",
  interestedPlanPitched: "Plan Pitched",
  followUpNextCall: "Follow_Up-Next_Call_date",
  followUpPlanPitched: "Follow Up - Plan Pitched",
  callBackNextCall: "Call_Back-Next_Call_Time",
  notInterestedReason: "Not Interested",
  remarks: "Remarks"
} as const;

export const CALL_STATUS_UI_OPTIONS = ALL_CALL_STATUSES.map((status) => ({
  value: status,
  label: status,
  supported: SUPPORTED_CALL_STATUSES.includes(
    status as (typeof SUPPORTED_CALL_STATUSES)[number]
  )
}));

export function isSupportedCallStatus(
  value: string
): value is (typeof SUPPORTED_CALL_STATUSES)[number] {
  return SUPPORTED_CALL_STATUSES.includes(
    value as (typeof SUPPORTED_CALL_STATUSES)[number]
  );
}

export function isUnsupportedCallStatus(
  value: string
): value is (typeof UNSUPPORTED_CALL_STATUSES)[number] {
  return UNSUPPORTED_CALL_STATUSES.includes(
    value as (typeof UNSUPPORTED_CALL_STATUSES)[number]
  );
}

export function isBranchlessCallStatus(
  value: string
): value is (typeof NO_BRANCH_CALL_STATUSES)[number] {
  return NO_BRANCH_CALL_STATUSES.includes(
    value as (typeof NO_BRANCH_CALL_STATUSES)[number]
  );
}

export function clearBranchFields(
  values: SubmissionFormValues
): SubmissionFormValues {
  return {
    ...values,
    interestedReason: undefined,
    interestedNextTransaction: undefined,
    interestedPlanPitched: undefined,
    followUpNextCall: undefined,
    followUpPlanPitched: undefined,
    callBackNextCall: undefined,
    notInterestedReason: undefined
  };
}

export function getBranchTitle(callStatus: CallStatus | ""): string {
  if (!callStatus) {
    return "Branch Details";
  }

  if (isUnsupportedCallStatus(callStatus)) {
    return `${callStatus} is not supported in the MVP`;
  }

  if (isBranchlessCallStatus(callStatus)) {
    return `${callStatus} - No additional fields`;
  }

  return `${callStatus} Branch Details`;
}
