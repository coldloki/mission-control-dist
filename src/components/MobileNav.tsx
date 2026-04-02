"use client";

import { useState } from "react";
import Link from "next/link";

type NavItem = { href: string; label: string };

export function MobileNav({ nav }: { nav: NavItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-1.5 text-sm text-black/70"
        aria-label="Toggle menu"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {open ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
        Menu
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 rounded-2xl border border-black/10 bg-white shadow-xl p-2 min-w-[180px]">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm text-black/70 hover:bg-black/[0.05] transition"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
