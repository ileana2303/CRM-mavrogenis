import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { PeopleProvider } from "@/components/owner-select";
import { SIDEBAR_COOKIE } from "@/lib/constants";
import { requireUser } from "@/server/auth/current-user";
import { listSalespeople } from "@/server/services/task-service";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  const saved = (await cookies()).get(SIDEBAR_COOKIE)?.value;
  const initialCollapsed = saved === "collapsed" ? true : saved === "expanded" ? false : null;
  // who actions can be assigned to (ACTPRSN) – bootstrap is cached 5 min, so this costs nothing per page
  const people = await listSalespeople();
  return (
    <PeopleProvider people={people} meId={session.s1Prsn ?? session.userId}>
      <AppShell session={session} initialCollapsed={initialCollapsed}>
        {children}
      </AppShell>
    </PeopleProvider>
  );
}
