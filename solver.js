(function () { console.log("ZM Solver V7.8-standard-red-first-locked loaded");

const SOLVER_VERSION = "V7.8-standard-red-first-locked";

const DEFAULT_OBJECT_PRIORITIES = { mineralMultiplier: 1, mineralFlat: 0, bubbleFlat: 0, blankFlat: 0, gateFlat: 0, startFlat: 0, highMineralThreshold: 28, highMineralFlat: 0, priorityObjectBonus: -250000, avoidObjectPenalty: 250000, };

// Beam search controls for Custom / Main Graveyard routing. // This prevents custom priority routes from locking onto the first greedy path only. const CUSTOM_BEAM_WIDTH = 64; const CUSTOM_MAX_CANDIDATES = 5000;

let GLOBAL_OBJECT_PRIORITIES = { ...DEFAULT_OBJECT_PRIORITIES };

function normalizeObjectPriorities(priorities) { const merged = { ...DEFAULT_OBJECT_PRIORITIES, ...(priorities || {}), };

return {
  mineralMultiplier:
    Number.isFinite(merged.mineralMultiplier) ? merged.mineralMultiplier : 1,
  mineralFlat:
    Number.isFinite(merged.mineralFlat) ? merged.mineralFlat : 0,
  bubbleFlat:
    Number.isFinite(merged.bubbleFlat) ? merged.bubbleFlat : 0,
  blankFlat:
    Number.isFinite(merged.blankFlat) ? merged.blankFlat : 0,
  gateFlat:
    Number.isFinite(merged.gateFlat) ? merged.gateFlat : 0,
  startFlat:
    Number.isFinite(merged.startFlat) ? merged.startFlat : 0,
  highMineralThreshold:
    Number.isFinite(merged.highMineralThreshold)
      ? merged.highMineralThreshold
      : 28,
  highMineralFlat:
    Number.isFinite(merged.highMineralFlat) ? merged.highMineralFlat : 0,
  priorityObjectBonus:
    Number.isFinite(merged.priorityObjectBonus)
      ? merged.priorityObjectBonus
      : -250000,
  avoidObjectPenalty:
    Number.isFinite(merged.avoidObjectPenalty)
      ? merged.avoidObjectPenalty
      : 250000,
};

}

function setObjectPriorities(priorities) { GLOBAL_OBJECT_PRIORITIES = normalizeObjectPriorities(priorities); return { ...GLOBAL_OBJECT_PRIORITIES }; }

function getObjectPriorities() { return { ...GLOBAL_OBJECT_PRIORITIES }; }

function normalizeSolverMode(value) { return String(value || "standard").trim().toLowerCase() === "custom" ? "custom" : "standard"; }

function normalizePrioritySetting(value) { const v = String(value || "").trim().toLowerCase(); if (v === "priority" || v === "avoid" || v === "normal") return v; return "normal"; }

function numberCost(n) { if (!Number.isFinite(n) || n <= 0) return 0; if (n <= 10) return Math.pow(2, n); return Math.pow(2, 10) * Math.pow(1.6, n - 10); }

function roundCost(n) { if (!Number.isFinite(n)) return n; return Math.round(n * 100) / 100; }

function cellKey(r, c) { return ${r},${c}; }

function sameCell(a, b) { return !!a && !!b && a[0] === b[0] && a[1] === b[1]; }

function dedupeCells(cells) { const seen = new Set(); const out = []; for (const [r, c] of cells || []) { const key = cellKey(r, c); if (seen.has(key)) continue; seen.add(key); out.push([r, c]); } return out; }

function pathSet(path) { const set = new Set(); for (const [r, c] of path || []) { set.add(cellKey(r, c)); } return set; }

function pathsToSet(paths) { const set = new Set(); for (const path of paths || []) { for (const [r, c] of path || []) { set.add(cellKey(r, c)); } } return set; }

function uniquePath(path) { const out = []; for (const [r, c] of path || []) { if (!out.length || out[out.length - 1][0] !== r || out[out.length - 1][1] !== c) { out.push([r, c]); } } return out; }

function mergePaths(a, b) { if (!a || !a.length) return b ? [...b] : []; if (!b || !b.length) return [...a]; if (sameCell(a[a.length - 1], b[0])) { return [...a, ...b.slice(1)]; } return [...a, ...b]; }

function hasPathLoop(path) { const seen = new Set(); for (const [r, c] of path || []) { const key = cellKey(r, c); if (seen.has(key)) return true; seen.add(key); } return false; }

function pathRawNumberSum(path, grid, freeCells = new Set()) { let total = 0; for (const [r, c] of path || []) { const key = cellKey(r, c); if (freeCells.has(key)) continue; if (typeof grid[r]?.[c] === "number") total += grid[r][c]; } return total; }

function countBubbleCells(path, grid) { let n = 0; for (const [r, c] of path || []) { if (grid[r]?.[c] === "B") n++; } return n; }

function countRedBubbles(path, grid) { return countBubbleCells(path, grid); }

function firstBubbleStep(path, grid) { if (!path || !path.length) return Infinity; for (let i = 0; i < path.length; i++) { const [r, c] = path[i]; if (grid[r]?.[c] === "B") return i; } return Infinity; }

function isWalkableCell(grid, r, c) { if (!grid || r < 0 || c < 0 || r >= grid.length || c >= grid[0].length) return false; const v = grid[r][c]; return v !== "X" && v !== "S"; }

function isAttackableTile(v) { return typeof v === "number" || v === "B" || v === ""; }

function getCellPrioritySetting(r, c, objectPriorityMap, getCellObjectType) { if (!objectPriorityMap || typeof getCellObjectType !== "function") return "normal"; const objectType = String(getCellObjectType(r, c) || "").trim().toLowerCase(); if (!objectType) return "normal"; return normalizePrioritySetting(objectPriorityMap[objectType]); }

function getPerObjectPriorityAdjustment(r, c, options = {}) { const priorities = normalizeObjectPriorities( options.objectPriorities || GLOBAL_OBJECT_PRIORITIES ); const setting = getCellPrioritySetting( r, c, options.objectPriorityMap, options.getCellObjectType );

// IMPORTANT:
// Do NOT apply negative priority bonus inside Dijkstra movement cost.
// Dijkstra cannot safely run with negative-weight cells; negative priority cells
// can create endless cheaper loops and freeze normal chambers.
// Priority is still handled later by hard objective completion / route ranking.
if (setting === "priority") return 0;

// Avoid is safe here because it is a positive penalty.
if (setting === "avoid") return priorities.avoidObjectPenalty;

return 0;

}

function isGoalCell(r, c, goals) { for (const [gr, gc] of goals || []) { if (gr === r && gc === c) return true; } return false; }

function isStartCell(r, c, starts) { for (const [sr, sc] of starts || []) { if (sr === r && sc === c) return true; } return false; }

function cellWeight(grid, r, c, freeCells, options = {}) { if (freeCells && freeCells.has(cellKey(r, c))) return 0;

const priorities = normalizeObjectPriorities(
  options.objectPriorities || GLOBAL_OBJECT_PRIORITIES
);
const v = grid[r][c];

let baseCost = 0;

if (isGoalCell(r, c, options.goals)) {
  baseCost += priorities.gateFlat;
}

if (isStartCell(r, c, options.starts)) {
  baseCost += priorities.startFlat;
}

if (v === "B") {
  baseCost += priorities.bubbleFlat;
} else if (v === "") {
  baseCost += priorities.blankFlat;
} else if (typeof v === "number") {
  baseCost += numberCost(v) * priorities.mineralMultiplier + priorities.mineralFlat;
  if (v >= priorities.highMineralThreshold) {
    baseCost += priorities.highMineralFlat;
  }
}

baseCost += getPerObjectPriorityAdjustment(r, c, options);
return baseCost;

}

function dijkstra({ grid, starts, goals, freeCells = new Set(), blockedEdges = new Set(), penaltyCells = new Map(), objectPriorities = null, objectPriorityMap = null, getCellObjectType = null, }) { if (!starts?.length || !goals?.length) return null;

const rows = grid.length;
const cols = grid[0].length;
const goalSet = new Set(goals.map(([r, c]) => cellKey(r, c)));
const dist = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
const steps = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
const prev = Array.from({ length: rows }, () => Array(cols).fill(null));
const open = [];

for (const [r, c] of starts) {
  if (!isWalkableCell(grid, r, c)) continue;

  const startCost = cellWeight(grid, r, c, freeCells, {
    objectPriorities,
    goals,
    starts,
    objectPriorityMap,
    getCellObjectType,
  });

  dist[r][c] = startCost;
  steps[r][c] = 0;
  open.push({ r, c, cost: startCost, len: 0 });
}

if (!open.length) return null;

while (open.length) {
  open.sort((a, b) => (a.cost !== b.cost ? a.cost - b.cost : a.len - b.len));
  const cur = open.shift();

  if (cur.cost !== dist[cur.r][cur.c] || cur.len !== steps[cur.r][cur.c]) continue;

  if (goalSet.has(cellKey(cur.r, cur.c))) {
    const path = [];
    let rr = cur.r;
    let cc = cur.c;

    while (rr !== null && cc !== null) {
      path.push([rr, cc]);
      const p = prev[rr][cc];
      if (!p) break;
      rr = p[0];
      cc = p[1];
    }

    path.reverse();
    return {
      path,
      cost: cur.cost,
      goal: [cur.r, cur.c],
      len: cur.len,
    };
  }

  const neighbors = [
    [cur.r + 1, cur.c],
    [cur.r - 1, cur.c],
    [cur.r, cur.c + 1],
    [cur.r, cur.c - 1],
  ];

  for (const [nr, nc] of neighbors) {
    if (!isWalkableCell(grid, nr, nc)) continue;

    const edgeKey1 = `${cur.r},${cur.c}->${nr},${nc}`;
    const edgeKey2 = `${nr},${nc}->${cur.r},${cur.c}`;
    if (blockedEdges.has(edgeKey1) || blockedEdges.has(edgeKey2)) continue;

    const penalty = penaltyCells.get(cellKey(nr, nc)) || 0;
    const nextCost =
      cur.cost +
      cellWeight(grid, nr, nc, freeCells, {
        objectPriorities,
        goals,
        starts,
        objectPriorityMap,
        getCellObjectType,
      }) +
      penalty;
    const nextLen = cur.len + 1;

    if (
      nextCost < dist[nr][nc] ||
      (nextCost === dist[nr][nc] && nextLen < steps[nr][nc])
    ) {
      dist[nr][nc] = nextCost;
      steps[nr][nc] = nextLen;
      prev[nr][nc] = [cur.r, cur.c];
      open.push({ r: nr, c: nc, cost: nextCost, len: nextLen });
    }
  }
}

return null;

}

function getLowestUsedRow(grid) { let max = -1; for (let r = 0; r < grid.length; r++) { for (let c = 0; c < grid[0].length; c++) { if (grid[r][c] !== "") max = Math.max(max, r); } } return max; }

function getStartCells(grid) { const rows = grid.length; const cols = grid[0].length; const lowest = getLowestUsedRow(grid); const startRow = Math.min(rows - 1, Math.max(0, lowest + 1)); const starts = [];

for (let c = 0; c < cols; c++) {
  if (isWalkableCell(grid, startRow, c)) starts.push([startRow, c]);
}

return { startRow, starts };

}

function getGateGoals(grid, gateType) { const normalizedGateType = String(gateType || "standard").trim().toLowerCase(); if (normalizedGateType === "none") return [];

const cols = normalizedGateType === "end" ? [2, 3, 4] : [1, 2, 3, 4, 5];
return cols.map((c) => [0, c]).filter(([r, c]) => isWalkableCell(grid, r, c));

}

function getBubbles(grid) { const out = []; for (let r = 0; r < grid.length; r++) { for (let c = 0; c < grid[0].length; c++) { if (grid[r][c] === "B") out.push([r, c]); } } return out; }

function getPriorityCells(grid, objectPriorityMap, getCellObjectType) { const out = []; if (!objectPriorityMap || typeof getCellObjectType !== "function") return out;

for (let r = 0; r < grid.length; r++) {
  for (let c = 0; c < grid[0].length; c++) {
    if (!isWalkableCell(grid, r, c)) continue;
    if (getCellPrioritySetting(r, c, objectPriorityMap, getCellObjectType) === "priority") {
      out.push([r, c]);
    }
  }
}

return out;

}

function getAvoidCells(grid, objectPriorityMap, getCellObjectType) { const out = []; if (!objectPriorityMap || typeof getCellObjectType !== "function") return out;

for (let r = 0; r < grid.length; r++) {
  for (let c = 0; c < grid[0].length; c++) {
    if (!isWalkableCell(grid, r, c)) continue;
    if (getCellPrioritySetting(r, c, objectPriorityMap, getCellObjectType) === "avoid") {
      out.push([r, c]);
    }
  }
}

return out;

}

function hasAnyCustomPriorityObject(objectPriorityMap) { if (!objectPriorityMap) return false;

for (const key of Object.keys(objectPriorityMap)) {
  const normalizedKey = String(key || "").trim().toLowerCase();

  // Main Graveyard ignores gate and essence as custom priority.
  // Shaft is allowed because Main Graveyard should target shafts if they exist.
  if (normalizedKey === "gate") continue;
  if (normalizedKey === "essence") continue;

  if (normalizePrioritySetting(objectPriorityMap[key]) === "priority") {
    return true;
  }
}

return false;

}

function isMainGraveyardDefaultEmblemType(type) { const t = String(type || "").trim().toLowerCase(); return t === "emblem" || t === "emblems"; }

function buildMainGraveyardTargetGroups({ grid, objectPriorityMap, getCellObjectType, }) { const groups = []; if (typeof getCellObjectType !== "function") return groups;

const hasCustomPriority = hasAnyCustomPriorityObject(objectPriorityMap);
const normalizedMap = objectPriorityMap || {};
const seen = new Set();

if (normalizePrioritySetting(normalizedMap.shaft) === "priority") {
  const shaftClusters = sortShaftClustersBottomToTop(getShaftClusters(grid));

  shaftClusters.forEach((cluster, index) => {
    const info = getShaftAttackInfo(grid, cluster);
    if (info.attacks.length) {
      groups.push({
        id: `graveyard-shaft-${index}`,
        label: `Shaft ${index + 1}`,
        kind: "shaft",
        goals: info.attacks,
        cluster,
        entryMap: info.entryMap,
        final: false,
      });
    }
  });
}

for (let r = 0; r < grid.length; r++) {
  for (let c = 0; c < grid[0].length; c++) {
    if (!isWalkableCell(grid, r, c)) continue;

    const type = String(getCellObjectType(r, c) || "").trim().toLowerCase();
    if (!type) continue;
    if (type === "gate" || type === "shaft" || type === "bubble" || type === "essence") continue;

    const shouldTarget = hasCustomPriority
      ? normalizePrioritySetting(normalizedMap[type]) === "priority"
      : isMainGraveyardDefaultEmblemType(type);

    if (!shouldTarget) continue;

    const groupId = `${type}-${cellKey(r, c)}`;
    if (seen.has(groupId)) continue;
    seen.add(groupId);

    groups.push({
      id: groupId,
      label: type,
      kind: "object",
      objectType: type,
      goals: [[r, c]],
      final: false,
    });
  }
}

return groups;

}

function getMainGraveyardRequiredCells(grid, objectPriorityMap, getCellObjectType) { const out = []; if (typeof getCellObjectType !== "function") return out;

const hasCustomPriority = hasAnyCustomPriorityObject(objectPriorityMap);
const normalizedMap = objectPriorityMap || {};

for (let r = 0; r < grid.length; r++) {
  for (let c = 0; c < grid[0].length; c++) {
    if (!isWalkableCell(grid, r, c)) continue;

    const type = String(getCellObjectType(r, c) || "").trim().toLowerCase();
    if (!type) continue;
    if (type === "gate" || type === "shaft" || type === "bubble" || type === "essence") continue;

    const shouldTarget = hasCustomPriority
      ? normalizePrioritySetting(normalizedMap[type]) === "priority"
      : isMainGraveyardDefaultEmblemType(type);

    if (shouldTarget) out.push([r, c]);
  }
}

return out;

}

function getMainGraveyardPriorityMap(objectPriorityMap) { const map = { ...(objectPriorityMap || {}) };

// Main Graveyard defaults:
// - Emblems are priority.
// - Shaft stays priority if app-solver sent shaft priority.
// - Essence is NOT priority in graveyard.
// - Gate is NOT priority in graveyard.
map.emblem = "priority";
map.emblems = "priority";
map.essence = "normal";
map.gate = "normal";

return map;

}

function solveMainGraveyardNoGate({ grid, gateType, eventType, objectPriorities, objectPriorityMap, getCellObjectType, }) { const rows = grid.length; const cols = grid[0].length; const { startRow, starts } = getStartCells(grid);

if (!starts.length) {
  return {
    ok: false,
    message: `SOLVER_VERSION: ${SOLVER_VERSION}

No valid start cells one row below the lowest used row.`, startRow, }; }

const effectiveObjectPriorityMap = getMainGraveyardPriorityMap(objectPriorityMap);
const requiredPriorityCells = getMainGraveyardRequiredCells(
  grid,
  effectiveObjectPriorityMap,
  getCellObjectType
);
const avoidCells = getAvoidCells(grid, effectiveObjectPriorityMap, getCellObjectType);
const bubbles = getBubbles(grid);
const shaftClustersOrdered = sortShaftClustersBottomToTop(getShaftClusters(grid));

const targetGroups = buildMainGraveyardTargetGroups({
  grid,
  objectPriorityMap: effectiveObjectPriorityMap,
  getCellObjectType,
});

if (!targetGroups.length) {
  return {
    ok: false,
    message:
      `SOLVER_VERSION: ${SOLVER_VERSION}

+solver_mode: main_graveyard +gate_type: none +No emblem or shaft objectives found.`, startRow, }; }

const customPaths = buildCustomPaths({
  grid,
  starts,
  targetGroups,
  objectPriorities,
  objectPriorityMap: effectiveObjectPriorityMap,
  getCellObjectType,
});

const allCandidates = (customPaths.candidateStates || [customPaths]).map((state, index) =>
  makeCustomCandidate({
    grid,
    customPaths: state,
    requiredPriorityCells,
    objectPriorities,
    objectPriorityMap: effectiveObjectPriorityMap,
    getCellObjectType,
    redVariant: index === 0 ? "main-graveyard-beam-best" : "main-graveyard-beam-alternate",
    redMode: "main_graveyard",
  })
);

allCandidates.sort(compareCustomCandidates);
const candidate = allCandidates[0];
const routeAnalysis = buildRouteAnalysis(grid, allCandidates, candidate, "main_graveyard");

return {
  ok: true,
  rows,
  cols,
  gateType,
  eventType,
  solverMode: "main_graveyard",
  legacyEndMode: false,
  startRow,
  solverVersion: SOLVER_VERSION,
  objectPriorities: { ...objectPriorities },
  objectPriorityMap: effectiveObjectPriorityMap ? { ...effectiveObjectPriorityMap } : null,
  requiredPriorityCells,
  avoidCells,
  redMode: candidate.redMode,
  redVariant: candidate.redVariant,
  redBubble: null,
  redBubbles: [],
  redBubbleCount: candidate.redBubbleCount,
  firstRedBubbleAt: candidate.firstRedBubbleAt,
  firstBubbleTravelCost:
    candidate.firstBubbleTravelCost === Infinity ? null : roundCost(candidate.firstBubbleTravelCost),
  redPath: candidate.redPath,
  redCost: roundCost(candidate.redCost),
  bluePaths: candidate.bluePaths,
  blueCost: roundCost(candidate.blueCost),
  totalCost: roundCost(candidate.redCost + candidate.blueCost),
  redObjectPriorityScore: roundCost(candidate.redObjectPriorityScore),
  blueObjectPriorityScore: roundCost(candidate.blueObjectPriorityScore),
  objectPriorityScore: roundCost(candidate.objectPriorityScore),
  missingPriorityCount: candidate.missingPriorityCount,
  effectiveTotal: roundCost(candidate.effectiveTotal),
  dependencyCost: 0,
  assistBonus: 0,
  lowerShaftBonus: 0,
  bubbleBonus: 0,
  redLoopPenalty: roundCost(candidate.redLoopPenalty),
  overAssistPenalty: 0,
  shaftClusters: shaftClustersOrdered,
  shaftEntryDots: candidate.shaftEntryDots,
  attackPoints: candidate.attackPoints,
  bubbles,
  unresolvedTargets: candidate.unresolvedTargets,
  redCandidateCount: allCandidates.length,
  routeAnalysis,
  message:
    `SOLVER_VERSION: ${SOLVER_VERSION}

+solver_mode: main_graveyard +solver_status: solved +gate_type: none +custom_search: beam +custom_candidate_count: ${allCandidates.length} +priority_targets: ${requiredPriorityCells.length} +shaft_targets: ${shaftClustersOrdered.length} +missing_priority_count: ${candidate.missingPriorityCount} +unresolved_targets: ${candidate.unresolvedTargets} +red_cost: ${roundCost(candidate.redCost)} +blue_cost: ${roundCost(candidate.blueCost)} +effective_total: ${roundCost(candidate.effectiveTotal)}` }; }

function getPathObjectPriorityScore(path, objectPriorityMap, getCellObjectType, priorities) { if (!path || !path.length || !objectPriorityMap || typeof getCellObjectType !== "function") { return 0; }

const normalized = normalizeObjectPriorities(priorities);
let score = 0;

for (const [r, c] of path) {
  const objectType = String(getCellObjectType(r, c) || "").trim().toLowerCase();
  if (!objectType) continue;

  const setting = normalizePrioritySetting(objectPriorityMap[objectType]);

  if (setting === "priority") score += normalized.priorityObjectBonus;
  else if (setting === "avoid") score += normalized.avoidObjectPenalty;
}

return score;

}

function getShaftClusters(grid) { const rows = grid.length; const cols = grid[0].length; const seen = new Set(); const clusters = [];

for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    if (grid[r][c] !== "S") continue;
    const key = cellKey(r, c);
    if (seen.has(key)) continue;

    const stack = [[r, c]];
    const cluster = [];

    while (stack.length) {
      const [rr, cc] = stack.pop();
      const k = cellKey(rr, cc);
      if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue;
      if (grid[rr][cc] !== "S" || seen.has(k)) continue;

      seen.add(k);
      cluster.push([rr, cc]);

      stack.push([rr + 1, cc], [rr - 1, cc], [rr, cc + 1], [rr, cc - 1]);
    }

    clusters.push(cluster);
  }
}

return clusters;

}

function sortShaftClustersBottomToTop(clusters) { return [...clusters].sort((a, b) => { const aBottom = Math.max(...a.map(([r]) => r)); const bBottom = Math.max(...b.map(([r]) => r)); if (aBottom !== bBottom) return bBottom - aBottom;

const aTop = Math.min(...a.map(([r]) => r));
  const bTop = Math.min(...b.map(([r]) => r));
  return bTop - aTop;
});

}

function getShaftAttackInfo(grid, cluster) { const attacks = []; const entryMap = new Map();

if (!cluster || !cluster.length) {
  return { attacks, entryMap };
}

const rows = cluster.map(([r]) => r);
const cols = cluster.map(([, c]) => c);

const minR = Math.min(...rows);
const maxR = Math.max(...rows);
const minC = Math.min(...cols);
const maxC = Math.max(...cols);

const candidateCells = [];

for (let r = minR; r <= maxR; r++) {
  candidateCells.push([r, minC - 1, r, minC]);
}
for (let r = minR; r <= maxR; r++) {
  candidateCells.push([r, maxC + 1, r, maxC]);
}
for (let c = minC; c <= maxC; c++) {
  candidateCells.push([minR - 1, c, minR, c]);
}
for (let c = minC; c <= maxC; c++) {
  candidateCells.push([maxR + 1, c, maxR, c]);
}

for (const [ar, ac, sr, sc] of candidateCells) {
  if (ar < 0 || ac < 0 || ar >= grid.length || ac >= grid[0].length) continue;
  if (!isWalkableCell(grid, ar, ac)) continue;
  if (!isAttackableTile(grid[ar][ac])) continue;

  const key = cellKey(ar, ac);
  if (entryMap.has(key)) continue;

  attacks.push([ar, ac]);
  entryMap.set(key, [sr, sc]);
}

return { attacks, entryMap };

}

function getPathEndpoints(path) { if (!path || !path.length) return []; return [path[path.length - 1]]; }

function countAdjacentSharedOpens(redPath, bluePath) { if (!redPath || !bluePath) return 0; const redSet = new Set(redPath.map(([r, c]) => cellKey(r, c))); let score = 0;

for (const [r, c] of bluePath) {
  const neighbors = [
    [r + 1, c],
    [r - 1, c],
    [r, c + 1],
    [r, c - 1],
  ];

  for (const [rr, cc] of neighbors) {
    if (redSet.has(cellKey(rr, cc))) {
      score++;
      break;
    }
  }
}

return score;

}

function bubblePathBonus(path, entry, grid) { let bonus = countBubbleCells(path, grid) * 0.4; if (entry && grid[entry[0]]?.[entry[1]] === "B") { bonus += 4.0; } return bonus; }

function getEntryBottomDepth(entry, cluster) { if (!entry || !cluster || !cluster.length) return 0; const bottom = Math.max(...cluster.map(([r]) => r)); return entry[0] / Math.max(1, bottom); }

function getLowestShaftPreferenceBonus(route, entry, cluster, routeKind, isLowestShaft) { if (!route || !entry || !cluster || !isLowestShaft) return 0; const bottom = Math.max(...cluster.map(([r]) => r)); const entryDepth = entry[0]; const lowerIsBetter = entryDepth / Math.max(1, bottom);

let bonus = lowerIsBetter * 5.0;
if (routeKind === "base") bonus += 1.25;

return bonus;

}

function redBacktrackPenalty(path) { if (!path || path.length < 3) return 0;

let penalty = 0;

for (let i = 1; i < path.length - 1; i++) {
  const [r0, c0] = path[i - 1];
  const [r1, c1] = path[i];
  const [r2, c2] = path[i + 1];

  const dr1 = r1 - r0;
  const dc1 = c1 - c0;
  const dr2 = r2 - r1;
  const dc2 = c2 - c1;

  const turned = dr1 !== dr2 || dc1 !== dc2;
  const wentUp = dr2 < 0;
  const wentDown = dr2 > 0;
  const wentSideways = dc2 !== 0;

  if (turned && wentSideways) penalty += 0.8;
  if (turned && wentDown) penalty += 2.2;
  if (turned && wentUp) penalty -= 0.15;
}

return Math.max(0, penalty);

}

function redLoopAssistPenalty() { return 0; }

function getCellDisplayValue(grid, r, c) { const v = grid[r]?.[c]; if (typeof v === "number") return String(v); if (v === "B") return "B"; if (v === "") return "□"; return String(v); }

function getPathValueLabel(grid, path) { if (!path || !path.length) return "(no path)"; return path.map(([r, c]) => getCellDisplayValue(grid, r, c)).join(" - "); }

function getPathCoordLabel(path) { if (!path || !path.length) return "(no path)"; return path.map(([r, c]) => ${r},${c}).join(" → "); }

function countMissingPriorityCells(allPriorityCells, usedPaths) { if (!allPriorityCells || !allPriorityCells.length) return 0;

const used = new Set();
for (const path of usedPaths || []) {
  for (const [r, c] of path || []) {
    used.add(cellKey(r, c));
  }
}

let missing = 0;
for (const [r, c] of allPriorityCells) {
  if (!used.has(cellKey(r, c))) missing++;
}

return missing;

}

function firstBubbleTravelCost( path, grid, objectPriorities, objectPriorityMap = null, getCellObjectType = null ) { const idx = firstBubbleStep(path, grid); if (idx === Infinity) return Infinity;

let total = 0;
for (let i = 1; i <= idx; i++) {
  const [r, c] = path[i];
  total += cellWeight(grid, r, c, new Set(), {
    objectPriorities,
    objectPriorityMap,
    getCellObjectType,
  });
}

return total;

}

function compareStandardCandidates(a, b) { // Standard Option B final rule: // Red must choose the cheapest gate route first. // Blue cleanup cannot force red onto a more expensive route. if (a.redCost !== b.redCost) return a.redCost - b.redCost;

const aRedLen = a.redPath?.length || 0;
const bRedLen = b.redPath?.length || 0;
if (aRedLen !== bRedLen) return aRedLen - bRedLen;

if (a.unresolvedTargets !== b.unresolvedTargets) {
  return a.unresolvedTargets - b.unresolvedTargets;
}

if (a.blueCost !== b.blueCost) return a.blueCost - b.blueCost;

const aTotalLen =
  (a.redPath?.length || 0) +
  (a.bluePaths || []).reduce((sum, path) => sum + path.length, 0);
const bTotalLen =
  (b.redPath?.length || 0) +
  (b.bluePaths || []).reduce((sum, path) => sum + path.length, 0);
if (aTotalLen !== bTotalLen) return aTotalLen - bTotalLen;

const aTotal = a.totalCost ?? (a.redCost + a.blueCost);
const bTotal = b.totalCost ?? (b.redCost + b.blueCost);
if (aTotal !== bTotal) return aTotal - bTotal;

return 0;

}

function compareCustomCandidates(a, b) { if (a.unresolvedTargets !== b.unresolvedTargets) { return a.unresolvedTargets - b.unresolvedTargets; }

if ((a.missingPriorityCount ?? 0) !== (b.missingPriorityCount ?? 0)) {
  return (a.missingPriorityCount ?? 0) - (b.missingPriorityCount ?? 0);
}

if ((a.totalCost ?? 0) !== (b.totalCost ?? 0)) {
  return (a.totalCost ?? 0) - (b.totalCost ?? 0);
}

if (a.redCost !== b.redCost) return a.redCost - b.redCost;
if (a.blueCost !== b.blueCost) return a.blueCost - b.blueCost;

const aLen =
  (a.redPath?.length || 0) +
  (a.bluePaths || []).reduce((sum, path) => sum + path.length, 0);
const bLen =
  (b.redPath?.length || 0) +
  (b.bluePaths || []).reduce((sum, path) => sum + path.length, 0);
if (aLen !== bLen) return aLen - bLen;

if (a.effectiveTotal !== b.effectiveTotal) {
  return a.effectiveTotal - b.effectiveTotal;
}

return 0;

}

function buildRouteAnalysis(grid, allCandidates, best, mode = "standard") { const comparator = mode === "custom" || mode === "main_graveyard" ? compareCustomCandidates : compareStandardCandidates;

const sorted = [...allCandidates].sort(comparator);

return sorted.slice(0, 20).map((candidate) => {
  const approved = candidate === best;
  return {
    approved,
    status: approved ? "APPROVED" : "IGNORED",
    reason: approved ? "Chosen" : "Higher cost or worse tie-break",
    redMode: candidate.redMode,
    redVariant: candidate.redVariant,
    unresolvedTargets: candidate.unresolvedTargets,
    missingPriorityCount: candidate.missingPriorityCount ?? 0,
    redBubbleCount: candidate.redBubbleCount,
    firstBubbleTravelCost: roundCost(candidate.firstBubbleTravelCost),
    objectPriorityScore: roundCost(candidate.objectPriorityScore),
    redPathValues: getPathValueLabel(grid, candidate.redPath),
    redPathCoords: getPathCoordLabel(candidate.redPath),
    redCost: roundCost(candidate.redCost),
    blueCost: roundCost(candidate.blueCost),
    totalCost: roundCost(candidate.totalCost ?? (candidate.redCost + candidate.blueCost)),
    effectiveTotal: roundCost(candidate.effectiveTotal),
    deltaFromBest: roundCost(candidate.effectiveTotal - best.effectiveTotal),
  };
});

}

function buildStandardRedCandidates({ grid, starts, gateGoals, bubbles, objectPriorities, objectPriorityMap, getCellObjectType, }) { let bestDirect = null;

// STANDARD RED RULE:
// Red locks to the single cheapest gate path using grid values only.
// Tile meta/object labels are ignored in Standard.
for (const gateGoal of gateGoals) {
  const direct = dijkstra({
    grid,
    starts,
    goals: [gateGoal],
    objectPriorities,
    objectPriorityMap: null,
    getCellObjectType: null,
  });

  if (!direct) continue;

  const candidate = {
    mode: "direct",
    variant: "locked-cheapest-gate-grid-only",
    redBubble: null,
    redBubbles: [],
    path: uniquePath(direct.path),
    redCost: direct.cost,
    gateGoal,
  };

  if (
    !bestDirect ||
    candidate.redCost < bestDirect.redCost ||
    (candidate.redCost === bestDirect.redCost && candidate.path.length < bestDirect.path.length)
  ) {
    bestDirect = candidate;
  }
}

if (!bestDirect) return [];

let bestLocked = bestDirect;

// Red may collect a bubble only if it does not make the red gate route more expensive.
// Equal cost is allowed only if it does not make red longer.
for (const bubble of bubbles) {
  const toBubble = dijkstra({
    grid,
    starts,
    goals: [bubble],
    objectPriorities,
    objectPriorityMap: null,
    getCellObjectType: null,
  });

  if (!toBubble) continue;

  const toGate = dijkstra({
    grid,
    starts: [bubble],
    goals: gateGoals,
    objectPriorities,
    objectPriorityMap: null,
    getCellObjectType: null,
  });

  if (!toGate) continue;

  const mergedPath = uniquePath(mergePaths(toBubble.path, toGate.path));
  const combinedCost = toBubble.cost + toGate.cost;

  const bubbleCandidate = {
    mode: "via bubble",
    variant: "locked-cheapest-gate-bubble-free-or-better-grid-only",
    redBubble: bubble,
    redBubbles: [bubble],
    path: mergedPath,
    redCost: combinedCost,
    gateGoal: toGate.goal || bestDirect.gateGoal,
  };

  if (
    combinedCost < bestLocked.redCost ||
    (combinedCost === bestLocked.redCost && mergedPath.length <= bestLocked.path.length)
  ) {
    bestLocked = bubbleCandidate;
  }
}

return [bestLocked];

}

function buildStandardBlueTargetGroups(grid, redCandidate, shaftClustersOrdered, bubbles) { const groups = [];

shaftClustersOrdered.forEach((cluster, index) => {
  const info = getShaftAttackInfo(grid, cluster);
  if (info.attacks.length) {
    groups.push({
      id: `standard-shaft-${index}`,
      label: `Shaft ${index + 1}`,
      kind: "shaft",
      goals: info.attacks,
      cluster,
      entryMap: info.entryMap,
    });
  }
});

const redSet = pathSet(redCandidate.path);
for (const bubble of bubbles) {
  const key = cellKey(bubble[0], bubble[1]);
  if (redSet.has(key)) continue;
  groups.push({
    id: `standard-bubble-${key}`,
    label: "Bubble",
    kind: "bubble",
    goals: [bubble],
  });
}

return groups;

}

function evaluateBlueBeamForStandard({ grid, starts, redCandidate, shaftClustersOrdered, bubbles, objectPriorities, objectPriorityMap, getCellObjectType, }) { const targetGroups = buildStandardBlueTargetGroups( grid, redCandidate, shaftClustersOrdered, bubbles );

const initialReusable = new Set([...pathSet(redCandidate.path)]);
const initialStarts = dedupeCells(starts.concat(redCandidate.path));

if (!targetGroups.length) {
  return {
    bluePaths: [],
    shaftEntryDots: [],
    attackPoints: [],
    blueCost: 0,
    unresolved: 0,
    dependencyCost: 0,
    assistBonus: 0,
    lowerShaftBonus: 0,
    bubbleBonus: 0,
    redLoopPenalty: redBacktrackPenalty(redCandidate.path),
    overAssistPenalty: redLoopAssistPenalty(),
  };
}

const initial = {
  remaining: [...targetGroups],
  currentStarts: initialStarts,
  reusable: initialReusable,
  bluePaths: [],
  blueCost: 0,
  attackPoints: [],
  shaftEntryDots: [],
  visitedTargets: [],
  unresolvedTargets: 0,
};

let beam = [initial];
const completeStates = [];
let expansions = 0;

function blueStateScore(state) {
  const len = state.bluePaths.reduce((sum, path) => sum + path.length, 0);
  return state.blueCost + len * 0.001 + state.remaining.length * 100000000;
}

function blueStateKey(state) {
  return (
    state.remaining.map((group) => group.id).sort().join("|") +
    "::" +
    state.currentStarts.map(([r, c]) => cellKey(r, c)).sort().join("|")
  );
}

while (beam.length && expansions < CUSTOM_MAX_CANDIDATES) {
  const nextBeam = [];

  for (const state of beam) {
    if (!state.remaining.length) {
      completeStates.push(state);
      continue;
    }

    for (const group of state.remaining) {
      const route = dijkstra({
        grid,
        starts: state.currentStarts,
        goals: group.goals,
        freeCells: state.reusable,
        objectPriorities,
        objectPriorityMap,
        getCellObjectType,
      });

      if (!route || !route.path || !route.path.length) continue;

      const cleanPath = uniquePath(route.path);
      const nextReusable = new Set(state.reusable);
      for (const [r, c] of cleanPath) {
        nextReusable.add(cellKey(r, c));
      }

      const nextStarts = dedupeCells(
        state.currentStarts.concat(cleanPath).concat(getPathEndpoints(cleanPath))
      );

      const nextAttackPoints = state.attackPoints.concat([route.goal]);
      const nextShaftEntryDots = [...state.shaftEntryDots];

      if (group.kind === "shaft" && group.entryMap) {
        const entry = group.entryMap.get(cellKey(route.goal[0], route.goal[1]));
        if (entry) nextShaftEntryDots.push(entry);
      }

      nextBeam.push({
        remaining: state.remaining.filter((g) => g !== group),
        currentStarts: nextStarts,
        reusable: nextReusable,
        bluePaths: state.bluePaths.concat([cleanPath]),
        blueCost: state.blueCost + route.cost,
        attackPoints: nextAttackPoints,
        shaftEntryDots: nextShaftEntryDots,
        visitedTargets: state.visitedTargets.concat([group.id]),
        unresolvedTargets: state.unresolvedTargets,
      });

      expansions++;
    }
  }

  if (!nextBeam.length) {
    for (const state of beam) {
      completeStates.push({
        ...state,
        unresolvedTargets: state.unresolvedTargets + state.remaining.length,
        remaining: [],
      });
    }
    break;
  }

  const seen = new Map();
  nextBeam.sort((a, b) => blueStateScore(a) - blueStateScore(b));

  for (const state of nextBeam) {
    const key = blueStateKey(state);
    if (!seen.has(key)) seen.set(key, state);
  }

  beam = Array.from(seen.values())
    .sort((a, b) => blueStateScore(a) - blueStateScore(b))
    .slice(0, CUSTOM_BEAM_WIDTH);
}

if (!completeStates.length && beam.length) {
  completeStates.push(
    ...beam.map((state) => ({
      ...state,
      unresolvedTargets: state.unresolvedTargets + state.remaining.length,
      remaining: [],
    }))
  );
}

completeStates.sort((a, b) => {
  if (a.unresolvedTargets !== b.unresolvedTargets) {
    return a.unresolvedTargets - b.unresolvedTargets;
  }
  if (a.blueCost !== b.blueCost) return a.blueCost - b.blueCost;
  const aLen = a.bluePaths.reduce((sum, path) => sum + path.length, 0);
  const bLen = b.bluePaths.reduce((sum, path) => sum + path.length, 0);
  return aLen - bLen;
});

const best = completeStates[0] || initial;

let assistBonus = 0;
let lowerShaftBonus = 0;
let bubbleBonus = 0;

best.bluePaths.forEach((path) => {
  assistBonus += Math.min(1.25, countAdjacentSharedOpens(redCandidate.path, path) * 0.03);
  bubbleBonus += bubblePathBonus(path, path[path.length - 1], grid);
});

return {
  bluePaths: best.bluePaths.map(uniquePath),
  shaftEntryDots: dedupeCells(best.shaftEntryDots),
  attackPoints: dedupeCells(best.attackPoints),
  blueCost: best.blueCost,
  unresolved: best.unresolvedTargets,
  dependencyCost: 0,
  assistBonus,
  lowerShaftBonus,
  bubbleBonus,
  redLoopPenalty: redBacktrackPenalty(redCandidate.path),
  overAssistPenalty: redLoopAssistPenalty(),
};

}

function evaluateOrderedBlueForStandard(args) { return evaluateBlueBeamForStandard(args); }

function solveStandard({ grid, gateType, eventType, objectPriorities, objectPriorityMap, getCellObjectType, }) { const rows = grid.length; const cols = grid[0].length; const { startRow, starts } = getStartCells(grid);

if (!starts.length) {
  return {
    ok: false,
    message: `SOLVER_VERSION: ${SOLVER_VERSION}

No valid start cells one row below the lowest used row.`, startRow, }; }

const gateGoals = getGateGoals(grid, gateType);
if (!gateGoals.length) {
  return {
    ok: false,
    message: `SOLVER_VERSION: ${SOLVER_VERSION}

No valid gate attack cells.`, startRow, }; }

const bubbles = getBubbles(grid);
const shaftClusters = getShaftClusters(grid);
const shaftClustersOrdered = sortShaftClustersBottomToTop(shaftClusters);

const redCandidates = buildStandardRedCandidates({
  grid,
  starts,
  gateGoals,
  bubbles,
  objectPriorities,
  objectPriorityMap: null,
  getCellObjectType: null,
});

if (!redCandidates.length) {
  return {
    ok: false,
    message: `SOLVER_VERSION: ${SOLVER_VERSION}

No valid red path to gate.`, startRow, }; }

// HARD STANDARD RULE:
// Red is selected FIRST by pure red gate cost only.
// Blue is evaluated AFTER red is locked and can never change the red route.
const lockedRedCandidate = [...redCandidates].sort((a, b) => {
  if (a.redCost !== b.redCost) return a.redCost - b.redCost;
  return (a.path?.length || 0) - (b.path?.length || 0);
})[0];

let best = null;
const allCandidates = [];

for (const redCandidate of [lockedRedCandidate]) {
  const blueEval = evaluateOrderedBlueForStandard({
    grid,
    starts,
    redCandidate,
    shaftClustersOrdered,
    bubbles,
    objectPriorities,
    objectPriorityMap: null,
    getCellObjectType: null,
  });

  const redBubbleCount = countRedBubbles(redCandidate.path, grid);
  const firstRedBubbleAt = firstBubbleStep(redCandidate.path, grid);
  const firstBubbleCost = firstBubbleTravelCost(
    redCandidate.path,
    grid,
    objectPriorities,
    null,
    null
  );

  const redObjectPriorityScore = getPathObjectPriorityScore(
    redCandidate.path,
    null,
    null,
    objectPriorities
  );

  let blueObjectPriorityScore = 0;
  for (const bluePath of blueEval.bluePaths) {
    blueObjectPriorityScore += getPathObjectPriorityScore(
      bluePath,
      null,
      null,
      objectPriorities
    );
  }

  const totalObjectPriorityScore = redObjectPriorityScore + blueObjectPriorityScore;

  const effectiveTotal =
    redCandidate.redCost +
    blueEval.blueCost +
    blueEval.dependencyCost +
    blueEval.redLoopPenalty +
    blueEval.overAssistPenalty;

  const candidate = {
    redMode: redCandidate.mode,
    redVariant: redCandidate.variant,
    redBubble: redCandidate.redBubble,
    redBubbles: redCandidate.redBubbles,
    redBubbleCount,
    firstRedBubbleAt,
    firstBubbleTravelCost: firstBubbleCost,
    redPath: redCandidate.path,
    redCost: redCandidate.redCost,
    gateGoal: redCandidate.gateGoal,
    bluePaths: blueEval.bluePaths,
    blueCost: blueEval.blueCost,
    totalCost: redCandidate.redCost + blueEval.blueCost,
    shaftEntryDots: blueEval.shaftEntryDots,
    attackPoints: blueEval.attackPoints,
    unresolvedTargets: blueEval.unresolved,
    dependencyCost: blueEval.dependencyCost,
    assistBonus: blueEval.assistBonus,
    lowerShaftBonus: blueEval.lowerShaftBonus,
    bubbleBonus: blueEval.bubbleBonus,
    redLoopPenalty: blueEval.redLoopPenalty,
    overAssistPenalty: blueEval.overAssistPenalty,
    redObjectPriorityScore,
    blueObjectPriorityScore,
    objectPriorityScore: totalObjectPriorityScore,
    missingPriorityCount: 0,
    effectiveTotal,
  };

  allCandidates.push(candidate);

  if (!best || compareStandardCandidates(candidate, best) < 0) {
    best = candidate;
  }
}

if (!best) {
  return {
    ok: false,
    message: `SOLVER_VERSION: ${SOLVER_VERSION}

No valid non-loop red path to gate.`, startRow, }; }

const routeAnalysis = buildRouteAnalysis(grid, allCandidates, best, "standard");

return {
  ok: true,
  rows,
  cols,
  gateType,
  eventType,
  solverMode: "standard",
  legacyEndMode: false,
  startRow,
  solverVersion: SOLVER_VERSION,
  objectPriorities: { ...objectPriorities },
  objectPriorityMap: null,
  requiredPriorityCells: [],
  avoidCells: [],
  redMode: best.redMode,
  redVariant: best.redVariant,
  redBubble: best.redBubble,
  redBubbles: best.redBubbles,
  redBubbleCount: best.redBubbleCount,
  firstRedBubbleAt: best.firstRedBubbleAt,
  firstBubbleTravelCost:
    best.firstBubbleTravelCost === Infinity ? null : roundCost(best.firstBubbleTravelCost),
  redPath: best.redPath,
  redCost: roundCost(best.redCost),
  bluePaths: best.bluePaths,
  blueCost: roundCost(best.blueCost),
  totalCost: roundCost(best.redCost + best.blueCost),
  redObjectPriorityScore: roundCost(best.redObjectPriorityScore),
  blueObjectPriorityScore: roundCost(best.blueObjectPriorityScore),
  objectPriorityScore: roundCost(best.objectPriorityScore),
  missingPriorityCount: 0,
  effectiveTotal: roundCost(best.effectiveTotal),
  dependencyCost: roundCost(best.dependencyCost),
  assistBonus: roundCost(best.assistBonus),
  lowerShaftBonus: roundCost(best.lowerShaftBonus),
  bubbleBonus: roundCost(best.bubbleBonus),
  redLoopPenalty: roundCost(best.redLoopPenalty),
  overAssistPenalty: roundCost(best.overAssistPenalty),
  shaftClusters: shaftClustersOrdered,
  shaftEntryDots: best.shaftEntryDots,
  attackPoints: best.attackPoints,
  bubbles,
  unresolvedTargets: best.unresolvedTargets,
  redCandidateCount: redCandidates.length,
  lockedRedCandidateCount: 1,
  routeAnalysis,
  message:
    `SOLVER_VERSION: ${SOLVER_VERSION}

+solver_mode: standard +solver_status: solved +standard_source: grid_only_no_tile_meta +selection_order: locked_red_cost_first_then_blue +red_cost: ${roundCost(best.redCost)} +blue_cost: ${roundCost(best.blueCost)} +effective_total: ${roundCost(best.effectiveTotal)}` }; }

function buildCustomTargetGroups({ grid, gateType, objectPriorityMap, getCellObjectType, }) { const groups = []; const normalizedMap = objectPriorityMap || {};

if (normalizePrioritySetting(normalizedMap.shaft) === "priority") {
  const shaftClusters = sortShaftClustersBottomToTop(getShaftClusters(grid));

  shaftClusters.forEach((cluster, index) => {
    const info = getShaftAttackInfo(grid, cluster);
    if (info.attacks.length) {
      groups.push({
        id: `shaft-${index}`,
        label: `Shaft ${index + 1}`,
        kind: "shaft",
        goals: info.attacks,
        cluster,
        entryMap: info.entryMap,
        final: false,
      });
    }
  });
}

if (normalizePrioritySetting(normalizedMap.bubble) === "priority") {
  getBubbles(grid).forEach((bubble, index) => {
    groups.push({
      id: `bubble-${index}`,
      label: `Bubble ${index + 1}`,
      kind: "bubble",
      goals: [bubble],
      final: false,
    });
  });
}

if (typeof getCellObjectType === "function") {
  const seen = new Set();

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (!isWalkableCell(grid, r, c)) continue;

      const type = String(getCellObjectType(r, c) || "").trim().toLowerCase();
      if (!type) continue;
      if (type === "gate" || type === "shaft" || type === "bubble" || type === "essence") continue;
      if (normalizePrioritySetting(normalizedMap[type]) !== "priority") continue;

      const groupId = `${type}-${cellKey(r, c)}`;
      if (seen.has(groupId)) continue;
      seen.add(groupId);

      groups.push({
        id: groupId,
        label: type,
        kind: "object",
        objectType: type,
        goals: [[r, c]],
        final: false,
      });
    }
  }
}

if (normalizePrioritySetting(normalizedMap.gate) === "priority") {
  const gateGoals = getGateGoals(grid, gateType);
  if (gateGoals.length) {
    groups.push({
      id: "gate",
      label: "Gate",
      kind: "gate",
      goals: gateGoals,
      final: false,
    });
  }
}

return groups;

}

function chooseBestCustomTarget({ grid, starts, reusable, targetGroups, objectPriorities, objectPriorityMap, getCellObjectType, }) { let best = null;

for (const group of targetGroups) {
  const route = dijkstra({
    grid,
    starts,
    goals: group.goals,
    freeCells: reusable,
    objectPriorities,
    objectPriorityMap,
    getCellObjectType,
  });

  if (!route || !route.path || !route.path.length) continue;

  const rawSum = pathRawNumberSum(route.path, grid, reusable);
  const turns = route.path.length >= 3 ? (() => {
    let n = 0;
    for (let i = 1; i < route.path.length - 1; i++) {
      const [r0, c0] = route.path[i - 1];
      const [r1, c1] = route.path[i];
      const [r2, c2] = route.path[i + 1];
      if ((r1 - r0) !== (r2 - r1) || (c1 - c0) !== (c2 - c1)) n++;
    }
    return n;
  })() : 0;

  const candidate = {
    group,
    route,
    rawSum,
    turns,
  };

  if (!best) {
    best = candidate;
    continue;
  }

  if (route.cost < best.route.cost) {
    best = candidate;
    continue;
  }

  if (route.cost === best.route.cost && route.len < best.route.len) {
    best = candidate;
    continue;
  }

  if (route.cost === best.route.cost && route.len === best.route.len && rawSum < best.rawSum) {
    best = candidate;
    continue;
  }

  if (
    route.cost === best.route.cost &&
    route.len === best.route.len &&
    rawSum === best.rawSum &&
    turns < best.turns
  ) {
    best = candidate;
  }
}

return best;

}

function customStateKey(state) { return ( state.remaining .map((group) => group.id) .sort() .join("|") + "::" + state.currentStarts .map(([r, c]) => cellKey(r, c)) .sort() .join("|") ); }

function scorePartialCustomState(state) { const redLen = state.redPath.length; const blueLen = state.bluePaths.reduce((sum, path) => sum + path.length, 0); return ( state.totalCost + redLen * 0.001 + blueLen * 0.001 + state.remaining.length * 100000000 ); }

function buildCustomPaths({ grid, starts, targetGroups, objectPriorities, objectPriorityMap, getCellObjectType, }) { const initial = { remaining: [...targetGroups], currentStarts: dedupeCells(starts), reusable: new Set(), redPath: [], bluePaths: [], redCost: 0, blueCost: 0, totalCost: 0, attackPoints: [], shaftEntryDots: [], visitedTargets: [], isFirstPath: true, unresolvedTargets: 0, };

let beam = [initial];
const completeStates = [];
let expansions = 0;

while (beam.length && expansions < CUSTOM_MAX_CANDIDATES) {
  const nextBeam = [];

  for (const state of beam) {
    if (!state.remaining.length) {
      completeStates.push(state);
      continue;
    }

    for (const group of state.remaining) {
      const route = dijkstra({
        grid,
        starts: state.currentStarts,
        goals: group.goals,
        freeCells: state.reusable,
        objectPriorities,
        objectPriorityMap,
        getCellObjectType,
      });

      if (!route || !route.path || !route.path.length) continue;

      const cleanPath = uniquePath(route.path);

      const nextReusable = new Set(state.reusable);
      for (const [r, c] of cleanPath) {
        nextReusable.add(cellKey(r, c));
      }

      const nextStarts = dedupeCells(
        state.currentStarts.concat(cleanPath).concat(getPathEndpoints(cleanPath))
      );

      const nextAttackPoints = state.attackPoints.concat([route.goal]);
      const nextShaftEntryDots = [...state.shaftEntryDots];

      if (group.kind === "shaft" && group.entryMap) {
        const entry = group.entryMap.get(cellKey(route.goal[0], route.goal[1]));
        if (entry) nextShaftEntryDots.push(entry);
      }

      const nextRedPath = state.isFirstPath ? cleanPath : state.redPath;
      const nextBluePaths = state.isFirstPath
        ? [...state.bluePaths]
        : state.bluePaths.concat([cleanPath]);
      const nextRedCost = state.isFirstPath
        ? state.redCost + route.cost
        : state.redCost;
      const nextBlueCost = state.isFirstPath
        ? state.blueCost
        : state.blueCost + route.cost;

      nextBeam.push({
        remaining: state.remaining.filter((g) => g !== group),
        currentStarts: nextStarts,
        reusable: nextReusable,
        redPath: nextRedPath,
        bluePaths: nextBluePaths,
        redCost: nextRedCost,
        blueCost: nextBlueCost,
        totalCost: nextRedCost + nextBlueCost,
        attackPoints: nextAttackPoints,
        shaftEntryDots: nextShaftEntryDots,
        visitedTargets: state.visitedTargets.concat([group.id]),
        isFirstPath: false,
        unresolvedTargets: state.unresolvedTargets,
      });

      expansions++;
    }
  }

  if (!nextBeam.length) {
    for (const state of beam) {
      completeStates.push({
        ...state,
        unresolvedTargets: state.unresolvedTargets + state.remaining.length,
        remaining: [],
      });
    }
    break;
  }

  const seen = new Map();
  nextBeam.sort((a, b) => scorePartialCustomState(a) - scorePartialCustomState(b));

  for (const state of nextBeam) {
    const key = customStateKey(state);
    if (!seen.has(key)) seen.set(key, state);
  }

  beam = Array.from(seen.values())
    .sort((a, b) => scorePartialCustomState(a) - scorePartialCustomState(b))
    .slice(0, CUSTOM_BEAM_WIDTH);
}

if (!completeStates.length && beam.length) {
  completeStates.push(
    ...beam.map((state) => ({
      ...state,
      unresolvedTargets: state.unresolvedTargets + state.remaining.length,
      remaining: [],
    }))
  );
}

if (!completeStates.length) {
  return {
    trunkPath: [],
    branchPaths: [],
    redPath: [],
    bluePaths: [],
    redCost: 0,
    blueCost: 0,
    totalCost: 0,
    unresolvedTargets: targetGroups.length,
    attackPoints: [],
    shaftEntryDots: [],
    visitedTargets: [],
    candidateStates: [],
  };
}

const candidateStates = completeStates.map((state) => ({
  trunkPath: uniquePath(state.redPath),
  branchPaths: state.bluePaths.map(uniquePath),
  redPath: uniquePath(state.redPath),
  bluePaths: state.bluePaths.map(uniquePath),
  redCost: state.redCost,
  blueCost: state.blueCost,
  totalCost: state.redCost + state.blueCost,
  unresolvedTargets: state.unresolvedTargets,
  attackPoints: dedupeCells(state.attackPoints),
  shaftEntryDots: dedupeCells(state.shaftEntryDots),
  visitedTargets: state.visitedTargets,
}));

candidateStates.sort((a, b) => {
  if (a.unresolvedTargets !== b.unresolvedTargets) {
    return a.unresolvedTargets - b.unresolvedTargets;
  }
  if (a.totalCost !== b.totalCost) return a.totalCost - b.totalCost;
  if (a.redCost !== b.redCost) return a.redCost - b.redCost;
  if (a.blueCost !== b.blueCost) return a.blueCost - b.blueCost;
  return a.visitedTargets.join("|").localeCompare(b.visitedTargets.join("|"));
});

const best = candidateStates[0];

return {
  trunkPath: best.redPath,
  branchPaths: best.bluePaths,
  redPath: best.redPath,
  bluePaths: best.bluePaths,
  redCost: best.redCost,
  blueCost: best.blueCost,
  totalCost: best.totalCost,
  unresolvedTargets: best.unresolvedTargets,
  attackPoints: best.attackPoints,
  shaftEntryDots: best.shaftEntryDots,
  visitedTargets: best.visitedTargets,
  candidateStates,
};

}

function makeCustomCandidate({ grid, customPaths, requiredPriorityCells, objectPriorities, objectPriorityMap, getCellObjectType, redVariant, redMode, }) { const redPath = customPaths.redPath || []; const bluePaths = customPaths.bluePaths || []; const redBubbleCount = countRedBubbles(redPath, grid); const firstRedBubbleAt = firstBubbleStep(redPath, grid); const firstBubbleCost = firstBubbleTravelCost( redPath, grid, objectPriorities, objectPriorityMap, getCellObjectType );

const redObjectPriorityScore = getPathObjectPriorityScore(
  redPath,
  objectPriorityMap,
  getCellObjectType,
  objectPriorities
);

let blueObjectPriorityScore = 0;
for (const bluePath of bluePaths) {
  blueObjectPriorityScore += getPathObjectPriorityScore(
    bluePath,
    objectPriorityMap,
    getCellObjectType,
    objectPriorities
  );
}

const missingPriorityCount = countMissingPriorityCells(
  requiredPriorityCells,
  [redPath, ...bluePaths]
);
const redLoopPenalty = redBacktrackPenalty(redPath);
const totalObjectPriorityScore = redObjectPriorityScore + blueObjectPriorityScore;

const effectiveTotal =
  customPaths.totalCost +
  redLoopPenalty +
  missingPriorityCount * 1000000000 +
  customPaths.unresolvedTargets * 1000000000;

return {
  redMode,
  redVariant,
  redBubble: null,
  redBubbles: [],
  redBubbleCount,
  firstRedBubbleAt,
  firstBubbleTravelCost: firstBubbleCost,
  redPath,
  redCost: customPaths.redCost,
  gateGoal: customPaths.attackPoints.length
    ? customPaths.attackPoints[customPaths.attackPoints.length - 1]
    : null,
  bluePaths,
  blueCost: customPaths.blueCost,
  totalCost: customPaths.totalCost,
  shaftEntryDots: customPaths.shaftEntryDots,
  attackPoints: customPaths.attackPoints,
  unresolvedTargets: customPaths.unresolvedTargets,
  dependencyCost: 0,
  assistBonus: 0,
  lowerShaftBonus: 0,
  bubbleBonus: 0,
  redLoopPenalty,
  overAssistPenalty: 0,
  redObjectPriorityScore,
  blueObjectPriorityScore,
  objectPriorityScore: totalObjectPriorityScore,
  missingPriorityCount,
  effectiveTotal,
  visitedTargets: customPaths.visitedTargets || [],
};

}

function solveCustom({ grid, gateType, eventType, objectPriorities, objectPriorityMap, getCellObjectType, }) { const rows = grid.length; const cols = grid[0].length; const { startRow, starts } = getStartCells(grid);

if (!starts.length) {
  return {
    ok: false,
    message: `SOLVER_VERSION: ${SOLVER_VERSION}

No valid start cells one row below the lowest used row.`, startRow, }; }

const requiredPriorityCells = getPriorityCells(grid, objectPriorityMap, getCellObjectType);
const avoidCells = getAvoidCells(grid, objectPriorityMap, getCellObjectType);
const bubbles = getBubbles(grid);
const shaftClustersOrdered = sortShaftClustersBottomToTop(getShaftClusters(grid));

const targetGroups = buildCustomTargetGroups({
  grid,
  gateType,
  objectPriorityMap,
  getCellObjectType,
});

if (!targetGroups.length) {
  return {
    ok: false,
    message:
      `SOLVER_VERSION: ${SOLVER_VERSION}

+solver_mode: custom +No custom objectives selected.`, startRow, }; }

const customPaths = buildCustomPaths({
  grid,
  starts,
  targetGroups,
  objectPriorities,
  objectPriorityMap,
  getCellObjectType,
});

const allCandidates = (customPaths.candidateStates || [customPaths]).map((state, index) =>
  makeCustomCandidate({
    grid,
    customPaths: state,
    requiredPriorityCells,
    objectPriorities,
    objectPriorityMap,
    getCellObjectType,
    redVariant: index === 0 ? "beam-search-best" : "beam-search-alternate",
    redMode: "custom",
  })
);

allCandidates.sort(compareCustomCandidates);
const candidate = allCandidates[0];
const routeAnalysis = buildRouteAnalysis(grid, allCandidates, candidate, "custom");

return {
  ok: true,
  rows,
  cols,
  gateType,
  eventType,
  solverMode: "custom",
  legacyEndMode: false,
  startRow,
  solverVersion: SOLVER_VERSION,
  objectPriorities: { ...objectPriorities },
  objectPriorityMap: objectPriorityMap ? { ...objectPriorityMap } : null,
  requiredPriorityCells,
  avoidCells,
  redMode: candidate.redMode,
  redVariant: candidate.redVariant,
  redBubble: null,
  redBubbles: [],
  redBubbleCount: candidate.redBubbleCount,
  firstRedBubbleAt: candidate.firstRedBubbleAt,
  firstBubbleTravelCost:
    candidate.firstBubbleTravelCost === Infinity ? null : roundCost(candidate.firstBubbleTravelCost),
  redPath: candidate.redPath,
  redCost: roundCost(candidate.redCost),
  bluePaths: candidate.bluePaths,
  blueCost: roundCost(candidate.blueCost),
  totalCost: roundCost(candidate.redCost + candidate.blueCost),
  redObjectPriorityScore: roundCost(candidate.redObjectPriorityScore),
  blueObjectPriorityScore: roundCost(candidate.blueObjectPriorityScore),
  objectPriorityScore: roundCost(candidate.objectPriorityScore),
  missingPriorityCount: candidate.missingPriorityCount,
  effectiveTotal: roundCost(candidate.effectiveTotal),
  dependencyCost: 0,
  assistBonus: 0,
  lowerShaftBonus: 0,
  bubbleBonus: 0,
  redLoopPenalty: roundCost(candidate.redLoopPenalty),
  overAssistPenalty: 0,
  shaftClusters: shaftClustersOrdered,
  shaftEntryDots: candidate.shaftEntryDots,
  attackPoints: candidate.attackPoints,
  bubbles,
  unresolvedTargets: candidate.unresolvedTargets,
  redCandidateCount: allCandidates.length,
  routeAnalysis,
  message:
    `SOLVER_VERSION: ${SOLVER_VERSION}

+solver_mode: custom +solver_status: solved +custom_search: beam +custom_candidate_count: ${allCandidates.length} +missing_priority_count: ${candidate.missingPriorityCount} +unresolved_targets: ${candidate.unresolvedTargets} +red_cost: ${roundCost(candidate.redCost)} +blue_cost: ${roundCost(candidate.blueCost)} +effective_total: ${roundCost(candidate.effectiveTotal)}` }; }

function solveGrid({ grid, gateType = "standard", eventType = null, objectPriorities = null, objectPriorityMap = null, getCellObjectType = null, solverMode = "standard", }) { const normalizedObjectPriorities = normalizeObjectPriorities( objectPriorities || GLOBAL_OBJECT_PRIORITIES ); const normalizedSolverMode = normalizeSolverMode(solverMode); const rawSolverMode = String(solverMode || "standard").trim().toLowerCase();

if (rawSolverMode === "main_graveyard" || rawSolverMode === "graveyard") {
  return solveMainGraveyardNoGate({
    grid,
    gateType: "none",
    eventType,
    objectPriorities: normalizedObjectPriorities,
    objectPriorityMap,
    getCellObjectType,
  });
}

if (normalizedSolverMode === "custom") {
  return solveCustom({
    grid,
    gateType,
    eventType,
    objectPriorities: normalizedObjectPriorities,
    objectPriorityMap,
    getCellObjectType,
  });
}

return solveStandard({
  grid,
  gateType,
  eventType,
  objectPriorities: normalizedObjectPriorities,
  objectPriorityMap,
  getCellObjectType,
});

}

window.ZMPathfinderSolver = { solverVersion: SOLVER_VERSION, numberCost, solveGrid, setObjectPriorities, getObjectPriorities, defaultObjectPriorities: { ...DEFAULT_OBJECT_PRIORITIES }, }; })();
