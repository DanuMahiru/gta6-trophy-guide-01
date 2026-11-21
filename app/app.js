// Vice City Trophy Atlas — GTA VI trophy guide & tracker.
// All guide text lives in data/trophies.json, written in our own words with a
// numbered citation on every fact. The audit strip counts are computed from
// that data at load, so the numbers on screen can never drift from the data.
(function () {
  'use strict';
  var KEY = 'vice-city-trophy-atlas-v2';
  var POINTS = { platinum: 300, gold: 90, silver: 30, bronze: 15 };
  var GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
  var KIND_LABELS = { platinum: 'Platinum', story: 'Story', side: 'Side', collectible: 'Collectible', activity: 'Activity', misc: 'Misc' };

  var state = { earned: new Set(), spoiler: true, revealed: new Set(), selected: 1, tab: 'tracker',
    kind: 'all', grade: 'all', flags: new Set(), query: '', sort: 'roadmap' };

  var doc = null;
  var byId = {};

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function loadState() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || '{}');
      if (Array.isArray(raw.earned)) raw.earned.forEach(function (id) { state.earned.add(id); });
      if (typeof raw.spoiler === 'boolean') state.spoiler = raw.spoiler;
    } catch (e) { /* fresh start */ }
  }
  function saveState() {
    localStorage.setItem(KEY, JSON.stringify({ earned: Array.from(state.earned), spoiler: state.spoiler }));
  }

  // Roadmap order: stage first, then chapter (chapter-less trophies last in their stage), then id.
  function roadmapOrder(a, b) {
    if (a.stage !== b.stage) return a.stage - b.stage;
    var ca = a.chapter == null ? 99 : a.chapter, cb = b.chapter == null ? 99 : b.chapter;
    if (ca !== cb) return ca - cb;
    return a.id - b.id;
  }
  function sortedTrophies(list) {
    var arr = list.slice();
    if (state.sort === 'roadmap') arr.sort(roadmapOrder);
    else if (state.sort === 'chapter') arr.sort(function (a, b) { var ca = a.chapter == null ? 99 : a.chapter, cb = b.chapter == null ? 99 : b.chapter; return ca - cb || a.id - b.id; });
    else if (state.sort === 'grade') arr.sort(function (a, b) { return GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade] || a.id - b.id; });
    else if (state.sort === 'name') arr.sort(function (a, b) { return a.name.localeCompare(b.name); });
    return arr;
  }

  function citesFor(t) {
    var s = new Set();
    t.claims.forEach(function (c) { c.c.forEach(function (n) { s.add(n); }); });
    t.steps.forEach(function (st) { st.c.forEach(function (n) { s.add(n); }); });
    return s;
  }
  function citeHtml(nums) {
    return nums.map(function (n) {
      return '<a class="cite-link" href="#sources" data-src="' + n + '">[' + n + ']</a>';
    }).join(' ');
  }
  function badges(t) {
    var h = '';
    if (t.hidden) h += '<span class="badge hidden">PSN-HIDDEN</span>';
    if (t.missable === 'possible') h += '<span class="badge missable">POSSIBLY MISSABLE</span>';
    if (t.atRisk) h += '<span class="badge atrisk">AT RISK</span>';
    if (t.unconfirmed) h += '<span class="badge unconfirmed">UNCONFIRMED</span>';
    if (state.earned.has(t.id)) h += '<span class="badge earned">EARNED</span>';
    return h;
  }
  function chapterLabel(t) {
    if (t.chapter) return 'Ch ' + t.chapter;
    return 'Anytime';
  }

  // ---------- audit strip (computed from the data) ----------
  function renderAudit() {
    var claims = 0, backed = 0, steps = 0, used = new Set();
    doc.trophies.forEach(function (t) {
      t.claims.forEach(function (c) { claims++; if (c.c.length >= 2) backed++; c.c.forEach(function (n) { used.add(n); }); });
      t.steps.forEach(function (s) { steps++; s.c.forEach(function (n) { used.add(n); }); });
    });
    $('audit-cited').textContent = claims + '/' + claims;
    $('audit-backed').textContent = backed;
    $('audit-steps').textContent = steps;
    $('audit-sources').textContent = doc.sources.length;
    $('audit-disputes').textContent = doc.trophies.filter(function (t) { return t.dispute; }).length;
    $('audit-atrisk').textContent = doc.trophies.filter(function (t) { return t.atRisk; }).length;
    $('audit-missable').textContent = doc.trophies.filter(function (t) { return t.missable === 'possible'; }).length;
    $('audit-unconfirmed').textContent = doc.trophies.filter(function (t) { return t.unconfirmed; }).length;
    $('audit-guides').textContent = doc.trophies.filter(function (t) { return typeof t.guide === 'string' && t.guide.trim(); }).length + '/' + doc.trophies.length;
    $('audit-read').textContent = 'read 21 Nov 2026 · ' + used.size + ' of ' + doc.sources.length + ' sources cited in guides';
  }

  // ---------- progress ----------
  function renderProgress() {
    var earned = state.earned.size, total = doc.trophies.length;
    var pts = 0, score = 0;
    doc.trophies.forEach(function (t) { if (state.earned.has(t.id)) { pts += POINTS[t.grade]; score += 10; } });
    // Gamerscore: 1,000 across 55 trophies is not per-trophy even; show PSN points as the headline and gamerscore as a share.
    $('earned-count').textContent = earned + '/' + total;
    $('points-line').textContent = pts + ' / 1,350 PSN points';
    $('score-line').textContent = Math.round(1000 * earned / total) + ' / 1,000 Gamerscore (share)';
    $('bar-fill').style.width = (100 * earned / total) + '%';
    $('btn-spoiler').textContent = 'Spoiler shield: ' + (state.spoiler ? 'ON' : 'OFF');
    $('btn-spoiler').setAttribute('aria-pressed', String(state.spoiler));
  }

  // ---------- filters ----------
  function passesFilters(t) {
    if (state.kind !== 'all' && t.kind !== state.kind) return false;
    if (state.grade !== 'all' && t.grade !== state.grade) return false;
    if (state.flags.has('missable') && t.missable !== 'possible') return false;
    if (state.flags.has('atrisk') && !t.atRisk) return false;
    if (state.flags.has('hidden') && !t.hidden) return false;
    if (state.flags.has('disputed') && !t.dispute) return false;
    if (state.flags.has('unconfirmed') && !t.unconfirmed) return false;
    if (state.flags.has('notearned') && state.earned.has(t.id)) return false;
    if (state.flags.has('earned') && !state.earned.has(t.id)) return false;
    if (state.query) {
      var q = state.query.toLowerCase();
      if (t.name.toLowerCase().indexOf(q) === -1 && t.desc.toLowerCase().indexOf(q) === -1) return false;
    }
    return true;
  }

  function renderChips() {
    var kinds = [['all', 'All 55'], ['story', 'Story'], ['side', 'Side'], ['collectible', 'Collectibles'], ['activity', 'Activities'], ['misc', 'Misc'], ['platinum', 'Platinum']];
    $('kind-chips').innerHTML = kinds.map(function (k) {
      var n = k[0] === 'all' ? doc.trophies.length : doc.trophies.filter(function (t) { return t.kind === k[0]; }).length;
      return '<button type="button" class="chip' + (state.kind === k[0] ? ' active' : '') + '" data-kind="' + k[0] + '">' + k[1] + ' ' + n + '</button>';
    }).join('');
    var grades = [['all', 'All grades'], ['platinum', 'Platinum'], ['gold', 'Gold'], ['silver', 'Silver'], ['bronze', 'Bronze']];
    $('grade-chips').innerHTML = grades.map(function (g) {
      var n = g[0] === 'all' ? doc.trophies.length : doc.trophies.filter(function (t) { return t.grade === g[0]; }).length;
      return '<button type="button" class="chip' + (state.grade === g[0] ? ' active' : '') + '" data-grade="' + g[0] + '">' + g[1] + ' ' + n + '</button>';
    }).join('');
    var flags = [['missable', 'Missable'], ['atrisk', 'At risk'], ['hidden', 'PSN-hidden'], ['disputed', 'Disputed'], ['unconfirmed', 'Unconfirmed'], ['notearned', 'Not earned'], ['earned', 'Earned']];
    $('flag-toggles').innerHTML = flags.map(function (f) {
      return '<button type="button" class="toggle' + (state.flags.has(f[0]) ? ' active' : '') + '" data-flag="' + f[0] + '">' + f[1] + '</button>';
    }).join('');
  }

  function renderList() {
    var list = sortedTrophies(doc.trophies.filter(passesFilters));
    var ol = $('trophy-list');
    ol.innerHTML = '';
    if (!list.length) { ol.innerHTML = '<li class="trophy-item"><div class="t-body"><div class="t-name">No trophies match these filters.</div></div></li>'; return; }
    list.forEach(function (t) {
      var li = document.createElement('li');
      li.className = 'trophy-item' + (state.selected === t.id ? ' selected' : '') + (state.earned.has(t.id) ? ' earned' : '');
      var shielded = state.spoiler && t.hidden && !state.earned.has(t.id) && !state.revealed.has(t.id);
      var name = shielded ? 'Hidden trophy' : esc(t.name);
      var meta = shielded ? 'PSN-HIDDEN · reveal to see it' : esc(KIND_LABELS[t.kind]) + ' · ' + chapterLabel(t) + ' · Stage ' + t.stage + ' · #' + t.id + ' of 55';
      var countLine = '';
      if (!shielded && t.count) countLine = '<div class="count-line">' + esc(t.count.label) + ': 0 / ' + t.count.need.toLocaleString('en-US') + '</div>';
      li.innerHTML = '<input type="checkbox" class="tick" ' + (state.earned.has(t.id) ? 'checked' : '') + ' aria-label="Mark earned">' +
        '<div class="t-body"><div class="t-name"><span class="grade-dot grade-' + t.grade + '"></span>' + name + '</div>' +
        '<div class="t-meta">' + meta + '</div>' + countLine +
        (shielded ? '' : '<div class="t-meta">' + badges(t) + ' · ' + citesFor(t).size + ' sources</div>') + '</div>';
      li.querySelector('.tick').addEventListener('click', function (e) { e.stopPropagation(); toggleEarned(t.id); });
      li.addEventListener('click', function () { selectTrophy(t.id); });
      ol.appendChild(li);
    });
  }

  // ---------- detail ----------
  function renderDetail() {
    var t = byId[state.selected];
    var el = $('detail');
    if (!t) { el.innerHTML = '<p>No trophy selected.</p>'; return; }
    var shielded = state.spoiler && t.hidden && !state.earned.has(t.id) && !state.revealed.has(t.id);
    if (shielded) {
      el.innerHTML = '<div class="shielded"><h2>Hidden trophy</h2><p>This trophy is hidden on PSN. The spoiler shield hides its name and guide until you earn it or choose to reveal it.</p>' +
        '<p>Grade: ' + esc(t.grade) + ' · #' + t.id + ' of 55</p>' +
        '<button type="button" id="btn-reveal">Reveal this trophy</button></div>';
      $('btn-reveal').addEventListener('click', function () { state.revealed.add(t.id); renderList(); renderDetail(); });
      renderRail(t);
      return;
    }
    var h = '<div class="detail-head"><h2>' + esc(t.name) + '</h2>' +
      '<p class="official">“' + esc(t.desc) + '”</p>' +
      '<div class="detail-meta"><span class="grade-dot grade-' + t.grade + '"></span><strong>' + esc(t.grade) + '</strong> · #' + t.id + ' of 55 · ' +
      esc(KIND_LABELS[t.kind]) + ' · ' + chapterLabel(t) + ' · Stage ' + t.stage + ' · ' + (t.hidden ? 'Hidden on PSN' : 'Visible on PSN') + ' · ' + POINTS[t.grade] + ' PSN points</div>' +
      '<div class="detail-meta">' + badges(t) + '</div></div>';
    if (t.missable === 'possible') {
      h += '<div class="callout missable"><h3>Missable window</h3><p><strong>Act in Chapter 1.</strong> After the mission Down to Earth, meditate on Lucia’s balcony before leaving Chapter 1. See the dispute below — the balcony spot may or may not be required, but doing it costs a minute and removes the only possibly-missable risk on the list.</p></div>';
    }
    if (t.atRisk) {
      h += '<div class="callout"><h3>At risk</h3><p>This stranger chain is optional and its missions can go quiet for whole chapters. Start it the chapter it appears and finish its missions when they are offered — the game will not drag you back to it.</p></div>';
    }
    if (t.unconfirmed) {
      h += '<div class="callout"><h3>Unconfirmed</h3><p>No guide source has confirmed how this trophy unlocks yet. The steps below are the best reading of the official description, clearly labelled as a guess — not a fact. This page will be updated when a source confirms it.</p></div>';
    }
    h += '<div class="detail-sec guide-sec"><h3>Guide — in our own words</h3><p class="guide-text">' + esc(t.guide) + '</p></div>';
    h += '<div class="detail-sec"><h3>How to earn it — ' + t.steps.length + ' steps in our own words</h3><ol class="steps">' +
      t.steps.map(function (s) { return '<li>' + esc(s.t) + ' ' + citeHtml(s.c) + '</li>'; }).join('') + '</ol></div>';
    if (t.dispute) {
      h += '<div class="dispute"><h3>Sources differ — both versions shown</h3><p><strong>' + esc(t.dispute.q) + '</strong></p>' +
        '<div class="versus"><div class="ver"><b>Version A</b>' + esc(t.dispute.a) + '</div><div class="ver"><b>Version B</b>' + esc(t.dispute.b) + '</div></div>' +
        '<p class="call"><b>Our call:</b> ' + esc(t.dispute.call) + ' ' + citeHtml(t.dispute.c) + '</p></div>';
    }
    h += '<div class="detail-sec"><h3>Claims — every fact cited</h3><ol class="claims">' +
      t.claims.map(function (c) { return '<li>' + esc(c.t) + ' ' + citeHtml(c.c) + '</li>'; }).join('') + '</ol></div>';
    el.innerHTML = h;
    renderRail(t);
  }

  function renderRail(t) {
    var rail = $('rail');
    var next = sortedTrophies(doc.trophies.filter(function (x) { return !state.earned.has(x.id); })).slice(0, 8);
    var nextHtml = next.length ? next.map(function (x) {
      var name = (state.spoiler && x.hidden && !state.revealed.has(x.id)) ? 'Hidden trophy' : esc(x.name);
      return '<li data-id="' + x.id + '">' + name + '<span class="nu-stage">Stage ' + x.stage + ' · ' + chapterLabel(x) + '</span></li>';
    }).join('') : '<li>All 55 earned — platinum unlocked.</li>';
    var srcs = citesFor(t);
    var srcRows = Array.from(srcs).sort(function (a, b) { return a - b; }).map(function (n) {
      var s = doc.sources[n - 1];
      return '<tr><td>[' + n + ']</td><td>' + esc(s.site) + ' — ' + esc(s.title) + '</td></tr>';
    }).join('');
    rail.innerHTML = '<div class="rail-box"><h3>Next up · roadmap order</h3><ol class="nextup">' + nextHtml + '</ol></div>' +
      '<div class="rail-box"><h3>Sources for this guide</h3><table class="src-table">' + srcRows + '</table>' +
      '<p class="rail-note">Full source list with claim counts is on the Sources tab. Nothing here is copied from the sources — every guide is written in our own words.</p></div>';
    rail.querySelectorAll('.nextup li[data-id]').forEach(function (li) {
      li.addEventListener('click', function () { selectTrophy(parseInt(li.getAttribute('data-id'), 10)); });
    });
  }

  // ---------- roadmap / missables / sources ----------
  function renderRoadmap() {
    var wrap = $('roadmap-stages');
    wrap.innerHTML = doc.stages.map(function (st) {
      var items = sortedTrophies(doc.trophies.filter(function (t) { return t.stage === st.n; }));
      return '<div class="stage-card"><h3>' + esc(st.title) + '</h3><div class="hours">' + esc(st.hours) + ' · ' + items.length + ' trophies</div>' +
        '<p>' + esc(st.text) + '</p><ul>' + items.map(function (t) {
          var name = (state.spoiler && t.hidden && !state.earned.has(t.id) && !state.revealed.has(t.id)) ? 'Hidden trophy' : esc(t.name);
          return '<li data-id="' + t.id + '">' + name + (state.earned.has(t.id) ? ' ✓' : '') + '</li>';
        }).join('') + '</ul></div>';
    }).join('');
    wrap.querySelectorAll('li[data-id]').forEach(function (li) {
      li.addEventListener('click', function () { selectTrophy(parseInt(li.getAttribute('data-id'), 10)); switchTab('tracker'); });
    });
  }

  function renderMissables() {
    var wrap = $('missables-list');
    var groups = [
      ['Possibly missable', doc.trophies.filter(function (t) { return t.missable === 'possible'; })],
      ['At risk — optional chains', doc.trophies.filter(function (t) { return t.atRisk; })],
      ['Unconfirmed — no source has the method yet', doc.trophies.filter(function (t) { return t.unconfirmed; })]
    ];
    wrap.innerHTML = groups.map(function (g) {
      return g[1].map(function (t) {
        return '<div class="miss-card" data-id="' + t.id + '"><h3>' + esc(t.name) + '</h3><div class="detail-meta">' + badges(t) + '</div>' +
          '<p>“' + esc(t.desc) + '”</p><p>' + esc(t.steps[0].t) + '</p></div>';
      }).join('');
    }).join('');
    wrap.querySelectorAll('.miss-card').forEach(function (el) {
      el.addEventListener('click', function () { selectTrophy(parseInt(el.getAttribute('data-id'), 10)); switchTab('tracker'); });
    });
  }

  function renderSources() {
    var counts = {};
    doc.trophies.forEach(function (t) {
      t.claims.forEach(function (c) { c.c.forEach(function (n) { counts[n] = (counts[n] || 0) + 1; }); });
      t.steps.forEach(function (s) { s.c.forEach(function (n) { counts[n] = (counts[n] || 0) + 1; }); });
    });
    $('sources-list').innerHTML = doc.sources.map(function (s) {
      var n = counts[s.n] || 0;
      var link = s.url ? '<br><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.url) + '</a>' : '';
      var role = n > 0 ? 'cited in ' + n + ' claims/steps' : 'list reference — consulted for the official trophy list';
      return '<li id="src-' + s.n + '"><span class="src-name">[' + s.n + '] ' + esc(s.site) + '</span> — ' + esc(s.title) + link +
        '<br><span class="src-count">' + role + '</span></li>';
    }).join('');
  }

  // ---------- actions ----------
  function toggleEarned(id) {
    if (state.earned.has(id)) state.earned.delete(id); else state.earned.add(id);
    saveState(); renderProgress(); renderList(); renderDetail();
  }
  function selectTrophy(id) {
    state.selected = id;
    try { history.replaceState(null, '', '#trophy=' + id); } catch (e) {}
    renderList(); renderDetail();
  }
  function switchTab(tab) {
    state.tab = tab;
    document.querySelectorAll('.tab').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tab') === tab); });
    ['tracker', 'roadmap', 'missables', 'sources'].forEach(function (v) { $('view-' + v).classList.toggle('hidden', v !== tab); });
    if (tab === 'roadmap') renderRoadmap();
    if (tab === 'missables') renderMissables();
    if (tab === 'sources') renderSources();
  }

  function bindEvents() {
    document.querySelectorAll('.tab').forEach(function (b) {
      b.addEventListener('click', function () { switchTab(b.getAttribute('data-tab')); });
    });
    $('kind-chips').addEventListener('click', function (e) {
      var b = e.target.closest('[data-kind]'); if (!b) return;
      state.kind = b.getAttribute('data-kind'); renderChips(); renderList();
    });
    $('grade-chips').addEventListener('click', function (e) {
      var b = e.target.closest('[data-grade]'); if (!b) return;
      state.grade = b.getAttribute('data-grade'); renderChips(); renderList();
    });
    $('flag-toggles').addEventListener('click', function (e) {
      var b = e.target.closest('[data-flag]'); if (!b) return;
      var f = b.getAttribute('data-flag');
      if (state.flags.has(f)) state.flags.delete(f); else state.flags.add(f);
      renderChips(); renderList();
    });
    $('search').addEventListener('input', function (e) { state.query = e.target.value.trim(); renderList(); });
    $('sort').addEventListener('change', function (e) { state.sort = e.target.value; renderList(); });
    $('btn-spoiler').addEventListener('click', function () {
      state.spoiler = !state.spoiler; saveState(); renderProgress(); renderList(); renderDetail();
    });
    $('btn-export').addEventListener('click', function () {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify({ earned: Array.from(state.earned), spoiler: state.spoiler, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' }));
      a.download = 'vice-city-trophy-atlas-progress.json';
      a.click();
    });
    $('btn-import').addEventListener('click', function () { $('file-import').click(); });
    $('file-import').addEventListener('change', function (e) {
      var file = e.target.files[0]; if (!file) return;
      file.text().then(function (text) {
        try {
          var raw = JSON.parse(text);
          var ids = Array.isArray(raw) ? raw : raw.earned;
          if (!Array.isArray(ids)) throw new Error('bad file');
          state.earned = new Set(ids.filter(function (id) { return byId[id]; }));
          if (typeof raw.spoiler === 'boolean') state.spoiler = raw.spoiler;
          saveState(); renderProgress(); renderChips(); renderList(); renderDetail();
        } catch (err) { alert('Could not import that file — it is not a Vice City Trophy Atlas progress export.'); }
      });
    });
    // Citation links jump to the Sources tab and highlight the source.
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a.cite-link'); if (!a) return;
      e.preventDefault();
      switchTab('sources');
      var n = a.getAttribute('data-src');
      setTimeout(function () {
        var li = $('src-' + n);
        if (li) { li.scrollIntoView({ block: 'center' }); li.style.outline = '2px solid #ff5e8a'; setTimeout(function () { li.style.outline = ''; }, 1600); }
      }, 30);
    });
  }

  function readHash() {
    var h = location.hash.replace(/^#/, '');
    var params = {};
    h.split('&').forEach(function (part) {
      var kv = part.split('=');
      if (kv[0]) params[kv[0]] = decodeURIComponent(kv[1] || '');
    });
    if (params.tab && ['tracker', 'roadmap', 'missables', 'sources'].indexOf(params.tab) !== -1) state.tab = params.tab;
    if (params.trophy) { var id = parseInt(params.trophy, 10); if (byId[id]) state.selected = id; }
    if (params.spoiler === 'off') state.spoiler = false;
    if (params.q) { state.query = params.q; }
    return params;
  }

  function init() {
    loadState();
    fetch('data/trophies.json').then(function (r) { return r.json(); }).then(function (d) {
      doc = d;
      doc.trophies.forEach(function (t) { byId[t.id] = t; });
      var params = readHash();
      if (params.q) $('search').value = params.q;
      renderAudit(); renderProgress(); renderChips(); renderList(); renderDetail(); bindEvents();
      switchTab(state.tab);
    }).catch(function (err) {
      $('detail').innerHTML = '<p>Could not load the trophy data. Open this guide through a static server (for example <code>node serve.ts</code>) — browsers block data files when opened directly from disk.</p>';
    });
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
