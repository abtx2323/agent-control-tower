'use strict';

const seedData = document.getElementById('seedData');
const FALLBACK_SEED = [
  {
    id: 'draft-401',
    title: 'Customer wrap-up email for regional launch',
    type: 'draft',
    agent: 'Mila',
    repo: 'Personal ops',
    needs: 'approval to send',
    minutesAgo: 1140,
    status: 'waiting',
    risk: 'The tone is a bit too casual for enterprise accounts and should be reviewed before sending.',
    summary: 'Email recap to customers after the pilot launch.'
  },
  {
    id: 'draft-403',
    title: 'Launch-day social post',
    type: 'draft',
    agent: 'Proxy',
    repo: 'Marketing sync',
    needs: 'approval to publish',
    minutesAgo: 480,
    status: 'waiting',
    risk: 'The CTA is slightly too promotional for the current audience, but the message is otherwise strong.',
    summary: 'LinkedIn post for the new AI triage rollout.'
  },
  {
    id: 'draft-409',
    title: 'Decision memo for pricing proposal',
    type: 'draft',
    agent: 'Nico',
    repo: 'Strategy desk',
    needs: 'approval before sharing',
    minutesAgo: 180,
    status: 'waiting',
    risk: 'The discount language needs a quick pass before the memo is shared with an external audience.',
    summary: 'Recommended pricing structure for the enterprise package.'
  },
  {
    id: 'pr-482',
    title: 'Refine agent handoff prompts',
    type: 'pr',
    agent: 'Copilot',
    repo: 'matchday-intelligence',
    needs: 'approve merge',
    minutesAgo: 120,
    status: 'waiting',
    risk: 'Good prompt quality, but it changes a high-signal workflow; keep an eye on latency regressions.'
  },
  {
    id: 'pr-219',
    title: 'Add dependency update checks',
    type: 'pr',
    agent: 'Dependabot',
    repo: 'demo-sandbox',
    needs: 'security review',
    minutesAgo: 420,
    status: 'waiting',
    risk: 'This is a low-risk library bump, but the package lockfile change needs a quick sanity check.'
  },
  {
    id: 'pr-314',
    title: 'Fix onboarding analytics report',
    type: 'pr',
    agent: 'Pine',
    repo: 'sample-admin-tools',
    needs: 'approve rollout',
    minutesAgo: 660,
    status: 'waiting',
    risk: 'Operationally safe, but the data export is in a shared pipeline and should be validated before release.'
  }
];

const CONFIG = {
  tankMinutes: 1200,
  lowFuel: 25,
  rMin: 12,
  rMax: 38,
  rPark: 41,
  spinPerSecond: 0.02,
  holdMs: 6000,
  holdRadius: 4.5,
  landMs: 2200,
  sendMs: 1600,
  fadeMs: 450,
  logCap: 30,
  streakWindowMs: 15000,
  runwayAngle: (-25 * Math.PI) / 180,
  stormClearance: 6.5,
  stormWidth: 6,
  defaultSpeed: 10
};

const state = {
  items: [],
  selectedId: null,
  focusMode: false,
  speed: CONFIG.defaultSpeed,
  simMinutes: 0,
  spin: 0,
  lastFrame: null,
  lastReducedStep: 0,
  sessionStart: performance.now(),
  run: null,
  finished: false,
  landedCount: 0,
  scenario: 'standard',
  layers: { traffic: true, weather: true, rings: true },
  medals: new Set(),
  undoStack: [],
  detailRefs: null,
  focusRefs: null,
  textCache: new Map()
};

const dom = {
  radarGrid: document.getElementById('radarGrid'),
  planeLayer: document.getElementById('planeLayer'),
  stormLayer: document.getElementById('stormLayer'),
  detailCard: document.getElementById('detailCard'),
  focusCard: document.getElementById('focusCard'),
  focusPanel: document.getElementById('focusPanel'),
  focusButton: document.getElementById('focusButton'),
  nextFocusButton: document.getElementById('nextFocusButton'),
  radioLog: document.getElementById('radioLog'),
  landedRow: document.getElementById('landedRow'),
  finishCard: document.getElementById('finishCard'),
  finishTitle: document.getElementById('finishTitle'),
  finishStats: document.getElementById('finishStats'),
  restartButton: document.getElementById('restartButton'),
  closeFinishButton: document.getElementById('closeFinishButton'),
  simClock: document.getElementById('simClock'),
  runTimer: document.getElementById('runTimer'),
  streakBadge: document.getElementById('streakBadge'),
  weatherSummary: document.getElementById('weatherSummary'),
  planesInAir: document.getElementById('planesInAir'),
  longestWait: document.getElementById('longestWait'),
  landedToday: document.getElementById('landedToday'),
  streakStat: document.getElementById('streakStat'),
  speedButtons: Array.from(document.querySelectorAll('.speed-button')),
  scenarioSelect: document.getElementById('scenarioSelect'),
  undoButton: document.getElementById('undoButton'),
  layerButtons: Array.from(document.querySelectorAll('[data-layer]')),
  medalList: document.getElementById('medalList'),
  medalCount: document.getElementById('medalCount')
};

const reduceMotionQuery = typeof window.matchMedia === 'function'
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : null;

function prefersReducedMotion() {
  return Boolean(reduceMotionQuery && reduceMotionQuery.matches);
}

/* ---------- helpers ---------- */

function getSeedData() {
  try {
    const parsed = JSON.parse(seedData?.textContent || '[]');
    return Array.isArray(parsed) && parsed.length ? parsed : FALLBACK_SEED;
  } catch (error) {
    return FALLBACK_SEED;
  }
}

function getScenarioData() {
  const records = getSeedData().map(record => ({ ...record }));
  if (state.scenario === 'mayday' && records.length) {
    records[0].minutesAgo = CONFIG.tankMinutes + 1;
  } else if (state.scenario === 'weather') {
    records.forEach(record => {
      record.needs = `${record.needs || 'approval'} · security review`;
    });
  }
  return records;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function polar(angle, radius) {
  return { x: 50 + Math.cos(angle) * radius, y: 50 + Math.sin(angle) * radius };
}

function radiusForFuel(fuel) {
  return CONFIG.rMin + (clamp(fuel, 0, 100) / 100) * (CONFIG.rMax - CONFIG.rMin);
}

function minutesAgoToSentAt(minutesAgo) {
  return new Date(Date.now() - Math.max(0, Number(minutesAgo) || 0) * 60 * 1000).toISOString();
}

function callsign(item) {
  const label = item.type === 'pr' ? 'PR' : 'Draft';
  const match = String(item.id).match(/(\d+)$/);
  return match ? `${label} ${match[1]}` : `${label} ${item.id}`;
}

function getWeather(record) {
  const needs = String(record.needs || '').toLowerCase();
  if (needs.includes('security')) return { kind: 'security', label: 'storm cell, security review' };
  if (/send|publish|sharing|share/.test(needs)) return { kind: 'external', label: 'storm cell, external-facing' };
  return null;
}

function formatWait(minutes) {
  const total = Math.max(0, Math.floor(minutes));
  if (total < 60) return `${total}m`;
  const hours = Math.floor(total / 60);
  const remaining = total % 60;
  if (hours < 24) return `${hours}h ${remaining}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function formatClock(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function formatSim(minutes) {
  const total = Math.floor(minutes);
  return `T+${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function setText(element, key, value) {
  if (!element) return;
  if (state.textCache.get(key) === value) return;
  state.textCache.set(key, value);
  element.textContent = value;
}

function makeEl(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function makeKbd(key) {
  return makeEl('kbd', '', key);
}

/* ---------- data ---------- */

function createItemFromRecord(raw, index, total) {
  const minutesAgo = Math.max(0, Number(raw.minutesAgo ?? 0) || 0);
  let waitMinutes = minutesAgo;
  if (raw.minutesAgo == null && raw.sentAt) {
    const sent = new Date(raw.sentAt).getTime();
    if (Number.isFinite(sent)) waitMinutes = Math.max(0, (Date.now() - sent) / 60000);
  }
  const fuel = clamp(100 - (waitMinutes / CONFIG.tankMinutes) * 100, 0, 100);
  const weather = getWeather(raw);
  const startRadius = radiusForFuel(fuel);
  return {
    ...raw,
    minutesAgo,
    sentAt: minutesAgoToSentAt(waitMinutes),
    waitMinutes,
    fuel,
    status: 'waiting',
    lastNote: raw.lastNote || '',
    baseAngle: -Math.PI / 2 + Math.PI / 6 + (index / Math.max(total, 1)) * Math.PI * 2,
    weather,
    stormRadius: weather ? clamp(startRadius - 9, CONFIG.rMin + 5, CONFIG.rMax - 3) : null,
    lowLogged: false,
    mayday: false,
    maydayLogged: false,
    hold: null,
    anim: null,
    parkBase: null,
    gone: false,
    x: 50,
    y: 50,
    scale: 1,
    opacity: 1,
    el: null,
    stormEl: null,
    classKey: ''
  };
}

function isAirborne(item) {
  return item.status === 'waiting' || item.status === 'holding';
}

function getQueue() {
  return state.items
    .filter(item => item.status === 'waiting')
    .sort((a, b) => (Number(b.mayday) - Number(a.mayday)) || (a.fuel - b.fuel));
}

function getHolding() {
  return state.items.filter(item => item.status === 'holding');
}

function findItem(id) {
  return state.items.find(item => item.id === id);
}

function newRun() {
  return { startedAt: null, streak: 0, best: 0, landed: 0, sent: 0, held: 0, lastDecisionAt: null };
}

const MEDALS = [
  { id: 'first-landing', title: 'First touchdown', detail: 'Land your first plane.' },
  { id: 'smooth-operator', title: 'Smooth operator', detail: 'Reach a three-decision streak.' },
  { id: 'clear-skies', title: 'Clear skies', detail: 'Finish a shift with no planes in the air.' }
];

function renderMedals() {
  dom.medalCount.textContent = `${state.medals.size} earned`;
  dom.medalList.replaceChildren();
  MEDALS.forEach(medal => {
    const earned = state.medals.has(medal.id);
    const badge = makeEl('div', `medal ${earned ? 'medal--earned' : ''}`);
    badge.setAttribute('title', medal.detail);
    badge.appendChild(makeEl('span', 'medal-icon', earned ? '★' : '☆'));
    const text = makeEl('span', 'medal-copy');
    text.appendChild(makeEl('strong', '', medal.title));
    text.appendChild(makeEl('span', '', earned ? medal.detail : 'Not earned yet'));
    badge.appendChild(text);
    dom.medalList.appendChild(badge);
  });
}

function awardMedal(id) {
  if (state.medals.has(id)) return;
  state.medals.add(id);
  renderMedals();
}

function syncLayers() {
  dom.radarGrid.classList.toggle('hide-traffic', !state.layers.traffic);
  dom.radarGrid.classList.toggle('hide-weather', !state.layers.weather);
  dom.radarGrid.classList.toggle('hide-rings', !state.layers.rings);
  dom.layerButtons.forEach(button => {
    button.setAttribute('aria-pressed', String(state.layers[button.dataset.layer]));
  });
}

/* ---------- radio log ---------- */

function radio(speaker, text, kind) {
  const line = makeEl('li', `radio-line radio-line--${kind || 'tower'}`);
  line.appendChild(makeEl('span', 'radio-time', formatSim(state.simMinutes)));
  line.appendChild(makeEl('span', 'radio-speaker', speaker));
  line.appendChild(makeEl('span', 'radio-text', text));
  dom.radioLog.appendChild(line);
  while (dom.radioLog.children.length > CONFIG.logCap) {
    dom.radioLog.removeChild(dom.radioLog.firstChild);
  }
  dom.radioLog.scrollTop = dom.radioLog.scrollHeight;
}

/* ---------- positions ---------- */

function stormBend(item, radius) {
  if (!item.weather) return 0;
  const distance = (radius - item.stormRadius) / CONFIG.stormWidth;
  return (CONFIG.stormClearance / Math.max(radius, 6)) * Math.exp(-distance * distance);
}

function approachPoint(item) {
  const radius = radiusForFuel(item.fuel);
  const angle = item.baseAngle + state.spin + stormBend(item, radius);
  return { ...polar(angle, radius), angle, radius };
}

function runwayPoints() {
  return {
    final: polar(CONFIG.runwayAngle + Math.PI, 26),
    threshold: polar(CONFIG.runwayAngle + Math.PI, 11),
    rollout: polar(CONFIG.runwayAngle, 9)
  };
}

function updateItemPosition(item, now) {
  const reduce = prefersReducedMotion();
  let point;
  let scale = 1;
  let opacity = 1;

  if (item.anim && item.anim.type === 'land') {
    const anim = item.anim;
    const { final, threshold, rollout } = runwayPoints();
    const t = (now - anim.start) / CONFIG.landMs;
    if (reduce) {
      completeLanding(item);
      return;
    }
    if (t < 0.62) {
      const u = easeInOut(clamp(t / 0.62, 0, 1));
      const inv = 1 - u;
      point = {
        x: inv * inv * anim.from.x + 2 * inv * u * final.x + u * u * threshold.x,
        y: inv * inv * anim.from.y + 2 * inv * u * final.y + u * u * threshold.y
      };
      scale = 1 - 0.2 * u;
    } else if (t < 1) {
      if (!anim.touched) {
        anim.touched = true;
        touchdownFlash(threshold);
      }
      const u = easeOut((t - 0.62) / 0.38);
      point = { x: lerp(threshold.x, rollout.x, u), y: lerp(threshold.y, rollout.y, u) };
      scale = 0.8 - 0.25 * u;
    } else {
      const fade = (now - anim.start - CONFIG.landMs) / CONFIG.fadeMs;
      point = rollout;
      scale = 0.55;
      opacity = clamp(1 - fade, 0, 1);
      if (fade >= 1) {
        completeLanding(item);
        return;
      }
    }
  } else if (item.anim && item.anim.type === 'send') {
    const anim = item.anim;
    const t = reduce ? 1 : clamp((now - anim.start) / CONFIG.sendMs, 0, 1);
    const eased = easeInOut(t);
    const angle = item.parkBase + state.spin;
    const base = polar(angle, lerp(anim.fromRadius, CONFIG.rPark, eased));
    const phi0 = angle + Math.PI / 2;
    const phase = phi0 - t * Math.PI * 2;
    point = {
      x: base.x + 4 * (Math.cos(phase) - Math.cos(phi0)),
      y: base.y + 4 * (Math.sin(phase) - Math.sin(phi0))
    };
    scale = lerp(1, 0.78, eased);
    if (t >= 1) completeSendAround(item);
  } else if (item.status === 'holding') {
    const base = approachPoint(item);
    if (!item.hold.phi0Set) {
      item.hold.phi0 = base.radius > 28 ? base.angle : base.angle + Math.PI;
      item.hold.phi0Set = true;
    }
    const t = reduce ? 0 : clamp((now - item.hold.start) / CONFIG.holdMs, 0, 1);
    const phase = item.hold.phi0 + t * Math.PI * 4;
    point = {
      x: base.x + CONFIG.holdRadius * (Math.cos(phase) - Math.cos(item.hold.phi0)),
      y: base.y + CONFIG.holdRadius * (Math.sin(phase) - Math.sin(item.hold.phi0))
    };
  } else if (item.status === 'changes-requested') {
    point = polar(item.parkBase + state.spin, CONFIG.rPark);
    scale = 0.78;
  } else {
    point = approachPoint(item);
  }

  item.x = point.x;
  item.y = point.y;
  item.scale = scale;
  item.opacity = opacity;
}

/* ---------- planes and storms ---------- */

function ensurePlaneElement(item) {
  if (item.el || item.gone) return item.el;
  const button = makeEl('button', 'plane');
  button.type = 'button';
  button.dataset.id = item.id;
  button.title = `${item.agent} · ${item.needs}`;
  button.setAttribute('aria-label', `${item.agent} ${item.title}`);

  const badge = makeEl('span', 'plane-badge');
  const label = makeEl('span', 'plane-label');
  label.appendChild(makeEl('span', 'plane-tag', item.agent));
  const name = makeEl('span', 'plane-name', '');
  label.appendChild(name);
  const flag = makeEl('span', 'plane-flag', '');

  button.appendChild(badge);
  button.appendChild(label);
  button.appendChild(flag);
  button.addEventListener('click', () => selectPlane(item.id));

  item.el = button;
  item.classKey = '';
  item.nameEl = name;
  item.flagEl = flag;
  dom.planeLayer.appendChild(button);
  return button;
}

function ensureStormElement(item) {
  if (!item.weather || item.stormEl) return;
  const storm = makeEl('div', `storm storm--${item.weather.kind}`);
  storm.dataset.id = item.id;
  storm.appendChild(makeEl('span', 'storm-cloud'));
  storm.appendChild(makeEl('span', 'storm-core'));
  item.stormEl = storm;
  dom.stormLayer.appendChild(storm);
}

function syncPlane(item) {
  const button = item.el;
  if (!button) return;
  const airborne = isAirborne(item);
  const classes = ['plane', getAgentClass(item.agent)];
  if (item.id === state.selectedId) classes.push('selected');
  if (airborne && item.fuel < CONFIG.lowFuel) classes.push('low-fuel');
  if (airborne && item.mayday) classes.push('is-mayday');
  if (item.status === 'holding') classes.push('is-holding');
  if (item.status === 'changes-requested') classes.push('is-parked', 'is-resolved');
  if (item.anim && item.anim.type === 'land') classes.push('is-landing');
  if (item.anim && item.anim.type === 'send') classes.push('is-going-around');
  const classKey = classes.join(' ');
  if (classKey !== item.classKey) {
    button.className = classKey;
    item.classKey = classKey;
    button.dataset.status = item.status;
  }

  const kind = item.type === 'pr' ? 'PR' : 'Draft';
  let nameText = `${kind} · ${Math.round(item.fuel)}%`;
  if (item.status === 'changes-requested') nameText = `${kind} · with agent`;
  if (item.status === 'landed') nameText = `${kind} · landing`;
  if (button.dataset.name !== nameText) {
    button.dataset.name = nameText;
    item.nameEl.textContent = nameText;
  }

  let flagText = '';
  if (airborne && item.mayday) flagText = 'MAYDAY';
  else if (item.status === 'holding') flagText = 'HOLD';
  if (item.flagEl.textContent !== flagText) item.flagEl.textContent = flagText;

  button.style.left = `${item.x.toFixed(3)}%`;
  button.style.top = `${item.y.toFixed(3)}%`;
  button.style.setProperty('--plane-scale', item.scale.toFixed(3));
  button.style.opacity = item.opacity < 1 ? item.opacity.toFixed(3) : '';
}

function syncStorm(item) {
  if (!item.stormEl) return;
  const point = polar(item.baseAngle + state.spin, item.stormRadius);
  item.stormEl.style.left = `${point.x.toFixed(3)}%`;
  item.stormEl.style.top = `${point.y.toFixed(3)}%`;
  if (!isAirborne(item) && !item.stormEl.classList.contains('is-clearing')) {
    const storm = item.stormEl;
    storm.classList.add('is-clearing');
    radio('Weather', `Storm cell near ${callsign(item)} dissipating.`, 'weather');
    window.setTimeout(() => {
      storm.remove();
      if (item.stormEl === storm) item.stormEl = null;
    }, 1000);
  }
}

function getAgentClass(agent) {
  if (/copilot|pilot|release/i.test(agent)) return 'plane--copilot';
  if (/dependabot|bot|ops/i.test(agent)) return 'plane--dependabot';
  return 'plane--draft';
}

function touchdownFlash(point) {
  if (prefersReducedMotion()) return;
  const flash = makeEl('span', 'touchdown-flash');
  flash.style.left = `${point.x}%`;
  flash.style.top = `${point.y}%`;
  dom.planeLayer.appendChild(flash);
  window.setTimeout(() => flash.remove(), 900);
}

function completeLanding(item) {
  item.anim = null;
  item.gone = true;
  if (item.el) item.el.remove();
  item.el = null;
  const chip = makeEl('span', `landed-chip ${getAgentClass(item.agent)}`);
  chip.dataset.id = item.id;
  chip.appendChild(makeEl('span', 'landed-dot'));
  chip.appendChild(makeEl('span', '', `${item.agent} · ${callsign(item)}`));
  dom.landedRow.appendChild(chip);
  radio('Tower', `${callsign(item)} on the ground. Welcome home, ${item.agent}.`, 'ok');
  if (item.id === state.selectedId) renderDetail();
}

function completeSendAround(item) {
  item.anim = null;
  item.fuel = 100;
  radio(item.agent, `${callsign(item)} back on the outer ring, refueled, working on changes.`, 'agent');
}

/* ---------- selection, focus ---------- */

function selectPlane(id) {
  const item = findItem(id);
  if (!item || item.gone) return;
  state.selectedId = id;
  renderDetail();
  renderFocus();
}

function getFocusTarget() {
  const queue = getQueue();
  return queue.find(item => item.id === state.selectedId) || queue[0] || null;
}

function enterFocus() {
  const queue = getQueue();
  if (!queue.length && !getHolding().length) {
    updateFocusButton();
    return;
  }
  state.focusMode = true;
  if (state.run.startedAt == null) state.run.startedAt = performance.now();
  if (queue.length) state.selectedId = queue[0].id;
  radio('Tower', `Landing run started. ${queue.length} in the queue. Clear the skies.`, 'tower');
  renderDetail();
  renderFocus();
  updateFocusButton();
}

function exitFocus() {
  state.focusMode = false;
  renderFocus();
  updateFocusButton();
}

function nextFocus() {
  const queue = getQueue();
  if (!queue.length) return;
  if (!state.focusMode) {
    enterFocus();
    return;
  }
  const index = queue.findIndex(item => item.id === state.selectedId);
  state.selectedId = queue[(index + 1) % queue.length].id;
  renderDetail();
  renderFocus();
}

function updateFocusButton() {
  document.body.classList.toggle('focus-on', state.focusMode);
  if (!state.items.some(isAirborne)) {
    dom.focusButton.disabled = true;
    dom.focusButton.replaceChildren(document.createTextNode('Skies are clear'));
    return;
  }
  dom.focusButton.disabled = false;
  dom.focusButton.replaceChildren(
    document.createTextNode(state.focusMode ? 'Exit focus ' : 'Clear the skies '),
    makeKbd(state.focusMode ? 'Esc' : 'F')
  );
}

/* ---------- decisions ---------- */

function readNote() {
  const input = document.getElementById('decisionNote');
  const value = input ? input.value.trim() : '';
  return value || undefined;
}

function handleDecision(itemId, action, note) {
  const item = findItem(itemId);
  if (!item || !isAirborne(item) || item.anim) return;
  const now = performance.now();
  const sign = callsign(item);
  state.undoStack.push({
    itemId,
    item: {
      status: item.status,
      fuel: item.fuel,
      hold: item.hold ? { ...item.hold } : null,
      anim: item.anim ? { ...item.anim, from: item.anim.from ? { ...item.anim.from } : undefined } : null,
      parkBase: item.parkBase,
      gone: item.gone,
      mayday: item.mayday,
      lowLogged: item.lowLogged,
      maydayLogged: item.maydayLogged,
      lastNote: item.lastNote,
      lastDecisionAt: item.lastDecisionAt
    },
    run: { ...state.run },
    landedCount: state.landedCount,
    selectedId: state.selectedId,
    finished: state.finished,
    medals: [...state.medals]
  });
  dom.undoButton.disabled = false;

  const DEFAULT_NOTES = new Map([
    ['land', 'Approved and queued for merge/release.'],
    ['change', 'Requested changes with a brief review note.'],
    ['snooze', 'Held for later review on the next pass.']
  ]);
  const resultNote = note || DEFAULT_NOTES.get(action);
  if (!resultNote) return;

  item.lastNote = resultNote;
  item.lastDecisionAt = new Date().toISOString();
  const noteSuffix = note ? ` Note: "${note}"` : '';
  updateItemPosition(item, now);

  if (action === 'land') {
    item.status = 'landed';
    item.hold = null;
    item.anim = { type: 'land', start: now, from: { x: item.x, y: item.y }, touched: false };
    state.landedCount += 1;
    state.run.landed += 1;
    awardMedal('first-landing');
    radio(`Tower → ${item.agent}`, `cleared to land, ${sign}.${noteSuffix}`, 'tower');
    radio(item.agent, `cleared to land, ${sign}. Wheels down.`, 'agent');
  } else if (action === 'change') {
    const point = approachPoint(item);
    item.status = 'changes-requested';
    item.hold = null;
    item.parkBase = Math.atan2(item.y - 50, item.x - 50) - state.spin;
    item.anim = { type: 'send', start: now, fromRadius: Math.hypot(item.x - 50, item.y - 50) || point.radius };
    state.run.sent += 1;
    radio(`Tower → ${item.agent}`, `go around, ${sign}. Changes requested.${noteSuffix}`, 'tower');
    radio(item.agent, `going around, ${sign}.`, 'agent');
  } else {
    item.status = 'holding';
    item.hold = { start: now, until: now + CONFIG.holdMs, phi0: 0, phi0Set: false };
    state.run.held += 1;
    radio(`Tower → ${item.agent}`, `enter the hold, ${sign}. Expect further clearance.${noteSuffix}`, 'tower');
    radio(item.agent, `holding, ${sign}.`, 'agent');
  }
  if (action !== 'snooze') item.mayday = false;

  const run = state.run;
  if (run.startedAt == null) run.startedAt = now;
  run.streak = run.lastDecisionAt != null && now - run.lastDecisionAt <= CONFIG.streakWindowMs ? run.streak + 1 : 1;
  run.best = Math.max(run.best, run.streak);
  run.lastDecisionAt = now;
  if (run.streak >= 3 && run.streak === run.best) {
    radio('Tower', `${run.streak} in a row. Smooth operating.`, 'ok');
  }
  if (run.streak >= 3) awardMedal('smooth-operator');

  if (state.focusMode) {
    const queue = getQueue();
    state.selectedId = queue.length ? queue[0].id : state.selectedId;
  }

  syncPlane(item);
  renderDetail();
  renderFocus();
  updateFocusButton();
  updateStats(now);
}

function undoDecision() {
  const previous = state.undoStack.pop();
  if (!previous) return;
  const item = findItem(previous.itemId);
  if (!item) return;
  Object.assign(item, previous.item);
  state.run = previous.run;
  state.landedCount = previous.landedCount;
  state.selectedId = previous.selectedId;
  state.finished = previous.finished;
  state.medals = new Set(previous.medals);
  const chip = Array.from(dom.landedRow.children).find(child => child.dataset.id === item.id);
  if (chip) chip.remove();
  if (item.stormEl) {
    item.stormEl.remove();
    item.stormEl = null;
  }
  if (!item.gone) ensurePlaneElement(item);
  ensureStormElement(item);
  updateItemPosition(item, performance.now());
  syncPlane(item);
  syncStorm(item);
  dom.finishCard.classList.add('hidden');
  dom.undoButton.disabled = state.undoStack.length === 0;
  renderMedals();
  radio('Tower', `Undid the last decision for ${callsign(item)}.`, 'tower');
  renderDetail();
  renderFocus();
  updateFocusButton();
  updateStats(performance.now());
}

/* ---------- rendering: detail and focus ---------- */

function createMetaItem(labelText, valueText) {
  const item = makeEl('div', 'meta-item');
  item.appendChild(makeEl('span', 'label', labelText));
  const strong = makeEl('strong', '', valueText);
  item.appendChild(strong);
  return { item, strong };
}

function statusText(item) {
  if (item.status === 'waiting') return item.mayday ? 'MAYDAY' : 'On approach';
  if (item.status === 'holding') return 'Holding';
  if (item.status === 'landed') return 'Landed';
  if (item.status === 'changes-requested') return 'Sent around';
  return item.status;
}

function createActionButton(item, action, label, key, className) {
  const button = makeEl('button', className);
  button.type = 'button';
  button.dataset.action = action;
  button.appendChild(document.createTextNode(`${label} `));
  button.appendChild(makeKbd(key));
  button.disabled = !isAirborne(item) || Boolean(item.anim);
  button.addEventListener('click', () => handleDecision(item.id, action, readNote()));
  return button;
}

function createActionRow(item) {
  const row = makeEl('div', 'action-row');
  row.appendChild(createActionButton(item, 'land', 'Land it', 'L', 'primary-button'));
  row.appendChild(createActionButton(item, 'change', 'Send around', 'S', 'secondary-button'));
  row.appendChild(createActionButton(item, 'snooze', 'Holding pattern', 'H', 'ghost-button'));
  return row;
}

function renderDetail() {
  dom.detailCard.replaceChildren();
  state.detailRefs = null;
  const item = findItem(state.selectedId);

  if (!item) {
    dom.detailCard.appendChild(makeEl('p', 'detail-empty', 'Select a plane to review the request.'));
    return;
  }

  const header = makeEl('div', 'detail-header');
  const titleWrap = makeEl('div');
  titleWrap.appendChild(makeEl('p', 'eyebrow', item.type === 'pr' ? 'Approval queue' : 'Local draft'));
  titleWrap.appendChild(makeEl('h3', '', item.title));
  header.appendChild(titleWrap);
  header.appendChild(makeEl('span', `badge ${item.type === 'pr' ? 'pr' : 'draft'}`, item.type === 'pr' ? 'pull request' : 'draft'));

  const metaGrid = makeEl('div', 'meta-grid');
  const wait = createMetaItem('Wait', formatWait(item.waitMinutes));
  const fuel = createMetaItem('Fuel', `${Math.round(item.fuel)}%`);
  const status = createMetaItem('Status', statusText(item));
  metaGrid.appendChild(createMetaItem('Agent', item.agent).item);
  metaGrid.appendChild(createMetaItem('Repo', item.repo).item);
  metaGrid.appendChild(createMetaItem('Needs', item.needs).item);
  metaGrid.appendChild(wait.item);
  metaGrid.appendChild(fuel.item);
  metaGrid.appendChild(status.item);

  dom.detailCard.appendChild(header);
  dom.detailCard.appendChild(metaGrid);

  if (item.weather) {
    const weatherLine = makeEl('div', `weather-line weather-line--${item.weather.kind}`);
    weatherLine.appendChild(makeEl('span', 'weather-icon'));
    weatherLine.appendChild(makeEl('span', '', `Weather: ${item.weather.label}`));
    dom.detailCard.appendChild(weatherLine);
  }

  const riskBox = makeEl('div', 'risk-box');
  riskBox.appendChild(makeEl('h4', '', 'Risk note'));
  riskBox.appendChild(makeEl('p', '', item.risk || 'No risk note.'));

  const noteBox = makeEl('div', 'note-box');
  noteBox.appendChild(makeEl('h4', '', 'Last note'));
  noteBox.appendChild(makeEl('p', '', item.lastNote || 'No decision sent yet.'));

  const noteInput = makeEl('textarea', 'input-note');
  noteInput.id = 'decisionNote';
  noteInput.placeholder = 'Add a short decision note for the agent...';
  noteInput.setAttribute('aria-label', 'Decision note');

  dom.detailCard.appendChild(riskBox);
  dom.detailCard.appendChild(noteBox);
  dom.detailCard.appendChild(createActionRow(item));
  dom.detailCard.appendChild(noteInput);

  state.detailRefs = { id: item.id, wait: wait.strong, fuel: fuel.strong, status: status.strong };
}

function renderFocus() {
  state.focusRefs = null;
  if (!state.focusMode) {
    dom.focusPanel.classList.add('hidden');
    return;
  }
  dom.focusPanel.classList.remove('hidden');
  dom.focusCard.replaceChildren();

  const queue = getQueue();
  const current = getFocusTarget();
  if (!current) {
    const holding = getHolding().length;
    dom.focusCard.appendChild(makeEl('p', 'focus-empty', holding
      ? `Queue empty. Waiting on ${holding} holding plane${holding === 1 ? '' : 's'} to rejoin…`
      : 'Skies are clear'));
    return;
  }
  if (state.selectedId !== current.id) {
    state.selectedId = current.id;
    renderDetail();
  }

  const dataWrap = makeEl('div', 'focus-data');
  const textWrap = makeEl('div');
  const position = queue.indexOf(current) + 1;
  textWrap.appendChild(makeEl('p', `eyebrow ${current.mayday ? 'eyebrow--alert' : ''}`,
    current.mayday ? `Mayday · priority ${position} of ${queue.length}` : `Lowest fuel · ${position} of ${queue.length}`));
  textWrap.appendChild(makeEl('h3', '', current.title));
  const details = makeEl('div', 'focus-planned', '');
  textWrap.appendChild(details);

  const fuelBadge = makeEl('div', `badge ${current.mayday || current.fuel < CONFIG.lowFuel ? 'alert' : current.type === 'pr' ? 'pr' : 'draft'}`, '');
  dataWrap.appendChild(textWrap);
  dataWrap.appendChild(fuelBadge);

  dom.focusCard.appendChild(dataWrap);
  dom.focusCard.appendChild(createActionRow(current));
  state.focusRefs = { id: current.id, details, fuel: fuelBadge };
  updateLive(performance.now(), true);
}

/* ---------- stats and live text ---------- */

function updateStats(now) {
  const airborne = state.items.filter(isAirborne);
  const longest = airborne.reduce((max, item) => Math.max(max, item.waitMinutes), 0);
  setText(dom.planesInAir, 'planes', String(airborne.length));
  setText(dom.longestWait, 'longest', formatWait(longest));
  setText(dom.landedToday, 'landed', String(state.landedCount));
  const run = state.run;
  setText(dom.streakStat, 'streak', run.best ? `${run.streak} · best ${run.best}` : String(run.streak));
  setText(dom.simClock, 'clock', `${formatSim(state.simMinutes)} · ${state.speed}x`);
  setText(dom.runTimer, 'timer', formatClock(run.startedAt == null ? 0 : now - run.startedAt));
  setText(dom.streakBadge, 'streakBadge', `Streak ${run.streak}`);
  const storms = state.items.filter(item => item.weather && isAirborne(item)).length;
  setText(dom.weatherSummary, 'weather', storms ? `${storms} storm cell${storms === 1 ? '' : 's'} on approach` : 'Clear weather');
  dom.radarGrid.classList.toggle('is-mayday', airborne.some(item => item.mayday));
}

function updateLive(now, force) {
  const detail = state.detailRefs;
  if (detail) {
    const item = findItem(detail.id);
    if (item) {
      if (force || detail.wait.textContent !== formatWait(item.waitMinutes)) detail.wait.textContent = formatWait(item.waitMinutes);
      const fuelText = `${Math.round(item.fuel)}%`;
      if (detail.fuel.textContent !== fuelText) detail.fuel.textContent = fuelText;
      const statusValue = statusText(item);
      if (detail.status.textContent !== statusValue) detail.status.textContent = statusValue;
    }
  }
  const focus = state.focusRefs;
  if (focus) {
    const item = findItem(focus.id);
    if (item) {
      const detailsText = `${item.agent} · ${item.repo} · ${formatWait(item.waitMinutes)} waiting`;
      if (focus.details.textContent !== detailsText) focus.details.textContent = detailsText;
      const fuelText = item.mayday ? 'MAYDAY · 0% fuel' : `${Math.round(item.fuel)}% fuel`;
      if (focus.fuel.textContent !== fuelText) focus.fuel.textContent = fuelText;
    }
  }
}

/* ---------- finish and reset ---------- */

function checkFinish(now) {
  if (state.finished || !state.items.length) return;
  if (state.items.some(isAirborne)) return;
  if (state.items.some(item => item.anim && item.anim.type === 'land')) return;
  state.finished = true;
  state.focusMode = false;
  awardMedal('clear-skies');
  const run = state.run;
  const elapsed = now - (run.startedAt == null ? state.sessionStart : run.startedAt);
  dom.finishTitle.textContent = `Skies cleared in ${formatClock(elapsed)}`;
  dom.finishStats.textContent = `${run.landed} landed · ${run.sent} sent around · ${run.held} hold${run.held === 1 ? '' : 's'} · best streak ${run.best}`;
  dom.finishCard.classList.remove('hidden');
  radio('Tower', `All stations, skies are clear. Shift complete in ${formatClock(elapsed)}.`, 'ok');
  renderFocus();
  updateFocusButton();
}

function resetShift(startRun) {
  state.items.forEach(item => {
    if (item.el) item.el.remove();
    if (item.stormEl) item.stormEl.remove();
  });
  dom.planeLayer.replaceChildren();
  dom.stormLayer.replaceChildren();
  dom.landedRow.replaceChildren();
  dom.radioLog.replaceChildren();
  dom.finishCard.classList.add('hidden');
  state.textCache.clear();

  const records = getScenarioData();
  state.items = records.map((record, index) => createItemFromRecord(record, index, records.length));
  state.simMinutes = 0;
  state.spin = 0;
  state.run = newRun();
  state.finished = false;
  state.focusMode = false;
  state.landedCount = 0;
  state.undoStack = [];
  dom.undoButton.disabled = true;
  state.medals = new Set();
  renderMedals();
  syncLayers();
  state.selectedId = getQueue()[0]?.id || null;

  radio('Tower', `Control Tower online. ${state.items.length} inbound, runway 27 active.`, 'tower');
  const now = performance.now();
  state.items.forEach(item => {
    ensurePlaneElement(item);
    ensureStormElement(item);
    updateItemPosition(item, now);
    syncPlane(item);
    syncStorm(item);
    if (item.weather) {
      radio('Weather', `Storm cell on approach to ${callsign(item)} (${item.weather.kind === 'security' ? 'security review' : `external-facing: ${item.needs}`}). Routing traffic around it.`, 'weather');
    }
  });

  renderDetail();
  updateFocusButton();
  updateStats(now);
  if (startRun) enterFocus();
  else renderFocus();
}

/* ---------- simulation loop ---------- */

function tick(now) {
  const reduce = prefersReducedMotion();
  if (state.lastFrame == null) state.lastFrame = now;
  const dtMs = clamp(now - state.lastFrame, 0, 250);
  state.lastFrame = now;

  if (reduce && now - state.lastReducedStep < 1000) {
    window.requestAnimationFrame(tick);
    return;
  }
  const stepMs = reduce ? clamp(now - state.lastReducedStep, 0, 1000) : dtMs;
  if (reduce) state.lastReducedStep = now;

  const simDelta = (stepMs / 1000) * state.speed;
  state.simMinutes += simDelta;
  if (!reduce) state.spin += CONFIG.spinPerSecond * (dtMs / 1000);

  let structural = false;
  state.items.forEach(item => {
    if (isAirborne(item)) {
      item.waitMinutes += simDelta;
      item.fuel = Math.max(0, item.fuel - (simDelta / CONFIG.tankMinutes) * 100);

      if (item.fuel < CONFIG.lowFuel && !item.lowLogged) {
        item.lowLogged = true;
        radio(item.agent, `Tower, ${callsign(item)}, low fuel, requesting priority.`, 'alert');
        radio(`Tower → ${item.agent}`, `roger ${callsign(item)}, you're moved up the queue.`, 'tower');
      }
      if (item.fuel <= 0 && !item.mayday) {
        item.mayday = true;
        structural = true;
        if (!item.maydayLogged) {
          item.maydayLogged = true;
          radio(item.agent, `MAYDAY MAYDAY MAYDAY, ${callsign(item)}, fuel exhausted!`, 'mayday');
          radio('Tower → all stations', `emergency in progress. ${callsign(item)} has priority.`, 'mayday');
          if (state.run.streak > 0) {
            state.run.streak = 0;
            radio('Tower', 'Streak broken by a mayday.', 'alert');
          }
        }
        if (state.focusMode) {
          const current = findItem(state.selectedId);
          const typing = document.activeElement && document.activeElement.id === 'decisionNote';
          if (!typing && item.status === 'waiting' && (!current || !current.mayday)) state.selectedId = item.id;
        }
      }
      if (item.status === 'holding' && item.hold && now >= item.hold.until) {
        item.status = 'waiting';
        item.hold = null;
        structural = true;
        radio(item.agent, `Tower, ${callsign(item)} ready to rejoin.`, 'agent');
        radio(`Tower → ${item.agent}`, `rejoin the approach, ${callsign(item)}.`, 'tower');
      }
    }
    if (!item.gone) {
      updateItemPosition(item, now);
      syncPlane(item);
    }
    syncStorm(item);
  });

  if (structural) {
    const typing = document.activeElement && document.activeElement.id === 'decisionNote';
    if (state.focusMode) renderFocus();
    if (!typing) renderDetail();
    updateFocusButton();
  }

  updateStats(now);
  updateLive(now, false);
  checkFinish(now);
  window.requestAnimationFrame(tick);
}

/* ---------- events ---------- */

dom.focusButton.addEventListener('click', () => {
  if (state.focusMode) exitFocus();
  else enterFocus();
});

dom.nextFocusButton.addEventListener('click', nextFocus);

dom.restartButton.addEventListener('click', () => resetShift(true));
dom.closeFinishButton.addEventListener('click', () => dom.finishCard.classList.add('hidden'));

dom.speedButtons.forEach(button => {
  button.addEventListener('click', () => {
    const speed = Number(button.dataset.speed);
    if (!Number.isFinite(speed) || speed <= 0) return;
    state.speed = speed;
    dom.speedButtons.forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    radio('Tower', `Sim clock set to ${speed}x.`, 'tower');
  });
});

dom.layerButtons.forEach(button => {
  button.addEventListener('click', () => {
    const layer = button.dataset.layer;
    if (!Object.hasOwn(state.layers, layer)) return;
    state.layers[layer] = !state.layers[layer];
    syncLayers();
  });
});

dom.scenarioSelect.addEventListener('change', () => {
  state.scenario = dom.scenarioSelect.value;
  resetShift(false);
});

dom.undoButton.addEventListener('click', undoDecision);

document.addEventListener('keydown', event => {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
  const target = event.target;
  if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.isContentEditable)) return;
  const key = event.key.toLowerCase();

  if (key === 'escape') {
    if (state.focusMode) exitFocus();
    else if (!dom.finishCard.classList.contains('hidden')) dom.finishCard.classList.add('hidden');
    return;
  }
  if (key === 'r' && state.finished) {
    event.preventDefault();
    resetShift(true);
    return;
  }
  if (key === 'u' && state.undoStack.length) {
    event.preventDefault();
    undoDecision();
    return;
  }
  if (key === 'f') {
    event.preventDefault();
    if (state.focusMode) exitFocus();
    else enterFocus();
    return;
  }
  if (key === 'n') {
    event.preventDefault();
    nextFocus();
    return;
  }
  const action = new Map([['l', 'land'], ['s', 'change'], ['h', 'snooze']]).get(key);
  if (!action) return;
  const item = state.focusMode ? getFocusTarget() : findItem(state.selectedId);
  if (!item || !isAirborne(item)) return;
  event.preventDefault();
  handleDecision(item.id, action, readNote());
});

function bootstrap() {
  resetShift(false);
  window.requestAnimationFrame(tick);
}

bootstrap();
