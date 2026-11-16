import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink, DoctorLine, Field, PageTitle } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { el } from "@/lib/i18n/el";
import { Select } from "@/components/select";
import { doctorFullName, getDoctor } from "@/server/services/customer-service";
import { projectLookups } from "@/server/services/project-service";
import { createS1ProjectAction } from "../actions";
import { SOON } from "@/lib/features";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: el.projects.newTitle };

/**
 * «Νέο Project» → PRJC in SoftOne (NAME, TRDR, PRJCATEGORY, PRJSTATE, REMARKS, SALESMAN = logged-in PRSN).
 * Offer lines / «Αίτημα Προσφοράς» come with the offer step (SALDOC 7015), not here.
 */
export default async function NewProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (SOON.projectCreate) return <ComingSoon title={metadata.title} backHref={`/customers/${id}`} />;
  const [doctor, lookups] = await Promise.all([getDoctor(id), projectLookups()]);
  if (!doctor) notFound();
  const firstState = lookups.states[0]?.id ?? "";

  return (
    <ActionForm action={createS1ProjectAction} className="flex flex-col gap-4">
      <input type="hidden" name="doctorId" value={id} />
      <BackLink href={`/customers/${id}/projects`} />
      <PageTitle
        right={
          <div className="flex items-center gap-2 shrink-0">
            <Link href={`/customers/${id}/projects`} className="btn-ghost">
              {el.app.cancel}
            </Link>
            <button className="btn-primary">{el.app.save}</button>
          </div>
        }
      >
        {el.projects.newTitle}
      </PageTitle>
      <DoctorLine name={doctorFullName(doctor)} />

      <div className="card p-4 grid gap-4 sm:grid-cols-2">
        <Field label={el.projects.titleField} required className="sm:col-span-2">
          <input name="title" className="input" required maxLength={128} placeholder={el.projects.titlePlaceholder} />
        </Field>
        <Field label={el.projects.type} required>
          <Select
            name="categoryId"
            defaultValue=""
            placeholder={el.customer.rankSelect}
            options={lookups.categories.map((c) => ({ value: c.id, label: c.name }))}
          />
        </Field>
        <Field label={el.projects.stage} required>
          <Select name="stateId" defaultValue={firstState} options={lookups.states.map((s) => ({ value: s.id, label: s.name }))} />
        </Field>
        <Field label={el.projects.notesField} className="sm:col-span-2">
          <textarea name="notes" className="input" rows={3} placeholder={el.projects.notesPlaceholder} />
        </Field>
      </div>
    </ActionForm>
  );
}
