import { el } from "@/lib/i18n/el";
import { listHospitals } from "@/server/services/customer-service";
import { DoctorForm } from "../doctor-form";

export const metadata = { title: el.customer.createNew };

export default async function NewDoctorPage() {
  const hospitals = await listHospitals();
  return (
    <DoctorForm hospitals={hospitals} title={el.customer.createNew} backHref="/customers" />
  );
}
