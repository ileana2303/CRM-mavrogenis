import Link from "next/link";
import { Field, Notice, Radios, entries } from "@/components/ui";
import { el } from "@/lib/i18n/el";
import type { Doctor } from "@/server/domain/types";
import { saveDoctorAction } from "./actions";

export function DoctorForm({ doctor }: { doctor?: Doctor }) {
  return (
    <form action={saveDoctorAction} className="card p-4 flex flex-col gap-4">
      {doctor && <input type="hidden" name="id" value={doctor.id} />}
      <p className="text-sm font-semibold text-[var(--muted)]">{el.customer.doctorDetails}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label={el.customer.firstName} required>
          <input name="firstName" className="input" defaultValue={doctor?.firstName} placeholder="Μαρία" />
        </Field>
        <Field label={el.customer.lastName} required>
          <input name="lastName" className="input" defaultValue={doctor?.lastName} placeholder="Ιωάννου" />
        </Field>
        <Field label={el.customer.mobile} required>
          <input name="mobile" className="input" inputMode="tel" defaultValue={doctor?.mobile} placeholder="69…" />
        </Field>
        <Field label={el.customer.email} required>
          <input name="email" type="email" className="input" defaultValue={doctor?.email} placeholder="m.ioannou@example.com" />
        </Field>
      </div>

      <Field label={el.customer.activityType} required>
        <Radios name="activityType" options={entries(el.enums.activityType)} defaultValue={doctor?.activityType} />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label={el.customer.clinicAddress} required className="sm:col-span-2">
          <input name="clinicAddress" className="input" defaultValue={doctor?.clinicAddress} placeholder={el.customer.streetNumber} />
        </Field>
        <Field label={el.customer.city} required>
          <input name="city" className="input" defaultValue={doctor?.city} placeholder="Λιβαδειά" />
        </Field>
        <Field label={el.customer.postalCode} required>
          <input name="postalCode" className="input" inputMode="numeric" defaultValue={doctor?.postalCode} placeholder="32100" />
        </Field>
        <Field label={el.customer.hospital} required>
          <input name="hospital" className="input" defaultValue={doctor?.hospital} />
        </Field>
        <Field label={el.customer.afm} required>
          <input name="afm" className="input" inputMode="numeric" defaultValue={doctor?.afm} placeholder="0602…" />
        </Field>
        <Field label={el.customer.rank} required className="sm:col-span-2">
          <select name="rank" className="input" defaultValue={doctor?.rank ?? ""}>
            <option value="">{el.customer.rankSelect}</option>
            {entries(el.enums.rank).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Notice tone="amber">{el.app.required}</Notice>

      <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
        {doctor && (
          <Link href={`/customers/${doctor.id}`} className="btn-ghost">
            {el.app.cancel}
          </Link>
        )}
        <button name="intent" value="consent" className="btn-secondary">
          {el.customer.consent}
        </button>
        <button name="intent" value="save" className="btn-primary">
          {el.app.save}
        </button>
      </div>
    </form>
  );
}
