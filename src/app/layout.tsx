import type { Metadata } from "next";
import Link from "next/link";
import { MobileNav } from "@/components/MobileNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mission Control",
  description: "Home for custom tooling",
};

const nav = [
  { href: "/", label: "Home" },
  { href: "/projects", label: "Projects" },
  { href: "/tools/task-center", label: "Task Center" },
  { href: "/tools/system-overview", label: "System Nodes" },
  { href: "/tools/release-radar", label: "Release Radar" },
  { href: "/tools/secrets-doctor", label: "Secrets Doctor" },
  { href: "/tools/testflight-qa", label: "TestFlight QA" },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="overflow-x-hidden">
        <div className="min-h-screen">
          <header className="sticky top-0 z-20 border-b border-black/5 bg-white/80 backdrop-blur-xl">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-6">
              <div>
                <h1 className="text-xl font-semibold tracking-tight">Mission Control</h1>
                <p className="text-xs text-black/50">Copyshop workflow cockpit</p>
              </div>
              <nav className="hidden md:flex flex-wrap gap-1.5 rounded-2xl border border-black/5 bg-black/[0.03] p-1">
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-xl px-3 py-1.5 text-sm text-black/70 transition hover:bg-white hover:text-black"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <MobileNav nav={nav} />
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-5 py-8 md:px-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
