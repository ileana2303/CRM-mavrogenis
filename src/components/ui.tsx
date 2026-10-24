import Link from "next/link";
import type { ReactNode } from "react";
import { el } from "@/lib/i18n/el";

export function BackLink({ href, label }: { href: string; label?: string }) {
  return (
    <Link href={href} className="btn-ghost -ml-3 text-brand-700">
      {label ?? el.app.back}
    </Link>
  );
}

export function PageTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <h1 className="text-xl md:text-2xl font-bold text-brand-800">{children}</h1>
      {right}
    </div>
  );
}

export function Field({
  label,
  required,
  children,
  hint,
  className,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="label">
        {label}
        {required && <span className="text-danger-500"> *</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-[var(--muted)] mt-1">{hint}</span>}
    </label>
  );
}

export function Card({ children, className, title }: { children: ReactNode; className?: string; title?: ReactNode }) {
  return (
    <section className={`card p-4 ${className ?? ""}`}>
      {title && <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">{title}</h2>}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-[var(--muted)] py-6 text-center">{children}</p>;
}

const tones: Record<string, string> = {
  gray: "bg-gray-100 text-gray-700",
  blue: "bg-brand-100 text-brand-800",
  green: "bg-emerald-100 text-emerald-800",
  red: "bg-red-100 text-red-800",
  amber: "bg-amber-100 text-amber-800",
  teal: "bg-teal-100 text-teal-800",
};

export function Badge({ tone = "gray", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <span className={`badge ${tones[tone]}`}>{children}</span>;
}

export function Radios<T extends string>({
  name,
  options,
  defaultValue,
  required,
}: {
  name: string;
  options: Array<[T, string]>;
  defaultValue?: T;
  required?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([value, label]) => (
        <label key={value} className="chip">
          <input type="radio" name={name} value={value} defaultChecked={defaultValue === value} required={required} />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );
}

export function Notice({ tone = "blue", children }: { tone?: "blue" | "green" | "red" | "amber"; children: ReactNode }) {
  const t = { blue: "bg-brand-50 text-brand-800 border-brand-200", green: "bg-emerald-50 text-emerald-800 border-emerald-200", red: "bg-red-50 text-red-800 border-red-200", amber: "bg-amber-50 text-amber-900 border-amber-200" }[tone];
  return <div className={`rounded-xl border px-3 py-2 text-sm ${t}`}>{children}</div>;
}

export function DoctorLine({ name }: { name: string }) {
  return (
    <p className="text-sm text-[var(--muted)] mb-3">
      {el.customer.doctorPrefix}: <span className="font-semibold text-[var(--text)]">{name}</span>
    </p>
  );
}

export function entries<T extends string>(o: Record<T, string>): Array<[T, string]> {
  return Object.entries(o) as Array<[T, string]>;
}
