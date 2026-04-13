type RunSummaryCardProps = {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
};

const tones: Record<NonNullable<RunSummaryCardProps["tone"]>, string> = {
  default: "from-slate-50 to-white",
  success: "from-emerald-50 to-white",
  danger: "from-rose-50 to-white"
};

export function RunSummaryCard({
  label,
  value,
  tone = "default"
}: RunSummaryCardProps) {
  return (
    <div
      className={`rounded-2xl border border-line bg-gradient-to-br ${tones[tone]} p-5 shadow-panel`}
    >
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-text">{value}</p>
    </div>
  );
}
