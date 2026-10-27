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

const state = {
  items: [],
  selectedId: null,
  focusMode: false,
  focusIndex: 0
};

const planeLayer = document.getElementById('planeLayer');
const detailCard = document.getElementById('detailCard');
const focusCard = document.getElementById('focusCard');
const focusPanel = document.getElementById('focusPanel');
const focusButton = document.getElementById('focusButton');
const nextFocusButton = document.getElementById('nextFocusButton');

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

function minutesAgoToSentAt(minutesAgo) {
  return new Date(Date.now() - Math.max(0, Number(minutesAgo) || 0) * 60 * 1000).toISOString();
}

function createItemFromRecord(raw) {
  const minutesAgo = Number(raw.minutesAgo ?? 0);
  const sentAt = raw.sentAt || minutesAgoToSentAt(minutesAgo);
  const waitMinutes = Math.max(0, Math.round((Date.now() - new Date(sentAt).getTime()) / 60000));
  return {
    ...raw,
    minutesAgo,
    sentAt,
    waitMinutes,
    fuel: clamp(Math.round(100 - waitMinutes / 3), 0, 100),
    lastNote: raw.lastNote || ''
  };
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

function sortItems(items) {
  return [...items].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'waiting' ? -1 : 1;
    return a.fuel - b.fuel;
  });
}

function getWaitingItems() {
  return state.items.filter(item => item.status === 'waiting');
}

function getAgentClass(agent) {
  if (/copilot|pilot|release/i.test(agent)) return 'plane--copilot';
  if (/dependabot|bot|ops/i.test(agent)) return 'plane--dependabot';
  return 'plane--draft';
}

function getLowestFuelItem() {
  const waiting = getWaitingItems();
  return waiting.reduce((lowest, current) => (current.fuel < lowest.fuel ? current : lowest), waiting[0]);
}

function getPlanePosition(item, index, total) {
  const angle = (index / total) * Math.PI * 2 + Math.PI / 6;
  const fuelRatio = clamp(item.fuel / 100, 0, 1);
  const radius = 12 + fuelRatio * 22;
  const x = 50 + Math.cos(angle) * radius;
  const y = 50 + Math.sin(angle) * radius;
  return { x, y };
}

function updateFocusButton() {
  const waiting = getWaitingItems();
  if (!waiting.length) {
    focusButton.disabled = true;
    focusButton.textContent = 'Skies are clear';
    return;
  }

  focusButton.disabled = false;
  focusButton.textContent = state.focusMode ? 'Exit focus' : 'Clear the skies';
}

function updateStatusBar() {
  const waiting = getWaitingItems();
  const longest = waiting.reduce((max, item) => Math.max(max, item.waitMinutes), 0);
  const landed = state.items.filter(item => {
    if (item.status !== 'landed') return false;
    const landingDate = new Date(item.lastDecisionAt || item.sentAt);
    return landingDate.toDateString() === new Date().toDateString();
  }).length;

  document.getElementById('planesInAir').textContent = String(waiting.length);
  document.getElementById('longestWait').textContent = formatWait(longest);
  document.getElementById('landedToday').textContent = String(landed);
}

function renderPlanes() {
  const waiting = getWaitingItems();
  const total = Math.max(waiting.length, 1);

  planeLayer.replaceChildren();

  state.items.forEach((item) => {
    const button = document.createElement('button');
    const isWaiting = item.status === 'waiting';
    const position = isWaiting ? getPlanePosition(item, waiting.indexOf(item), total) : { x: 50, y: 50 };

    button.type = 'button';
    button.className = `plane ${getAgentClass(item.agent)} ${item.id === state.selectedId ? 'selected' : ''} ${isWaiting && item.fuel < 25 ? 'low-fuel' : ''} ${!isWaiting ? 'is-resolved' : ''}`;
    button.style.left = `${position.x}%`;
    button.style.top = `${position.y}%`;
    button.title = `${item.agent} · ${item.needs}`;
    button.setAttribute('aria-label', `${item.agent} ${item.title}`);

    const badge = document.createElement('span');
    badge.className = 'plane-badge';

    const label = document.createElement('span');
    label.className = 'plane-label';

    const tag = document.createElement('span');
    tag.className = 'plane-tag';
    tag.textContent = item.agent;

    const name = document.createElement('span');
    name.className = 'plane-name';
    name.textContent = item.type === 'pr' ? 'PR' : 'Draft';

    label.appendChild(tag);
    label.appendChild(name);
    button.appendChild(badge);
    button.appendChild(label);

    if (isWaiting) {
      button.addEventListener('click', () => {
        state.selectedId = item.id;
        renderDetail();
        renderPlanes();
      });
    }

    planeLayer.appendChild(button);
  });
}

function createMetaItem(labelText, valueText) {
  const item = document.createElement('div');
  item.className = 'meta-item';

  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = labelText;

  const strong = document.createElement('strong');
  strong.textContent = valueText;

  item.appendChild(label);
  item.appendChild(strong);
  return item;
}

function renderDetail() {
  detailCard.replaceChildren();
  const item = state.items.find(entry => entry.id === state.selectedId);

  if (!item) {
    const empty = document.createElement('p');
    empty.className = 'detail-empty';
    empty.textContent = 'Select a plane to review the request.';
    detailCard.appendChild(empty);
    return;
  }

  const header = document.createElement('div');
  header.className = 'detail-header';

  const titleWrap = document.createElement('div');
  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = item.type === 'pr' ? 'Approval queue' : 'Local draft';

  const title = document.createElement('h3');
  title.textContent = item.title;

  titleWrap.appendChild(eyebrow);
  titleWrap.appendChild(title);

  const badge = document.createElement('span');
  badge.className = `badge ${item.type === 'pr' ? 'pr' : 'draft'}`;
  badge.textContent = item.type === 'pr' ? 'pull request' : 'draft';

  header.appendChild(titleWrap);
  header.appendChild(badge);

  const metaGrid = document.createElement('div');
  metaGrid.className = 'meta-grid';
  metaGrid.appendChild(createMetaItem('Agent', item.agent));
  metaGrid.appendChild(createMetaItem('Repo', item.repo));
  metaGrid.appendChild(createMetaItem('Needs', item.needs));
  metaGrid.appendChild(createMetaItem('Wait', formatWait(item.waitMinutes)));

  const riskBox = document.createElement('div');
  riskBox.className = 'risk-box';
  const riskTitle = document.createElement('h4');
  riskTitle.textContent = 'Risk note';
  const riskText = document.createElement('p');
  riskText.textContent = item.risk;
  riskBox.appendChild(riskTitle);
  riskBox.appendChild(riskText);

  const noteBox = document.createElement('div');
  noteBox.className = 'note-box';
  const noteTitle = document.createElement('h4');
  noteTitle.textContent = 'Last note';
  const noteText = document.createElement('p');
  noteText.textContent = item.lastNote || 'No decision sent yet.';
  noteBox.appendChild(noteTitle);
  noteBox.appendChild(noteText);

  const actionRow = document.createElement('div');
  actionRow.className = 'action-row';

  const noteInput = document.createElement('textarea');
  noteInput.className = 'input-note';
  noteInput.id = 'decisionNote';
  noteInput.placeholder = 'Add a short decision note for the agent...';

  function createActionButton(action, label, className) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.dataset.action = action;
    button.textContent = label;
    button.addEventListener('click', () => {
      const noteValue = noteInput.value.trim();
      handleDecision(item.id, action, noteValue || undefined);
    });
    return button;
  }

  actionRow.appendChild(createActionButton('land', 'Land it', 'primary-button'));
  actionRow.appendChild(createActionButton('change', 'Send around', 'secondary-button'));
  actionRow.appendChild(createActionButton('snooze', 'Holding pattern', 'ghost-button'));

  detailCard.appendChild(header);
  detailCard.appendChild(metaGrid);
  detailCard.appendChild(riskBox);
  detailCard.appendChild(noteBox);
  detailCard.appendChild(actionRow);
  detailCard.appendChild(noteInput);
}

function renderFocus() {
  if (!state.focusMode) {
    focusPanel.classList.add('hidden');
    return;
  }

  const queue = getWaitingItems();
  if (!queue.length) {
    focusPanel.classList.remove('hidden');
    focusCard.replaceChildren();
    const message = document.createElement('p');
    message.textContent = 'Skies are clear';
    focusCard.appendChild(message);
    return;
  }

  focusPanel.classList.remove('hidden');
  focusCard.replaceChildren();

  const current = queue[state.focusIndex % queue.length] || queue[0];
  state.selectedId = current.id;

  const dataWrap = document.createElement('div');
  dataWrap.className = 'focus-data';

  const textWrap = document.createElement('div');
  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Lowest fuel';

  const focusTitle = document.createElement('h3');
  focusTitle.textContent = current.title;

  const details = document.createElement('div');
  details.className = 'focus-planned';
  details.textContent = `${current.agent} · ${current.repo} · ${formatWait(current.waitMinutes)} waiting`;

  textWrap.appendChild(eyebrow);
  textWrap.appendChild(focusTitle);
  textWrap.appendChild(details);

  const fuelBadge = document.createElement('div');
  fuelBadge.className = `badge ${current.type === 'pr' ? 'pr' : 'draft'}`;
  fuelBadge.textContent = `${current.fuel}% fuel`;

  dataWrap.appendChild(textWrap);
  dataWrap.appendChild(fuelBadge);

  const riskText = document.createElement('p');
  riskText.textContent = current.risk;

  focusCard.appendChild(dataWrap);
  focusCard.appendChild(riskText);
}

function toggleFocusMode() {
  const waiting = getWaitingItems();
  if (!waiting.length) {
    state.focusMode = false;
    focusPanel.classList.remove('hidden');
    renderFocus();
    updateFocusButton();
    return;
  }

  state.focusMode = !state.focusMode;
  if (state.focusMode) {
    state.focusIndex = 0;
    const target = getLowestFuelItem();
    state.selectedId = target.id;
    renderDetail();
    renderPlanes();
  }

  renderFocus();
  updateFocusButton();
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

  if (state.focusMode) {
    const remaining = getWaitingItems();
    if (remaining.length) {
      state.focusIndex = 0;
      state.selectedId = remaining[0].id;
    } else {
      state.focusMode = false;
      state.selectedId = null;
    }
  }

  updateStatusBar();
  updateFocusButton();
  renderPlanes();
  renderDetail();
  renderFocus();
}

focusButton.addEventListener('click', () => {
  if (state.focusMode) {
    state.focusMode = false;
    focusPanel.classList.add('hidden');
    updateFocusButton();
    return;
  }

  toggleFocusMode();
});

nextFocusButton.addEventListener('click', () => {
  const waiting = getWaitingItems();
  if (!waiting.length) {
    state.focusMode = false;
    focusPanel.classList.remove('hidden');
    renderFocus();
    updateFocusButton();
    return;
  }

  state.focusMode = true;
  state.focusIndex = (state.focusIndex + 1) % waiting.length;
  state.selectedId = waiting[state.focusIndex].id;
  renderDetail();
  renderPlanes();
  renderFocus();
  updateFocusButton();
});

function bootstrap() {
  const baseData = getSeedData();
  state.items = baseData.map(createItemFromRecord);
  state.selectedId = state.items[0]?.id || null;
  updateStatusBar();
  updateFocusButton();
  renderPlanes();
  renderDetail();
  renderFocus();
}

bootstrap();