# SoftOne requirements for the Sales CRM

Everything the CRM reads or writes goes through SoftOne Web Services (`/s1services`, JSON).
The app talks to a `SoftOneProvider` adapter; each adapter method below maps to one SoftOne call.
Field names are proposals. Keep the *meaning* and *codes*; rename columns if your conventions differ,
and tell me the final names so I can set the adapter mapping.

Conventions used here
- `CCC…` = custom table / custom field.
- Lookups are stored as integers; the code lists are fixed in the app (section 4). You can create SoftOne lookup tables for them if you want editable labels, but the integer codes must stay.
- Every custom table needs: `ID` (PK), `INSDATE`, `UPDDATE`, `INSUSER`, `UPDUSER` (SoftOne standard), plus a **Soft1 Object** so `getData` / `setData` work, and a **browser list** so `getBrowserInfo` / `getBrowserData` can filter it.

---

## 1. Standard tables + custom fields

### 1.1 USERS (SoftOne users)
| Field | Type | Meaning |
|---|---|---|
| `CCCCRMROLE` | int lookup | 1 = Πωλητής, 2 = Sales Manager, 3 = Τμήμα Υποστήριξης |
| `CCCSALESMAN` | link → SALESMAN | which salesperson this user is (role 1 only) |
| `CCCMANAGER` | link → USERS | the manager of this user (for manager dashboards) |

Login flow: `login` (username, password, appId) → `authenticate` (COMPANY, BRANCH, MODULE, REFID) → `clientID`.
After auth the app needs one call that returns: `USERS.ID`, `USERS.NAME`, `CCCCRMROLE`, `CCCSALESMAN`, `CCCMANAGER`.
Provide this as the named SQL `CRM_ME` (parameter: user id, or `:X.SYS.USER`).

### 1.2 TRDR / CUSTOMER (doctors are customers, SODTYPE = 13)
Standard fields used: `TRDR`, `CODE`, `NAME`, `AFM`, `EMAIL`, `ADDRESS`, `CITY`, `ZIP`, `PHONE01` (landline), `PHONE02` (**mobile**), `SALESMAN`, `ISACTIVE`.

| Custom field | Type | Meaning |
|---|---|---|
| `CCCISDOCTOR` | bool | filter: only these appear in the CRM (or use a TRDCATEGORY = "Ιατροί", your call) |
| `CCCFIRSTNAME` | string 50 | Όνομα (NAME keeps "Επώνυμο Όνομα" for SoftOne) |
| `CCCLASTNAME` | string 50 | Επώνυμο |
| `CCCACTTYPE` | int lookup | 1 = Ιδιώτης, 2 = Δημόσιος |
| `CCCHOSPITAL` | string 100 | Νοσοκομείο |
| `CCCRANK` | int lookup | 1 = Ειδικευόμενος, 2 = Επιμελητής, 3 = Διευθυντής, 4 = Καθηγητής |

Note: the CRM must be able to **save a doctor with ΑΦΜ or email empty** (spec: form proceeds even if required fields are missing). Do not make AFM mandatory on the CUSTOMER object for this series, or create doctors in a separate customer series with relaxed validation.

### 1.3 MTRL / ITEM (products, SODTYPE = 51)
Standard: `MTRL`, `CODE`, `NAME`, `ISACTIVE`, `PRICEW`.
| Custom field | Type | Meaning |
|---|---|---|
| `CCCFLOORPRICE` | decimal | Floor Price used in offers (if not simply `PRICEW`, tell me which) |
| `CCCCRMCATEGORY` | int lookup | equipment category (same list as Equipment: OCT, Περίμετρο, Βιόμετρο…) |

### 1.4 SALESMAN
No changes. Targets and turnover are keyed by `SALESMAN`.

---

## 2. Custom tables (one Soft1 Object each)

### 2.1 `CCCCRMEQUIP` — Εγκατεστημένος εξοπλισμός (slide 11)
| Field | Type |
|---|---|
| `TRDR` | link → TRDR |
| `CATEGORY` | int lookup (4.1) |
| `MANUFACTURER` | string 60 |
| `MODEL` | string 60 |
| `PURCHYEAR` | int |
| `SERVICECONTRACT` | bool |
| `SERIALNUM` | string 60 (empty now; needed by the future Service module) |
| `MTRL` | link → MTRL, nullable (if the device is one of our items) |

### 2.2 `CCCCRMVISIT` — Επίσκεψη (slide 12)
| Field | Type |
|---|---|
| `TRDR` | link |
| `SALESMAN` | link |
| `VISITDATE` | datetime |
| `CONTACTMETHOD` | int (4.2) |
| `TOPIC` | int (4.3) |
| `OUTCOME` | int (4.4) |
| `NEXTDATE` | date, nullable |
| `COMMENTS` | memo |
| `PROJECT` | link → CCCCRMPROJECT, nullable |

### 2.3 `CCCCRMPROJECT` — Ευκαιρία / Project (slides 13–15, 18)
| Field | Type |
|---|---|
| `CODE` | string 20, unique — `PR-2026-0142` (app generates; see 5.3) |
| `TRDR` | link |
| `SALESMAN` | link |
| `PRJTYPE` | int (4.5) |
| `TITLE` | string 100 |
| `STAGE` | int (4.6) |
| `STATUS` | int: 1 = Ενεργό, 2 = Ολοκληρώθηκε |
| `VALUE` | decimal — current offer value |
| `LASTOFFERDATE` | date, nullable |
| `NOTES` | memo — Παρατηρήσεις |
| `CLOSEDATE` | datetime, nullable |

Detail **`CCCCRMPROJECTLINE`** (lines + close-out, slides 14 and 18)
| Field | Type |
|---|---|
| `PROJECT` | link (master) |
| `LINENUM` | int |
| `MTRL` | link → MTRL |
| `QTY` | decimal |
| `FLOORPRICE` | decimal |
| `DISC1` | decimal % |
| `DISC2` | decimal % — Ειδική έκπτωση |
| `PRICE` | decimal — Τιμή προσφοράς (app computes) |
| `WON` | bool, nullable — Κλείσιμο Ναι/Όχι |
| `COMPETITOR` | string 60 |
| `COMPMODEL` | string 60 |
| `COMPPRICE` | decimal |
| `CLOSECOMMENTS` | memo |

Detail **`CCCCRMPROJECTEVENT`** (ΙΣΤΟΡΙΚΟ PROJECT, slide 15)
| Field | Type |
|---|---|
| `PROJECT` | link (master) |
| `EVDATE` | datetime |
| `EVTYPE` | int (4.9) |
| `TITLE` | string 100 |
| `DESCR` | memo |
| `USERID` | link → USERS |

### 2.4 Offers — DECIDED 2026-10-24: **SALDOC with a dedicated series**, not a custom table
One SALDOC document per offer **version** (V1, V2…), all in one series «Προσφορά CRM». The document number
(`FINCODE`) is the Q-number shown in the app; the app shows `FINCODE/V<CCCVERSION>`.
Support prices the same document and sets `CCCCRMSTATUS = 2`; the salesperson sets 3 when it is sent.

Header (`FINDOC`) custom fields:
| Field | Type | Meaning |
|---|---|---|
| `CCCPROJECT` | int → CCCCRMPROJECT.ID | the project this offer belongs to |
| `CCCVERSION` | int | 1, 2, 3… |
| `CCCCRMSTATUS` | int | 1 = Αίτημα, 2 = Τιμολογήθηκε (Support), 3 = Στάλθηκε |
| `CCCREVREASON` | memo | Αιτιολογία αναθεώρησης (required by the app for V2+) |
| `CCCCLOSED` | int, nullable | 1 Ναι, 2 Όχι, 3 Μερικώς |
| `CCCSUPPORTNOTES` | memo | notes Support returns with the price |
| `CCCREQUESTEDBY` | link → USERS | salesperson |
| `CCCANSWEREDBY` / `CCCANSWEREDAT` | link → USERS / datetime | Support |

Standard header fields used: `TRDR`, `TRNDATE`, `SERIES`, `FINCODE`, `SUMAMNT` (total), `COMMENTS` (Παρατηρήσεις).
Lines (`MTRLINES`): standard `MTRL`, `QTY1`, `PRICE`, `DISC1PRC` (Έκπτωση), `DISC2PRC` (Ειδική έκπτωση), `LINEVAL`;
custom `CCCFLOORPRICE` (decimal), `CCCPREVPRICE` (decimal, nullable – Προηγούμενη τιμή for V2+).

**Decided:** `SERIES = 7015` («Προσφορά CRM»); `DISC2PRC` is enabled → Ειδική έκπτωση maps to it.

The original custom-table proposal is kept below for reference only.

#### (superseded) `CCCCRMOFFER` custom table
| Field | Type |
|---|---|
| `PROJECT` | link |
| `TRDR` | link |
| `NUMBER` | string 20 — `Q-2026-0142` (same sequence as project) |
| `VERSION` | int — 1, 2, 3… |
| `OFFERDATE` | date |
| `STATUS` | int: 1 = Αίτημα (requested), 2 = Κοστολογήθηκε (priced by Support), 3 = Στάλθηκε |
| `TOTAL` | decimal |
| `REVREASON` | memo — Αιτιολογία αναθεώρησης (required for VERSION > 1) |
| `CLOSED` | int, nullable: 1 = Ναι, 2 = Όχι, 3 = Μερικώς |
| `REQUESTEDBY` | link → USERS |
| `REQUESTEDAT` | datetime |
| `ANSWEREDBY` | link → USERS, nullable |
| `ANSWEREDAT` | datetime, nullable |
| `FINDOC` | link → FINDOC, nullable — the SALDOC offer Support creates, if any |
| `TITLE` | string 100 — e.g. «OCT + Περίμετρο» |

Detail **`CCCCRMOFFERLINE`**
| Field | Type |
|---|---|
| `OFFER` | link (master) |
| `LINENUM` | int |
| `MTRL` | link |
| `QTY` | decimal |
| `FLOORPRICE` | decimal |
| `PREVPRICE` | decimal, nullable — Προηγούμενη τιμή (V2+) |
| `DISC1` | decimal % |
| `DISC2` | decimal % |
| `PRICE` | decimal |

Alternative you may prefer: use a real **SALDOC** series «Προσφορά CRM» with custom header fields `CCCPROJECT`, `CCCVERSION`, `CCCSTATUS`, `CCCREVREASON`, `CCCCLOSED` and line field `CCCFLOORPRICE`. Standard `MTRLINES.QTY1 / PRICE / DISC1PRC / DISC2PRC / LINEVAL` cover the rest. If you choose this, say so; the adapter changes, the app does not.

### 2.5 `CCCCRMFOLLOWUP` — Follow-up (slide 16)
| Field | Type |
|---|---|
| `PROJECT` | link |
| `FUDATE` | datetime (set by app) |
| `CONTACTMETHOD` | int (4.7) |
| `RESULT` | int (4.8) |
| `COMMENTS` | memo |
| `NEXTACTION` | int (4.10) |
| `NEXTDATE` | date, nullable |
| `USERID` | link → USERS |

### 2.6 `CCCCRMTASK` — Εκκρεμότητες (slide 21, and feeds Αναφορά Ημέρας)
| Field | Type |
|---|---|
| `TRDR` | link |
| `PROJECT` | link, nullable |
| `USERID` | link → USERS (owner) |
| `TITLE` | string 150 |
| `DUEDATE` | date |
| `STATUS` | int: 1 = Ανοιχτή, 2 = Ολοκληρωμένη ("Εκπρόθεσμη" = Ανοιχτή with DUEDATE < today, computed) |
| `DONEAT` | datetime, nullable |
| `SOURCE` | int: 1 = χειροκίνητη, 2 = από Επίσκεψη, 3 = από Follow-up, 4 = από Αίτημα προσφοράς |

### 2.7 `CCCCRMCONSENT` — Συγκατάθεση GDPR (slide 7)
| Field | Type |
|---|---|
| `TRDR` | link |
| `SIGNERNAME` | string 100 |
| `SIGNATURE` | memo/text — PNG as base64 data-URL (~10–40 KB). Blob/image field also fine; tell me which. |
| `CHEMAIL` | bool |
| `CHSMS` | bool |
| `CHPHONE` | bool |
| `CHVIBER` | bool |
| `SIGNEDAT` | datetime |
| `USERID` | link → USERS |

### 2.8 `CCCCRMCHECKIN` — Άφιξη / Αναχώρηση (slide 24, manager-only)
| Field | Type |
|---|---|
| `TRDR` | link |
| `USERID` | link → USERS |
| `ARRIVEDAT` | datetime |
| `DEPARTEDAT` | datetime, nullable |
| `ARRLAT`, `ARRLNG` | decimal(9,6), nullable |
| `DEPLAT`, `DEPLNG` | decimal(9,6), nullable |

Access: the Soft1 Object for this table should be readable only by role 2 users (or the app enforces it; both is better).

### 2.9 `CCCCRMTARGET` — Στόχοι
| Field | Type |
|---|---|
| `SALESMAN` | link |
| `YEAR` | int |
| `MONTH` | int, 0 = whole year |
| `AMOUNT` | decimal |

---

## 3. Named SQL for the `SqlData` service
Register these so the app calls `{"service":"SqlData","clientID":…,"SqlName":"CRM_…","param…":…}`.

| SqlName | Params | Returns |
|---|---|---|
| `CRM_ME` | user id | USERS.ID, NAME, CCCCRMROLE, CCCSALESMAN, CCCMANAGER |
| `CRM_DOCTOR_SEARCH` | firstName, lastName, afm, mobile (any subset, LIKE) | TRDR, NAME, CCCFIRSTNAME, CCCLASTNAME, PHONE02, ADDRESS, CITY, AFM, EMAIL |
| `CRM_PRODUCTS` | term | MTRL, CODE, NAME, floor price, CCCCRMCATEGORY — active items only |
| `CRM_TURNOVER_CUSTOMER_YEARS` | TRDR | YEAR, TURNOVER (net sales value from invoices, per calendar year) |
| `CRM_TURNOVER_SALESMAN` | SALESMAN, dateFrom, dateTo | TURNOVER (net invoiced value in period) |
| `CRM_TURNOVER_SALESMAN_DOCTORS` | SALESMAN, dateFrom, dateTo | TRDR, TURNOVER (for coverage drill-down later) |
| `CRM_TARGET` | SALESMAN, YEAR, MONTH | AMOUNT |
| `CRM_DAILY_REPORT` | USERID, dateFrom, dateTo | union of: visits with NEXTDATE in range, follow-ups with NEXTDATE in range, open tasks with DUEDATE < today, offers with STATUS = 2 not yet acknowledged — each row: KIND, TRDR, NAME, PROJECT, TITLE, DATE |
| `CRM_PENDING_COUNTS` | TRDR | open / overdue / done counts |
| `CRM_HISTORY` | TRDR | per YEAR: offers value (sum CCCCRMOFFER.TOTAL latest version), turnover, visits count |

Everything in CRM_DAILY_REPORT, CRM_PENDING_COUNTS and CRM_HISTORY the app can also compute itself from table reads; the SQL versions are for speed on tablets. Start with the first seven; the last three are optional.

---

## 4. Code lists (fixed in the app)
4.1 Equipment category: 1 OCT, 2 Περίμετρο, 3 Βιόμετρο, 4 Τοπογράφος, 5 Σχισμοειδής λυχνία, 6 Φακόμετρο, 7 Κάμερα βυθού, 8 Laser, 9 Μικροσκόπιο, 99 Άλλο
4.2 Visit contact method: 1 Επίσκεψη, 2 Τηλέφωνο, 3 Email
4.3 Visit topic: 1 Γενική ενημέρωση, 2 Εξοπλισμός, 3 Project, 4 Προσφορά
4.4 Visit outcome: 1 Καμία, 2 Επικοινωνία, 3 Αποστολή υλικού, 4 Demo, 5 Προσφορά
4.5 Project type: 1 Νέο Ιατρείο, 2 Αντικατάσταση εξοπλισμού, 3 Δημόσιος διαγωνισμός
4.6 Project stage: 1 Ενδιαφέρον, 2 Προσφορά, 3 Demo, 4 Διαπραγμάτευση, 5 Κερδισμένο, 6 Χαμένο, 7 Μερικώς κερδισμένο
4.7 Follow-up contact method: 1 Τηλέφωνο, 2 Επίσκεψη, 3 Email, 4 Online
4.8 Follow-up result: 1 Θετικό, 2 Αρνητικό, 3 Αναμονή, 4 Δεν απάντησε
4.9 Project event type: 1 Δημιουργία, 2 Αίτημα προσφοράς, 3 Αποστολή προσφοράς, 4 Follow-up, 5 Αναθεώρηση, 6 Κλείσιμο, 7 Σχόλιο
4.10 Next action: 1 Νέο Follow-up, 2 Demo, 3 Αποστολή υλικού, 4 Άλλο, 5 Καμία

---

## 5. Services and access

5.1 **Connection — DECIDED 2026-10-24.** `https://mavrogenis.oncloud.gr/s1services`, appId `1306`, COMPANY `1001`,
BRANCH `1000`, Series 6. Responses are gzip + `charset=windows-1253` (the client decodes by charset).
**Login is per user**: each salesperson/manager/support user logs in to the CRM with their own SoftOne
username/password; the app keeps the `clientID` in the session cookie. Each user needs web-service rights
and `CCCCRMROLE` set. MODULE/REFID: I take them from the `login` response (`objs`), unless you tell me fixed values.

5.2 **Objects exposed to setData/getData**: CUSTOMER (with the custom fields), ITEM (read only), and one object per table in section 2 with its detail tables (CCCCRMPROJECT → CCCCRMPROJECTLINE + CCCCRMPROJECTEVENT; CCCCRMOFFER → CCCCRMOFFERLINE). Browser lists on each with filters on TRDR, SALESMAN/USERID, STATUS, dates.

5.3 **Numbering — DECIDED 2026-10-24: no sequence table.**
- Project code = `PR-<year>-<CCCCRMPROJECT.ID padded to 4>` (e.g. record 142 created in 2026 → `PR-2026-0142`).
  SoftOne's own ID is unique, so two salespeople saving at the same moment can never get the same code.
  `CCCCRMPROJECT.CODE` is therefore **not needed** – drop that column.
- Offer number = the SALDOC series number (`FINCODE`), plus `/V<CCCVERSION>`. The slides' pairing
  (PR-2026-0142 ↔ Q-2026-0142) was a mock-up; the real pair is project ID ↔ document number.

5.4 **Dates/times**: send and accept ISO `YYYY-MM-DD HH:MM:SS`; the app shows `ΗΗ/ΜΜ/ΕΕΕΕ`.

5.5 **Service module (next version)**: nothing needed now. The CRM shows a «Service — Σύντομα διαθέσιμο» tile. When you are ready, `CCCCRMEQUIP.SERIALNUM` is the join key to the service-ticket objects from `NEW EBS V2.xlsx`.

