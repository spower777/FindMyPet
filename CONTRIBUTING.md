# Contributing to FindMyPet

Thanks for your interest. FindMyPet is a vision-driven open product — community builds, one person directs.

## How decisions are made

All product and design decisions go through the vision owner [@spower777](https://github.com/spower777).
Open an issue before starting any significant feature — alignment first, code second.

## Design principles

Before writing a line of code or pushing a pixel, read these:

```
Cinematic, not clinical      — composition and photos that feel alive, not like a dashboard
Calm under pressure          — emergency UI must be fast and clear, never chaotic
Minimal surface, deep function — one primary action per screen; complexity lives behind tabs
High trust                   — every interaction should feel safe and reliable
Mobile-first                 — designed for someone who just found a dog on the street
```

**What we are NOT building:**
- An enterprise CRUD dashboard with 200 buttons
- A generic SaaS with a sidebar and data tables
- A social network that happens to have pets in it

**What we ARE building:**
- A premium, emotional product for pet safety
- The "digital passport" for every pet
- Something that feels right at 3am when your dog is missing

## Getting started

1. Fork the repo and `npm install`
2. Copy `.env.example` to `.env.local` and fill in your keys
3. Look at open issues — pick something labelled `good first issue` or `help wanted`
4. Open a PR with a clear description of what changed and why

## Code style

- TypeScript strict, no `any`
- Tailwind CSS v4 (no `tailwind.config.ts` — use `@theme inline` in `globals.css`)
- Server components by default; client components only when needed (interactivity, hooks)
- Server actions for mutations — no API routes unless necessary
- No premature abstraction — three similar lines is better than a helper nobody asked for
- No comments explaining *what* the code does — only *why* when non-obvious

## What we need most

- **UX / product designer** — help define the visual language, composition, motion
- **Frontend engineers** — Next.js 16, Tailwind v4, performance
- **Supabase / backend** — schema, RLS, realtime, query optimisation
- **Mobile** — React Native or Flutter when the time comes

## Questions?

Open a [Discussion](../../discussions) or an [Issue](../../issues).
