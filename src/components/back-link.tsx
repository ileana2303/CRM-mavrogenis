import Link from "next/link";
import { el } from "@/lib/i18n/el";

/**
 * «Πίσω» = go UP to the parent screen (`href`), never browser-history back:
 * after /customers/x/edit → Άκυρο → /customers/x, «Πίσω» must lead to /customers, not back into the edit form.
 * Each page passes its parent; the customer hub passes the last search (/customers?q=…) so the list is restored.
 */
export function BackLink({ href, label }: { href: string; label?: string }) {
  return (
    <Link href={href} className="btn-ghost -ml-3 self-start text-brand-700">
      {label ?? el.app.back}
    </Link>
  );
}
