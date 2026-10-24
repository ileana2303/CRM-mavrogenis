import { notFound } from "next/navigation";
import { BackLink, PageTitle } from "@/components/ui";
import { el } from "@/lib/i18n/el";
import { getDoctor } from "@/server/services/customer-service";
import { DoctorForm } from "../../doctor-form";

export const metadata = { title: el.customer.edit };

export default async function EditDoctorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doctor = await getDoctor(id);
  if (!doctor) notFound();
  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <BackLink href={`/customers/${id}`} />
      <PageTitle>{el.customer.edit}</PageTitle>
      <DoctorForm doctor={doctor} />
    </div>
  );
}
