import Link from "next/link";
import { el } from "@/lib/i18n/el";

export default function NotFound() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold text-brand-800">{el.app.notFound}</h1>
      <Link href="/dashboard" className="btn-primary">
        {el.nav.daily}
      </Link>
    </div>
  );
}
