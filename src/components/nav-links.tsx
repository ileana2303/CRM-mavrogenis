"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { el } from "@/lib/i18n/el";
import type { Role } from "@/server/domain/types";

interface Item {
  href: string;
  label: string;
  icon: string;
  match: (p: string) => boolean;
}

export function NavLinks({ role, lastDoctorId, variant }: { role: Role; lastDoctorId?: string; variant: "side" | "bottom" }) {
  const pathname = usePathname();
  const items: Item[] = [];

  if (role !== "SUPPORT") {
    items.push({ href: "/dashboard", label: el.nav.daily, icon: "📅", match: (p) => p.startsWith("/dashboard") });
    items.push({
      href: "/customers",
      label: el.nav.customer,
      icon: "🔎",
      match: (p) => p === "/customers" || p.startsWith("/customers/results") || p === "/customers/new",
    });
    items.push({
      href: lastDoctorId ? `/customers/${lastDoctorId}` : "/customers",
      label: el.nav.hub,
      icon: "🗂️",
      match: (p) => /^\/customers\/[^/]+(?!\/results)/.test(p) && p !== "/customers/new" && !p.startsWith("/customers/results"),
    });
    items.push({ href: "/kpis", label: el.nav.kpis, icon: "📈", match: (p) => p.startsWith("/kpis") });
  }
  if (role === "MANAGER") {
    items.push({ href: "/manager/check-ins", label: el.nav.manager, icon: "👥", match: (p) => p.startsWith("/manager") });
  }
  if (role === "SUPPORT" || role === "MANAGER") {
    items.push({ href: "/support/requests", label: el.nav.support, icon: "📨", match: (p) => p.startsWith("/support") });
  }

  if (variant === "side") {
    return (
      <nav className="flex flex-col gap-1">
        {items.map((it) => {
          const active = it.match(pathname);
          return (
            <Link
              key={it.label}
              href={it.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium ${active ? "bg-brand-600 text-white" : "text-brand-800 hover:bg-brand-50"}`}
            >
              <span aria-hidden>{it.icon}</span>
              {it.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <ul className={`grid`} style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))` }}>
      {items.map((it) => {
        const active = it.match(pathname);
        return (
          <li key={it.label}>
            <Link
              href={it.href}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 min-h-14 text-[11px] font-medium leading-tight text-center ${active ? "text-brand-700" : "text-[var(--muted)]"}`}
            >
              <span className={`text-lg ${active ? "" : "grayscale opacity-80"}`} aria-hidden>
                {it.icon}
              </span>
              <span className="px-1">{it.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
