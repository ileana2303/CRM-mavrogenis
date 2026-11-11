# Diagnostic Equipment – CRM Πωλητών

Mobile-first PWA for the field salespeople of Diagnostic Equipment. Built from
«Παρουσίαση CRM Πωλητών V1.pptx». UI is Greek only.

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000  (use `npx next dev -p 3100` if 3000 is taken)
```

Demo users (password `1234` for all):

| Username        | Ρόλος                 | Σημείωση                                   |
|-----------------|-----------------------|--------------------------------------------|
| `e.leventouris` | Πωλητής               | Ηλίας Λεβεντούρης – the slides' demo data  |
| `m.nikolaou`    | Πωλητής               | second salesperson for the manager view    |
| `manager`       | Προϊστάμενος Πωλήσεων | sees check-ins + team KPIs + support queue |
| `support`       | Τμήμα Υποστήριξης     | prices «Αιτήματα Προσφοράς»                |

Demo customer: Ιατρός **Παπαδόπουλος Γεώργιος** (search by Επώνυμο «Παπ», ΑΦΜ `045678912`, or mobile `6944123456`).

Other commands:

```bash
npm run build && npm start   # production build (service worker is only registered in production)
npm run typecheck            # tsc --noEmit
npm run seed                 # delete ./data/*.json → demo data is re-seeded on the next request
npm run icons                # regenerate public/icons/*.png
```

Install as an app: open the site in Chrome (Android/desktop) → menu → «Εγκατάσταση εφαρμογής», or Safari iOS → Share → «Προσθήκη στην αρχική οθόνη». Installability requires the production build (`npm run build && npm start`) or any HTTPS deployment.

## Architecture

```
src/
  app/                       Next.js 15 App Router (Server Components + Server Actions)
    (auth)/login             username/password → signed httpOnly cookie (jose HS256)
    (app)/                   authenticated shell: header, bottom nav (mobile) / sidebar (tablet+)
      dashboard              Αναφορά Ημέρας
      customers              search → results → doctor form → consent → hub + 7 tabs
      customers/[id]/projects   list, new, view/timeline, follow-up, revise, close
      kpis                   KPIs / Απόδοση Πωλήσεων
      manager/check-ins      MANAGER only: Άφιξη/Αναχώρηση log + team KPIs
      support/requests       SUPPORT (+MANAGER): price offer requests and return them
  components/                UI primitives, signature pad, dictation textarea, line editors
  lib/i18n/el.ts             every user-visible string
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

Reads go through the owner's JS web-scripts (`/JS/api.crm.*`), writes through standard `setData`.
The contract and what is still missing is in [`docs/SOFTONE-API.md`](docs/SOFTONE-API.md)
(storage proposal: [`docs/SOFTONE-SPEC.md`](docs/SOFTONE-SPEC.md)). Implemented today in
`src/server/data/softone/provider.ts`:

| CRM | SoftOne |
|---|---|
| login / role / users | `login` + `authenticate`, `api.crm/me`, `api.crm/users` |
| customers (search `q`, read, create, update, hospitals) | `api.crm.customers/list`, `/getData`; `setData CUSTOMER` form `_CRM_` |
| Συγκατάθεση (signature) | `api.crm.customers/setSignature`; read from `signatures[]` of `getData` |
| Άφιξη / Αναχώρηση | `SOMEETING` series `S1_ARRIVAL_SERIES` (2001): FROMDATE / FINALDATE; `api.crm.actions/getPendingArrivals` |
| Εκκρεμότητες | `SOTASK` series `S1_TASK_SERIES` (3000): COMMENTS, DUEDATE, ACTSTATUS; `api.crm.actions/getPendings` |
| products, offers (read) | `api.crm.products`, `api.crm.offers` (write series `S1_OFFER_SERIES` 7015) |

Everything else (projects, visits, follow-ups, KPIs, manager check-in log) is still local JSON.

## iPad first

About 90% of usage is Apple iPad (Safari / installed PWA). Design and test on iPadOS before anything else.

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
