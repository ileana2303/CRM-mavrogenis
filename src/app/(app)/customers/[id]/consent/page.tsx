import { notFound } from "next/navigation";
import { BackLink, Card, DoctorLine, Field, Notice, PageTitle } from "@/components/ui";
import { SignaturePad } from "@/components/signature-pad";
import { el } from "@/lib/i18n/el";
import { fmtDateTime } from "@/lib/format";
import { doctorFullName, getConsent, getDoctor } from "@/server/services/customer-service";
import { userName } from "@/server/services/auth-service";
import { saveConsentAction } from "../../actions";

export const metadata = { title: el.consent.title };

export default async function ConsentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const doctor = await getDoctor(id);
  if (!doctor) notFound();
  const existing = await getConsent(id);
  const signedBy = existing ? await userName(existing.byUserId) : null;

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <BackLink href={`/customers/${id}`} />
      <PageTitle>{el.consent.title}</PageTitle>
      <DoctorLine name={doctorFullName(doctor)} />

      {existing && (
        <Card>
          <Notice tone="green">
            {el.customer.consentSigned}: {fmtDateTime(existing.signedAt)} {el.consent.by} {signedBy} · {existing.signerName}
          </Notice>
          <div className="mt-3 flex items-start gap-4">
            <img src={existing.signaturePng} alt="Υπογραφή" className="h-24 border border-[var(--line)] rounded-lg bg-white" />
            <ul className="text-sm text-[var(--muted)]">
              <li>{el.consent.email}: {existing.channels.email ? el.app.yes : el.app.no}</li>
              <li>{el.consent.sms}: {existing.channels.sms ? el.app.yes : el.app.no}</li>
              <li>{el.consent.phone}: {existing.channels.phone ? el.app.yes : el.app.no}</li>
              <li>{el.consent.viber}: {existing.channels.viber ? el.app.yes : el.app.no}</li>
            </ul>
          </div>
        </Card>
      )}

      <form action={saveConsentAction} className="card p-4 flex flex-col gap-4">
        <input type="hidden" name="doctorId" value={id} />
        <p className="text-sm text-[var(--muted)]">{el.consent.gdprText}</p>
        <Field label={el.consent.signerName} required>
          <input name="signerName" className="input" defaultValue={existing?.signerName ?? doctorFullName(doctor)} />
        </Field>
        <Field label={el.consent.signature} required>
          <SignaturePad name="signature" />
        </Field>
        {error === "signature" && <Notice tone="red">{el.consent.noSignature}</Notice>}
        <fieldset>
          <legend className="label">{el.consent.channels}</legend>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["ch_email", el.consent.email, existing?.channels.email ?? true],
                ["ch_sms", el.consent.sms, existing?.channels.sms ?? false],
                ["ch_phone", el.consent.phone, existing?.channels.phone ?? true],
                ["ch_viber", el.consent.viber, existing?.channels.viber ?? false],
              ] as const
            ).map(([n, l, def]) => (
              <label key={n} className="chip">
                <input type="checkbox" name={n} defaultChecked={def} />
                <span>{l}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex justify-end">
          <button className="btn-primary">{el.app.save}</button>
        </div>
      </form>
    </div>
  );
}
