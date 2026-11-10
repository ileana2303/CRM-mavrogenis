import { notFound } from "next/navigation";
import { el } from "@/lib/i18n/el";
import { getDoctor, listHospitals } from "@/server/services/customer-service";
import { DoctorForm } from "../../doctor-form";

export const metadata = { title: el.customer.edit };

export default async function EditDoctorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [doctor, hospitals] = await Promise.all([getDoctor(id), listHospitals()]);
  if (!doctor) notFound();
  return (
    <DoctorForm doctor={doctor} hospitals={hospitals} title={el.customer.edit} backHref={`/customers/${id}`} />
  );
}
