"use client";

import { useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  RANDOM_CALL_STATUS_UI_LABEL,
  isRandomCallStatusSelection
} from "@/modules/submission/submission.support";
import type { BatchItemRecord, BatchRunRecord } from "@/server/runs/batch-store";
import type { RunRecord } from "@/server/runs/run-types";

type DateBucket = "today" | "yesterday" | "last7" | "older";

type OperationsHistoryViewProps = {
  submissions: RunRecord[];
  batchRuns: BatchRunRecord[];
  activeRuns?: RunRecord[];
  activeBatches?: BatchRunRecord[];
  showFilters?: boolean;
};

type SortDirection = "newest" | "oldest";
type PreviousFilter = "all" | DateBucket;

function getReferenceDate(value: {
  completedAt?: string;
  startedAt?: string;
  createdAt: string;
}): Date {
  return new Date(value.completedAt ?? value.startedAt ?? value.createdAt);
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function getDateBucket(dateValue: Date, now = new Date()): DateBucket {
  const diffDays = Math.floor(
    (startOfDay(now) - startOfDay(dateValue)) / (24 * 60 * 60 * 1000)
  );

  if (diffDays <= 0) {
    return "today";
  }

  if (diffDays === 1) {
    return "yesterday";
  }

  if (diffDays < 7) {
    return "last7";
  }

  return "older";
}

function formatDuration(durationMs?: number): string {
  if (!durationMs || durationMs <= 0) {
    return "-";
  }

  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

function formatTimestamp(value?: string): string {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
}

function formatBatchRowMessage(item: BatchItemRecord): string {
  if (item.status === "FAILED") {
    return item.errorMessage ?? "Failed";
  }

  if (item.status === "SUCCEEDED") {
    return item.confirmationMessage ?? "Completed";
  }

  if (item.status === "RUNNING") {
    return "Processing...";
  }

  return "-";
}

function sortByDirection<T extends { completedAt?: string; startedAt?: string; createdAt: string }>(
  items: T[],
  direction: SortDirection
): T[] {
  const sorted = [...items].sort((left, right) => {
    const leftStamp = getReferenceDate(left).getTime();
    const rightStamp = getReferenceDate(right).getTime();
    return rightStamp - leftStamp;
  });

  return direction === "newest" ? sorted : sorted.reverse();
}

function SubmissionTable({ submissions }: { submissions: RunRecord[] }) {
  if (submissions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface-alt p-5 text-sm text-muted">
        No submission records in this view.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-panel">
      <table className="min-w-full divide-y divide-line">
        <thead className="bg-surface-alt">
          <tr className="text-left text-xs uppercase tracking-[0.15em] text-muted">
            <th className="px-4 py-3">FO Number</th>
            <th className="px-4 py-3">Call Status</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Remarks</th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3">Duration</th>
            <th className="px-4 py-3">Error</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line text-sm text-text">
          {submissions.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3 font-medium">{row.foNumber}</td>
              <td className="px-4 py-3">{row.callStatus}</td>
              <td className="px-4 py-3">
                <StatusBadge status={row.status} />
              </td>
              <td className="max-w-[18rem] px-4 py-3 text-muted">{row.remarks}</td>
              <td className="px-4 py-3">{formatTimestamp(row.createdAt)}</td>
              <td className="px-4 py-3">{formatDuration(row.durationMs)}</td>
              <td className="max-w-[18rem] px-4 py-3 text-rose-700">
                {row.errorMessage ?? "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BatchRunList({ batchRuns }: { batchRuns: BatchRunRecord[] }) {
  if (batchRuns.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface-alt p-5 text-sm text-muted">
        No batch runs in this view.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {batchRuns.map((batchRun) => (
        <details
          key={batchRun.batchId}
          className="overflow-hidden rounded-2xl border border-line bg-surface shadow-panel"
        >
          <summary className="cursor-pointer list-none px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-text">
                  Batch {batchRun.batchId.slice(0, 12)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Call Status: {batchRun.submission.callStatus} · Rows:{" "}
                  {batchRun.totalRows} · Success: {batchRun.successCount} · Failed:{" "}
                  {batchRun.failedCount} · Pending: {batchRun.pendingCount}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Started: {formatTimestamp(batchRun.startedAt ?? batchRun.createdAt)} ·
                  Completed: {formatTimestamp(batchRun.completedAt)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={batchRun.status} />
                <span className="text-xs text-muted">
                  Duration: {formatDuration(batchRun.durationMs)}
                </span>
              </div>
            </div>
          </summary>

          <div className="border-t border-line px-5 py-4">
            <div
              className={`mb-4 grid gap-3 ${
                isRandomCallStatusSelection(batchRun.submission.callStatus)
                  ? "md:grid-cols-4"
                  : "md:grid-cols-3"
              }`}
            >
              <div className="rounded-xl border border-line bg-surface-alt px-4 py-3 text-sm">
                <p className="text-xs uppercase tracking-[0.15em] text-muted">OMC</p>
                <p className="mt-1 text-text">{batchRun.submission.omc || "-"}</p>
              </div>
              <div className="rounded-xl border border-line bg-surface-alt px-4 py-3 text-sm">
                <p className="text-xs uppercase tracking-[0.15em] text-muted">Execution</p>
                <p className="mt-1 text-text">Submit only</p>
              </div>
              <div className="rounded-xl border border-line bg-surface-alt px-4 py-3 text-sm">
                <p className="text-xs uppercase tracking-[0.15em] text-muted">Delay</p>
                <p className="mt-1 text-text">
                  {batchRun.submission.delaySeconds ?? 10} sec between forms
                </p>
              </div>
              {isRandomCallStatusSelection(batchRun.submission.callStatus) ? (
                <div className="rounded-xl border border-line bg-surface-alt px-4 py-3 text-sm">
                  <p className="text-xs uppercase tracking-[0.15em] text-muted">
                    Random Pool
                  </p>
                  <p className="mt-1 text-text">
                    {batchRun.submission.randomCallStatusPool?.join(", ") ||
                      "None selected"}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-xl border border-line">
              <table className="min-w-full divide-y divide-line">
                <thead className="bg-surface-alt">
                  <tr className="text-left text-xs uppercase tracking-[0.15em] text-muted">
                    <th className="px-4 py-3">FO Number</th>
                    <th className="px-4 py-3">Call Status</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Retry</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-4 py-3">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-sm text-text">
                  {batchRun.items.map((item) => (
                    <tr key={item.rowId}>
                      <td className="px-4 py-3 font-medium">{item.foNumber}</td>
                      <td className="px-4 py-3">
                        {item.callStatus ??
                          (isRandomCallStatusSelection(batchRun.submission.callStatus)
                            ? "Random from selected pool"
                            : batchRun.submission.callStatus)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3">{formatDuration(item.durationMs)}</td>
                      <td className="px-4 py-3">{item.retryCount}</td>
                      <td className="px-4 py-3">{formatTimestamp(item.updatedAt)}</td>
                      <td className="max-w-[20rem] px-4 py-3 text-muted">
                        {formatBatchRowMessage(item)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {batchRun.errorMessage ? (
              <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {batchRun.errorMessage}
              </p>
            ) : null}
          </div>
        </details>
      ))}
    </div>
  );
}

export function OperationsHistoryView({
  submissions,
  batchRuns,
  activeRuns = [],
  activeBatches = [],
  showFilters = true
}: OperationsHistoryViewProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [callStatusFilter, setCallStatusFilter] = useState<string>("all");
  const [previousFilter, setPreviousFilter] = useState<PreviousFilter>("all");
  const [sortDirection, setSortDirection] = useState<SortDirection>("newest");

  const activeRunIds = useMemo(() => new Set(activeRuns.map((run) => run.id)), [activeRuns]);
  const activeBatchIds = useMemo(
    () => new Set(activeBatches.map((batch) => batch.batchId)),
    [activeBatches]
  );

  const persistedSubmissions = useMemo(
    () => submissions.filter((run) => !activeRunIds.has(run.id)),
    [activeRunIds, submissions]
  );
  const persistedBatchRuns = useMemo(
    () => batchRuns.filter((batch) => !activeBatchIds.has(batch.batchId)),
    [activeBatchIds, batchRuns]
  );

  const callStatusOptions = useMemo(() => {
    const values = new Set<string>();
    for (const run of submissions) {
      values.add(run.callStatus);
    }
    for (const batch of batchRuns) {
      values.add(batch.submission.callStatus);
    }
    return [...values].sort((left, right) => left.localeCompare(right));
  }, [batchRuns, submissions]);

  const statusOptions = useMemo(() => {
    const values = new Set<string>();
    for (const run of submissions) {
      values.add(run.status);
    }
    for (const batch of batchRuns) {
      values.add(batch.status);
    }
    return [...values].sort((left, right) => left.localeCompare(right));
  }, [batchRuns, submissions]);

  const matchesCommonFilters = (
    status: string,
    callStatus: string
  ): boolean => {
    if (statusFilter !== "all" && statusFilter !== status) {
      return false;
    }

    if (callStatusFilter !== "all" && callStatusFilter !== callStatus) {
      return false;
    }

    return true;
  };

  const currentRuns = useMemo(
    () =>
      sortByDirection(
        activeRuns.filter((run) => matchesCommonFilters(run.status, run.callStatus)),
        sortDirection
      ),
    [activeRuns, sortDirection, statusFilter, callStatusFilter]
  );

  const currentBatches = useMemo(
    () =>
      sortByDirection(
        activeBatches.filter((batch) =>
          matchesCommonFilters(batch.status, batch.submission.callStatus)
        ),
        sortDirection
      ),
    [activeBatches, sortDirection, statusFilter, callStatusFilter]
  );

  const todaySubmissions = useMemo(
    () =>
      sortByDirection(
        persistedSubmissions.filter(
          (run) =>
            getDateBucket(getReferenceDate(run)) === "today" &&
            matchesCommonFilters(run.status, run.callStatus)
        ),
        sortDirection
      ),
    [persistedSubmissions, sortDirection, statusFilter, callStatusFilter]
  );

  const todayBatchRuns = useMemo(
    () =>
      sortByDirection(
        persistedBatchRuns.filter(
          (batch) =>
            getDateBucket(getReferenceDate(batch)) === "today" &&
            matchesCommonFilters(batch.status, batch.submission.callStatus)
        ),
        sortDirection
      ),
    [persistedBatchRuns, sortDirection, statusFilter, callStatusFilter]
  );

  const previousBuckets = useMemo(() => {
    const buckets: Record<DateBucket, { submissions: RunRecord[]; batchRuns: BatchRunRecord[] }> = {
      today: { submissions: [], batchRuns: [] },
      yesterday: { submissions: [], batchRuns: [] },
      last7: { submissions: [], batchRuns: [] },
      older: { submissions: [], batchRuns: [] }
    };

    for (const run of persistedSubmissions) {
      const bucket = getDateBucket(getReferenceDate(run));
      if (bucket === "today" || !matchesCommonFilters(run.status, run.callStatus)) {
        continue;
      }
      buckets[bucket].submissions.push(run);
    }

    for (const batch of persistedBatchRuns) {
      const bucket = getDateBucket(getReferenceDate(batch));
      if (
        bucket === "today" ||
        !matchesCommonFilters(batch.status, batch.submission.callStatus)
      ) {
        continue;
      }
      buckets[bucket].batchRuns.push(batch);
    }

    (["yesterday", "last7", "older"] as DateBucket[]).forEach((bucket) => {
      buckets[bucket].submissions = sortByDirection(
        buckets[bucket].submissions,
        sortDirection
      );
      buckets[bucket].batchRuns = sortByDirection(
        buckets[bucket].batchRuns,
        sortDirection
      );
    });

    return buckets;
  }, [persistedSubmissions, persistedBatchRuns, sortDirection, statusFilter, callStatusFilter]);

  const hasAnyData =
    submissions.length > 0 ||
    batchRuns.length > 0 ||
    activeRuns.length > 0 ||
    activeBatches.length > 0;

  if (!hasAnyData) {
    return (
      <EmptyState
        title="No operational history yet"
        description="Runs and batch activity will appear here once the automation starts processing forms."
      />
    );
  }

  return (
    <div className="space-y-6">
      {showFilters ? (
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-panel">
          <div className="grid gap-4 md:grid-cols-4">
            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.15em] text-muted">
                Status
              </span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-text"
              >
                <option value="all">All Statuses</option>
                {statusOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.15em] text-muted">
                Call Status
              </span>
              <select
                value={callStatusFilter}
                onChange={(event) => setCallStatusFilter(event.target.value)}
                className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-text"
              >
                <option value="all">All Call Statuses</option>
                {callStatusOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.15em] text-muted">
                Previous Range
              </span>
              <select
                value={previousFilter}
                onChange={(event) => setPreviousFilter(event.target.value as PreviousFilter)}
                className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-text"
              >
                <option value="all">All Previous</option>
                <option value="yesterday">Yesterday</option>
                <option value="last7">Last 7 Days</option>
                <option value="older">Older</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.15em] text-muted">
                Sort
              </span>
              <select
                value={sortDirection}
                onChange={(event) => setSortDirection(event.target.value as SortDirection)}
                className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-text"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </label>
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            Current Activity
          </p>
          <h2 className="mt-1 text-xl font-semibold text-text">Running Work</h2>
        </div>
        <SubmissionTable submissions={currentRuns} />
        <BatchRunList batchRuns={currentBatches} />
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Today</p>
          <h2 className="mt-1 text-xl font-semibold text-text">Today's Activity</h2>
        </div>
        <SubmissionTable submissions={todaySubmissions} />
        <BatchRunList batchRuns={todayBatchRuns} />
      </section>

      <section className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            Previous History
          </p>
          <h2 className="mt-1 text-xl font-semibold text-text">Older Activity</h2>
        </div>

        {(previousFilter === "all" || previousFilter === "yesterday") && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text">Yesterday</h3>
            <SubmissionTable submissions={previousBuckets.yesterday.submissions} />
            <BatchRunList batchRuns={previousBuckets.yesterday.batchRuns} />
          </div>
        )}

        {(previousFilter === "all" || previousFilter === "last7") && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text">Last 7 Days</h3>
            <SubmissionTable submissions={previousBuckets.last7.submissions} />
            <BatchRunList batchRuns={previousBuckets.last7.batchRuns} />
          </div>
        )}

        {(previousFilter === "all" || previousFilter === "older") && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text">Older</h3>
            <SubmissionTable submissions={previousBuckets.older.submissions} />
            <BatchRunList batchRuns={previousBuckets.older.batchRuns} />
          </div>
        )}
      </section>
    </div>
  );
}
