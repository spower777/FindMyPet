# FindMyPet 🐾

Aplikacja webowa pomagająca odnaleźć zagubione zwierzęta. Właściciele mogą zgłaszać zaginięcia, a znalazcy — publikować informacje o znalezionych zwierzętach. AI Vision automatycznie dopasowuje zgłoszenia na podstawie zdjęć.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Supabase** — baza danych PostgreSQL, auth, storage
- **Leaflet / OpenStreetMap** — interaktywna mapa bez kosztów
- **OpenAI Vision** — AI matching zdjęć zwierząt
- **Web Push** — powiadomienia push o potencjalnych dopasowaniach
- **Resend** — email alerty o dopasowaniach AI
- **Tailwind CSS v4**

## Funkcje

- Mapa aktywnych zgłoszeń (zaginione 🔴 / znalezione 🟢)
- Formularz zgłoszenia z wyborem lokalizacji na mapie i GPS
- Upload zdjęć do Supabase Storage
- AI matching — porównywanie zdjęć i opisów przez OpenAI Vision
- Email alerty o dopasowaniach AI
- Web Push notifications dla właścicieli przy nowym dopasowaniu
- Autentykacja (Supabase Auth — email/hasło)
- Czat między właścicielem zgłoszenia i osobą pytającą
- Panel profilu: lista zgłoszeń, oznaczanie jako rozwiązane, usuwanie

## Uruchomienie lokalne

### 1. Instalacja zależności

```bash
npm install
```

### 2. Zmienne środowiskowe

Utwórz plik `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

OPENAI_API_KEY=sk-proj-...
MATCH_API_SECRET=...

RESEND_API_KEY=re_...

NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_EMAIL=mailto:your@email.com

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Klucze VAPID wygeneruj przez:

```bash
npx web-push generate-vapid-keys
```

### 3. Schema bazy danych

W panelu Supabase → SQL Editor → wklej i uruchom `supabase/schema.sql`.

Schema tworzy tabele dla zgłoszeń, zdjęć, dopasowań AI, subskrypcji push oraz czatu (`conversations`, `messages`) z RLS i realtime dla wiadomości.

### 4. Uruchom dev server

```bash
npm run dev
```

Aplikacja dostępna pod [http://localhost:3000](http://localhost:3000).

### 5. Kontrole przed deployem

```bash
npm run lint
npm run build
```

Endpoint `POST /api/match` jest przeznaczony do ręcznego/adminowego odpalenia matchingu i wymaga nagłówka `x-match-secret` albo `Authorization: Bearer ...` zgodnego z `MATCH_API_SECRET`.

## Struktura projektu

```
src/
├── app/
│   ├── page.tsx              # Strona główna z mapą
│   ├── report/lost/          # Formularz zgłoszenia zaginionego
│   ├── report/found/         # Formularz zgłoszenia znalezionego
│   ├── pets/[id]/            # Szczegóły zgłoszenia
│   ├── profile/              # Panel użytkownika
│   ├── chat/                 # Lista rozmów i okno czatu
│   ├── auth/                 # Login / callback
│   └── api/
│       ├── match/            # AI matching endpoint
│       └── push/subscribe/   # Web Push subskrypcja
├── components/
│   ├── MapView.tsx           # Mapa Leaflet z markerami
│   ├── LocationPicker.tsx    # Picker lokalizacji na mapie
│   ├── PetForm.tsx           # Formularz zgłoszenia
│   └── PetCard.tsx           # Karta zwierzęcia
└── lib/
    ├── matching.ts           # Logika AI matchingu
    ├── push.ts               # Web Push helpers
    └── types.ts              # Typy TypeScript
```

## Future / Roadmap

- **TODO: live image search / AI pet recognition** — wyszukiwanie zwierząt na żywo po zdjęciu (upload foto → AI szuka pasujących zgłoszeń w bazie)
- Powiadomienia push o nowych zgłoszeniach w okolicy
- Moderacja zgłoszeń

## Licencja

Copyright © 2026 Sebastian Repela. Wszelkie prawa zastrzeżone.  
Patrz [LICENSE](LICENSE).
