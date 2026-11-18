/* Stochastic, parametric L-system garden with damped branch oscillators.
 * Leaves are rigid cached silhouettes owned by their branch.
 * A = growing apex, F = internode, L = leaf, [ / ] = turtle push / pop.
 * Each A rewrites as F L [A]…A; branch production is stochastic.
 * Turtle positions and directions are 3D. Geometry is projected only at draw
 * time, then sorted back-to-front so crossings and lighting express depth.
 */
(() => {
  "use strict";

  const canvas = document.getElementById("garden-background");
  const ctx = canvas?.getContext("2d");
  if (!ctx) return;

  // Set to true to restore camera-distance shading on branches and foliage.
  const DEPTH_SHADING_ENABLED = false;
  const LEAVES_ENABLED = document.documentElement.dataset.leaves !== "off";
  const PROFILE_ANIMATION = new URLSearchParams(location.search).has("gardenProfile");

  const TAU = Math.PI * 2;
  const random = (low, high) => low + Math.random() * (high - low);
  const chance = (probability) => Math.random() < probability;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const materialLightness = (base, depth, neutral, low = 8, high = 92) =>
    clamp(base + (DEPTH_SHADING_ENABLED ? depth - neutral : 0), low, high);
  const add = (a, b) => a.map((v, i) => v + b[i]);
  const scale = (v, s) => v.map((n) => n * s);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = (v) => scale(v, 1 / (Math.hypot(...v) || 1));
  const vary = (mean, variance) => mean + random(-variance, variance);
  const IDENTITY_ROTATION = [0, 0, 0, 1];
  const subtract = (a, b) => a.map((value, i) => value - b[i]);
  function perpendicularAxes(direction) {
    const reference = Math.abs(direction[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0];
    const u = unit(cross(direction, reference));
    return [u, unit(cross(direction, u))];
  }
  const flowerPatterns = [
    { name: "Circle / 6-fold", shape: "circle", petals: 6 },
    { name: "Oval / 5-fold", shape: "oval", petals: 5 },
    { name: "Triangle / 6-fold", shape: "triangle", petals: 6 },
    { name: "Square / 4-fold", shape: "square", petals: 4 },
    { name: "Diamond / 8-fold", shape: "diamond", petals: 8 },
    { name: "Hexagon / 6-fold", shape: "hexagon", petals: 6 }
  ];

  // Every plant gets its own complete parameter set, sampled once on load.
  // Angles are radians, lengths are model units, colors are HSL.
  function parameters(small = chance(0.25)) {
    return {
      rootX: random(0, 1), // fraction of viewport width plus 50px on each side
      rootZ: random(-4200, 700), // scene depth; negative is farther away
      heightFraction: small ? random(0.05, 0.3) : random(0.3, 1.1),
      branchingProbability: random(0.96, 1),
      branchesPerNode: chance(0.94) ? 2 : 3, // includes the continuing stem
      branchingFrequency: 1,
      minimumHeightBeforeFirstBranch: small ? random(55, 100) : random(240, 380),
      branchingOrderLimit: Math.round(random(3, 4)),
      meanBranchingAngle: random(0.45, 0.85),
      branchAngleVariance: random(0.08, 0.28),
      branchLengthReductionRatio: random(0.8, 0.94),
      branchThicknessReductionRatio: random(0.90, 0.94),
      internodeLength: small ? random(18, 30) : random(42, 60),
      internodeLengthVariance: random(4, 10),
      initialStemDiameter: small ? random(2, 12) : random(14, 66),
      daughterToParentBranchDiameterRatio: random(0.65, 0.78),
      minimumBranchDiameter: small ? random(0.35, 0.65) : random(0.9, 1.3),
      branchColor: [random(20, 35), random(35, 55), random(27, 35)],
      leavesPerNode: Math.round(random(4, 7)),
      leafDivergenceAngle: random(2.1, 2.6),
      leafDivergenceVariance: random(0.1, 0.45),
      distanceBetweenLeafBearingNodes: 1,
      leafDensity: random(0.94, 1),
      leafClusteringStrength: random(0.1, 0.35),
      probabilityNodeDevelopsLeaf: random(0.94, 1),
      // Entries are weights sampled from base to tip / thin to thick.
      leafDistributionByHeight: [random(0.45, 0.65), 0.9, 1],
      leafDistributionByBranchSize: [1, 0.95, random(0.5, 0.7)],
      leafShape: ["lance", "oval", "heart"][Math.floor(random(0, 3))],
      leafShapeVariance: random(0.08, 0.25),
      leafColor: [random(85, 145), random(25, 43), random(27, 39)],
      leafColorVariance: [12, 7, 8],
      leafSize: random(12, 24),
      leafSizeVariance: random(3, 7),
      hasFlowers: chance(0.6),
      flowerPattern: flowerPatterns[Math.floor(random(0, flowerPatterns.length))].name,
      flowerColor: [random(0, 360), random(65, 85), random(48, 65)],
      flowerSize: random(7, 14),
      flowerDensity: random(0.15, 0.45),
      flowerClusteringStrength: random(0, 0.7),
      probabilityNodeDevelopsFlower: random(0.2, 0.55),
      flowerDistributionByHeight: [0, 0.55, 1],
      flowerDistributionByBranchSize: [1, 0.5, 0.05],
      flowerSizeVariance: random(1, 4),
      iterations: Math.round(random(18, 22))
    };
  }

  // Construct a local frame around any 3D stem, then turn on a cone.
  function turn(direction, angle, azimuth) {
    const reference = Math.abs(direction[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0];
    const u = unit(cross(direction, reference));
    const v = cross(direction, u);
    return unit(add(scale(direction, Math.cos(angle)),
      add(scale(u, Math.sin(angle) * Math.cos(azimuth)), scale(v, Math.sin(angle) * Math.sin(azimuth)))));
  }

  function grow(p) {
    const initialDirection = unit([random(-0.12, 0.12), 1, random(-0.1, 0.1)]);
    let word = [{ type: "A", order: 0, node: 0, diameter: p.initialStemDiameter,
      position: [0, 0, 0], direction: initialDirection }];
    let internodes = 0;
    for (let generation = 0; generation < p.iterations; generation++) {
      word = word.flatMap((symbol) => {
        if (symbol.type !== "A") return [symbol];
        const { order, node, diameter } = symbol;
        // Bound rare explosive derivations while keeping the sampled genetics.
        if (diameter < p.minimumBranchDiameter || internodes >= 400) return [];
        internodes++;
        const nextDiameter = diameter * p.branchThicknessReductionRatio;
        const internode = { type: "F", order,
          length: Math.max(3, vary(p.internodeLength, p.internodeLengthVariance)) * p.branchLengthReductionRatio ** order,
          diameter, bend: random(0.01, 0.09), azimuth: random(0, TAU) };
        const direction = turn(symbol.direction, internode.bend, internode.azimuth);
        const position = add(symbol.position, scale(direction, internode.length));
        const result = [internode, { type: "L", order, node, diameter, generation }];
        // Apices carry the same 3D pose used by the turtle: the height gate is
        // actual world Y, rather than an approximate internode count.
        if (position[1] >= p.minimumHeightBeforeFirstBranch && node >= 2 && order < p.branchingOrderLimit && node % p.branchingFrequency === 0 && chance(p.branchingProbability)) {
          for (let child = 1; child < p.branchesPerNode; child++) {
            const rotation = { type: "[", angle: vary(p.meanBranchingAngle, p.branchAngleVariance), azimuth: random(0, TAU) };
            result.push(
              rotation,
              { type: "A", order: order + 1, node: 0, diameter: diameter * p.daughterToParentBranchDiameterRatio,
                position, direction: turn(direction, rotation.angle, rotation.azimuth) },
              { type: "]" }
            );
          }
        }
        result.push({ type: "A", order, node: node + 1, diameter: nextDiameter, position, direction });
        return result;
      });
    }

    const geometry = [];
    const stack = [];
    let turtle = { position: [0, 0, 0], direction: initialDirection, branch: null };
    for (const symbol of word) {
      if (symbol.type === "[") {
        stack.push({ ...turtle });
        turtle = { ...turtle, direction: turn(turtle.direction, symbol.angle, symbol.azimuth) };
      } else if (symbol.type === "]") {
        turtle = stack.pop();
      } else if (symbol.type === "F") {
        const direction = turn(turtle.direction, symbol.bend, symbol.azimuth);
        const end = add(turtle.position, scale(direction, symbol.length));
        const branch = { type: "branch", start: turtle.position, end, diameter: symbol.diameter,
          order: symbol.order, parent: turtle.branch, mechanics: branchMechanics(symbol.length, symbol.diameter) };
        geometry.push(branch);
        turtle = { position: end, direction, branch };
      } else if (symbol.type === "L") {
        if (p.hasFlowers && chance(p.probabilityNodeDevelopsFlower)) {
          const count = 1 + Math.round(p.flowerClusteringStrength * random(0, 4));
          for (let flower = 0; flower < count; flower++) {
            if (!chance(p.flowerDensity)) continue;
            const size = Math.max(3, vary(p.flowerSize, p.flowerSizeVariance));
            const offset = turn(turtle.direction, random(0.4, 1.3), random(0, TAU));
            geometry.push({ type: "flower", start: turtle.position,
              end: add(turtle.position, scale(offset, size * random(0.7, 1.8))),
              diameter: symbol.diameter, size, rotation: random(0, TAU), lottery: Math.random(), branch: turtle.branch });
          }
        }
        if (symbol.node % p.distanceBetweenLeafBearingNodes !== 0 || !chance(p.probabilityNodeDevelopsLeaf)) continue;
        const cluster = 1 + Math.round(p.leafClusteringStrength * random(0, 3));
        for (let leaf = 0; leaf < p.leavesPerNode * cluster; leaf++) {
          if (!chance(p.leafDensity)) continue;
          const azimuth = (symbol.node + leaf) * p.leafDivergenceAngle + vary(0, p.leafDivergenceVariance);
          const direction = turn(turtle.direction, random(0.65, 1.5), azimuth);
          const size = Math.max(4, vary(p.leafSize, p.leafSizeVariance));
          geometry.push({ type: "leaf", start: turtle.position, end: add(turtle.position, scale(direction, size)),
            size, diameter: symbol.diameter, width: vary(p.leafShape === "lance" ? 0.22 : 0.45, p.leafShapeVariance),
            shape: p.leafShape, color: p.leafColor.map((n, i) => vary(n, p.leafColorVariance[i])), roll: random(0.45, 1), lottery: Math.random(), branch: turtle.branch });
        }
      }
    }
    const height = geometry.reduce((highest, g) => Math.max(highest, g.end[1]), 1);
    const weight = (weights, fraction) => weights[Math.min(2, Math.floor(clamp(fraction, 0, 1) * 3))];
    return geometry.filter((g) => {
      if (g.type === "branch") return true;
      const byHeight = g.type === "flower" ? p.flowerDistributionByHeight : p.leafDistributionByHeight;
      const bySize = g.type === "flower" ? p.flowerDistributionByBranchSize : p.leafDistributionByBranchSize;
      return g.lottery < weight(byHeight, g.start[1] / height) * weight(bySize, g.diameter / p.initialStemDiameter);
    });
  }

  // Size variation only: botanical classifications are a future experiment.
  // Independent X/Z samples keep both height ranges scattered through the scene.
  const configurations = Array.from({ length: 15 }, (_, index) => parameters(index < 5));
  // Keep both flowering and flowerless trees in each experimental garden.
  if (configurations.every((config) => config.hasFlowers)) configurations[4].hasFlowers = false;
  if (configurations.every((config) => !config.hasFlowers)) configurations[0].hasFlowers = true;
  const plants = configurations.map((config) => {
    let geometry = grow(config);
    // Very sparse parameter combinations can shed every leaf. Try a fresh
    // derivation so this garden usually has foliage on every plant.
    for (let retry = 0; retry < 8 && !geometry.some((part) => part.type === "leaf"); retry++) {
      geometry = grow(config);
    }
    return { config, geometry, height: geometry.reduce((highest, g) => Math.max(highest, g.end[1]), 1) };
  });

  // Sample once, so leaf litter keeps its sources and placement on resize.
  const fallenLeaves = Array.from({ length: 100 }, () => {
    const sourcePlantIndex = Math.floor(random(0, plants.length));
    const source = plants[sourcePlantIndex];
    const leaf = source.geometry.find((part) => part.type === "leaf");
    return { sourcePlantIndex, x: random(0.02, 0.98), y: random(0.12, 0.88),
      shape: source.config.leafShape, length: (leaf?.size || source.config.leafSize) * random(0.7, 1.2),
      breadthRatio: Math.max(0.12, leaf?.width || 0.3), rotation: random(0, TAU),
      color: [random(18, 38), random(30, 60), random(20, 52)] };
  });

  function leafPath(length, breadth, shape) {
    const path = new Path2D();
    path.moveTo(0, 0);
    const shoulder = shape === "heart" ? -length * 0.22 : length * 0.32;
    path.bezierCurveTo(shoulder, -breadth, length * 0.72, -breadth, length, 0);
    path.bezierCurveTo(length * 0.72, breadth, shoulder, breadth, 0, 0);
    path.closePath();
    return path;
  }

  // Build a complete rosette from identical primitive petals rotated evenly
  // around a center. The same path is used for painting and hover detection.
  function flowerPath(pattern, radius, rotation) {
    const petal = new Path2D();
    const r = radius;
    if (pattern.shape === "circle") petal.arc(r * 0.58, 0, r * 0.42, 0, TAU);
    else if (pattern.shape === "oval") petal.ellipse(r * 0.55, 0, r * 0.48, r * 0.24, 0, 0, TAU);
    else if (pattern.shape === "square") petal.rect(r * 0.3, -r * 0.28, r * 0.56, r * 0.56);
    else {
      const vertices = pattern.shape === "triangle" ? [[0.12, -0.28], [1, 0], [0.12, 0.28]]
        : pattern.shape === "diamond" ? [[0.08, 0], [0.55, -0.3], [1, 0], [0.55, 0.3]]
        : Array.from({ length: 6 }, (_, i) => [0.6 + 0.38 * Math.cos(i * TAU / 6), 0.38 * Math.sin(i * TAU / 6)]);
      vertices.forEach(([x, y], i) => i === 0 ? petal.moveTo(x * r, y * r) : petal.lineTo(x * r, y * r));
      petal.closePath();
    }
    const path = new Path2D();
    for (let i = 0; i < pattern.petals; i++) {
      path.addPath(petal, new DOMMatrix().rotate((rotation + i * TAU / pattern.petals) * 180 / Math.PI));
    }
    path.moveTo(radius * 0.22, 0);
    path.arc(0, 0, radius * 0.22, 0, TAU);
    return path;
  }

  // Stylized wood: SI-scaled model lengths/radii, a fixed density and soft
  // Young's modulus. J=mL²/3, k=3EI/L, c=2ζ√(kJ), ωn=√(k/J).
  function branchMechanics(length, diameter) {
    const L = Math.max(0.05, length * 0.025);
    const r = Math.max(0.001, diameter * 0.0025);
    const mass = 450 * Math.PI * r * r * L;
    const inertia = mass * L * L / 3;
    const stiffness = 3 * 80000 * Math.PI * r ** 4 / (4 * L);
    const dampingRatio = 0.28;
    const naturalFrequency = Math.sqrt(stiffness / inertia);
    const mechanics = { inertia, stiffness, damping: 2 * dampingRatio * Math.sqrt(stiffness * inertia),
      naturalFrequency, dampingRatio, phase: random(0, TAU),
      amplitude: clamp(0.0018 * Math.sqrt(length / diameter), 0.001, 0.008) };
    // Frequency response is fixed by the branch geometry. Cache both wind
    // channels instead of recomputing square roots and phase lags every frame.
    mechanics.responses = [[0, 1, 1], [Math.PI * 0.37, 0.83, 0.8]].map(([phase, windScale, amplitudeScale]) =>
      [[0.72, 1], [1.13, 0.35]].map(([baseFrequency, strength]) => {
        const frequency = baseFrequency * windScale;
        const ratio = frequency / naturalFrequency;
        const gain = 1 / Math.hypot(1 - ratio * ratio, 2 * dampingRatio * ratio);
        return { frequency,
          amplitude: mechanics.amplitude * strength * amplitudeScale * Math.min(2, gain),
          phase: mechanics.phase + phase - Math.atan2(2 * dampingRatio * ratio, 1 - ratio * ratio) };
      }));
    return mechanics;
  }

  function branchAngle(mechanics, seconds, channel = 0) {
    // Steady-state response of a damped oscillator to two gentle wind gusts.
    // Frequency-dependent gain and phase differ on every branch; thick stems
    // bend less. Analytical response avoids unstable integration after a pause.
    let angle = 0;
    for (const response of mechanics.responses[channel]) {
      angle += response.amplitude * Math.sin(seconds * response.frequency + response.phase);
    }
    return angle;
  }

  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const motionDisabled = () => document.documentElement.dataset.animations === "off" || motionPreference.matches;
  let scene = null;
  let dirty = true;
  let animationId = 0;
  let lastFrame = 0;
  let animationTime = 0;
  let frameInterval = 1000 / 24;
  let skyScheduled = false;
  const frameStats = { total: 0, motion: 0, projection: 0, sort: 0, paint: 0,
    leafClustersDrawn: 0, cachedLeaves: 0, leafClusters: 0,
    hover: 0, hoverRecords: 0, foliageProjected: 0, foliageCulled: 0, visibleParts: 0,
    veinsDrawn: 0, veinsOmitted: 0 };
  if (PROFILE_ANIMATION) {
    Object.defineProperty(window, "gardenPerformance", {
      value: { snapshot: () => ({ ...frameStats, totalParts: scene?.parts.length || 0 }) }, configurable: true
    });
  }

  // Reuse motion outputs and scratch arrays across frames.
  const scratchU = [0, 0, 0];
  const scratchV = [0, 0, 0];
  function quaternionInto(out, axis, angle) {
    const sine = Math.sin(angle / 2);
    out[0] = axis[0] * sine;out[1] = axis[1] * sine;out[2] = axis[2] * sine;out[3] = Math.cos(angle / 2);
  }
  function composeInto(out, a, b) {
    const [ax, ay, az, aw] = a, [bx, by, bz, bw] = b;
    out[0] = aw * bx + ax * bw + ay * bz - az * by;
    out[1] = aw * by - ax * bz + ay * bw + az * bx;
    out[2] = aw * bz + ax * by - ay * bx + az * bw;
    out[3] = aw * bw - ax * bx - ay * by - az * bz;
  }
  function rotateInto(out, rotation, vector) {
    const [x, y, z, w] = rotation, [vx, vy, vz] = vector;
    const tx = 2 * (y * vz - z * vy), ty = 2 * (z * vx - x * vz), tz = 2 * (x * vy - y * vx);
    out[0] = vx + w * tx + y * tz - z * ty;
    out[1] = vy + w * ty + z * tx - x * tz;
    out[2] = vz + w * tz + x * ty - y * tx;
  }

  function updateSky() {
    const distance = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const progress = clamp(scrollY / distance, 0, 1);
    const start = [243, 242, 238];
    const end = [12, 21, 49];
    const rgb = start.map((value, i) => Math.round(value + (end[i] - value) * progress));
    document.body.style.setProperty("--garden-sky", `rgb(${rgb.join(", ")})`);
    skyScheduled = false;
  }

  // Merge leaves into two fixed-color silhouettes per branch. Cached vector
  // paths avoid both per-leaf frame work and expensive transparent texture copies.
  function cacheBranchLeaves(nodes) {
    let leafCount = 0, clusterCount = 0;
    for (const node of nodes) {
      const leaves = node.foliage.filter(part => part.type === "leaf");
      node.foliage = node.foliage.filter(part => part.type !== "leaf");
      if (!leaves.length) continue;
      const groups = new Map();
      const baseLightness = plants[node.plantIndex].config.leafColor[2];
      for (const leaf of leaves) {
        // Two tones retain sampled color variation without a fill per leaf.
        const tone = leaf.color[2] < baseLightness ? 0 : 1;
        if (!groups.has(tone)) groups.set(tone, { path: new Path2D(), fill: leaf.fill });
        const u = leaf.surfaceU3, v = leaf.surfaceV3, size = leaf.sizeScale;
        groups.get(tone).path.addPath(leaf.path, new DOMMatrix([
          (u[0] + u[2] * 0.3) * size, (-u[1] + u[2] * 0.12) * size,
          (v[0] + v[2] * 0.3) * size, (-v[1] + v[2] * 0.12) * size, 0, 0
        ]));
      }
      node.leafCluster = { groups: [...groups.values()],
        radius: Math.ceil(Math.max(...leaves.map(part => part.radius)) + 2),
        restAngle: Math.atan2(node.baseEnd[1] - node.baseStart[1], node.baseEnd[0] - node.baseStart[0]) };
      leafCount += leaves.length;clusterCount++;
    }
    frameStats.cachedLeaves = leafCount;frameStats.leafClusters = clusterCount;
  }

  function hillLayers(width, groundY, height) {
    return [
      { depth: -3100, color: "#251b1a", circles: [[0.05, 0.36, 140], [0.48, 0.32, 170], [0.93, 0.38, 120]] },
      { depth: -1700, color: "#38251d", circles: [[0.2, 0.58, 100], [0.82, 0.56, 85]] },
      { depth: -250, color: "#59402b", circles: [[0.1, 0.92, 50], [0.86, 0.98, 30]], litter: true }
    ].map((layer) => {
      const path = new Path2D();
      const circles = layer.circles.map(([x, radius, lift]) => ({
        x: x * width, radius: Math.max(400, width * radius),
        y: groundY + Math.max(400, width * radius) - lift
      }));
      for (const circle of circles) {
        path.moveTo(circle.x + circle.radius, circle.y);
        path.arc(circle.x, circle.y, circle.radius, 0, TAU);
      }
      // Circles supply the visible top profile. Their filled lower portion
      // merges into the soil below, which is masked to black underground.
      path.rect(0, groundY + 100, width, height - groundY);
      return { type: "hill", ...layer, circles, path };
    });
  }

  function prepareScene() {
    const width = document.documentElement.clientWidth;
    const landing = document.querySelector(".landing");
    const height = Math.max(landing.offsetHeight, innerHeight);
    const grid = document.querySelector(".project-grid");
    // Visual card offsets should not move the forest floor or underground.
    const groundY = landing.offsetTop + grid.offsetTop + grid.offsetHeight + 140;
    const title = document.querySelector(".landing-title");
    // Layout coordinates exclude the heading's transient entrance animation.
    const titleBottom = landing.offsetTop + title.offsetTop + title.offsetHeight;
    const canopyTop = titleBottom + 170;
    const resolution = Math.min(devicePixelRatio || 1, 1.5, 8192 / height, Math.sqrt(12000000 / (width * height)));
    canvas.width = Math.round(width * resolution);
    canvas.height = Math.round(height * resolution);
    canvas.style.height = `${height}px`;
    const parts = [];
    const nodes = [];
    plants.forEach((plant, index) => {
      const origin = [plant.config.rootX * (width + 100) - 50, groundY + 40 + (plant.config.rootZ + 4200) / 4900 * 70];
      const projectedHeight = plant.geometry.reduce((h, part) => Math.max(h, part.end[1] - part.end[2] * 0.12), 1);
      // The tallest possible crown remains below the greeting, including sway.
      const size = Math.min(1, plant.config.heightFraction) * (groundY - canopyTop) / projectedHeight;
      const thicknessScale = Math.min(size, width * 0.06 / plant.config.initialStemDiameter);
      const projection = { origin, size, rootZ: plant.config.rootZ };
      const map = new Map();
      for (const geometry of plant.geometry) {
        // Retain generated geometry, but skip leaf preparation and all frame work.
        if (!LEAVES_ENABLED && geometry.type === "leaf") continue;
        const start = projectPoint(projection, geometry.start);
        const end = projectPoint(projection, geometry.end);
        const part = { ...geometry, id: parts.length, baseStart: start, baseEnd: end, start: [...start], end: [...end],
          restStart3: geometry.start, restEnd3: geometry.end, start3: [...geometry.start], end3: [...geometry.end], projection,
          depth: (geometry.start[2] + geometry.end[2]) / 2 * size + plant.config.rootZ,
          startDepth: geometry.start[2] * size + plant.config.rootZ,
          endDepth: geometry.end[2] * size + plant.config.rootZ,
          sizeScale: size, thicknessScale, plantIndex: index, orientation: [...IDENTITY_ROTATION], bend: [0, 0],
          surface: [0, 0, 0, 0], bounds: [0, 0, 0, 0], poseVersion: 0 };
        if (geometry.type === "branch") {
          part.parent = map.get(geometry.parent) || null;
          part.restDelta3 = subtract(geometry.end, geometry.start);
          [part.bendAxisU, part.bendAxisV] = perpendicularAxes(unit(part.restDelta3));
          part.lineWidth = Math.max(0.5, geometry.diameter * thicknessScale);
          part.rotationU = [0, 0, 0, 1];part.rotationV = [0, 0, 0, 1];part.localRotation = [0, 0, 0, 1];
          part.foliage = [];part.foliageRadius = 0;
          map.set(geometry, part);
          nodes.push(part);
        } else {
          part.branch = map.get(geometry.branch);
          part.endOffset3 = part.branch ? subtract(geometry.end, part.branch.restEnd3) : [0, 0, 0];
          part.branch?.foliage.push(part);
        }
        parts.push(part);
      }
    });
    const hills = hillLayers(width, groundY, height);
    parts.push(...hills);
    const far = parts.reduce((z, part) => Math.min(z, part.startDepth ?? part.depth, part.endDepth ?? part.depth), Infinity);
    const near = parts.reduce((z, part) => Math.max(z, part.startDepth ?? part.depth, part.endDepth ?? part.depth), -Infinity);
    const lightness = (z) => DEPTH_SHADING_ENABLED
      ? 12 + 72 * clamp((z - far) / Math.max(1, near - far), 0, 1) : 48;
    for (const part of parts) {
      if (part.type === "hill") continue;
      const light = lightness(part.depth);
      if (part.type === "branch") {
        const [h, s, l] = plants[part.plantIndex].config.branchColor;
        part.shades = [part.startDepth, part.endDepth].map((z) => `hsl(${h} ${s}% ${materialLightness(l, lightness(z), 31, 8, 90)}%)`);
      } else if (part.type === "flower") {
        const config = plants[part.plantIndex].config;
        const [h, s, l] = config.flowerColor;
        part.radius = part.size * part.sizeScale * 1.2;
        part.modelRadius = part.size;
        part.surfaceU3 = [1, 0, 0];
        part.surfaceV3 = [0, -1, 0];
        part.path = flowerPath(flowerPatterns.find((p) => p.name === config.flowerPattern), part.modelRadius, part.rotation);
        part.fill = `hsl(${h} ${s}% ${materialLightness(l, light, 48, 12, 90)}%)`;
        part.centerFill = `hsl(45 85% ${materialLightness(58, light, 48, 20, 90)}%)`;
      } else {
        const delta = subtract(part.restEnd3, part.restStart3);
        part.modelLength = Math.hypot(...delta);
        part.surfaceU3 = unit(delta);
        [part.surfaceV3] = perpendicularAxes(part.surfaceU3);
        part.modelBreadth = part.size * Math.max(0.08, part.width) * part.roll;
        part.length = Math.hypot(part.end[0] - part.start[0], part.end[1] - part.start[1]);
        part.radius = Math.max(part.modelLength, part.modelBreadth) * part.sizeScale * 1.2;
        part.path = leafPath(part.modelLength, part.modelBreadth, part.shape);
        const [h, s, l] = part.color;
        part.fill = `hsl(${h} ${s}% ${materialLightness(l, light, 32)}%)`;
        part.vein = `hsl(${h} ${s}% ${materialLightness(l + 10, light, l, 12, 94)}%)`;
      }
      if (part.branch) {
        // A bounding sphere about the attachment point stays conservative for
        // every 3D rotation, including heart-leaf shoulders and flower petals.
        const extent = Math.hypot(...part.endOffset3) * part.sizeScale * 1.2 + part.radius;
        part.branch.foliageRadius = Math.max(part.branch.foliageRadius, extent);
      }
      part.hit = { path: part.path || null, width: part.type === "branch" ? Math.max(8, part.lineWidth) : 0,
        plantIndex: part.plantIndex,
        segment: part.type === "branch" ? [part.start, part.end] : null,
        affine: part.type === "branch" ? null : { position: part.type === "flower" ? part.end : part.start, matrix: part.surface } };
    }
    // Keep a fixed lighting range through sway so one extremal twig cannot
    // change every other tree's brightness. Individual depths remain dynamic.
    cacheBranchLeaves(nodes);
    // Leaves are now owned by branch clusters, never independent frame entities.
    for (let i = parts.length - 1; i >= 0; i--) {
      if (parts[i].type === "leaf") parts.splice(i, 1);
    }
    const soilTop = groundY + 100;
    const soilPath = new Path2D();soilPath.rect(0, soilTop, width, height - soilTop);
    ctx.setTransform(resolution, 0, 0, resolution, 0, 0);
    const soilFill = ctx.createLinearGradient(0, soilTop, 0, soilTop + 180);
    soilFill.addColorStop(0, "#493022");soilFill.addColorStop(1, "#000000");
    scene = { width, height, groundY, canopyTop, resolution, parts, nodes, hills, lightness,
      visibleParts: [], version: 0, soilTop, soilPath, soilFill, hoverVersion: -1,
      soilHit: { path: soilPath, ground: true, left: 0, right: width, top: soilTop, bottom: height } };
    for (const hill of hills) {
      hill.id = parts.indexOf(hill);
      hill.hit = { path: hill.path, ground: true, left: 0, right: width, top: groundY - 200, bottom: height };
    }
    scene.litter = (LEAVES_ENABLED ? fallenLeaves : []).map((leaf) => {
      const x = leaf.x * width;
      return { x, y: surfaceY(x) + 18 + leaf.y * 90, rotation: leaf.rotation,
        path: leafPath(leaf.length, leaf.length * leaf.breadthRatio, leaf.shape),
        color: `hsl(${leaf.color[0]} ${leaf.color[1]}% ${leaf.color[2]}%)` };
    });
    dirty = false;
    updateSky();
  }

  function projectPoint(projection, [x, y, z]) {
    return [projection.origin[0] + (x + z * 0.3) * projection.size,
      projection.origin[1] - (y - z * 0.12) * projection.size];
  }

  function updateProjection(part) {
    const { size, origin, rootZ } = part.projection;
    const a = part.start3, b = part.end3;
    part.start[0] = origin[0] + (a[0] + a[2] * 0.3) * size;
    part.start[1] = origin[1] - (a[1] - a[2] * 0.12) * size;
    part.end[0] = origin[0] + (b[0] + b[2] * 0.3) * size;
    part.end[1] = origin[1] - (b[1] - b[2] * 0.12) * size;
    part.startDepth = a[2] * size + rootZ;
    part.endDepth = b[2] * size + rootZ;
    part.depth = (part.startDepth + part.endDepth) / 2;
  }

  function setBounds(part, padding) {
    const bounds = part.bounds;
    bounds[0] = Math.min(part.start[0], part.end[0]) - padding;
    bounds[1] = Math.max(part.start[0], part.end[0]) + padding;
    bounds[2] = Math.min(part.start[1], part.end[1]) - padding;
    bounds[3] = Math.max(part.start[1], part.end[1]) + padding;
  }

  function boundsVisible(bounds, top, bottom) {
    return bounds[1] >= 0 && bounds[0] <= scene.width && bounds[3] >= top && bounds[2] <= bottom;
  }

  function updateBranches(seconds, top = Math.max(0, scrollY - 80), bottom = Math.min(scene.height, scrollY + innerHeight + 80)) {
    const started = PROFILE_ANIMATION ? performance.now() : 0;
    const reduced = motionDisabled();
    const render = scene.visibleParts;
    render.length = 0;
    frameStats.foliageProjected = 0;frameStats.foliageCulled = 0;
    scene.version++;
    for (const node of scene.nodes) {
      const u = reduced ? 0 : branchAngle(node.mechanics, seconds);
      const v = reduced ? 0 : branchAngle(node.mechanics, seconds, 1);
      node.bend[0] = u;node.bend[1] = v;
      quaternionInto(node.rotationU, node.bendAxisU, u);
      quaternionInto(node.rotationV, node.bendAxisV, v);
      composeInto(node.localRotation, node.rotationU, node.rotationV);
      composeInto(node.orientation, node.parent?.orientation || IDENTITY_ROTATION, node.localRotation);
      node.start3 = node.parent ? node.parent.end3 : node.restStart3;
      rotateInto(node.end3, node.orientation, node.restDelta3);
      node.end3[0] += node.start3[0];node.end3[1] += node.start3[1];node.end3[2] += node.start3[2];
      updateProjection(node);
      node.poseVersion = scene.version;
      setBounds(node, Math.max(node.hit.width, node.leafCluster?.radius || 0));
      if (boundsVisible(node.bounds, top, bottom)) render.push(node);
    }
    const projectedAt = PROFILE_ANIMATION ? performance.now() : 0;
    // Test flower-cluster spheres before doing any flower XYZ, surface-axis,
    // shading, or path work. Parent skeletons still update in topological order.
    for (const node of scene.nodes) {
      if (!node.foliage.length) continue;
      const x = node.end[0], y = node.end[1], radius = node.foliageRadius;
      if (x + radius < 0 || x - radius > scene.width || y + radius < top || y - radius > bottom) {
        frameStats.foliageCulled += node.foliage.length;
        continue;
      }
      for (const part of node.foliage) {
        frameStats.foliageProjected++;
        part.orientation = node.orientation;
        part.start3 = node.end3;
        rotateInto(part.end3, node.orientation, part.endOffset3);
        part.end3[0] += node.end3[0];part.end3[1] += node.end3[1];part.end3[2] += node.end3[2];
        updateProjection(part);
        rotateInto(scratchU, node.orientation, part.surfaceU3);
        rotateInto(scratchV, node.orientation, part.surfaceV3);
        const size = part.sizeScale, surface = part.surface;
        surface[0] = (scratchU[0] + scratchU[2] * 0.3) * size;
        surface[1] = (-scratchU[1] + scratchU[2] * 0.12) * size;
        surface[2] = (scratchV[0] + scratchV[2] * 0.3) * size;
        surface[3] = (-scratchV[1] + scratchV[2] * 0.12) * size;
        part.poseVersion = scene.version;
        setBounds(part, part.radius);
        if (!boundsVisible(part.bounds, top, bottom)) continue;
        render.push(part);
      }
    }
    if (bottom >= scene.groundY - 200) {
      for (const hill of scene.hills) render.push(hill);
    }
    const sortedAt = PROFILE_ANIMATION ? performance.now() : 0;
    // Only onscreen candidates participate in the painter's algorithm. A fixed
    // tie-break preserves the same result when two parts have equal depth.
    render.sort((a, b) => a.depth - b.depth || a.id - b.id);
    frameStats.visibleParts = render.length;
    if (PROFILE_ANIMATION) {
      const finished = performance.now();
      frameStats.motion = projectedAt - started;
      frameStats.projection = sortedAt - projectedAt;
      frameStats.sort = finished - sortedAt;
    }
  }

  function updateShading(part) {
    // Quantize to half a lightness point to avoid rebuilding identical CSS
    // colors for tiny depth changes on the many leaves in the forest.
    const lightness = (z) => Math.round(scene.lightness(z) * 2) / 2;
    const light = lightness(part.depth);
    if (part.type === "branch") {
      const [h, s, l] = plants[part.plantIndex].config.branchColor;
      const start = lightness(part.startDepth), end = lightness(part.endDepth);
      if (part.shadeStart === start && part.shadeEnd === end) return;
      part.shadeStart = start;part.shadeEnd = end;
      part.shades = [start, end].map((value) => `hsl(${h} ${s}% ${materialLightness(l, value, 31, 8, 90)}%)`);
    } else {
      if (part.shadeValue === light) return;
      part.shadeValue = light;
      const [h, s, l] = part.type === "flower" ? plants[part.plantIndex].config.flowerColor : part.color;
      part.fill = `hsl(${h} ${s}% ${materialLightness(l, light, part.type === "flower" ? 48 : 32)}%)`;
      if (part.type === "flower") part.centerFill = `hsl(45 85% ${materialLightness(58, light, 48, 20, 90)}%)`;
      else part.vein = `hsl(${h} ${s}% ${materialLightness(l + 10, light, l, 12, 94)}%)`;
    }
  }

  function surfaceY(x) {
    const hill = scene.hills[scene.hills.length - 1];
    return hill.circles.reduce((y, circle) => {
      const dx = x - circle.x;
      return Math.abs(dx) < circle.radius ? Math.min(y, circle.y - Math.sqrt(circle.radius ** 2 - dx ** 2)) : y;
    }, scene.groundY + 100);
  }

  function draw(seconds = animationTime, delta = 0) {
    if (dirty || !scene) prepareScene();
    const started = PROFILE_ANIMATION ? performance.now() : 0;
    const { width, height, resolution, groundY } = scene;
    // A still garden can be painted once across the existing full-page canvas.
    // Animated scenes keep viewport culling to limit the cost of each frame.
    const still = motionDisabled();
    const top = still ? 0 : Math.max(0, scrollY - 80);
    const bottom = still ? height : Math.min(height, scrollY + innerHeight + 80);
    scene.drawTop = top;scene.drawBottom = bottom;
    frameStats.motion = 0;frameStats.projection = 0;frameStats.sort = 0;
    frameStats.veinsDrawn = 0;frameStats.veinsOmitted = 0;frameStats.leafClustersDrawn = 0;
    frameStats.foliageProjected = 0;frameStats.foliageCulled = 0;
    if (top < scene.soilTop) {
      updateBranches(seconds, top, Math.min(bottom, scene.soilTop));
    } else {
      // Opaque underground soil conceals the entire forest: no simulation,
      // foliage projection or sorting is needed here.
      scene.version++;scene.visibleParts.length = 0;
      frameStats.visibleParts = 0;
      frameStats.foliageCulled = scene.parts.length - scene.nodes.length - scene.hills.length;
    }
    const paintStarted = PROFILE_ANIMATION ? performance.now() : 0;
    ctx.setTransform(resolution, 0, 0, resolution, 0, 0);
    ctx.clearRect(0, top, width, bottom - top);
    ctx.save();
    ctx.beginPath();ctx.rect(0, top, width, bottom - top);ctx.clip();
    ctx.globalAlpha = 1;ctx.lineCap = "round";
    for (const part of scene.visibleParts) {
      if (part.type === "hill") {
        ctx.setTransform(resolution, 0, 0, resolution, 0, 0);
        ctx.fillStyle = part.color;ctx.fill(part.path);
        if (part.litter) {
          for (const leaf of scene.litter) {
            ctx.save();ctx.translate(leaf.x, leaf.y);ctx.rotate(leaf.rotation);
            ctx.fillStyle = leaf.color;ctx.fill(leaf.path);ctx.restore();
          }
        }
        continue;
      }
      if (DEPTH_SHADING_ENABLED) updateShading(part);
      if (part.type === "branch") {
        ctx.setTransform(resolution, 0, 0, resolution, 0, 0);
        if (part.shades[0] === part.shades[1]) ctx.strokeStyle = part.shades[0];
        else {
          const gradient = ctx.createLinearGradient(part.start[0], part.start[1], part.end[0], part.end[1]);
          gradient.addColorStop(0, part.shades[0]);gradient.addColorStop(1, part.shades[1]);
          ctx.strokeStyle = gradient;
        }
        ctx.lineWidth = part.lineWidth;
        ctx.beginPath();ctx.moveTo(part.start[0], part.start[1]);ctx.lineTo(part.end[0], part.end[1]);ctx.stroke();
        if (part.leafCluster) {
          const cluster = part.leafCluster;
          const angle = Math.atan2(part.end[1] - part.start[1], part.end[0] - part.start[0]) - cluster.restAngle;
          const cosine = Math.cos(angle) * resolution, sine = Math.sin(angle) * resolution;
          ctx.setTransform(cosine, sine, -sine, cosine, part.end[0] * resolution, part.end[1] * resolution);
          for (const group of cluster.groups) {
            ctx.fillStyle = group.fill;ctx.fill(group.path);
          }
          frameStats.leafClustersDrawn++;
        }
      } else {
        // Flowers retain their existing 3D placement. Leaves are drawn above
        // exclusively through the rigid branch clusters.
        const position = part.end, matrix = part.surface;
        ctx.setTransform(matrix[0] * resolution, matrix[1] * resolution,
          matrix[2] * resolution, matrix[3] * resolution, position[0] * resolution, position[1] * resolution);
        ctx.fillStyle = part.fill;ctx.fill(part.path);
        ctx.fillStyle = part.centerFill;ctx.beginPath();ctx.arc(0, 0, part.modelRadius * 0.22, 0, TAU);ctx.fill();
      }
    }
    ctx.setTransform(resolution, 0, 0, resolution, 0, 0);
    if (bottom > scene.soilTop) {
      ctx.fillStyle = scene.soilFill;ctx.fill(scene.soilPath);
    }
    ctx.restore();
    if (PROFILE_ANIMATION) {
      const finished = performance.now();
      frameStats.paint = finished - paintStarted;
      frameStats.total = finished - started;
    }
  }

  function frame(timestamp) {
    animationId = 0;
    if (document.hidden) { lastFrame = 0; return; }
    const elapsed = lastFrame ? timestamp - lastFrame : frameInterval;
    if (!dirty && elapsed < frameInterval) {
      animationId = requestAnimationFrame(frame);
      return;
    }
    const delta = motionDisabled() ? 0 : Math.min(elapsed / 1000, 0.15);
    animationTime += delta;
    lastFrame = timestamp;
    const started = performance.now();
    draw(animationTime, delta);
    // Keep the UI responsive on dense scenes by adapting the frame cadence.
    frameInterval = clamp((performance.now() - started) * 1.3, 1000 / 24, 1000 / 10);
    if (!motionDisabled() && scrollY < scene.groundY + 280) animationId = requestAnimationFrame(frame);
    else lastFrame = 0;
  }

  function scheduleDraw(layoutChanged = false) {
    if (layoutChanged) dirty = true;
    if (!animationId && !document.hidden) animationId = requestAnimationFrame(frame);
  }
  window.addEventListener("resize", () => {
    scheduleDraw(true);
  }, { passive: true });
  window.addEventListener("load", () => scheduleDraw(true), { once: true });
  window.addEventListener("scroll", () => {
    if (!skyScheduled) { skyScheduled = true; requestAnimationFrame(updateSky); }
    if (!motionDisabled()) scheduleDraw();
  }, { passive: true });
  document.fonts?.ready.then(() => scheduleDraw(true));
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => scheduleDraw(true)).observe(document.querySelector(".landing"));
  motionPreference.addEventListener("change", () => {
    cancelAnimationFrame(animationId);
    animationId = 0;
    lastFrame = 0;
    scheduleDraw();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { cancelAnimationFrame(animationId); animationId = 0; lastFrame = 0; }
    else scheduleDraw();
  });
  scheduleDraw(true);
})();
