# 🐾 FindMyPet

> **AI-powered ecosystem for pet safety, recovery, and digital identity.**

FindMyPet gives every pet a permanent digital identity — a QR-linked profile with health history, emergency contacts, and a live lost/found network powered by AI photo matching.

One scan of a tag. Everything a stranger needs to return your pet home.

**Live demo:** [findmypet-kohl.vercel.app](https://findmypet-kohl.vercel.app)

---

## Why it exists

Every year millions of pets go missing. Most reunions happen by chance — a neighbour, a post on a local group, luck.

FindMyPet changes that:

- A **QR code on the pet's tag** opens their full profile — owner contacts, chip ID, last known location — giving anyone who finds a pet everything they need
- A **live AI-matched map** automatically connects lost reports with found reports nearby
- A **private health timeline** keeps vaccinations, vet visits, and documents in one place

This is a **digital passport for your pet**. Not a dashboard. Not a CRUD app.

---

## Core features

| | Feature | Status |
|---|---|---|
| 🗺️ | Live lost/found map with clustering | ✅ Live |
| 🤖 | AI pet matching via OpenAI Vision | ✅ Live |
| 🐾 | Pet digital identity — QR code + chip ID | ✅ Live |
| 🏥 | Health timeline — vaccinations, records, vet docs | ✅ Live |
| 💬 | Messaging between reporter and owner | ✅ Live |
| 📡 | Emergency alert mode (push notifications) | ✅ Live |
| 🌍 | Multi-language: PL / EN / DE / ES / ZH | ✅ Live |
| 📱 | PWA — installable on any device | ✅ Live |
| 🎨 | Per-user themes: Natural / Modern / Alert / Cyber | ✅ Live |
| 👥 | PetBook — community social layer | 🔜 Roadmap |
| 🛒 | Pet Marketplace — adopt / rehome | 🔜 Roadmap |
| 🏥 | Vet & shelter directory | 🔜 Roadmap |

---

## Vision

> **Apple Wallet + Tesla + Discord** — for pets.

- **Apple Wallet** — the pet's QR identity card, always in your pocket
- **Tesla** — real-time, always-connected, proactive alerts the moment something changes
- **Discord** — community identity, trust layers, roles (owner / vet / volunteer)

The emotional core: the 3am panic when your dog is missing. The quiet joy of logging your cat's first vaccine. FindMyPet should feel right in both moments.

---

## Design principles

```
Cinematic, not clinical      — photos and composition that feel alive
Calm under pressure          — emergency UI that is fast and clear, never scary
Minimal surface, deep function — one action per screen, depth behind tabs
High trust                   — every interaction should feel safe and reliable
Mobile-first                 — designed for someone who just found a dog on the street
```

---

## Tech stack

```
Next.js 16 (App Router)   — framework, server actions, streaming
Supabase                   — PostgreSQL, auth, storage, realtime
Tailwind CSS v4            — CSS-first config, no tailwind.config.ts
next-intl v4               — i18n routing + server/client translations
OpenAI Vision API          — AI photo matching between reports
Leaflet + React-Leaflet    — maps (no Google Maps cost)
Nominatim                  — free geocoding (forward + reverse)
qrcode.react               — QR code generation
Resend                     — email alerts
Web Push API               — push notifications
```

---

## Getting started

```bash
git clone https://github.com/spower777/FindMyPet.git
cd FindMyPet
npm install
cp .env.example .env.local   # fill in your keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

OPENAI_API_KEY=sk-...

RESEND_API_KEY=re_...

NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_EMAIL=mailto:you@example.com

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Generate VAPID keys:
```bash
npx web-push generate-vapid-keys
```

### Database

Run `supabase/schema.sql` in your Supabase SQL editor.
Creates all tables, RLS policies, and storage buckets.

---

## Project structure

```
src/
├── app/
│   ├── [locale]/
│   │   ├── page.tsx              # Homepage — live lost/found map
│   │   ├── profile/              # Mój pupil — pet profiles list
│   │   ├── radar/                # PetRadar — active lost/found reports
│   │   ├── pets/[id]/            # Pet detail + health timeline + tabs
│   │   ├── pets/[id]/edit/       # Edit pet profile
│   │   ├── report/lost|found/    # Report a lost or found pet
│   │   ├── chat/                 # Messaging
│   │   ├── contacts/             # Emergency contacts per pet
│   │   └── auth/                 # Login / signup / callback
│   └── api/
│       ├── match/                # AI matching endpoint (cron-triggerable)
│       └── push/subscribe/       # Web Push subscription
├── components/
│   ├── MapView.tsx               # Leaflet map with clustering
│   ├── LocationPicker.tsx        # GPS + address geocoding picker
│   ├── ShareButton.tsx           # Share modal — WhatsApp, Telegram, QR
│   ├── ThemeSwitcher.tsx         # Per-user colour theme (localStorage)
│   └── medical/
│       └── PetTimeline.tsx       # Unified health timeline component
└── lib/
    ├── matching.ts               # OpenAI Vision matching logic
    ├── geocoding.ts              # Nominatim forward + reverse geocoding
    ├── supabase/                 # Server + client Supabase instances
    └── types.ts                  # Shared TypeScript types
```

---

## Roadmap

### Now — core stability
- [ ] Pet profile editor (`/pets/[id]/edit`)
- [ ] Message read receipts & unread count in nav
- [ ] Mobile performance audit
- [ ] Supabase schema migration files

### Next — product depth
- [ ] PetBook — community layer (feeds, follows, posts)
- [ ] Vet & shelter public directory
- [ ] Incident history linked to pet profile
- [ ] Offline mode (PWA cache)

### Future — ecosystem
- [ ] Pet Marketplace (adopt / rehome / give away)
- [ ] Native mobile app
- [ ] NFC tag support
- [ ] Regional alert networks

---

## Contributing

We're an early-stage open product. We're looking for:

- **Frontend / React engineers** — Next.js 16, Tailwind v4, server components
- **UX / product designers** — help define the visual language and composition
- **Backend / Supabase** — schema design, RLS, realtime, performance
- **Mobile** — React Native or Flutter

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines, design principles, and how decisions are made.

**Vision owner:** [@spower777](https://github.com/spower777)
Community builds. One person directs.

---

## License

MIT — use it, fork it, build on it.
If you use FindMyPet in your project, we'd love to hear about it.

---

<p align="center">
  Made for every pet that ever got lost — and found their way home. 🐾
</p>
