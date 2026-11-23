"use client";

import { createContext, useContext, type ReactNode } from "react";
import { el } from "@/lib/i18n/el";
import type { Salesperson } from "@/server/domain/types";
import { Select } from "./select";
import { Field } from "./ui";

/** the bootstrap salespeople + who is logged in – provided once by the app layout */
const People = createContext<{ people: Salesperson[]; meId: string }>({ people: [], meId: "" });

export function PeopleProvider({ people, meId, children }: { people: Salesperson[]; meId: string; children: ReactNode }) {
  return <People.Provider value={{ people, meId }}>{children}</People.Provider>;
}

/**
 * «Υπεύθυνος» (ACTPRSN) on every form that creates an action for later: the logged-in salesperson by default, any
 * salesperson from api.crm/bootstrap `prsns` instead. Posts `name`; without a list (bootstrap down) nothing is shown and
 * the server assigns the action to the logged-in salesperson, as before.
 */
export function OwnerSelect({ name = "ownerId" }: { name?: string }) {
  const { people, meId } = useContext(People);
  if (people.length === 0) return null;
  const options = people.map((p) => ({ value: p.id, label: p.id === meId ? `${p.name} (${el.owner.me})` : p.name, hint: p.code }));
  // the logged-in salesperson first
  options.sort((a, b) => (a.value === meId ? -1 : b.value === meId ? 1 : 0));
  return (
    <Field label={el.owner.label}>
      <Select name={name} defaultValue={people.some((p) => p.id === meId) ? meId : ""} options={people.some((p) => p.id === meId) ? options : [{ value: "", label: el.owner.me }, ...options]} searchable />
    </Field>
  );
}
