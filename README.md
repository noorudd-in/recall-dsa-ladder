# Recall: a DSA tracker that remembers for you

Track the problems you solve across Blind 75, Grind 75/169, NeetCode 150/250 and the Striver sheets.
Recall schedules a review for every problem you solve, so you revise each one just before you would forget it.

There is no backend and no account. Everything is stored in your browser's `localStorage`.

## Run it locally

You need Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

To check the production build:

```bash
npm run build
npm run preview
```

## Deploy to Vercel (free)

**From GitHub (recommended)**

1. Push this folder to a GitHub repository.
2. In Vercel, choose **Add New, Project** and import the repository.
3. Vercel detects Vite on its own. Leave the defaults (build command `npm run build`, output directory `dist`) and deploy.

**From the command line**

```bash
npm i -g vercel
vercel        # preview deploy
vercel --prod # production deploy
```

Navigation uses URL hashes (`#/review`), so no rewrite rules are needed.

## What it does

| Feature | How it works |
| --- | --- |
| Multiple roadmaps | Switch lists on the Problems page. Progress is stored per problem, not per list, so a problem you solve once is ticked in every list that contains it. |
| Auto-scheduled revisions | Ticking a problem creates a review schedule. The first review is one day later. |
| Review queue | The Review page splits work into **Needs a refresh** (overdue), **Due today** and **Coming up**. A badge in the sidebar shows how many are due. |
| Dashboard | The Today page shows solved counts by difficulty, completion for each roadmap, the review ladder and a 14-day forecast. |
| Activity | A one-year heatmap, current and longest streak, active days and a 90-day revision history. |
| Themes | Light, dark or system. Your choice is saved and applied before the first paint. |
| Backup | Export and import your progress as JSON from Settings. |

### How reviews are scheduled

Each solved problem sits on a rung of a ladder: **1, 3, 7, 14, 30, 60, 120, 240 days**. In the Review queue you rate how well you recalled it:

- **Forgot**: back to the first rung (review tomorrow)
- **Hard**: down one rung
- **Good**: up one rung
- **Easy**: up two rungs

The time shown under each button is when you will see that problem next. To change the ladder, edit `LADDER` in `src/lib/srs.js`.

### How progress carries between roadmaps

Every problem gets a canonical key (`src/lib/keys.js`): LeetCode problems by slug, GeeksforGeeks problems by slug, everything else by host and path. Query strings and tracking parameters are ignored. Two lists that link the same problem therefore share one record.

Lists that link the same problem twice are de-duplicated when they load. Striver A2Z has 452 rows in the source file and 426 unique problems, and the tracker counts 426.

## Project layout

```
src/
  data/
    raw/            your seven problem files, unchanged
    roadmaps.js     turns the raw files into roadmaps and one catalog of unique problems
  lib/
    keys.js         canonical problem identity, URL clean-up
    srs.js          the review ladder and scheduling rules
    stats.js        progress, streaks, heatmap and queue calculations
    storage.js      localStorage load/save, validation, backup import/export
    dates.js        local-date helpers (safe across daylight saving)
  store/            React context that owns the state and persists it
  hooks/            theme, hash router, "today" that rolls over at midnight
  components/       rows, ladder, heatmap, dialogs and other UI pieces
  views/            Today, Problems, Review, Activity, Settings
  styles.css        design tokens (light and dark) and all styles
```

## Add another roadmap

1. Drop a data file into `src/data/raw/`. It needs an exported array of `{ title, url, difficulty, category }`. A `subtopic` field is optional.
2. Import it in `src/data/roadmaps.js` and add one entry to `DEFINITIONS`.

Progress you have already made carries over to the new list automatically.

## Good to know

- Data lives in one browser on one device. Clearing site data, using private mode or switching browsers means starting again, so export a backup now and then. Import it on another device to move your progress.
- Several open tabs stay in sync.
- Dates are local calendar days. A review is due on the day it is scheduled, wherever you are.
- If you solve problems earlier than you record them, open the row's menu and set **Solved on**. Backdated problems show up as needing a refresh, which is the point.
