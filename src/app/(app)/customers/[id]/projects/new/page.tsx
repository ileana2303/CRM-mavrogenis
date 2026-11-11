import { notFound } from "next/navigation";
import { BackLink, DoctorLine, Field, PageTitle, optionsFrom } from "@/components/ui";
import { LinesEditor } from "@/components/lines-editor";
import { el } from "@/lib/i18n/el";
import { Select } from "@/components/select";
import { doctorFullName, getDoctor } from "@/server/services/customer-service";
import { listProducts } from "@/server/services/project-service";
import { createProjectAction, createProjectRequestOfferAction } from "../actions";
import { SOON } from "@/lib/features";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: el.projects.newTitle };

export default async function NewProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (SOON.projects) return <ComingSoon title={metadata.title} backHref={`/customers/${id}`} />;
  const doctor = await getDoctor(id);
  if (!doctor) notFound();
  const products = await listProducts();

  return (
    <form action={createProjectAction} className="flex flex-col gap-4">
      <input type="hidden" name="doctorId" value={id} />
      <BackLink href={`/customers/${id}/projects`} />
      <PageTitle>{el.projects.newTitle}</PageTitle>
      <DoctorLine name={doctorFullName(doctor)} />

      <div className="card p-4 grid gap-4 sm:grid-cols-2">
        <Field label={el.projects.description} required>
          <Select name="type" defaultValue="REPLACEMENT" options={optionsFrom(el.enums.projectType)} />
        </Field>
        <Field label={el.projects.titleLabel}>
          <input name="title" className="input" placeholder={el.projects.titlePlaceholder} />
        </Field>
      </div>

      <div>
        <p className="label">{el.projects.lines}</p>
        <LinesEditor products={products} />
      </div>

      <Field label={el.projects.notes}>
        <textarea name="notes" className="input" rows={3} placeholder={el.projects.notesPlaceholder} />
      </Field>

      <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
        <button className="btn-secondary">
          {el.projects.saveDraft}
        </button>
        <button formAction={createProjectRequestOfferAction} className="btn-primary">
          {el.projects.requestOffer}
        </button>
      </div>
    </form>
  );
}
