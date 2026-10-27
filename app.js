const FALLBACK_APPROVALS = [
  {
    id: 'draft-401',
    title: 'Customer wrap-up email for regional launch',
    type: 'draft',
    agent: 'Mila',
    repo: 'Personal ops',
    needs: 'approval to send',
    sentAt: new Date(Date.now() - 19 * 60 * 60 * 1000).toISOString(),
    status: 'waiting',
    risk: 'Tones down the urgency and should be reviewed for policy wording before sending.',
    summary: 'Email recap to customers after the pilot launch.'
  },
  {
    id: 'draft-403',
    title: 'Launch-day social post',
    type: 'draft',
    agent: 'Proxy',
    repo: 'Marketing sync',
    needs: 'approval to publish',
    sentAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    status: 'waiting',
    risk: 'Strong announcement, but the CTA is slightly too promotional for the current audience.',
    summary: 'LinkedIn post for the new AI triage rollout.'
  },
  {
    id: 'draft-409',
    title: 'Decision memo for pricing proposal',
    type: 'draft',
    agent: 'Nico',
    repo: 'Strategy desk',
    needs: 'approval before sharing',
    sentAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    status: 'waiting',
    risk: 'Needs a last pass on discount language before external distribution.',
    summary: 'Recommended pricing structure for the enterprise package.'
  }
];

const SAMPLE_PULL_REQUESTS = [
  {
    id: 'pr-482',
    title: 'Refine agent handoff prompts',
    type: 'pr',
    agent: 'Copilot',
    repo: 'matchday-intelligence',
    needs: 'approve merge',
    sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
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
    sentAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
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
    sentAt: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString(),
    status: 'waiting',
    risk: 'Operationally safe, but the data export is in a shared pipeline and should be validated before release.'
  },
  {
    id: 'pr-991',
    title: 'Tighten billing-export schema',
    type: 'pr',
    agent: 'Ops Bot',
    repo: 'sample-upstream',
    needs: 'approve schema change',
    sentAt: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
    status: 'waiting',
    risk: 'The schema change is narrow but touches downstream consumers; request validation before signoff.'
  },
  {
    id: 'pr-847',
    title: 'Add release notes generator',
    type: 'pr',
    agent: 'Release Copilot',
    repo: 'Understand-Anything',
    needs: 'review for publication',
    sentAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    status: 'waiting',
    risk: 'Mostly documentation and automation; risk is moderate only because it changes the release path.'
  },
  {
    id: 'pr-590',
    title: 'Prepare email automation for win-back flow',
    type: 'pr',
    agent: 'Grok',
    repo: 'living-ai-pet',
    needs: 'approve customer outreach copy',
    sentAt: new Date(Date.now() - 32 * 60 * 60 * 1000).toISOString(),
    status: 'waiting',
    risk: 'Customer-facing copy is likely fine, but the no-reply trigger should be checked for message delivery policy.'
  }
];

const state = {
  items: [],
  selectedId: null,
  focusIndex: 0,
  focusMode: false,
  decisions: {
    today: 0,
    log: []
  }
};

const planeLayer = document.getElementById('planeLayer');
const detailCard = document.getElementById('detailCard');
const focusCard = document.getElementById('focusCard');
const focusPanel = document.getElementById('focusPanel');
const focusButton = document.getElementById('focusButton');
const nextFocusButton = document.getElementById('nextFocusButton');

function hashToPosition(seed) {
  const total = state.items.length || 1;
  const index = seed % total;
  const ring = (index % 4) + 1;
  const angle = (index / total) * Math.PI * 2 + ((seed * 0.73) % 1) * 0.8;
  const radius = 18 + (ring * 18) + ((seed % 7) * 3);
  const x = 50 + Math.cos(angle) * radius;
  const y = 50 + Math.sin(angle) * radius;
  return { x, y };
}

function createItemFromRecord(raw) {
  return {
    ...raw,
    waitMinutes: getWaitMinutes(raw.sentAt),
    fuel: clamp(Math.round(100 - getWaitMinutes(raw.sentAt) / 3), 0, 100)
  };
}

function getWaitMinutes(dateString) {
  const sent = new Date(dateString).getTime();
  return Math.max(0, Math.round((Date.now() - sent) / 60000));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatWait(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours < 24) return `${hours}h ${remaining}m`;
  const days = Math.floor(hours / 24);
  const hourRemainder = hours % 24;
  return `${days}d ${hourRemainder}h`;
}

function getLongestWait() {
  return state.items
    .filter(item => item.status === 'waiting')
    .reduce((max, item) => Math.max(max, item.waitMinutes), 0);
}

function getPlanesInAir() {
  return state.items.filter(item => item.status === 'waiting').length;
}

function getLandedToday() {
  const today = new Date();
  return state.items.filter(item => {
    if (item.status !== 'landed') return false;
    const landed = new Date(item.lastDecisionAt || item.sentAt);
    return landed.toDateString() === today.toDateString();
  }).length;
}

function updateStatusBar() {
  document.getElementById('planesInAir').textContent = String(getPlanesInAir());
  document.getElementById('longestWait').textContent = formatWait(getLongestWait());
  document.getElementById('landedToday').textContent = String(getLandedToday());
}

function sortItems(items) {
  return [...items].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'waiting' ? -1 : 1;
    return a.fuel - b.fuel;
  });
}

function renderPlanes() {
  const items = sortItems(state.items);
  planeLayer.innerHTML = '';

  items.forEach((item, index) => {
    const position = hashToPosition(index + item.id.length);
    const button = document.createElement('button');
    button.className = `plane ${item.id === state.selectedId ? 'selected' : ''} ${item.fuel < 25 ? 'low-fuel' : ''}`;
    button.type = 'button';
    button.style.left = `${position.x}%`;
    button.style.top = `${position.y}%`;
    button.title = `${item.agent} · ${item.needs}`;
    button.setAttribute('aria-label', `${item.agent} ${item.title}`);
    button.innerHTML = `
      <span class="plane-badge"></span>
      <span class="plane-label">
        <span class="plane-tag">${item.agent}</span>
        <span class="plane-name">${item.type === 'pr' ? 'PR' : 'Draft'}</span>
      </span>
    `;
    button.addEventListener('click', () => {
      state.selectedId = item.id;
      renderDetail();
      renderPlanes();
    });
    planeLayer.appendChild(button);
  });
}

function renderDetail() {
  const item = state.items.find(entry => entry.id === state.selectedId);
  if (!item) {
    detailCard.innerHTML = '<p class="detail-empty">Select a plane to review the request.</p>';
    return;
  }

  const statusLabel = item.type === 'pr' ? 'pull request' : 'draft';
  const note = item.lastNote || 'No decision sent yet.';

  detailCard.innerHTML = `
    <div class="detail-header">
      <div>
        <p class="eyebrow">${item.type === 'pr' ? 'Approval queue' : 'Local draft'}</p>
        <h3>${item.title}</h3>
      </div>
      <span class="badge ${item.type === 'pr' ? 'pr' : 'draft'}">${statusLabel}</span>
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <span class="label">Agent</span>
        <strong>${item.agent}</strong>
      </div>
      <div class="meta-item">
        <span class="label">Repo</span>
        <strong>${item.repo}</strong>
      </div>
      <div class="meta-item">
        <span class="label">Needs</span>
        <strong>${item.needs}</strong>
      </div>
      <div class="meta-item">
        <span class="label">Wait</span>
        <strong>${formatWait(item.waitMinutes)}</strong>
      </div>
    </div>

    <div class="risk-box">
      <h4>Risk note</h4>
      <p>${item.risk}</p>
    </div>

    <div class="note-box">
      <h4>Last note</h4>
      <p>${note}</p>
    </div>

    <div class="action-row">
      <button class="primary-button" type="button" data-action="land">Land it</button>
      <button class="secondary-button" type="button" data-action="change">Send around</button>
      <button class="ghost-button" type="button" data-action="snooze">Holding pattern</button>
    </div>

    <textarea class="input-note" id="decisionNote" placeholder="Add a short decision note for the agent..."></textarea>
  `;

  detailCard.querySelectorAll('[data-action]').forEach(button => {
    button.addEventListener('click', () => {
      const noteValue = document.getElementById('decisionNote').value.trim();
      handleDecision(item.id, button.dataset.action, noteValue || undefined);
    });
  });
}

function handleDecision(itemId, action, note) {
  const item = state.items.find(entry => entry.id === itemId);
  if (!item) return;

  const resultNote = note || {
    land: 'Approved and queued for merge/release.',
    change: 'Requested changes with a brief review note.',
    snooze: 'Held for later review on the next pass.'
  }[action];

  item.lastNote = resultNote;
  item.status = action === 'land' ? 'landed' : action === 'change' ? 'changes-requested' : 'snoozed';
  item.lastDecisionAt = new Date().toISOString();

  state.decisions.log.unshift({
    id: itemId,
    action,
    summary: `${item.agent} · ${resultNote}`
  });

  if (action === 'land') {
    state.decisions.today += 1;
  }

  updateStatusBar();
  renderPlanes();
  renderDetail();
  renderFocus();
}

function buildFocusQueue() {
  return sortItems(state.items.filter(item => item.status === 'waiting'));
}

function renderFocus() {
  const queue = buildFocusQueue();
  if (!state.focusMode || queue.length === 0) {
    focusPanel.classList.add('hidden');
    return;
  }

  focusPanel.classList.remove('hidden');
  const current = queue[state.focusIndex % queue.length] || queue[0];
  if (!current) return;

  focusCard.innerHTML = `
    <div class="focus-data">
      <div>
        <p class="eyebrow">Lowest fuel</p>
        <h3>${current.title}</h3>
        <div class="focus-planned">${current.agent} · ${current.repo} · ${formatWait(current.waitMinutes)} waiting</div>
      </div>
      <div class="badge ${current.type === 'pr' ? 'pr' : 'draft'}">${current.fuel}% fuel</div>
    </div>
    <p>${current.risk}</p>
  `;
}

function startFocusMode() {
  const queue = buildFocusQueue();
  if (queue.length === 0) return;

  state.focusMode = true;
  state.focusIndex = 0;
  renderFocus();
}

focusButton.addEventListener('click', () => {
  startFocusMode();
});

nextFocusButton.addEventListener('click', () => {
  const queue = buildFocusQueue();
  if (!queue.length) return;
  state.focusIndex = (state.focusIndex + 1) % queue.length;
  renderFocus();
  state.selectedId = queue[state.focusIndex].id;
  renderDetail();
  renderPlanes();
});

async function loadApprovals() {
  try {
    const response = await fetch('approvals.json');
    if (!response.ok) throw new Error('Approvals file not found');
    const data = await response.json();
    return Array.isArray(data) ? data : FALLBACK_APPROVALS;
  } catch (error) {
    return FALLBACK_APPROVALS;
  }
}

async function bootstrap() {
  const localDrafts = await loadApprovals();
  const flattened = [...SAMPLE_PULL_REQUESTS, ...localDrafts].map(createItemFromRecord);
  state.items = flattened;
  state.selectedId = flattened[0]?.id || null;
  updateStatusBar();
  renderPlanes();
  renderDetail();
  renderFocus();
}

bootstrap();
