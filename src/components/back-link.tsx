"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { el } from "@/lib/i18n/el";

/**
 * «Πίσω» = browser history back (keeps the previous page's state, e.g. a search list).
 * The href is only used when there is no in-app history (deep link, fresh tab).
 */
export function BackLink({ href, label }: { href: string; label?: string }) {
  const router = useRouter();
  return (
    <Link
      href={href}
      className="btn-ghost -ml-3 self-start text-brand-700"
      onClick={(e) => {
        const sameOrigin = document.referrer === "" || document.referrer.startsWith(window.location.origin);
        if (window.history.length > 1 && sameOrigin) {
          e.preventDefault();
          router.back();
        }
      }}
    >
      {label ?? el.app.back}
    </Link>
  );
}
