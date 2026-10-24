import { redirect } from "next/navigation";
import { PublicShell } from "@/components/app-shell";
import { getSession, homeFor } from "@/server/auth/session";
import { LoginForm } from "./login-form";

export const metadata = { title: "Σύνδεση" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const session = await getSession();
  if (session) redirect(homeFor(session.role));
  const { next } = await searchParams;
  return (
    <PublicShell>
      <LoginForm next={next} />
    </PublicShell>
  );
}
