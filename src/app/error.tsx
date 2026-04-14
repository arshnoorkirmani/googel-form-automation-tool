"use client";

type RootErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function RootErrorPage({
  error,
  reset
}: RootErrorPageProps) {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-panel">
        <p className="text-xs uppercase tracking-[0.18em] text-amber-800">
          Runtime Error
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">
          This page is temporarily unavailable
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-amber-900">
          {error.message ||
            "The app hit an unexpected runtime problem while loading this page."}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Retry Page
          </button>
          <a
            href="/dashboard"
            className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium text-text"
          >
            Go to Dashboard
          </a>
        </div>
      </section>
    </div>
  );
}
