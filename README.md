# Diagnostic Equipment – CRM Πωλητών

iPad-first PWA for the field salespeople of Diagnostic Equipment. Built from
«Παρουσίαση CRM Πωλητών V1.pptx». UI is Greek only. **SoftOne is the only data source.**

Start with [`HANDOFF.md`](HANDOFF.md) (state, rules, open items) and [`docs/SOFTONE-API.md`](docs/SOFTONE-API.md)
(every SoftOne call).

## Run locally

```bash
npm install
cp .env.example .env.local   # SESSION_SECRET, S1_* (SoftOne), GSIS_* (ΑΑΔΕ ΑΦΜ lookup)
npm run dev                  # http://localhost:3000
```

Log in with a **SoftOne** user (the CRM role comes from `api.crm/me`). There are no demo users and no local data.

Other commands:

```bash
npm run build && npm start   # production build (service worker is only registered in production)
npm run typecheck            # tsc --noEmit
npm run icons                # regenerate public/icons/*.png
```

Install as an app: Safari iPadOS → Share → «Προσθήκη στην αρχική οθόνη» (or Chrome → «Εγκατάσταση εφαρμογής»).
Installability requires HTTPS or the production build.

## Architecture

```
src/
  app/                       Next.js 15 App Router (Server Components + Server Actions)
    (auth)/login             username/password → signed httpOnly cookie (jose HS256)
    (app)/                   authenticated shell: header, bottom nav (mobile) / sidebar (tablet+)
      dashboard              Αναφορά Ημέρας
      customers              search → results → doctor form → consent → hub + 7 tabs
      customers/[id]/projects   list, new project, project screen (stage), new offer (live SoftOne calculate)
      kpis                   KPIs / Απόδοση Πωλήσεων
      manager/check-ins      MANAGER only: Άφιξη/Αναχώρηση log + team KPIs
      support/requests       SUPPORT (+MANAGER): price offer requests and return them
  components/                UI primitives, ActionForm (SoftOne refusals as an alert), offer lines editor,
                             signature pad, dictation textarea, confirm dialog
  lib/i18n/el.ts             every user-visible string
  lib/athens.ts              SoftOne dates are Europe/Athens wall-clock time (servers run in UTC)
  lib/gr-number.ts           Greek number input / format («4.714,29»)
  lib/features.ts            SOON flags: screens whose SoftOne endpoint does not exist yet
  server/
    domain/types.ts          the data model (mirrors docs/SOFTONE-SPEC.md)
    data/provider.ts         DataProvider interface (repos: users, doctors, equipment, visits,
                             projects, offers, tasks, checkIns, stats)
    data/softone/            SoftOne adapter (the only data source): client.ts (s1services),
                             mappers.ts, provider.ts (unbuilt repos throw NotImplemented)
    services/                use-cases; the ONLY layer the UI talks to
    auth/                    session cookie, role guards
  middleware.ts              auth redirect + role gating (/manager, /support)
```

SoftOne is the only data source – there is no local/demo store. Configure it in `.env.local`
(`SESSION_SECRET` and the `S1_*` values; see `.env.example`).

### Connecting SoftOne

Lists come from the owner's JS web-scripts (`/JS/api.crm.*`); single records and writes use the standard services
`getData` / `setData` / `calculate` with form `_CRM_`. The full contract is in
[`docs/SOFTONE-API.md`](docs/SOFTONE-API.md) (the original storage proposal [`docs/SOFTONE-SPEC.md`](docs/SOFTONE-SPEC.md)
is historical). Implemented today in `src/server/data/softone/provider.ts`:

| CRM | SoftOne |
|---|---|
| login / role / users | `login` + `authenticate`, `api.crm/me`, `api.crm/users` |
| Αναφορά Ημέρας | `api.crm/dashboard` |
| customers (search, read, create, update) | `api.crm.customers/list`, `/getData`; `setData CUSTOMER` form `_CRM_` |
| hospitals | `api.crm/hospitals` (TRDR rows); links `CCCTRDTRDR {TRDREL, LINENUM}` |
| Συγκατάθεση (signature) | `api.crm.customers/setSignature`; read from `signatures[]` of `getData` |
| Εξοπλισμός | getData `machines[]`; `setData CUSTOMER {CCCTRDMACHINES}`; catalog `api.crm/bootstrap` |
| Άφιξη / Αναχώρηση | `SOMEETING` series `S1_ARRIVAL_SERIES` (2001); `api.crm.actions/getPendingArrivals` |
| Εκκρεμότητες | `SOTASK` series `S1_TASK_SERIES` (3000); `api.crm.actions/getPendings` |
| projects | list `api.crm.customers/projects`; new `setData PRJC`; screen `getData PRJC`; stage `setData PRJC {PRJSTATE}` |
| offers | read `api.crm.offers`; new offer `calculate` + `setData SALDOC` (series `S1_OFFER_SERIES` 7015) |
| products | `api.crm.products/list {q}` (searched as you type) |

Still without an endpoint («Σύντομα διαθέσιμο»): visits, project follow-up / close / revise, customer history,
KPIs, the manager check-in log.

## iPad first

About 90% of usage is Apple iPad (Safari / installed PWA). Design and test on iPadOS before anything else —
the reference device is **iPad Air 13"** (1024×1366 / 1366×1024). Safari is WebKit: check layouts with WebKit, not only
Chromium (`npx playwright install webkit`).

- **Minimum iPadOS 16.4** (Tailwind v4 CSS). Older iPads render unstyled.
- **Layout**: the sidebar layout starts at 768px, so every iPad (portrait 768–834px, landscape 1024–1366px) gets the
  tablet layout; the bottom nav is for phones only. Orientation is unlocked in the manifest.
- **Install**: Safari → Share → «Προσθήκη στην αρχική οθόνη». Runs full-screen (standalone); there is no browser back
  button, which is why every screen has «‹ Πίσω».
- **Secure context required on the device**: Safari blocks geolocation, the service worker and speech recognition on
  plain `http://192.168.x.x:3000`. To test on an iPad against your PC either deploy to any HTTPS host, or run
  `npx next dev --experimental-https -H 0.0.0.0` and trust the generated certificate on the iPad
  (Settings › General › VPN & Device Management → install, then Settings › General › About › Certificate Trust Settings).
- **Φωνητική υπαγόρευση**: Safari's `webkitSpeechRecognition` (iPadOS 14.5+) with `el-GR`. Needs Settings › General ›
  Keyboard › Enable Dictation and a microphone permission for Safari. Safari ends a session after each pause; the
  component restarts it automatically until you press stop. Chrome/Edge also work; Firefox does not.
- **Υπογραφή**: `<canvas>` with pointer events, so finger and Apple Pencil both work; stored as PNG data URL + timestamp + signer.
- **Άφιξη/Αναχώρηση**: asks for geolocation once (needs HTTPS); works without it (timestamps only). Visible to managers only.
- Inputs are 16px so Safari never zooms on focus; phone-number auto-linking is disabled so ΑΦΜ is not rendered as a tel: link.
- Amounts are typed and shown the Greek way («4.714,29»); dates and times are always Athens time.
