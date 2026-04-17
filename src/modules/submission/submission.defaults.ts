import type { SubmissionFormValues } from "@/modules/submission/submission.types";

export function createEmptyDateTimeValue() {
  return {
    date: "",
    hour: "",
    minute: "",
    meridiem: "AM" as const
  };
}

export function createDefaultSubmissionValues(): SubmissionFormValues {
  return {
    foNumber: "",
    callStatus: "",
    omc: "",
    noOfTrucks: "",
    fuelingPotential: "",
    fuelingFrequency: "",
    remarks: "",
    mode: "SUBMIT",
    debug: false
  };
}
