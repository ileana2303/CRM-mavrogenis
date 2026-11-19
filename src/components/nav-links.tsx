"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { el } from "@/lib/i18n/el";
import type { Role } from "@/server/domain/types";
import { Icon, type IconName } from "./icons";

interface Item {
  href: string;
  label: string;
  icon: IconName;
  match: (p: string) => boolean;
}

export function NavLinks({ role, variant, compact = false }: { role: Role; variant: "side" | "bottom"; compact?: boolean }) {
  const pathname = usePathname();
  const items: Item[] = [];

  if (role !== "SUPPORT") {
    items.push({ href: "/dashboard", label: el.nav.daily, icon: "calendar", match: (p) => p.startsWith("/dashboard") });    // «Πελάτης» covers search, create and every customer screen (hub + tabs)
    items.push({ href: "/customers", label: el.nav.customer, icon: "search", match: (p) => p.startsWith("/customers") });
    items.push({ href: "/kpis", label: el.nav.kpis, icon: "trending", match: (p) => p.startsWith("/kpis") });
  }
  if (role === "MANAGER") {
    items.push({ href: "/manager/check-ins", label: el.nav.manager, icon: "users", match: (p) => p.startsWith("/manager") });
  }
  if (role === "SUPPORT" || role === "MANAGER") {
    items.push({ href: "/support/requests", label: el.nav.support, icon: "inbox", match: (p) => p.startsWith("/support") });
  }

  if (variant === "side") {
    // compact (collapsed rail): icon + tiny label stacked; expanded: icon + label in a row
    return (
      <nav className="flex flex-col gap-1 w-full">
        {items.map((it) => {
          const active = it.match(pathname);
          const Ic = Icon[it.icon];
          return compact ? (
            // same 48px row height and 22px icon as the expanded state → icons never move vertically on toggle
            <Link key={it.label} href={it.href} title={it.label} aria-label={it.label} className={`nav-item justify-center w-12 h-12 min-h-12 px-0 mx-auto ${active ? "nav-item-active" : ""}`}>
              <Ic size={22} className="shrink-0" />
            </Link>
          ) : (
            // one line always: while the rail widens (88→240px) the label is clipped, never wrapped
            <Link key={it.label} href={it.href} className={`nav-item h-12 overflow-hidden ${active ? "nav-item-active" : ""}`}>
              <Ic size={22} className="shrink-0" />
              <span className="nav-label whitespace-nowrap">{it.label}</span>
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
              {(() => {
                const Ic = Icon[it.icon];
                return <Ic size={22} />;
              })()}
              <span className="px-1">{it.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
