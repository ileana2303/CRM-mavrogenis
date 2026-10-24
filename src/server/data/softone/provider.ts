/**
 * SoftOne adapter – TO BE COMPLETED once the SoftOne objects exist (docs/SOFTONE-SPEC.md).
 * Every method lists the SoftOne call it should make. Until implemented, each throws
 * NotImplemented so that misconfiguration is loud, not silent.
 */
import type { DataProvider } from "../provider";
import { S1Client, s1ConfigFromEnv } from "./client";

class NotImplemented extends Error {
  constructor(what: string) {
    super(`SoftOneProvider.${what} is not implemented yet`);
  }
}
const todo = (what: string) => async (): Promise<never> => {
  throw new NotImplemented(what);
};

export const s1 = new S1Client(s1ConfigFromEnv());

export const softOneProvider: DataProvider = {
  name: "softone",

  users: {
    // login/authenticate + SqlData CRM_ME
    findByUsername: todo("users.findByUsername"),
    findById: todo("users.findById"),
    list: todo("users.list"),
  },
  doctors: {
    // SqlData CRM_DOCTOR_SEARCH
    search: todo("doctors.search"),
    // getData CUSTOMER
    findById: todo("doctors.findById"),
    findByIds: todo("doctors.findByIds"),
    // setData CUSTOMER (+ CCC fields)
    create: todo("doctors.create"),
    update: todo("doctors.update"),
    // setData/getData CCCCRMCONSENT
    saveConsent: todo("doctors.saveConsent"),
    getConsent: todo("doctors.getConsent"),
  },
  equipment: {
    // browser CCCCRMEQUIP filtered by TRDR / setData
    listByDoctor: todo("equipment.listByDoctor"),
    replaceForDoctor: todo("equipment.replaceForDoctor"),
  },
  visits: {
    // CCCCRMVISIT
    listByDoctor: todo("visits.listByDoctor"),
    listByUser: todo("visits.listByUser"),
    listAll: todo("visits.listAll"),
    create: todo("visits.create"),
  },
  projects: {
    // CCCCRMPROJECT (+ CCCCRMPROJECTLINE, CCCCRMPROJECTEVENT), CCCCRMFOLLOWUP, CCCCRMSEQ
    listByDoctor: todo("projects.listByDoctor"),
    listByUser: todo("projects.listByUser"),
    listAll: todo("projects.listAll"),
    findById: todo("projects.findById"),
    create: todo("projects.create"),
    update: todo("projects.update"),
    nextSequence: todo("projects.nextSequence"),
    listEvents: todo("projects.listEvents"),
    addEvent: todo("projects.addEvent"),
    listFollowUps: todo("projects.listFollowUps"),
    listFollowUpsByUser: todo("projects.listFollowUpsByUser"),
    addFollowUp: todo("projects.addFollowUp"),
  },
  offers: {
    // CCCCRMOFFER (+ CCCCRMOFFERLINE)
    listByDoctor: todo("offers.listByDoctor"),
    listByProject: todo("offers.listByProject"),
    listByRequester: todo("offers.listByRequester"),
    listAll: todo("offers.listAll"),
    findById: todo("offers.findById"),
    create: todo("offers.create"),
    update: todo("offers.update"),
  },
  tasks: {
    // CCCCRMTASK
    listByDoctor: todo("tasks.listByDoctor"),
    listByUser: todo("tasks.listByUser"),
    create: todo("tasks.create"),
    update: todo("tasks.update"),
  },
  checkIns: {
    // CCCCRMCHECKIN
    openForUser: todo("checkIns.openForUser"),
    create: todo("checkIns.create"),
    update: todo("checkIns.update"),
    list: todo("checkIns.list"),
  },
  stats: {
    // SqlData CRM_PRODUCTS, CRM_HISTORY / CRM_TURNOVER_CUSTOMER_YEARS, CRM_TARGET, CRM_TURNOVER_SALESMAN
    listProducts: todo("stats.listProducts"),
    findProduct: todo("stats.findProduct"),
    doctorHistory: todo("stats.doctorHistory"),
    target: todo("stats.target"),
    turnover: todo("stats.turnover"),
  },
};
