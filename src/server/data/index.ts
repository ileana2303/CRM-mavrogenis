import type { DataProvider } from "./provider";
import { localProvider } from "./local/provider";
import { softOneProvider } from "./softone/provider";

export type ProviderMode = "local" | "softone" | "hybrid";

export function providerMode(): ProviderMode {
  const m = process.env.DATA_PROVIDER;
  return m === "softone" || m === "hybrid" ? m : "local";
}

/**
 * hybrid = SoftOne for what already has endpoints (login, users, doctors), local JSON for the rest.
 * Lets the app run on real customers while the remaining SoftOne scripts are being built.
 */
const hybridProvider: DataProvider = {
  ...localProvider,
  name: "softone",
  users: softOneProvider.users,
  doctors: {
    ...softOneProvider.doctors,
    // signature → SoftOne (setSignature); a local copy keeps the GDPR badge + channels until a read endpoint exists
    async saveConsent(c) {
      await softOneProvider.doctors.saveConsent(c);
      return localProvider.doctors.saveConsent(c);
    },
    // SoftOne decides whether the doctor has signed; channels + PNG fall back to the local copy
    async getConsent(doctorId) {
      const s1 = await softOneProvider.doctors.getConsent(doctorId);
      if (!s1) return null;
      const local = await localProvider.doctors.getConsent(doctorId);
      return { ...s1, channels: local?.channels ?? s1.channels, signaturePng: s1.signaturePng || local?.signaturePng || "" };
    },
  },
  autopsies: {
    // header → SoftOne SOMEETING 2002; a local mirror keeps the list readable until api.crm.actions/list exists
    listByDoctor: localProvider.autopsies.listByDoctor,
    async create(a) {
      const s1 = await softOneProvider.autopsies.create(a);
      return localProvider.autopsies.create({ ...a, s1Id: s1.s1Id });
    },
  },
  tasks: softOneProvider.tasks, // Εκκρεμότητες live in SOTASK 3000
  checkIns: {
    // open arrival + writes go to SoftOne (SOMEETING 2001); coordinates + manager log stay in the local mirror
    openForUser: softOneProvider.checkIns.openForUser,
    async create(c) {
      const s1 = await softOneProvider.checkIns.create(c);
      await localProvider.checkIns.create({ ...c, s1Id: s1.s1Id });
      return s1;
    },
    async update(id, patch) {
      const s1 = await softOneProvider.checkIns.update(id, patch);
      const mirror = (await localProvider.checkIns.list()).find((m) => m.s1Id === id);
      if (mirror) await localProvider.checkIns.update(mirror.id, patch);
      return mirror ? { ...mirror, ...patch } : s1;
    },
    list: localProvider.checkIns.list,
  },
  offers: {
    ...localProvider.offers, // project-linked offer flow stays local until the SALDOC CCC fields exist
    listByDoctor: softOneProvider.offers.listByDoctor, // «Προσφορές» tab: real SoftOne offers of the doctor (all series)
    findById: async (id) => (/^\d+$/.test(id) ? softOneProvider.offers.findById(id) : localProvider.offers.findById(id)),
  },
  stats: {
    ...localProvider.stats, // history / target / turnover still local
    listProducts: softOneProvider.stats.listProducts,
    findProduct: softOneProvider.stats.findProduct,
    listHospitals: softOneProvider.stats.listHospitals,
  },
};

/** Single entry point for services. Switch with DATA_PROVIDER=local|hybrid|softone. */
export function db(): DataProvider {
  const m = providerMode();
  return m === "softone" ? softOneProvider : m === "hybrid" ? hybridProvider : localProvider;
}
