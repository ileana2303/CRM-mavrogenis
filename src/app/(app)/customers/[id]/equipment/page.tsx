import { notFound } from "next/navigation";
import Link from "next/link";
import { BackLink, DoctorLine, Notice, PageTitle } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { lastAutopsy } from "@/server/services/autopsy-service";
import { EquipmentEditor } from "@/components/equipment-editor";
import { el } from "@/lib/i18n/el";
import { doctorFullName, getDoctor, listEquipment } from "@/server/services/customer-service";
import { saveEquipmentAction } from "../../actions";

export const metadata = { title: el.equipment.title };

export default async function EquipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doctor = await getDoctor(id);
  if (!doctor) notFound();
  const [rows, autopsy] = await Promise.all([listEquipment(id), lastAutopsy(id)]);
  return (
    <form action={saveEquipmentAction} className="flex flex-col gap-4">
      <input type="hidden" name="doctorId" value={id} />
      <BackLink href={`/customers/${id}`} />
      <PageTitle right={<button className="btn-primary">{el.app.save}</button>}>{el.equipment.installed}</PageTitle>
      <DoctorLine name={doctorFullName(doctor)} />
      {autopsy ? (
        <Notice tone="blue">
          {el.autopsy.last}: {fmtDate(autopsy.date)} {autopsy.userName ? `${el.autopsy.by} ${autopsy.userName}` : ""} ·{" "}
          <Link href={`/customers/${id}/autopsy`} className="underline font-medium">
            {el.autopsy.title}
          </Link>
        </Notice>
      ) : (
        <Notice tone="amber">
          {el.autopsy.empty} {el.autopsy.emptyHint}{" "}
          <Link href={`/customers/${id}/autopsy/new`} className="underline font-medium">
            {el.autopsy.new}
          </Link>
        </Notice>
      )}
      <EquipmentEditor
        initial={rows.map(({ category, manufacturer, model, purchaseYear, serviceContract, serialNumber }) => ({
          category,
          manufacturer,
          model,
          purchaseYear,
          serviceContract,
          serialNumber,
        }))}
      />
      <div className="flex justify-end">
        <button className="btn-primary">{el.app.save}</button>
      </div>
    </form>
  );
}
