import type { DateTimeValue } from "@/lib/utils/date-time";

export const ACTIVE_RUN_MODES = ["SUBMIT"] as const;
export const LEGACY_RUN_MODES = ["DRY_RUN"] as const;
export const RUN_MODES = [...ACTIVE_RUN_MODES, ...LEGACY_RUN_MODES] as const;
export type RunMode = (typeof RUN_MODES)[number];

export const SUPPORTED_CALL_STATUSES = [
  "Interested",
  "Follow Up",
  "Call Back",
  "Not Interested",
  "Call Disconnected",
  "Call Drop",
  "Not Connected",
  "Language Barrier"
] as const;

export const UNSUPPORTED_CALL_STATUSES = [] as const;

export const NO_BRANCH_CALL_STATUSES = [
  "Call Disconnected",
  "Call Drop",
  "Not Connected",
  "Language Barrier"
] as const;

export const RANDOM_CALL_STATUS_VALUE = "Random Unsupported" as const;
export const RANDOM_CALL_STATUS_OPTIONS = [...NO_BRANCH_CALL_STATUSES] as const;
export type RandomCallStatusOption = (typeof RANDOM_CALL_STATUS_OPTIONS)[number];

export const ALL_CALL_STATUSES = [
  ...SUPPORTED_CALL_STATUSES,
  ...UNSUPPORTED_CALL_STATUSES
] as const;

export type SupportedCallStatus = (typeof SUPPORTED_CALL_STATUSES)[number];
export type UnsupportedCallStatus = (typeof UNSUPPORTED_CALL_STATUSES)[number];
export type CallStatus = (typeof ALL_CALL_STATUSES)[number];

export const OMC_OPTIONS = ["IOCL", "RIL", "HPCL", "Others"] as const;
export type OmcOption = (typeof OMC_OPTIONS)[number];

export const PLAN_PITCHED_OPTIONS = [
  "Bonus",
  "Super Bonus",
  "Super Bonus Plus",
  "Monthly"
] as const;
export type PlanPitchedOption = (typeof PLAN_PITCHED_OPTIONS)[number];

export const INTERESTED_OPTIONS = [
  "Will Recharge Later",
  "Card Not Activated",
  "Plan Sales - Waiting for Plan Activation",
  "On Call Recharge Done",
  "Requesting for Field Executive to meet F2F",
  "Plan Sales - HPCL - Waiting for Hotlist",
  "Will buy Fuel when finds a load",
  "GPS Service Issue",
  "Transporter Fills Fuel, Will buy Fuel when gets Outside Load",
  "FT Service Issue",
  "Plan Sales - IOCL - Waiting for Hotlist",
  "DND - Will do on his own"
] as const;
export type InterestedOption = (typeof INTERESTED_OPTIONS)[number];

export const NOT_INTERESTED_OPTIONS = [
  "Plan Sales - Not Interested in Value Prop",
  "Transporter fills the Fuel",
  "Do not Disturb (DND) (Currently selected)",
  "FT Service Issue",
  "GPS Service Issue",
  "No Truck/ Truck Sold",
  "Education issue - Does not want/know to do Online Transactions",
  "Already using Other Fuel Cards/Better Offers",
  "Wrong Commitment from FOS",
  "Vehicle Runs in Local",
  "Less than 7.5 Ton / Filling Bio-Gas",
  "Customer Wants only Physical Card",
  "Load Issue",
  "Card Not Activated",
  "OTP Issue - HPCL",
  "FO already transacting with alternate number with BB",
  "OTP Issue - IOCL",
  "Wrong Number / BB Employee",
  "Requesting for Field Executive to meet F2F"
] as const;
export type NotInterestedOption = (typeof NOT_INTERESTED_OPTIONS)[number];

export type SubmissionFormValues = {
  foNumber: string;
  callStatus: CallStatus | "";
  omc: OmcOption | "";
  noOfTrucks: string;
  fuelingPotential: string;
  fuelingFrequency: string;
  remarks: string;
  mode: RunMode;
  debug: boolean;
  interestedReason?: InterestedOption;
  interestedNextTransaction?: DateTimeValue;
  interestedPlanPitched?: PlanPitchedOption;
  followUpNextCall?: DateTimeValue;
  followUpPlanPitched?: PlanPitchedOption;
  callBackNextCall?: DateTimeValue;
  notInterestedReason?: NotInterestedOption;
};

export type SubmissionSummaryItem = {
  label: string;
  value: string;
};
