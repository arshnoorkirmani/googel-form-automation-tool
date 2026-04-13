import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:flex">
      <Sidebar />
      <main className="min-h-screen flex-1">
        <div className="border-b border-line bg-white/70 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted">
                Local Internal Tool
              </p>
              <h2 className="mt-1 text-lg font-semibold text-text">
                Restricted Google Form Automation
              </h2>
            </div>
            <div className="rounded-full border border-line bg-surface-alt px-3 py-1 text-xs text-muted">
              Windows Local Only
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
