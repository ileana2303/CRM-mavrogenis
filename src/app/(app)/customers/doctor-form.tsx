import Link from "next/link";
import {
  BackLink,
  Field,
  Notice,
  PageTitle,
  Radios,
  entries,
} from "@/components/ui";
import { el } from "@/lib/i18n/el";
import type { Doctor, Hospital } from "@/server/domain/types";
import { saveDoctorAction, saveDoctorThenConsentAction } from "./actions";
import { Select } from "@/components/select";

export function DoctorForm({
  doctor,
  hospitals,
  title,
  backHref,
}: {
  doctor?: Doctor;
  hospitals: Hospital[];
  title: string;
  backHref: string;
}) {
  // master list + any linked hospital that is not in the list (inactive etc.)
  const options: Hospital[] = [...hospitals];
  for (const h of doctor?.hospitals ?? [])
    if (!options.some((o) => o.id === h.id)) options.push(h);
  const linked = new Set((doctor?.hospitals ?? []).map((h) => h.id));
  return (
    <form action={saveDoctorAction} className="flex flex-col gap-4">
      {doctor && <input type="hidden" name="id" value={doctor.id} />}
      <BackLink href={backHref} />
      {/* actions live in the title row (top right) so they are reachable without scrolling the form */}
      <PageTitle
        right={
          <div className="flex items-center gap-2 shrink-0">
            {doctor && (
              <Link href={`/customers/${doctor.id}`} className="btn-ghost">
                {el.app.cancel}
              </Link>
            )}
            <button formAction={saveDoctorThenConsentAction} className="btn-secondary">
              {el.customer.consent}
            </button>
            <button className="btn-primary">
              {el.app.save}
            </button>
          </div>
        }
      >
        {title}
      </PageTitle>

      <div className="card p-4 flex flex-col gap-4">
        <p className="text-sm font-semibold text-[var(--muted)]">
          {el.customer.doctorDetails}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={el.customer.firstName} required>
            <input
              name="firstName"
              className="input"
              defaultValue={doctor?.firstName}
              placeholder="Μαρία"
            />
          </Field>
          <Field label={el.customer.lastName} required>
            <input
              name="lastName"
              className="input"
              defaultValue={doctor?.lastName}
              placeholder="Ιωάννου"
            />
          </Field>
          <Field label={el.customer.mobile} required>
            <input
              name="mobile"
              className="input"
              inputMode="tel"
              defaultValue={doctor?.mobile}
              placeholder="69…"
            />
          </Field>
          <Field label={el.customer.email} required>
            <input
              name="email"
              type="email"
              className="input"
              defaultValue={doctor?.email}
              placeholder="m.ioannou@example.com"
            />
          </Field>
        </div>

        <Field label={el.customer.activityType} required>
          <Radios
            name="activityType"
            options={entries(el.enums.activityType)}
            defaultValue={doctor?.activityType}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field
            label={el.customer.clinicAddress}
            required
            className="sm:col-span-2"
          >
            <input
              name="clinicAddress"
              className="input"
              defaultValue={doctor?.clinicAddress}
              placeholder={el.customer.streetNumber}
            />
          </Field>
          <Field label={el.customer.city} required>
            <input
              name="city"
              className="input"
              defaultValue={doctor?.city}
              placeholder="Λιβαδειά"
            />
          </Field>
          <Field label={el.customer.postalCode} required>
            <input
              name="postalCode"
              className="input"
              inputMode="numeric"
              defaultValue={doctor?.postalCode}
              placeholder="32100"
            />
          </Field>
          <div className="sm:col-span-2">
            <span className="label">
              {el.customer.hospital}
              <span className="text-danger-500"> *</span>
            </span>
            {options.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                {el.customer.noHospitals}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {options.map((h) => (
                  <label key={h.id} className="chip">
                    <input
                      type="checkbox"
                      name="hospitalId"
                      value={h.id}
                      defaultChecked={linked.has(h.id)}
                    />
                    <input
                      type="hidden"
                      name={`hospitalName_${h.id}`}
                      value={h.name}
                    />
                    <span>{h.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <Field label={el.customer.afm} required>
            <input
              name="afm"
              className="input"
              inputMode="numeric"
              defaultValue={doctor?.afm}
              placeholder="0602…"
            />
          </Field>
          <Field label={el.customer.rank} required className="sm:col-span-2">
            <Select name="rank" defaultValue={doctor?.rank ?? ""} options={[{ value: "", label: el.customer.rankSelect }, ...entries(el.enums.rank).map(([v, l]) => ({ value: v, label: l }))]} />
          </Field>
        </div>

        <Notice tone="amber">{el.app.required}</Notice>
      </div>
    </form>
  );
}
