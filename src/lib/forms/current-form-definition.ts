import type { FormDefinition } from "@/lib/forms/form-types";
import {
  INTERESTED_OPTIONS,
  NOT_INTERESTED_OPTIONS,
  PLAN_PITCHED_OPTIONS,
  RANDOM_CALL_STATUS_OPTIONS,
  RANDOM_CALL_STATUS_VALUE,
  SUPPORTED_CALL_STATUSES
} from "@/modules/submission/submission.types";

export type CurrentFormFieldKey =
  | "emailCheckbox"
  | "foNumber"
  | "callStatus"
  | "omc"
  | "noOfTrucks"
  | "fuelingPotential"
  | "fuelingFrequency"
  | "interestedReason"
  | "interestedNextTransaction"
  | "interestedPlanPitched"
  | "followUpNextCall"
  | "followUpPlanPitched"
  | "callBackNextCall"
  | "notInterestedReason"
  | "remarks";

export type CurrentFormPageId =
  | "common"
  | "interestedBranch"
  | "followUpBranch"
  | "callBackBranch"
  | "notInterestedBranch"
  | "remarks";

const labels = {
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

export const currentFormDefinition: FormDefinition<
  CurrentFormFieldKey,
  CurrentFormPageId
> = {
  id: "blackbuck-disposition-google-form",
  title: "Dispositions Form Automation",
  labels,
  buttons: {
    next: /next/i,
    submit: /^submit$/i
  },
  fields: {
    emailCheckbox: {
      key: "emailCheckbox",
      label: labels.emailCheckbox,
      type: "checkbox",
      interaction: "check",
      pageId: "common",
      required: true,
      valueSource: {
        kind: "static",
        value: true
      }
    },
    foNumber: {
      key: "foNumber",
      label: labels.foNumber,
      type: "text",
      interaction: "type",
      pageId: "common",
      required: true,
      valueSource: {
        kind: "submission",
        key: "foNumber"
      }
    },
    callStatus: {
      key: "callStatus",
      label: labels.callStatus,
      type: "dropdown",
      interaction: "select",
      pageId: "common",
      required: true,
      valueSource: {
        kind: "submission",
        key: "callStatus"
      },
      options: SUPPORTED_CALL_STATUSES
    },
    omc: {
      key: "omc",
      label: labels.omc,
      type: "dropdown",
      interaction: "select",
      pageId: "common",
      required: false,
      valueSource: {
        kind: "submission",
        key: "omc"
      }
    },
    noOfTrucks: {
      key: "noOfTrucks",
      label: labels.noOfTrucks,
      type: "text",
      interaction: "type",
      pageId: "common",
      required: true,
      valueSource: {
        kind: "submission",
        key: "noOfTrucks"
      }
    },
    fuelingPotential: {
      key: "fuelingPotential",
      label: labels.fuelingPotential,
      type: "text",
      interaction: "type",
      pageId: "common",
      required: true,
      valueSource: {
        kind: "submission",
        key: "fuelingPotential"
      }
    },
    fuelingFrequency: {
      key: "fuelingFrequency",
      label: labels.fuelingFrequency,
      type: "text",
      interaction: "type",
      pageId: "common",
      required: true,
      valueSource: {
        kind: "submission",
        key: "fuelingFrequency"
      }
    },
    interestedReason: {
      key: "interestedReason",
      label: labels.interestedReason,
      type: "dropdown",
      interaction: "select",
      pageId: "interestedBranch",
      required: true,
      valueSource: {
        kind: "submission",
        key: "interestedReason"
      },
      dependsOn: {
        key: "callStatus",
        values: ["Interested"]
      },
      options: INTERESTED_OPTIONS
    },
    interestedNextTransaction: {
      key: "interestedNextTransaction",
      label: labels.interestedNextTransaction,
      type: "dateTime",
      interaction: "dateTime",
      pageId: "interestedBranch",
      required: true,
      valueSource: {
        kind: "submission",
        key: "interestedNextTransaction"
      },
      dependsOn: {
        key: "callStatus",
        values: ["Interested"]
      }
    },
    interestedPlanPitched: {
      key: "interestedPlanPitched",
      label: labels.interestedPlanPitched,
      type: "dropdown",
      interaction: "select",
      pageId: "interestedBranch",
      required: true,
      valueSource: {
        kind: "submission",
        key: "interestedPlanPitched"
      },
      dependsOn: {
        key: "callStatus",
        values: ["Interested"]
      },
      options: PLAN_PITCHED_OPTIONS
    },
    followUpNextCall: {
      key: "followUpNextCall",
      label: labels.followUpNextCall,
      type: "dateTime",
      interaction: "dateTime",
      pageId: "followUpBranch",
      required: true,
      valueSource: {
        kind: "submission",
        key: "followUpNextCall"
      },
      dependsOn: {
        key: "callStatus",
        values: ["Follow Up"]
      }
    },
    followUpPlanPitched: {
      key: "followUpPlanPitched",
      label: labels.followUpPlanPitched,
      type: "dropdown",
      interaction: "select",
      pageId: "followUpBranch",
      required: true,
      valueSource: {
        kind: "submission",
        key: "followUpPlanPitched"
      },
      dependsOn: {
        key: "callStatus",
        values: ["Follow Up"]
      },
      options: PLAN_PITCHED_OPTIONS
    },
    callBackNextCall: {
      key: "callBackNextCall",
      label: labels.callBackNextCall,
      type: "dateTime",
      interaction: "dateTime",
      pageId: "callBackBranch",
      required: true,
      valueSource: {
        kind: "submission",
        key: "callBackNextCall"
      },
      dependsOn: {
        key: "callStatus",
        values: ["Call Back"]
      }
    },
    notInterestedReason: {
      key: "notInterestedReason",
      label: labels.notInterestedReason,
      type: "dropdown",
      interaction: "select",
      pageId: "notInterestedBranch",
      required: true,
      valueSource: {
        kind: "submission",
        key: "notInterestedReason"
      },
      dependsOn: {
        key: "callStatus",
        values: ["Not Interested"]
      },
      options: NOT_INTERESTED_OPTIONS
    },
    remarks: {
      key: "remarks",
      label: labels.remarks,
      type: "textarea",
      interaction: "type",
      pageId: "remarks",
      required: true,
      valueSource: {
        kind: "submission",
        key: "remarks"
      }
    }
  },
  pages: {
    common: {
      id: "common",
      title: "Common Fields",
      fields: [
        "emailCheckbox",
        "foNumber",
        "callStatus",
        "omc",
        "noOfTrucks",
        "fuelingPotential",
        "fuelingFrequency"
      ],
      transition: {
        action: "next"
      }
    },
    interestedBranch: {
      id: "interestedBranch",
      title: "Interested Branch Details",
      fields: [
        "interestedReason",
        "interestedNextTransaction",
        "interestedPlanPitched"
      ],
      transition: {
        action: "next"
      }
    },
    followUpBranch: {
      id: "followUpBranch",
      title: "Follow Up Branch Details",
      fields: ["followUpNextCall", "followUpPlanPitched"],
      transition: {
        action: "next"
      }
    },
    callBackBranch: {
      id: "callBackBranch",
      title: "Call Back Branch Details",
      fields: ["callBackNextCall"],
      transition: {
        action: "next"
      }
    },
    notInterestedBranch: {
      id: "notInterestedBranch",
      title: "Not Interested Branch Details",
      fields: ["notInterestedReason"],
      transition: {
        action: "next"
      }
    },
    remarks: {
      id: "remarks",
      title: "Remarks",
      fields: ["remarks"],
      transition: {
        action: "submit"
      }
    }
  },
  branching: {
    selectorKey: "callStatus",
    pageByValue: {
      Interested: "interestedBranch",
      "Follow Up": "followUpBranch",
      "Call Back": "callBackBranch",
      "Not Interested": "notInterestedBranch",
      "Call Disconnected": null,
      "Call Drop": null,
      "Not Connected": null,
      "Language Barrier": null
    }
  },
  submitBehavior: {
    confirmationText: "Your response has been recorded",
    submitAnotherResponseText: "Submit another response"
  },
  sessionValidationLabels: [labels.foNumber, labels.callStatus, labels.omc],
  callStatus: {
    supportedOptions: SUPPORTED_CALL_STATUSES,
    randomPool: {
      value: RANDOM_CALL_STATUS_VALUE,
      label: "Random Call Status",
      options: RANDOM_CALL_STATUS_OPTIONS
    }
  }
};
