/**
 * Demo data from «Παρουσίαση CRM Πωλητών V1.pptx».
 * Fixed facts (Παπαδόπουλος, OCT project, Q-2026-0142/V1, history table…) are literal.
 * Volume data (extra doctors, visits) is generated deterministically so the KPI screen
 * shows the figures of slide 22 for Ηλίας Λεβεντούρης, Οκτώβριος 2026.
 */
import bcrypt from "bcryptjs";
import type {
  CheckIn,
  Consent,
  Doctor,
  DoctorYearStat,
  Equipment,
  FollowUp,
  Offer,
  Product,
  Project,
  ProjectEvent,
  SalesTurnover,
  Target,
  Task,
  User,
  Visit,
} from "../../domain/types";
import { collectionExists, writeCollection } from "./store";

// ---------- helpers --------------------------------------------------------

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261024);
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rnd() * arr.length)];
const int = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function ts(date: string, hh = 10, mm = 0) {
  return `${date}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00.000Z`;
}
function daysFromToday(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
const seq = (n: number) => String(n).padStart(4, "0");
const prCode = (n: number) => `PR-2026-${seq(n)}`;
const qNumber = (n: number) => `Q-2026-${seq(n)}`;

// ---------- users ----------------------------------------------------------

const U = {
  ilias: "u-ilias",
  maria: "u-maria",
  manager: "u-manager",
  support: "u-support",
};

function users(): User[] {
  const hash = bcrypt.hashSync("1234", 10);
  return [
    {
      id: U.ilias,
      username: "e.leventouris",
      passwordHash: hash,
      fullName: "Ηλίας Λεβεντούρης",
      role: "SALESPERSON",
      salesPersonCode: "101",
      managerId: U.manager,
    },
    {
      id: U.maria,
      username: "m.nikolaou",
      passwordHash: hash,
      fullName: "Μαρία Νικολάου",
      role: "SALESPERSON",
      salesPersonCode: "102",
      managerId: U.manager,
    },
    {
      id: U.manager,
      username: "manager",
      passwordHash: hash,
      fullName: "Κώστας Αντωνίου",
      role: "MANAGER",
    },
    {
      id: U.support,
      username: "support",
      passwordHash: hash,
      fullName: "Ελένη Δημητρίου",
      role: "SUPPORT",
    },
  ];
}

// ---------- doctors --------------------------------------------------------

const D = { papadopoulos: "d-papadopoulos", ioannou: "d-ioannou" };

const LAST = [
  "Αλεξίου", "Βασιλείου", "Γεωργίου", "Δημητρίου", "Ευαγγέλου", "Ζαφειρίου", "Θεοδώρου", "Καραγιάννης",
  "Λαμπρόπουλος", "Μακρής", "Νικολαΐδης", "Ξανθόπουλος", "Οικονόμου", "Παππάς", "Ρήγας", "Σταματίου",
  "Τσιάρας", "Φωτίου", "Χατζής", "Ψαρράς", "Αντωνόπουλος", "Βλάχος", "Γιαννακόπουλος", "Δούκας",
  "Κωνσταντίνου", "Λιάκος", "Μιχαηλίδης", "Παναγιώτου", "Σαμαράς", "Τριανταφύλλου",
] as const;
const FIRST_M = ["Γεώργιος", "Νικόλαος", "Κωνσταντίνος", "Δημήτριος", "Ιωάννης", "Παναγιώτης", "Χρήστος", "Αθανάσιος", "Μιχαήλ", "Ανδρέας"] as const;
const FIRST_F = ["Μαρία", "Ελένη", "Αικατερίνη", "Σοφία", "Αναστασία", "Ευαγγελία", "Δέσποινα", "Ειρήνη", "Χριστίνα", "Βασιλική"] as const;
const CITIES = [
  ["Αθήνα", "11527"], ["Θεσσαλονίκη", "54622"], ["Πάτρα", "26221"], ["Ηράκλειο", "71201"], ["Λάρισα", "41222"],
  ["Βόλος", "38221"], ["Ιωάννινα", "45221"], ["Χανιά", "73100"], ["Καβάλα", "65302"], ["Ρόδος", "85100"],
  ["Λαμία", "35100"], ["Κόρινθος", "20100"],
] as const;
const HOSPITALS = ["Γ.Ν.Α. «Γ. Γεννηματάς»", "Π.Γ.Ν. ΑΧΕΠΑ", "Π.Γ.Ν. Πατρών", "ΠΑ.Γ.Ν.Η.", "Γ.Ν. Λάρισας", "Οφθαλμιατρείο Αθηνών"] as const;
const STREETS = ["Λεωφ. Κηφισίας", "Βασ. Σοφίας", "Εγνατία", "Τσιμισκή", "Μαιζώνος", "Λεωφ. Αλεξάνδρας", "Πανεπιστημίου", "Αγ. Δημητρίου"] as const;

function doctors(): Doctor[] {
  const created = ts("2025-03-12");
  const list: Doctor[] = [
    {
      id: D.papadopoulos,
      firstName: "Γεώργιος",
      lastName: "Παπαδόπουλος",
      mobile: "6944123456",
      email: "g.papadopoulos@example.com",
      activityType: "PRIVATE",
      clinicAddress: "Λεωφ. Κηφισίας 128",
      city: "Αθήνα",
      postalCode: "11526",
      hospital: "",
      afm: "045678912",
      rank: "DIRECTOR",
      ownerUserId: U.ilias,
      createdAt: created,
      updatedAt: created,
    },
    {
      id: D.ioannou,
      firstName: "Μαρία",
      lastName: "Ιωάννου",
      mobile: "6951234567",
      email: "m.ioannou@example.com",
      activityType: "PUBLIC",
      clinicAddress: "Αισχύλου 14",
      city: "Λιβαδειά",
      postalCode: "32100",
      hospital: "Γ.Ν. Λιβαδειάς",
      afm: "060212345",
      rank: "CURATOR",
      ownerUserId: U.ilias,
      createdAt: created,
      updatedAt: created,
    },
  ];
  const used = new Set<string>();
  for (let i = 0; i < 58; i++) {
    const female = rnd() < 0.45;
    const firstName = female ? pick(FIRST_F) : pick(FIRST_M);
    let lastName = pick(LAST);
    if (female && !lastName.endsWith("ς") && !lastName.endsWith("ου")) lastName = lastName;
    if (female && lastName.endsWith("ος")) lastName = lastName.slice(0, -2) + "ου";
    if (female && lastName.endsWith("ης")) lastName = lastName.slice(0, -2) + "η";
    if (female && lastName.endsWith("άς")) lastName = lastName.slice(0, -2) + "ά";
    const key = `${firstName} ${lastName}`;
    if (used.has(key)) {
      i--;
      continue;
    }
    used.add(key);
    const [city, zip] = pick(CITIES);
    const isPublic = rnd() < 0.4;
    const ranks = ["RESIDENT", "CURATOR", "DIRECTOR", "PROFESSOR"] as const;
    const t = ts(isoDate(2025, int(1, 12), int(1, 28)));
    list.push({
      id: `d-${String(i + 1).padStart(3, "0")}`,
      firstName,
      lastName,
      mobile: `69${int(10000000, 99999999)}`,
      email: `${translit(firstName[0])}.${translit(lastName)}@example.com`.toLowerCase(),
      activityType: isPublic ? "PUBLIC" : "PRIVATE",
      clinicAddress: `${pick(STREETS)} ${int(2, 180)}`,
      city,
      postalCode: zip,
      hospital: isPublic ? pick(HOSPITALS) : "",
      afm: String(int(100000000, 199999999)),
      rank: isPublic ? pick(ranks) : pick(["CURATOR", "DIRECTOR"] as const),
      ownerUserId: i % 4 === 3 ? U.maria : U.ilias,
      createdAt: t,
      updatedAt: t,
    });
  }
  return list;
}

function translit(s: string) {
  const map: Record<string, string> = {
    α: "a", ά: "a", β: "v", γ: "g", δ: "d", ε: "e", έ: "e", ζ: "z", η: "i", ή: "i", θ: "th", ι: "i", ί: "i", ϊ: "i",
    κ: "k", λ: "l", μ: "m", ν: "n", ξ: "x", ο: "o", ό: "o", π: "p", ρ: "r", σ: "s", ς: "s", τ: "t", υ: "y", ύ: "y",
    φ: "f", χ: "ch", ψ: "ps", ω: "o", ώ: "o",
  };
  return s
    .toLowerCase()
    .split("")
    .map((c) => map[c] ?? c)
    .join("");
}

// ---------- products -------------------------------------------------------

function products(): Product[] {
  return [
    { code: "1052-45", name: "Visionix Solix OCT", floorPrice: 48000, category: "OCT" },
    { code: "1052-46", name: "Visionix Solix OCT-A", floorPrice: 62000, category: "OCT" },
    { code: "02-4587", name: "Περίμετρο Octopus 600", floorPrice: 35000, category: "PERIMETER" },
    { code: "02-4590", name: "Περίμετρο Octopus 900", floorPrice: 42000, category: "PERIMETER" },
    { code: "03-1120", name: "Οπτικό Βιόμετρο Lenstar 900", floorPrice: 28000, category: "BIOMETER" },
    { code: "04-2210", name: "Τοπογράφος Pentacam", floorPrice: 54000, category: "TOPOGRAPHER" },
    { code: "05-0310", name: "Σχισμοειδής λυχνία SL-D7", floorPrice: 9500, category: "SLIT_LAMP" },
    { code: "06-0101", name: "Φακόμετρο LM-1800", floorPrice: 4200, category: "LENSMETER" },
    { code: "07-7700", name: "Κάμερα βυθού Occulera", floorPrice: 31000, category: "FUNDUS_CAMERA" },
    { code: "08-5000", name: "YAG Laser Ultra Q", floorPrice: 38000, category: "LASER" },
  ];
}

// ---------- Παπαδόπουλος: slides 11–21 ------------------------------------

const P = { oct: "p-oct", perimeter: "p-perimeter", occulera: "p-occulera" };
const O = { octV1: "o-oct-v1", perimeter: "o-perimeter-v1" };

function papadopoulosEquipment(): Equipment[] {
  return [
    { id: "e-1", doctorId: D.papadopoulos, category: "OCT", manufacturer: "Visionix", model: "Solix", purchaseYear: 2022, serviceContract: true },
    { id: "e-2", doctorId: D.papadopoulos, category: "PERIMETER", manufacturer: "Zeiss", model: "HFA3 840", purchaseYear: 2019, serviceContract: false },
    { id: "e-3", doctorId: D.ioannou, category: "SLIT_LAMP", manufacturer: "Topcon", model: "SL-D7", purchaseYear: 2020, serviceContract: false },
  ];
}

function papadopoulosProjects(): Project[] {
  return [
    {
      id: P.oct,
      code: prCode(142),
      doctorId: D.papadopoulos,
      userId: U.ilias,
      type: "REPLACEMENT",
      title: "OCT",
      stage: "NEGOTIATION",
      status: "ACTIVE",
      value: 45600,
      lastOfferDate: "2026-10-10",
      notes: "Να του δώσουμε πίστωση 3 μήνες με επιταγές και να αναφέρουμε παράδοση εντός 1 μήνα",
      createdAt: ts("2026-10-08", 9, 30),
      lines: [
        { lineNo: 1, productCode: "1052-45", qty: 1, floorPrice: 48000, discountPct: 5, specialDiscountPct: 0, offerPrice: 45600 },
      ],
    },
    {
      id: P.perimeter,
      code: prCode(131),
      doctorId: D.papadopoulos,
      userId: U.ilias,
      type: "NEW_CLINIC",
      title: "Περίμετρα",
      stage: "OFFER",
      status: "ACTIVE",
      value: 48000,
      lastOfferDate: "2026-07-06",
      notes: "",
      createdAt: ts("2026-06-22", 11, 0),
      lines: [
        { lineNo: 1, productCode: "02-4587", qty: 1, floorPrice: 35000, discountPct: 0, specialDiscountPct: 0, offerPrice: 35000 },
        { lineNo: 2, productCode: "05-0310", qty: 1, floorPrice: 9500, discountPct: 0, specialDiscountPct: 0, offerPrice: 9500 },
        { lineNo: 3, productCode: "06-0101", qty: 1, floorPrice: 4200, discountPct: 16.67, specialDiscountPct: 0, offerPrice: 3500 },
      ],
    },
    {
      id: P.occulera,
      code: prCode(150),
      doctorId: D.papadopoulos,
      userId: U.ilias,
      type: "REPLACEMENT",
      title: "Occulera",
      stage: "DEMO",
      status: "ACTIVE",
      value: 0,
      notes: "Demo προγραμματίζεται στο ιατρείο.",
      createdAt: ts("2026-10-15", 16, 0),
      lines: [
        { lineNo: 1, productCode: "07-7700", qty: 1, floorPrice: 31000, discountPct: 0, specialDiscountPct: 0, offerPrice: 31000 },
      ],
    },
  ];
}

function papadopoulosEvents(): ProjectEvent[] {
  return [
    { id: "ev-1", projectId: P.oct, date: ts("2026-10-08", 9, 30), type: "CREATED", title: "Δημιουργία Project", description: "Καταχώριση ενδιαφέροντος για OCT", userId: U.ilias },
    { id: "ev-2", projectId: P.oct, date: ts("2026-10-08", 9, 35), type: "OFFER_REQUESTED", title: "Αίτημα προσφοράς", description: "Αίτημα προς τμήμα υποστήριξης (Q-2026-0142)", userId: U.ilias },
    { id: "ev-3", projectId: P.oct, date: ts("2026-10-10", 12, 0), type: "OFFER_SENT", title: "Αποστολή προσφοράς", description: "Προσφορά 45.600 €", userId: U.ilias },
    { id: "ev-4", projectId: P.oct, date: ts("2026-10-14", 10, 15), type: "FOLLOW_UP", title: "Follow-up", description: "Ο γιατρός ζήτησε καλύτερη τιμή", userId: U.ilias },
    { id: "ev-5", projectId: P.perimeter, date: ts("2026-06-22", 11, 0), type: "CREATED", title: "Δημιουργία Project", description: "Νέο ιατρείο – περίμετρο & βασικός εξοπλισμός", userId: U.ilias },
    { id: "ev-6", projectId: P.perimeter, date: ts("2026-07-06", 12, 0), type: "OFFER_SENT", title: "Αποστολή προσφοράς", description: "Προσφορά 48.000 € (OCT + Περίμετρο)", userId: U.ilias },
    { id: "ev-7", projectId: P.occulera, date: ts("2026-10-15", 16, 0), type: "CREATED", title: "Δημιουργία Project", description: "Ενδιαφέρον για κάμερα βυθού Occulera", userId: U.ilias },
  ];
}

function papadopoulosFollowUps(): FollowUp[] {
  return [
    {
      id: "fu-1",
      projectId: P.oct,
      date: ts("2026-10-14", 10, 15),
      contactMethod: "PHONE",
      result: "WAITING",
      comment: "Ο γιατρός ζήτησε καλύτερη τιμή. Συγκρίνει με ανταγωνιστική προσφορά.",
      nextAction: "FOLLOWUP",
      nextActionDate: daysFromToday(2),
      userId: U.ilias,
    },
  ];
}

function papadopoulosOffers(): Offer[] {
  return [
    {
      id: O.octV1,
      projectId: P.oct,
      doctorId: D.papadopoulos,
      number: qNumber(142),
      version: 1,
      date: "2026-10-10",
      title: "OCT",
      status: "SENT",
      total: 45600,
      requestedBy: U.ilias,
      requestedAt: ts("2026-10-08", 9, 35),
      answeredBy: U.support,
      answeredAt: ts("2026-10-09", 15, 0),
      acknowledgedAt: ts("2026-10-10", 12, 0),
      lines: [{ lineNo: 1, productCode: "1052-45", qty: 1, floorPrice: 48000, discountPct: 5, specialDiscountPct: 0, offerPrice: 45600 }],
    },
    {
      id: O.perimeter,
      projectId: P.perimeter,
      doctorId: D.papadopoulos,
      number: qNumber(131),
      version: 1,
      date: "2026-07-06",
      title: "OCT + Περίμετρο",
      status: "SENT",
      total: 48000,
      closed: "PARTIAL",
      requestedBy: U.ilias,
      requestedAt: ts("2026-06-22", 11, 5),
      answeredBy: U.support,
      answeredAt: ts("2026-07-03", 10, 0),
      acknowledgedAt: ts("2026-07-06", 12, 0),
      lines: [
        { lineNo: 1, productCode: "02-4587", qty: 1, floorPrice: 35000, discountPct: 0, specialDiscountPct: 0, offerPrice: 35000 },
        { lineNo: 2, productCode: "05-0310", qty: 1, floorPrice: 9500, discountPct: 0, specialDiscountPct: 0, offerPrice: 9500 },
        { lineNo: 3, productCode: "06-0101", qty: 1, floorPrice: 4200, discountPct: 16.67, specialDiscountPct: 0, offerPrice: 3500 },
      ],
    },
  ];
}

function papadopoulosTasks(): Task[] {
  return [
    { id: "t-1", doctorId: D.papadopoulos, projectId: P.oct, userId: U.ilias, title: "Αποστολή προσφοράς OCT", dueDate: daysFromToday(-12), status: "OPEN", source: "MANUAL" },
    { id: "t-2", doctorId: D.papadopoulos, userId: U.ilias, title: "Follow-up για οπτική βιομετρία", dueDate: daysFromToday(5), status: "OPEN", source: "VISIT" },
    { id: "t-3", doctorId: D.papadopoulos, projectId: P.occulera, userId: U.ilias, title: "Προγραμματισμός Demo", dueDate: daysFromToday(8), status: "OPEN", source: "MANUAL" },
    { id: "t-4", doctorId: D.papadopoulos, projectId: P.occulera, userId: U.ilias, title: "Αποστολή prospectus Occulera", dueDate: daysFromToday(-6), status: "DONE", doneAt: ts(daysFromToday(-7), 17, 0), source: "MANUAL" },
    { id: "t-5", doctorId: D.ioannou, userId: U.ilias, title: "Αποστολή τεχνικών προδιαγραφών βιομέτρου", dueDate: daysFromToday(1), status: "OPEN", source: "VISIT" },
  ];
}

function papadopoulosHistory(): DoctorYearStat[] {
  return [
    { doctorId: D.papadopoulos, year: 2024, offersValue: 45000, turnover: 15000, visits: 5 },
    { doctorId: D.papadopoulos, year: 2025, offersValue: 35000, turnover: 5000, visits: 3 },
    { doctorId: D.papadopoulos, year: 2026, offersValue: 50000, turnover: 50000, visits: 6 },
    { doctorId: D.ioannou, year: 2025, offersValue: 12000, turnover: 9500, visits: 4 },
    { doctorId: D.ioannou, year: 2026, offersValue: 28000, turnover: 0, visits: 3 },
  ];
}

function papadopoulosConsent(): Consent[] {
  return [
    {
      id: "c-1",
      doctorId: D.ioannou,
      signerName: "Μαρία Ιωάννου",
      signaturePng:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      channels: { email: true, sms: false, phone: true, viber: false },
      signedAt: ts("2026-09-18", 11, 20),
      byUserId: U.ilias,
    },
  ];
}

// ---------- volume data for KPIs (slide 22) --------------------------------

interface Generated {
  visits: Visit[];
  projects: Project[];
  events: ProjectEvent[];
  offers: Offer[];
  tasks: Task[];
  checkIns: CheckIn[];
}

function generated(allDoctors: Doctor[], prods: Product[]): Generated {
  const visits: Visit[] = [];
  const projects: Project[] = [];
  const events: ProjectEvent[] = [];
  const offers: Offer[] = [];
  const tasks: Task[] = [];
  const checkIns: CheckIn[] = [];

  const iliasDoctors = allDoctors.filter((d) => d.ownerUserId === U.ilias);
  const mariaDoctors = allDoctors.filter((d) => d.ownerUserId === U.maria);

  // Παπαδόπουλος visits (6 in 2026, 3 of them in October)
  const papVisits: Array<[string, Visit["contactMethod"], Visit["topic"], Visit["outcome"], string]> = [
    ["2026-02-10", "VISIT", "GENERAL", "CONTACT", "Γενική ενημέρωση για νέα σειρά Visionix."],
    ["2026-05-14", "VISIT", "EQUIPMENT", "SEND_MATERIAL", "Ζήτησε prospectus για περίμετρα."],
    ["2026-06-22", "VISIT", "PROJECT", "OFFER", "Νέο ιατρείο – ζήτησε προσφορά για περίμετρο."],
    ["2026-10-08", "VISIT", "PROJECT", "OFFER", "Ενδιαφέρεται για OCT, θέλει προσφορά."],
    ["2026-10-14", "PHONE", "OFFER", "CONTACT", "Ζήτησε καλύτερη τιμή για το OCT."],
    ["2026-10-15", "VISIT", "EQUIPMENT", "DEMO", "Ενδιαφέρεται για Occulera, θέλει demo."],
  ];
  papVisits.forEach(([date, cm, topic, outcome, comment], i) => {
    visits.push({
      id: `v-pap-${i + 1}`,
      doctorId: D.papadopoulos,
      userId: U.ilias,
      date,
      contactMethod: cm,
      topic,
      outcome,
      nextActionDate: i === 5 ? daysFromToday(8) : undefined,
      comment,
      projectId: i === 3 || i === 4 ? P.oct : i === 5 ? P.occulera : i === 2 ? P.perimeter : undefined,
    });
  });

  // October 2026: 60 visits over 45 unique doctors for Ηλίας (3 already counted above for Παπαδόπουλος)
  const octDoctors = [D.papadopoulos, D.ioannou, ...iliasDoctors.filter((d) => d.id !== D.papadopoulos && d.id !== D.ioannou).map((d) => d.id)].slice(0, 45);
  let vCount = 3; // Παπαδόπουλος October visits
  const comments = [
    "Γενική ενημέρωση, καλό κλίμα.",
    "Συζήτηση για αναβάθμιση εξοπλισμού.",
    "Ενδιαφέρον για OCT, επανέλεγχος σε 2 μήνες.",
    "Ζήτησε τεχνικά φυλλάδια.",
    "Παρουσίαση νέων περιμέτρων.",
    "Θέλει demo στο ιατρείο.",
    "Σύγκριση με ανταγωνιστική πρόταση.",
  ];
  for (const docId of octDoctors) {
    if (docId === D.papadopoulos) continue;
    const n = vCount < 45 ? 1 : 1; // first pass: one visit per doctor
    for (let k = 0; k < n; k++) {
      const day = int(1, 23);
      visits.push({
        id: `v-${vCount + 1}`,
        doctorId: docId,
        userId: U.ilias,
        date: isoDate(2026, 10, day),
        contactMethod: pick(["VISIT", "VISIT", "VISIT", "PHONE", "EMAIL"] as const),
        topic: pick(["GENERAL", "EQUIPMENT", "PROJECT", "OFFER"] as const),
        outcome: pick(["NONE", "CONTACT", "SEND_MATERIAL", "DEMO", "OFFER"] as const),
        nextActionDate: rnd() < 0.3 ? daysFromToday(int(0, 14)) : undefined,
        comment: pick(comments),
      });
      vCount++;
    }
  }
  // second visits to reach 60
  const extraDoctors = octDoctors.filter((d) => d !== D.papadopoulos);
  let j = 0;
  while (vCount < 60) {
    const docId = extraDoctors[j % extraDoctors.length];
    j++;
    visits.push({
      id: `v-${vCount + 1}`,
      doctorId: docId,
      userId: U.ilias,
      date: isoDate(2026, 10, int(1, 23)),
      contactMethod: pick(["VISIT", "PHONE"] as const),
      topic: pick(["PROJECT", "OFFER", "GENERAL"] as const),
      outcome: pick(["CONTACT", "DEMO", "OFFER"] as const),
      comment: pick(comments),
    });
    vCount++;
  }

  // Earlier-year visits for Ηλίας (so year view has volume)
  for (let m = 1; m <= 9; m++) {
    const count = int(35, 55);
    for (let k = 0; k < count; k++) {
      const doc = pick(iliasDoctors);
      visits.push({
        id: `v-${2026}${String(m).padStart(2, "0")}-${k}`,
        doctorId: doc.id,
        userId: U.ilias,
        date: isoDate(2026, m, int(1, 28)),
        contactMethod: pick(["VISIT", "VISIT", "PHONE", "EMAIL"] as const),
        topic: pick(["GENERAL", "EQUIPMENT", "PROJECT", "OFFER"] as const),
        outcome: pick(["NONE", "CONTACT", "SEND_MATERIAL", "DEMO", "OFFER"] as const),
        comment: pick(comments),
      });
    }
  }
  // Μαρία Νικολάου visits (for the manager view)
  for (let m = 8; m <= 10; m++) {
    for (let k = 0; k < int(20, 30); k++) {
      const doc = pick(mariaDoctors);
      visits.push({
        id: `v-m-${m}-${k}`,
        doctorId: doc.id,
        userId: U.maria,
        date: isoDate(2026, m, int(1, 23)),
        contactMethod: pick(["VISIT", "PHONE"] as const),
        topic: pick(["GENERAL", "PROJECT"] as const),
        outcome: pick(["CONTACT", "OFFER"] as const),
        comment: pick(comments),
      });
    }
  }

  // Projects: 10 doctors with a NEW project in October 2026 (OCT + Occulera for Παπαδόπουλος count as one doctor)
  // → 9 more doctors. Plus 5 projects closed in October (3 won, 2 lost) created in September.
  let seqNo = 143;
  const candidates = iliasDoctors.filter((d) => d.id !== D.papadopoulos);
  const newProjectDocs = candidates.slice(0, 9);
  const stages = ["INTEREST", "OFFER", "DEMO", "NEGOTIATION"] as const;
  newProjectDocs.forEach((doc, i) => {
    const prod = pick(prods);
    const code = seqNo === 150 ? ++seqNo : seqNo; // 150 is Occulera
    seqNo = code + 1;
    const created = isoDate(2026, 10, int(1, 22));
    const disc = pick([0, 5, 7, 10]);
    const price = Math.round(prod.floorPrice * (1 - disc / 100));
    const stage = stages[i % stages.length];
    const hasOffer = stage !== "INTEREST";
    const pid = `p-gen-${code}`;
    projects.push({
      id: pid,
      code: prCode(code),
      doctorId: doc.id,
      userId: U.ilias,
      type: pick(["NEW_CLINIC", "REPLACEMENT", "PUBLIC_TENDER"] as const),
      title: prod.name.split(" ").slice(0, 2).join(" "),
      stage,
      status: "ACTIVE",
      value: hasOffer ? price : 0,
      lastOfferDate: hasOffer ? created : undefined,
      notes: "",
      createdAt: ts(created, int(9, 17)),
      lines: [{ lineNo: 1, productCode: prod.code, qty: 1, floorPrice: prod.floorPrice, discountPct: disc, specialDiscountPct: 0, offerPrice: price }],
    });
    events.push({ id: `ev-${pid}-1`, projectId: pid, date: ts(created, 9), type: "CREATED", title: "Δημιουργία Project", description: `Ενδιαφέρον για ${prod.name}`, userId: U.ilias });
    if (hasOffer) {
      // i===1 → offer PRICED by support, not yet acknowledged (shows in «Εκκρεμείς προσφορές από τμήμα υποστήριξης»)
      // i===3 → offer still REQUESTED (shows in the Support queue)
      const status: Offer["status"] = i === 1 ? "PRICED" : i === 3 ? "REQUESTED" : "SENT";
      offers.push({
        id: `o-${pid}`,
        projectId: pid,
        doctorId: doc.id,
        number: qNumber(code),
        version: 1,
        date: created,
        title: prod.name,
        status,
        total: price,
        requestedBy: U.ilias,
        requestedAt: ts(created, 10),
        answeredBy: status === "REQUESTED" ? undefined : U.support,
        answeredAt: status === "REQUESTED" ? undefined : ts(created, 15),
        acknowledgedAt: status === "SENT" ? ts(created, 16) : undefined,
        lines: [{ lineNo: 1, productCode: prod.code, qty: 1, floorPrice: prod.floorPrice, discountPct: disc, specialDiscountPct: 0, offerPrice: price }],
      });
      events.push({ id: `ev-${pid}-2`, projectId: pid, date: ts(created, 10), type: "OFFER_REQUESTED", title: "Αίτημα προσφοράς", description: `Αίτημα προς τμήμα υποστήριξης (${qNumber(code)})`, userId: U.ilias });
      if (status === "SENT") {
        events.push({ id: `ev-${pid}-3`, projectId: pid, date: ts(created, 16), type: "OFFER_SENT", title: "Αποστολή προσφοράς", description: `Προσφορά ${price.toLocaleString("el-GR")} €`, userId: U.ilias });
        tasks.push({ id: `t-${pid}`, doctorId: doc.id, projectId: pid, userId: U.ilias, title: `Follow-up προσφοράς ${prod.name}`, dueDate: daysFromToday(int(-3, 10)), status: "OPEN", source: "FOLLOW_UP" });
      }
    }
  });

  // Closed in October: 3 won, 2 lost (created September)
  const closedDocs = candidates.slice(9, 14);
  closedDocs.forEach((doc, i) => {
    const prod = pick(prods);
    const code = 120 + i;
    const won = i < 3;
    const created = isoDate(2026, 9, int(1, 25));
    const closed = isoDate(2026, 10, int(2, 22));
    const pid = `p-closed-${code}`;
    const price = Math.round(prod.floorPrice * 0.95);
    projects.push({
      id: pid,
      code: prCode(code),
      doctorId: doc.id,
      userId: U.ilias,
      type: pick(["NEW_CLINIC", "REPLACEMENT"] as const),
      title: prod.name.split(" ").slice(0, 2).join(" "),
      stage: won ? "WON" : "LOST",
      status: "CLOSED",
      value: price,
      lastOfferDate: isoDate(2026, 9, 28),
      notes: "",
      createdAt: ts(created, 10),
      closedAt: ts(closed, 12),
      lines: [
        {
          lineNo: 1,
          productCode: prod.code,
          qty: 1,
          floorPrice: prod.floorPrice,
          discountPct: 5,
          specialDiscountPct: 0,
          offerPrice: price,
          won,
          competitor: won ? "" : pick(["OMMALITE", "OptiMed", "Eyetech"]),
          competitorModel: won ? "" : "Ultra",
          competitorPrice: won ? null : Math.round(price * 0.92),
          closeComments: won ? "Κέρδισε η καλύτερη εξυπηρέτηση." : "Του έδωσε και εγγύηση 5 έτη",
        },
      ],
    });
    events.push({ id: `ev-${pid}-1`, projectId: pid, date: ts(created, 10), type: "CREATED", title: "Δημιουργία Project", description: `Ενδιαφέρον για ${prod.name}`, userId: U.ilias });
    events.push({ id: `ev-${pid}-2`, projectId: pid, date: ts(isoDate(2026, 9, 28), 12), type: "OFFER_SENT", title: "Αποστολή προσφοράς", description: `Προσφορά ${price.toLocaleString("el-GR")} €`, userId: U.ilias });
    events.push({ id: `ev-${pid}-3`, projectId: pid, date: ts(closed, 12), type: "CLOSED", title: "Κλείσιμο project", description: won ? "Κερδισμένο" : "Χαμένο – ανταγωνισμός", userId: U.ilias });
    offers.push({
      id: `o-${pid}`,
      projectId: pid,
      doctorId: doc.id,
      number: qNumber(code),
      version: 1,
      date: isoDate(2026, 9, 28),
      title: prod.name,
      status: "SENT",
      total: price,
      closed: won ? "YES" : "NO",
      requestedBy: U.ilias,
      requestedAt: ts(created, 11),
      answeredBy: U.support,
      answeredAt: ts(isoDate(2026, 9, 27), 15),
      acknowledgedAt: ts(isoDate(2026, 9, 28), 12),
      lines: [{ lineNo: 1, productCode: prod.code, qty: 1, floorPrice: prod.floorPrice, discountPct: 5, specialDiscountPct: 0, offerPrice: price }],
    });
  });

  // Μαρία: a couple of projects
  mariaDoctors.slice(0, 3).forEach((doc, i) => {
    const prod = pick(prods);
    const code = 160 + i;
    const pid = `p-maria-${code}`;
    const created = isoDate(2026, 10, int(1, 20));
    projects.push({
      id: pid,
      code: prCode(code),
      doctorId: doc.id,
      userId: U.maria,
      type: "REPLACEMENT",
      title: prod.name.split(" ").slice(0, 2).join(" "),
      stage: "OFFER",
      status: "ACTIVE",
      value: prod.floorPrice,
      lastOfferDate: created,
      notes: "",
      createdAt: ts(created, 11),
      lines: [{ lineNo: 1, productCode: prod.code, qty: 1, floorPrice: prod.floorPrice, discountPct: 0, specialDiscountPct: 0, offerPrice: prod.floorPrice }],
    });
    events.push({ id: `ev-${pid}-1`, projectId: pid, date: ts(created, 11), type: "CREATED", title: "Δημιουργία Project", description: `Ενδιαφέρον για ${prod.name}`, userId: U.maria });
  });

  // Check-ins (manager-only data)
  const ciDocs = [D.papadopoulos, D.ioannou, ...iliasDoctors.slice(2, 8).map((d) => d.id)];
  ciDocs.forEach((docId, i) => {
    const date = daysFromToday(-i);
    const h = 9 + (i % 6);
    const arr = ts(date, h, int(0, 50));
    const dep = ts(date, h, 0);
    const depDate = new Date(dep);
    depDate.setMinutes(depDate.getMinutes() + int(25, 70) + int(0, 50));
    checkIns.push({
      id: `ci-${i}`,
      doctorId: docId,
      userId: U.ilias,
      arrivedAt: arr,
      departedAt: i === 0 ? undefined : depDate.toISOString(),
      arriveLat: 37.97 + rnd() * 0.08,
      arriveLng: 23.72 + rnd() * 0.08,
      departLat: i === 0 ? undefined : 37.97 + rnd() * 0.08,
      departLng: i === 0 ? undefined : 23.72 + rnd() * 0.08,
    });
  });
  mariaDoctors.slice(0, 3).forEach((doc, i) => {
    const date = daysFromToday(-i - 1);
    checkIns.push({
      id: `ci-m-${i}`,
      doctorId: doc.id,
      userId: U.maria,
      arrivedAt: ts(date, 11 + i, 10),
      departedAt: ts(date, 11 + i, 55),
      arriveLat: 40.63 + rnd() * 0.05,
      arriveLng: 22.94 + rnd() * 0.05,
      departLat: 40.63 + rnd() * 0.05,
      departLng: 22.94 + rnd() * 0.05,
    });
  });

  return { visits, projects, events, offers, tasks, checkIns };
}

// ---------- targets & turnover (SoftOne later) ------------------------------

function targets(): Target[] {
  const t: Target[] = [];
  for (const [uid, monthly, yearly] of [
    [U.ilias, 150000, 1500000],
    [U.maria, 110000, 1100000],
  ] as const) {
    t.push({ userId: uid, year: 2026, month: 0, amount: yearly });
    for (let m = 1; m <= 12; m++) t.push({ userId: uid, year: 2026, month: m, amount: monthly });
    t.push({ userId: uid, year: 2025, month: 0, amount: yearly * 0.9 });
    for (let m = 1; m <= 12; m++) t.push({ userId: uid, year: 2025, month: m, amount: monthly * 0.9 });
  }
  return t;
}

function salesTurnover(): SalesTurnover[] {
  const rows: SalesTurnover[] = [];
  const ilias2026 = [98000, 112000, 135000, 90000, 142000, 128000, 76000, 54000, 131000, 120000];
  ilias2026.forEach((amount, i) => rows.push({ userId: U.ilias, year: 2026, month: i + 1, amount }));
  for (let m = 1; m <= 12; m++) rows.push({ userId: U.ilias, year: 2025, month: m, amount: int(80000, 140000) });
  const maria2026 = [70000, 82000, 95000, 61000, 103000, 88000, 52000, 40000, 97000, 84000];
  maria2026.forEach((amount, i) => rows.push({ userId: U.maria, year: 2026, month: i + 1, amount }));
  for (let m = 1; m <= 12; m++) rows.push({ userId: U.maria, year: 2025, month: m, amount: int(60000, 100000) });
  return rows;
}

// ---------- entry point ----------------------------------------------------

export async function seedIfEmpty() {
  if (collectionExists("users")) return;
  await seedAll();
}

export async function seedAll() {
  const docs = doctors();
  const prods = products();
  const gen = generated(docs, prods);
  await writeCollection("users", users());
  await writeCollection("doctors", docs);
  await writeCollection("consents", papadopoulosConsent());
  await writeCollection("equipment", papadopoulosEquipment());
  await writeCollection("visits", gen.visits);
  await writeCollection("projects", [...papadopoulosProjects(), ...gen.projects]);
  await writeCollection("project_events", [...papadopoulosEvents(), ...gen.events]);
  await writeCollection("follow_ups", papadopoulosFollowUps());
  await writeCollection("offers", [...papadopoulosOffers(), ...gen.offers]);
  await writeCollection("tasks", [...papadopoulosTasks(), ...gen.tasks]);
  await writeCollection("check_ins", gen.checkIns);
  await writeCollection("products", prods);
  await writeCollection("doctor_history", papadopoulosHistory());
  await writeCollection("targets", targets());
  await writeCollection("sales_turnover", salesTurnover());
}
