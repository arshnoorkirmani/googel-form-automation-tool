import type { FieldErrors, UseFormRegister } from "react-hook-form";

import { FieldError } from "@/components/shared/field-error";
import { CALL_STATUS_UI_OPTIONS } from "@/modules/submission/submission.support";
import {
  OMC_OPTIONS,
  type SubmissionFormValues
} from "@/modules/submission/submission.types";

type CommonFieldsSectionProps = {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  callStatus: any;
  onCallStatusChange: (nextValue: string) => void;
  hideFoNumber?: boolean;
};

function InputField({
  label,
  name,
  register,
  errors,
  type = "text"
}: {
  label: string;
  name: string;
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-text">{label}</span>
      <input
        type={type}
        {...register(name)}
        className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-text outline-none focus:border-accent"
      />
      <FieldError message={errors[name]?.message?.toString()} />
    </label>
  );
}

export function CommonFieldsSection({
  register,
  errors,
  callStatus,
  onCallStatusChange,
  hideFoNumber
}: CommonFieldsSectionProps) {
  const callStatusField = register("callStatus");

  return (
    <section className="rounded-2xl border border-line bg-surface p-6 shadow-panel">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Page 1</p>
        <h3 className="mt-1 text-lg font-semibold text-text">Common Fields</h3>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {!hideFoNumber && (
          <InputField
            label="FO Number"
            name="foNumber"
            register={register}
            errors={errors}
          />
        )}

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-text">
            Call Status
          </span>
          <select
            name={callStatusField.name}
            ref={callStatusField.ref}
            onBlur={callStatusField.onBlur}
            value={callStatus}
            onChange={(event) => {
              callStatusField.onChange(event);
              onCallStatusChange(event.target.value);
            }}
            className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-text outline-none focus:border-accent"
          >
            <option value="">Select Call Status</option>
            {hideFoNumber && (
              <option value="Random Unsupported">Random Unsupported</option>
            )}
            {CALL_STATUS_UI_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={!option.supported}
              >
                {option.supported ? option.label : `${option.label} (coming soon)`}
              </option>
            ))}
          </select>
          <FieldError message={errors.callStatus?.message?.toString()} />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-text">OMC</span>
          <select
            {...register("omc")}
            className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-text outline-none focus:border-accent"
          >
            <option value="">Select OMC</option>
            {OMC_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <FieldError message={errors.omc?.message?.toString()} />
        </label>

        <InputField
          label="No of Trucks"
          name="noOfTrucks"
          register={register}
          errors={errors}
        />
        <InputField
          label="Fueling Potential"
          name="fuelingPotential"
          register={register}
          errors={errors}
        />
        <InputField
          label="Fueling Frequency"
          name="fuelingFrequency"
          register={register}
          errors={errors}
        />
      </div>
    </section>
  );
}
