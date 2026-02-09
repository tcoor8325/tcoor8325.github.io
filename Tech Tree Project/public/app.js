const viewport = document.getElementById('viewport');
const workspace = document.getElementById('workspace');
const nodesLayer = document.getElementById('nodes');
const demarcationsLayer = document.getElementById('demarcations');
const svg = document.getElementById('connections');
const statusEl = document.getElementById('status');
const reloadBtn = document.getElementById('reload');
const clearBtn = document.getElementById('clear-connections');
const resetBtn = document.getElementById('reset-positions');
const resnapBtn = document.getElementById('resnap-timeline');
const resnapSupernodeBtn = document.getElementById('resnap-supernode');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const zoomResetBtn = document.getElementById('zoom-reset');
const addGroupBtn = document.getElementById('add-group');
const toggleType = document.getElementById('toggle-type');
const toggleDate = document.getElementById('toggle-date');
const toggleResources = document.getElementById('toggle-resources');
const toggleQual = document.getElementById('toggle-qual');
const toggleLabor = document.getElementById('toggle-labor');
const toggleEmergent = document.getElementById('toggle-emergent');
const toggleTheme = document.getElementById('toggle-theme');
const toggleTimeGrid = document.getElementById('toggle-timegrid');
const toggleConnections = document.getElementById('toggle-connections');
const detailPanel = document.getElementById('details-panel');
const detailTitle = document.getElementById('detail-title');
const detailEffects = document.getElementById('detail-effects');
const groupsLayer = document.getElementById('groups');
const timeScaleSlider = document.getElementById('time-scale');
const timeScaleValue = document.getElementById('time-scale-value');

const CANVAS_OFFSET_Y = 200;
const DISPLAY_PREFS_KEY = 'display-options-v2';
const THEME_PREF_KEY = 'theme-preference';
const DEFAULT_THEME = 'dark';
const BASE_TIME_GRID_INTERVAL = 400;
const TIME_SCALE_KEY = 'time-scale-v1';
const DEFAULT_NODE_WIDTH = 240;
const DEFAULT_NODE_HEIGHT = 140;
const GROUP_PADDING = 40;
const TIMELINE_LABELS = [
  { year: -4000000, label: 'c. 4,000,000 BCE' },
  { year: -3000000, label: 'c. 3,000,000 BCE' },
  { year: -2000000, label: 'c. 2,000,000 BCE' },
  { year: -1500000, label: 'c. 1,500,000 BCE' },
  { year: -1000000, label: 'c. 1,000,000 BCE' },
  { year: -500000, label: 'c. 500,000 BCE' },
  { year: -300000, label: 'c. 300,000 BCE' },
  { year: -200000, label: 'c. 200,000 BCE' },
  { year: -150000, label: 'c. 150,000 BCE' },
  { year: -80000, label: 'c. 80,000 BCE' },
  { year: -40000, label: 'c. 40,000 BCE' },
  { year: -20000, label: 'c. 20,000 BCE' },
  { year: -9000, label: 'c. 9,000 BCE' },
  { year: -8000, label: 'c. 8,000 BCE' },
  { year: -7000, label: 'c. 7,000 BCE' },
  { year: -6000, label: 'c. 6,000 BCE' },
  { year: -5000, label: 'c. 5,000 BCE' },
  { year: -4000, label: 'c. 4,000 BCE' },
  { year: -3000, label: 'c. 3,000 BCE' },
  { year: -2000, label: 'c. 2,000 BCE' },
  { year: -1000, label: 'c. 1,000 BCE' },
  { year: 0, label: '0 CE' },
  { year: 500, label: 'c. 500 CE' },
  { year: 1200, label: 'c. 1,200 CE' },
  { year: 1600, label: 'c. 1,600 CE' },
  { year: 1800, label: 'c. 1,800 CE' },
  { year: 1900, label: 'c. 1,900 CE' },
  { year: 1970, label: 'c. 1,970 CE' },
  { year: 2000, label: 'c. 2,000 CE' },
  { year: 2010, label: 'c. 2,010 CE' },
  { year: 2017, label: 'c. 2,017 CE' },
  { year: 2020, label: 'c. 2,020 CE' },
  { year: 2023, label: 'c. 2,023 CE' },
  { year: 2025, label: '2,025 CE (present)' },
];
const MIN_GROUP_SIZE = 500;
const displayDefaults = {
  type: true,
  date: true,
  resources: true,
  qual: true,
  labor: true,
  emergent: true,
  timeGrid: true,
  connections: true,
};
const DEMARCATION_BANDS = [
  { label: 'Hominid Technologies', start: 0, end: 1620, color: 'rgba(255, 255, 255, 0.18)' },
  {
    label: 'Genus Homo Technologies',
    start: 1620,
    end: 3990,
    color: 'rgba(80, 80, 80, 0.45)',
  },
  {
    label: 'Homo Sapiens (Modern Human) Technologies',
    start: 3990,
    end: 12420,
    color: 'transparent',
  },
];
const AGE_RANGES = {
  'Early Foraging Age': { start: -3300000, end: -200000 },
  'Late Foraging Age': { start: -200000, end: -10000 },
  'Early Farming Age': { start: -10000, end: -4000 },
  'Urban Agrarian Age': { start: -4000, end: -1000 },
  'Imperial Agrarian Age': { start: -1000, end: 500 },
  'Connected Agrarian Age': { start: 500, end: 1500 },
  'Mechanized Production Age': { start: 1500, end: 1800 },
  'Fossil-Industrial Age': { start: 1800, end: 1970 },
  'Information Age': { start: 1970, end: 2025 },
};
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 1.6;
const ZOOM_STEP = 0.1;
const DEFAULT_TIME_SCALE = 1;
const MIN_TIME_SCALE = 0.4;
const MAX_TIME_SCALE = 3;
let timeScale = DEFAULT_TIME_SCALE;
const OFFSCREEN_LABEL_DISTANCE = 240; // px along the line from the visible node
const OFFSCREEN_LABEL_PERP_OFFSET = 12; // px perpendicular nudge away from the line
let currentZoom = 1;

let nodes = [];
let connections = [];
let nodeElements = new Map();
let positions = {};
let positionsLoaded = false;
let readingData = {};
let dragging = null;
let linking = null;
let tempLine = null;
let renderQueued = false;
let selectedNode = null; // primary selection for details panel
let selectedNodes = new Set();
let selectionBox = null;
let selectionStart = null;
let groupBoxes = [];
let groupDrag = null;
let groupResize = null;
let displayOptions = loadDisplayOptions();
timeScale = loadTimeScale();
applyThemePreference(loadThemePreference());
const connectionElements = new Map();
const CONNECTION_FADE_MS = 1050;

function loadLocalPositions() {
  try {
    return JSON.parse(localStorage.getItem('tree-node-positions') || '{}');
  } catch (err) {
    console.warn('Could not load saved positions', err);
    return {};
  }
}

function persistLocalPositions() {
  localStorage.setItem('tree-node-positions', JSON.stringify(positions));
}

async function loadPositions() {
  try {
    const res = await fetch('/api/positions');
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Positions request failed');
    }
    positions = data.positions || {};
    persistLocalPositions();
    positionsLoaded = true;
  } catch (err) {
    console.warn('Falling back to local positions store', err);
    positions = loadLocalPositions();
    positionsLoaded = true;
  }
}

async function savePosition(name, pos) {
  positions[name] = pos;
  persistLocalPositions();
  try {
    await fetch('/api/positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, x: pos.x, y: pos.y }),
    });
  } catch (err) {
    console.warn('Could not persist position to server', err);
  }
}

async function saveAllPositions(newPositions) {
  positions = newPositions;
  persistLocalPositions();
  try {
    await fetch('/api/positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positions: newPositions }),
    });
  } catch (err) {
    console.warn('Could not persist bulk positions to server', err);
  }
}

async function loadReading() {
  try {
    const res = await fetch('/api/citations');
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Failed to load citations');
    }
    readingData = data.citations || data.reading || {};
  } catch (err) {
    console.warn('Could not load CITATIONS.md', err);
    readingData = {};
  }
}

async function loadSupernodes(showStatus = false, opts = {}) {
  const { refreshNodes = false } = opts || {};
  const previousBoxes = groupBoxes.map((b) => ({ ...b }));
  try {
    if (showStatus) setStatus('Loading supernodes…');
    const res = await fetch('/api/supernodes');
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Failed to load supernodes');
    }
    groupBoxes = (data.supernodes || []).map((entry) => ({
      id: entry.name,
      name: entry.name,
      title: entry.title || entry.name,
      x: entry.box?.x ?? 40,
      y: entry.box?.y ?? 40,
      width: entry.box?.width ?? MIN_GROUP_SIZE,
      height: entry.box?.height ?? MIN_GROUP_SIZE,
      color: entry.box?.color || randomGroupColor(),
      nodes: entry.nodes || [],
    }));
    const movedNodes = await reflowNodesIntoMovedBoxes(previousBoxes);
    renderGroupBoxes();
    if (refreshNodes && movedNodes && nodeElements && nodeElements.size > 0) {
      rebuildConnections();
      renderNodes();
    }
  } catch (err) {
    console.warn('Could not load supernodes', err);
    setStatus('Failed to load supernodes', true);
  }
}

async function updateNodeSupernode(name, supernode) {
  try {
    await fetch('/api/node/supernode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, supernode }),
    });
    const node = nodes.find((n) => n.name === name);
    if (node) {
      node.supernode = supernode || null;
    }
    await loadSupernodes(false, { refreshNodes: true });
  } catch (err) {
    console.warn('Could not update node supernode', err);
    setStatus('Failed to update node category', true);
  }
}

async function saveGroupBox(box) {
  if (!box) return;
  try {
    await fetch('/api/supernodes/box', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: box.name || box.id || box.title,
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      }),
    });
  } catch (err) {
    console.warn('Could not persist group box', err);
  }
}

async function createSupernode(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return;
  setStatus(`Creating supernode "${trimmed}"…`);
  try {
    await fetch('/api/supernodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    });
    await loadTree();
  } catch (err) {
    console.warn('Could not create supernode', err);
    setStatus('Failed to create supernode', true);
  }
}

async function deleteSupernode(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return;
  setStatus(`Deleting supernode "${trimmed}"…`);
  try {
    await fetch('/api/supernodes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    });
    await loadTree();
  } catch (err) {
    console.warn('Could not delete supernode', err);
    setStatus('Failed to delete supernode', true);
  }
}

function loadDisplayOptions() {
  try {
    const stored = JSON.parse(localStorage.getItem(DISPLAY_PREFS_KEY) || '{}');
    return { ...displayDefaults, ...stored };
  } catch (err) {
    console.warn('Could not load display preferences', err);
    return { ...displayDefaults };
  }
}

function persistDisplayOptions(opts) {
  localStorage.setItem(DISPLAY_PREFS_KEY, JSON.stringify(opts));
}

function loadThemePreference() {
  try {
    const stored = localStorage.getItem(THEME_PREF_KEY);
    return stored === 'light' ? 'light' : DEFAULT_THEME;
  } catch (err) {
    console.warn('Could not load theme preference', err);
    return DEFAULT_THEME;
  }
}

function persistThemePreference(theme) {
  try {
    localStorage.setItem(THEME_PREF_KEY, theme);
  } catch (err) {
    console.warn('Could not save theme preference', err);
  }
}

function applyThemePreference(mode) {
  const theme = mode === 'light' ? 'light' : 'dark';
  document.body.classList.toggle('light-mode', theme === 'light');
  if (toggleTheme) {
    toggleTheme.checked = theme === 'light';
  }
  persistThemePreference(theme);
}

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function loadTimeScale() {
  try {
    const stored = parseFloat(localStorage.getItem(TIME_SCALE_KEY));
    if (Number.isFinite(stored) && stored > 0) {
      return clamp(stored, MIN_TIME_SCALE, MAX_TIME_SCALE);
    }
  } catch (err) {
    console.warn('Could not load time scale', err);
  }
  return DEFAULT_TIME_SCALE;
}

function persistTimeScale(scale) {
  try {
    localStorage.setItem(TIME_SCALE_KEY, scale.toString());
  } catch (err) {
    console.warn('Could not save time scale', err);
  }
}

function getTimeGridInterval() {
  return BASE_TIME_GRID_INTERVAL * timeScale;
}

function getTimelineStart() {
  const earliestBandStart = Math.min(
    ...DEMARCATION_BANDS.map((band) => (typeof band.start === 'number' ? band.start : 0))
  );
  return Math.max(CANVAS_OFFSET_Y, earliestBandStart + 20);
}

function getTimelineAnchors() {
  const start = getTimelineStart();
  const interval = getTimeGridInterval();
  return TIMELINE_LABELS.map((entry, idx) => ({
    year: entry.year,
    y: start + idx * interval,
  }));
}

function getAgeRangeForSupernode(name) {
  if (!name || typeof name !== 'string') return null;
  const age = name.split(' - ')[0]?.trim();
  if (!age) return null;
  return AGE_RANGES[age] || null;
}

function parseYearValue(dateText) {
  if (!dateText) return null;
  const normalized = dateText
    .replace(/^#\s*approximate date\s*/i, '')
    .replace(/^#\s*/, '')
    .replace(/[,]/g, '')
    .replace(/\u2013|\u2014/g, '-')
    .toLowerCase()
    .trim();
  if (!normalized) return null;
  if (normalized.includes('present')) return 2025;
  const era = normalized.includes('bce') || normalized.includes('bc') ? 'bce' : normalized.includes('ce') || normalized.includes('ad') ? 'ce' : null;
  const matches = normalized.match(/-?\d+(?:\.\d+)?/g);
  if (!matches || !matches.length) return null;
  const nums = matches.map((m) => parseFloat(m)).filter(Number.isFinite);
  const magnitudes = nums.map((n) => Math.abs(n));
  if (!nums.length) return null;
  const base = magnitudes.length >= 2 ? (magnitudes[0] + magnitudes[1]) / 2 : magnitudes[0];
  if (era === 'bce') return -base;
  return base;
}

function yearToY(year) {
  const anchors = getTimelineAnchors();
  if (!anchors.length || !Number.isFinite(year)) return CANVAS_OFFSET_Y;
  if (anchors.length === 1) return anchors[0].y;
  if (year <= anchors[0].year) {
    const a = anchors[0];
    const b = anchors[1];
    const t = (year - a.year) / (b.year - a.year || 1);
    return a.y + t * (b.y - a.y);
  }
  for (let i = 0; i < anchors.length - 1; i += 1) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (year >= a.year && year <= b.year) {
      const t = (year - a.year) / (b.year - a.year || 1);
      return a.y + t * (b.y - a.y);
    }
  }
  const a = anchors[anchors.length - 2];
  const b = anchors[anchors.length - 1];
  const t = (year - b.year) / (b.year - a.year || 1);
  return b.y + t * (b.y - a.y);
}

function isEmergent(node) {
  return (node?.category || '').toLowerCase() === 'emergent';
}

function shouldHideNode(node) {
  return isEmergent(node) && !displayOptions.emergent;
}

function isNodeHidden(name) {
  const node = nodes.find((n) => n.name === name);
  if (!node) return true;
  if (shouldHideNode(node)) return true;
  const el = nodeElements.get(name);
  return el ? el.style.display === 'none' : false;
}

function getSubtitle(node) {
  if (isEmergent(node)) return 'Emergent Property';
  const lines = node.block || [];
  const subtitleLine = lines.find(
    (line, idx) =>
      idx > 0 &&
      /^#\s*/.test(line) &&
      !/^#\s*supernode/i.test(line) &&
      !/^#\s*approximate date/i.test(line) &&
      !/^#\s*qualitative effects/i.test(line) &&
      !/^#\s*resources/i.test(line) &&
      !/^#\s*labor type/i.test(line) &&
      !/^#\s*built upon/i.test(line) &&
      !/^#\s*led to/i.test(line)
  );
  return subtitleLine ? subtitleLine.replace(/^#\s*/, '') : '';
}

function normalizeEdgeType(type) {
  const val = (type || '').toString().trim().toLowerCase();
  return val.startsWith('influ') ? 'Influence' : 'Obligate';
}

function normalizeConnectionEntry(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') {
    return { name: entry, type: 'Obligate' };
  }
  if (typeof entry === 'object') {
    const name = entry.name || entry.to || entry.target || entry.id;
    if (!name) return null;
    return { name, type: normalizeEdgeType(entry.type) };
  }
  return null;
}

function normalizeNodes(rawNodes) {
  return (rawNodes || []).map((node) => ({
    ...node,
    supernode: node.supernode || null,
    category: (node.category || 'technology').toLowerCase(),
    leadsTo: (node.leadsTo || []).map(normalizeConnectionEntry).filter(Boolean),
    builtUpon: (node.builtUpon || []).map(normalizeConnectionEntry).filter(Boolean),
  }));
}

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.style.color = isError ? 'var(--danger)' : 'var(--muted)';
}

function getTreeLoadErrorMessage() {
  if (window.location.protocol === 'file:' || window.location.pathname.includes('/public/')) {
    return 'Tech Tree requires the Node server. Run `node server.js` in Tech Tree Project and open http://localhost:3000';
  }
  return 'Failed to load TREE.md';
}

function getPointerPosition(evt) {
  const rect = viewport.getBoundingClientRect();
  return {
    x: (evt.clientX - rect.left + viewport.scrollLeft) / currentZoom,
    y: (evt.clientY - rect.top + viewport.scrollTop) / currentZoom,
  };
}

function extractLine(block, prefix) {
  const lower = prefix.toLowerCase();
  return block.find((line) => line.toLowerCase().startsWith(lower)) || '';
}

function extractQualitative(block) {
  const line = extractLine(block, '# qualitative effects');
  return line ? line.replace(/^#\s*qualitative effects:\s*/i, '').trim() : '';
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getReadingEntry(name) {
  return readingData[name] || { influencedBy: [], influencing: [] };
}

function renderReadingHtml(name) {
  const entry = getReadingEntry(name);
  const upstream = entry.influencedBy || [];
  const downstream = entry.influencing || [];
  const upstreamItems =
    upstream.length > 0
      ? upstream
          .map((item) => {
            const type = item.type ? ` [${escapeHtml(item.type)}]` : '';
            return `<li>${escapeHtml(item.target)}${type}: ${escapeHtml(item.text || '')}</li>`;
          })
          .join('')
      : '<li>None documented.</li>';
  const downstreamItems =
    downstream.length > 0
      ? downstream
          .map((item) => {
            const type = item.type ? ` [${escapeHtml(item.type)}]` : '';
            return `<li>${escapeHtml(item.target)}${type}: ${escapeHtml(item.text || '')}</li>`;
          })
          .join('')
      : '<li>None documented.</li>';
  return `
    <div class="reading-section">
      <div class="reading-heading">Connection Notes</div>
      <div class="reading-subheading">Influenced by (upstream)</div>
      <ul>${upstreamItems}</ul>
      <div class="reading-subheading">Influencing (downstream)</div>
      <ul>${downstreamItems}</ul>
    </div>
  `;
}
function extractResources(block) {
  return block
    .filter((line) => /^#\s*resources/i.test(line))
    .map((line) => line.replace(/^#\s*/, '').trim());
}

function extractLabor(block) {
  return block
    .filter((line) => /^#\s*labor type/i.test(line))
    .map((line) => line.replace(/^#\s*/, '').trim());
}

function defaultPositions(count, startX = 40, startY = 40, spacingX = 520, spacingY = 340) {
  const cols = Math.max(8, Math.ceil(Math.sqrt(count)));
  const coords = [];
  for (let i = 0; i < count; i += 1) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    coords.push({
      x: startX + col * spacingX,
      y: startY + row * spacingY,
    });
  }
  return coords;
}

function applyPositions(incomingNodes) {
  const hasSavedPositions = Object.keys(positions || {}).length > 0;
  const emergentCount = incomingNodes.filter((n) => isEmergent(n)).length;
  const nonEmergentCount = incomingNodes.length - emergentCount;
  const anchorCandidates = incomingNodes
    .filter((n) => !isEmergent(n))
    .map((n) => positions[n.name])
    .filter(Boolean);
  const anchorX =
    anchorCandidates.length > 0
      ? Math.min(...anchorCandidates.map((p) => p.x || 0))
      : 200;
  const anchorY =
    anchorCandidates.length > 0
      ? Math.min(...anchorCandidates.map((p) => p.y || 0))
      : 200;
  const emergentDefaults = defaultPositions(emergentCount, 40, 40);
  const nonEmergentDefaults = defaultPositions(
    nonEmergentCount,
    40,
    hasSavedPositions ? 40 : 640
  );
  let emergentIdx = 0;
  let nonEmergentIdx = 0;
  const previous = new Map(nodes.map((n) => [n.name, n]));
  nodes = incomingNodes.map((node) => {
    const saved = positions[node.name];
    const prev = previous.get(node.name);
    let fallback;
    if (saved) {
      fallback = saved;
    } else if (prev) {
      fallback = { x: prev.x, y: prev.y };
    } else if (isEmergent(node)) {
      fallback = emergentDefaults[emergentIdx] || { x: 40, y: 40 + emergentIdx * 80 };
      emergentIdx += 1;
    } else {
      fallback =
        nonEmergentDefaults[nonEmergentIdx] || { x: 40, y: 640 + nonEmergentIdx * 80 };
      nonEmergentIdx += 1;
    }
    const chosen = saved || fallback || { x: 50, y: 50 };
    return { ...node, x: chosen.x, y: chosen.y };
  });
}

function extractApproximateYear(node) {
  if (!node || !node.block) return null;
  const line = node.block.find((entry) => entry.toLowerCase().startsWith('# approximate date'));
  if (!line) return null;
  return parseYearValue(line);
}

async function resizeSupernodesToTimeline(opts = {}) {
  const { save = true, renderAfter = true } = opts;
  if (!groupBoxes || !groupBoxes.length) return;
  const tasks = [];
  let changed = false;
  groupBoxes.forEach((box) => {
    const range = getAgeRangeForSupernode(box.name || box.id);
    if (!range) return;
    const topY = yearToY(range.start) - CANVAS_OFFSET_Y;
    const bottomY = yearToY(range.end) - CANVAS_OFFSET_Y;
    const newY = Math.min(topY, bottomY);
    const newHeight = Math.max(MIN_GROUP_SIZE, Math.abs(bottomY - topY));
    if (Math.abs((box.y || 0) - newY) > 0.5 || Math.abs((box.height || 0) - newHeight) > 0.5) {
      box.y = newY;
      box.height = newHeight;
      changed = true;
      if (save) {
        tasks.push(saveGroupBox(box));
      }
    }
  });
  if (tasks.length) {
    try {
      await Promise.all(tasks);
    } catch (err) {
      console.warn('Could not save resized supernodes', err);
    }
  }
  if (renderAfter && changed) {
    renderGroupBoxes();
    requestRender();
  }
}

async function resnapNodesToTimeline(opts = {}) {
  const { save = true } = opts;
  const nextPositions = { ...positions };
  let changed = false;
  nodes = nodes.map((node) => {
    const year = extractApproximateYear(node);
    if (!Number.isFinite(year)) return node;
    const existing = nextPositions[node.name] || { x: node.x || 0, y: node.y || 0 };
    const targetY = yearToY(year) - CANVAS_OFFSET_Y;
    if (!Number.isFinite(targetY)) return node;
    let clampedY = targetY;
    const box = groupBoxes.find((b) => (b.name || b.id) === node.supernode);
    if (box) {
      const padding = 20;
      const maxY = box.y + box.height - DEFAULT_NODE_HEIGHT - padding;
      const minY = box.y + padding;
      clampedY = clamp(targetY, minY, maxY);
    }
    const updated = { x: existing.x, y: clampedY };
    const prev = nextPositions[node.name];
    if (!prev || Math.abs(prev.y - clampedY) > 0.5) {
      changed = true;
    }
    nextPositions[node.name] = updated;
    return { ...node, x: updated.x, y: updated.y };
  });
  positions = nextPositions;
  if (save && changed) {
    await saveAllPositions(nextPositions);
  }
  renderNodes();
}

function findSupernodeBoxForNode(node) {
  if (!node) return null;
  const key = (node.supernode || '').trim().toLowerCase();
  if (!key) return null;
  return groupBoxes.find((box) => groupBoxKey(box) === key) || null;
}

function isNodeInsideSupernodeBox(node, box) {
  if (!node || !box) return false;
  const bbox = boundingBoxForNodes([node.name]);
  if (!bbox) return false;
  return isBoundingInsideBox(bbox, box, 0);
}

async function resnapNodesToSupernodeX(opts = {}) {
  const { save = true } = opts;
  const nextPositions = { ...positions };
  let changed = false;
  nodes = nodes.map((node) => {
    const box = findSupernodeBoxForNode(node);
    if (!box) return node;
    if (isNodeInsideSupernodeBox(node, box)) {
      return node;
    }
    const size = getNodeSize(node.name);
    const width = size.width || DEFAULT_NODE_WIDTH;
    const targetX = box.x + box.width / 2 - width / 2;
    if (!Number.isFinite(targetX)) return node;
    const existing = nextPositions[node.name] || { x: node.x || 0, y: node.y || 0 };
    const updated = { x: targetX, y: existing.y };
    const prev = nextPositions[node.name];
    if (!prev || Math.abs(prev.x - targetX) > 0.5) {
      changed = true;
    }
    nextPositions[node.name] = updated;
    return { ...node, x: updated.x, y: updated.y };
  });
  positions = nextPositions;
  if (save && changed) {
    await saveAllPositions(nextPositions);
  }
  renderNodes();
  return changed;
}

async function resnapTimelinePositions() {
  try {
    if (!nodes || nodes.length === 0) {
      setStatus('Load TREE.md before resnapping', true);
      return;
    }
    if (!positionsLoaded) {
      await loadPositions();
    }
    if (!groupBoxes || groupBoxes.length === 0) {
      await loadSupernodes();
    }
    setStatus('Resnapping nodes and supernodes to the timeline…');
    await resizeSupernodesToTimeline({ save: true, renderAfter: true });
    await resnapNodesToTimeline({ save: true });
    setStatus('Nodes and supernodes snapped to their approximate dates');
  } catch (err) {
    console.error(err);
    setStatus(err.message || 'Failed to resnap to timeline', true);
  }
}

async function resnapSupernodePositions() {
  try {
    if (!nodes || nodes.length === 0) {
      setStatus('Load TREE.md before snapping to supernodes', true);
      return;
    }
    if (!positionsLoaded) {
      await loadPositions();
    }
    if (!groupBoxes || groupBoxes.length === 0) {
      await loadSupernodes();
    }
    setStatus('Snapping nodes to their supernode centers…');
    const moved = await resnapNodesToSupernodeX({ save: true });
    setStatus(moved ? 'Nodes snapped to supernode centers' : 'No nodes snapped to supernode centers');
  } catch (err) {
    console.error(err);
    setStatus(err.message || 'Failed to snap to supernodes', true);
  }
}

async function setTimeScale(next, opts = {}) {
  const { resnap = true, saveBoxes = true } = opts;
  const parsed = Number.isFinite(next) ? next : DEFAULT_TIME_SCALE;
  const normalized = clamp(parsed, MIN_TIME_SCALE, MAX_TIME_SCALE);
  timeScale = normalized;
  if (timeScaleSlider) {
    timeScaleSlider.value = normalized;
  }
  if (timeScaleValue) {
    timeScaleValue.textContent = `${normalized.toFixed(2)}x`;
  }
  persistTimeScale(normalized);
  renderDemarcations();
  if (resnap) {
    await resizeSupernodesToTimeline({ save: saveBoxes, renderAfter: true });
    await resnapNodesToTimeline().catch((err) => console.warn('Resnap failed', err));
  } else {
    await resizeSupernodesToTimeline({ save: saveBoxes, renderAfter: true });
    requestRender();
  }
}

function rebuildConnections() {
  const names = new Set(nodes.map((n) => n.name));
  const seen = new Set();
  connections = [];
  nodes.forEach((node) => {
    (node.leadsTo || []).forEach((edge) => {
      const target = edge && edge.name ? edge.name : edge;
      if (!target || !names.has(target)) return;
      const key = `${node.name}-->${target}`;
      if (seen.has(key)) return;
      const type = edge && edge.type ? normalizeEdgeType(edge.type) : 'Obligate';
      connections.push({ from: node.name, to: target, type });
      seen.add(key);
    });
  });
  nodes.forEach((node) => {
    (node.builtUpon || []).forEach((edge) => {
      const source = edge && edge.name ? edge.name : edge;
      if (!source || !names.has(source)) return;
      const key = `${source}-->${node.name}`;
      if (seen.has(key)) return;
      const type = edge && edge.type ? normalizeEdgeType(edge.type) : 'Obligate';
      connections.push({ from: source, to: node.name, type });
      seen.add(key);
    });
  });
}

function ensureWorkspaceSize() {
  const padding = 320;
  const minWidth = 2400;
  const minHeight = 12000;
  const maxX = nodes.reduce((acc, n) => Math.max(acc, (n.x || 0) + 240), minWidth);
  const maxY = nodes.reduce(
    (acc, n) => Math.max(acc, (n.y || 0) + CANVAS_OFFSET_Y + 160),
    minHeight
  );
  const width = maxX + padding;
  const height = maxY + padding;
  nodesLayer.style.width = `${width}px`;
  nodesLayer.style.height = `${height}px`;
  if (demarcationsLayer) {
    demarcationsLayer.style.width = `${width}px`;
    demarcationsLayer.style.height = `${height}px`;
  }
  if (groupsLayer) {
    groupsLayer.style.width = `${width}px`;
    groupsLayer.style.height = `${height}px`;
  }
  if (workspace) {
    workspace.style.width = `${width}px`;
    workspace.style.height = `${height}px`;
  }
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
}

function renderDemarcations() {
  if (!demarcationsLayer) return;
  demarcationsLayer.innerHTML = '';
  DEMARCATION_BANDS.forEach((band, idx) => {
    const el = document.createElement('div');
    el.className = 'band';
    el.style.top = `${band.start}px`;
    el.style.height = `${band.end - band.start}px`;
    el.style.background = band.color;
    demarcationsLayer.appendChild(el);
    const label = document.createElement('div');
    label.className = 'demarcation-label';
    label.textContent = band.label;
    label.style.top = `${band.start + 8}px`;
    demarcationsLayer.appendChild(label);
    if (idx > 0) {
      const line = document.createElement('div');
      line.className = 'demarcation-line';
      line.style.top = `${band.start}px`;
      demarcationsLayer.appendChild(line);
    }
  });
  renderTimeGrid();
}

function formatYearLabel(year) {
  const rounded = Math.round(year);
  const absVal = Math.abs(rounded);
  const pretty = absVal >= 1000 ? absVal.toLocaleString('en-US') : absVal.toString();
  if (rounded < 0) return `c. ${pretty} BCE`;
  if (rounded === 0) return '0';
  return `${pretty} CE`;
}

function renderTimeGrid() {
  if (!demarcationsLayer || !displayOptions.timeGrid) return;
  const workspaceHeight = parseFloat(nodesLayer?.style.height || '0') || 0;
  const start = getTimelineStart();
  const interval = getTimeGridInterval();
  TIMELINE_LABELS.forEach((entry, idx) => {
    const y = start + idx * interval;
    if (y > workspaceHeight) return;
    const line = document.createElement('div');
    line.className = 'time-line';
    line.style.top = `${y}px`;
    demarcationsLayer.appendChild(line);
    const label = document.createElement('div');
    label.className = 'time-label';
    label.textContent = entry.label;
    label.style.top = `${y - 10}px`;
    demarcationsLayer.appendChild(label);
  });
}

function randomGroupColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 60%)`;
}

function renderGroupBoxes() {
  if (!groupsLayer) return;
  groupsLayer.innerHTML = '';
  groupBoxes.forEach((box) => {
    const el = document.createElement('div');
    el.className = 'group-box';
    el.dataset.groupId = box.id || box.name;
    el.style.left = `${box.x}px`;
    el.style.top = `${box.y}px`;
    el.style.width = `${box.width}px`;
    el.style.height = `${box.height}px`;
    el.style.borderColor = box.color;

    const header = document.createElement('div');
    header.className = 'group-header';
    header.style.borderColor = box.color;
    header.addEventListener('mousedown', (evt) => startGroupDrag(evt, box.id));

    const title = document.createElement('span');
    title.className = 'group-title';
    title.textContent = box.title || 'Group';
    header.appendChild(title);

    const del = document.createElement('button');
    del.className = 'group-delete';
    del.textContent = '×';
    del.addEventListener('click', (evt) => {
      evt.stopPropagation();
      deleteGroupBox(box.id || box.name);
    });
    header.appendChild(del);

    el.appendChild(header);
    const handle = document.createElement('div');
    handle.className = 'group-resize';
    handle.addEventListener('mousedown', (evt) => startGroupResize(evt, box.id));
    el.appendChild(handle);
    groupsLayer.appendChild(el);
  });
}

function createHandle(position, nodeName) {
  const wrap = document.createElement('div');
  wrap.className = `handles ${position === 'incoming' ? 'top' : 'bottom'}`;
  const handle = document.createElement('div');
  handle.className = `handle ${position}`;
  handle.title =
    position === 'incoming'
      ? 'Drag to add an upstream prerequisite'
      : 'Drag to add a downstream connection';
  handle.addEventListener('mousedown', (evt) => startLinkDrag(evt, nodeName, position));
  handle.addEventListener('dblclick', (evt) => {
    evt.stopPropagation();
    deleteConnectionsForHandle(nodeName, position);
  });
  wrap.appendChild(handle);
  return wrap;
}

function addNodeElement(node) {
  const el = document.createElement('div');
  el.className = 'node';
  el.dataset.node = node.name;
  el.dataset.category = node.category || 'technology';
  if (isEmergent(node)) {
    el.classList.add('emergent');
  }
  el.style.transform = `translate(${node.x}px, ${node.y + CANVAS_OFFSET_Y}px)`;

  const title = document.createElement('div');
  title.className = 'title';
  title.textContent = node.name;

  const subtitleText = getSubtitle(node);
  const subtitle =
    subtitleText !== ''
      ? (() => {
          const sub = document.createElement('div');
          sub.className = 'subtitle';
          sub.textContent = subtitleText;
          return sub;
        })()
      : null;

  const dateLine =
    node.block.find((line) => line.toLowerCase().startsWith('# approximate date')) || '';
  const dateText = dateLine.replace(/^#\s*/, '');
  const date =
    dateText !== ''
      ? (() => {
          const d = document.createElement('div');
          d.className = 'date';
          d.textContent = dateText;
          return d;
        })()
      : null;

  const resources = extractResources(node.block);
  const resourcesEl =
    resources.length > 0 ? document.createElement('div') : null;
  if (resourcesEl) {
    resourcesEl.className = 'resources';
    resourcesEl.textContent = resources.join(' • ');
  }

  const labor = extractLabor(node.block);
  const laborEl = labor.length > 0 ? document.createElement('div') : null;
  if (laborEl) {
    laborEl.className = 'labor';
    laborEl.textContent = labor.join(' • ');
  }

  el.appendChild(createHandle('incoming', node.name));
  el.appendChild(createHandle('outgoing', node.name));
  el.appendChild(title);
  if (subtitle) {
    el.appendChild(subtitle);
  }
  if (date) {
    el.appendChild(date);
  }
  if (resourcesEl) {
    el.appendChild(resourcesEl);
  }
  if (laborEl) {
    el.appendChild(laborEl);
  }

  el.addEventListener('mousedown', (evt) => startNodeDrag(evt, node.name));
  el.addEventListener('click', (evt) => {
    if (evt.target.classList.contains('handle')) return;
    const mode = evt.metaKey || evt.ctrlKey ? 'toggle' : evt.shiftKey ? 'append' : 'replace';
    selectNode(node.name, mode);
  });
  nodesLayer.appendChild(el);
  nodeElements.set(node.name, el);
  applyVisibilityToNode(el, node);
}

function renderNodes() {
  nodeElements = new Map();
  nodesLayer.innerHTML = '';
  nodes.forEach((node) => addNodeElement(node));
  ensureWorkspaceSize();
  renderGroupBoxes();
  applyVisibilityToAllNodes();
  renderConnections();
  renderDemarcations();
  updateSelectionStyles();
  renderDetailsPanel();
}

function findContainingSupernode(nodeName) {
  const node = nodes.find((n) => n.name === nodeName);
  const el = nodeElements.get(nodeName);
  if (!node || !el) return null;
  const width = (el.offsetWidth || 200) / currentZoom;
  const height = (el.offsetHeight || 120) / currentZoom;
  const centerX = node.x + width / 2;
  const centerY = node.y + CANVAS_OFFSET_Y + height / 2;
  const box = groupBoxes.find(
    (b) =>
      typeof b.x === 'number' &&
      typeof b.y === 'number' &&
      typeof b.width === 'number' &&
      typeof b.height === 'number' &&
      centerX >= b.x &&
      centerX <= b.x + b.width &&
      centerY >= b.y &&
      centerY <= b.y + b.height
  );
  return box ? box.name || box.id || null : null;
}

function getNodeSize(name) {
  const el = nodeElements.get(name);
  return {
    width: el ? (el.offsetWidth || 0) / currentZoom : 0,
    height: el ? (el.offsetHeight || 0) / currentZoom : 0,
  };
}

function nodesInsideBox(box) {
  const inside = [];
  nodes.forEach((node) => {
    const { width, height } = getNodeSize(node.name);
    const cx = node.x + width / 2;
    const cy = node.y + CANVAS_OFFSET_Y + height / 2;
    if (
      cx >= box.x &&
      cx <= box.x + box.width &&
      cy >= box.y &&
      cy <= box.y + box.height
    ) {
      inside.push(node.name);
    }
  });
  return inside;
}

function groupBoxKey(box) {
  if (!box) return null;
  return (box.name || box.id || '').trim().toLowerCase() || null;
}

function nodeNamesForSupernodeKey(key) {
  if (!key) return [];
  return nodes
    .filter((n) => (n.supernode || '').trim().toLowerCase() === key)
    .map((n) => n.name);
}

function estimateNodeSizeForBounds(name) {
  const size = getNodeSize(name);
  return {
    width: size.width || DEFAULT_NODE_WIDTH,
    height: size.height || DEFAULT_NODE_HEIGHT,
  };
}

function boundingBoxForNodes(names) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  names.forEach((name) => {
    const node = nodes.find((n) => n.name === name);
    if (!node) return;
    const { width, height } = estimateNodeSizeForBounds(name);
    const x0 = node.x;
    const y0 = node.y + CANVAS_OFFSET_Y;
    const x1 = x0 + width;
    const y1 = y0 + height;
    minX = Math.min(minX, x0);
    minY = Math.min(minY, y0);
    maxX = Math.max(maxX, x1);
    maxY = Math.max(maxY, y1);
  });
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }
  return { minX, minY, maxX, maxY };
}

function isBoundingInsideBox(bbox, box, padding = 0) {
  if (!bbox || !box) return false;
  return (
    bbox.minX >= box.x + padding &&
    bbox.maxX <= box.x + box.width - padding &&
    bbox.minY >= box.y + padding &&
    bbox.maxY <= box.y + box.height - padding
  );
}

function shiftBoundingIntoBox(bbox, box, padding = GROUP_PADDING) {
  if (!bbox || !box) return null;
  const width = bbox.maxX - bbox.minX;
  const height = bbox.maxY - bbox.minY;
  const targetMinX = box.x + padding + Math.max(0, (box.width - width - padding * 2) / 2);
  const targetMinY = box.y + padding + Math.max(0, (box.height - height - padding * 2) / 2);
  return { dx: targetMinX - bbox.minX, dy: targetMinY - bbox.minY };
}

function translateNodes(names, dx, dy, nextPositions) {
  if (!names || !names.length) return false;
  let moved = false;
  names.forEach((name) => {
    const node = nodes.find((n) => n.name === name);
    if (!node) return;
    const nextX = Math.max(10, node.x + dx);
    const minY = -CANVAS_OFFSET_Y + 10;
    const nextY = Math.max(minY, node.y + dy);
    if (nextX === node.x && nextY === node.y) return;
    node.x = nextX;
    node.y = nextY;
    if (nextPositions) nextPositions[name] = { x: nextX, y: nextY };
    moved = true;
  });
  return moved;
}

async function reflowNodesIntoMovedBoxes(previousBoxes = []) {
  if (!groupBoxes || !groupBoxes.length) return false;
  const prevMap = new Map();
  previousBoxes.forEach((box) => {
    const key = groupBoxKey(box);
    if (key) prevMap.set(key, box);
  });

  let moved = false;
  const nextPositions = { ...positions };
  groupBoxes.forEach((box) => {
    const key = groupBoxKey(box);
    if (!key) return;
    const names = nodeNamesForSupernodeKey(key);
    if (!names.length) return;
    const prev = prevMap.get(key);
    const boxChanged =
      !prev ||
      Math.abs(prev.x - box.x) > 0.5 ||
      Math.abs(prev.y - box.y) > 0.5 ||
      Math.abs(prev.width - box.width) > 0.5 ||
      Math.abs(prev.height - box.height) > 0.5;
    if (!boxChanged) return;

    const bbox = boundingBoxForNodes(names);
    if (!bbox || isBoundingInsideBox(bbox, box, 20)) return;

    if (prev && isBoundingInsideBox(bbox, prev, 20)) {
      const dx = box.x - prev.x;
      const dy = box.y - prev.y;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        if (translateNodes(names, dx, dy, nextPositions)) moved = true;
        return;
      }
    }

    const shift = shiftBoundingIntoBox(bbox, box);
    if (shift && translateNodes(names, shift.dx, shift.dy, nextPositions)) {
      moved = true;
    }
  });

  if (moved) {
    positions = nextPositions;
    await saveAllPositions(nextPositions);
  }
  return moved;
}

function getAnchorPosition(nodeName, side) {
  if (isNodeHidden(nodeName)) return null;
  const el = nodeElements.get(nodeName);
  if (!el) return null;
  const handle = el.querySelector(side === 'top' ? '.handle.incoming' : '.handle.outgoing');
  if (!handle) return null;
  const rect = handle.getBoundingClientRect();
  const viewportRect = viewport.getBoundingClientRect();
  const x =
    (rect.left - viewportRect.left + viewport.scrollLeft + rect.width / 2) / currentZoom;
  const y =
    (rect.top - viewportRect.top + viewport.scrollTop + rect.height / 2) / currentZoom;
  return { x, y };
}

function getViewportRect() {
  if (!viewport) return null;
  const rect = viewport.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    right: rect.left + viewport.clientWidth,
    bottom: rect.top + viewport.clientHeight,
  };
}

function isNodeOnScreen(name, viewportRect, padding = 0) {
  if (!viewportRect) return true;
  if (isNodeHidden(name)) return false;
  const el = nodeElements.get(name);
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  return !(
    rect.right < viewportRect.left - padding ||
    rect.left > viewportRect.right + padding ||
    rect.bottom < viewportRect.top - padding ||
    rect.top > viewportRect.bottom + padding
  );
}

function getConnectionKey(from, to) {
  return `${from}-->${to}`;
}

function ensureConnectionElements(key) {
  const existing = connectionElements.get(key);
  if (existing) return existing;
  const hit = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  hit.classList.add('connection-hit', 'connection-hidden');
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.classList.add('connection', 'connection-hidden');
  const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  label.classList.add('connection-label', 'connection-hidden');
  svg.appendChild(hit);
  svg.appendChild(line);
  svg.appendChild(label);
  const entry = { hit, line, label, hideTimeout: null };
  connectionElements.set(key, entry);
  return entry;
}

function setConnectionVisibility(entry, visible) {
  if (!entry) return;
  ['hit', 'line'].forEach((k) => {
    const el = entry[k];
    if (!el) return;
    if (visible) {
      el.classList.remove('connection-hidden');
    } else {
      el.classList.add('connection-hidden');
    }
  });
  if (visible && entry.hideTimeout) {
    clearTimeout(entry.hideTimeout);
    entry.hideTimeout = null;
  }
}

function setLabelVisibility(entry, visible) {
  if (!entry || !entry.label) return;
  if (visible) {
    entry.label.classList.remove('connection-hidden');
  } else {
    entry.label.classList.add('connection-hidden');
  }
}

function scheduleConnectionRemoval(key, entry) {
  if (!entry) return;
  setConnectionVisibility(entry, false);
  setLabelVisibility(entry, false);
  if (entry.hideTimeout) return;
  entry.hideTimeout = setTimeout(() => {
    entry.hit?.remove();
    entry.line?.remove();
    entry.label?.remove();
    connectionElements.delete(key);
  }, CONNECTION_FADE_MS + 80);
}

function renderConnections() {
  const viewportRect = getViewportRect();
  const seen = new Set();
  const onScreenCache = new Map();
  const isOnScreen = (name) => {
    if (onScreenCache.has(name)) return onScreenCache.get(name);
    const visible = isNodeOnScreen(name, viewportRect, 0);
    onScreenCache.set(name, visible);
    return visible;
  };
  connections.forEach((conn) => {
    const key = getConnectionKey(conn.from, conn.to);
    const entry = ensureConnectionElements(key);
    seen.add(key);
    if (entry.hideTimeout) {
      clearTimeout(entry.hideTimeout);
      entry.hideTimeout = null;
    }
    const fromVisible = isOnScreen(conn.from);
    const toVisible = isOnScreen(conn.to);
    const fromSelected = selectedNodes.has(conn.from);
    const toSelected = selectedNodes.has(conn.to);
    if (isNodeHidden(conn.from) || isNodeHidden(conn.to)) {
      scheduleConnectionRemoval(key, entry);
      return;
    }
    if (!fromVisible && !toVisible && !fromSelected && !toSelected) {
      setConnectionVisibility(entry, false);
      setLabelVisibility(entry, false);
      return;
    }
    const start = getAnchorPosition(conn.from, 'bottom');
    const end = getAnchorPosition(conn.to, 'top');
    if (!start || !end) {
      setConnectionVisibility(entry, false);
      setLabelVisibility(entry, false);
      return;
    }
    const normalizedType = normalizeEdgeType(conn.type);
    entry.hit.dataset.from = conn.from;
    entry.hit.dataset.to = conn.to;
    entry.hit.setAttribute('x1', start.x);
    entry.hit.setAttribute('y1', start.y);
    entry.hit.setAttribute('x2', end.x);
    entry.hit.setAttribute('y2', end.y);

    entry.line.dataset.from = conn.from;
    entry.line.dataset.to = conn.to;
    entry.line.dataset.type = normalizedType;
    entry.line.setAttribute('x1', start.x);
    entry.line.setAttribute('y1', start.y);
    entry.line.setAttribute('x2', end.x);
    entry.line.setAttribute('y2', end.y);
    entry.line.classList.toggle('obligate', normalizedType === 'Obligate');
    entry.line.classList.toggle('influence', normalizedType === 'Influence');
    entry.line.classList.toggle(
      'adjacent',
      selectedNodes.has(conn.from) || selectedNodes.has(conn.to)
    );

    setConnectionVisibility(entry, true);

    if (fromVisible !== toVisible) {
      const hiddenName = fromVisible ? conn.to : conn.from;
      const anchorVisible = fromVisible ? start : end;
      const anchorHidden = fromVisible ? end : start;
      if (anchorVisible && anchorHidden && hiddenName) {
        const dx = anchorHidden.x - anchorVisible.x;
        const dy = anchorHidden.y - anchorVisible.y;
        let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
        if (angleDeg > 90) angleDeg -= 180;
        else if (angleDeg < -90) angleDeg += 180;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const dirX = dx / len;
        const dirY = dy / len;
        const labelX = anchorVisible.x + dirX * OFFSCREEN_LABEL_DISTANCE + nx * OFFSCREEN_LABEL_PERP_OFFSET;
        const labelY = anchorVisible.y + dirY * OFFSCREEN_LABEL_DISTANCE + ny * OFFSCREEN_LABEL_PERP_OFFSET;
        entry.label.setAttribute('x', labelX);
        entry.label.setAttribute('y', labelY);
        entry.label.setAttribute('text-anchor', 'middle');
        entry.label.setAttribute('dominant-baseline', 'middle');
        entry.label.setAttribute('transform', `rotate(${angleDeg} ${labelX} ${labelY})`);
        entry.label.textContent = hiddenName;
        setLabelVisibility(entry, true);
      }
    } else {
      setLabelVisibility(entry, false);
    }
  });
  connectionElements.forEach((entry, key) => {
    if (!seen.has(key)) {
      scheduleConnectionRemoval(key, entry);
    }
  });
  if (tempLine && tempLine.parentNode !== svg) {
    svg.appendChild(tempLine);
  }
}

async function deleteConnectionsForHandle(nodeName, position) {
  const toRemove =
    position === 'incoming'
      ? connections.filter((c) => c.to === nodeName)
      : connections.filter((c) => c.from === nodeName);
  if (!toRemove.length) return;
  setStatus(`Removing ${toRemove.length} connection(s)…`);
  for (const conn of toRemove) {
    // eslint-disable-next-line no-await-in-loop
    await saveConnection(conn.from, conn.to, 'remove');
  }
}

function applyVisibilityToNode(el, node) {
  if (!el || !node) return;
  const hideNode = shouldHideNode(node);
  el.style.display = hideNode ? 'none' : '';
  const subtitle = el.querySelector('.subtitle');
  const date = el.querySelector('.date');
  const resources = el.querySelector('.resources');
  const labor = el.querySelector('.labor');
  if (subtitle) subtitle.style.display = displayOptions.type ? '' : 'none';
  if (date) date.style.display = displayOptions.date ? '' : 'none';
  if (resources) resources.style.display = displayOptions.resources ? '' : 'none';
  if (labor) labor.style.display = displayOptions.labor ? '' : 'none';
}

function applyVisibilityToAllNodes() {
  nodes.forEach((node) => {
    const el = nodeElements.get(node.name);
    applyVisibilityToNode(el, node);
  });
}

function pruneHiddenSelection() {
  const visible = new Set();
  selectedNodes.forEach((name) => {
    if (!isNodeHidden(name)) visible.add(name);
  });
  selectedNodes = visible;
  selectedNode = selectedNodes.size ? Array.from(selectedNodes)[0] : null;
}

function getNeighborSet(names) {
  const neighbors = new Set();
  if (!names || !names.size) return neighbors;
  connections.forEach((conn) => {
    if (names.has(conn.from)) neighbors.add(conn.to);
    if (names.has(conn.to)) neighbors.add(conn.from);
  });
  return neighbors;
}

function updateSelectionStyles() {
  pruneHiddenSelection();
  const neighbors = getNeighborSet(selectedNodes);
  nodeElements.forEach((el, name) => {
    const isSelected = selectedNodes.has(name);
    const isNeighbor = neighbors.has(name);
    el.classList.toggle('selected', isSelected);
    el.classList.toggle('neighbor', !isSelected && isNeighbor);
  });
}

function renderDetailsPanel() {
  if (!detailPanel) return;
  if (!displayOptions.qual) {
    detailPanel.classList.add('hidden');
    return;
  }
  if (!selectedNode) {
    detailTitle.textContent = 'Select a node';
    detailEffects.innerHTML = '<div>Click any node to see its qualitative effects.</div>';
    detailPanel.classList.add('hidden');
    return;
  }
  const node = nodes.find((n) => n.name === selectedNode);
  if (!node) {
    detailPanel.classList.add('hidden');
    return;
  }
  const qual = extractQualitative(node.block) || 'No qualitative effects recorded.';
  detailTitle.textContent = node.name;
  const readingHtml = renderReadingHtml(node.name);
  detailEffects.innerHTML = `<div class="qual-text">${escapeHtml(qual)}</div>${readingHtml}`;
  detailPanel.classList.remove('hidden');
}

function setSelection(names) {
  selectedNodes = new Set(names);
  selectedNode = names && names.length ? names[0] : null;
  updateSelectionStyles();
  renderDetailsPanel();
  requestRender();
}

function startGroupDrag(evt, id) {
  evt.preventDefault();
  evt.stopPropagation();
  const box = groupBoxes.find((b) => b.id === id);
  if (!box) return;
  const pointer = getPointerPosition(evt);
  const inside = nodesInsideBox(box);
  const nodeStarts = {};
  inside.forEach((name) => {
    const node = nodes.find((n) => n.name === name);
    if (node) {
      nodeStarts[name] = { x: node.x, y: node.y };
    }
  });
  groupDrag = {
    id,
    offsetX: pointer.x - box.x,
    offsetY: pointer.y - box.y,
    startX: box.x,
    startY: box.y,
    nodeStarts,
  };
  window.addEventListener('mousemove', onGroupDrag);
  window.addEventListener('mouseup', endGroupDrag);
}

function onGroupDrag(evt) {
  if (!groupDrag) return;
  const box = groupBoxes.find((b) => b.id === groupDrag.id);
  const el = groupsLayer?.querySelector(`[data-group-id="${groupDrag.id}"]`);
  if (!box || !el) return;
  const pointer = getPointerPosition(evt);
  const deltaX = pointer.x - groupDrag.offsetX - groupDrag.startX + groupDrag.offsetX;
  const deltaY = pointer.y - groupDrag.offsetY - groupDrag.startY + groupDrag.offsetY;
  box.x = Math.max(0, groupDrag.startX + deltaX);
  box.y = Math.max(0, groupDrag.startY + deltaY);
  el.style.left = `${box.x}px`;
  el.style.top = `${box.y}px`;
  Object.keys(groupDrag.nodeStarts || {}).forEach((name) => {
    const start = groupDrag.nodeStarts[name];
    const node = nodes.find((n) => n.name === name);
    const nodeEl = nodeElements.get(name);
    if (!start || !node || !nodeEl) return;
    node.x = Math.max(10, start.x + deltaX);
    node.y = Math.max(10, start.y + deltaY);
    nodeEl.style.transform = `translate(${node.x}px, ${node.y + CANVAS_OFFSET_Y}px)`;
  });
  ensureWorkspaceSize();
  requestRender();
}

function endGroupDrag() {
  window.removeEventListener('mousemove', onGroupDrag);
  window.removeEventListener('mouseup', endGroupDrag);
  if (groupDrag) {
    const box = groupBoxes.find((b) => b.id === groupDrag.id);
    saveGroupBox(box);
    Object.keys(groupDrag.nodeStarts || {}).forEach((name) => {
      const node = nodes.find((n) => n.name === name);
      if (node) {
        savePosition(name, { x: node.x, y: node.y });
      }
    });
  }
  groupDrag = null;
}

async function deleteGroupBox(id) {
  const box = groupBoxes.find((b) => b.id === id);
  if (!box) return;
  const confirmed = window.confirm(
    `Delete supernode "${box.title || box.name}"? This removes the category from TREE/SUPERNODES.`
  );
  if (!confirmed) return;
  await deleteSupernode(box.name || box.id);
}

function startGroupResize(evt, id) {
  evt.preventDefault();
  evt.stopPropagation();
  const box = groupBoxes.find((b) => b.id === id);
  if (!box) return;
  const pointer = getPointerPosition(evt);
  const inside = nodesInsideBox(box);
  const nodeStarts = inside
    .map((name) => {
      const node = nodes.find((n) => n.name === name);
      if (!node) return null;
      return {
        name,
        startX: node.x,
        startY: node.y,
        relX: node.x - box.x,
        relY: node.y - box.y,
      };
    })
    .filter(Boolean);
  groupResize = {
    id,
    startX: pointer.x,
    startY: pointer.y,
    startWidth: box.width,
    startHeight: box.height,
    nodeStarts,
  };
  window.addEventListener('mousemove', onGroupResize);
  window.addEventListener('mouseup', endGroupResize);
}

function onGroupResize(evt) {
  if (!groupResize) return;
  const box = groupBoxes.find((b) => b.id === groupResize.id);
  const el = groupsLayer?.querySelector(`[data-group-id=\"${groupResize.id}\"]`);
  if (!box || !el) return;
  const pointer = getPointerPosition(evt);
  const deltaX = pointer.x - groupResize.startX;
  const deltaY = pointer.y - groupResize.startY;
  const newWidth = Math.max(MIN_GROUP_SIZE, groupResize.startWidth + deltaX);
  const newHeight = Math.max(MIN_GROUP_SIZE, groupResize.startHeight + deltaY);
  const scaleX = newWidth / Math.max(1, groupResize.startWidth);
  const scaleY = newHeight / Math.max(1, groupResize.startHeight);
  box.width = newWidth;
  box.height = newHeight;
  el.style.width = `${box.width}px`;
  el.style.height = `${box.height}px`;
  (groupResize.nodeStarts || []).forEach((entry) => {
    const node = nodes.find((n) => n.name === entry.name);
    const nodeEl = nodeElements.get(entry.name);
    if (!node || !nodeEl) return;
    node.x = box.x + entry.relX * scaleX;
    node.y = box.y + entry.relY * scaleY;
    nodeEl.style.transform = `translate(${node.x}px, ${node.y + CANVAS_OFFSET_Y}px)`;
  });
  ensureWorkspaceSize();
  requestRender();
}

function endGroupResize() {
  window.removeEventListener('mousemove', onGroupResize);
  window.removeEventListener('mouseup', endGroupResize);
  if (groupResize) {
    const box = groupBoxes.find((b) => b.id === groupResize.id);
    saveGroupBox(box);
    (groupResize.nodeStarts || []).forEach((entry) => {
      const node = nodes.find((n) => n.name === entry.name);
      if (node) {
        savePosition(entry.name, { x: node.x, y: node.y });
      }
    });
  }
  groupResize = null;
}

function toggleSelection(name) {
  if (selectedNodes.has(name)) {
    selectedNodes.delete(name);
  } else {
    selectedNodes.add(name);
  }
  selectedNode = selectedNodes.size ? Array.from(selectedNodes)[0] : null;
  updateSelectionStyles();
  renderDetailsPanel();
  requestRender();
}

function selectNode(name, mode = 'replace') {
  if (mode === 'toggle') {
    toggleSelection(name);
    return;
  }
  if (mode === 'append') {
    const next = new Set(selectedNodes);
    next.add(name);
    setSelection(Array.from(next));
    return;
  }
  setSelection([name]);
}

function clearSelection() {
  setSelection([]);
}

function startSelectionBox(evt) {
  if (evt.button !== 0) return;
  if (
    evt.target.closest('.node') ||
    evt.target.closest('.handle') ||
    evt.target.closest('.group-header') ||
    evt.target.closest('.group-delete') ||
    evt.target.closest('.group-resize')
  )
    return;
  selectionStart = getPointerPosition(evt);
  selectionBox = document.createElement('div');
  selectionBox.className = 'selection-box';
  selectionBox.style.left = `${selectionStart.x}px`;
  selectionBox.style.top = `${selectionStart.y}px`;
  selectionBox.style.width = '0px';
  selectionBox.style.height = '0px';
  if (workspace) {
    workspace.appendChild(selectionBox);
  }
  window.addEventListener('mousemove', onSelectionDrag);
  window.addEventListener('mouseup', endSelectionDrag);
}

function onSelectionDrag(evt) {
  if (!selectionStart || !selectionBox) return;
  const pos = getPointerPosition(evt);
  const left = Math.min(selectionStart.x, pos.x);
  const top = Math.min(selectionStart.y, pos.y);
  const width = Math.abs(pos.x - selectionStart.x);
  const height = Math.abs(pos.y - selectionStart.y);
  selectionBox.style.left = `${left}px`;
  selectionBox.style.top = `${top}px`;
  selectionBox.style.width = `${width}px`;
  selectionBox.style.height = `${height}px`;
}

function endSelectionDrag() {
  window.removeEventListener('mousemove', onSelectionDrag);
  window.removeEventListener('mouseup', endSelectionDrag);
  if (!selectionStart || !selectionBox) {
    selectionStart = null;
    if (selectionBox) selectionBox.remove();
    selectionBox = null;
    return;
  }
  const left = parseFloat(selectionBox.style.left) || 0;
  const top = parseFloat(selectionBox.style.top) || 0;
  const width = parseFloat(selectionBox.style.width) || 0;
  const height = parseFloat(selectionBox.style.height) || 0;
  const right = left + width;
  const bottom = top + height;
  const selected = [];
  nodes.forEach((node) => {
    const el = nodeElements.get(node.name);
    if (!el) return;
    const x0 = node.x;
    const y0 = node.y + CANVAS_OFFSET_Y;
    const x1 = x0 + el.offsetWidth;
    const y1 = y0 + el.offsetHeight;
    const overlaps = !(x1 < left || x0 > right || y1 < top || y0 > bottom);
    if (overlaps) {
      selected.push(node.name);
    }
  });
  selectionBox.remove();
  selectionBox = null;
  selectionStart = null;
  setSelection(selected);
}

function syncToggleInputs() {
  if (toggleType) toggleType.checked = displayOptions.type;
  if (toggleDate) toggleDate.checked = displayOptions.date;
  if (toggleResources) toggleResources.checked = displayOptions.resources;
  if (toggleQual) toggleQual.checked = displayOptions.qual;
  if (toggleLabor) toggleLabor.checked = displayOptions.labor;
  if (toggleEmergent) toggleEmergent.checked = displayOptions.emergent;
  if (toggleTimeGrid) toggleTimeGrid.checked = displayOptions.timeGrid;
  if (toggleConnections) toggleConnections.checked = displayOptions.connections;
  applyConnectionVisibility();
}

function updateDisplayOption(key, value) {
  displayOptions = { ...displayOptions, [key]: value };
  persistDisplayOptions(displayOptions);
  if (key === 'emergent') {
    if (!value && selectedNodes.size) {
      const remaining = Array.from(selectedNodes).filter((name) => {
        const node = nodes.find((n) => n.name === name);
        return node && !isEmergent(node);
      });
      setSelection(remaining);
    }
    renderNodes();
    return;
  }
  if (key === 'timeGrid') {
    renderDemarcations();
    return;
  }
  if (key === 'connections') {
    applyConnectionVisibility();
    return;
  }
  applyVisibilityToAllNodes();
}

function applyConnectionVisibility() {
  const show = displayOptions.connections !== false;
  workspace.classList.toggle('connections-hidden', !show);
}

function requestRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    renderConnections();
  });
}

function getViewportFocus() {
  if (!viewport) return { x: 0, y: 0 };
  return {
    x: (viewport.scrollLeft + viewport.clientWidth / 2) / currentZoom,
    y: (viewport.scrollTop + viewport.clientHeight / 2) / currentZoom,
  };
}

function applyZoom(newZoom, focus) {
  const prevZoom = currentZoom;
  currentZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
  const focalPoint = focus || getViewportFocus();
  if (workspace) {
    workspace.style.transform = `scale(${currentZoom})`;
    workspace.style.setProperty('--group-scale', (1 / currentZoom).toFixed(3));
    workspace.style.setProperty('--label-scale', (1 / currentZoom).toFixed(3));
    workspace.classList.add('scaled');
  }
  ensureWorkspaceSize();
  if (viewport && workspace) {
    const scaledWidth = workspace.offsetWidth * currentZoom;
    const scaledHeight = workspace.offsetHeight * currentZoom;
    const desiredLeft = focalPoint.x * currentZoom - viewport.clientWidth / 2;
    const desiredTop = focalPoint.y * currentZoom - viewport.clientHeight / 2;
    viewport.scrollLeft = Math.max(
      0,
      Math.min(desiredLeft, Math.max(0, scaledWidth - viewport.clientWidth))
    );
    viewport.scrollTop = Math.max(
      0,
      Math.min(desiredTop, Math.max(0, scaledHeight - viewport.clientHeight))
    );
  }
  renderConnections();
}

function handleWheelZoom(evt) {
  if (!(evt.ctrlKey || evt.metaKey)) return;
  evt.preventDefault();
  const delta = evt.deltaY;
  const factor = delta > 0 ? -ZOOM_STEP : ZOOM_STEP;
  applyZoom(currentZoom + factor, getViewportFocus());
}

function startNodeDrag(evt, nodeName) {
  if (evt.button !== 0) return;
  if (evt.target.classList.contains('handle')) return;
  if (!selectedNodes.has(nodeName)) {
    setSelection([nodeName]);
  }
  const el = nodeElements.get(nodeName);
  if (!el) return;
  const pointer = getPointerPosition(evt);
  const initialPositions = {};
  selectedNodes.forEach((name) => {
    const node = nodes.find((n) => n.name === name);
    if (node) {
      initialPositions[name] = { x: node.x, y: node.y };
    }
  });
  dragging = { nodeName, startPointer: pointer, initialPositions };
  window.addEventListener('mousemove', onNodeDrag);
  window.addEventListener('mouseup', endNodeDrag);
}

function onNodeDrag(evt) {
  if (!dragging) return;
  const pointer = getPointerPosition(evt);
  const deltaX = pointer.x - dragging.startPointer.x;
  const deltaY = pointer.y - dragging.startPointer.y;
  const targets = selectedNodes.size ? Array.from(selectedNodes) : [dragging.nodeName];
  targets.forEach((name) => {
    const node = nodes.find((n) => n.name === name);
    const el = nodeElements.get(name);
    const startPos = dragging.initialPositions[name] || node;
    if (!node || !el || !startPos) return;
    node.x = Math.max(10, startPos.x + deltaX);
    node.y = Math.max(10, startPos.y + deltaY);
    el.style.transform = `translate(${node.x}px, ${node.y + CANVAS_OFFSET_Y}px)`;
  });
  ensureWorkspaceSize();
  requestRender();
}

async function endNodeDrag() {
  if (dragging) {
    const targets = selectedNodes.size ? Array.from(selectedNodes) : [dragging.nodeName];
    const updates = [];
    targets.forEach((name) => {
      const node = nodes.find((n) => n.name === name);
      if (node) {
        savePosition(node.name, { x: node.x, y: node.y });
        const containing = findContainingSupernode(name);
        const current = node.supernode || null;
        if (current !== (containing || null)) {
          updates.push(updateNodeSupernode(name, containing));
        }
      }
    });
    if (updates.length) {
      await Promise.all(updates);
    }
  }
  dragging = null;
  window.removeEventListener('mousemove', onNodeDrag);
  window.removeEventListener('mouseup', endNodeDrag);
}

function chooseConnectionType() {
  const value = window.prompt('Connection type? Enter "Obligate" or "Influence".', 'Obligate');
  if (value === null) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith('i')) return 'Influence';
  if (normalized.startsWith('o')) return 'Obligate';
  return 'Obligate';
}

function startLinkDrag(evt, nodeName, direction) {
  evt.stopPropagation();
  if (evt.button !== 0) return;
  const start = getPointerPosition(evt);
  linking = { nodeName, direction };
  tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  tempLine.classList.add('temp');
  tempLine.setAttribute('x1', start.x);
  tempLine.setAttribute('y1', start.y);
  tempLine.setAttribute('x2', start.x);
  tempLine.setAttribute('y2', start.y);
  renderConnections();
  window.addEventListener('mousemove', onLinkDrag);
  window.addEventListener('mouseup', endLinkDrag);
}

function onLinkDrag(evt) {
  if (!linking || !tempLine) return;
  const pos = getPointerPosition(evt);
  tempLine.setAttribute('x2', pos.x);
  tempLine.setAttribute('y2', pos.y);
}

function endLinkDrag(evt) {
  window.removeEventListener('mousemove', onLinkDrag);
  window.removeEventListener('mouseup', endLinkDrag);
  const localTemp = tempLine;
  tempLine = null;
  const linkState = linking;
  linking = null;
  if (localTemp) {
    localTemp.remove();
  }
  const targetEl = document.elementFromPoint(evt.clientX, evt.clientY);
  const nodeEl = targetEl ? targetEl.closest('.node') : null;
  const targetName = nodeEl ? nodeEl.dataset.node : null;
  if (!linkState || !targetName) {
    renderConnections();
    return;
  }
  if (targetName === linkState.nodeName) {
    setStatus('Cannot connect a node to itself', true);
    renderConnections();
    return;
  }
  const from =
    linkState.direction === 'outgoing' ? linkState.nodeName : targetName;
  const to = linkState.direction === 'outgoing' ? targetName : linkState.nodeName;
  const type = chooseConnectionType();
  if (!type) {
    renderConnections();
    return;
  }
  saveConnection(from, to, 'add', type);
}

async function saveConnection(from, to, action, type) {
  try {
    const prefix =
      action === 'add'
        ? `Saving ${from} → ${to}${type ? ` (${type})` : ''}…`
        : `Removing ${from} → ${to}…`;
    setStatus(prefix);
    const res = await fetch('/api/connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, action, type }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Request failed');
    }
    const normalized = normalizeNodes(data.nodes);
    applyPositions(normalized);
    await loadReading();
    rebuildConnections();
    renderNodes();
    if (action === 'add') {
      setStatus(`Connected ${from} → ${to} (${type || 'Obligate'})`);
    } else {
      setStatus(`Removed ${from} → ${to}`);
    }
  } catch (err) {
    console.error(err);
    setStatus(err.message || 'Could not update connection', true);
  }
}

svg.addEventListener('click', (evt) => {
  if (evt.detail > 1) return;
  const line = evt.target.closest('line.connection, line.connection-hit');
  if (!line) return;
  const from = line.dataset.from;
  const to = line.dataset.to;
  const confirmed = window.confirm(`Delete connection ${from} → ${to}?`);
  if (!confirmed) return;
  saveConnection(from, to, 'remove');
});

svg.addEventListener('dblclick', (evt) => {
  const line = evt.target.closest('line.connection, line.connection-hit');
  if (!line) return;
  const from = line.dataset.from;
  const to = line.dataset.to;
  saveConnection(from, to, 'remove');
});

reloadBtn.addEventListener('click', () => {
  loadTree(true);
});

resetBtn.addEventListener('click', () => {
  const confirmed = window.confirm(
    'Reset all node positions to the default grid? This overwrites saved positions.'
  );
  if (!confirmed) return;
  resetPositions();
});

if (resnapBtn) {
  resnapBtn.addEventListener('click', async () => {
    await resnapTimelinePositions();
  });
}

if (resnapSupernodeBtn) {
  resnapSupernodeBtn.addEventListener('click', async () => {
    await resnapSupernodePositions();
  });
}

clearBtn.addEventListener('click', async () => {
  const confirmed = window.confirm('Delete all connections in TREE.md? This cannot be undone.');
  if (!confirmed) return;
  try {
    if (!positionsLoaded) {
      await loadPositions();
    }
    setStatus('Deleting all connections…');
    const res = await fetch('/api/connections/clear', { method: 'POST' });
    const raw = await res.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch (err) {
      throw new Error(`Unexpected response: ${raw || res.status}`);
    }
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Request failed');
    }
    const normalized = normalizeNodes(data.nodes);
    applyPositions(normalized);
    rebuildConnections();
    renderNodes();
    setStatus('All connections removed');
  } catch (err) {
    console.error(err);
    setStatus(err.message || 'Failed to delete connections', true);
  }
});

if (toggleType) {
  toggleType.addEventListener('change', () => updateDisplayOption('type', toggleType.checked));
}

if (toggleDate) {
  toggleDate.addEventListener('change', () => updateDisplayOption('date', toggleDate.checked));
}

if (toggleResources) {
  toggleResources.addEventListener('change', () =>
    updateDisplayOption('resources', toggleResources.checked)
  );
}

if (toggleQual) {
  toggleQual.addEventListener('change', () => {
    const next = toggleQual.checked;
    updateDisplayOption('qual', next);
    if (!next) {
      clearSelection();
    }
  });
}

if (toggleLabor) {
  toggleLabor.addEventListener('change', () => {
    updateDisplayOption('labor', toggleLabor.checked);
  });
}

if (toggleEmergent) {
  toggleEmergent.addEventListener('change', () => {
    updateDisplayOption('emergent', toggleEmergent.checked);
  });
}

if (toggleTimeGrid) {
  toggleTimeGrid.addEventListener('change', () => {
    updateDisplayOption('timeGrid', toggleTimeGrid.checked);
  });
}

if (toggleConnections) {
  toggleConnections.addEventListener('change', () => {
    updateDisplayOption('connections', toggleConnections.checked);
  });
}

if (toggleTheme) {
  toggleTheme.addEventListener('change', () => {
    applyThemePreference(toggleTheme.checked ? 'light' : 'dark');
  });
}

if (timeScaleSlider) {
  timeScaleSlider.value = timeScale;
  if (timeScaleValue) {
    timeScaleValue.textContent = `${timeScale.toFixed(2)}x`;
  }
  timeScaleSlider.addEventListener('input', async (evt) => {
    const next = parseFloat(evt.target.value);
    await setTimeScale(next);
  });
}

if (addGroupBtn) {
  addGroupBtn.addEventListener('click', () => {
    const title = window.prompt('New supernode category?', 'New Supernode');
    if (!title) return;
    createSupernode(title);
  });
}

if (zoomInBtn) {
  zoomInBtn.addEventListener('click', () => {
    applyZoom(currentZoom + ZOOM_STEP, getViewportFocus());
  });
}

if (zoomOutBtn) {
  zoomOutBtn.addEventListener('click', () => {
    applyZoom(currentZoom - ZOOM_STEP, getViewportFocus());
  });
}

if (zoomResetBtn) {
  zoomResetBtn.addEventListener('click', () => {
    applyZoom(1, getViewportFocus());
  });
}

if (viewport) {
  viewport.addEventListener('wheel', handleWheelZoom, { passive: false });
  viewport.addEventListener('mousedown', (evt) => {
    startSelectionBox(evt);
  });
  viewport.addEventListener('scroll', () => {
    requestRender();
  });
}

window.addEventListener('resize', () => {
  ensureWorkspaceSize();
  requestRender();
});

async function loadTree(showStatus = false) {
  try {
    if (showStatus) setStatus('Reloading TREE.md…');
    await loadPositions();
    const res = await fetch('/api/tree');
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Failed to load tree');
    }
    const normalized = normalizeNodes(data.nodes);
    applyPositions(normalized);
    await loadReading();
    await loadSupernodes();
    rebuildConnections();
    renderNodes();
    applyZoom(currentZoom);
    setStatus('Loaded TREE.md');
  } catch (err) {
    console.error(err);
    setStatus(getTreeLoadErrorMessage(), true);
  }
}

async function resetPositions() {
  try {
    if (!positionsLoaded) {
      await loadPositions();
    }
    setStatus('Resetting node positions…');
    const defaults = defaultPositions(nodes.length);
    const updated = {};
    nodes = nodes.map((node, idx) => {
      const pos = defaults[idx];
      updated[node.name] = pos;
      return { ...node, x: pos.x, y: pos.y };
    });
    await saveAllPositions(updated);
    rebuildConnections();
    renderNodes();
    setStatus('Node positions reset');
  } catch (err) {
    console.error(err);
    setStatus(err.message || 'Failed to reset positions', true);
  }
}

syncToggleInputs();
setTimeScale(timeScale, { resnap: false, saveBoxes: false });
loadTree(true);
