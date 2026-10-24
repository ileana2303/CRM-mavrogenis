import Link from "next/link";
import { BackLink, Card, Field, PageTitle } from "@/components/ui";
import { el } from "@/lib/i18n/el";

export const metadata = { title: el.customer.title };

export default function CustomerSearchPage() {
  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <BackLink href="/dashboard" />
      <PageTitle>{el.customer.searchExisting}</PageTitle>
      <form action="/customers/results" method="get" className="card p-4 flex flex-col gap-3">
        <p className="text-sm font-semibold text-[var(--muted)]">{el.customer.searchFields}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={el.customer.firstName} required>
            <input name="firstName" className="input" autoComplete="off" />
          </Field>
          <Field label={el.customer.lastName} required>
            <input name="lastName" className="input" autoComplete="off" />
          </Field>
          <Field label={el.customer.afm} required>
            <input name="afm" className="input" inputMode="numeric" autoComplete="off" />
          </Field>
          <Field label={`${el.customer.mobile} Τηλ.`} required>
            <input name="mobile" className="input" inputMode="tel" autoComplete="off" />
          </Field>
        </div>
        <p className="text-xs text-[var(--muted)]">* Συμπληρώστε τουλάχιστον ένα πεδίο.</p>
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button className="btn-primary">{el.app.search}</button>
        </div>
      </form>
      <Card>
        <p className="text-sm text-[var(--muted)] mb-3">{el.customer.createEdit}</p>
        <Link href="/customers/new" className="btn-secondary w-full sm:w-auto">
          {el.customer.createNew}
        </Link>
      </Card>
    </div>
  );
}
