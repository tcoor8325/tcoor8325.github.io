const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const TREE_PATH = path.join(ROOT, 'TREE.md');
const MINITREE_PATH = path.join(ROOT, 'MINITREE.md');
const SUPERNODES_PATH = path.join(ROOT, 'SUPERNODES.md');
const EMERGENT_PATH = path.join(ROOT, 'EMERGENT.md');
const CITATIONS_PATH = path.join(ROOT, 'CITATIONS.md');
const PUBLIC_DIR = path.join(ROOT, 'public');
const POSITIONS_PATH = path.join(ROOT, 'positions.json');
const GROUPBOXES_PATH = path.join(ROOT, 'groupboxes.json');
const DEFAULT_SUPERNODE = 'Uncategorized';
const LOG_PATH = path.join(ROOT, 'server.log');
const logStream = fs.createWriteStream(LOG_PATH, { flags: 'a' });
const DEFAULT_CITATION_LINE = '- None documented — Justification: …; Sources: …';

function logLine(level, message) {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level}] ${message}`;
  try {
    logStream.write(`${line}\n`);
  } catch (err) {
    // swallow logging errors
  }
  // eslint-disable-next-line no-console
  console.log(line);
}

function logInfo(message) {
  logLine('INFO', message);
}

function logError(message, err) {
  const detail = err && err.stack ? ` ${err.stack}` : err ? ` ${err}` : '';
  logLine('ERROR', `${message}${detail}`);
}

const CONTENT_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
};

function sendJson(res, status, payload) {
  if (status >= 400) {
    logError(`HTTP ${status} ${payload && payload.error ? payload.error : ''}`);
  }
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function normalizeType(raw) {
  const val = (raw || '').toString().trim().toLowerCase();
  if (val === 'influence' || val === 'influences') return 'Influence';
  return 'Obligate';
}

function parseConnections(line, fallbackType = 'Obligate') {
  if (!line) return [];
  const [, rest = ''] = line.split(':');
  return rest
    .split(/[,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const match = item.match(/\((obligate|influence)\)\s*$/i);
      const type = match ? normalizeType(match[1]) : normalizeType(fallbackType);
      const name = match ? item.slice(0, match.index).trim() : item;
      if (!name) return null;
      return { name, type };
    })
    .filter(Boolean);
}

function formatConnections(items) {
  return items.map((conn) => `${conn.name} (${normalizeType(conn.type)})`).join('; ');
}

function matchesLabel(line, label) {
  return line.toLowerCase().startsWith(`# ${label.toLowerCase()}`);
}

function setConnectionLine(block, label, items) {
  const header = `# ${label}:`;
  const idx = block.findIndex((line) => matchesLabel(line, label));
  if (!items.length) {
    if (idx !== -1) block.splice(idx, 1);
    return;
  }
  const line = `${header} ${formatConnections(items)}`;
  if (idx === -1) {
    block.push(line);
  } else {
    block[idx] = line;
  }
}

function splitBlocks(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let current = [];
  for (const line of lines) {
    if (line.trim() === '') {
      if (current.length) {
        blocks.push(current);
        current = [];
      }
      continue;
    }
    current.push(line);
  }
  if (current.length) {
    blocks.push(current);
  }

  let headerBlock = null;
  if (
    blocks.length &&
    blocks[0].length === 1 &&
    /^#\s*.+\.md/i.test(blocks[0][0])
  ) {
    [headerBlock] = blocks.splice(0, 1);
  }
  return { headerBlock, blocks };
}

function parseDocument({
  filePath,
  leadsLabel,
  builtLabel,
  category,
  defaultEdgeType = 'Obligate',
}) {
  const text = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const { headerBlock, blocks } = splitBlocks(text);
  const nodes = blocks.map((block) => {
    const name = block[0].replace(/^#\s*/, '').trim();
    const builtLine = block.find((line) => matchesLabel(line, builtLabel));
    const leadsLine = block.find((line) => matchesLabel(line, leadsLabel));
    const supernodeLine =
      block.find((line) => /^#\s*supernode\s*:/i.test(line)) || '';
    const supernode = supernodeLine.replace(/^#\s*supernode\s*:/i, '').trim() || null;
    return {
      name,
      builtUpon: parseConnections(builtLine, defaultEdgeType),
      leadsTo: parseConnections(leadsLine, defaultEdgeType),
      block,
      category,
      // supernode is optional; nodes may remain uncategorized
      supernode,
    };
  });
  return { headerBlock, nodes, filePath, leadsLabel, builtLabel, category, defaultEdgeType };
}

function serializeDocument(headerBlock, nodes) {
  const parts = [];
  if (headerBlock) {
    parts.push(headerBlock.join('\n'));
  }
  nodes.forEach((node) => parts.push(node.block.join('\n')));
  return `${parts.join('\n\n')}\n`;
}

function writeDocument(doc) {
  const content = serializeDocument(doc.headerBlock, doc.nodes);
  fs.writeFileSync(doc.filePath, content, 'utf8');
}

function setSupernodeLine(block, supernode) {
  const idx = block.findIndex((line) => /^#\s*supernode\s*:/i.test(line));
  if (!supernode) {
    if (idx !== -1) {
      block.splice(idx, 1);
    }
    return;
  }
  const line = `# Supernode: ${supernode}`;
  if (idx === -1) {
    // insert right after the name if possible
    block.splice(1, 0, line);
  } else {
    block[idx] = line;
  }
}

function parseAllDocuments() {
  return [
    parseDocument({
      filePath: TREE_PATH,
      leadsLabel: 'Led To',
      builtLabel: 'Built Upon',
      category: 'technology',
      defaultEdgeType: 'Obligate',
    }),
    parseDocument({
      filePath: EMERGENT_PATH,
      leadsLabel: 'Influencing',
      builtLabel: 'Influenced by',
      category: 'emergent',
      defaultEdgeType: 'Influence',
    }),
  ];
}

function flattenNodes(docs) {
  return docs.flatMap((doc) => doc.nodes);
}

function collectConnections(nodes) {
  const upstream = new Map(); // node -> map(targetLower -> {name,type})
  const downstream = new Map();
  const addEntry = (map, from, target, type) => {
    if (!map.has(from)) map.set(from, new Map());
    const bucket = map.get(from);
    const key = target.trim().toLowerCase();
    if (!bucket.has(key)) {
      bucket.set(key, { name: target, type: normalizeType(type || 'Obligate') });
    }
  };
  nodes.forEach((node) => {
    upstream.set(node.name, new Map());
    downstream.set(node.name, new Map());
  });
  nodes.forEach((node) => {
    (node.builtUpon || []).forEach((entry) => {
      const target = entry.name || entry;
      if (!target) return;
      addEntry(upstream, node.name, target, entry.type);
      addEntry(downstream, target, node.name, entry.type);
    });
    (node.leadsTo || []).forEach((entry) => {
      const target = entry.name || entry;
      if (!target) return;
      addEntry(downstream, node.name, target, entry.type);
      addEntry(upstream, target, node.name, entry.type);
    });
  });
  return { upstream, downstream };
}

function parseCitationsFile() {
  if (!fs.existsSync(CITATIONS_PATH)) {
    return new Map();
  }
  const lines = fs.readFileSync(CITATIONS_PATH, 'utf8').split(/\r?\n/);
  const map = new Map();
  let current = null;
  let section = null;
  lines.forEach((line) => {
    const nodeMatch = line.match(/^##\s*(.+)\s*$/);
    if (nodeMatch) {
      current = nodeMatch[1].trim();
      section = null;
      if (current) {
        map.set(current, { upstream: new Map(), downstream: new Map() });
      }
      return;
    }
    if (!current) return;
    const sectionMatch = line.match(/^###\s*(.+)\s*$/i);
    if (sectionMatch) {
      const label = sectionMatch[1].toLowerCase();
      if (label.includes('influenced by')) section = 'upstream';
      else if (label.includes('influencing')) section = 'downstream';
      else section = null;
      return;
    }
    if (!section) return;
    const bulletMatch = line.match(/^\-\s*(.+)$/);
    if (!bulletMatch) return;
    const content = bulletMatch[1];
    let target = '';
    let type = '';
    let text = content.trim();
    const connMatch = content.match(/^([^—\[]+?)(?:\s*\[([^\]]+)\])?\s*[—-]\s*(.+)$/);
    if (connMatch) {
      target = connMatch[1].trim();
      type = (connMatch[2] || '').trim();
    } else {
      // fallback: split on dash and assume first token is target
      const parts = content.split(/[—-]/);
      if (parts.length >= 1) {
        target = parts[0].replace(/\[.*?\]/, '').trim();
      }
    }
    if (!target) return;
    const key = target.toLowerCase();
    const bucket = map.get(current)?.[section];
    if (bucket) {
      bucket.set(key, { target, type, text });
    }
  });
  return map;
}

function buildCitationsLines(docs) {
  const nodes = flattenNodes(docs);
  const { upstream, downstream } = collectConnections(nodes);
  const existing = parseCitationsFile();
  const lines = [
    '# CITATIONS',
    '',
    'This file holds justification blurbs and sources for each connection. Fill in the placeholders; edge types (Obligate/Influence) are shown where present.',
    '',
  ];
  nodes.forEach((node) => {
    const name = node.name;
    const existingEntry = existing.get(name) || { upstream: new Map(), downstream: new Map() };
    lines.push(`## ${name}`);
    const ups = Array.from((upstream.get(name) || new Map()).values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    const downs = Array.from((downstream.get(name) || new Map()).values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    lines.push('### Influenced by (upstream)');
    if (ups.length === 0) {
      lines.push(DEFAULT_CITATION_LINE);
    } else {
      ups.forEach((entry) => {
        const key = entry.name.toLowerCase();
        const existingLine = existingEntry.upstream.get(key)?.text;
        if (existingLine) {
          lines.push(existingLine);
        } else {
          const typeLabel = entry.type ? ` [${entry.type}]` : '';
          lines.push(`- ${entry.name}${typeLabel} — Justification: …; Sources: …`);
        }
      });
    }
    lines.push('');
    lines.push('### Influencing (downstream)');
    if (downs.length === 0) {
      lines.push(DEFAULT_CITATION_LINE);
    } else {
      downs.forEach((entry) => {
        const key = entry.name.toLowerCase();
        const existingLine = existingEntry.downstream.get(key)?.text;
        if (existingLine) {
          lines.push(existingLine);
        } else {
          const typeLabel = entry.type ? ` [${entry.type}]` : '';
          lines.push(`- ${entry.name}${typeLabel} — Justification: …; Sources: …`);
        }
      });
    }
    lines.push('');
  });
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

function ensureCitationsForDocs(docs) {
  try {
    const content = buildCitationsLines(docs);
    fs.writeFileSync(CITATIONS_PATH, content, 'utf8');
  } catch (err) {
    logError('Failed to update CITATIONS.md', err);
  }
}

function buildCitationsPayload() {
  const map = parseCitationsFile();
  const payload = {};
  map.forEach((entry, name) => {
    const upstream = Array.from(entry.upstream.values()).map((item) => ({
      target: item.target,
      type: item.type || null,
      text: item.text,
    }));
    const downstream = Array.from(entry.downstream.values()).map((item) => ({
      target: item.target,
      type: item.type || null,
      text: item.text,
    }));
    payload[name] = { influencedBy: upstream, influencing: downstream };
  });
  return payload;
}

function buildNameIndex(docs) {
  const map = new Map();
  docs.forEach((doc) => {
    doc.nodes.forEach((node) => {
      if (map.has(node.name)) {
        throw new Error(`Duplicate node name found: ${node.name}`);
      }
      map.set(node.name, { node, doc });
    });
  });
  return map;
}

function addOrRemoveConnection({ from, to, action, type }) {
  if (!from || !to || !action) {
    throw new Error('from, to, and action are required');
  }
  const docs = parseAllDocuments();
  const nameIndex = buildNameIndex(docs);
  const sourceEntry = nameIndex.get(from);
  const targetEntry = nameIndex.get(to);
  if (!sourceEntry || !targetEntry) {
    throw new Error('One or both nodes do not exist in the current datasets');
  }
  if (from === to) {
    throw new Error('Cannot connect a node to itself');
  }

  const sourceIsEmergent = sourceEntry.doc.category === 'emergent';
  const targetIsEmergent = targetEntry.doc.category === 'emergent';
  if (sourceIsEmergent && targetIsEmergent) {
    throw new Error('Emergent↔Emergent connections are not supported; connect via technologies in TREE.md.');
  }

  const touched = new Set();
  if (action === 'add') {
    const edgeType = normalizeType(
      type || sourceEntry.doc.defaultEdgeType || targetEntry.doc.defaultEdgeType || 'Obligate'
    );
    const updateList = (list, name) => {
      const existingIdx = list.findIndex((entry) => entry.name === name);
      if (existingIdx === -1) {
        list.push({ name, type: edgeType });
      } else {
        list[existingIdx] = { name, type: edgeType };
      }
    };
    // Emergent connection data is stored in TREE.md (technology side) only.
    if (!sourceIsEmergent) {
      updateList(sourceEntry.node.leadsTo, to);
    }
    if (!targetIsEmergent) {
      updateList(targetEntry.node.builtUpon, from);
    }
  } else if (action === 'remove') {
    if (!sourceIsEmergent) {
      sourceEntry.node.leadsTo = sourceEntry.node.leadsTo.filter((item) => item.name !== to);
    }
    if (!targetIsEmergent) {
      targetEntry.node.builtUpon = targetEntry.node.builtUpon.filter((item) => item.name !== from);
    }
  } else {
    throw new Error('action must be "add" or "remove"');
  }

  if (!sourceIsEmergent) {
    setConnectionLine(sourceEntry.node.block, sourceEntry.doc.leadsLabel, sourceEntry.node.leadsTo);
    touched.add(sourceEntry.doc);
  }
  if (!targetIsEmergent) {
    setConnectionLine(
      targetEntry.node.block,
      targetEntry.doc.builtLabel,
      targetEntry.node.builtUpon
    );
    touched.add(targetEntry.doc);
  }

  touched.forEach((doc) => writeDocument(doc));
  return docs;
}

function updateNodeSupernode({ name, supernode }) {
  if (!name) {
    throw new Error('name is required');
  }
  const docs = parseAllDocuments();
  const nameIndex = buildNameIndex(docs);
  const entry = nameIndex.get(name);
  if (!entry) {
    throw new Error('Node does not exist');
  }
  const next = supernode && supernode.trim() ? supernode.trim() : null;
  entry.node.supernode = next;
  setSupernodeLine(entry.node.block, next);
  writeDocument(entry.doc);
  if (next) {
    addSupernodeToCatalog(next);
  }
  regenerateMinitreeFromTree(flattenNodes(docs));
  return docs;
}

function clearAllConnections() {
  const docs = parseAllDocuments();
  docs.forEach((doc) => {
    doc.nodes.forEach((node) => {
      node.leadsTo = [];
      node.builtUpon = [];
      setConnectionLine(node.block, doc.leadsLabel, node.leadsTo);
      setConnectionLine(node.block, doc.builtLabel, node.builtUpon);
    });
    writeDocument(doc);
  });
  return docs;
}

function ensurePositionsFile() {
  if (!fs.existsSync(POSITIONS_PATH)) {
    fs.writeFileSync(POSITIONS_PATH, '{}', 'utf8');
  }
}

function readPositions() {
  ensurePositionsFile();
  try {
    const raw = fs.readFileSync(POSITIONS_PATH, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.warn('Could not read positions file, resetting.', err);
  }
  return {};
}

function writePositions(positions) {
  ensurePositionsFile();
  fs.writeFileSync(POSITIONS_PATH, JSON.stringify(positions, null, 2), 'utf8');
}

function ensureGroupBoxesFile() {
  if (!fs.existsSync(GROUPBOXES_PATH)) {
    fs.writeFileSync(GROUPBOXES_PATH, '{}', 'utf8');
  }
}

function readGroupBoxes() {
  ensureGroupBoxesFile();
  try {
    const raw = fs.readFileSync(GROUPBOXES_PATH, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.warn('Could not read group boxes file, resetting.', err);
  }
  return {};
}

function writeGroupBoxes(boxes) {
  ensureGroupBoxesFile();
  fs.writeFileSync(GROUPBOXES_PATH, JSON.stringify(boxes, null, 2), 'utf8');
}

function getSupernodeCatalog() {
  if (!fs.existsSync(SUPERNODES_PATH)) return [];
  const lines = fs.readFileSync(SUPERNODES_PATH, 'utf8').split(/\r?\n/);
  const out = [];
  const seen = new Set();
  lines.forEach((line) => {
    const trimmed = (line || '').trim();
    if (!trimmed) return;
    if (trimmed.startsWith('##')) return;
    // SUPERNODES.md includes age headings like "Early Foraging Age"; ignore those.
    if (!trimmed.includes(' - ')) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(trimmed);
  });
  return out;
}

function addSupernodeToCatalog(name) {
  if (!name) return;
  const trimmed = name.trim();
  if (!trimmed) return;
  const existing = getSupernodeCatalog();
  if (existing.find((entry) => entry.toLowerCase() === trimmed.toLowerCase())) return;

  const lines = fs.existsSync(SUPERNODES_PATH)
    ? fs.readFileSync(SUPERNODES_PATH, 'utf8').split(/\r?\n/)
    : ['## Supernodes', ''];

  const [agePrefix] = trimmed.split(' - ', 1);
  const ageIdx = agePrefix
    ? lines.findIndex((line) => (line || '').trim().toLowerCase() === agePrefix.trim().toLowerCase())
    : -1;

  if (ageIdx !== -1) {
    let insertAt = ageIdx + 1;
    while (insertAt < lines.length) {
      const cur = (lines[insertAt] || '').trim();
      if (!cur) break;
      // Stop before the next age heading.
      if (!cur.startsWith('##') && !cur.includes(' - ')) break;
      insertAt += 1;
    }
    lines.splice(insertAt, 0, trimmed);
  } else {
    if (lines.length && lines[lines.length - 1].trim() !== '') {
      lines.push('');
    }
    lines.push(trimmed);
  }

  fs.writeFileSync(
    SUPERNODES_PATH,
    `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`,
    'utf8'
  );
}

function removeSupernodeFromCatalog(name) {
  if (!fs.existsSync(SUPERNODES_PATH)) return;
  const trimmed = name.trim();
  const lines = fs.readFileSync(SUPERNODES_PATH, 'utf8').split(/\r?\n/);
  const next = lines.filter((line) => (line || '').trim().toLowerCase() !== trimmed.toLowerCase());
  fs.writeFileSync(
    SUPERNODES_PATH,
    `${next.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`,
    'utf8'
  );
}

function removeSupernodeFromTree(docs, name) {
  const target = name.trim().toLowerCase();
  const touched = new Set();
  docs.forEach((doc) => {
    doc.nodes.forEach((node) => {
      if (!node.supernode || node.supernode.trim().toLowerCase() !== target) return;
      const idx = node.block.findIndex((line) => /^#\s*supernode\s*:/i.test(line));
      if (idx !== -1) {
        node.block.splice(idx, 1);
      }
      node.supernode = null;
      touched.add(doc);
    });
  });
  touched.forEach((doc) => writeDocument(doc));
  return docs;
}

function regenerateMinitreeFromTree(nodes) {
  const lines = ['# MINITREE', ''];
  nodes.filter((node) => node.category === 'technology').forEach((node) => lines.push(`- ${node.name}`));
  fs.writeFileSync(MINITREE_PATH, `${lines.join('\n')}\n`, 'utf8');
}

function hashHue(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 360;
  }
  return hash;
}

function defaultGroupBoxForSupernode(supernode, idx, nodes, positions) {
  const belonging = nodes.filter((n) => (n.supernode || '').toLowerCase() === supernode.toLowerCase());
  const coords = belonging
    .map((n) => positions[n.name])
    .filter((pos) => pos && typeof pos.x === 'number' && typeof pos.y === 'number');
  const margin = 200;
  const minSize = 500;
  if (coords.length) {
    const xs = coords.map((p) => p.x);
    const ys = coords.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const width = Math.max(minSize, maxX - minX + margin);
    const height = Math.max(minSize, maxY - minY + margin);
    return {
      x: Math.max(0, minX - margin / 2),
      y: Math.max(0, minY - margin / 2),
      width,
      height,
      color: `hsl(${hashHue(supernode)}, 70%, 60%)`,
    };
  }
  const colWidth = 560;
  const rowHeight = 380;
  const col = idx % 3;
  const row = Math.floor(idx / 3);
  return {
    x: 40 + col * colWidth,
    y: 40 + row * rowHeight,
    width: minSize,
    height: minSize,
    color: `hsl(${hashHue(supernode)}, 70%, 60%)`,
  };
}

function syncGroupBoxes(supernodes, nodes) {
  const positions = readPositions();
  const stored = readGroupBoxes();
  const set = new Set(supernodes.map((name) => name.toLowerCase()));

  // drop removed
  Object.keys(stored).forEach((key) => {
    if (!set.has(key.toLowerCase())) {
      delete stored[key];
    }
  });

  supernodes.forEach((name, idx) => {
    const existingKey = Object.keys(stored).find((key) => key.toLowerCase() === name.toLowerCase());
    if (!existingKey) {
      stored[name] = defaultGroupBoxForSupernode(name, idx, nodes, positions);
    }
  });
  writeGroupBoxes(stored);
  return stored;
}

function buildSupernodePayload(docs) {
  const nodes = flattenNodes(docs);
  const catalogOrder = getSupernodeCatalog();
  const supernodeSet = new Set(
    nodes.filter((n) => n.supernode).map((n) => n.supernode.trim()).filter(Boolean)
  );
  catalogOrder.forEach((entry) => supernodeSet.add(entry));
  const orderedNames = [
    ...catalogOrder,
    ...Array.from(supernodeSet).filter(
      (name) => !catalogOrder.find((existing) => existing.toLowerCase() === name.toLowerCase())
    ),
  ];
  const boxes = syncGroupBoxes(orderedNames, nodes);
  const entries = orderedNames.map((name) => {
    const boxKey = Object.keys(boxes).find((key) => key.toLowerCase() === name.toLowerCase());
    const box = (boxKey && boxes[boxKey]) || defaultGroupBoxForSupernode(name, 0, nodes, readPositions());
    const nodeList = nodes.filter(
      (n) => n.supernode && n.supernode.trim().toLowerCase() === name.toLowerCase()
    );
    return {
      name,
      title: name,
      box,
      nodes: nodeList.map((n) => n.name),
    };
  });
  return { supernodes: entries };
}

async function captureScreenshot() {
  let chromium;
  try {
    // eslint-disable-next-line global-require
    ({ chromium } = require('playwright'));
  } catch (err) {
    throw new Error(
      'Playwright is not installed. Run `npm install playwright` to enable screenshots.'
    );
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const target = `http://localhost:${PORT}`;
  await page.goto(target, { waitUntil: 'networkidle' });
  await page.waitForSelector('.node');
  const dims = await page.evaluate(() => {
    const el = document.getElementById('nodes');
    if (!el) return { width: 1400, height: 900 };
    return { width: el.scrollWidth, height: el.scrollHeight };
  });
  const width = Math.min(Math.max(1200, dims.width + 60), 10000);
  const height = Math.min(Math.max(900, dims.height + 60), 10000);
  await page.setViewportSize({ width, height });
  const buffer = await page.screenshot({ fullPage: true });
  await browser.close();
  return buffer;
}

function serveStatic(req, res, pathname) {
  const safePath = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  const filePath = path.resolve(PUBLIC_DIR, safePath);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    const contentType = CONTENT_TYPES[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk.toString();
      if (data.length > 1e6) {
        req.connection.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', (err) => reject(err));
  });
}

const server = http.createServer(async (req, res) => {
  const { pathname } = url.parse(req.url);
  logInfo(`REQ ${req.method} ${pathname}`);

  if (req.method === 'GET' && pathname === '/api/tree') {
    const docs = parseAllDocuments();
    ensureCitationsForDocs(docs);
    sendJson(res, 200, { nodes: flattenNodes(docs) });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/supernodes') {
    const docs = parseAllDocuments();
    sendJson(res, 200, buildSupernodePayload(docs));
    return;
  }

  if (req.method === 'GET' && (pathname === '/api/citations' || pathname === '/api/reading')) {
    const docs = parseAllDocuments();
    ensureCitationsForDocs(docs);
    const payload = buildCitationsPayload();
    sendJson(res, 200, { citations: payload, reading: payload });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/positions') {
    const positions = readPositions();
    sendJson(res, 200, { positions });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/positions') {
    try {
      const raw = await collectBody(req);
      const data = JSON.parse(raw || '{}');
      const positions = readPositions();
      if (data && typeof data.positions === 'object' && !Array.isArray(data.positions)) {
        writePositions(data.positions);
        sendJson(res, 200, { positions: data.positions });
        return;
      }
      const { name, x, y } = data;
      if (!name || typeof x !== 'number' || typeof y !== 'number') {
        throw new Error('name, x, and y are required');
      }
      positions[name] = { x, y };
      writePositions(positions);
      sendJson(res, 200, { positions });
    } catch (err) {
      sendJson(res, 400, { error: err.message });
    }
    return;
  }

  if (req.method === 'GET' && pathname === '/api/screenshot') {
    try {
      const buffer = await captureScreenshot();
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(buffer);
    } catch (err) {
      logError('Screenshot failed', err);
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/connection') {
    try {
      const raw = await collectBody(req);
      const data = JSON.parse(raw || '{}');
      const docs = addOrRemoveConnection(data);
      ensureCitationsForDocs(docs);
      sendJson(res, 200, { nodes: flattenNodes(docs) });
    } catch (err) {
      logError('Connection update failed', err);
      sendJson(res, 400, { error: err.message });
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/supernodes') {
    try {
      const raw = await collectBody(req);
      const data = JSON.parse(raw || '{}');
      const { name } = data;
      if (!name || typeof name !== 'string' || !name.trim()) {
        throw new Error('name is required');
      }
      addSupernodeToCatalog(name.trim());
      const docs = parseAllDocuments();
      // ensure group box exists even if no nodes yet
      buildSupernodePayload(docs);
      sendJson(res, 200, buildSupernodePayload(docs));
    } catch (err) {
      logError('Create supernode failed', err);
      sendJson(res, 400, { error: err.message });
    }
    return;
  }

  if (req.method === 'DELETE' && pathname === '/api/supernodes') {
    try {
      const raw = await collectBody(req);
      const data = JSON.parse(raw || '{}');
      const { name } = data;
      if (!name || typeof name !== 'string' || !name.trim()) {
        throw new Error('name is required');
      }
      const trimmed = name.trim();
      removeSupernodeFromCatalog(trimmed);
      const docs = removeSupernodeFromTree(parseAllDocuments(), trimmed);
      regenerateMinitreeFromTree(flattenNodes(docs));
      const boxes = readGroupBoxes();
      Object.keys(boxes).forEach((key) => {
        if (key.toLowerCase() === trimmed.toLowerCase()) {
          delete boxes[key];
        }
      });
      writeGroupBoxes(boxes);
      sendJson(res, 200, buildSupernodePayload(docs));
    } catch (err) {
      logError('Delete supernode failed', err);
      sendJson(res, 400, { error: err.message });
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/supernodes/box') {
    try {
      const raw = await collectBody(req);
      const data = JSON.parse(raw || '{}');
      const { name, x, y, width, height } = data || {};
      if (!name || typeof name !== 'string' || !name.trim()) {
        throw new Error('name is required');
      }
      if (
        typeof x !== 'number' ||
        typeof y !== 'number' ||
        typeof width !== 'number' ||
        typeof height !== 'number'
      ) {
        throw new Error('x, y, width, and height are required numeric values');
      }
      const boxes = readGroupBoxes();
      boxes[name] = {
        ...(boxes[name] || {}),
        x,
        y,
        width,
        height,
        color: boxes[name]?.color || `hsl(${hashHue(name)}, 70%, 60%)`,
      };
      writeGroupBoxes(boxes);
      sendJson(res, 200, { box: boxes[name] });
    } catch (err) {
      logError('Save supernode box failed', err);
      sendJson(res, 400, { error: err.message });
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/node/supernode') {
    try {
      const raw = await collectBody(req);
      const data = JSON.parse(raw || '{}');
      const { name, supernode } = data || {};
      const docs = updateNodeSupernode({ name, supernode });
      ensureCitationsForDocs(docs);
      sendJson(res, 200, {
        nodes: flattenNodes(docs),
        supernodes: buildSupernodePayload(docs).supernodes,
      });
    } catch (err) {
      logError('Update node supernode failed', err);
      sendJson(res, 400, { error: err.message });
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/connections/clear') {
    try {
      const docs = clearAllConnections();
      ensureCitationsForDocs(docs);
      sendJson(res, 200, { nodes: flattenNodes(docs) });
    } catch (err) {
      logError('Clear connections failed', err);
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  logInfo(`Tech Tree viewer running at http://localhost:${PORT}`);
});
