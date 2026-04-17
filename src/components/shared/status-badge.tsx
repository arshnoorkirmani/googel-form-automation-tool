import { cn } from "@/lib/utils/cn";

type StatusBadgeProps = {
  status:
    | "VALID"
    | "MISSING"
    | "REAUTH_REQUIRED"
    | "FORBIDDEN"
    | "SETUP_IN_PROGRESS"
    | "PENDING"
    | "QUEUED"
    | "RUNNING"
    | "PAUSING"
    | "PAUSED"
    | "STOPPING"
    | "STOPPED"
    | "COMPLETED"
    | "SUCCEEDED"
    | "FAILED";
};

const statusStyles: Record<StatusBadgeProps["status"], string> = {
  VALID: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  MISSING: "bg-amber-50 text-amber-700 ring-amber-200",
  REAUTH_REQUIRED: "bg-amber-50 text-amber-700 ring-amber-200",
  FORBIDDEN: "bg-rose-50 text-rose-700 ring-rose-200",
  SETUP_IN_PROGRESS: "bg-sky-50 text-sky-700 ring-sky-200",
  PENDING: "bg-slate-100 text-slate-700 ring-slate-200",
  QUEUED: "bg-slate-100 text-slate-700 ring-slate-200",
  RUNNING: "bg-sky-50 text-sky-700 ring-sky-200",
  PAUSING: "bg-amber-50 text-amber-700 ring-amber-200",
  PAUSED: "bg-amber-50 text-amber-700 ring-amber-200",
  STOPPING: "bg-rose-50 text-rose-700 ring-rose-200",
  STOPPED: "bg-rose-50 text-rose-700 ring-rose-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  SUCCEEDED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  FAILED: "bg-rose-50 text-rose-700 ring-rose-200"
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        statusStyles[status]
      )}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
