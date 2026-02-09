/* global window, document */

function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function nextFrame() {
  return new Promise((resolve) => window.requestAnimationFrame(resolve));
}

function buildPermutation(seedText) {
  const seed = xmur3(String(seedText))();
  const rand = mulberry32(seed);
  const perm = new Uint8Array(256);
  for (let i = 0; i < 256; i++) perm[i] = i;

  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = perm[i];
    perm[i] = perm[j];
    perm[j] = tmp;
  }

  const p = new Uint8Array(512);
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  return p;
}

function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function grad(hash, x, y) {
  switch (hash & 7) {
    case 0:
      return x + y;
    case 1:
      return -x + y;
    case 2:
      return x - y;
    case 3:
      return -x - y;
    case 4:
      return x;
    case 5:
      return -x;
    case 6:
      return y;
    default:
      return -y;
  }
}

function perlin2(p, x, y) {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);

  const u = fade(xf);
  const v = fade(yf);

  const aa = p[(p[xi] + yi) & 255];
  const ab = p[(p[xi] + yi + 1) & 255];
  const ba = p[(p[(xi + 1) & 255] + yi) & 255];
  const bb = p[(p[(xi + 1) & 255] + yi + 1) & 255];

  const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
  const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
  return lerp(x1, x2, v);
}

function fbm2(p, x, y, { octaves = 4, lacunarity = 2, gain = 0.5 } = {}) {
  let amplitude = 1;
  let frequency = 1;
  let sum = 0;
  let max = 0;

  for (let i = 0; i < octaves; i++) {
    sum += amplitude * perlin2(p, x * frequency, y * frequency);
    max += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }

  return { value: sum, max };
}

function buildTopoColorLut() {
  const lut = new Uint8Array(256 * 3);

  function write(i, r, g, b) {
    lut[i * 3] = clamp(Math.round(r), 0, 255);
    lut[i * 3 + 1] = clamp(Math.round(g), 0, 255);
    lut[i * 3 + 2] = clamp(Math.round(b), 0, 255);
  }

  function ramp(t, stops) {
    const clamped = clamp(t, 0, 1);
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i];
      const b = stops[i + 1];
      if (clamped >= a.t && clamped <= b.t) {
        const localT = (clamped - a.t) / Math.max(1e-9, b.t - a.t);
        return {
          r: lerp(a.r, b.r, localT),
          g: lerp(a.g, b.g, localT),
          b: lerp(a.b, b.b, localT),
        };
      }
    }
    const last = stops[stops.length - 1];
    return { r: last.r, g: last.g, b: last.b };
  }

  const stops = [
    { t: 0.0, r: 134, g: 182, b: 104 },
    { t: 0.2, r: 154, g: 199, b: 122 },
    { t: 0.4, r: 174, g: 214, b: 144 },
    { t: 0.6, r: 192, g: 228, b: 166 },
    { t: 0.8, r: 208, g: 240, b: 188 },
    { t: 1.0, r: 224, g: 249, b: 210 },
  ];

  for (let i = 0; i <= 255; i++) {
    const t = i / 255;
    const c = ramp(t, stops);
    write(i, c.r, c.g, c.b);
  }

  return lut;
}

async function generateElevationCanvas({ size, scale, octaves, seedText, onProgress }) {
  const offscreen = document.createElement("canvas");
  offscreen.width = size;
  offscreen.height = size;

  const ctx = offscreen.getContext("2d");
  const img = ctx.createImageData(size, size);
  const data = img.data;
  const p = buildPermutation(seedText);
  const lut = buildTopoColorLut();
  const elevations = new Uint8Array(size * size);

  const start = performance.now();
  const safeScale = Math.max(1, scale);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / safeScale;
      const ny = y / safeScale;
      const { value, max } = fbm2(p, nx, ny, { octaves });
      const normalized = (value / max + 1) / 2;
      const raw = clamp(Math.round(normalized * 255), 0, 255);
      const q = Math.floor(raw / 10) * 10;

      const i = y * size + x;
      elevations[i] = q;
      const idx = i * 4;

      data[idx] = lut[q * 3];
      data[idx + 1] = lut[q * 3 + 1];
      data[idx + 2] = lut[q * 3 + 2];
      data[idx + 3] = 255;
    }

    if (y % 24 === 0) {
      onProgress?.(y / size);
      await nextFrame();
    }
  }

  const contourMinor = 20;
  const contourMajor = 50;
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const i = y * size + x;
      const e = elevations[i];
      const er = elevations[i + 1];
      const ed = elevations[i + size];
      if (e === er && e === ed) continue;

      const major = e % contourMajor === 0 || er % contourMajor === 0 || ed % contourMajor === 0;
      const minor = e % contourMinor === 0 || er % contourMinor === 0 || ed % contourMinor === 0;
      if (!major && !minor) continue;

      const r = 0;
      const g = 0;
      const b = 0;

      const idx = i * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;

      const idxR = (i + 1) * 4;
      data[idxR] = r;
      data[idxR + 1] = g;
      data[idxR + 2] = b;
      data[idxR + 3] = 255;

      const idxD = (i + size) * 4;
      data[idxD] = r;
      data[idxD + 1] = g;
      data[idxD + 2] = b;
      data[idxD + 3] = 255;

      const idxDR = (i + size + 1) * 4;
      data[idxDR] = r;
      data[idxDR + 1] = g;
      data[idxDR + 2] = b;
      data[idxDR + 3] = 255;
    }
    if (y % 64 === 0) await nextFrame();
  }

  ctx.putImageData(img, 0, 0);
  const ms = Math.round(performance.now() - start);
  onProgress?.(1);
  return { canvas: offscreen, ms, elevations };
}

function drawMapToCanvas(canvas, mapCanvas) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const side = Math.min(w, h);
  const dx = Math.round((w - side) / 2);
  const dy = Math.round((h - side) / 2);

  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(mapCanvas, dx, dy, side, side);

  return { dx, dy, side };
}

function setStatus({ size, scale, octaves, ms }) {
  const sizeEl = document.getElementById("status-size");
  const scaleEl = document.getElementById("status-scale");
  const octavesEl = document.getElementById("status-octaves");
  const timeEl = document.getElementById("status-time");

  if (sizeEl) sizeEl.textContent = size == null ? "-" : String(size);
  if (scaleEl) scaleEl.textContent = scale == null ? "-" : String(scale);
  if (octavesEl) octavesEl.textContent = octaves == null ? "-" : String(octaves);
  if (timeEl) timeEl.textContent = ms == null ? "-" : `${ms}ms`;
}

function randomSeedText() {
  if (globalThis.crypto?.getRandomValues) {
    const buf = new Uint32Array(2);
    globalThis.crypto.getRandomValues(buf);
    return `${buf[0].toString(36)}-${buf[1].toString(36)}`;
  }
  return `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

  function init() {
    const canvas = document.getElementById("board");
  const sizeEl = document.getElementById("map-size");
  const scaleEl = document.getElementById("noise-scale");
  const octavesEl = document.getElementById("octaves");
  const startBtn = document.getElementById("start");
  const resetBtn = document.getElementById("reset");
  const finalizeMapBtn = document.getElementById("finalize-map");
	    const mapSettingsEl = document.getElementById("map-settings");
	    const attackMatrixWrapEl = document.getElementById("attack-matrix-table");
	    const matrixExportCsvBtn = document.getElementById("matrix-export-csv");
	    const matrixSaveStatusEl = document.getElementById("matrix-save-status");
	    const hoverTooltipEl = document.getElementById("hover-attack-tooltip");
  const stageEl = canvas?.closest?.(".sim-stage");
  const forestBtn = document.getElementById("tool-forest");
  const riverBtn = document.getElementById("tool-river");
  const turnIndicatorEl = document.getElementById("turn-indicator");
  const endTurnBtn = document.getElementById("end-turn");
  const logEl = document.getElementById("log");
  const statusPieceEl = document.getElementById("status-piece");
  const statusTypeEl = document.getElementById("status-type");
	  const statusTeamEl = document.getElementById("status-team");
	  const statusMoraleEl = document.getElementById("status-morale");
	  const statusMoveRangeEl = document.getElementById("status-move-range");
	  const statusRangedRadiusEl = document.getElementById("status-ranged-radius");
	  const statusMeleeRadiusEl = document.getElementById("status-melee-radius");
	  const statusMoveEl = document.getElementById("status-move");
	  const statusRotateEl = document.getElementById("status-rotate");
	  const statusAttackEl = document.getElementById("status-attack");
	  const statusMoveRowEl = document.getElementById("status-move-row");
	  const statusRotateRowEl = document.getElementById("status-rotate-row");
	  const statusAttackRowEl = document.getElementById("status-attack-row");
	  const restBtn = document.getElementById("rest");

  const INFANTRY_MOVE_RANGE = 100;
  const UNIT_TYPES = ["infantry", "cavalry", "artillery"];
  const DAMAGE_MATRIX_STORAGE_KEY = "boardgame_damage_matrix_v3";
  const DAMAGE_MATRIX_STORAGE_KEY_V2 = "boardgame_damage_matrix_v2";
  const FRONT_ARC_HALF_ANGLE = Math.PI / 4;

  let running = false;
  let logLines = [];
  let renderState = null;
  let activeTool = "forest";
  let drawingEnabled = true;
  let isPainting = false;
  let selectedPieceId = null;
  let turnTeam = 1;
  let draggingPieceId = null;
  let dragOrigin = null;
  let dragStart = null;
  let rotatingPieceId = null;
  let rotateStartRotation = null;
  let damageMatrix = null;
  let attackMatrixInputBound = false;
  let matrixSaveTimer = null;
  let matrixSaveStatusTimer = null;
  let matrixApiAvailable = false;

  function hideHoverTooltip() {
    if (!hoverTooltipEl) return;
    hoverTooltipEl.classList.add("is-hidden");
  }

  function showHoverTooltip(text, evt) {
    if (!hoverTooltipEl || !stageEl) return;
    if (!text) return hideHoverTooltip();

    hoverTooltipEl.textContent = text;
    hoverTooltipEl.classList.remove("is-hidden");

    const stageRect = stageEl.getBoundingClientRect();
    const x = clamp(evt.clientX - stageRect.left + 12, 8, stageRect.width - 8);
    const y = clamp(evt.clientY - stageRect.top + 12, 8, stageRect.height - 8);
    hoverTooltipEl.style.left = `${x}px`;
    hoverTooltipEl.style.top = `${y}px`;

    const tipRect = hoverTooltipEl.getBoundingClientRect();
    const maxLeft = stageRect.width - tipRect.width - 8;
    const maxTop = stageRect.height - tipRect.height - 8;
    hoverTooltipEl.style.left = `${clamp(x, 8, maxLeft)}px`;
    hoverTooltipEl.style.top = `${clamp(y, 8, maxTop)}px`;
  }

  function resizeCanvasToDisplaySize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.floor((window.devicePixelRatio ?? 1) * 1000) / 1000);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
  }

  function pieceTypeLabel(type) {
    switch (type) {
      case "infantry":
        return "Infantry";
      case "cavalry":
        return "Cavalry";
      case "artillery":
        return "Artillery";
      default:
        return "Unknown";
    }
  }

  function teamLabel(team) {
    return team === 2 ? "Team 2 (Blue)" : "Team 1 (Red)";
  }

  function defaultDamageCell() {
    return {
      base: 1,
      attackingFromHigherElevation: 1,
      attackingFromLowerElevation: -1,
      attackingAcrossRiver: -1,
      attackingInForest: -1,
      attackingInPlains: 0,
      attackingFromFront: 0,
      attackingFromSide: 1,
      attackingFromRear: 2,
    };
  }

  function defaultDamagePair() {
    return {
      ranged: defaultDamageCell(),
      melee: defaultDamageCell(),
    };
  }

  function defaultDamageMatrix() {
    const matrix = {};
    for (const attackerType of UNIT_TYPES) {
      matrix[attackerType] = {};
      for (const defenderType of UNIT_TYPES) {
        matrix[attackerType][defenderType] = defaultDamagePair();
      }
    }
    return matrix;
  }

  function coerceDamageCell(candidate) {
    if (!candidate || typeof candidate !== "object") return null;
    const asNumber = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

    const base = asNumber(candidate.base);
    if (base == null) return null;

    const higher =
      asNumber(candidate.attackingFromHigherElevation) ??
      (asNumber(candidate.defenderHigherElevation) != null ? -asNumber(candidate.defenderHigherElevation) : null);
    const lower = asNumber(candidate.attackingFromLowerElevation) ?? (higher != null ? -higher : null);
    const across = asNumber(candidate.attackingAcrossRiver) ?? asNumber(candidate.defenderAcrossRiver);
    const inForest = asNumber(candidate.attackingInForest) ?? asNumber(candidate.defenderInForest);
    const inPlains = asNumber(candidate.attackingInPlains) ?? asNumber(candidate.defenderInPlains);
    const fromFront = asNumber(candidate.attackingFromFront) ?? asNumber(candidate.defenderFacingAttacker);
    const fromSide = asNumber(candidate.attackingFromSide) ?? asNumber(candidate.defenderPerpendicular);
    const fromRear = asNumber(candidate.attackingFromRear) ?? asNumber(candidate.defenderFacingAway);

    if ([higher, lower, across, inForest, inPlains, fromFront, fromSide, fromRear].some((v) => v == null)) return null;

    return {
      base,
      attackingFromHigherElevation: higher,
      attackingFromLowerElevation: lower,
      attackingAcrossRiver: across,
      attackingInForest: inForest,
      attackingInPlains: inPlains,
      attackingFromFront: fromFront,
      attackingFromSide: fromSide,
      attackingFromRear: fromRear,
    };
  }

  function coerceDamagePair(candidate) {
    if (!candidate || typeof candidate !== "object") return null;
    if (candidate.ranged && candidate.melee) {
      const ranged = coerceDamageCell(candidate.ranged);
      const melee = coerceDamageCell(candidate.melee);
      if (!ranged || !melee) return null;
      return { ranged, melee };
    }
    const legacy = coerceDamageCell(candidate);
    if (!legacy) return null;
    return { ranged: { ...legacy }, melee: { ...legacy } };
  }

  function validateDamageMatrix(candidate) {
    if (!candidate || typeof candidate !== "object") return null;
    for (const attackerType of UNIT_TYPES) {
      if (!candidate[attackerType] || typeof candidate[attackerType] !== "object") return null;
      for (const defenderType of UNIT_TYPES) {
        const pair = coerceDamagePair(candidate[attackerType][defenderType]);
        if (!pair) return null;
        candidate[attackerType][defenderType] = pair;
      }
    }
    return candidate;
  }

  function loadDamageMatrix() {
    try {
      const raw =
        window.localStorage?.getItem(DAMAGE_MATRIX_STORAGE_KEY) ?? window.localStorage?.getItem(DAMAGE_MATRIX_STORAGE_KEY_V2);
      if (!raw) return defaultDamageMatrix();
      const parsed = JSON.parse(raw);
      return validateDamageMatrix(parsed) ?? defaultDamageMatrix();
    } catch {
      return defaultDamageMatrix();
    }
  }

  function hasValidStoredDamageMatrix() {
    try {
      const raw =
        window.localStorage?.getItem(DAMAGE_MATRIX_STORAGE_KEY) ?? window.localStorage?.getItem(DAMAGE_MATRIX_STORAGE_KEY_V2);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Boolean(validateDamageMatrix(parsed));
    } catch {
      return false;
    }
  }

  function saveDamageMatrix(matrix) {
    try {
      window.localStorage?.setItem(DAMAGE_MATRIX_STORAGE_KEY, JSON.stringify(matrix));
    } catch {
      // ignore
    }
  }

  function setMatrixSaveStatus(text) {
    if (!matrixSaveStatusEl) return;
    matrixSaveStatusEl.textContent = text;
    if (matrixSaveStatusTimer) window.clearTimeout(matrixSaveStatusTimer);
    if (!text) return;
    matrixSaveStatusTimer = window.setTimeout(() => {
      if (matrixSaveStatusEl) matrixSaveStatusEl.textContent = "";
    }, 2500);
  }

  async function loadDamageMatrixFromApi() {
    try {
      const resp = await fetch("/api/damage-matrix", { cache: "no-store" });
      const contentType = resp.headers.get("Content-Type") ?? "";
      const apiAvailable = contentType.includes("application/json");
      if (!resp.ok) return { apiAvailable, matrix: null };
      const json = await resp.json();
      return { apiAvailable, matrix: validateDamageMatrix(json) };
    } catch {
      return { apiAvailable: false, matrix: null };
    }
  }

  async function saveDamageMatrixToApi(matrix) {
    try {
      const resp = await fetch("/api/damage-matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(matrix),
      });
      return resp.ok;
    } catch {
      return false;
    }
  }

  function scheduleMatrixSave() {
    if (matrixSaveTimer) window.clearTimeout(matrixSaveTimer);
    matrixSaveTimer = window.setTimeout(async () => {
      if (!damageMatrix) return;
      saveDamageMatrix(damageMatrix);
      if (!matrixApiAvailable) return;
      const ok = await saveDamageMatrixToApi(damageMatrix);
      setMatrixSaveStatus(ok ? "Saved" : "Save failed");
    }, 250);
  }

  async function loadDamageMatrixFromFile() {
    try {
      const resp = await fetch("damage-matrix.md", { cache: "no-store" });
      if (!resp.ok) return null;
      const text = await resp.text();
      const parsed = parseDamageMatrixMarkdown(text);
      return validateDamageMatrix(parsed);
    } catch {
      return null;
    }
  }

	  function parseDamageMatrixMarkdown(markdown) {
    const begin = "<!-- BEGIN_DAMAGE_MATRIX_JSON -->";
    const end = "<!-- END_DAMAGE_MATRIX_JSON -->";
    const beginIdx = markdown.indexOf(begin);
    const endIdx = markdown.indexOf(end);
    if (beginIdx === -1 || endIdx === -1 || endIdx <= beginIdx) return null;
    const slice = markdown.slice(beginIdx + begin.length, endIdx);

    const fence = "```json";
    const fenceIdx = slice.indexOf(fence);
    if (fenceIdx === -1) return null;
    const afterFence = slice.slice(fenceIdx + fence.length);
    const closeIdx = afterFence.indexOf("```");
    if (closeIdx === -1) return null;
    const jsonText = afterFence.slice(0, closeIdx).trim();
    if (!jsonText) return null;

    try {
      return JSON.parse(jsonText);
    } catch {
      return null;
    }
	  }

	  function csvEscape(value) {
	    const text = value == null ? "" : String(value);
	    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
	  }

	  function damageMatrixToCsv(matrix) {
	    const fields = [
	      "base",
	      "attackingFromHigherElevation",
	      "attackingFromLowerElevation",
	      "attackingAcrossRiver",
	      "attackingInForest",
	      "attackingInPlains",
	      "attackingFromFront",
	      "attackingFromSide",
	      "attackingFromRear",
	    ];

	    const header = ["attacker", "defender", "mode", ...fields].map(csvEscape).join(",");
	    const lines = [header];

	    for (const attackerType of UNIT_TYPES) {
	      for (const defenderType of UNIT_TYPES) {
	        const pair = matrix?.[attackerType]?.[defenderType];
	        if (!pair) continue;
	        for (const mode of ["ranged", "melee"]) {
	          const cell = pair[mode];
	          if (!cell) continue;
	          const row = [
	            attackerType,
	            defenderType,
	            mode,
	            ...fields.map((f) => (Number.isFinite(Number(cell[f])) ? Number(cell[f]) : "")),
	          ];
	          lines.push(row.map(csvEscape).join(","));
	        }
	      }
	    }

	    return lines.join("\n") + "\n";
	  }

	  function downloadText(filename, text, type) {
	    try {
	      const blob = new Blob([text], { type: type || "text/plain" });
	      const url = URL.createObjectURL(blob);
	      const a = document.createElement("a");
	      a.href = url;
	      a.download = filename;
	      document.body.appendChild(a);
	      a.click();
	      a.remove();
	      URL.revokeObjectURL(url);
	    } catch {
	      // ignore
	    }
	  }

	  function buildAttackMatrixTable() {
	    if (!attackMatrixWrapEl) return;
	    if (!damageMatrix) damageMatrix = loadDamageMatrix();

    const fields = [
      { key: "base", label: "Base" },
      { key: "attackingFromHigherElevation", label: "Attacking from Higher Elevation" },
      { key: "attackingFromLowerElevation", label: "Attacking from Lower Elevation" },
      { key: "attackingAcrossRiver", label: "Attacking Across River" },
      { key: "attackingInForest", label: "Attacking in Forest" },
      { key: "attackingInPlains", label: "Attacking in plains" },
      { key: "attackingFromFront", label: "Attacking from front" },
      { key: "attackingFromSide", label: "Attacking from side" },
      { key: "attackingFromRear", label: "Attacking from rear" },
    ];

    attackMatrixWrapEl.textContent = "";
    const table = document.createElement("table");
    table.className = "attack-table";

    const thead = document.createElement("thead");
    const headRow1 = document.createElement("tr");
    const corner = document.createElement("th");
    corner.textContent = "Attacker \\ Defender";
    corner.rowSpan = 2;
    headRow1.appendChild(corner);

    for (const defenderType of UNIT_TYPES) {
      const th = document.createElement("th");
      th.textContent = pieceTypeLabel(defenderType);
      th.colSpan = 2;
      headRow1.appendChild(th);
    }
    thead.appendChild(headRow1);

    const headRow2 = document.createElement("tr");
    for (let i = 0; i < UNIT_TYPES.length; i++) {
      const thRanged = document.createElement("th");
      thRanged.textContent = "Ranged";
      headRow2.appendChild(thRanged);
      const thMelee = document.createElement("th");
      thMelee.textContent = "Melee";
      headRow2.appendChild(thMelee);
    }
    thead.appendChild(headRow2);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (const attackerType of UNIT_TYPES) {
      const row = document.createElement("tr");
      const rowHead = document.createElement("th");
      rowHead.textContent = pieceTypeLabel(attackerType);
      row.appendChild(rowHead);

      for (const defenderType of UNIT_TYPES) {
        const pair = damageMatrix[attackerType][defenderType];
        for (const mode of ["ranged", "melee"]) {
          const td = document.createElement("td");
          const cell = document.createElement("div");
          cell.className = "attack-cell";

          if (attackerType === "cavalry" && mode === "ranged") {
            cell.classList.add("is-disabled");
            cell.textContent = "Cannot perform Ranged Attacks";
            td.appendChild(cell);
            row.appendChild(td);
            continue;
          }

          if (attackerType === "artillery" && mode === "melee") {
            cell.classList.add("is-disabled");
            cell.textContent = "Cannot perform Melee Attacks";
            td.appendChild(cell);
            row.appendChild(td);
            continue;
          }

          const cellValues = pair[mode];

          for (const field of fields) {
            const label = document.createElement("label");
            const text = document.createElement("span");
            text.textContent = field.label;
            const input = document.createElement("input");
            input.type = "number";
            input.step = "1";
            input.value = String(Number(cellValues[field.key]));
            input.dataset.attacker = attackerType;
            input.dataset.defender = defenderType;
            input.dataset.mode = mode;
            input.dataset.field = field.key;
            label.appendChild(text);
            label.appendChild(input);
            cell.appendChild(label);
          }

          td.appendChild(cell);
          row.appendChild(td);
        }
      }

      tbody.appendChild(row);
    }
    table.appendChild(tbody);
    attackMatrixWrapEl.appendChild(table);

    if (!attackMatrixInputBound) {
      attackMatrixWrapEl.addEventListener("input", (evt) => {
        const target = evt.target;
        if (!(target instanceof HTMLInputElement)) return;
        const attacker = target.dataset.attacker;
        const defender = target.dataset.defender;
        const mode = target.dataset.mode;
        const field = target.dataset.field;
        if (!attacker || !defender || !mode || !field) return;
        if (!damageMatrix?.[attacker]?.[defender]?.[mode]) return;
        const value = Number(target.value);
        if (!Number.isFinite(value)) return;
        damageMatrix[attacker][defender][mode][field] = value;
        scheduleMatrixSave();
      });
      attackMatrixInputBound = true;
    }
  }

  function setAvailability(rowEl, available) {
    if (!rowEl) return;
    if (available == null) {
      rowEl.classList.remove("is-available", "is-unavailable");
      return;
    }
    rowEl.classList.toggle("is-available", Boolean(available));
    rowEl.classList.toggle("is-unavailable", !available);
  }

  function log(text) {
    logLines.push(text);
    if (logLines.length > 200) logLines.shift();
    logEl.textContent = logLines.join("\n");
  }

  function setDrawingEnabled(enabled) {
    drawingEnabled = Boolean(enabled);
    forestBtn.disabled = !drawingEnabled;
    riverBtn.disabled = !drawingEnabled;
    if (!drawingEnabled) {
      isPainting = false;
      forestBtn.classList.remove("is-active");
      riverBtn.classList.remove("is-active");
    } else {
      setTool(activeTool);
    }
  }

  if (finalizeMapBtn) {
    finalizeMapBtn.addEventListener("click", () => {
      if (!mapSettingsEl) return;
      mapSettingsEl.classList.add("is-hidden");
      mapSettingsEl.setAttribute("aria-hidden", "true");
      setDrawingEnabled(false);
      log("Map settings closed.");
    });
  }

  function setTool(tool) {
    activeTool = tool;
    if (!drawingEnabled) return;
    forestBtn.classList.toggle("is-active", tool === "forest");
    riverBtn.classList.toggle("is-active", tool === "river");
  }

  function setTurn(team) {
    turnTeam = team;
    if (!turnIndicatorEl) return;
    turnIndicatorEl.textContent = `Turn: ${team === 2 ? "Blue" : "Red"}`;
    turnIndicatorEl.classList.toggle("is-blue", team === 2);
    turnIndicatorEl.classList.toggle("is-red", team !== 2);
    setSelectedPieceStatus(getSelectedPiece());
  }

  function getBrushRadius(mapSize) {
    return clamp(Math.round(mapSize / 80), 6, 28);
  }

  function getPieceSize(mapSize) {
    return clamp(Math.round(mapSize / 55) * 4, 36, 96);
  }

  function getMoveRange(type) {
    switch (type) {
      case "cavalry":
        return 160;
      case "artillery":
        return 70;
      case "infantry":
      default:
        return INFANTRY_MOVE_RANGE;
    }
  }

  function getSelectedPiece() {
    if (!renderState?.pieces?.length || !selectedPieceId) return null;
    return renderState.pieces.find((p) => p.id === selectedPieceId) ?? null;
  }

	  function canMovePiece(piece) {
	    return piece && piece.team === turnTeam && Number(piece.morale ?? 0) > 0 && piece.didMove !== true && piece.didRest !== true;
	  }

	  function canRotatePiece(piece) {
	    return piece && piece.team === turnTeam && piece.didRotate !== true && piece.didRest !== true;
	  }

	  function canRestPiece(piece) {
	    if (!piece) return false;
	    if (piece.team !== turnTeam) return false;
	    if (piece.didRest === true) return false;
	    if (piece.didMove === true) return false;
	    if (piece.didRotate === true) return false;
	    if (piece.didAttack === true) return false;
	    return true;
	  }

	  function setSelectedPieceStatus(piece) {
	    if (statusPieceEl) statusPieceEl.textContent = piece ? piece.name : "-";
	    if (statusTypeEl) statusTypeEl.textContent = piece ? pieceTypeLabel(piece.type) : "-";
	    if (statusTeamEl) statusTeamEl.textContent = piece ? teamLabel(piece.team) : "-";
	    if (statusMoraleEl) statusMoraleEl.textContent = piece ? String(piece.morale ?? "-") : "-";
	    if (statusMoveRangeEl) statusMoveRangeEl.textContent = piece ? String(getMoveRange(piece.type)) : "-";
	    if (statusRangedRadiusEl) statusRangedRadiusEl.textContent = piece ? String(piece.rangedRadius ?? "-") : "-";
	    if (statusMeleeRadiusEl) statusMeleeRadiusEl.textContent = piece ? String(piece.meleeRadius ?? "-") : "-";
	    if (restBtn) restBtn.disabled = !piece || !canRestPiece(piece);

	    if (!piece) {
	      if (statusMoveEl) statusMoveEl.textContent = "-";
	      if (statusRotateEl) statusRotateEl.textContent = "-";
	      if (statusAttackEl) statusAttackEl.textContent = "-";
      setAvailability(statusMoveRowEl, null);
      setAvailability(statusRotateRowEl, null);
      setAvailability(statusAttackRowEl, null);
      return;
    }

    const moveAvailable = canMovePiece(piece);
    const rotateAvailable = canRotatePiece(piece);
    const attackAvailable = canAttackPiece(piece);

    const moveLeft = moveAvailable ? 1 : 0;
    const rotateLeft = rotateAvailable ? 1 : 0;
    const attackLeft = attackAvailable ? 1 : 0;

    if (statusMoveEl) statusMoveEl.textContent = String(moveLeft);
    if (statusRotateEl) statusRotateEl.textContent = String(rotateLeft);
    if (statusAttackEl) statusAttackEl.textContent = String(attackLeft);
    setAvailability(statusMoveRowEl, moveLeft > 0);
    setAvailability(statusRotateRowEl, rotateLeft > 0);
    setAvailability(statusAttackRowEl, attackLeft > 0);
  }

  function pieceFacingAngle(piece) {
    const rot = piece?.rotation ?? 0;
    const fx = Math.sin(rot);
    const fy = -Math.cos(rot);
    return Math.atan2(fy, fx);
  }

  function isTargetInFront(attacker, target) {
    if (!attacker || !target) return false;
    const dx = target.x - attacker.x;
    const dy = target.y - attacker.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= 1e-9) return true;

    const toTx = dx / dist;
    const toTy = dy / dist;
    const rot = attacker.rotation ?? 0;
    const fx = Math.sin(rot);
    const fy = -Math.cos(rot);
    const dot = fx * toTx + fy * toTy;
    return dot >= Math.cos(FRONT_ARC_HALF_ANGLE);
  }

  function render() {
    if (!renderState) return;
    resizeCanvasToDisplaySize();
    const { baseCanvas, overlayCanvas } = renderState;
    const { dx, dy, side } = drawMapToCanvas(canvas, baseCanvas);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(overlayCanvas, dx, dy, side, side);

    const selectedPiece = getSelectedPiece();
    if (selectedPiece && canMovePiece(selectedPiece)) {
      const anchorX = selectedPiece.moveAnchorX ?? selectedPiece.x;
      const anchorY = selectedPiece.moveAnchorY ?? selectedPiece.y;
      const cx = dx + (anchorX / renderState.mapSize) * side;
      const cy = dy + (anchorY / renderState.mapSize) * side;
      const rr = (Number(selectedPiece.moveRange ?? getMoveRange(selectedPiece.type)) / renderState.mapSize) * side;

      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(0,0,0,0.75)";
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (selectedPieceId) {
      const selectedPiece = getSelectedPiece();
      if (selectedPiece && canAttackPiece(selectedPiece)) {
        const cx = dx + (selectedPiece.x / renderState.mapSize) * side;
        const cy = dy + (selectedPiece.y / renderState.mapSize) * side;
        const angle = pieceFacingAngle(selectedPiece);
        const a0 = angle - FRONT_ARC_HALF_ANGLE;
        const a1 = angle + FRONT_ARC_HALF_ANGLE;

        const meleeRadius = (Number(selectedPiece.meleeRadius ?? 0) / renderState.mapSize) * side;
        if (meleeRadius > 0.5) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, meleeRadius, a0, a1);
          ctx.closePath();
          ctx.fillStyle = "rgba(220, 0, 0, 0.18)";
          ctx.fill();
          ctx.strokeStyle = "rgba(220, 0, 0, 0.65)";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        }

        const rangedRadius = (Number(selectedPiece.rangedRadius ?? 0) / renderState.mapSize) * side;
        if (rangedRadius > 0.5) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, rangedRadius, a0, a1);
          ctx.closePath();
          ctx.strokeStyle = "rgba(255, 214, 0, 0.95)";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    if (renderState.pieces?.length) {
      for (const piece of renderState.pieces) {
        const cx = dx + (piece.x / renderState.mapSize) * side;
        const cy = dy + (piece.y / renderState.mapSize) * side;
        const w = (piece.w / renderState.mapSize) * side;
        const h = (piece.h / renderState.mapSize) * side;
        const rot = piece.rotation ?? 0;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);

        const isBroken = Number(piece.morale ?? 0) <= 0;
        ctx.fillStyle = isBroken ? "rgba(255,255,255,0.95)" : piece.color;
        ctx.fillRect(-w / 2, -h / 2, w, h);

        ctx.lineWidth = piece.id === selectedPieceId ? 3 : 2;
        ctx.strokeStyle = "rgba(17,17,17,0.9)";
        ctx.strokeRect(-w / 2, -h / 2, w, h);

        const barPadding = Math.max(2, Math.round(Math.min(w, h) * 0.08));
        const barThickness = Math.max(2, Math.round(Math.min(w, h) * 0.12));
        const symbolInset = Math.max(3, Math.round(Math.min(w, h) * 0.14));
        const barReserve = barPadding + barThickness + 4;
        const symbolTop = -h / 2 + symbolInset;
        const symbolBottom = h / 2 - barReserve;
        const symbolLeft = -w / 2 + symbolInset;
        const symbolRight = w / 2 - symbolInset;

        if (piece.type === "infantry") {
          ctx.save();
          ctx.strokeStyle = "rgba(0,0,0,0.82)";
          ctx.lineWidth = Math.max(2, Math.round(Math.min(w, h) * 0.06));
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(symbolLeft, symbolTop);
          ctx.lineTo(symbolRight, symbolBottom);
          ctx.moveTo(symbolRight, symbolTop);
          ctx.lineTo(symbolLeft, symbolBottom);
          ctx.stroke();
          ctx.restore();
        } else if (piece.type === "cavalry") {
          ctx.save();
          ctx.strokeStyle = "rgba(0,0,0,0.82)";
          ctx.lineWidth = Math.max(2, Math.round(Math.min(w, h) * 0.06));
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(symbolRight, symbolTop);
          ctx.lineTo(symbolLeft, symbolBottom);
          ctx.stroke();
          ctx.restore();
        } else if (piece.type === "artillery") {
          ctx.save();
          ctx.fillStyle = "rgba(0,0,0,0.9)";
          const dotR = Math.max(4, Math.round(Math.min(w, h) * 0.2));
          ctx.beginPath();
          ctx.arc(0, 0, dotR, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        const morale = clamp(Number(piece.morale ?? 0), 0, Number(piece.maxMorale ?? 0));
        const maxMorale = Math.max(1, Number(piece.maxMorale ?? 1));
        const moraleFrac = clamp(morale / maxMorale, 0, 1);
        const barY = h / 2 - barPadding - barThickness / 2;
        const barW = Math.max(2, w - barPadding * 2);
        const barX0 = -w / 2 + barPadding;

        ctx.save();
        ctx.translate(0, barY);
        ctx.fillStyle = "rgba(0,0,0,0.95)";
        ctx.fillRect(barX0, -barThickness / 2, barW, barThickness);
        const moraleHue = 120 * moraleFrac;
        ctx.fillStyle = `hsla(${moraleHue}, 90%, 42%, 0.95)`;
        ctx.fillRect(barX0, -barThickness / 2, barW * moraleFrac, barThickness);
        ctx.restore();

        const markerRadius = clamp(Math.round(Math.min(w, h) * 0.11), 2, 10);
        const markerInset = markerRadius + 2;
        ctx.beginPath();
        ctx.fillStyle = "rgba(0,0,0,0.95)";
        ctx.arc(0, -h / 2 + markerInset, markerRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    renderState.dx = dx;
    renderState.dy = dy;
    renderState.side = side;
  }

  function pointerToMapPoint(evt) {
    if (!renderState) return null;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / Math.max(1, rect.width);
    const sy = canvas.height / Math.max(1, rect.height);
    const x = (evt.clientX - rect.left) * sx;
    const y = (evt.clientY - rect.top) * sy;

    const { dx, dy, side, mapSize } = renderState;
    if (x < dx || y < dy || x > dx + side || y > dy + side) return null;

    const mx = clamp(Math.floor(((x - dx) / side) * mapSize), 0, mapSize - 1);
    const my = clamp(Math.floor(((y - dy) / side) * mapSize), 0, mapSize - 1);
    return { x: mx, y: my };
  }

  function paintAt(pt) {
    if (!renderState || !pt) return;
    const { overlayCtx, mapSize, terrain } = renderState;
    const r = activeTool === "forest" ? getBrushRadius(mapSize) * 2 : getBrushRadius(mapSize);

    overlayCtx.fillStyle = activeTool === "river" ? "#1e6ee6" : "#0b5f25";
    overlayCtx.beginPath();
    overlayCtx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
    overlayCtx.fill();

    const value = activeTool === "river" ? 2 : 1;
    if (!terrain) return;
    const minX = clamp(pt.x - r, 0, mapSize - 1);
    const maxX = clamp(pt.x + r, 0, mapSize - 1);
    const minY = clamp(pt.y - r, 0, mapSize - 1);
    const maxY = clamp(pt.y + r, 0, mapSize - 1);
    const r2 = r * r;

    for (let y = minY; y <= maxY; y++) {
      const dy = y - pt.y;
      for (let x = minX; x <= maxX; x++) {
        const dx = x - pt.x;
        if (dx * dx + dy * dy > r2) continue;
        terrain[y * mapSize + x] = value;
      }
    }
  }

  function findPieceAt(pt) {
    if (!renderState?.pieces?.length || !pt) return null;
    for (let i = renderState.pieces.length - 1; i >= 0; i--) {
      const piece = renderState.pieces[i];
      const rot = piece.rotation ?? 0;
      const dx = pt.x - piece.x;
      const dy = pt.y - piece.y;
      const c = Math.cos(-rot);
      const s = Math.sin(-rot);
      const lx = dx * c - dy * s;
      const ly = dx * s + dy * c;
      if (Math.abs(lx) <= piece.w / 2 && Math.abs(ly) <= piece.h / 2) return piece;
    }
    return null;
  }

	  function resetTurnForTeam(team) {
	    if (!renderState?.pieces?.length) return;
	    for (const piece of renderState.pieces) {
	      if (piece.team !== team) continue;
	      piece.didMove = false;
	      piece.didRotate = false;
	      piece.didShoot = false;
	      piece.didAttack = false;
	      piece.didRest = false;
	      piece.moveAnchorX = piece.x;
	      piece.moveAnchorY = piece.y;
	    }
	    setSelectedPieceStatus(getSelectedPiece());
	  }

	  function getAttackRadii(type) {
	    switch (type) {
	      case "infantry":
	        return { ranged: 400, melee: 50 };
	      case "artillery":
	        return { ranged: 1000, melee: 0 };
	      case "cavalry":
	        return { ranged: 0, melee: 50 };
	      default:
	        return { ranged: 0, melee: 0 };
	    }
	  }

	  function isPieceInAttackRadius(attacker, target, radius) {
	    const r = Number(radius ?? 0);
	    if (!Number.isFinite(r) || r <= 0) return false;
	    if (!attacker || !target) return false;

	    const rot = target.rotation ?? 0;
	    const dx = attacker.x - target.x;
	    const dy = attacker.y - target.y;
	    const c = Math.cos(-rot);
	    const s = Math.sin(-rot);
	    const lx = dx * c - dy * s;
	    const ly = dx * s + dy * c;
	    const hx = Number(target.w ?? 0) / 2;
	    const hy = Number(target.h ?? 0) / 2;
	    const cx = clamp(lx, -hx, hx);
	    const cy = clamp(ly, -hy, hy);
	    const ddx = lx - cx;
	    const ddy = ly - cy;
	    return ddx * ddx + ddy * ddy <= r * r;
	  }

  function setPiecePaletteEnabled(enabled) {
    const buttons = [
      "spawn-t1-inf",
      "spawn-t1-cav",
      "spawn-t1-art",
      "spawn-t2-inf",
      "spawn-t2-cav",
      "spawn-t2-art",
    ].map((id) => document.getElementById(id));

    for (const btn of buttons) {
      if (btn) btn.disabled = !enabled;
    }
  }

  function spawnPiece({ team, type }) {
    if (!renderState) return null;

    const mapSize = renderState.mapSize;
    const base = getPieceSize(mapSize);
    const margin = clamp(Math.round(base * 0.9), 10, Math.floor(mapSize / 6));
    const rx = margin + Math.floor(Math.random() * Math.max(1, mapSize - margin * 2));
    const ry = margin + Math.floor(Math.random() * Math.max(1, mapSize - margin * 2));

    const typeConfig = {
      infantry: { w: Math.round(base * 1.3), h: Math.round(base * 0.85), morale: 10, name: "Infantry" },
      cavalry: { w: Math.round(base * 1.55), h: Math.round(base * 0.85), morale: 15, name: "Cavalry" },
      artillery: { w: base, h: base, morale: 5, name: "Artillery" },
    }[type];

    if (!typeConfig) return null;

    const color = team === 2 ? "rgba(38, 92, 214, 0.92)" : "rgba(200, 46, 46, 0.92)";
    const id = `t${team}-${type}-${String(renderState.nextPieceId ?? 1)}`;
    renderState.nextPieceId = (renderState.nextPieceId ?? 1) + 1;

	    const piece = {
	      id,
	      team,
	      type,
	      name: `${typeConfig.name} (Team ${team})`,
	      morale: typeConfig.morale,
	      maxMorale: typeConfig.morale,
      moveRange: getMoveRange(type),
      rangedRadius: getAttackRadii(type).ranged,
      meleeRadius: getAttackRadii(type).melee,
      x: rx,
      y: ry,
      w: typeConfig.w,
      h: typeConfig.h,
      color,
      rotation: 0,
      didMove: false,
	      didRotate: false,
	      didShoot: false,
	      didAttack: false,
	      didRest: false,
	      moveAnchorX: rx,
	      moveAnchorY: ry,
	    };

    renderState.pieces.push(piece);
    selectPiece(piece);
    return piece;
  }

  function selectPiece(piece) {
    selectedPieceId = piece?.id ?? null;
    setSelectedPieceStatus(piece ?? null);
    if (piece) log(`${piece.name} selected.`);
    render();
  }

  function getElevationAt(pt) {
    if (!renderState?.elevations || !pt) return null;
    const idx = pt.y * renderState.mapSize + pt.x;
    return renderState.elevations[idx] ?? null;
  }

  function getTerrainAt(pt) {
    if (!renderState?.terrain || !pt) return 0;
    const idx = pt.y * renderState.mapSize + pt.x;
    return renderState.terrain[idx] ?? 0;
  }

  function lineCrossesRiver(a, b) {
    if (!renderState?.terrain || !a || !b) return false;
    const mapSize = renderState.mapSize;

    let x0 = a.x;
    let y0 = a.y;
    const x1 = b.x;
    const y1 = b.y;

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      if (renderState.terrain[y0 * mapSize + x0] === 2) return true;
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }

    return false;
  }

  function isTargetHiddenByHill(a, b) {
    if (!renderState?.elevations || !a || !b) return false;
    const mapSize = renderState.mapSize;

    const aElev = getElevationAt(a);
    const bElev = getElevationAt(b);
    if (aElev == null || bElev == null) return false;
    const threshold = Math.max(aElev, bElev);

    let x0 = a.x;
    let y0 = a.y;
    const x1 = b.x;
    const y1 = b.y;

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
      if (x0 === x1 && y0 === y1) break;

      const elev = renderState.elevations[y0 * mapSize + x0];
      if (elev != null && elev > threshold) return true;
    }

    return false;
  }

  function defenderOrientationMod(attacker, defender, cell) {
    const dx = attacker.x - defender.x;
    const dy = attacker.y - defender.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= 1e-9) return 0;

    const toAx = dx / dist;
    const toAy = dy / dist;
    const rot = defender.rotation ?? 0;
    const fx = Math.sin(rot);
    const fy = -Math.cos(rot);
    const dot = fx * toAx + fy * toAy;
    if (dot >= 0.707) return Number(cell.defenderFacingAttacker);
    if (dot <= -0.707) return Number(cell.defenderFacingAway);
    return Number(cell.defenderPerpendicular);
  }

  function defenderFacingBreakdown(attacker, defender, cell) {
    const dx = attacker.x - defender.x;
    const dy = attacker.y - defender.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= 1e-9) return { relation: "same tile", mod: 0 };

    const toAx = dx / dist;
    const toAy = dy / dist;
    const rot = defender.rotation ?? 0;
    const fx = Math.sin(rot);
    const fy = -Math.cos(rot);
    const dot = fx * toAx + fy * toAy;
    if (dot >= 0.707) return { relation: "toward", mod: Number(cell.attackingFromFront) };
    if (dot <= -0.707) return { relation: "away", mod: Number(cell.attackingFromRear) };
    return { relation: "side", mod: Number(cell.attackingFromSide) };
  }

	  function computeAttackDamage(attacker, defender, mode) {
	    if (!damageMatrix) damageMatrix = loadDamageMatrix();
	    const pair = damageMatrix?.[attacker.type]?.[defender.type] ?? defaultDamagePair();
	    const cell = mode === "melee" ? pair.melee : pair.ranged;

	    const attackerPt = { x: attacker.x, y: attacker.y };
	    const defenderPt = { x: defender.x, y: defender.y };

	    const aElev = getElevationAt(attackerPt);
	    const dElev = getElevationAt(defenderPt);
	    const attackerHigher = aElev != null && dElev != null && aElev > dElev;
	    const attackerLower = aElev != null && dElev != null && aElev < dElev;

	    const crossesRiver = lineCrossesRiver(attackerPt, defenderPt);
	    const defenderTerrain = getTerrainAt(defenderPt);
	    const defenderInForest = defenderTerrain === 1;

	    const base = Number(cell.base);
	    const elevMod = attackerHigher
	      ? Number(cell.attackingFromHigherElevation)
	      : attackerLower
	        ? Number(cell.attackingFromLowerElevation)
	        : 0;
	    const riverMod = crossesRiver ? Number(cell.attackingAcrossRiver) : 0;
	    const terrainMod = defenderInForest ? Number(cell.attackingInForest) : Number(cell.attackingInPlains);
	    const orientMod = defenderFacingBreakdown(attacker, defender, cell).mod;

	    const raw = base + elevMod + riverMod + terrainMod + orientMod;
	    return clamp(Math.round(raw), 0, 999);
	  }

	  function computeAttackDamageBreakdown(attacker, defender, mode) {
	    if (!damageMatrix) damageMatrix = loadDamageMatrix();
	    const pair = damageMatrix?.[attacker.type]?.[defender.type] ?? defaultDamagePair();
	    const cell = mode === "melee" ? pair.melee : pair.ranged;

	    const attackerPt = { x: attacker.x, y: attacker.y };
	    const defenderPt = { x: defender.x, y: defender.y };

    const aElev = getElevationAt(attackerPt);
    const dElev = getElevationAt(defenderPt);
    const elevationRelation =
      aElev == null || dElev == null ? "unknown" : aElev > dElev ? "higher" : aElev < dElev ? "lower" : "same";

	    const attackerHigher = elevationRelation === "higher";
	    const attackerLower = elevationRelation === "lower";
	    const crossesRiver = lineCrossesRiver(attackerPt, defenderPt);
	    const terrain = getTerrainAt(defenderPt);
	    const defenderInForest = terrain === 1;

	    const base = Number(cell.base);
	    const elevMod = attackerHigher
	      ? Number(cell.attackingFromHigherElevation)
	      : attackerLower
	        ? Number(cell.attackingFromLowerElevation)
	        : 0;
	    const riverMod = crossesRiver ? Number(cell.attackingAcrossRiver) : 0;
	    const terrainMod = defenderInForest ? Number(cell.attackingInForest) : Number(cell.attackingInPlains);
	    const facing = defenderFacingBreakdown(attacker, defender, cell);
	    const orientMod = facing.mod;

    const raw = base + elevMod + riverMod + terrainMod + orientMod;
    const damage = clamp(Math.round(raw), 0, 999);
    return {
      damage,
	      base,
	      elevationRelation,
	      elevMod,
	      crossesRiver,
	      riverMod,
	      defenderInForest,
	      terrainMod,
	      defenderFacing: facing.relation,
	      orientMod,
	    };
	  }

	  function canAttackPiece(piece) {
	    if (!piece) return false;
	    if (!renderState) return false;
	    if (piece.team !== turnTeam) return false;
	    if (Number(piece.morale ?? 0) <= 0) return false;
	    if (piece.didRest === true) return false;
	    if (piece.type === "artillery") {
	      const terrain = getTerrainAt({ x: piece.x, y: piece.y });
	      if (terrain === 1) return false;
	    }
	    return !piece.didAttack;
	  }

	  function attemptAttack(attacker, defender) {
	    if (!attacker || !defender) return false;
	    if (attacker.team === defender.team) return false;
	    if (!canAttackPiece(attacker)) return false;
	    if (Number(defender.morale ?? 0) <= 0) return { ok: false, reason: "destroyed" };

	    if (!isTargetInFront(attacker, defender)) return { ok: false, reason: "behind" };

	    const meleeRadius = Number(attacker.meleeRadius ?? 0);
	    const rangedRadius = Number(attacker.rangedRadius ?? 0);
	    const inMelee = isPieceInAttackRadius(attacker, defender, meleeRadius);
	    const inRanged = isPieceInAttackRadius(attacker, defender, rangedRadius);

	    if (!inMelee && !inRanged) return { ok: false, reason: "range" };

    const mode = inMelee ? "melee" : "ranged";
    if (mode === "ranged" && attacker.type !== "artillery") {
      const attackerPt = { x: attacker.x, y: attacker.y };
      const defenderPt = { x: defender.x, y: defender.y };
      if (isTargetHiddenByHill(attackerPt, defenderPt)) return { ok: false, reason: "hidden" };
    }
    const damage = computeAttackDamage(attacker, defender, mode);
    defender.morale = clamp(Number(defender.morale ?? 0) - damage, 0, Number(defender.maxMorale ?? 999));
    attacker.didAttack = true;
    log(`${attacker.name} ${mode}-attacked ${defender.name} for ${damage} morale damage.`);

    if (defender.morale <= 0) log(`${defender.name} broke (0 morale).`);
    setSelectedPieceStatus(getSelectedPiece());

    render();
    return { ok: true, mode, damage };
  }

  function clear() {
    running = false;
    startBtn.disabled = false;
    resetBtn.disabled = false;
    if (mapSettingsEl) {
      mapSettingsEl.classList.remove("is-hidden");
      mapSettingsEl.removeAttribute("aria-hidden");
    }
    setDrawingEnabled(true);
    logLines = [];
    logEl.textContent = "";
    setStatus({ size: null, scale: null, octaves: null, ms: null });
    setSelectedPieceStatus(null);
    renderState = null;
    isPainting = false;
    selectedPieceId = null;
    draggingPieceId = null;
    dragOrigin = null;
    dragStart = null;
    rotatingPieceId = null;
    rotateStartRotation = null;
    setPiecePaletteEnabled(false);
    if (endTurnBtn) endTurnBtn.disabled = true;
    if (turnIndicatorEl) {
      turnIndicatorEl.textContent = "Turn: -";
      turnIndicatorEl.classList.remove("is-red", "is-blue");
    }
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  async function start() {
    if (running) return;
    running = true;
    startBtn.disabled = true;
    resetBtn.disabled = true;

    const size = clamp(Number(sizeEl.value || 1024), 256, 2048);
    const scale = clamp(Number(scaleEl.value || 160), 8, 2048);
    const octaves = clamp(Number(octavesEl.value || 4), 1, 8);
    const seedText = randomSeedText();

    logLines = [];
    logEl.textContent = "";
    setStatus({ size, scale, octaves, ms: null });

    log(`Generating ${size}×${size} elevation map...`);
    log(`Seed="${seedText}", scale=${scale}, octaves=${octaves}`);

    try {
      const { canvas: mapCanvas, ms, elevations } = await generateElevationCanvas({
        size,
        scale,
        octaves,
        seedText,
        onProgress: (p) => {
          if (!Number.isFinite(p) || p <= 0 || p >= 1) return;
          const pct = Math.floor(p * 100);
          if (pct % 10 === 0) log(`Progress: ${pct}%`);
        },
      });

      const overlayCanvas = document.createElement("canvas");
      overlayCanvas.width = size;
      overlayCanvas.height = size;
      const overlayCtx = overlayCanvas.getContext("2d");
      overlayCtx.clearRect(0, 0, size, size);

      const pieces = [];
      const terrain = new Uint8Array(size * size);
      renderState = {
        mapSize: size,
        baseCanvas: mapCanvas,
        overlayCanvas,
        overlayCtx,
        elevations,
        terrain,
        pieces,
        nextPieceId: 1,
        dx: 0,
        dy: 0,
        side: 0,
      };
      selectPiece(null);
      setPiecePaletteEnabled(true);
      if (endTurnBtn) endTurnBtn.disabled = false;
      setTurn(1);
      resetTurnForTeam(1);
      spawnPiece({ team: 1, type: "infantry" });
      render();
      setStatus({ size, scale, octaves, ms });
      log(`Done in ${ms}ms.`);
    } catch (err) {
      log(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      running = false;
      startBtn.disabled = false;
      resetBtn.disabled = false;
    }
  }

  forestBtn.addEventListener("click", () => setTool("forest"));
  riverBtn.addEventListener("click", () => setTool("river"));
  startBtn.addEventListener("click", start);
  resetBtn.addEventListener("click", clear);
	  endTurnBtn?.addEventListener("click", () => {
	    const next = turnTeam === 2 ? 1 : 2;
	    setTurn(next);
	    resetTurnForTeam(next);
	    log(`${next === 2 ? "Blue" : "Red"} turn.`);
	  });

	  matrixExportCsvBtn?.addEventListener("click", () => {
	    if (!damageMatrix) damageMatrix = loadDamageMatrix();
	    const csv = damageMatrixToCsv(damageMatrix);
	    downloadText("damage-matrix.csv", csv, "text/csv");
	  });

	  restBtn?.addEventListener("click", () => {
	    const piece = getSelectedPiece();
	    if (!piece) return;
	    if (piece.team !== turnTeam) {
	      log("You can only rest with the active team.");
	      return;
	    }
	    if (!canRestPiece(piece)) {
	      log("Cannot rest: this unit already acted this turn.");
	      return;
	    }
	    const maxMorale = Number(piece.maxMorale ?? 999);
	    piece.morale = clamp(Number(piece.morale ?? 0) + 2, 0, maxMorale);
	    piece.didRest = true;
	    log(`${piece.name} rested (+2 morale).`);
	    setSelectedPieceStatus(piece);
	    render();
	  });

  canvas.addEventListener("contextmenu", (evt) => {
    evt.preventDefault();
  });

  document.getElementById("spawn-t1-inf")?.addEventListener("click", () => spawnPiece({ team: 1, type: "infantry" }));
  document.getElementById("spawn-t1-cav")?.addEventListener("click", () => spawnPiece({ team: 1, type: "cavalry" }));
  document.getElementById("spawn-t1-art")?.addEventListener("click", () => spawnPiece({ team: 1, type: "artillery" }));
  document.getElementById("spawn-t2-inf")?.addEventListener("click", () => spawnPiece({ team: 2, type: "infantry" }));
  document.getElementById("spawn-t2-cav")?.addEventListener("click", () => spawnPiece({ team: 2, type: "cavalry" }));
  document.getElementById("spawn-t2-art")?.addEventListener("click", () => spawnPiece({ team: 2, type: "artillery" }));

	  canvas.addEventListener("pointerdown", (evt) => {
	    if (!renderState) return;
	    const pt = pointerToMapPoint(evt);
	    if (!pt) return;
	    if (evt.button === 2) {
      const attacker = getSelectedPiece();
      const target = findPieceAt(pt);
      if (!attacker) {
        log("Select one of your units before attacking.");
        return;
      }
      if (!target) {
        log("Right-click an enemy unit to attack.");
        return;
      }
      if (target.team === attacker.team) {
        log("Cannot attack a friendly unit.");
        return;
      }
      if (attacker.team !== turnTeam) {
        log("You can only attack with the active team.");
        return;
      }
	      if (!canAttackPiece(attacker)) {
	        if (Number(attacker.morale ?? 0) <= 0) log("This unit is broken (0 morale) and cannot attack.");
	        else if (attacker.didRest) log("This unit rested this turn and cannot attack.");
	        else if (attacker.type === "artillery" && getTerrainAt({ x: attacker.x, y: attacker.y }) === 1)
	          log("Artillery cannot attack while in a forest.");
	        else log(`${attacker.name} cannot attack again this turn.`);
	        return;
	      }
      const result = attemptAttack(attacker, target);
      if (!result?.ok) {
        if (result?.reason === "behind") log("Target must be in front of the attacker.");
        else if (result?.reason === "destroyed") log("Target already has 0 morale.");
        else if (result?.reason === "hidden") log("Target is hidden!");
        else log("Target out of range.");
      }
      return;
    }
    const piece = findPieceAt(pt);
	    if (piece) {
      isPainting = false;
      selectPiece(piece);
      if (evt.ctrlKey && canRotatePiece(piece)) {
        rotatingPieceId = piece.id;
        rotateStartRotation = piece.rotation ?? 0;
        canvas.setPointerCapture(evt.pointerId);
      } else if (canMovePiece(piece) && !evt.ctrlKey) {
        draggingPieceId = piece.id;
        dragOrigin = { x: piece.moveAnchorX ?? piece.x, y: piece.moveAnchorY ?? piece.y };
        dragStart = { x: piece.x, y: piece.y };
        canvas.setPointerCapture(evt.pointerId);
	      } else if (!evt.ctrlKey) {
	        if (piece.team !== turnTeam) log("Cannot move: not your turn for this unit.");
	        else if (piece.didRest) log("Cannot move: this unit rested this turn.");
	        else if (piece.didMove) log("Cannot move: this unit already moved this turn.");
	      }
	      return;
	    }
    if (!drawingEnabled) return;
    isPainting = true;
    canvas.setPointerCapture(evt.pointerId);
    paintAt(pt);
    render();
  });

  canvas.addEventListener("pointermove", (evt) => {
    const pt = pointerToMapPoint(evt);
    if (!renderState || !pt) return;
    if (evt.pointerType === "mouse" && !isPainting && !draggingPieceId && !rotatingPieceId) {
      const attacker = getSelectedPiece();
      const target = findPieceAt(pt);
      if (
        attacker &&
        canAttackPiece(attacker) &&
        target &&
        target.team !== attacker.team &&
        Number(target.morale ?? 0) > 0 &&
        isTargetInFront(attacker, target)
      ) {
	        const meleeRadius = Number(attacker.meleeRadius ?? 0);
	        const rangedRadius = Number(attacker.rangedRadius ?? 0);
	        const inMelee = isPieceInAttackRadius(attacker, target, meleeRadius);
	        const inRanged = isPieceInAttackRadius(attacker, target, rangedRadius);
	        if (inMelee || inRanged) {
          const mode = inMelee ? "melee" : "ranged";
          if (mode === "ranged" && attacker.type !== "artillery") {
            const attackerPt = { x: attacker.x, y: attacker.y };
            const defenderPt = { x: target.x, y: target.y };
            if (isTargetHiddenByHill(attackerPt, defenderPt)) {
              showHoverTooltip("Target is hidden!", evt);
              return;
            }
          }
          const breakdown = computeAttackDamageBreakdown(attacker, target, mode);
          const elevationLabel =
            breakdown.elevationRelation === "higher"
              ? "attacker higher"
              : breakdown.elevationRelation === "lower"
                ? "attacker lower"
                : breakdown.elevationRelation === "same"
                  ? "same"
                  : "unknown";

	          const lines = [
	            `Base: ${breakdown.base}`,
	            `Elevation (${elevationLabel}): ${breakdown.elevMod}`,
	            `Across river (${breakdown.crossesRiver ? "yes" : "no"}): ${breakdown.riverMod}`,
	            `Terrain (${breakdown.defenderInForest ? "forest" : "plains"}): ${breakdown.terrainMod}`,
	            `Defender facing (${breakdown.defenderFacing}): ${breakdown.orientMod}`,
	            "_____",
	            `Total (${mode === "melee" ? "melee" : "ranged"}): ${breakdown.damage}`,
	          ];
          showHoverTooltip(lines.join("\n"), evt);
        } else {
          hideHoverTooltip();
        }
      } else {
        hideHoverTooltip();
      }
    } else {
      hideHoverTooltip();
    }
    if (rotatingPieceId) {
      const piece = getSelectedPiece();
      if (!piece || piece.id !== rotatingPieceId) return;
      const dx = pt.x - piece.x;
      const dy = pt.y - piece.y;
      if (dx === 0 && dy === 0) return;
      piece.rotation = Math.atan2(dx, -dy);
      render();
      return;
    }
    if (draggingPieceId && dragOrigin) {
      const piece = getSelectedPiece();
      if (!piece || piece.id !== draggingPieceId) return;

      const dx = pt.x - dragOrigin.x;
      const dy = pt.y - dragOrigin.y;
      const dist = Math.hypot(dx, dy);
      const moveRange = Number(piece.moveRange ?? getMoveRange(piece.type));
      if (dist <= moveRange) {
        piece.x = pt.x;
        piece.y = pt.y;
      } else if (dist > 0) {
        const s = moveRange / dist;
        piece.x = clamp(Math.round(dragOrigin.x + dx * s), 0, renderState.mapSize - 1);
        piece.y = clamp(Math.round(dragOrigin.y + dy * s), 0, renderState.mapSize - 1);
      }
      render();
      return;
    }

    if (!isPainting) return;
    paintAt(pt);
    render();
  });

  function endPaint() {
    isPainting = false;
  }

  function endPointer() {
    if (rotatingPieceId) {
      const piece = getSelectedPiece();
      if (piece && rotateStartRotation != null) {
        const delta = Math.abs((piece.rotation ?? 0) - rotateStartRotation);
        if (delta > 0.01) {
          piece.didRotate = true;
          log(`${piece.name} rotated.`);
          setSelectedPieceStatus(piece);
        }
      }
      rotatingPieceId = null;
      rotateStartRotation = null;
      render();
    }
    if (draggingPieceId) {
      const piece = getSelectedPiece();
      if (piece && dragStart && (piece.x !== dragStart.x || piece.y !== dragStart.y)) {
        piece.didMove = true;
        log(`${piece.name} moved.`);
        setSelectedPieceStatus(piece);
      }
      draggingPieceId = null;
      dragOrigin = null;
      dragStart = null;
      render();
    }
    endPaint();
  }

  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("pointerleave", endPointer);
  canvas.addEventListener("pointerleave", hideHoverTooltip);
  canvas.addEventListener("pointercancel", hideHoverTooltip);

  window.addEventListener("resize", () => {
    resizeCanvasToDisplaySize();
    render();
  });

  clear();
  setTool("forest");
  setTurn(1);
  const hadStoredMatrixAtBoot = hasValidStoredDamageMatrix();
  damageMatrix = loadDamageMatrix();
  buildAttackMatrixTable();

  loadDamageMatrixFromApi().then(({ apiAvailable, matrix: apiMatrix }) => {
    if (apiAvailable) {
      matrixApiAvailable = true;
      setMatrixSaveStatus("Auto-save enabled");
      if (apiMatrix) {
        damageMatrix = apiMatrix;
        saveDamageMatrix(damageMatrix);
        buildAttackMatrixTable();
        log("Loaded damage matrix from server.");
      } else {
        log("Damage matrix API available (auto-save enabled).");
      }
      return;
    }

    loadDamageMatrixFromFile().then((fileMatrix) => {
      if (hadStoredMatrixAtBoot || hasValidStoredDamageMatrix()) return;
      if (!fileMatrix) return;
      damageMatrix = fileMatrix;
      saveDamageMatrix(damageMatrix);
      buildAttackMatrixTable();
      log("Loaded damage matrix from damage-matrix.md.");
    });
  });
}

window.addEventListener("DOMContentLoaded", init);
