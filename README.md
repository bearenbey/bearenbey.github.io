# iSwitch — my Nintendo game log

A small static site to log the Nintendo games I play: scores, time played,
HowLongToBeat times, a backlog, reviews and stats. No build step, no
dependencies — just HTML, CSS and JavaScript, ready for GitHub Pages.

## Features

- **Home**: your Personal Vault — a Switch-style shelf with what you're playing and recent games
- **Library**: search, filter by status / favourites, sort by score, hours, etc.
- **Backlog**: priorities, total HLTB hours left and an estimated "time until it's all beaten"
- **Stats**: totals, average score, status split, most played, score distribution
  games beaten per year and your pace vs. HowLongToBeat
- **Game sheet**: status, score (0–10 in half steps), time played with quick +½h / +1h / +2h buttons,
  HLTB main / extras / completionist times, dates, cover, favourite and a written review
- **Cover art, automatically**: box art is looked up on Wikipedia by title (no API key needed).
  New games get a cover as soon as you type the title; the game sheet's **Find cover** shows
  alternatives to choose from, or paste any image URL. **Settings → Find missing covers** fills in the rest.
- Light (“Basic White”) and dark (“Basic Black”) themes
- Keyboard: `N` add game, `1`–`5` switch sections

## How the data works

Everything you enter is saved in your browser (`localStorage`).
GitHub Pages is static, so to publish your list for visitors:

1. Open **Settings → Export games.json**.
2. Replace `data/games.json` in this repo with the downloaded file.
3. Commit and push.

When someone opens the site for the first time (no saved data in their browser),
it loads `data/games.json`. Use **Settings → Load published list** to pull it into
a browser that already has data. Export regularly — it doubles as your backup.

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

(Opening `index.html` directly works too, but the browser blocks loading `data/games.json` from `file://`.)

## Deploy to GitHub Pages

```sh
git init && git add . && git commit -m "My game log"
git branch -M main
git remote add origin git@github.com:<you>/<repo>.git
git push -u origin main
```

Then in the repo: **Settings → Pages → Deploy from a branch → `main` / root**.

---

Fan-made personal project, not affiliated with Nintendo.
