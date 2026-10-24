import Link from "next/link";
import type { ReactNode } from "react";
import { el } from "@/lib/i18n/el";
import type { Session } from "@/server/auth/jwt";
import { logoutAction } from "@/app/(auth)/login/actions";
import { NavLinks } from "./nav-links";
import { PwaRegister } from "./pwa-register";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`leading-tight font-extrabold tracking-tight text-brand-700 ${compact ? "text-base" : "text-2xl"}`}>
      <span className="block">{el.app.brand1}</span>
      <span className="block text-accent-600">{el.app.brand2}</span>
    </div>
  );
}

export function AppShell({ session, lastDoctorId, children }: { session: Session; lastDoctorId?: string; children: ReactNode }) {
  const roleLabel = el.enums.role[session.role];
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr]">
      <aside className="hidden md:flex flex-col gap-6 bg-white border-r border-[var(--line)] p-5 sticky top-0 h-dvh">
        <Brand />
        <div className="text-sm">
          <div className="text-[var(--muted)]">{roleLabel}</div>
          <div className="font-semibold">{session.fullName}</div>
        </div>
        <NavLinks role={session.role} lastDoctorId={lastDoctorId} variant="side" />
        <form action={logoutAction} className="mt-auto">
          <button className="btn-ghost w-full justify-start">{el.app.logout}</button>
        </form>
      </aside>

      <div className="flex flex-col min-h-dvh">
        <header className="md:hidden sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-[var(--line)] px-4 py-2 flex items-center justify-between">
          <Brand compact />
          <div className="text-right text-xs leading-tight">
            <div className="text-[var(--muted)]">{roleLabel}</div>
            <div className="font-semibold">{session.fullName}</div>
          </div>
          <form action={logoutAction}>
            <button className="btn-ghost min-h-9 px-2 text-xs" title={el.app.logout} aria-label={el.app.logout}>
              ⎋
            </button>
          </form>
        </header>

        <main className="flex-1 px-4 py-4 md:px-8 md:py-6 max-w-6xl w-full mx-auto pb-24 md:pb-8">{children}</main>

        <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-[var(--line)] pb-[env(safe-area-inset-bottom)]">
          <NavLinks role={session.role} lastDoctorId={lastDoctorId} variant="bottom" />
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
