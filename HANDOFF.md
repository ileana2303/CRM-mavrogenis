# Handoff — Diagnostic Equipment CRM Πωλητών

State on **2026-11-17** (last commit on `main`). Read this first, then
[`docs/SOFTONE-API.md`](docs/SOFTONE-API.md) for every SoftOne call the app makes.

## What it is

An iPad-first PWA (Next.js 15, App Router, Server Actions, Tailwind v4) for the field salespeople of Diagnostic
Equipment. **SoftOne is the only data source** — no local store, no database. Every user logs in with their own
SoftOne credentials; the session cookie carries their `clientID` and PRSN.

The SoftOne side (JS endpoints `api.crm.*`, forms `_CRM_`, series, master tables) is built and owned by
Panagiotis. The app never bypasses his endpoints for lists; standard `getData` / `setData` / `calculate` are used
where he decided so (below).

## What works today

| Area | Screens | SoftOne |
|---|---|---|
| Login, roles | `/login` | `login` + `authenticate`, `api.crm/me`, `api.crm/users` |
| Αναφορά Ημέρας | `/dashboard` | `api.crm/dashboard {prsn, fromDate, finalDate}` |
| Πελάτες (doctors) | search, card, create / edit | `api.crm.customers/list`, `/getData`; `setData CUSTOMER` form `_CRM_` (header delta only) |
| Νοσοκομεία | searchable picker on the doctor form | list `api.crm/hospitals` (TRDR rows); links = detail `CCCTRDTRDR {TRDREL, LINENUM}` |
| ΑΦΜ lookup | ΑΦΜ field on the doctor form | ΑΑΔΕ RgWsPublic2 (not SoftOne) — **codes rejected, see open items** |
| Συγκατάθεση | signature screen | `api.crm.customers/setSignature`; read `signatures[]` from getData (date + signer only — see open items) |
| Εξοπλισμός | `/customers/[id]/equipment` | getData `machines[]`; `setData CUSTOMER {CCCTRDMACHINES}`; catalog from `api.crm/bootstrap` |
| Άφιξη / Αναχώρηση | customer card | `SOMEETING` series 2001 (FROMDATE / FINALDATE); `api.crm.actions/getPendingArrivals` |
| Εκκρεμότητες | `/customers/[id]/pending` | `SOTASK` series 3000; `api.crm.actions/getPendings`. «→ Επόμενη ενέργεια» = SOCALL 1000 / SOEMAIL 1003 / SOMEETING 2003 + close (SOFTONE-API §8a, not verified yet) |
| **Projects – list** | `/customers/[id]/projects` | `api.crm.customers/projects {trdr, page, pageSize}`; type / stage names from `api.crm/bootstrap prjc` |
| **Projects – new** | `/customers/[id]/projects/new` | `setData PRJC` form `_CRM_` (rules below) |
| **Projects – screen + stage** | `/customers/[id]/projects/[pid]` | `getData PRJC _CRM_ key=prjc` (header + `VOPPOFFS` offers); `setData PRJC key {PRJSTATE}` |
| **Offers – new** | `/customers/[id]/projects/[pid]/offers/new` | live `calculate SALDOC _CRM_`; save `setData SALDOC _CRM_`; project → `PRJSTATE 1030` |
| Προσφορές Πελάτη (read) | `/customers/[id]/offers` | `api.crm.offers/list` |

Screens without a SoftOne endpoint show «Σύντομα διαθέσιμο» (`src/lib/features.ts` → `SOON`): visits, the old
project close / revise / follow-up screens, customer history, KPIs, the manager check-in log.

## Rules learned the hard way (do not "simplify" these)

**PRJC (projects)**
- New project: always `CODE: "0*"` (plain `"*"` is refused: «Δεν έχετε συμπληρώσει το πεδίο 'Κωδικός'»).
- **`PRJCRM: 2` must come right after `CODE`** in the record. Sent later, SoftOne silently drops `PRJCATEGORY` and
  `PRJSTATE`. Field order is kept in `projectToSetData` (`src/server/data/softone/mappers.ts`).
- `SALESMAN` = the session PRSN (`s1Prsn`); refuse to save without it.
- `isActive` on any SoftOne row = **selectable in SoftOne**, not open/closed.

**SALDOC (offers)**
- Series `S1_OFFER_SERIES` (7015 «OFFCRM»), `TRDR`, `PRJC`, `SALESMAN` = session PRSN; lines in `ITELINES`
  numbered 9000001+.
- `calculate` gets **the same payload as `setData`**; the screen shows SoftOne's prices, VAT and totals.
- A line **without a typed price is sent without `PRICE`** → SoftOne prices it (its rules; e.g. 18.165 for MTRL
  33116, not `floorPrice`).
- Exactly **one** of `DISC1PRC` / `DISC1VAL` / `LINEVAL` per line — the one typed last; SoftOne derives the other two
  (`LINEVAL` would override `DISC1PRC` if both were sent).
- «Αποθήκευση» is disabled until SoftOne has answered for the current lines.
- After the offer is saved the project moves to `PRJSTATE 1030` «Προσφορά εστάλη». If that second call fails the
  user lands on the project with a warning — never back on the form (a second save would duplicate the offer).

**CUSTOMER / detail tables**
- Header: send only the changed fields (delta). A patch with only `hospitals` sends only `CCCTRDTRDR`.
- Detail tables: send the whole table — kept lines `{LINENUM}`, changed `{LINENUM, …}`, removed = left out,
  new = `{…, LINENUM: 9000000+}`.

**Dates** — SoftOne sends Europe/Athens wall-clock time with no zone. Everything goes through `src/lib/athens.ts`
(`s1Date`, `fmtDate`, `fmtTime`, "today"). Vercel runs in UTC: never use `toISOString().slice(0,10)` for "today".

**Numbers** — inputs are Greek format («4.714,29»): `src/lib/gr-number.ts` (`parseGr` / `formatGr`). A lone dot is
a decimal point unless it reads like thousands (`1.500`). SoftOne always receives plain numbers.

**Pickers are modals** — every `Select` and the product search open `Modal` (`src/components/modal.tsx`, native
`<dialog>` **portalled to `<body>`**). Only the user menu in the top bar is a dropdown. No «Επιλέξτε…» *option* in a
list: use the `placeholder` prop for an empty field.

**`<label>` trap** — a `Field` is a `<label>`: a click anywhere inside it is forwarded to the first control in it. That
made the modal reopen after a choice and the signature wipe itself (the click after a stroke hit «Καθαρισμός»). Keep
modals portalled, and do not put a canvas / several buttons inside a `Field` — use a `<div>` with a `.label` span.

**Errors** — forms that write to SoftOne use `ActionForm` (`src/components/action-form.tsx`): the action returns
`{ error }`, the message shows as an alert and the form keeps what was typed. Never let a SoftOne refusal throw into
the error page. Missing SoftOne data is an error, never a silent «—» / empty fallback.

## Open items

Needs a decision or a SoftOne change from Panagiotis:

1. **Typed price reset to 0** — for items whose `CCCPRICE01` is 0 (e.g. MTRL 36182, code 00000661) `calculate` turns
   `PRICE 600` into `PRICE 0`; only `LINEVAL` survives. An offer could be saved at 0 €. Fix on the SoftOne side; until
   then the app should flag a line whose returned price differs from the typed one (not built yet).
2. **Offer document** — print / PDF / email from the app (`printDoc` layout or an endpoint), and where the terms
   text comes from (`REMARKS`, `CCCOFFERBODY`: series default or template).
3. **Offer approval** — SoftOne approves app offers immediately (`APPRV 1`). Should support check them first?
4. **Offer revision** — edit in place (`setData` with key) or new version document?
5. **`isClosed` / `isWon` on `prjState`** (bootstrap) — until then the hub counts won / lost projects too and the
   new-offer stage move is unconditional (it can move a project backwards from 1040+).
6. **Follow-up** — SOTASK 3001 linked to PRJC (field name), `prjc` in the dashboard follow-up rows.
7. **Closing a project** — lost reason and per-line competitor fields: where they are stored.
8. **«Προσφορές Πελάτη» → «Κλείστηκε» + OK** always fails (`offers.update` not built). Hide or define it.
9. **ΑΦΜ lookup** — the ΑΑΔΕ codes in `.env.local` are rejected (`RG_WS_PUBLIC_TOKEN_USERNAME_NOT_AUTHENTICATED`).
   Needs the «Ειδικοί Κωδικοί» of Diagnostic Equipment's own ΑΦΜ; add them to Vercel too.
10. **Vercel** — none of the 2026-11-16 work has run there yet. Check env vars (`S1_*`, `GSIS_*`) and do one real
    pass on production.
11. **Test data** on customer 34583: project 6071 «TEST CRM APP 2» and any OFFCRM test offers.
12. **Consent channels are not stored** — the Email / SMS / Τηλέφωνο / Viber a doctor ticks when signing go nowhere
    (`setSignature` takes only the PNG and the signer name), and the signature file does not record which app user
    saved it. The screen therefore shows date + signer only. GDPR record: add `channels` to `setSignature` (+ getData)
    or four fields on the customer.

## Working on it

- `npm run dev` on port 3000 (Panagiotis usually has it running — do not start a second dev server in the folder),
  `npm run typecheck`.
- Test on **iPad Air 13"**: 1024×1366 portrait and 1366×1024 landscape. Safari is WebKit: layout bugs that Chromium
  does not show are real (see the offer totals bar). Playwright has WebKit installed (`npx playwright install webkit`).
- SoftOne test logins are given in chat for a session — never write credentials to files.
- Commits are authored by Panagiotis Maniatakos only — no co-author trailers.
