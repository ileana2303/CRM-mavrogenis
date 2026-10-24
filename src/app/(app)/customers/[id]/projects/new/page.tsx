import { notFound } from "next/navigation";
import { BackLink, DoctorLine, Field, PageTitle, entries } from "@/components/ui";
import { LinesEditor } from "@/components/lines-editor";
import { el } from "@/lib/i18n/el";
import { doctorFullName, getDoctor } from "@/server/services/customer-service";
import { listProducts } from "@/server/services/project-service";
import { createProjectAction } from "../actions";

export const metadata = { title: el.projects.newTitle };

export default async function NewProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
          <select name="type" className="input" defaultValue="REPLACEMENT">
            {entries(el.enums.projectType).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
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
        <button name="intent" value="save" className="btn-secondary">
          {el.projects.saveDraft}
        </button>
        <button name="intent" value="requestOffer" className="btn-primary">
          {el.projects.requestOffer}
        </button>
      </div>
    </form>
  );
}
