"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SIDEBAR_COOKIE } from "@/lib/constants";
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

function remember(collapsed: boolean) {
  const v = collapsed ? "collapsed" : "expanded";
  document.cookie = `${SIDEBAR_COOKIE}=${v}; path=/; max-age=31536000; samesite=lax`;
  try {
    localStorage.setItem(STORAGE_KEY, v);
  } catch {
    /* private mode etc. */
  }
}

/**
 * Tablet/desktop shell with a toggleable sidebar (full 240px ↔ 88px icon rail).
 * Default: collapsed below 1024px (iPad Air 11" portrait), expanded from 1024px (iPad Air 13").
 * The choice is remembered per device in a cookie (server-rendered) – `initialCollapsed` comes from it.
 */
export function AppShell({ session, initialCollapsed, children }: { session: Session; initialCollapsed: boolean | null; children: ReactNode }) {
  const roleLabel = el.enums.role[session.role];
  const [collapsed, setCollapsed] = useState(initialCollapsed ?? false);
  const today = new Date().toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // no cookie yet: take the old localStorage choice (one-time migration) or the screen-width default
  useEffect(() => {
    if (initialCollapsed !== null) return;
    let next = window.innerWidth < 1024;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "collapsed" || saved === "expanded") next = saved === "collapsed";
    } catch {
      /* ignore */
    }
    setCollapsed(next);
    remember(next);
  }, [initialCollapsed]);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    remember(next);
  };

  return (
    <div className={`min-h-dvh md:grid transition-[grid-template-columns] duration-200 ${collapsed ? "md:grid-cols-[88px_1fr]" : "md:grid-cols-[240px_1fr]"}`}>
      <aside className={`hidden md:flex flex-col gap-5 glass border-y-0 border-l-0 border-r border-r-white/70 sticky top-0 h-dvh overflow-x-hidden ${collapsed ? "items-center px-2 py-5" : "p-5"}`}>
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

      </aside>

      <div className="flex flex-col min-h-dvh min-w-0">
        {/* phone header */}
        <header className="md:hidden sticky top-0 z-20 glass border-x-0 border-t-0 px-4 py-2 flex items-center justify-between">
          <Brand compact />
          <UserMenu name={session.fullName} role={roleLabel} compact />
        </header>

        {/* tablet/desktop top bar: fixed height in both sidebar states */}
        <header className="hidden md:flex sticky top-0 z-20 glass border-x-0 border-t-0 px-6 h-16 items-center justify-between text-sm">
          <span className="text-[var(--muted)] capitalize truncate">{today}</span>
          <UserMenu name={session.fullName} role={roleLabel} />
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

/** Name + avatar in the top bar; opens a small menu with the account info and «Αποσύνδεση». */
function UserMenu({ name, role, compact = false }: { name: string; role: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-3 rounded-2xl pl-3 pr-1.5 py-1 min-h-11 transition-colors hover:bg-white/70 ${open ? "bg-white/80" : ""}`}
      >
        <span className="text-right leading-tight">
          <span className={`block font-semibold ${compact ? "text-xs" : "text-sm"}`}>{name}</span>
          <span className="block text-xs text-[var(--muted)]">{role}</span>
        </span>
        <span className="avatar" aria-hidden>
          {initials(name)}
        </span>
        <Icon.chevronDown size={16} className={`text-[var(--muted)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full mt-2 w-64 z-50 rounded-2xl border border-[var(--line)] bg-white/95 backdrop-blur-xl p-2 shadow-[0_18px_40px_-16px_rgba(16,36,70,0.45)]">
          <div className="flex items-center gap-3 px-2 py-2">
            <span className="avatar shrink-0" aria-hidden>
              {initials(name)}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block font-semibold truncate">{name}</span>
              <span className="block text-xs text-[var(--muted)]">{role}</span>
            </span>
          </div>
          <div className="h-px bg-[var(--line)] my-1.5" />
          <form action={logoutAction}>
            <button role="menuitem" className="w-full flex items-center gap-3 min-h-11 px-3 rounded-xl text-left font-medium text-danger-500 hover:bg-red-50">
              <Icon.logout size={18} />
              {el.app.logout}
            </button>
          </form>
        </div>
      )}
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
