import { notFound } from "next/navigation";
import { BackLink, Card, DoctorLine, Field, Notice, PageTitle } from "@/components/ui";
import { DictationTextarea } from "@/components/dictation-textarea";
import { EquipmentEditor } from "@/components/equipment-editor";
import { el } from "@/lib/i18n/el";
import { todayIso } from "@/lib/format";
import { doctorFullName, getDoctor, listEquipment } from "@/server/services/customer-service";
import { saveAutopsyAction, saveAutopsyThenProjectAction } from "../../../actions";

export const metadata = { title: el.autopsy.newTitle };

export default async function NewAutopsyPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const doctor = await getDoctor(id);
  if (!doctor) notFound();
  // a repeat autopsy starts from what we already know about the customer
  const known = await listEquipment(id);

  return (
    <form action={saveAutopsyAction} className="flex flex-col gap-4">
      <input type="hidden" name="doctorId" value={id} />
      <BackLink href={`/customers/${id}/autopsy`} />
      <PageTitle>{el.autopsy.newTitle}</PageTitle>
      <DoctorLine name={doctorFullName(doctor)} />
      {error && <Notice tone="red">{el.app.notFound}</Notice>}

      <Card>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={el.autopsy.date} hint="ΗΗ / ΜΜ / ΕΕΕΕ">
            <input type="date" name="date" className="input" defaultValue={todayIso()} required />
          </Field>
        </div>
      </Card>

      <Card title={el.autopsy.equipmentFound}>
        <p className="text-sm text-[var(--muted)] mb-3">{el.autopsy.equipmentHint}</p>
        <EquipmentEditor
          initial={known.map(({ category, manufacturer, model, purchaseYear, serviceContract, serialNumber }) => ({
            category,
            manufacturer,
            model,
            purchaseYear,
            serviceContract,
            serialNumber,
          }))}
        />
      </Card>

      <Card>
        <Field label={el.autopsy.findings}>
          <DictationTextarea name="comments" placeholder={el.autopsy.findingsPlaceholder} rows={5} />
        </Field>
      </Card>

      <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
        <button formAction={saveAutopsyThenProjectAction} className="btn-secondary">
          {el.autopsy.saveNewProject}
        </button>
        <button className="btn-primary">
          {el.autopsy.save}
        </button>
      </div>
    </form>
  );
}
