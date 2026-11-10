"use client";

import Link from "next/link";
import { el } from "@/lib/i18n/el";

/** Shown instead of the blank Next.js crash screen; prints the server error message. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <h1 className="text-xl font-bold text-danger-600">{el.app.error}</h1>
      <div className="rounded-xl border border-red-200 bg-red-50 text-red-900 px-3 py-2 text-sm">
        <div className="font-semibold">{el.app.errorHint}</div>
        <pre className="mt-1 whitespace-pre-wrap text-xs font-mono">{error.message || error.digest || String(error)}</pre>
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn-primary" onClick={reset}>
          {el.app.retry}
        </button>
        <Link href="/dashboard" className="btn-secondary">
          {el.nav.daily}
        </Link>
      </div>
    </div>
  );
}
