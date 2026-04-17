import type { SubmissionSummaryItem } from "@/modules/submission/submission.types";

type PreviewDialogProps = {
  open: boolean;
  items: SubmissionSummaryItem[];
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
};

export function PreviewDialog({
  open,
  items,
  onClose,
  onConfirm,
  busy
}: PreviewDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted">
              Preview
            </p>
            <h3 className="mt-1 text-lg font-semibold text-text">Review Before Submit</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line px-3 py-1.5 text-sm text-text"
          >
            Close
          </button>
        </div>

        <div className="mt-6 divide-y divide-line rounded-2xl border border-line">
          {items.map((item) => (
            <div
              key={item.label}
              className="grid gap-2 px-4 py-3 md:grid-cols-[220px_1fr]"
            >
              <p className="text-sm font-medium text-muted">{item.label}</p>
              <p className="text-sm text-text">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-text"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            {busy ? "Starting..." : "Confirm and Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
