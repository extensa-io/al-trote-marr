"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: ReadonlyArray<{ href: string; label: string; match: (p: string) => boolean }> = [
  { href: "/", label: "Today", match: (p) => p === "/" },
  { href: "/plan", label: "Plan", match: (p) => p === "/plan" || p.startsWith("/plan/") },
  { href: "/dashboard", label: "Dashboard", match: (p) => p === "/dashboard" },
];

export default function TabBar() {
  const pathname = usePathname() ?? "/";
  if (pathname === "/signin") return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 inset-x-0 border-t border-line bg-field/95 backdrop-blur supports-[backdrop-filter]:bg-field/80 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="max-w-md mx-auto flex">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`block text-center py-3 font-display uppercase tracking-wider text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brass ${
                  active ? "text-brass" : "text-canvas-dim hover:text-canvas"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
