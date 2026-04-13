"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils/cn";

const navigationItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/submissions/new", label: "New Submission" },
  { href: "/batch", label: "Batch Upload" },
  { href: "/history", label: "History" },
  { href: "/data-management", label: "Data Management" },
  { href: "/settings", label: "Settings" }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-64 shrink-0 border-r border-line bg-slate-950 px-5 py-6 text-slate-100 lg:block">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
          Blackbuck Internal
        </p>
        <h1 className="mt-2 text-xl font-semibold">
          Dispositions Form Automation
        </h1>
      </div>

      <nav className="space-y-2">
        {navigationItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex rounded-xl px-3 py-2.5 transition",
                active
                  ? "bg-slate-100 text-slate-950"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
