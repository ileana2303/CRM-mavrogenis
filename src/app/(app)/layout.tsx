import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { SIDEBAR_COOKIE } from "@/lib/constants";
import { requireUser } from "@/server/auth/current-user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  const saved = (await cookies()).get(SIDEBAR_COOKIE)?.value;
  const initialCollapsed = saved === "collapsed" ? true : saved === "expanded" ? false : null;
  return (
    <AppShell session={session} initialCollapsed={initialCollapsed}>
      {children}
    </AppShell>
  );
}
