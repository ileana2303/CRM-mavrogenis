import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/server/auth/current-user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  return <AppShell session={session}>{children}</AppShell>;
}
