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

const STORAGE_PREFIX = 'agentControlTower.';

const MEDALS = [
  { id: 'perfect', icon: '\u{1F3AF}', name: 'Perfect Landing', desc: 'Land 3 in a row without sending around' },
  { id: 'highFuel', icon: '\u{26FD}', name: 'High Fuel', desc: 'Finish a shift with every decision made above 80% fuel' },
  { id: 'risky', icon: '\u{1F329}\uFE0F', name: 'Risky Business', desc: 'Land a plane in bad weather on low fuel' },
  { id: 'speed', icon: '\u{26A1}', name: 'Speed Runner', desc: 'Land 5 planes in under 2 minutes' },
  { id: 'noMayday', icon: '\u{1F9D8}', name: 'No Mayday', desc: 'Finish a shift without a single mayday' },
  { id: 'streak', icon: '\u{1F525}', name: 'Streak Master', desc: 'Reach a streak of 5 decisions' }
];

const SCENARIO_POOLS = {
  titles: {
    pr: ['Refine agent handoff prompts', 'Add dependency update checks', 'Fix onboarding analytics report', 'Harden session token refresh',
      'Cache radar geometry', 'Migrate billing webhooks', 'Rework feature flag loader', 'Patch markdown renderer', 'Trim CI matrix',
      'Add audit log export', 'Upgrade build toolchain', 'Fix timezone drift in reports'],
    draft: ['Customer wrap-up email', 'Launch-day social post', 'Decision memo for pricing', 'Status page update', 'Partner announcement',
      'Incident summary for customers', 'Release notes blog post', 'Exec briefing note', 'Support macro refresh', 'Internal all-hands recap']
  },
  agents: {
    pr: ['Copilot', 'Dependabot', 'Pine', 'Release Bot', 'Atlas'],
    draft: ['Mila', 'Proxy', 'Nico', 'Scribe', 'Juno']
  },
  repos: {
    pr: ['matchday-intelligence', 'demo-sandbox', 'sample-admin-tools', 'core-api', 'web-client'],
    draft: ['Personal ops', 'Marketing sync', 'Strategy desk', 'Comms hub', 'Support desk']
  },
  stormNeeds: {
    pr: ['security review'],
    draft: ['approval to send', 'approval to publish', 'approval before sharing']
  },
  calmNeeds: {
    pr: ['approve merge', 'approve rollout'],
    draft: ['approval to file', 'approval to archive']
  },
  risks: {
    low: [
      'Looks routine; a quick skim is enough before it goes out.',
      'Low blast radius, but confirm the checklist before approving.'
    ],
    high: [
      'High blast radius: this touches a shared pipeline and deserves a careful read.',
      'Sensitive wording or config in play; verify before it leaves the building.',
      'Elevated risk: rollback would be painful if this slips through.'
    ]
  }
};

const SCENARIOS = [
  {
    id: 'classic', name: 'Classic Shift', difficulty: 1, blurb: 'The original six-plane sample queue.',
    tankMinutes: 1200, wind: { dir: 200, strength: 0.4, knots: 8 }
  },
  {
    id: 'launch', name: 'Launch Day', difficulty: 2, blurb: 'Heavy PR volume, some risky, moderate weather.',
    seed: 1101, count: 10, prRatio: 0.8, stormChance: 0.25, riskChance: 0.35, waitMin: 60, waitMax: 800,
    tankMinutes: 1200, wind: { dir: 300, strength: 0.5, knots: 12 }
  },
  {
    id: 'critical', name: 'Critical Bug', difficulty: 3, blurb: 'Few urgent items, extreme weather, tanks nearly dry.',
    seed: 2202, count: 4, prRatio: 0.75, stormChance: 0.75, riskChance: 0.8, waitMin: 400, waitMax: 650,
    tankMinutes: 700, wind: { dir: 20, strength: 0.9, knots: 34 }
  },
  {
    id: 'security', name: 'Security Incident', difficulty: 3, blurb: 'Drafts and PRs mixed, elevated risk, lots of outbound comms.',
    seed: 3303, count: 8, prRatio: 0.5, stormChance: 0.6, riskChance: 0.6, waitMin: 120, waitMax: 900,
    tankMinutes: 1000, wind: { dir: 110, strength: 0.7, knots: 22 }
  },
  {
    id: 'allhands', name: 'All Hands Review', difficulty: 2, blurb: 'A balanced queue with every kind of agent.',
    seed: 4404, count: 9, prRatio: 0.5, stormChance: 0.3, riskChance: 0.3, waitMin: 60, waitMax: 900,
    tankMinutes: 1200, wind: { dir: 250, strength: 0.3, knots: 6 }
  }
];

const DIFFICULTY_LABELS = ['', 'Easy', 'Medium', 'Hard'];

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateRecords(spec) {
  const rand = mulberry32(spec.seed);
  const pick = list => list[Math.floor(rand() * list.length)];
  const used = { pr: Math.floor(rand() * 100), draft: Math.floor(rand() * 100) };
  const records = [];
  for (let i = 0; i < spec.count; i += 1) {
    const type = rand() < spec.prRatio ? 'pr' : 'draft';
    const stormy = rand() < spec.stormChance;
    const risky = rand() < spec.riskChance;
    const titles = SCENARIO_POOLS.titles[type];
    const title = titles[used[type]++ % titles.length];
    const record = {
      id: `${type}-${spec.seed % 1000 + i * 13 + Math.floor(rand() * 10)}`,
      title,
      type,
      agent: pick(SCENARIO_POOLS.agents[type]),
      repo: pick(SCENARIO_POOLS.repos[type]),
      needs: pick((stormy ? SCENARIO_POOLS.stormNeeds : SCENARIO_POOLS.calmNeeds)[type]),
      minutesAgo: Math.round(spec.waitMin + rand() * (spec.waitMax - spec.waitMin)),
      status: 'waiting',
      risk: pick(SCENARIO_POOLS.risks[risky ? 'high' : 'low'])
    };
    if (type === 'draft') record.summary = `${title}, drafted by ${record.agent}.`;
    records.push(record);
  }
  return records;
}

function getScenario(id) {
  return SCENARIOS.find(scenario => scenario.id === id) || SCENARIOS[0];
}

function scenarioRecords(scenario) {
  return scenario.seed == null ? getSeedData() : generateRecords(scenario);
}

function difficultyText(scenario) {
  return `${'\u2605'.repeat(scenario.difficulty)}${'\u2606'.repeat(3 - scenario.difficulty)} ${DIFFICULTY_LABELS[scenario.difficulty]}`;
}

function loadStore(key, fallback) {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

function saveStore(key, value) {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (error) {
    /* storage unavailable: keep running in memory */
  }
}

const state = {
  scenario: SCENARIOS[0],
  undo: null,
  layers: { trails: true, vectors: true, wind: true },
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
  finishScenario: document.getElementById('finishScenario'),
  finishCompare: document.getElementById('finishCompare'),
  finishMedals: document.getElementById('finishMedals'),
  scenarioSelect: document.getElementById('scenarioSelect'),
  undoButton: document.getElementById('undoButton'),
  trailCanvas: document.getElementById('trailCanvas'),
  windIndicator: document.getElementById('windIndicator'),
  layerButtons: Array.from(document.querySelectorAll('[data-layer]')),
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
  speedButtons: Array.from(document.querySelectorAll('.speed-button[data-speed]'))
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

function tankMinutes() {
  return state.scenario.tankMinutes || CONFIG.tankMinutes;
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
  const fuel = clamp(100 - (waitMinutes / tankMinutes()) * 100, 0, 100);
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
    classKey: '',
    trail: [],
    trailAt: 0,
    undone: false
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
  return {
    startedAt: null, streak: 0, best: 0, landed: 0, sent: 0, held: 0, lastDecisionAt: null,
    cleanLandings: 0, landTimes: [], minFuel: 100, maydays: 0, medals: []
  };
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
  return line;
}

function awardMedal(id) {
  const run = state.run;
  if (run.medals.includes(id)) return;
  run.medals.push(id);
  const medal = MEDALS.find(entry => entry.id === id);
  radio('Tower', `Medal earned: ${medal.name}.`, 'ok');
}

/* ---------- positions ---------- */

function stormBend(item, radius) {
  if (!item.weather) return 0;
  const distance = (radius - item.stormRadius) / CONFIG.stormWidth;
  const wind = state.scenario.wind;
  const angle = item.baseAngle + state.spin;
  const windFactor = wind ? 1 + wind.strength * Math.cos(((wind.dir - 90) * Math.PI) / 180 - angle) : 1;
  return (CONFIG.stormClearance / Math.max(radius, 6)) * Math.exp(-distance * distance) * windFactor;
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
    trackUndoLine(item, radio('Weather', `Storm cell near ${callsign(item)} dissipating.`, 'weather'));
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

function trackUndoLine(item, line) {
  if (state.undo && state.undo.id === item.id) state.undo.lines.push(line);
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
  trackUndoLine(item, radio('Tower', `${callsign(item)} on the ground. Welcome home, ${item.agent}.`, 'ok'));
  if (item.id === state.selectedId) renderDetail();
}

function completeSendAround(item) {
  item.anim = null;
  item.fuel = 100;
  trackUndoLine(item, radio(item.agent, `${callsign(item)} back on the outer ring, refueled, working on changes.`, 'agent'));
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

  const DEFAULT_NOTES = new Map([
    ['land', 'Approved and queued for merge/release.'],
    ['change', 'Requested changes with a brief review note.'],
    ['snooze', 'Held for later review on the next pass.']
  ]);
  const resultNote = note || DEFAULT_NOTES.get(action);
  if (!resultNote) return;

  const snapshot = {
    id: item.id,
    status: item.status,
    hold: item.hold ? { ...item.hold } : null,
    fuel: item.fuel,
    waitMinutes: item.waitMinutes,
    mayday: item.mayday,
    lowLogged: item.lowLogged,
    lastNote: item.lastNote,
    lastDecisionAt: item.lastDecisionAt,
    takenAt: now,
    landedCount: state.landedCount,
    run: { ...state.run, landTimes: [...state.run.landTimes], medals: [...state.run.medals] },
    lines: []
  };
  const decisionFuel = item.fuel;
  const decisionWeather = item.weather;
  const radioStart = dom.radioLog.children.length;
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
  run.minFuel = Math.min(run.minFuel, decisionFuel);
  if (action === 'land') {
    run.cleanLandings += 1;
    run.landTimes.push(now);
    if (run.cleanLandings >= 3) awardMedal('perfect');
    if (decisionWeather && decisionFuel < CONFIG.lowFuel) awardMedal('risky');
    if (run.landTimes.length >= 5 && now - run.landTimes[run.landTimes.length - 5] <= 120000) awardMedal('speed');
  } else if (action === 'change') {
    run.cleanLandings = 0;
  }
  if (run.startedAt == null) run.startedAt = now;
  run.streak = run.lastDecisionAt != null && now - run.lastDecisionAt <= CONFIG.streakWindowMs ? run.streak + 1 : 1;
  run.best = Math.max(run.best, run.streak);
  run.lastDecisionAt = now;
  if (run.streak >= 3 && run.streak === run.best) {
    radio('Tower', `${run.streak} in a row. Smooth operating.`, 'ok');
  }
  if (run.best >= 5) awardMedal('streak');

  const added = Array.from(dom.radioLog.children).slice(radioStart);
  snapshot.lines = added;
  state.undo = snapshot;

  if (state.focusMode) {
    const queue = getQueue();
    state.selectedId = queue.length ? queue[0].id : state.selectedId;
  }

  syncPlane(item);
  renderDetail();
  renderFocus();
  updateFocusButton();
  updateStats(now);
  updateUndoButton();
}

function canUndo() {
  const undo = state.undo;
  if (!undo || state.finished) return false;
  const item = findItem(undo.id);
  return Boolean(item) && !item.undone;
}

function updateUndoButton() {
  dom.undoButton.classList.toggle('hidden', !canUndo());
}

function undoDecision() {
  if (!canUndo()) return;
  const undo = state.undo;
  const item = findItem(undo.id);
  const now = performance.now();
  const sign = callsign(item);

  item.undone = true;
  item.anim = null;
  item.status = undo.status;
  item.hold = undo.hold ? { ...undo.hold, start: undo.hold.start + (now - undo.takenAt), until: undo.hold.until + (now - undo.takenAt) } : null;
  item.fuel = undo.fuel;
  item.waitMinutes = undo.waitMinutes;
  item.mayday = undo.mayday;
  item.lowLogged = undo.lowLogged;
  item.lastNote = undo.lastNote || '';
  item.lastDecisionAt = undo.lastDecisionAt;
  item.parkBase = null;
  item.classKey = '';
  state.landedCount = undo.landedCount;
  undo.run.maydays = state.run.maydays;
  state.run = undo.run;

  if (item.gone) {
    item.gone = false;
    dom.landedRow.querySelectorAll('.landed-chip').forEach(chip => {
      if (chip.dataset.id === item.id) chip.remove();
    });
  }
  if (item.weather) {
    if (item.stormEl && item.stormEl.classList.contains('is-clearing')) {
      item.stormEl.remove();
      item.stormEl = null;
    }
    ensureStormElement(item);
  }
  ensurePlaneElement(item);
  item.trail = [];
  undo.lines.forEach(line => line.classList.add('radio-line--undone'));
  radio('Tower', `Disregard, ${sign}. Last decision withdrawn.`, 'alert');
  state.undo = null;

  state.selectedId = item.id;
  updateItemPosition(item, now);
  syncPlane(item);
  renderDetail();
  renderFocus();
  updateFocusButton();
  updateStats(now);
  updateUndoButton();
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

function renderSummary(run, elapsed) {
  const scenario = state.scenario;
  dom.finishScenario.textContent = `${scenario.name} \u00B7 ${difficultyText(scenario)}`;

  const plain = value => (value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {});
  const isNum = value => typeof value === 'number' && Number.isFinite(value);
  const earned = plain(loadStore('medals', {}));
  const stamp = new Date().toISOString();
  const fresh = new Set();
  run.medals.forEach(id => {
    const prior = Object.hasOwn(earned, id) ? plain(earned[id]) : null;
    if (!prior) fresh.add(id);
    earned[id] = { at: prior && typeof prior.at === 'string' ? prior.at : stamp, last: stamp, scenario: scenario.name, count: (prior && isNum(prior.count) ? prior.count : 0) + 1 };
  });
  saveStore('medals', earned);

  const runs = plain(loadStore('runs', {}));
  const previous = Object.hasOwn(runs, scenario.id) ? runs[scenario.id] : null;
  const current = { elapsedMs: Math.round(elapsed), landed: run.landed, sent: run.sent, best: run.best, medals: run.medals.length, at: stamp };
  runs[scenario.id] = current;
  saveStore('runs', runs);
  if (previous && isNum(previous.elapsedMs) && isNum(previous.best) && isNum(previous.medals)) {
    const diff = Math.round((elapsed - previous.elapsedMs) / 1000);
    const timeText = diff === 0 ? 'same time' : `${formatClock(Math.abs(diff) * 1000)} ${diff < 0 ? 'faster' : 'slower'}`;
    dom.finishCompare.textContent = `Previous run: ${formatClock(previous.elapsedMs)}, streak ${previous.best}, ${previous.medals} medal${previous.medals === 1 ? '' : 's'} \u00B7 this run ${timeText}, streak ${run.best >= previous.best ? '+' : '-'}${Math.abs(run.best - previous.best)}`;
  } else {
    dom.finishCompare.textContent = 'First run on this scenario. This is your personal best to beat.';
  }

  dom.finishMedals.replaceChildren();
  MEDALS.filter(medal => run.medals.includes(medal.id)).forEach(medal => {
    const entry = makeEl('li');
    const icon = makeEl('span', 'medal-icon', medal.icon);
    icon.setAttribute('aria-hidden', 'true');
    const label = makeEl('span', '', medal.name);
    label.appendChild(makeEl('span', 'medal-desc', medal.desc));
    entry.appendChild(icon);
    entry.appendChild(label);
    if (fresh.has(medal.id)) entry.appendChild(makeEl('span', 'medal-new', 'NEW'));
    dom.finishMedals.appendChild(entry);
  });
  if (!run.medals.length) dom.finishMedals.appendChild(makeEl('li', 'medal-none', 'No medals this time. Try a longer streak or a cleaner approach.'));
  const total = Object.keys(earned).length;
  dom.finishMedals.appendChild(makeEl('li', 'medal-none', `Collection: ${total} of ${MEDALS.length} medals`));
}

function checkFinish(now) {
  if (state.finished || !state.items.length) return;
  if (state.items.some(isAirborne)) return;
  if (state.items.some(item => item.anim && item.anim.type === 'land')) return;
  state.finished = true;
  state.focusMode = false;
  const run = state.run;
  const elapsed = now - (run.startedAt == null ? state.sessionStart : run.startedAt);
  dom.finishTitle.textContent = `Skies cleared in ${formatClock(elapsed)}`;
  if (run.minFuel > 80 && run.landed + run.sent + run.held > 0) awardMedal('highFuel');
  if (run.maydays === 0) awardMedal('noMayday');
  renderSummary(run, elapsed);
  dom.finishStats.textContent = `${run.landed} landed · ${run.sent} sent around · ${run.held} hold${run.held === 1 ? '' : 's'} · best streak ${run.best}`;
  dom.finishCard.classList.remove('hidden');
  radio('Tower', `All stations, skies are clear. Shift complete in ${formatClock(elapsed)}.`, 'ok');
  renderFocus();
  updateFocusButton();
  updateUndoButton();
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

  const records = scenarioRecords(state.scenario);
  state.undo = null;
  updateWindIndicator();
  state.items = records.map((record, index) => createItemFromRecord(record, index, records.length));
  state.simMinutes = 0;
  state.spin = 0;
  state.run = newRun();
  state.finished = false;
  state.focusMode = false;
  state.landedCount = 0;
  state.selectedId = getQueue()[0]?.id || null;

  radio('Tower', `Control Tower online. ${state.items.length} inbound, runway 27 active.`, 'tower');
  radio('Tower', `Scenario ${state.scenario.name} (${DIFFICULTY_LABELS[state.scenario.difficulty]}): ${state.scenario.blurb}`, 'tower');
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
  updateUndoButton();
  if (startRun) enterFocus();
  else renderFocus();
}

/* ---------- radar overlay: trails, approach vectors, wind ---------- */

const TRAIL_LENGTH = 8;
const TRAIL_INTERVAL_MS = 140;

function sampleTrail(item, now, reduce) {
  if (item.gone) {
    if (item.trail.length) item.trail = [];
    return;
  }
  if (!reduce && now - item.trailAt < TRAIL_INTERVAL_MS) return;
  item.trailAt = now;
  item.trail.push({ x: item.x, y: item.y });
  if (item.trail.length > TRAIL_LENGTH) item.trail.shift();
}

function windText(wind) {
  return `${String(Math.round(wind.dir)).padStart(3, '0')}\u00B0 \u00B7 ${wind.knots} kt`;
}

function updateWindIndicator() {
  const wind = state.scenario.wind;
  dom.windIndicator.replaceChildren();
  dom.windIndicator.classList.toggle('hidden', !state.layers.wind || !wind);
  if (!wind) return;
  const arrow = makeEl('span', 'wind-arrow', '\u27A4');
  arrow.setAttribute('aria-hidden', 'true');
  arrow.style.transform = `rotate(${wind.dir - 90}deg)`;
  dom.windIndicator.appendChild(arrow);
  dom.windIndicator.appendChild(document.createTextNode(`Wind ${windText(wind)}`));
  dom.windIndicator.setAttribute('aria-label', `Wind toward ${windText(wind)}`);
}

function drawOverlay(now) {
  const canvas = dom.trailCanvas;
  if (!canvas || typeof canvas.getContext !== 'function') return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const ratio = window.devicePixelRatio || 1;
  const w = dom.radarGrid.clientWidth;
  const h = dom.radarGrid.clientHeight;
  const pw = Math.round(w * ratio);
  const ph = Math.round(h * ratio);
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const px = point => [(point.x / 100) * w, (point.y / 100) * h];
  const layers = state.layers;

  if (layers.wind && state.scenario.wind) {
    const wind = state.scenario.wind;
    const dir = (wind.dir * Math.PI) / 180;
    const dx = Math.sin(dir);
    const dy = -Math.cos(dir);
    const drift = prefersReducedMotion() ? 0 : ((now / 5000) % 1);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(123, 217, 255, 0.14)';
    for (let k = 0; k < 8; k += 1) {
      const bx = 0.12 + ((k * 0.37) % 0.76);
      const by = 0.1 + ((k * 0.53) % 0.8);
      const offset = (drift + k / 8) % 1;
      const sx = (bx + dx * (offset - 0.5) * 0.12) * w;
      const sy = (by + dy * (offset - 0.5) * 0.12) * h;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + dx * w * 0.05 * wind.strength * 2, sy + dy * h * 0.05 * wind.strength * 2);
      ctx.stroke();
    }
  }

  if (layers.vectors) {
    const { final, threshold } = runwayPoints();
    const [fx, fy] = px(final);
    const [tx, ty] = px(threshold);
    ctx.setLineDash([4, 6]);
    ctx.lineWidth = 1;
    state.items.forEach(item => {
      if (item.gone || item.anim || !isAirborne(item)) return;
      const [x, y] = px(item);
      ctx.strokeStyle = item.id === state.selectedId ? 'rgba(99, 242, 178, 0.45)' : 'rgba(99, 242, 178, 0.13)';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(fx, fy, tx, ty);
      ctx.stroke();
    });
    ctx.setLineDash([]);
  }

  if (layers.trails) {
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    state.items.forEach(item => {
      const trail = item.trail;
      if (item.gone || trail.length < 2) return;
      for (let i = 1; i < trail.length; i += 1) {
        const [x0, y0] = px(trail[i - 1]);
        const [x1, y1] = px(trail[i]);
        ctx.strokeStyle = `rgba(123, 217, 255, ${((i / trail.length) * 0.4).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
    });
  }
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
      item.fuel = Math.max(0, item.fuel - (simDelta / tankMinutes()) * 100);

      if (item.fuel < CONFIG.lowFuel && !item.lowLogged) {
        item.lowLogged = true;
        radio(item.agent, `Tower, ${callsign(item)}, low fuel, requesting priority.`, 'alert');
        radio(`Tower → ${item.agent}`, `roger ${callsign(item)}, you're moved up the queue.`, 'tower');
      }
      if (item.fuel <= 0 && !item.mayday) {
        item.mayday = true;
        structural = true;
        state.run.maydays += 1;
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
    sampleTrail(item, now, reduce);
  });
  drawOverlay(now);

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

dom.undoButton.addEventListener('click', undoDecision);

SCENARIOS.forEach(scenario => {
  const option = makeEl('option', '', `${scenario.name} \u00B7 ${DIFFICULTY_LABELS[scenario.difficulty]}`);
  option.value = scenario.id;
  dom.scenarioSelect.appendChild(option);
});
dom.scenarioSelect.addEventListener('change', () => {
  state.scenario = getScenario(dom.scenarioSelect.value);
  saveStore('scenario', state.scenario.id);
  dom.scenarioSelect.blur();
  resetShift(false);
});

function syncLayerButtons() {
  dom.layerButtons.forEach(button => {
    button.setAttribute('aria-pressed', String(Boolean(state.layers[button.dataset.layer])));
  });
}

dom.layerButtons.forEach(button => {
  button.addEventListener('click', () => {
    const layer = button.dataset.layer;
    if (!Object.hasOwn(state.layers, layer)) return;
    state.layers[layer] = !state.layers[layer];
    saveStore('layers', state.layers);
    syncLayerButtons();
    updateWindIndicator();
  });
});

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
  if (key === 'u') {
    event.preventDefault();
    undoDecision();
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
  const savedLayers = loadStore('layers', null);
  if (savedLayers && typeof savedLayers === 'object') {
    Object.keys(state.layers).forEach(key => {
      if (typeof savedLayers[key] === 'boolean') state.layers[key] = savedLayers[key];
    });
  }
  state.scenario = getScenario(loadStore('scenario', SCENARIOS[0].id));
  dom.scenarioSelect.value = state.scenario.id;
  syncLayerButtons();
  resetShift(false);
  window.requestAnimationFrame(tick);
}

bootstrap();
