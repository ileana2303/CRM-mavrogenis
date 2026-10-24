import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { LAST_DOCTOR_COOKIE } from "@/lib/constants";
import { requireUser } from "@/server/auth/current-user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  const lastDoctorId = (await cookies()).get(LAST_DOCTOR_COOKIE)?.value;
  return (
    <AppShell session={session} lastDoctorId={lastDoctorId}>
      {children}
    </AppShell>
  );
}
