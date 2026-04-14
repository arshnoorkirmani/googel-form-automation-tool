type RuntimeStateCardProps = {
  eyebrow: string;
  title: string;
  message: string;
};

export function RuntimeStateCard({
  eyebrow,
  title,
  message
}: RuntimeStateCardProps) {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-panel">
      <p className="text-xs uppercase tracking-[0.18em] text-amber-800">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-xl font-semibold text-amber-950">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm text-amber-900">{message}</p>
    </section>
  );
}
