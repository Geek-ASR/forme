# forme-data (private)

The private data behind [Forme](https://geek-asr.github.io/forme/). **Keep this repository private.**
Nothing here is ever read by anything except the Forme app (with your token) and this repo's own reminder workflow.

## Layout

```
data/
  profile.json            you: height, goals, timezone, health notes (+ "Manual of me")
  settings.json           targets, daily checklist, reminders, skincare shelf, German settings
  goals.json  letters.json  reviews.json
  body.json               weigh-ins, measurements, benchmark tests
  basdai.json             weekly BASDAI scores
  custom-foods.json  meal-templates.json
  hybrid.json             The Hybrid World notebook
  writing-sessions.json
  german-srs.json  german-words.json
  push.json               devices that receive reminders
  days/YYYY-MM.json       daily check-ins: mood, pain, stiffness, sleep, water, steps, ticks
  food/YYYY-MM.json       everything you ate
  activity/YYYY-MM.json   workouts, walks, mobility
  german-log/YYYY-MM.json study minutes
  meds/YYYY-MM.json       medication log
  writing/YYYY.json       thoughts, journal, essays, poems
scripts/remind.mjs        sends push reminders
.github/workflows/reminders.yml   schedule (rewritten by the app when you change reminder times)
```

Each file is `{"collection": …, "v": 1, "records": [ one record per line ]}`.

## Why your data can't silently disappear

- Every save in the app is a **commit**. `git log -p data/food/2026-10.json` shows every change ever made.
- Deletes are recorded as tombstones (`"deleted": true`) rather than erased, so devices can't resurrect or lose entries.
- The app only fast-forwards the branch and refuses any write that would shrink a file.
- To restore anything: open the file on GitHub → History → pick a version → copy it back, or `git revert`.
- For an offline copy: `gh repo clone Geek-ASR/forme-data` and `git pull` whenever you like.

## Reminders

`reminders.yml` runs at your reminder times (converted to UTC), and `scripts/remind.mjs` sends a Web Push
to every device listed in `data/push.json`. Secrets used: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
Test it any time: **Actions → reminders → Run workflow**.
