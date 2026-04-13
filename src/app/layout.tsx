import type { Metadata } from "next";

import "@/app/globals.css";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Dispositions Form Automation",
  description: "Internal local automation tool for restricted Google Forms"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans text-sm antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
