# Forme

**A private, mobile-first space to take care of yourself** — body, mind, words, German and the worlds you are building.

**Live:** https://geek-asr.github.io/forme/ · install it from your phone browser with *Add to Home Screen*.

This repository is only the app. **Your data never lives here.** It is kept in a separate *private* GitHub repository and is read and written straight from your phone through the GitHub API, using a token that exists only on your devices.

---

## What's inside

| Section | What it does |
|---|---|
| **Today** | Calories eaten vs. burned, macros, steps, water, weight, sleep, a daily check-in (mood, energy, pain, morning stiffness), today's workout and skincare, a routine checklist that ticks itself from your logs, German word of the day, a writing prompt, and "from your past self". |
| **Body → Food** | Type or *say* what you ate — "2 roti, 1 katori dal and a glass of chaas" — and Forme matches 270+ Indian vegetarian (egg-free) dishes, works out portions (katori, plate, glass, piece, half, grams…) and calories. Recent/frequent foods, saved meals, your own dishes and a recipe builder. |
| **Body → Plan** | A 17-week home program in four phases (Foundation → Build → Burn → Define), low-impact and spine-friendly, with a guided workout player, daily 10-minute mobility, and a *Flare care* routine for bad days. |
| **Body → Steps & activity** | Steps, walks and sports. Burn = BMR (Mifflin–St Jeor) × 1.2 + walking + MET-based activity, counted net of resting so nothing is double-counted. |
| **Body → Weight** | Smoothed weight trend vs. plan, BMI, pace and projected date, measurements (incl. chest expansion & wall-to-head distance), fitness benchmarks every 4 weeks. |
| **Body → Spine care** | Pain & stiffness trends, weekly BASDAI, medication log, flare protocol, sleep tips, red-flag symptoms, and a 30-day summary to copy for doctor visits. |
| **Body → Skincare** | A researched 4-phase plan built from the products on your shelf: morning protection, rotating salicylic-acid / alpha-arbutin nights (retinoid nights later, if you add one), a daily skin check, recommended additions with “I bought it”, what to skip, what goes with what, troubleshooting, and sources. |
| **Mind** | Thoughts, journal, philosophy, blog posts, quotes and poems. Markdown, moods, tags, pins, daily prompts. Private by default — optionally publish a piece to a public blog. |
| **Mind → Ratings** | Rate anything — movies, series, anime, books, music, drinks, chocolates, food, cafés, places, games, products, or your own categories. Half-star ratings, favourites, watch/try lists with a “pick one for me” button, top-rated carousels and a taste profile. |
| **Mind → The Hybrid World** | A writer's notebook for the book: canon status tags (CANON, PROPOSED, UNRESOLVED…), an ideas inbox that exports in `IDEAS_INBOX.md` format, open questions, world cards, a mirror-outline tool for palindromic chapter titles, writing-session log. |
| **Deutsch** | Spaced-repetition flashcards (≈3,000 words, A1–C1), a 60-second der·die·das sprint, grammar cheat sheets, a phrasebook for life in Germany, pronunciation via the phone's German voice, minutes tracking and a goal countdown. |
| **Me** | Insights (adaptive TDEE from your own data, correlations like sleep vs. pain), weekly review, goals, *Manual of me*, letters to your future self, routine & reminders, profile & targets, settings. |

## How your data stays yours

```
 phone / laptop (Forme)                       GitHub
 ┌─────────────────────────┐   your token   ┌──────────────────────────────┐
 │ local copy (IndexedDB)  │ ─────────────▶ │ private repo: forme-data     │
 │ works offline           │ ◀───────────── │ data/*.json · every save is  │
 │ optional PIN lock       │   GitHub API   │ a commit · full history      │
 └─────────────────────────┘                │ reminders.yml (Actions cron) │
                                            └──────────────────────────────┘
```

- **Every save is a git commit** to your private repo — nothing can silently disappear, and any change can be restored from history.
- Deletes are recorded (tombstones), pushes are fast-forward only, and Forme refuses to write a file that would lose records.
- Works offline: changes queue on the device and sync when you are back online.
- The token is entered on each device and never stored in any repo. With a PIN set, it is stored encrypted (AES-GCM).
- The site sends a strict Content-Security-Policy and talks only to `api.github.com` and `raw.githubusercontent.com`.

## Setup

1. **Create a fine-grained token** → GitHub → Settings → Developer settings → [Fine-grained tokens](https://github.com/settings/personal-access-tokens/new)
   - Repository access: *Only select repositories* → `forme-data` (and `forme` if you want to publish writing)
   - Permissions → Repository: **Contents: Read and write**, **Workflows: Read and write** (reminder schedule). Optional: **Actions: Read and write** (the "Test" button for notifications).
2. Open the site on your phone, paste the token, connect.
3. *Add to Home Screen* (required for notifications on iPhone), then **Me → Routine & reminders → Enable notifications**.

## Reminders

A scheduled GitHub Action in the private repo (`reminders.yml`) sends Web Push notifications at your reminder times. The app rewrites the schedule whenever you change times (converted to UTC, DST-aware), and `scripts/remind.mjs` skips reminders you've already done — no lunch nudge if lunch is logged. A calendar (.ics) export is available as a backup. The template lives in [`data-template/`](data-template/).

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build (service worker included)
npm run deck       # rebuild German decks from ../Germantutor/data/vocabulary
npm run icons      # re-render PWA icons from public/favicon.svg (needs Chrome)
```

Stack: React 19, TypeScript, Vite, Tailwind CSS 4, lucide icons. No backend; deployed to GitHub Pages by `.github/workflows/deploy.yml`.

## Notes

- Nutrition values are home-style estimates; recipes and portions vary — add your own versions of dishes for accuracy.
- MET values: Compendium of Physical Activities. German vocabulary: Deutschpfad (CC BY-SA 4.0).
- Forme helps you notice patterns. It is not medical advice.
