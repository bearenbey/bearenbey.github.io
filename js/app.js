/* iSwitch — a Nintendo-flavoured game log. No build step, no dependencies. */
'use strict';

/* ------------------------------------------------------------------ */
/* Constants & helpers                                                 */
/* ------------------------------------------------------------------ */
const STORE_KEY = 'iswitch.v1';
const EDIT_KEY = 'iswitch.edit';   // set by opening /#edit: this browser may edit
const THEME_KEY = 'iswitch.theme';

// Visitors get a read-only view of the published data/games.json.
// Editing is unlocked per browser by visiting /#edit (and locked again in Settings).
// Edits only ever live in that browser until exported and pushed, so this is
// about a clean visitor view, not security.
let canEdit = false;
try { canEdit = localStorage.getItem(EDIT_KEY) === '1'; } catch (e) {}

const STATUSES = [
  { id: 'playing',   label: 'Playing' },
  { id: 'backlog',   label: 'Backlog' },
  { id: 'completed', label: 'Completed' },
  { id: 'onhold',    label: 'On hold' },
  { id: 'dropped',   label: 'Dropped' },
];
const STATUS_IDS = STATUSES.map(s => s.id);
const statusLabel = id => (STATUSES.find(s => s.id === id) || {}).label || id;

const PRIORITIES = ['high', 'medium', 'low'];

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const today = () => new Date().toLocaleDateString('sv'); // YYYY-MM-DD, local time
const num = v => { const n = parseFloat(v); return Number.isFinite(n) && n >= 0 ? n : null; };
const sum = arr => arr.reduce((a, b) => a + (b || 0), 0);
const round1 = n => Math.round(n * 10) / 10;
const round2 = n => Math.round(n * 100) / 100;
const isCoarse = () => matchMedia('(pointer: coarse)').matches;
const isPhone = () => matchMedia('(max-width: 640px)').matches;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function fmtH(h) {
  if (!h) return '0h';
  if (h >= 100) return `${Math.round(h)}h`;
  let hh = Math.floor(h), m = Math.round((h - hh) * 60);
  if (m === 60) { hh++; m = 0; }
  if (!hh) return `${m}m`;
  return m ? `${hh}h ${m}m` : `${hh}h`;
}
const fmtScore = s => (s == null ? '—' : (Number.isInteger(s) ? String(s) : s.toFixed(1)));
const fmtDate = d => {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return isNaN(dt) ? d : dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

function hashHue(str) {
  let h = 0;
  for (const ch of str) h = (h * 31 + ch.codePointAt(0)) % 360;
  return h;
}
function initials(title) {
  const words = title.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  const skip = new Set(['the', 'of', 'a', 'and', 'an']);
  const main = words.filter(w => !skip.has(w.toLowerCase()));
  return (main.length ? main : words).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
}

const ICON = {
  star: '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>',
  starHalf: '<svg viewBox="0 0 24 24"><defs><linearGradient id="hg"><stop offset="50%" stop-color="currentColor"/><stop offset="50%" stop-color="currentColor" stop-opacity=".22"/></linearGradient></defs><path fill="url(#hg)" d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>',
  starEmpty: '<svg viewBox="0 0 24 24" opacity=".22"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3 4.5 6.6 4.5c2.1 0 3.7 1.2 5.4 3.1 1.7-1.9 3.3-3.1 5.4-3.1 3.6 0 5.7 3.7 4.2 7.2C19.5 16.4 12 21 12 21z"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 10.4 3.5 2.1-1 1.7L11 13V6h2z"/></svg>',
  trophy: '<svg viewBox="0 0 24 24"><path d="M7 3h10v2h4v3a4 4 0 0 1-4 4h-.4A5 5 0 0 1 13 15.9V18h3v3H8v-3h3v-2.1A5 5 0 0 1 7.4 12H7a4 4 0 0 1-4-4V5h4zm0 4H5v1a2 2 0 0 0 2 2zm10 0v3a2 2 0 0 0 2-2V7z"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 8 5.5z"/></svg>',
  list: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="4" rx="2"/><rect x="3" y="10" width="18" height="4" rx="2"/><rect x="3" y="16" width="18" height="4" rx="2"/></svg>',
  gamepad: '<svg viewBox="0 0 24 24"><path d="M7 6h10a5 5 0 0 1 5 5v2a5 5 0 0 1-8.5 3.5h-3A5 5 0 0 1 2 13v-2a5 5 0 0 1 5-5zm0 3v2H5v2h2v2h2v-2h2v-2H9V9zm9.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/></svg>',
  search: '<svg viewBox="0 0 24 24"><path d="M10 3a7 7 0 0 1 5.6 11.2l5.1 5.1-1.4 1.4-5.1-5.1A7 7 0 1 1 10 3zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"/></svg>',
  pen: '<svg viewBox="0 0 24 24"><path d="M15.2 4.2 19.8 8.8 8.6 20H4v-4.6zm2-2 1.4-1.4a1 1 0 0 1 1.4 0l3.2 3.2a1 1 0 0 1 0 1.4L21.8 6.8z"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M12 3l5 5-1.4 1.4L13 6.8V15h-2V6.8L8.4 9.4 7 8zM5 13h2v6h10v-6h2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/></svg>',
  bolt: '<svg viewBox="0 0 24 24"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>',
};

function stars(score) {
  if (score == null) return '';
  const v = score / 2; // 0–10 → 0–5 stars
  let out = '';
  for (let i = 1; i <= 5; i++) out += v >= i ? ICON.star : v >= i - 0.5 ? ICON.starHalf : ICON.starEmpty;
  return `<span class="stars" aria-label="${fmtScore(score)} out of 10">${out}</span>`;
}

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */
// "Player" -> "Player's", "James" -> "James'"
const possessive = name => (/s$/i.test(name) ? `${name}’` : `${name}’s`);

const DEFAULT_STATE = () => ({
  version: 1,
  profile: { name: 'Player' },
  settings: { theme: 'auto', hoursPerWeek: 7, autoCovers: true },
  games: [],
});
let state = DEFAULT_STATE();

function normalizeGame(g) {
  const score = num(g.score);
  return {
    id: g.id || uid(),
    title: String(g.title || 'Untitled').trim() || 'Untitled',
    status: STATUS_IDS.includes(g.status) ? g.status : 'backlog',
    score: score ? Math.min(10, score) : null,
    hoursPlayed: num(g.hoursPlayed) ?? 0,
    hltb: { main: num(g.hltb?.main), extra: num(g.hltb?.extra), complete: num(g.hltb?.complete) },
    startDate: g.startDate || '',
    finishDate: g.finishDate || '',
    addedDate: g.addedDate || today(),
    cover: g.cover || '',
    coverTried: !!g.coverTried,
    review: g.review || '',
    favorite: !!g.favorite,
    priority: PRIORITIES.includes(g.priority) ? g.priority : 'medium',
    sessions: normSessions(g.sessions),
    updated: g.updated || Date.now(),
  };
}

// Play sessions: [{ date: 'YYYY-MM-DD', hours }], one entry per day, oldest first.
// hoursPlayed stays the game's total (it can include time from before logging started).
function normSessions(list) {
  if (!Array.isArray(list)) return [];
  const byDate = new Map();
  for (const s of list) {
    const h = num(s?.hours);
    if (!h || !/^\d{4}-\d{2}-\d{2}$/.test(s?.date || '')) continue;
    byDate.set(s.date, round2((byDate.get(s.date) || 0) + h));
  }
  return [...byDate].sort(([a], [b]) => a.localeCompare(b)).map(([date, hours]) => ({ date, hours }));
}
const lastPlayed = g => g.sessions.at(-1)?.date || '';

function normalizeState(obj) {
  const base = DEFAULT_STATE();
  if (Array.isArray(obj)) obj = { games: obj };
  if (!obj || typeof obj !== 'object') return base;
  return {
    version: 1,
    profile: { ...base.profile, ...(obj.profile || {}) },
    settings: { ...base.settings, ...(obj.settings || {}) },
    games: Array.isArray(obj.games) ? obj.games.map(normalizeGame) : [],
  };
}

function save() {
  if (canEdit) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ }
  }
  updateChrome();
}

async function fetchPublished() {
  try {
    const r = await fetch('data/games.json', { cache: 'no-store' });
    if (r.ok) return normalizeState(await r.json());
  } catch (e) { /* offline or file:// */ }
  return null;
}

async function load() {
  if (!canEdit) {
    // Always show the latest published list, never a stale copy.
    state = (await fetchPublished()) || DEFAULT_STATE();
    return;
  }
  let raw = null;
  try { raw = localStorage.getItem(STORE_KEY); } catch (e) {}
  if (raw) {
    try { state = normalizeState(JSON.parse(raw)); return; } catch (e) {}
  }
  const published = await fetchPublished();
  if (published) state = published;
}

const getGame = id => state.games.find(g => g.id === id);
const byStatus = s => state.games.filter(g => g.status === s);

/* ------------------------------------------------------------------ */
/* Shared UI bits                                                      */
/* ------------------------------------------------------------------ */
function artHTML(g) {
  const fallback = `<div class="gen-art" style="--h:${hashHue(g.title)}"><span>${esc(initials(g.title))}</span></div>`;
  if (!g.cover) return fallback;
  return `<img src="${esc(g.cover)}" alt="" loading="lazy" onerror="this.outerHTML=this.nextElementSibling.innerHTML"><template>${fallback}</template>`;
}

function statusPill(s) {
  return `<span class="status-pill"><span class="dot" style="background:var(--s-${s})"></span>${esc(statusLabel(s))}</span>`;
}

function progressPct(g) {
  const target = g.hltb.main;
  if (!target || !g.hoursPlayed) return 0;
  return Math.min(100, Math.round((g.hoursPlayed / target) * 100));
}

function tileHTML(g) {
  const pct = g.status === 'playing' ? progressPct(g) : 0;
  return `
    <button class="tile" data-action="open-game" data-id="${g.id}" aria-label="${esc(g.title)}, ${esc(statusLabel(g.status))}">
      <div class="tile-art">
        <div class="art-slot" data-art="${g.id}">${artHTML(g)}</div>
        ${g.score != null ? `<span class="score-badge">${fmtScore(g.score)}</span>` : ''}
        ${g.favorite ? `<span class="fav-badge" title="Favourite">${ICON.heart}</span>` : ''}
        ${pct ? `<span class="progress-strip" data-tip="${pct}% of main story (HLTB)"><i style="width:${pct}%"></i></span>` : ''}
      </div>
      <div class="tile-meta">
        <div class="tile-title">${esc(g.title)}</div>
        <div class="tile-sub">${statusPill(g.status)} <span>${fmtH(g.hoursPlayed)}</span></div>
      </div>
    </button>`;
}

function emptyHTML(title, text, withDemo = false) {
  return `
    <div class="empty">
      <div class="empty-art" aria-hidden="true"><i></i><i></i></div>
      <h2>${esc(title)}</h2>
      <p>${esc(canEdit ? text : 'Nothing to show here yet.')}</p>
      <div class="btn-row owner-only" style="justify-content:center">
        <button class="btn btn-primary" data-action="new-game"><span class="face"><b>A</b></span> Add a game</button>
        ${withDemo ? '<button class="btn" data-action="demo">Try demo data</button>' : ''}
      </div>
    </div>`;
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ------------------------------------------------------------------ */
/* Cover art (Wikipedia: keyless, CORS-enabled, has most box art)      */
/* ------------------------------------------------------------------ */
const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const coverCache = new Map();

const normTitle = s => s.toLowerCase()
  .replace(/\s*\((?:\d{4} )?(?:video )?game\)$/, '')
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

async function searchCovers(title, limit = 8) {
  const key = `${title}|${limit}`;
  if (coverCache.has(key)) return coverCache.get(key);
  const params = new URLSearchParams({
    action: 'query', format: 'json', origin: '*',
    generator: 'search', gsrsearch: `${title} video game`, gsrlimit: String(limit),
    prop: 'pageimages|description', piprop: 'thumbnail', pithumbsize: '600', pilicense: 'any',
  });
  const r = await fetch(`${WIKI_API}?${params}`);
  if (!r.ok) throw new Error(`Wikipedia ${r.status}`);
  const pages = Object.values((await r.json()).query?.pages || {});
  const want = normTitle(title);
  const results = pages
    .filter(p => p.thumbnail?.source)
    .map(p => {
      const desc = p.description || '';
      let score = -p.index;
      if (normTitle(p.title) === want) score += 100;
      else if (normTitle(p.title).startsWith(want) || want.startsWith(normTitle(p.title))) score += 15;
      if (/\bgame\b/i.test(desc)) score += 20;
      if (/series|franchise|character|film|album/i.test(desc)) score -= 40;
      return { title: p.title, desc, src: p.thumbnail.source, score };
    })
    .sort((a, b) => b.score - a.score);
  coverCache.set(key, results);
  return results;
}

function refreshArt(g) {
  $$(`[data-art="${CSS.escape(g.id)}"]`).forEach(el => { el.innerHTML = artHTML(g); });
}

let coverJob = null;
// Find covers for games that have none yet. Runs one request at a time and
// updates tiles in place, so it never steals focus from the search box.
function autoFillCovers(force = false) {
  if (coverJob) return coverJob;
  if (!force && !state.settings.autoCovers) return Promise.resolve(0);
  const todo = () => state.games.find(g => !g.cover && !g.coverTried);
  const job = (async () => {
    let found = 0, g;
    while ((g = todo())) {
      try {
        const best = (await searchCovers(g.title, 6))[0];
        if (best && best.score > 0) { g.cover = best.src; found++; }
      } catch (e) {
        break; // offline / blocked: try again next visit
      }
      g.coverTried = true;
      save();
      refreshArt(g);
      await new Promise(r => setTimeout(r, 120));
    }
    return found;
  })();
  // Clear the lock only after assigning it (the job may finish synchronously).
  coverJob = job;
  job.finally(() => { if (coverJob === job) coverJob = null; });
  return job;
}

/* ------------------------------------------------------------------ */
/* Views                                                               */
/* ------------------------------------------------------------------ */
function renderHome() {
  const games = state.games;
  const name = state.profile.name || 'Player';
  const totalH = sum(games.map(g => g.hoursPlayed));
  if (!games.length) {
    return `
      <div class="hello"><div><h1>${esc(possessive(name))} Personal Vault</h1><p>${esc(name)} hasn’t logged any games yet.</p></div></div>
      <div style="margin-top:18px">${emptyHTML('No games yet', 'Add the games I’m playing, have finished, or plan to play. Everything is saved in this browser.', true)}</div>`;
  }
  const playing = byStatus('playing').sort((a, b) => lastPlayed(b).localeCompare(lastPlayed(a)) || b.updated - a.updated);
  const others = games.filter(g => g.status !== 'playing').sort((a, b) => b.updated - a.updated).slice(0, 12);
  const shelf = [...playing, ...others];
  const finished = recentlyFinished();
  const reviewed = games.filter(g => g.review.trim() && g !== finished[0]).sort((a, b) => b.updated - a.updated).slice(0, 2);

  return `
    <div class="hello">
      <div>
        <h1>${esc(possessive(name))} Personal Vault</h1>
        <p>${playing.length ? `${esc(name)} is playing ${playing.length} game${playing.length > 1 ? 's' : ''} right now.` : `${esc(name)} isn’t playing anything right now.`}</p>
      </div>
      <button class="btn btn-primary owner-only" data-action="new-game"><span class="face"><b>+</b></span> Add game</button>
    </div>

    <div class="shelf" role="list" aria-label="Now playing and recent games">
      ${shelf.map(g => `<div role="listitem">${tileHTML(g)}</div>`).join('')}
      <div role="listitem" class="owner-only">
        <button class="tile add-tile" data-action="new-game" aria-label="Add a game">
          <div class="tile-art">${ICON.plus}</div>
          <div class="tile-meta"><div class="tile-title">Add game</div></div>
        </button>
      </div>
    </div>

    ${finished.length ? `
      <h2 class="section-title">Recently finished</h2>
      ${spotlightHTML(finished)}` : ''}

    <div class="quick-stats">
      <a class="qs" href="#stats"><span class="qs-ico" style="background:var(--red)">${ICON.clock}</span><div><b>${fmtH(totalH)}</b><span>Total play time</span></div></a>
      <a class="qs" href="#library"><span class="qs-ico" style="background:var(--s-completed)">${ICON.trophy}</span><div><b>${byStatus('completed').length}</b><span>Games completed</span></div></a>
      <a class="qs" href="#backlog"><span class="qs-ico" style="background:var(--s-backlog)">${ICON.list}</span><div><b>${byStatus('backlog').length}</b><span>In my backlog</span></div></a>
      <a class="qs" href="#library"><span class="qs-ico" style="background:var(--s-playing)">${ICON.gamepad}</span><div><b>${games.length}</b><span>Games logged</span></div></a>
    </div>

    ${reviewed.length ? `
      <h2 class="section-title">Latest reviews</h2>
      <div class="reviews">${reviewed.map(reviewCardHTML).join('')}</div>` : ''}
  `;
}

function recentlyFinished() {
  return byStatus('completed').sort((a, b) =>
    (b.finishDate || '').localeCompare(a.finishDate || '') || b.updated - a.updated);
}

function spotlightHTML([g, ...rest]) {
  const meta = [
    g.score != null ? `<span class="spot-score">${fmtScore(g.score)}<small>/10</small></span>` : '',
    g.hoursPlayed ? `<span class="hltb">${ICON.clock.replace('<svg', '<svg width="12" height="12"')} ${fmtH(g.hoursPlayed)}</span>` : '',
    g.hltb.main && g.hoursPlayed ? `<span class="hltb">HLTB ${fmtH(g.hltb.main)}</span>` : '',
  ].join('');
  return `
    <div class="spotlight">
      <article class="spot-main">
        <button class="spot-art" data-art="${g.id}" data-action="open-game" data-id="${g.id}" aria-label="Open ${esc(g.title)}">${artHTML(g)}</button>
        <div class="spot-body">
          <span class="spot-kicker">${ICON.trophy} ${g.finishDate ? `Finished ${fmtDate(g.finishDate)}` : 'Completed'}</span>
          <h3>${esc(g.title)}</h3>
          ${g.score != null ? stars(g.score) : ''}
          <div class="row-sub">${meta}</div>
          ${g.review ? `<blockquote>${esc(g.review)}</blockquote>` : ''}
          <div><button class="btn btn-sm" data-action="open-game" data-id="${g.id}">${g.review ? 'Read the review' : 'See details'}</button></div>
        </div>
      </article>
      ${rest.length ? `
        <ol class="spot-list" aria-label="Also finished">
          ${rest.slice(0, 4).map(x => `
            <li><button class="spot-item" data-action="open-game" data-id="${x.id}">
              <span class="row-art" data-art="${x.id}">${artHTML(x)}</span>
              <span><b>${esc(x.title)}</b><small>${x.finishDate ? fmtDate(x.finishDate) : 'Completed'}${x.score != null ? ` · ${fmtScore(x.score)}/10` : ''}</small></span>
            </button></li>`).join('')}
        </ol>` : ''}
    </div>`;
}

function reviewCardHTML(g) {
  return `
    <article class="review-card">
      <button class="row-art" data-art="${g.id}" data-action="open-game" data-id="${g.id}" aria-label="Open ${esc(g.title)}">${artHTML(g)}</button>
      <div>
        <h3>${esc(g.title)}</h3>
        <div class="row-sub">${stars(g.score)}${g.score != null ? ` <span>${fmtScore(g.score)}/10</span>` : ''}</div>
        <blockquote>${esc(g.review)}</blockquote>
      </div>
    </article>`;
}

/* Library */
const lib = { filter: 'all', q: '', sort: 'updated' }; // mirrored in the URL, see writeLibToHash()

function renderLibrary() {
  const counts = Object.fromEntries(STATUSES.map(s => [s.id, byStatus(s.id).length]));
  if (!state.games.length) {
    return `<div class="page-head"><div><h1>Library</h1><p>All my games in one place.</p></div></div>
            ${emptyHTML('My library is empty', 'Add the first game to get started.', true)}`;
  }
  return `
    <div class="page-head">
      <div><h1>Library</h1><p>${state.games.length} games logged</p></div>
      <button class="btn btn-primary owner-only" data-action="new-game"><span class="face"><b>+</b></span> Add game</button>
    </div>
    <div class="toolbar">
      <label class="search">${ICON.search}<span class="sr-only">Search games</span>
        <input type="search" id="libSearch" placeholder="Search my games…" value="${esc(lib.q)}" autocomplete="off">
      </label>
      <label class="sr-only" for="libSort">Sort by</label>
      <select class="select" id="libSort">
        ${[['updated', 'Recently updated'], ['title', 'Title A–Z'], ['score', 'Highest score'], ['hours', 'Most played'], ['added', 'Recently added']]
          .map(([v, l]) => `<option value="${v}" ${lib.sort === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
    </div>
    <div class="chips" role="group" aria-label="Filter by status" style="margin-bottom:20px">
      <button class="chip" data-action="lib-filter" data-status="all" aria-pressed="${lib.filter === 'all'}">All <span class="count">${state.games.length}</span></button>
      <button class="chip" data-action="lib-filter" data-status="fav" aria-pressed="${lib.filter === 'fav'}">♥ Favourites <span class="count">${state.games.filter(g => g.favorite).length}</span></button>
      ${STATUSES.map(s => `<button class="chip" data-action="lib-filter" data-status="${s.id}" aria-pressed="${lib.filter === s.id}"><span class="dot" style="background:var(--s-${s.id})"></span>${s.label} <span class="count">${counts[s.id]}</span></button>`).join('')}
    </div>
    <div id="libGrid">${libraryGridHTML()}</div>`;
}

function libraryGridHTML() {
  const q = lib.q.trim().toLowerCase();
  let list = state.games.filter(g =>
    (lib.filter === 'all' || (lib.filter === 'fav' ? g.favorite : g.status === lib.filter)) &&
    (!q || `${g.title} ${g.review}`.toLowerCase().includes(q)));
  const sorters = {
    updated: (a, b) => b.updated - a.updated,
    title: (a, b) => a.title.localeCompare(b.title),
    score: (a, b) => (b.score ?? -1) - (a.score ?? -1),
    hours: (a, b) => b.hoursPlayed - a.hoursPlayed,
    added: (a, b) => (b.addedDate || '').localeCompare(a.addedDate || ''),
  };
  list.sort(sorters[lib.sort] || sorters.updated);
  if (!list.length) return `<div class="empty"><h2>No matches</h2><p>Try a different search or filter.</p></div>`;
  return `<div class="grid">${list.map(tileHTML).join('')}</div>`;
}

/* Backlog */
function renderBacklog() {
  const backlog = byStatus('backlog');
  const prioRank = { high: 0, medium: 1, low: 2 };
  backlog.sort((a, b) => prioRank[a.priority] - prioRank[b.priority] || (a.addedDate || '').localeCompare(b.addedDate || ''));
  const playing = byStatus('playing');
  const onhold = byStatus('onhold');

  const backlogHours = sum(backlog.map(g => g.hltb.main));
  const missing = backlog.filter(g => !g.hltb.main).length;
  const remainingPlaying = sum(playing.map(g => g.hltb.main ? Math.max(0, g.hltb.main - g.hoursPlayed) : 0));
  const perWeek = state.settings.hoursPerWeek || 7;
  const totalToGo = backlogHours + remainingPlaying;
  const weeks = totalToGo / perWeek;
  const eta = weeks < 1 ? 'under a week' : weeks < 10 ? `${round1(weeks)} weeks` : weeks < 104 ? `${Math.round(weeks / 4.345)} months` : `${round1(weeks / 52)} years`;

  const rowHTML = (g, actions) => `
    <div class="row">
      <button class="row-art" data-art="${g.id}" data-action="open-game" data-id="${g.id}" aria-label="Open ${esc(g.title)}">${artHTML(g)}</button>
      <div class="row-main">
        <button class="row-title" data-action="open-game" data-id="${g.id}">${esc(g.title)}</button>
        <div class="row-sub">
          ${g.hltb.main ? `<span class="hltb" data-tip="HowLongToBeat: Main story">${ICON.clock.replace('<svg', '<svg width="12" height="12"')} ${fmtH(g.hltb.main)}</span>` : '<span class="hltb">No HLTB time</span>'}
          ${g.hltb.extra ? `<span class="hltb" data-tip="Main + extras">+ ${fmtH(g.hltb.extra)}</span>` : ''}
          ${g.hltb.complete ? `<span class="hltb" data-tip="Completionist">100% ${fmtH(g.hltb.complete)}</span>` : ''}
          ${g.status === 'playing' && g.hltb.main ? `<span class="hltb" data-tip="Played / main story">${progressPct(g)}% done</span>` : ''}
        </div>
      </div>
      <div class="row-actions">${actions(g)}</div>
    </div>`;

  return `
    <div class="page-head">
      <div><h1>Backlog</h1><p>My pile of shame, lovingly organised.</p></div>
      <button class="btn btn-primary owner-only" data-action="new-game" data-status="backlog"><span class="face"><b>+</b></span> Add to backlog</button>
    </div>

    <div class="backlog-hero">
      <div class="card"><div class="big-num">${backlog.length}</div><div class="big-label">Games waiting</div></div>
      <div class="card"><div class="big-num">${fmtH(backlogHours)}</div><div class="big-label">To beat the backlog (main story)${missing ? ` · ${missing} without HLTB time` : ''}</div></div>
      <div class="card">
        <div class="big-num">${totalToGo ? eta : '—'}</div>
        <div class="big-label">Until everything is beaten</div>
        <label class="inline-input">at <input type="number" min="1" max="168" step="1" id="perWeek" value="${perWeek}"> hours / week</label>
      </div>
    </div>

    <h2 class="section-title">Up next <small>sorted by priority${canEdit ? ' — tap a priority to change it' : ''}</small></h2>
    ${backlog.length ? `<div class="list">${backlog.map(g => rowHTML(g, g => `
        ${canEdit
          ? `<button class="prio prio-${g.priority}" data-action="cycle-prio" data-id="${g.id}" aria-label="Priority ${g.priority}, change">${g.priority}</button>`
          : `<span class="prio prio-${g.priority}">${g.priority} priority</span>`}
        <button class="btn btn-sm owner-only" data-action="start-game" data-id="${g.id}">${ICON.play} Start</button>`)).join('')}</div>`
      : emptyHTML('Backlog is clear!', 'Nothing waiting. Add games to play later.')}

    ${playing.length ? `
      <h2 class="section-title">In progress <small>${fmtH(remainingPlaying)} left on main stories</small></h2>
      <div class="list">${playing.map(g => rowHTML(g, g => `<button class="btn btn-sm owner-only" data-action="quick-log" data-id="${g.id}" aria-label="Log 1 hour of ${esc(g.title)} today">+1h today</button><button class="btn btn-sm owner-only" data-action="open-game" data-id="${g.id}">${ICON.pen} Update</button>`)).join('')}</div>` : ''}

    ${onhold.length ? `
      <h2 class="section-title">On hold</h2>
      <div class="list">${onhold.map(g => rowHTML(g, g => `<button class="btn btn-sm owner-only" data-action="start-game" data-id="${g.id}">${ICON.play} Resume</button>`)).join('')}</div>` : ''}
  `;
}

/* Stats */
function chartCard({ title, sub = '', body, table, wide = false }) {
  return `
    <section class="chart-card${wide ? ' wide' : ''}">
      <h3>${esc(title)}</h3>
      ${sub ? `<p class="sub">${esc(sub)}</p>` : ''}
      ${body}
      ${table ? `<details><summary>Show as table</summary>${table}</details>` : ''}
    </section>`;
}
function tableHTML(head, rows) {
  return `<table><thead><tr>${head.map((h, i) => `<th${i ? ' class="n"' : ''}>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td${i ? ' class="n"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function hbarsHTML(items, fmt) {
  const max = Math.max(...items.map(i => i.value), 0) || 1;
  return `<div class="hbars">${items.map(i => `
    <div class="hbar" tabindex="0" data-tip="${esc(i.tip || `${i.label}: ${fmt(i.value)}`)}">
      <span class="hbar-label">${esc(i.label)}</span>
      <span class="hbar-track"><span class="hbar-fill" style="width:${(i.value / max) * 100}%"></span></span>
      <span class="hbar-val">${fmt(i.value)}</span>
    </div>`).join('')}</div>`;
}
function vbarsHTML(items, fmt) {
  const max = Math.max(...items.map(i => i.value), 0) || 1;
  return `
    <div class="vbars">${items.map(i => `
      <div class="vbar" tabindex="0" data-tip="${esc(i.tip || `${i.label}: ${fmt(i.value)}`)}">
        ${i.value ? `<span class="vbar-top" style="bottom:calc(${(i.value / max) * 100}% + 4px)">${fmt(i.value)}</span>` : ''}
        <span class="vbar-fill" style="height:${(i.value / max) * 100}%"></span>
      </div>`).join('')}
    </div>
    <div class="vlabels">${items.map(i => `<span>${esc(i.label)}</span>`).join('')}</div>`;
}

function renderStats() {
  const games = state.games;
  if (!games.length) {
    return `<div class="page-head"><div><h1>Stats</h1><p>Numbers about my play time.</p></div></div>
            ${emptyHTML('No stats yet', 'Add a few games and the stats will appear here.', true)}`;
  }
  const completed = byStatus('completed');
  const scored = games.filter(g => g.score != null);
  const totalH = sum(games.map(g => g.hoursPlayed));
  const avgScore = scored.length ? sum(scored.map(g => g.score)) / scored.length : null;
  const started = games.filter(g => g.status !== 'backlog');
  const completionRate = started.length ? Math.round((completed.length / started.length) * 100) : 0;
  const avgPerCompleted = completed.length ? sum(completed.map(g => g.hoursPlayed)) / completed.length : 0;

  /* status split */
  const statusCounts = STATUSES.map(s => ({ ...s, n: byStatus(s.id).length }));
  const stack = `
    <div class="stack" role="img" aria-label="${statusCounts.map(s => `${s.label} ${s.n}`).join(', ')}">
      ${statusCounts.filter(s => s.n).map(s => `<span tabindex="0" style="flex:${s.n};background:var(--s-${s.id})" data-tip="${s.label}: ${s.n} game${s.n > 1 ? 's' : ''} (${Math.round((s.n / games.length) * 100)}%)"></span>`).join('')}
    </div>
    <div class="legend">${statusCounts.map(s => `<span><span class="dot" style="background:var(--s-${s.id})"></span>${s.label} <b>${s.n}</b></span>`).join('')}</div>`;

  /* most played */
  const top = [...games].filter(g => g.hoursPlayed > 0).sort((a, b) => b.hoursPlayed - a.hoursPlayed).slice(0, 10);

  /* score distribution */
  const buckets = Array.from({ length: 10 }, (_, i) => ({ label: String(i + 1), value: 0 }));
  scored.forEach(g => { buckets[Math.min(9, Math.max(0, Math.ceil(g.score) - 1))].value++; });
  buckets.forEach(b => { b.tip = `Score ${b.label}: ${b.value} game${b.value === 1 ? '' : 's'}`; });

  /* completed per year */
  const yearMap = new Map();
  completed.forEach(g => {
    const y = (g.finishDate || '').slice(0, 4);
    if (y) yearMap.set(y, (yearMap.get(y) || 0) + 1);
  });
  const years = [...yearMap.keys()].sort();
  const yearItems = [];
  if (years.length) {
    for (let y = +years[0]; y <= +years[years.length - 1]; y++) {
      const v = yearMap.get(String(y)) || 0;
      yearItems.push({ label: String(y), value: v, tip: `${y}: ${v} game${v === 1 ? '' : 's'} beaten` });
    }
  }

  /* play time per month, from logged sessions (last 12 months) */
  const allSessions = games.flatMap(g => g.sessions);
  const monthItems = [];
  if (allSessions.length) {
    const perMonth = new Map();
    allSessions.forEach(s => { const m = s.date.slice(0, 7); perMonth.set(m, (perMonth.get(m) || 0) + s.hours); });
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const v = round2(perMonth.get(key) || 0);
      const long = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      monthItems.push({ label: d.toLocaleDateString(undefined, { month: 'short' }), long, value: v, tip: `${long}: ${fmtH(v)}` });
    }
  }

  /* pace vs HLTB */
  const pace = completed.filter(g => g.hltb.main && g.hoursPlayed)
    .map(g => ({ g, diff: Math.round(((g.hoursPlayed - g.hltb.main) / g.hltb.main) * 100) }))
    .sort((a, b) => a.diff - b.diff);
  const paceHTML = pace.length ? `
    <div class="diverge">${pace.map(({ g, diff }) => {
      const w = Math.min(100, Math.abs(diff)) / 2;
      const tip = `${g.title}\nMe: ${fmtH(g.hoursPlayed)} · HLTB main: ${fmtH(g.hltb.main)}\n${diff === 0 ? 'Right on par' : diff < 0 ? `${-diff}% faster` : `${diff}% longer`}`;
      return `<div class="drow" tabindex="0" data-tip="${esc(tip)}">
        <span class="hbar-label">${esc(g.title)}</span>
        <span class="dtrack"><span class="dfill ${diff < 0 ? 'fast' : 'slow'}" style="width:${w}%"></span></span>
        <span class="hbar-val">${diff > 0 ? '+' : ''}${diff}%</span>
      </div>`;
    }).join('')}</div>
    <div class="daxis"><span></span><div><span>◀ faster</span><span>HLTB</span><span>longer ▶</span></div><span></span></div>`
    : `<div class="no-data">Complete a game that has an HLTB main time to see my pace.</div>`;

  /* fun facts */
  const longest = top[0];
  const best = [...scored].sort((a, b) => b.score - a.score || b.hoursPlayed - a.hoursPlayed)[0];
  const quickest = [...completed].filter(g => g.hoursPlayed).sort((a, b) => a.hoursPlayed - b.hoursPlayed)[0];
  const fact = (color, icon, title, text) => `<div class="fact"><span class="qs-ico" style="background:${color}">${icon}</span><div><b>${esc(title)}</b><span>${esc(text)}</span></div></div>`;

  return `
    <div class="page-head"><div><h1>Stats</h1><p>My play history in numbers.</p></div></div>

    <div class="stat-tiles">
      <div class="stat-tile"><div class="big-num">${games.length}</div><div class="big-label">Games logged</div><div class="hint">${started.length} started</div></div>
      <div class="stat-tile" style="--accent:var(--s-completed)"><div class="big-num">${completed.length}</div><div class="big-label">Completed</div><div class="hint">${completionRate}% of started games</div></div>
      <div class="stat-tile" style="--accent:var(--s-playing)"><div class="big-num">${fmtH(totalH)}</div><div class="big-label">Total play time</div><div class="hint">≈ ${round1(totalH / 24)} days</div></div>
      <div class="stat-tile" style="--accent:var(--s-onhold)"><div class="big-num">${avgScore == null ? '—' : avgScore.toFixed(1)}</div><div class="big-label">Average score</div><div class="hint">${scored.length} rated</div></div>
      <div class="stat-tile" style="--accent:var(--s-backlog)"><div class="big-num">${fmtH(avgPerCompleted)}</div><div class="big-label">Avg. per completed game</div><div class="hint">${byStatus('backlog').length} in backlog</div></div>
    </div>

    <div class="charts">
      ${chartCard({
        title: 'Library by status', sub: `${games.length} games`, wide: true, body: stack,
        table: tableHTML(['Status', 'Games', 'Share'], statusCounts.map(s => [s.label, s.n, `${Math.round((s.n / games.length) * 100)}%`])),
      })}
      ${chartCard({
        title: 'Most played', sub: 'Hours per game, top 10',
        body: top.length ? hbarsHTML(top.map(g => ({ label: g.title, value: g.hoursPlayed })), fmtH) : '<div class="no-data">Log some play time to see this.</div>',
        table: top.length && tableHTML(['Game', 'Hours'], top.map(g => [g.title, round1(g.hoursPlayed)])),
      })}
      ${chartCard({
        title: 'Score distribution', sub: scored.length ? `${scored.length} rated games, average ${avgScore.toFixed(1)}` : 'No rated games yet',
        body: scored.length ? vbarsHTML(buckets, v => v) : '<div class="no-data">Rate a game to see this.</div>',
        table: scored.length && tableHTML(['Score', 'Games'], buckets.map(b => [b.label, b.value])),
      })}
      ${monthItems.length ? chartCard({
        title: 'Play time per month', sub: 'Logged play sessions, last 12 months', wide: true,
        body: vbarsHTML(monthItems, v => (v ? fmtH(v) : '')),
        table: tableHTML(['Month', 'Hours'], monthItems.map(m => [m.long, round1(m.value)])),
      }) : ''}
      ${chartCard({
        title: 'Games beaten per year', sub: 'Based on finish date', wide: true,
        body: yearItems.length ? vbarsHTML(yearItems, v => v) : '<div class="no-data">Add a finish date to completed games to see this.</div>',
        table: yearItems.length && tableHTML(['Year', 'Games'], yearItems.map(y => [y.label, y.value])),
      })}
      ${chartCard({
        title: 'My pace vs HowLongToBeat', sub: 'Completed games: my time compared with the HLTB main-story time', wide: true,
        body: paceHTML,
        table: pace.length && tableHTML(['Game', 'Me', 'HLTB main', 'Diff'], pace.map(({ g, diff }) => [g.title, fmtH(g.hoursPlayed), fmtH(g.hltb.main), `${diff > 0 ? '+' : ''}${diff}%`])),
      })}
    </div>

    <h2 class="section-title">Highlights</h2>
    <div class="facts">
      ${longest ? fact('var(--red)', ICON.clock, longest.title, `Most played · ${fmtH(longest.hoursPlayed)}`) : ''}
      ${best ? fact('var(--s-onhold)', ICON.star, best.title, `Highest rated · ${fmtScore(best.score)}/10`) : ''}
      ${quickest ? fact('var(--s-completed)', ICON.bolt, quickest.title, `Quickest beat · ${fmtH(quickest.hoursPlayed)}`) : ''}
    </div>
  `;
}

/* Settings / data */
function renderData() {
  return `
    <div class="page-head"><div><h1>Settings</h1><p>Profile, theme and my data.</p></div></div>
    <div class="settings-grid">
      <section class="card">
        <h2>Profile</h2>
        <p>Used for the vault’s title and the avatar.</p>
        <div class="field"><label for="profileName">Name</label>
          <input class="input" id="profileName" maxlength="30" value="${esc(state.profile.name)}"></div>
        <div class="field" style="margin-top:14px"><span class="label">Theme</span>
          <div class="seg" role="radiogroup" aria-label="Theme">
            ${[['auto', 'Auto'], ['light', 'Basic White'], ['dark', 'Basic Black']].map(([v, l]) => `
              <input type="radio" name="theme" id="theme-${v}" value="${v}" ${state.settings.theme === v ? 'checked' : ''}><label for="theme-${v}">${l}</label>`).join('')}
          </div>
        </div>
      </section>

      <section class="card">
        <h2>Backup &amp; publish</h2>
        <p>My games are saved in this browser. To show them on my GitHub Pages site for everyone:</p>
        <p id="pubStatus" class="pub-status" hidden></p>
        <ol>
          <li>Click <b>Export</b> to download <code>games.json</code>.</li>
          <li>Replace <code>data/games.json</code> in the repository with it.</li>
          <li>Commit &amp; push. Visitors will see my list.</li>
        </ol>
        <div class="btn-row">
          <button class="btn btn-primary" data-action="export">Export games.json</button>
          <button class="btn" data-action="import">Import…</button>
        </div>
      </section>

      <section class="card">
        <h2>Cover art</h2>
        <p>Box art is looked up on Wikipedia by title. I can always pick a different one, or paste my own image URL, in a game's sheet.</p>
        <label class="fav-toggle" style="margin-bottom:14px"><input type="checkbox" id="autoCovers" ${state.settings.autoCovers ? 'checked' : ''}> Find covers automatically</label>
        <div class="btn-row"><button class="btn" data-action="fetch-covers">${ICON.search} Find missing covers</button></div>
      </section>

      <section class="card">
        <h2>Visitors</h2>
        <p>Visitors see my published list read-only: no add, edit or delete buttons. Editing is unlocked on <b>this browser</b>. To unlock another browser, open <code>${esc(location.origin + location.pathname)}#edit</code> there.</p>
        <div class="btn-row"><button class="btn" data-action="lock-edit">Lock editing (view as a visitor)</button></div>
      </section>

      <section class="card">
        <h2>Reset</h2>
        <p>Load the published list from <code>data/games.json</code>, try the demo, or wipe everything in this browser.</p>
        <div class="btn-row">
          <button class="btn" data-action="load-published">Load published list</button>
          <button class="btn" data-action="demo">Load demo data</button>
          <button class="btn btn-danger" data-action="wipe">Erase all</button>
        </div>
      </section>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Game sheet: opened through the URL (?game=<id>), so Back closes it  */
/* ------------------------------------------------------------------ */
// id: what the sheet shows (null = closed). pushed: we added the history entry,
// so closing goes Back instead of adding another one. snapshot: form state at open.
const sheet = { id: null, pushed: false, snapshot: null, newStatus: null };
const formSnapshot = f => new URLSearchParams(new FormData(f)).toString();

function isDirty() {
  const f = $('#gameForm');
  return !!(sheet.id && f && sheet.snapshot != null && formSnapshot(f) !== sheet.snapshot);
}

let backPending = false; // a history.back() from closing hasn't landed yet

function openSheetUrl(id, newStatus = null) {
  // Opening right after closing: wait for that Back to finish, or it would close this one.
  if (backPending) { addEventListener('popstate', () => openSheetUrl(id, newStatus), { once: true }); return; }
  const { path, params } = parseHash();
  params.set('game', id);
  sheet.newStatus = newStatus;
  sheet.pushed = true;
  location.hash = buildHash(path, params); // hashchange -> syncSheet()
}

function leaveSheetUrl() {
  const { path, params } = parseHash();
  if (!params.has('game')) return;
  if (sheet.pushed) { sheet.pushed = false; backPending = true; history.back(); return; }
  params.delete('game');
  replaceHash(path, params);
}

// Make the sheet match the URL.
function syncSheet() {
  const want = parseHash().params.get('game');
  if (want) {
    if (sheet.id === want) return;
    if (want === 'new') {
      if (!canEdit) { leaveSheetUrl(); return; }
      openGameDialog(null, sheet.newStatus);
    } else if (getGame(want)) {
      if (canEdit) openGameDialog(want); else openGameView(want);
    } else {
      toast('That game isn’t in the list');
      sheet.pushed = false;
      leaveSheetUrl();
      return;
    }
    sheet.id = want;
    const f = $('#gameForm');
    sheet.snapshot = f ? formSnapshot(f) : null;
  } else if (sheet.id) {
    // Back was pressed while the sheet was open.
    if (isDirty() && !confirm('Discard changes?')) {
      const { path, params } = parseHash();
      params.set('game', sheet.id);
      history.pushState(null, '', buildHash(path, params));
      sheet.pushed = true;
      return;
    }
    hideSheet();
  }
}

// Close button, Escape, backdrop, swipe, Save, Delete.
function requestClose({ force = false } = {}) {
  if (!force && isDirty() && !confirm('Discard changes?')) return false;
  hideSheet();
  leaveSheetUrl();
  return true;
}

function showSheet() {
  const dlg = $('#gameDialog');
  dlg.classList.remove('closing');
  dlg.style.transform = '';
  if (!dlg.open) dlg.showModal();
  // Focus the sheet itself rather than the × button (no stray focus ring); Tab moves into it.
  dlg.tabIndex = -1;
  dlg.focus();
  $('.sheet-body', dlg)?.scrollTo(0, 0);
}

function hideSheet() {
  const dlg = $('#gameDialog');
  sheet.id = null;
  sheet.snapshot = null;
  if (!dlg.open) return;
  if (!isPhone() || reducedMotion()) { dlg.close(); return; }
  dlg.classList.add('closing'); // slide down, then close
  setTimeout(() => {
    dlg.classList.remove('closing');
    dlg.style.transform = '';
    if (!sheet.id) dlg.close();
  }, 220);
}

function openGameDialog(id, presetStatus) {
  const existing = id ? getGame(id) : null;
  const g = existing || normalizeGame({ title: '', status: presetStatus || 'playing' });
  if (!existing) g.title = '';
  const dlg = $('#gameDialog');
  const hltbUrl = `https://howlongtobeat.com/?q=${encodeURIComponent(g.title)}`;

  dlg.innerHTML = `
    <form method="dialog" id="gameForm" novalidate>
      <div class="sheet-head">
        <span class="row-art" id="dlgArt">${existing ? artHTML(g) : `<div class="gen-art" style="--h:0"><span>+</span></div>`}</span>
        <div><h2 id="dlgTitle">${existing ? esc(g.title) : 'Add a game'}</h2><p>${existing ? `Added ${fmtDate(g.addedDate)}` : 'Log something I play or want to play'}</p></div>
        <button type="button" class="sheet-close" data-action="close-dialog" aria-label="Close">×</button>
      </div>

      <div class="sheet-body">
        <div class="field"><label for="f-title">Title</label>
            <input class="input" id="f-title" name="title" required value="${esc(g.title)}" placeholder="e.g. Super Mario Odyssey" autocomplete="off"></div>

        <div class="field"><span class="label">Status</span>
          <div class="seg" role="radiogroup" aria-label="Status">
            ${STATUSES.map(s => `<input type="radio" name="status" id="st-${s.id}" value="${s.id}" ${g.status === s.id ? 'checked' : ''}><label for="st-${s.id}"><span class="dot" style="background:var(--s-${s.id})"></span>${s.label}</label>`).join('')}
          </div>
        </div>

        <div class="field" id="prioField" ${g.status === 'backlog' ? '' : 'hidden'}><span class="label">Backlog priority</span>
          <div class="seg" role="radiogroup" aria-label="Priority">
            ${PRIORITIES.map(p => `<input type="radio" name="priority" id="pr-${p}" value="${p}" ${g.priority === p ? 'checked' : ''}><label for="pr-${p}" style="text-transform:capitalize">${p}</label>`).join('')}
          </div>
        </div>

        <div class="field"><label for="f-score">My score</label>
          <div class="score-field">
            <input type="range" id="f-score" name="score" min="0" max="10" step="0.5" value="${g.score ?? 0}" aria-describedby="scoreOut">
            <output class="score-out ${g.score == null ? 'none' : ''}" id="scoreOut">${g.score == null ? 'Not rated' : fmtScore(g.score)}</output>
          </div>
          <div id="scoreStars">${stars(g.score)}</div>
        </div>

        <div class="field"><label for="f-hours">Time played</label>
          <div class="hours-field">
            <input class="input" type="number" min="0" step="0.25" id="f-hours" name="hoursPlayed" value="${round2(g.hoursPlayed)}">
            <span class="unit">hours in total</span>
          </div>
          <div class="session-log">
            <span class="sublabel">Log a play session</span>
            <div class="session-add">
              <input class="input" type="date" id="f-sdate" value="${today()}" max="${today()}" aria-label="Session date">
              <button type="button" class="btn btn-sm" data-action="log-session" data-h="0.5">+½h</button>
              <button type="button" class="btn btn-sm" data-action="log-session" data-h="1">+1h</button>
              <button type="button" class="btn btn-sm" data-action="log-session" data-h="2">+2h</button>
              <span class="session-custom">
                <input class="input" type="number" min="0.25" step="0.25" id="f-shours" placeholder="h" aria-label="Other amount, in hours">
                <button type="button" class="btn btn-sm" data-action="log-session">Add</button>
              </span>
            </div>
            <input type="hidden" name="sessions" value="${esc(JSON.stringify(g.sessions))}">
            <ul class="session-list" id="sessionList">${sessionListHTML(g.sessions, true)}</ul>
          </div>
        </div>

        <div class="field">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
            <span class="label">How long to beat (hours)</span>
            <a class="hint-link" id="hltbLink" href="${hltbUrl}" target="_blank" rel="noopener">Look up on HowLongToBeat ↗</a>
          </div>
          <div class="hltb-grid">
            <label><input class="input" type="number" min="0" step="0.5" name="hltbMain" value="${g.hltb.main ?? ''}" placeholder="—">Main story</label>
            <label><input class="input" type="number" min="0" step="0.5" name="hltbExtra" value="${g.hltb.extra ?? ''}" placeholder="—">Main + extras</label>
            <label><input class="input" type="number" min="0" step="0.5" name="hltbComplete" value="${g.hltb.complete ?? ''}" placeholder="—">Completionist</label>
          </div>
        </div>

        <div class="form-grid">
          <div class="field"><label for="f-start">Started</label><input class="input" type="date" id="f-start" name="startDate" value="${esc(g.startDate)}"></div>
          <div class="field"><label for="f-finish">Finished</label><input class="input" type="date" id="f-finish" name="finishDate" value="${esc(g.finishDate)}"></div>
          <div class="field span-all"><label for="f-cover">Cover image</label>
            <div class="cover-row">
              <input class="input" type="url" id="f-cover" name="cover" value="${esc(g.cover)}" placeholder="Search, or paste an image URL">
              <button type="button" class="btn" data-action="find-cover">${ICON.search} Find cover</button>
            </div>
            <div id="coverResults" class="cover-results" hidden></div>
          </div>
        </div>

        <div class="field"><label for="f-review">Review</label>
          <textarea class="textarea" id="f-review" name="review" placeholder="What did I love? What bugged me? Would I recommend it?">${esc(g.review)}</textarea>
        </div>

        <label class="fav-toggle"><input type="checkbox" name="favorite" ${g.favorite ? 'checked' : ''}> ${ICON.heart.replace('<svg', '<svg width="18" height="18" style="color:var(--red)"')} Favourite</label>
      </div>

      <div class="sheet-foot">
        ${existing ? `<button type="button" class="btn btn-danger btn-sm" data-action="delete-game" data-id="${g.id}">Delete</button>` : ''}
        <div class="right">
          <button type="button" class="btn" data-action="close-dialog"><span class="face"><b>B</b></span> Cancel</button>
          <button type="submit" class="btn btn-primary"><span class="face"><b>A</b></span> Save</button>
        </div>
      </div>
    </form>`;

  const form = $('#gameForm');
  form.dataset.id = existing ? g.id : '';

  const range = $('#f-score');
  range.addEventListener('input', () => {
    const v = parseFloat(range.value);
    const out = $('#scoreOut');
    out.textContent = v ? fmtScore(v) : 'Not rated';
    out.classList.toggle('none', !v);
    $('#scoreStars').innerHTML = stars(v || null);
  });
  form.elements.title.addEventListener('input', () => {
    $('#hltbLink').href = `https://howlongtobeat.com/?q=${encodeURIComponent(form.elements.title.value)}`;
  });
  $$('input[name="status"]', form).forEach(r => r.addEventListener('change', () => {
    $('#prioField').hidden = form.elements.status.value !== 'backlog';
    if (form.elements.status.value === 'completed' && !form.elements.finishDate.value) form.elements.finishDate.value = today();
    if (['playing', 'completed'].includes(form.elements.status.value) && !form.elements.startDate.value) form.elements.startDate.value = today();
  }));
  form.elements.title.addEventListener('change', () => {
    if (!form.elements.cover.value.trim() && form.elements.title.value.trim()) findCoversInDialog(true);
  });
  form.elements.cover.addEventListener('change', () => setDialogArt(form.elements.cover.value.trim()));
  form.addEventListener('submit', e => { e.preventDefault(); saveGameFromForm(form); });

  showSheet();
  // On phones, don't throw the keyboard up before the sheet is even visible.
  if (!existing && !isCoarse()) setTimeout(() => form.elements.title.focus(), 50);
}

function sessionListHTML(list, editable = false) {
  if (!list.length) return editable ? '<li class="session-empty">No sessions logged yet. Each one adds to the total.</li>' : '';
  const max = Math.max(...list.map(s => s.hours));
  return [...list].reverse().map(s => `
    <li>
      <span class="session-date">${esc(fmtDate(s.date))}</span>
      <span class="session-bar"><i style="width:${(s.hours / max) * 100}%"></i></span>
      <b>${fmtH(s.hours)}</b>
      ${editable ? `<button type="button" class="session-del" data-action="del-session" data-date="${s.date}" aria-label="Remove ${esc(fmtDate(s.date))} session">×</button>` : ''}
    </li>`).join('');
}
const readSessions = form => normSessions(JSON.parse(form.elements.sessions.value || '[]'));
function writeSessions(form, list) {
  form.elements.sessions.value = JSON.stringify(list);
  $('#sessionList').innerHTML = sessionListHTML(list, true);
}
function bumpTotal(form, h) {
  const inp = form.elements.hoursPlayed;
  inp.value = round2(Math.max(0, (parseFloat(inp.value) || 0) + h));
}

function setDialogArt(src) {
  const title = $('#gameForm').elements.title.value.trim() || '+';
  $('#dlgArt').innerHTML = artHTML({ title, cover: src });
}

async function findCoversInDialog(autoPick = false) {
  const form = $('#gameForm');
  const title = form.elements.title.value.trim();
  const box = $('#coverResults');
  if (!title) { toast('Enter a title first'); form.elements.title.focus(); return; }
  box.hidden = false;
  box.innerHTML = '<div class="cover-msg">Searching Wikipedia…</div>';
  try {
    const results = await searchCovers(title, 8);
    if (!$('#gameForm') || form.elements.title.value.trim() !== title) return; // dialog changed meanwhile
    if (!results.length) { box.innerHTML = '<div class="cover-msg">No covers found. Try a shorter title, or paste an image URL.</div>'; return; }
    const current = form.elements.cover.value.trim();
    box.innerHTML = results.map(r => `
      <button type="button" class="cover-pick" data-action="pick-cover" data-src="${esc(r.src)}" aria-pressed="${r.src === current}" title="${esc(r.title)}">
        <img src="${esc(r.src)}" alt="" loading="lazy">
        <span>${esc(r.title)}</span>
      </button>`).join('') + '<p class="cover-credit">Images from Wikipedia</p>';
    if (autoPick && !form.elements.cover.value.trim() && results[0].score > 0) {
      $('.cover-pick', box).click();
    }
  } catch (e) {
    box.innerHTML = '<div class="cover-msg">Could not reach Wikipedia. Check the connection or paste an image URL.</div>';
  }
}

function openGameView(id) {
  const g = getGame(id);
  if (!g) return;
  const pct = progressPct(g);
  const info = (label, value) => `<div class="info"><span>${label}</span><b>${value}</b></div>`;
  const dlg = $('#gameDialog');
  dlg.innerHTML = `
    <form method="dialog">
      <div class="sheet-head">
        <span class="row-art">${artHTML(g)}</span>
        <div><h2 id="dlgTitle">${esc(g.title)}</h2><p>${esc(statusLabel(g.status))}${g.favorite ? ' · ♥ Favourite' : ''}</p></div>
        <button type="button" class="sheet-close" data-action="close-dialog" aria-label="Close">×</button>
      </div>
      <div class="sheet-body">
        <div class="info-grid">
          ${info('Score', g.score != null ? `${fmtScore(g.score)}<small>/10</small>` : 'Not rated')}
          ${info('Time played', fmtH(g.hoursPlayed))}
          ${g.status === 'playing' && pct ? info('Progress', `${pct}%`) : ''}
          ${g.startDate ? info('Started', fmtDate(g.startDate)) : ''}
          ${g.finishDate ? info('Finished', fmtDate(g.finishDate)) : ''}
          ${lastPlayed(g) && g.status !== 'completed' ? info('Last played', fmtDate(lastPlayed(g))) : ''}
        </div>
        ${g.score != null ? stars(g.score) : ''}
        ${g.hltb.main || g.hltb.extra || g.hltb.complete ? `
          <div class="field"><span class="label">How long to beat</span>
            <div class="info-grid">
              ${info('Main story', g.hltb.main ? fmtH(g.hltb.main) : '—')}
              ${info('Main + extras', g.hltb.extra ? fmtH(g.hltb.extra) : '—')}
              ${info('Completionist', g.hltb.complete ? fmtH(g.hltb.complete) : '—')}
            </div>
          </div>` : ''}
        ${g.review ? `<div class="field"><span class="label">Review</span><p class="review-full">${esc(g.review)}</p></div>` : ''}
        ${g.sessions.length ? `
          <div class="field"><span class="label">Play sessions <small>${g.sessions.length} logged</small></span>
            <ul class="session-list">${sessionListHTML(g.sessions.slice(-10))}</ul>
          </div>` : ''}
      </div>
      <div class="sheet-foot">
        <button type="button" class="btn btn-sm" data-action="share-game" data-id="${g.id}">${ICON.share} Share</button>
        <div class="right"><button type="button" class="btn" data-action="close-dialog"><span class="face"><b>B</b></span> Close</button></div>
      </div>
    </form>`;
  showSheet();
}

function saveGameFromForm(form) {
  const title = form.elements.title.value.trim();
  if (!title) { form.elements.title.focus(); toast('Please enter a title'); return; }
  const id = form.dataset.id;
  const prev = id ? getGame(id) : null;
  const data = normalizeGame({
    ...(prev || {}),
    id: id || uid(),
    title,
    status: form.elements.status.value,
    priority: form.elements.priority.value,
    score: parseFloat(form.elements.score.value) || null,
    hoursPlayed: num(form.elements.hoursPlayed.value) ?? 0,
    sessions: readSessions(form),
    hltb: { main: num(form.elements.hltbMain.value), extra: num(form.elements.hltbExtra.value), complete: num(form.elements.hltbComplete.value) },
    startDate: form.elements.startDate.value,
    finishDate: form.elements.finishDate.value,
    cover: form.elements.cover.value.trim(),
    // An existing game whose cover was removed on purpose should not be auto-filled again.
    coverTried: !!form.elements.cover.value.trim() || (prev ? (prev.coverTried || !!prev.cover) : false),
    review: form.elements.review.value.trim(),
    favorite: form.elements.favorite.checked,
    addedDate: prev?.addedDate || today(),
    updated: Date.now(),
  });
  if (prev) Object.assign(prev, data); else state.games.push(data);
  save();
  requestClose({ force: true });
  toast(prev ? 'Saved!' : `${title} added!`);
  render();
  autoFillCovers();
}

/* ------------------------------------------------------------------ */
/* Actions (event delegation)                                          */
/* ------------------------------------------------------------------ */
function download(filename, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
}

const actions = {
  'go': el => { location.hash = el.dataset.route; },
  'new-game': el => openSheetUrl('new', el.dataset.status || null),
  'open-game': el => openSheetUrl(el.dataset.id),
  'lock-edit': () => {
    if (!confirm('Lock editing on this browser?\n\nYour games stay saved here. Open #edit to unlock again.')) return;
    try { localStorage.removeItem(EDIT_KEY); } catch (e) {}
    location.replace('#home');
    location.reload();
  },
  'close-dialog': () => requestClose(),
  'log-session': el => {
    const form = $('#gameForm');
    const custom = $('#f-shours');
    const h = el.dataset.h ? parseFloat(el.dataset.h) : num(custom.value);
    if (!h) { custom.focus(); toast('Enter how many hours I played'); return; }
    const date = $('#f-sdate').value || today();
    writeSessions(form, normSessions([...readSessions(form), { date, hours: h }]));
    bumpTotal(form, h);
    custom.value = '';
    const start = form.elements.startDate;
    if (!start.value || date < start.value) start.value = date;
    // Logging time on a backlog game means you've started it.
    if (form.elements.status.value === 'backlog') {
      $('#st-playing').checked = true;
      $('#st-playing').dispatchEvent(new Event('change', { bubbles: true }));
    }
  },
  'del-session': el => {
    const form = $('#gameForm');
    const list = readSessions(form);
    const s = list.find(x => x.date === el.dataset.date);
    if (!s) return;
    writeSessions(form, list.filter(x => x !== s));
    bumpTotal(form, -s.hours);
  },
  'quick-log': el => {
    const g = getGame(el.dataset.id);
    if (!g) return;
    g.sessions = normSessions([...g.sessions, { date: today(), hours: 1 }]);
    g.hoursPlayed = round2(g.hoursPlayed + 1);
    g.updated = Date.now();
    save(); render();
    toast(`Logged 1h of ${g.title} today`);
  },
  'delete-game': el => {
    const g = getGame(el.dataset.id);
    if (!g || !confirm(`Delete "${g.title}"? This can't be undone.`)) return;
    state.games = state.games.filter(x => x.id !== g.id);
    save();
    requestClose({ force: true });
    toast('Game deleted');
    render();
  },
  'find-cover': () => findCoversInDialog(),
  'pick-cover': el => {
    $('#gameForm').elements.cover.value = el.dataset.src;
    $$('.cover-pick').forEach(b => b.setAttribute('aria-pressed', String(b === el)));
    setDialogArt(el.dataset.src);
  },
  'fetch-covers': async () => {
    const missing = state.games.filter(g => !g.cover);
    if (!missing.length) { toast('Every game already has a cover'); return; }
    missing.forEach(g => { g.coverTried = false; });
    toast(`Looking for ${missing.length} cover${missing.length > 1 ? 's' : ''}…`);
    const found = await autoFillCovers(true);
    toast(`Found ${found} of ${missing.length} cover${missing.length > 1 ? 's' : ''}`);
  },
  'share-game': async el => {
    const g = getGame(el.dataset.id);
    if (!g) return;
    const url = `${location.origin}${location.pathname}#home?game=${encodeURIComponent(g.id)}`;
    if (navigator.share && isCoarse()) {
      try { await navigator.share({ title: g.title, text: `${g.title} on my game log`, url }); } catch (e) { /* cancelled */ }
      return;
    }
    try { await navigator.clipboard.writeText(url); toast('Link copied'); }
    catch (e) { prompt('Copy this link:', url); }
  },
  'lib-filter': el => { lib.filter = el.dataset.status; writeLibToHash(); render(); },
  'cycle-prio': el => {
    const g = getGame(el.dataset.id);
    g.priority = PRIORITIES[(PRIORITIES.indexOf(g.priority) + 1) % PRIORITIES.length];
    g.updated = Date.now();
    save(); render();
  },
  'start-game': el => {
    const g = getGame(el.dataset.id);
    g.status = 'playing';
    if (!g.startDate) g.startDate = today();
    g.updated = Date.now();
    save(); render();
    toast(`Now playing: ${g.title}`);
  },
  'theme': () => {
    const isDark = document.documentElement.dataset.theme === 'dark' ||
      (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
    setTheme(isDark ? 'light' : 'dark');
  },
  'export': () => {
    download('games.json', JSON.stringify({ ...state, exported: new Date().toISOString() }, null, 2));
    try { localStorage.setItem(EXPORT_KEY, fingerprint(state)); } catch (e) {}
    updatePublishStatus();
    toast('Exported games.json');
  },
  'import': () => $('#importFile').click(),
  'load-published': async () => {
    const pub = await fetchPublished();
    if (!pub) { toast('Could not load data/games.json'); return; }
    if (state.games.length && !confirm('Replace the games in this browser with the published list?')) return;
    state = pub; save(); applyTheme(); render(); autoFillCovers();
    toast(`Loaded ${state.games.length} games`);
  },
  'demo': () => {
    if (state.games.length && !confirm('Replace my current games with demo data?')) return;
    state.games = demoGames().map(normalizeGame);
    save(); render(); autoFillCovers();
    toast('Demo data loaded');
  },
  'wipe': () => {
    if (!confirm('Erase all games from this browser? Export first for a backup.')) return;
    state.games = [];
    save(); render();
    toast('All games erased');
  },
};

const VISITOR_ACTIONS = new Set(['go', 'open-game', 'close-dialog', 'lib-filter', 'theme', 'share-game']);

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (el && actions[el.dataset.action]) {
    if (!canEdit && !VISITOR_ACTIONS.has(el.dataset.action)) return;
    e.preventDefault();
    actions[el.dataset.action](el, e);
  }
});

// Backdrop click and Escape go through requestClose(), so unsaved edits get a warning.
$('#gameDialog').addEventListener('click', e => { if (e.target.id === 'gameDialog') requestClose(); });
$('#gameDialog').addEventListener('cancel', e => { e.preventDefault(); requestClose(); });
// Safety net: if the browser closes the dialog by itself, keep the URL in step.
$('#gameDialog').addEventListener('close', () => { if (sheet.id) { sheet.id = null; leaveSheetUrl(); } });

// Phones: drag the sheet down by its header to close it.
(function swipeToClose() {
  const dlg = $('#gameDialog');
  let drag = null;
  dlg.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' || !isPhone() || !e.target.closest('.sheet-head') || e.target.closest('button, a, input')) return;
    drag = { id: e.pointerId, y: e.clientY, t: performance.now(), dy: 0 };
    e.target.closest('.sheet-head').setPointerCapture(e.pointerId);
  });
  dlg.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.dy = Math.max(0, e.clientY - drag.y);
    dlg.style.transition = 'none';
    dlg.style.transform = `translateY(${drag.dy}px)`;
  });
  const end = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const { dy, t } = drag;
    drag = null;
    dlg.style.transition = '';
    const flick = dy > 40 && dy / (performance.now() - t) > 0.5;
    if ((dy > 120 || flick) && requestClose()) return;
    dlg.style.transform = ''; // snap back
  };
  dlg.addEventListener('pointerup', end);
  dlg.addEventListener('pointercancel', end);
})();

document.addEventListener('input', e => {
  if (e.target.id === 'libSearch') { lib.q = e.target.value; writeLibToHash(); lastPageKey = pageKey('library'); $('#libGrid').innerHTML = libraryGridHTML(); }
  if (e.target.id === 'profileName') { state.profile.name = e.target.value.trim() || 'Player'; save(); }
});
document.addEventListener('change', e => {
  if (e.target.id === 'libSort') { lib.sort = e.target.value; writeLibToHash(); lastPageKey = pageKey('library'); $('#libGrid').innerHTML = libraryGridHTML(); }
  if (e.target.id === 'perWeek') { state.settings.hoursPerWeek = Math.max(1, num(e.target.value) || 7); save(); render(); }
  if (e.target.name === 'theme' && e.target.closest('.settings-grid')) setTheme(e.target.value);
  if (e.target.id === 'autoCovers') { state.settings.autoCovers = e.target.checked; save(); if (e.target.checked) autoFillCovers(); }
});

$('#importFile').addEventListener('change', async e => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const incoming = normalizeState(JSON.parse(await file.text()));
    if (!incoming.games.length) { toast('No games found in that file'); return; }
    const merge = state.games.length && confirm(`Found ${incoming.games.length} games.\n\nOK = merge with my current list\nCancel = replace my current list`);
    if (merge) {
      const map = new Map(state.games.map(g => [g.id, g]));
      incoming.games.forEach(g => { const cur = map.get(g.id); if (!cur || g.updated >= cur.updated) map.set(g.id, g); });
      state.games = [...map.values()];
    } else {
      state = incoming;
    }
    save(); applyTheme(); render(); autoFillCovers();
    toast(`Imported ${incoming.games.length} games`);
  } catch (err) {
    toast('That file is not valid JSON');
  }
});

/* ------------------------------------------------------------------ */
/* Theme, chrome, tooltip                                              */
/* ------------------------------------------------------------------ */
function currentTheme() {
  let t = null;
  try { t = localStorage.getItem(THEME_KEY); } catch (e) {}
  return t || (canEdit ? state.settings.theme : 'auto');
}
function applyTheme() {
  const t = currentTheme();
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}
function setTheme(t) {
  state.settings.theme = t;
  try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
  applyTheme();
  save();
  if (currentRoute() === 'data') render();
}

/* Unpublished changes: compare this browser's list with data/games.json */
let publishedFp = null; // fingerprint of the published list (null = unknown)
const EXPORT_KEY = 'iswitch.exported';
function fingerprint(st) {
  const games = [...st.games].sort((a, b) => (a.id < b.id ? -1 : 1)).map(({ coverTried, ...g }) => g);
  const str = JSON.stringify({ name: st.profile.name, games });
  let h = 0; // small string hash (FNV-1a)
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return `${str.length}-${(h >>> 0).toString(36)}`;
}
async function checkPublished() {
  if (!canEdit) return;
  const pub = await fetchPublished();
  publishedFp = pub ? fingerprint(pub) : null;
  updatePublishStatus();
}
function publishStatus() {
  if (!canEdit || !publishedFp) return null;
  const fp = fingerprint(state);
  if (fp === publishedFp) return 'published';
  let exported = null;
  try { exported = localStorage.getItem(EXPORT_KEY); } catch (e) {}
  return fp === exported ? 'exported' : 'changed';
}
const PUBLISH_TEXT = {
  published: 'Everything here is published. Visitors see the same list.',
  exported: 'Exported, but not live yet: replace data/games.json with the file, then commit and push.',
  changed: 'I have changes visitors can’t see yet. Export and push to publish them.',
};
function updatePublishStatus() {
  const st = publishStatus();
  const badge = $('#pubBadge');
  badge.hidden = !st || st === 'published';
  badge.className = `pub-badge owner-only ${st || ''}`;
  badge.textContent = st === 'exported' ? 'Push to publish' : 'Unpublished';
  badge.title = st ? PUBLISH_TEXT[st] : '';
  const line = $('#pubStatus');
  if (line) { line.hidden = !st; line.className = `pub-status ${st || ''}`; line.textContent = st ? PUBLISH_TEXT[st] : ''; }
}

function updateChrome() {
  $('#avatarInitial').textContent = (state.profile.name || 'P').trim()[0].toUpperCase();
  const started = state.games.filter(g => g.status !== 'backlog');
  const pct = started.length ? Math.round((byStatus('completed').length / started.length) * 100) : 0;
  $('#batteryFill').style.width = `${pct}%`;
  $('#batteryPct').textContent = `${pct}%`;
  $('#battery').dataset.tip = `Completion rate: ${pct}% of started games beaten`;
  updatePublishStatus();
}

function tick() {
  $('#clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const tip = $('#tooltip');
function showTip(el, x, y) {
  tip.textContent = el.dataset.tip;
  tip.hidden = false;
  const r = tip.getBoundingClientRect();
  let left = x + 14, top = y + 16;
  if (left + r.width > innerWidth - 8) left = x - r.width - 14;
  if (top + r.height > innerHeight - 8) top = y - r.height - 12;
  tip.style.left = `${Math.max(8, left)}px`;
  tip.style.top = `${Math.max(8, top)}px`;
}
// Mouse: the tooltip follows the pointer. Touch: tapping shows it for a moment,
// and the next tap anywhere hides it (it never gets stuck on screen).
let tipTimer;
const tipAt = el => { const r = el.getBoundingClientRect(); showTip(el, r.left + r.width / 2, r.bottom); };
document.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  const el = e.target.closest?.('[data-tip]');
  if (el) showTip(el, e.clientX, e.clientY); else tip.hidden = true;
});
document.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse') return;
  clearTimeout(tipTimer);
  tip.hidden = true;
});
document.addEventListener('click', e => {
  if (!isCoarse()) return;
  const el = e.target.closest?.('[data-tip]');
  if (!el || el.closest('[data-action]')) return; // taps that open something don't need a tooltip
  tipAt(el);
  tipTimer = setTimeout(() => { tip.hidden = true; }, 2500);
});
document.addEventListener('focusin', e => {
  const el = e.target.closest?.('[data-tip]');
  if (el && el.matches(':focus-visible')) tipAt(el); // keyboard focus only, not taps
});
document.addEventListener('focusout', () => { tip.hidden = true; });
addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */
const routes = { home: renderHome, library: renderLibrary, backlog: renderBacklog, stats: renderStats, data: renderData };

// Everything lives in the hash, so links can be shared and Back works:
//   #library?status=completed&sort=score&q=zelda   (library filters)
//   #home?game=<id>                                (a game's sheet open on top of a page)
function parseHash(h = location.hash) {
  const str = h.replace(/^#/, '');
  const i = str.indexOf('?');
  return { path: i < 0 ? str : str.slice(0, i), params: new URLSearchParams(i < 0 ? '' : str.slice(i + 1)) };
}
function buildHash(path, params) {
  const q = params.toString();
  return `#${path || 'home'}${q ? `?${q}` : ''}`;
}
function replaceHash(path, params) {
  const h = buildHash(path, params);
  if (h !== location.hash) history.replaceState(history.state, '', h);
}

function currentRoute() {
  const r = parseHash().path;
  if (r === 'data' && !canEdit) return 'home';
  return routes[r] ? r : 'home';
}

/* Library filters <-> URL. Params in the URL win; a bare #library keeps the last filters. */
const LIB_DEFAULTS = { filter: 'all', q: '', sort: 'updated' };
function readLibFromHash() {
  const p = parseHash().params;
  if (!['status', 'sort', 'q'].some(k => p.has(k))) return;
  lib.filter = p.get('status') || LIB_DEFAULTS.filter;
  lib.sort = p.get('sort') || LIB_DEFAULTS.sort;
  lib.q = p.get('q') || '';
}
function writeLibToHash() {
  const { params } = parseHash();
  const set = (k, v, def) => (v && v !== def ? params.set(k, v) : params.delete(k));
  set('status', lib.filter, LIB_DEFAULTS.filter);
  set('sort', lib.sort, LIB_DEFAULTS.sort);
  set('q', lib.q.trim(), '');
  replaceHash('library', params);
}

let lastPageKey = '';
const pageKey = r => (r === 'library' ? `library|${lib.filter}|${lib.sort}|${lib.q}` : r);

function render() {
  const r = currentRoute();
  if (r === 'library') { readLibFromHash(); writeLibToHash(); }
  lastPageKey = pageKey(r);
  $('#view').innerHTML = routes[r]();
  $$('.dock-btn[data-route]').forEach(b => {
    b.classList.toggle('active', b.dataset.route === r);
    if (b.dataset.route === r) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  tip.hidden = true;
  updateChrome();
}

addEventListener('popstate', () => { backPending = false; });
addEventListener('hashchange', () => {
  if (location.hash === '#edit') { if (!canEdit) { location.reload(); return; } location.replace('#home'); return; }
  const r = currentRoute();
  const prevRoute = lastPageKey.split('|')[0];
  if (r === 'library') readLibFromHash();
  if (pageKey(r) !== lastPageKey) {
    render();
    if (r !== prevRoute) scrollTo({ top: 0 });
  }
  syncSheet();
});

// Keyboard shortcuts: N = new game, 1–5 = sections
document.addEventListener('keydown', e => {
  if (e.target.closest('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
  if ($('#gameDialog').open) return;
  const map = { '1': 'home', '2': 'library', '3': 'backlog', '4': 'stats', '5': 'data' };
  if (!canEdit) delete map['5'];
  if ((e.key === 'n' || e.key === '+') && canEdit) { e.preventDefault(); openSheetUrl('new'); }
  else if (map[e.key]) location.hash = map[e.key];
});

/* ------------------------------------------------------------------ */
/* Demo data                                                           */
/* ------------------------------------------------------------------ */
function demoGames() {
  const y = new Date().getFullYear();
  return [
    { title: 'The Legend of Zelda: Tears of the Kingdom', status: 'completed', score: 10, hoursPlayed: 112, hltb: { main: 59, extra: 101, complete: 185 }, startDate: `${y - 1}-05-12`, finishDate: `${y - 1}-08-30`, favorite: true, review: 'The sky islands, the depths, Ultrahand… every hour felt like discovering something new. A masterpiece.' },
    { title: 'Super Mario Odyssey', status: 'completed', score: 9.5, hoursPlayed: 21, hltb: { main: 12.5, extra: 24, complete: 64 }, startDate: `${y - 2}-01-03`, finishDate: `${y - 2}-01-28`, favorite: true, review: 'Pure joy. Capturing enemies never gets old, and the New Donk City festival gave me goosebumps.' },
    { title: 'Metroid Dread', status: 'completed', score: 9, hoursPlayed: 7.5, hltb: { main: 8.5, extra: 10, complete: 13 }, startDate: `${y - 2}-10-08`, finishDate: `${y - 2}-10-17`, review: 'Tense, gorgeous, and tight. E.M.M.I. sections were stressful in the best way.' },
    { title: 'Kirby and the Forgotten Land', status: 'completed', score: 8, hoursPlayed: 14, hltb: { main: 11, extra: 16, complete: 22 }, startDate: `${y}-02-01`, finishDate: `${y}-02-20` },
    { title: 'Pikmin 4', status: 'playing', score: 8.5, hoursPlayed: 11.5, hltb: { main: 18, extra: 28, complete: 37 }, startDate: `${y}-10-02` },
    { title: 'Xenoblade Chronicles 3', status: 'playing', hoursPlayed: 34, hltb: { main: 64, extra: 108, complete: 165 }, startDate: `${y}-06-15` },
    { title: 'Fire Emblem Engage', status: 'onhold', score: 7, hoursPlayed: 18, hltb: { main: 36, extra: 50, complete: 77 }, startDate: `${y - 1}-02-01` },
    { title: 'Paper Mario: The Thousand-Year Door', status: 'backlog', priority: 'high', hltb: { main: 29, extra: 37, complete: 60 } },
    { title: 'Metroid Prime Remastered', status: 'backlog', priority: 'high', hltb: { main: 13, extra: 16, complete: 20 } },
    { title: 'Bayonetta 3', status: 'backlog', priority: 'medium', hltb: { main: 13, extra: 18, complete: 47 } },
    { title: 'Octopath Traveler II', status: 'backlog', priority: 'low', hltb: { main: 60, extra: 76, complete: 103 } },
    { title: 'Luigi\'s Mansion 3', status: 'dropped', score: 6.5, hoursPlayed: 4, hltb: { main: 14, extra: 17, complete: 22 } },
    { title: 'The Legend of Zelda: The Wind Waker', status: 'completed', score: 9.5, hoursPlayed: 33, hltb: { main: 29, extra: 37, complete: 45 }, startDate: `${y - 3}-07-01`, finishDate: `${y - 3}-08-10`, favorite: true },
  ].map((g, i) => ({ ...g, id: `demo-${i}`, addedDate: `${y}-01-${String(i + 1).padStart(2, '0')}`, updated: Date.now() - i * 3600e3 }));
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */
(async function boot() {
  let unlocked = false;
  if (location.hash === '#edit') {
    try { localStorage.setItem(EDIT_KEY, '1'); } catch (e) {}
    unlocked = !canEdit;
    canEdit = true;
    history.replaceState(null, '', `${location.pathname}${location.search}#home`);
  }
  document.body.classList.toggle('readonly', !canEdit);
  if (!canEdit) {
    const av = $('.avatar');
    av.dataset.route = 'home';
    av.setAttribute('aria-label', 'Home');
  }
  await load();
  applyTheme();
  tick();
  setInterval(tick, 15000);
  render();
  syncSheet(); // a shared link like #home?game=<id> opens that game
  autoFillCovers();
  if (unlocked) toast('Editing unlocked on this browser');
  checkPublished();
  // A push may have gone live since: check again when coming back to the tab.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkPublished(); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
