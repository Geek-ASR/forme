# Forme

**A private, mobile-first space to take care of yourself** — body, mind, words, German and the worlds you are building.

**Live:** https://geek-asr.github.io/forme/ · on Android, open it in Chrome and tap **Install** on the Today screen.

This repository is only the app. **Your data never lives here.** It is kept in a separate *private* GitHub repository and is read and written straight from your phone through the GitHub API, using a token that exists only on your devices.

---

## What's inside

| Section | What it does |
|---|---|
| **Today** | *Next up* — the three things worth doing right now, picked by time of day (timed habits fade after a few hours: no guilt list). Calories eaten vs. burned, macros, steps, water, weight, sleep, a daily check-in (mood, energy, pain, morning stiffness), today's workout and skincare, a routine checklist that ticks itself from your logs, German word of the day, a writing prompt, and "from your past self". A *Set up this phone* card (install → reminders → a test notification) stays until a reminder has really arrived, and after a few days away a *Welcome back* card asks for one small thing instead of a catch-up. In the challenge's first week, *Your starting line* collects the Day-1 numbers (weigh-in, waist, fitness test, a letter to Day-120 you). Short on protein? *Protein ideas* lists vegetarian options that fit the calories you have left — foods you already eat first. |
| **Challenge** | The 120-day challenge on one screen: every day as a square (shaded by how much you did — any log counts as showing up), forgiving streaks, workouts, weight change, milestones on Days 1 · 30 · 60 · 90 · 120 lined up with the retest weeks, the four phases with dates, and a letter sealed until Day 120. |
| **Close the day** | The 30-second evening check-in the night reminder opens: each meal offers *your usual* (the same foods on 2+ of the last four weeks), *like yesterday*, type-or-say-it, or skipped; then water, steps, today's training, how you felt, and one line for your journal. Ends with the day handed back — balance, protein, steps, a forgiving streak (one day off never breaks it) and tomorrow's plan. |
| **Body → Food** | Type or *say* what you ate — "2 roti, 1 katori dal and a glass of chaas" — and Forme matches 270+ Indian vegetarian (egg-free) dishes, works out portions (katori, plate, glass, piece, half, grams…) and calories. Recent/frequent foods, saved meals, your own dishes and a recipe builder. |
| **Body → Plan** | The 120-day challenge's home program in four phases (Foundation → Build → Burn → Define), low-impact and spine-friendly. With dumbbells it becomes an upper/lower split (each muscle twice a week, ~10+ hard sets, sets taken 1–3 reps from failure) with a set-by-set rep log, “last time / aim for” targets, a progression ladder for fixed weights and personal bests. Daily 10-minute mobility and a *Flare care* routine for bad days. |
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
3. Follow **Set up this phone** on Today: install (Android: one tap; iPhone: *Share → Add to Home Screen*), turn on reminders, send yourself a test. The same controls live in **Me → Routine & reminders**.

## Reminders

A scheduled GitHub Action in the private repo (`reminders.yml`) sends Web Push notifications at your reminder times. The app rewrites the schedule whenever you change times (converted to UTC, DST-aware), and `scripts/remind.mjs` skips reminders you've already done — no lunch nudge if lunch is logged (or skipped), no evening nudge once the day is closed. Notifications carry buttons — **+250 ml / +500 ml** on water, **Done ✓** on skincare and mobility — that log without opening the app: the service worker queues the change and Forme applies it next time it opens. They're sent with high urgency so Android delivers them on time. Sunday's weekly reminder carries your last seven days in one line (days you showed up, workouts, average steps); milestone days of the challenge get their own note; and if you've told Forme when your GitHub token expires, it warns you on Today a week ahead and by notification for the last five days. A calendar (.ics) export is available as a backup. The template lives in [`data-template/`](data-template/).

## On Android

- **Home-screen shortcuts** — long-press the Forme icon: *Log food*, *Water +250 ml*, *Close the day*.
- **Share to Forme** — share text or a link from any app (a quote, a film, a dish, a German word) and choose where it goes: a thought, an idea for the book, a rating, a food log, a German word.
- **Quick-log links** — opening `…/forme/#/log?steps=8123` logs it (also `water=250`, `kg=70.5`, `sleep=7.5`, `check=skin-pm`, `session=mobility`, `d=YYYY-MM-DD` for up to a week back). A web app can't read Android's step counter itself, so steps are a five-second entry in *Close the day* — or, if you like automation, Tasker with the Health Connect plugin can read your steps and open that link each evening. The links are listed with copy buttons in **Me → Routine & reminders**.

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
