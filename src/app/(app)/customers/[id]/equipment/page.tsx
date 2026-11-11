import { notFound } from "next/navigation";
import { BackLink, DoctorLine, PageTitle } from "@/components/ui";
import { EquipmentEditor } from "@/components/equipment-editor";
import { el } from "@/lib/i18n/el";
import { doctorFullName, getDoctor, listEquipment, machineCatalog } from "@/server/services/customer-service";
import { saveEquipmentAction } from "../../actions";

export const metadata = { title: el.equipment.title };

export default async function EquipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doctor = await getDoctor(id);
  if (!doctor) notFound();
  const [rows, catalog] = await Promise.all([listEquipment(id), machineCatalog()]);
  return (
    <form action={saveEquipmentAction} className="flex flex-col gap-4">
      <input type="hidden" name="doctorId" value={id} />
      <BackLink href={`/customers/${id}`} />
      <PageTitle right={<button className="btn-primary min-w-36">{el.app.save}</button>}>{el.equipment.installed}</PageTitle>
      <DoctorLine name={doctorFullName(doctor)} />
      <EquipmentEditor initial={rows.map(({ id: _id, doctorId: _d, ...r }) => r)} catalog={catalog} />
    </form>
  );
}
