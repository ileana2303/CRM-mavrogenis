"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { el } from "@/lib/i18n/el";
import type { Session } from "@/server/auth/jwt";
import { logoutAction } from "@/app/(auth)/login/actions";
import { NavLinks } from "./nav-links";
import { PwaRegister } from "./pwa-register";
import { Icon } from "./icons";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`leading-tight font-extrabold tracking-tight text-brand-700 ${compact ? "text-base" : "text-2xl"}`}>
      <span className="block">{el.app.brand1}</span>
      <span className="block text-accent-600">{el.app.brand2}</span>
    </div>
  );
}

const STORAGE_KEY = "de-crm.sidebar";

/**
 * Tablet/desktop shell with a toggleable sidebar (full 240px ↔ 88px icon rail).
 * Default: collapsed below 1024px (iPad Air 11" portrait), expanded from 1024px (iPad Air 13").
 * The choice is remembered per device in localStorage.
 */
export function AppShell({ session, children }: { session: Session; children: ReactNode }) {
  const roleLabel = el.enums.role[session.role];
  const [collapsed, setCollapsed] = useState(false);
  const today = new Date().toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "collapsed" || saved === "expanded") setCollapsed(saved === "collapsed");
      else setCollapsed(window.innerWidth < 1024);
    } catch {
      setCollapsed(window.innerWidth < 1024);
    }
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "collapsed" : "expanded");
      } catch {
        /* private mode etc. */
      }
      return next;
    });
  };

  return (
    <div className={`min-h-dvh md:grid transition-[grid-template-columns] duration-200 ${collapsed ? "md:grid-cols-[88px_1fr]" : "md:grid-cols-[240px_1fr]"}`}>
      <aside className={`hidden md:flex flex-col gap-5 glass border-y-0 border-l-0 border-r border-r-white/70 sticky top-0 h-dvh ${collapsed ? "items-center px-2 py-5" : "p-5"}`}>
        {/* same header height in both states so the menu never moves */}
        <div className={`flex items-center h-11 w-full ${collapsed ? "justify-center" : "justify-end"}`}>
          <button
            type="button"
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-label={collapsed ? el.app.expandMenu : el.app.collapseMenu}
            title={collapsed ? el.app.expandMenu : el.app.collapseMenu}
            className="btn-ghost min-h-11 min-w-11 px-0 text-brand-700"
          >
            {collapsed ? <Icon.chevronsRight size={20} /> : <Icon.chevronsLeft size={20} />}
          </button>
        </div>

        <NavLinks role={session.role} variant="side" compact={collapsed} />

        <form action={logoutAction} className="mt-auto w-full">
          <button className={`btn-ghost w-full text-[var(--muted)] hover:text-brand-700 ${collapsed ? "justify-center px-0" : "justify-start"}`} title={el.app.logout} aria-label={el.app.logout}>
            <Icon.logout size={20} />
            {!collapsed && <span>{el.app.logout}</span>}
          </button>
        </form>
      </aside>

      <div className="flex flex-col min-h-dvh min-w-0">
        {/* phone header */}
        <header className="md:hidden sticky top-0 z-20 glass border-x-0 border-t-0 px-4 py-2 flex items-center justify-between">
          <Brand compact />
          <div className="text-right text-xs leading-tight">
            <div className="text-[var(--muted)]">{roleLabel}</div>
            <div className="font-semibold">{session.fullName}</div>
          </div>
          <form action={logoutAction}>
            <button className="btn-ghost min-h-9 px-2" title={el.app.logout} aria-label={el.app.logout}>
              <Icon.logout size={18} />
            </button>
          </form>
        </header>

        {/* tablet/desktop top bar: fixed height in both sidebar states */}
        <header className="hidden md:flex sticky top-0 z-20 glass border-x-0 border-t-0 px-6 h-16 items-center justify-between text-sm">
          <span className="text-[var(--muted)] capitalize truncate">{today}</span>
          <div className="flex items-center gap-3">
            <div className="text-right leading-tight">
              <div className="font-semibold">{session.fullName}</div>
              <div className="text-xs text-[var(--muted)]">{roleLabel}</div>
            </div>
            <div className="avatar" aria-hidden>
              {initials(session.fullName)}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-4 md:px-6 md:py-5 lg:px-8 lg:py-6 max-w-6xl w-full mx-auto pb-24 md:pb-8">{children}</main>

        <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 glass border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)]">
          <NavLinks role={session.role} variant="bottom" />
        </nav>
      </div>
      <PwaRegister />
    </div>
  );
}

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6">
      <Link href="/" className="mb-8">
        <Brand />
      </Link>
      {children}
      <PwaRegister />
    </div>
  );
}
