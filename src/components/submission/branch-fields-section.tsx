import type { FieldErrors, UseFormRegister } from "react-hook-form";

import { FieldError } from "@/components/shared/field-error";
import {
  getBranchTitle,
  isBranchlessCallStatus,
  isUnsupportedCallStatus
} from "@/modules/submission/submission.support";
import {
  INTERESTED_OPTIONS,
  NOT_INTERESTED_OPTIONS,
  PLAN_PITCHED_OPTIONS,
  type SubmissionFormValues
} from "@/modules/submission/submission.types";

type BranchFieldsSectionProps = {
  callStatus: any;
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
};

function DateTimeFields({
  prefix,
  label,
  register,
  errors
}: {
  prefix:
    | "interestedNextTransaction"
    | "followUpNextCall"
    | "callBackNextCall";
  label: string;
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
}) {
  const groupErrors = errors[prefix] as any;

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="text-sm font-medium text-text">{label}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-4">
        <label>
          <span className="mb-1 block text-xs uppercase tracking-[0.1em] text-muted">
            Date
          </span>
          <input
            type="text"
            placeholder="dd-mm-yyyy"
            {...register(`${prefix}.date`)}
            className="w-full rounded-xl border border-line px-3 py-2.5 text-sm"
          />
          <FieldError message={groupErrors?.date?.message?.toString()} />
        </label>
        <label>
          <span className="mb-1 block text-xs uppercase tracking-[0.1em] text-muted">
            Hour
          </span>
          <input
            type="text"
            placeholder="11"
            {...register(`${prefix}.hour`)}
            className="w-full rounded-xl border border-line px-3 py-2.5 text-sm"
          />
          <FieldError message={groupErrors?.hour?.message?.toString()} />
        </label>
        <label>
          <span className="mb-1 block text-xs uppercase tracking-[0.1em] text-muted">
            Minute
          </span>
          <input
            type="text"
            placeholder="30"
            {...register(`${prefix}.minute`)}
            className="w-full rounded-xl border border-line px-3 py-2.5 text-sm"
          />
          <FieldError message={groupErrors?.minute?.message?.toString()} />
        </label>
        <label>
          <span className="mb-1 block text-xs uppercase tracking-[0.1em] text-muted">
            AM/PM
          </span>
          <select
            {...register(`${prefix}.meridiem`)}
            className="w-full rounded-xl border border-line px-3 py-2.5 text-sm"
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
          <FieldError message={groupErrors?.meridiem?.message?.toString()} />
        </label>
      </div>
    </div>
  );
}

export function BranchFieldsSection({
  callStatus,
  register,
  errors
}: BranchFieldsSectionProps) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-6 shadow-panel">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Page 2</p>
        <h3 className="mt-1 text-lg font-semibold text-text">
          {getBranchTitle(callStatus)}
        </h3>
      </div>

      {!callStatus ? (
        <p className="text-sm text-muted">
          Select a supported Call Status to reveal the correct branch fields.
        </p>
      ) : null}

      {callStatus && isUnsupportedCallStatus(callStatus) ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {callStatus} is intentionally blocked in the MVP. Only Interested, Follow Up,
          Call Back, and Not Interested are automated right now.
        </p>
      ) : null}

      {callStatus && isBranchlessCallStatus(callStatus) ? (
        <p className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-muted">
          No additional branch fields are required for {callStatus}. Continue to
          Remarks on Page 3.
        </p>
      ) : null}

      {callStatus === "Interested" ? (
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-text">
              Interested
            </span>
            <select
              {...register("interestedReason")}
              className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm"
            >
              <option value="">Select Interested Option</option>
              {INTERESTED_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <FieldError message={errors.interestedReason?.message?.toString()} />
          </label>

          <DateTimeFields
            prefix="interestedNextTransaction"
            label="Next Transaction Date"
            register={register}
            errors={errors}
          />

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-text">
              Plan Pitched
            </span>
            <select
              {...register("interestedPlanPitched")}
              className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm"
            >
              <option value="">Select Plan Pitched</option>
              {PLAN_PITCHED_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <FieldError
              message={errors.interestedPlanPitched?.message?.toString()}
            />
          </label>
        </div>
      ) : null}

      {callStatus === "Follow Up" ? (
        <div className="space-y-4">
          <DateTimeFields
            prefix="followUpNextCall"
            label="Follow_Up-Next_Call_date"
            register={register}
            errors={errors}
          />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-text">
              Follow Up - Plan Pitched
            </span>
            <select
              {...register("followUpPlanPitched")}
              className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm"
            >
              <option value="">Select Plan Pitched</option>
              {PLAN_PITCHED_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <FieldError message={errors.followUpPlanPitched?.message?.toString()} />
          </label>
        </div>
      ) : null}

      {callStatus === "Call Back" ? (
        <DateTimeFields
          prefix="callBackNextCall"
          label="Call_Back-Next_Call_Time"
          register={register}
          errors={errors}
        />
      ) : null}

      {callStatus === "Not Interested" ? (
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-text">
            Not Interested
          </span>
          <select
            {...register("notInterestedReason")}
            className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm"
          >
            <option value="">Select Not Interested Reason</option>
            {NOT_INTERESTED_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <FieldError message={errors.notInterestedReason?.message?.toString()} />
        </label>
      ) : null}
    </section>
  );
}
