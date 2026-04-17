import type { UseFormRegister } from "react-hook-form";

import type { SubmissionFormValues } from "@/modules/submission/submission.types";

type ModeToggleProps = {
  register: UseFormRegister<SubmissionFormValues>;
};

export function ModeToggle({ register }: ModeToggleProps) {
  return (
    <div className="rounded-2xl border border-line bg-surface-alt p-4">
      <input type="hidden" value="SUBMIT" {...register("mode")} />
      <p className="text-sm font-semibold text-text">Execution Settings</p>
      <div className="mt-3 rounded-xl border border-line bg-white p-4 text-sm text-muted">
        All runs now use the live submit flow. Final Google Form submission is
        always executed after validation and field entry.
      </div>

      <label className="mt-4 flex items-center gap-3 text-sm text-text">
        <input type="checkbox" {...register("debug")} />
        Enable debug mode with visible browser slow motion
      </label>
    </div>
  );
}
