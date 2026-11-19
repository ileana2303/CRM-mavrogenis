# SoftOne JS endpoints for the Sales CRM — the integration contract

Follows the convention of the existing `api.crm.customers` script (Postman collection `mavrogenis`):

```
POST https://mavrogenis.oncloud.gr/s1services/JS/<script>/<function>
{ "clientID": "<from login+authenticate>", ...params }

→ { "success": true, "data": [ ...rows ], "page"?, "pageSize"?, "totalCount"? }
→ { "success": false, "error": "...", "errorcode": -1 }
```

Conventions kept from your script: **lowercase SoftOne column names** in rows (`trdr`, `afm`, `phone02`…),
`data` is always an **array** (one element for single-record calls), paging with `page / pageSize / totalCount`,
`q` for free-text search. Dates as `YYYY-MM-DD`, timestamps as `YYYY-MM-DD HH:MM:SS` (server local time =
**Europe/Athens, no zone** — the CRM reads every SoftOne date as Athens time via `src/lib/athens.ts`; the app servers run in UTC).
Lookup values as integers (code lists in section 10); the CRM maps them.

Auth is the standard `login` (`appid: 1306`) + `authenticate` (`COMPANY 1001, BRANCH 1000, REFID` from `objs[0]`) per user.
**Standard services (`getData`, `setData`, `getBrowserInfo`…) work with appid 1306 as long as `appid` is in every request body.**
Writes to standard objects (CUSTOMER, SALDOC) therefore go through `setData` directly from the CRM; JS functions are for reads and custom tables.

Existing and used ✔ (2026-11-16): `api.crm/me`, `api.crm/users`, `api.crm/bootstrap`, `api.crm/dashboard`,
`api.crm/hospitals`, `api.crm.customers/list | getData | setSignature | projects`, `api.crm.actions/getPendings |
getPendingArrivals`, `api.crm.offers/list`, `api.crm.products/list`; standard `getData` / `setData` / `calculate` on
CUSTOMER, PRJC, SALDOC, SOMEETING, SOTASK with form `_CRM_` where stated.
The CRM uses SoftOne as its **only** data source; any repo method without an endpoint yet throws `NotImplemented` and its
screen shows «Σύντομα διαθέσιμο» (`src/lib/features.ts`). State and open items: [`HANDOFF.md`](../HANDOFF.md).

---

## 1. `api.crm` — auth & bootstrap
Auth: standard `login` (`appid: 1306`) + `authenticate` (`COMPANY 1001`, `BRANCH 1000`, **`REFID` from the login
response `objs[0].REFID`** — it differs per user). The CRM keeps the clientID in its session cookie.

| fn | params | returns |
|---|---|---|
| `me` ✔ | — | `{ success, role (1 Πωλητής / 2 Manager / 3 Υποστήριξη), prsn, name }` — PRSN is the salesman identity (TRDR.SALESMAN points to it) |
| `bootstrap` ✔ | — | `{ success, dRank, cusUtbl05, machine: {categories, marks, models}, prjc: {prjState, prjCategory} }` — every list `[{id, code, name, isActive}]` (`isActive` = selectable). dRank: 1 Ειδικευόμενος, 2 Επιμελητής, 3 Διευθυντής, 4 Καθηγητής. prjState (pipeline, kept in this order): 1000 Ενδιαφέρον, 1010 Demo / Επίδειξη, 1020 Αίτημα προσφοράς, 1030 Προσφορά εστάλη, 1040 Διαπραγμάτευση, 1050 Σε αναμονή, 1060 Κερδήθηκε, 1080 Χάθηκε. prjCategory: 1000 New Clinic, 1001 Replacement, 1002 Public Tender. Cached 5 min by the CRM. **Wanted:** `isClosed` / `isWon` on prjState. |
| `users` | `role?` | `data: [{ userid, prsn, name, role, salesman, manager }]` — managers need the list of salespeople |

## 2. `api.crm.customers` ✔ — doctors are TRDR (SODTYPE 13), field names as in your script
Row (list ✔): `{ trdr, code, name, afm, email, phone01, phone02, mobilePhone (TRDEXTRA.VARCHAR03), isDoctor, guid }`
Row (getData ✔): + `actType (CCCACTTYPE), dRank (CCCDRANK id), hospitals[{trdr, trdRel, trdRel_customer_code, trdRel_customer_name, linenum}]` (detail CCCTRDTRDR; trdRel = the hospital's TRDR)

| fn | params | note |
|---|---|---|
| `list` ✔ | `q, name, afm, email, phone01, phone02, mobilePhone, isDoctor, page, pageSize` | **please add to the row**: `firstName, lastName, address, city, zip, salesman, dRank, insDate, updDate` ✔ (done). Escape `'` in the LIKE values (`replace(/'/g,"''")`) — the CRM sends user input. |
| `getData` ✔ | `trdr` | **please add the same columns as `list`** (`firstName, lastName, address, city, zip, salesman, insDate, updDate`) plus `dRankCode (CCCDRANK.code)` — today getData returns fewer fields than list |
| ~~`save`~~ | — | **Not needed.** The CRM writes doctors with standard `setData` on object `CUSTOMER`: tables `CUSTOMER` (NAME, CCCFNAME, CCCLNAME, AFM, EMAIL, ADDRESS, CITY, ZIP, CCCACTTYPE, CCCDRANK, CCCISDOCTOR=1) and `CUSEXTRA` (VARCHAR03 = mobile). Hospitals: detail `CCCTRDTRDR` `[{TRDREL, LINENUM}]` (TRDREL = hospital TRDR) with the general detail rules. `SALESMAN` = PRSN id. |
| `projects` ✔ | `trdr, page?, pageSize?` | `{ totalCount, data: [{ prjc, code, name, isActive, prjState, prjCategory, insDate, updDate }] }` — the doctor's PRJC rows; the CRM pages until totalCount. prjState / prjCategory = ids into `api.crm/bootstrap` `prjc.{prjState, prjCategory}` `{id, code, name, isActive}`; left out when empty. Value / last offer / lines are not in the row yet. |
| `getConsent` | `trdr` | `{ id, trdr, signername, signature (base64 png), chemail, chsms, chphone, chviber, signedat, userid }` |
| `saveConsent` | same fields, no id | `{ id }` |

Values: `actType` plain int 1 Ιδιώτης / 2 Δημόσιος ✔; `dRankCode` "1" Ειδικευόμενος, "2" Επιμελητής, "3" Διευθυντής, "4" Καθηγητής (CCCDRANK.code).

## 2a. Συγκατάθεση γιατρού ✔ — `api.crm.customers/setSignature` (decided 2026-11-10)
| fn | params | returns |
|---|---|---|
| `setSignature` ✔ | `trdr`, `data` (PNG as base64, no data-URL prefix), `size` (bytes), `name` (who signed) | `{ success }` — verified on a temp customer |

Read ✔: `api.crm.customers/getData` returns `signatures: [{ name: "SIGNATURE_<signer>_<unix ms>.png", sofname, crtDate (Greek local time, no zone), sodata: <base64> }]` (verified 2026-11-10 on 34583, 97 KB). The CRM takes the newest by the timestamp in the file name and shows signer + date from it. Note: every `getData` now carries the full PNGs — if that gets heavy, add a `withSignatures` flag or return `sodata` only on request. The consent **channels** (email / sms / τηλέφωνο / viber) have no SoftOne field yet — your call where they go.
**Open (2026-11-17):** the signature file records neither the channels nor the app user who saved it, so the CRM shows
only date + signer and does not show channels (it used to show them all as «Όχι»). Proposal: `setSignature` takes
`channels` (+ `prsn`) and getData returns them, or four fields on the customer.

## 3. `api.crm/hospitals` ✔ — hospitals = TRDR of the hospital category
| fn | params | row |
|---|---|---|
| `hospitals` ✔ | `q?` | `{ trdr, code, name, isActive }` (verified 2026-11-16, 233 rows) — linked to doctors via the CCCTRDTRDR detail of CUSTOMER (TRDREL, form `_CRM_`); link/unlink round-trip verified on 34583. A hospitals-only change sends only `{CCCTRDTRDR:[…]}`. |

## 3a. Projects — PRJC ✔ (2026-11-16)

| step | call |
|---|---|
| list (per doctor) | `api.crm.customers/projects {trdr, page, pageSize}` → `{ totalCount, data: [{ prjc, code, name, isActive, prjState, prjCategory, insDate, updDate }] }`; the CRM pages until `totalCount`; empty prjState / prjCategory are left out of the row |
| one project | standard `getData` object `PRJC`, `form: "_CRM_"`, `key: <prjc>` → `PRJC[0]` (CODE, NAME, TRDR, PRJCATEGORY "1001\|Replacement", PRJSTATE "1000\|Ενδιαφέρον", SALESMAN + `SALESMAN_PRSNIN_NAME/NAME2`, REMARKS, ISACTIVE, INSDATE, UPDDATE) and `VOPPOFFS` (the project's offers: FINDOC, FINCODE, SERIES, TFPRMS, TRNDATE, LNETAMNT, APPRV, ISCANCEL, REMARKS) |
| new project | `setData` object `PRJC`, `form: "_CRM_"`: `{ "PRJC": [{ "CODE": "0*", "PRJCRM": 2, "NAME", "TRDR", "PRJCATEGORY", "PRJSTATE", "REMARKS"?, "SALESMAN": <session PRSN> }] }` |
| stage change | `setData` `PRJC`, `key: <prjc>`, `form: "_CRM_"`, `{ "PRJC": [{ "PRJSTATE": <id> }] }` (header delta only) |

Rules (verified): `CODE "0*"` — plain `"*"` is refused («Δεν έχετε συμπληρώσει το πεδίο 'Κωδικός'»). **`PRJCRM` must come
right after `CODE`**; sent later, PRJCATEGORY and PRJSTATE are silently not stored. `PRJCRM` is always 2 on new records.
`isActive` means selectable in SoftOne, not open / closed.

## 4–6. Activities — DECIDED 2026-11-10: they live in **SOACTION** (objects SOMEETING, SOCALL, SOEMAIL, SOTASK, SOACTION)

### Proposed mapping (2026-11-10 proposal — the **Project** rows are superseded: projects are PRJC, see §3a; offers are
SALDOC linked by `PRJC`, see §7. Visits / follow-ups below are still open.)

| CRM entity | SoftOne object | Standard fields | Custom fields (CCC…) |
|---|---|---|---|
| Επίσκεψη (slide 12) | `SOMEETING` if Τρόπος = Επίσκεψη, `SOCALL` if Τηλέφωνο, `SOEMAIL` if Email | TRDR, ACTOR = PRSN of the salesperson, TRNDATE, FROMDATE/FINALDATE, COMMENTS = σχόλιο, ACTSTATUS | `CCCTOPIC` (1–4), `CCCOUTCOME` (1–5), `CCCNEXTDATE` (ημ. επόμενης ενέργειας), `CCCPROJECT` (→ SOACTION id of the project, optional) |
| Project / Ευκαιρία (slides 13–15) | `SOACTION` in a dedicated series «CRM Project» | TRDR, ACTOR, TRNDATE = δημιουργία, COMMENTS = παρατηρήσεις, ACTSTATUS = ενεργό/ολοκληρώθηκε, FINALDATE = κλείσιμο | `CCCTITLE`, `CCCPRJTYPE` (1–3), `CCCSTAGE` (1–7), `CCCVALUE` (decimal), `CCCLASTOFFERDATE`. **Lines** (κωδικός, ποσότητα, floor, εκπτώσεις, τιμή, won/competitor…): either SOACTION item lines if the object supports them, or they stay only on the SALDOC offers — your call |
| Follow-up (slide 16) | `SOCALL` / `SOMEETING` / `SOEMAIL` by Τρόπος (Online → `SOCALL`) | TRDR, ACTOR, TRNDATE, COMMENTS, FINALDATE = ημ. επόμενης ενέργειας | `CCCPROJECT` (required), `CCCRESULT` (1–4), `CCCNEXTACTION` (1–5) |
| Εκκρεμότητα (slide 21) | `SOTASK` | TRDR, ACTOR, COMMENTS = ενέργεια, FINALDATE = προθεσμία, ACTSTATUS = ανοιχτή/ολοκληρωμένη | `CCCPROJECT` (optional), `CCCSOURCE` (1–4) |
| Ιστορικό project (timeline, slide 15) | **derived**: every action with `CCCPROJECT` = project id + the SALDOC offers with `CCCPROJECT` = project id, ordered by date | — | — |
| Κλείσιμο project (slide 18) | update of the project `SOACTION` (ACTSTATUS, CCCSTAGE won/lost/partial) | | per-line competitor data: on the SALDOC offer lines (`CCCWON`, `CCCCOMPETITOR`, `CCCCOMPMODEL`, `CCCCOMPPRICE`, `CCCCLOSECOMMENTS`) or on project lines — same decision as above |

Still needing a home (not SOACTION): **Εξοπλισμός** (CCCCRMEQUIP custom table, spec §2.1), **Συγκατάθεση GDPR** (CCCCRMCONSENT, §2.7), **Άφιξη/Αναχώρηση** (CCCCRMCHECKIN, §2.8 — or a `SOMEETING` with FROMDATE/FINALDATE as arrival/departure plus `CCCLAT/CCCLNG`). Your call.

ACTSTATUS codes, series ids per object and the ACTOR semantics (PRSN?) must come from you.

### Endpoints I need (reads via your scripts, writes via setData)
| Script | fn | params | row |
|---|---|---|---|
| `api.crm.actions` | `list` | `trdr?`, `actor?`, `cccproject?`, `object?` (SOMEETING…), `from?`, `to?` (TRNDATE), `actstatus?`, `page`, `pageSize` | `{ soaction, object, series, trnDate, fromDate, finalDate, trdr, actor, comments, actStatus, ccc…(all CRM fields) }` |
| `api.crm.actions` | `getData` | `soaction` | same row + lines if the project object carries lines |
| `api.crm.actions` | `projects` | `trdr?`, `actor?`, `actstatus?` | project rows (series «CRM Project») with `offersCount`, `lastOfferDate` |
| `api.crm.actions` | `timeline` | `cccproject` | union of actions + offers for the project, ordered by date |
| `api.crm.equipment` | `list` / `replace` | `trdr` | spec §2.1 |
| `api.crm.consent` | `get` / `save` | `trdr` | spec §2.7 |
| `api.crm.checkins` | `open` / `list` | `userid`, `trdr`, `from`, `to` | spec §2.8 (writes via setData on the chosen object/table) |

## 7. Offers — SALDOC ✔ — reads cover **all** offer series of the doctor (decided 2026-11-10); the CRM **writes only to series 7015** («OFFCRM»)

### New offer inside a project (built 2026-11-16)

| step | call |
|---|---|
| product search | `api.crm.products/list {q, page: 1, pageSize: 20}` (5.527 items — searched as you type, never preloaded; the CRM shows "found N, showing 20") |
| live preview | standard `calculate` object `SALDOC`, `form: "_CRM_"`, **same `data` as the save**; nothing is stored. Returns getData-shaped `SALDOC` (NETAMNT, VATAMNT, SUMAMNT) and `ITELINES` (PRICE, DISC1PRC, DISC1VAL, LINEVAL, VATAMNT, VAT_VAT_PERCNT) |
| save | `setData` `SALDOC`, `form: "_CRM_"`: `{ "SALDOC": [{ "SERIES": 7015, "TRDR", "PRJC", "SALESMAN": <session PRSN>, "COMMENTS"? }], "ITELINES": [{ "LINENUM": 9000001…, "MTRL", "QTY1", "PRICE"?, one of "DISC1PRC" / "DISC1VAL" / "LINEVAL" }] }` |
| after save | `setData PRJC key {PRJSTATE: 1030}` «Προσφορά εστάλη» |

Pricing rules (verified with calculate): a line **without `PRICE`** gets SoftOne's price for this customer (e.g. MTRL
33116 → 18.165 = CCCPRICE01, not `floorPrice`); a typed `PRICE` is kept. Send **exactly one** of DISC1PRC / DISC1VAL /
LINEVAL: SoftOne keeps the price and derives the other two (LINEVAL overrides DISC1PRC when both are sent).
SoftOne approves the document at once (APPRV 1).

**Open:** for items whose `CCCPRICE01` is 0 (e.g. MTRL 36182, code 00000661) `calculate` resets a typed `PRICE 600` to
`0` — `{"MTRL":36182,"QTY1":1,"PRICE":600}` → PRICE 0, LINEVAL 0; only `LINEVAL 600` survives. Needs a SoftOne-side fix
(price rule / line script). Also open: print / PDF / email of the offer, the terms text (`REMARKS`, `CCCOFFERBODY`),
revision (in place vs new version), approval by support first.

### Read lists
| fn | params | row |
|---|---|---|
| `list` | `trdr?`, `project?`, `requestedby?`, `cccstatus?` (support queue = 1) | offer row with `lines[]` |
| `getData` | `findoc` | offer row with `lines[]` |
| ~~`create`~~ / ~~`update`~~ | — | **Not needed**: the CRM uses standard `setData` on `SALDOC` (`SALDOC:[{SERIES:7015, TRDR, TRNDATE, COMMENTS, CCC…}]`, `ITELINES:[{MTRL, QTY1, PRICE, DISC1PRC, DISC2PRC, CCCFLOORPRICE, CCCPREVPRICE}]`) and `getData` by FINDOC. Only the **read lists** above are needed as JS. |

Offer row: `{ findoc, fincode, trdr, cccproject, cccversion, trndate, sumamnt, cccstatus, cccrevreason, cccclosed, cccsupportnotes, cccrequestedby, insdate, cccansweredby, cccansweredat, cccacknowledgedat, comments }`.

## 8. Εκκρεμότητες ✔ — `SOTASK` series **3000** («ΕΚΚΡ», codes ΕΚΚΡ000001…) — decided 2026-11-10

| step | call |
|---|---|
| create | `setData` object `SOTASK`, `{ "SOACTION": [{ "SERIES": 3000, "TRDR", "PRJC"?: <project, optional>, "ACTPRSN": <prsn>, "COMMENTS": <ενέργεια>, "DUEDATE": "yyyy-mm-dd" (προθεσμία), "ACTSTATUS": 1 }] }` — verified (9179, deleted) |
| complete / reopen | `setData` `key: <soaction>`, `{ "SOACTION": [{ "ACTSTATUS": 3 }] }` (1 to reopen) — verified |
| read | `api.crm.actions/getPendings` `{ trdr, prsn, actStatus?: "1,2,3" }` → `{ soaction, series, trdr, trdr_customer_code, trdr_customer_name, prjc?, prjc_prjc_code?, prjc_prjc_name?, actStatus, comments, dueDate }` plus a top-level `projects` array (the customer's projects → the picker) — checked 2026-11-19 |

ACTSTATUS: 0 Αδιάφορο · 1 Προς έναρξη · 2 Σε εξέλιξη · 3 Ολοκληρώθηκε · 4 Ακυρώθηκε · 5 Σε αναμονή · 6 Σε αναβολή.
CRM shows 0/1/2/5/6 as open, 3 as done, hides 4.

**Needed from you in `getPendings`:**
1. `trdr` optional — the Αναφορά Ημέρας lists pending items per salesperson (`prsn` only). Today a missing `trdr` gives `Invalid column name 'undefined'`.
2. Add to the row: `dueDate` (προθεσμία → overdue logic), `trdr`, `actPrsn`, `soActionCode`, `trnDate`. Without `dueDate` every item shows as due "today".
3. ~~Project link~~ done 2026-11-19: `SOACTION.PRJC` (standard field, not CCCPROJECT).

### 8a. Επόμενη ενέργεια (2026-11-19) — row button «→ Επόμενη ενέργεια» next to «✓ Ολοκλήρωση»

One step: create the follow-up, **then** close the Εκκρεμότητα (`ACTSTATUS 3`). If the create is refused the task stays open.

| kind | object | series (env) |
|---|---|---|
| Τηλέφωνο | `SOCALL` | 1000 (`S1_CALL_SERIES`) |
| Email | `SOEMAIL` | 1003 (`S1_EMAIL_SERIES`) |
| Συνάντηση | `SOMEETING` | 2003 (`S1_MEETING_SERIES`) — same series as the dashboard's appointments |

Payload: `{ "SOACTION": [{ "SERIES", "TRDR", "ACTPRSN": <prsn>, "FROMDATE": "yyyy-mm-dd hh:mm" (Athens), "COMMENTS",
"SOACTIONS": <soaction of the Εκκρεμότητα>, "PRJC"?: <carried from the Εκκρεμότητα> }] }` — `SOACTION.SOACTIONS` links the follow-up to its source (your field, 2026-11-19).
Sent with the object's default form (no `form`).
**Not yet confirmed by you:** FROMDATE as the date field for all three, ACTSTATUS left to the series default.
Not verified against SoftOne yet.

### 8b. Ιστορικό ✔ — `api.crm.actions/getTimeline` (2026-11-19)

`{ soaction }` → `data: [{ soaction, trnDate, fromDate, code, comments, actStatus, series, objectType }]`, newest first:
the chain of actions linked to that soaction through `SOACTIONS` (checked on 9183 → itself + SOMEETING 9185).
Shown by the «Ιστορικό» button on every pending row (modal, loaded on open). A row without soaction/objectType/date
is an error, not skipped.

## 9. Άφιξη / Αναχώρηση ✔ — `SOMEETING` series **2001** (decided 2026-11-10)

| step | call |
|---|---|
| Άφιξη | `setData` object `SOMEETING`, `{ "SOACTION": [{ "SERIES": 2001, "TRDR": <trdr>, "ACTPRSN": <prsn of the login user>, "FROMDATE": "yyyy-mm-dd hh:mm" }] }` → `id` (SOACTION) — verified on 2001, record deleted |
| Αναχώρηση | `setData` object `SOMEETING`, `key: <id>`, `{ "SOACTION": [{ "FINALDATE": "yyyy-mm-dd hh:mm" }] }` — verified |
| open arrival | `api.crm.actions/getPendingArrivals` `{ trdr, prsn }` → arrivals without FINALDATE. **Currently broken:** `ScriptError: 'body' is undefined [Line: 23 Ofs: 2]` (the function does not read the request body the way the other scripts do). Expected row: `{ soaction, trdr, actprsn, fromdate, finaldate, soactioncode }` — any column casing is accepted |
| manager log (`/manager/check-ins`) | no endpoint yet → local mirror `data/check_ins.json` (also keeps lat/lng, which have no SoftOne field) |

Times are Greek local time (Europe/Athens). ACTSTATUS is left at 1.

## 10. `api.crm.stats` — SoftOne-native figures
| fn | params | row |
|---|---|---|
| `products` | `q?` — active MTRL (SODTYPE 51) | `{ mtrl, code, name, floorprice, category }` |
| `history` | `trdr` | `{ year, offersvalue, turnover, visits }` (turnover = net invoiced per calendar year) |
| `target` | `salesman, year, month` (0 = year) | `{ amount }` |
| `turnover` | `salesman, year, month` (0 = all months) | `{ month, amount }` |

### Code lists (integers in SoftOne; fixed in the app)
- equipment category: 1 OCT, 2 Περίμετρο, 3 Βιόμετρο, 4 Τοπογράφος, 5 Σχισμοειδής λυχνία, 6 Φακόμετρο, 7 Κάμερα βυθού, 8 Laser, 9 Μικροσκόπιο, 99 Άλλο
- visit contactmethod 1 Επίσκεψη 2 Τηλέφωνο 3 Email · topic 1 Γενική ενημέρωση 2 Εξοπλισμός 3 Project 4 Προσφορά · outcome 1 Καμία 2 Επικοινωνία 3 Αποστολή υλικού 4 Demo 5 Προσφορά
- prjtype 1 Νέο Ιατρείο 2 Αντικατάσταση 3 Δημόσιος διαγωνισμός · stage 1 Ενδιαφέρον 2 Προσφορά 3 Demo 4 Διαπραγμάτευση 5 Κερδισμένο 6 Χαμένο 7 Μερικώς · status 1 Ενεργό 2 Ολοκληρώθηκε
- evtype 1 Δημιουργία 2 Αίτημα προσφοράς 3 Αποστολή προσφοράς 4 Follow-up 5 Αναθεώρηση 6 Κλείσιμο 7 Σχόλιο
- follow-up contactmethod 1 Τηλέφωνο 2 Επίσκεψη 3 Email 4 Online · result 1 Θετικό 2 Αρνητικό 3 Αναμονή 4 Δεν απάντησε · nextaction 1 Νέο Follow-up 2 Demo 3 Αποστολή υλικού 4 Άλλο 5 Καμία
- offer cccstatus 1 Αίτημα 2 Τιμολογήθηκε 3 Στάλθηκε · cccclosed 1 Ναι 2 Όχι 3 Μερικώς
- doctor cccacttype 1 Ιδιώτης 2 Δημόσιος · cccrank 1 Ειδικευόμενος 2 Επιμελητής 3 Διευθυντής 4 Καθηγητής
- task status 1 Ανοιχτή 2 Ολοκληρωμένη · source 1 χειροκίνητη 2 επίσκεψη 3 follow-up 4 αίτημα προσφοράς
- crmrole 1 Πωλητής 2 Manager 3 Υποστήριξη

## 11. Build order (each step lights up screens in the CRM)
1. `api.crm.me/get` → CRM login against SoftOne.
2. `api.crm.customers` list/getData extended + `save`, `api.crm.hospitals/list`, `api.crm.stats/products` → customer screens.
3. `equipment`, `visits`, `tasks`, `checkins`.
4. `projects`.
5. `offers` on SALDOC.
6. `stats` history / target / turnover, `me/users`.
