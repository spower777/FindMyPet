# FindMyPet 🐾

Aplikacja webowa pomagająca odnaleźć zagubione zwierzęta. Właściciele mogą zgłaszać zaginięcia, a znalazcy — publikować informacje o znalezionych zwierzętach. AI Vision automatycznie dopasowuje zgłoszenia na podstawie zdjęć.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Supabase** — baza danych PostgreSQL, auth, storage
- **Leaflet / OpenStreetMap** — interaktywna mapa bez kosztów
- **OpenAI Vision** — AI matching zdjęć zwierząt
- **Web Push** — powiadomienia push o potencjalnych dopasowaniach
- **Tailwind CSS v4**

## Funkcje

- Mapa aktywnych zgłoszeń (zaginione 🔴 / znalezione 🟢)
- Formularz zgłoszenia z wyborem lokalizacji na mapie i GPS
- Upload zdjęć do Supabase Storage
- AI matching — porównywanie zdjęć i opisów przez OpenAI Vision
- Web Push notifications dla właścicieli przy nowym dopasowaniu
- Autentykacja (Supabase Auth — email/hasło)

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

### 4. Uruchom dev server

```bash
npm run dev
```

Aplikacja dostępna pod [http://localhost:3000](http://localhost:3000).

## Struktura projektu

```
src/
├── app/
│   ├── page.tsx              # Strona główna z mapą
│   ├── report/lost/          # Formularz zgłoszenia zaginionego
│   ├── report/found/         # Formularz zgłoszenia znalezionego
│   ├── pets/[id]/            # Szczegóły zgłoszenia
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

## Licencja

Copyright © 2026 Sebastian Repela. Wszelkie prawa zastrzeżone.  
Patrz [LICENSE](LICENSE).
