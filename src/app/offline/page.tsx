import { PublicShell } from "@/components/app-shell";

export default function OfflinePage() {
  return (
    <PublicShell>
      <div className="card p-6 max-w-sm text-center">
        <h1 className="text-lg font-bold mb-2">Χωρίς σύνδεση</h1>
        <p className="text-sm text-[var(--muted)]">Η εφαρμογή χρειάζεται σύνδεση στο διαδίκτυο. Δοκιμάστε ξανά μόλις επανέλθει το δίκτυο.</p>
      </div>
    </PublicShell>
  );
}
