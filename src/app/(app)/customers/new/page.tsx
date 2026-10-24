import { BackLink, PageTitle } from "@/components/ui";
import { el } from "@/lib/i18n/el";
import { DoctorForm } from "../doctor-form";

export const metadata = { title: el.customer.createNew };

export default function NewDoctorPage() {
  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <BackLink href="/customers" />
      <PageTitle>{el.customer.createNew}</PageTitle>
      <DoctorForm />
    </div>
  );
}
