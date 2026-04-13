export const dynamic = "force-dynamic";

import { EmptyState } from "@/components/shared/empty-state";

export default function BatchPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-surface p-6 shadow-panel">
        <p className="text-xs uppercase tracking-[0.18em] text-muted">
          Future Ready
        </p>
        <h2 className="mt-1 text-xl font-semibold text-text">Batch Upload</h2>
        <p className="mt-3 max-w-3xl text-sm text-muted">
          The architecture is already prepared for batch processing up to 50 rows
          with continue-on-error behavior. Google Sheet integration is intentionally
          deferred until after the single-submission MVP is stabilized.
        </p>
      </section>

      <EmptyState
        title="Batch automation is scaffolded, not enabled"
        description="This screen reserves the workflow for future CSV or Google Sheet ingestion without complicating the initial operator experience."
      />
    </div>
  );
}
