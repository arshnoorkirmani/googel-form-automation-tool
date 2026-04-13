import type { UseFormRegister } from "react-hook-form";

import type { SubmissionFormValues } from "@/modules/submission/submission.types";

type ModeToggleProps = {
  register: UseFormRegister<SubmissionFormValues>;
};

export function ModeToggle({ register }: ModeToggleProps) {
  return (
    <div className="rounded-2xl border border-line bg-surface-alt p-4">
      <p className="text-sm font-semibold text-text">Execution Mode</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-white p-4">
          <input
            type="radio"
            value="DRY_RUN"
            {...register("mode")}
            className="mt-1"
          />
          <span>
            <span className="block font-medium text-text">Dry Run</span>
            <span className="text-sm text-muted">
              Default and safest option. Stops before the final Google Form submission.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-white p-4">
          <input
            type="radio"
            value="SUBMIT"
            {...register("mode")}
            className="mt-1"
          />
          <span>
            <span className="block font-medium text-text">Submit</span>
            <span className="text-sm text-muted">
              Executes the final submit step after validation and field entry.
            </span>
          </span>
        </label>
      </div>

      <label className="mt-4 flex items-center gap-3 text-sm text-text">
        <input type="checkbox" {...register("debug")} />
        Enable debug mode with visible browser slow motion
      </label>
    </div>
  );
}
