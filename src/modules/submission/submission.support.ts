import {
  ALL_CALL_STATUSES,
  NO_BRANCH_CALL_STATUSES,
  RANDOM_CALL_STATUS_OPTIONS,
  RANDOM_CALL_STATUS_VALUE,
  SUPPORTED_CALL_STATUSES,
  type CallStatus,
  type RandomCallStatusOption,
  type SubmissionFormValues,
  UNSUPPORTED_CALL_STATUSES
} from "@/modules/submission/submission.types";
import { currentFormDefinition } from "@/lib/forms/current-form-definition";

export const PAGE_LABELS = currentFormDefinition.labels;

export const CALL_STATUS_UI_OPTIONS = ALL_CALL_STATUSES.map((status) => ({
  value: status,
  label: status,
  supported: SUPPORTED_CALL_STATUSES.includes(
    status as (typeof SUPPORTED_CALL_STATUSES)[number]
  )
}));

export const RANDOM_CALL_STATUS_UI_OPTIONS = currentFormDefinition.callStatus.randomPool.options.map(
  (status) => ({
    value: status,
    label: status
  })
);

export const RANDOM_CALL_STATUS_UI_VALUE =
  currentFormDefinition.callStatus.randomPool.value;
export const RANDOM_CALL_STATUS_UI_LABEL =
  currentFormDefinition.callStatus.randomPool.label;

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

export function isRandomCallStatusSelection(value: string): boolean {
  return value === RANDOM_CALL_STATUS_VALUE;
}

export function getDefaultRandomCallStatusPool(): RandomCallStatusOption[] {
  return [...RANDOM_CALL_STATUS_OPTIONS];
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

  if (isRandomCallStatusSelection(callStatus)) {
    return "Random Call Status Pool";
  }

  if (isUnsupportedCallStatus(callStatus)) {
    return `${callStatus} is not supported in the MVP`;
  }

  if (isBranchlessCallStatus(callStatus)) {
    return `${callStatus} - No additional fields`;
  }

  const branchPageId = currentFormDefinition.branching.pageByValue[callStatus];
  const branchTitle =
    branchPageId && currentFormDefinition.pages[branchPageId]
      ? currentFormDefinition.pages[branchPageId].title
      : `${callStatus} Branch Details`;

  return branchTitle;
}
