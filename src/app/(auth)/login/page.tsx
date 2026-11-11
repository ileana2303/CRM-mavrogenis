import { redirect } from "next/navigation";
import { PublicShell } from "@/components/app-shell";
import { getSession, homeFor } from "@/server/auth/session";
import { LoginForm } from "./login-form";

export const metadata = { title: "Σύνδεση" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; expired?: string }> }) {
  const { next, expired } = await searchParams;
  const session = await getSession();
  if (session && !expired) redirect(homeFor(session.role));
  return (
    <PublicShell>
      <LoginForm next={next} expired={!!expired} />
    </PublicShell>
  );
}
