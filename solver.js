(function () {
  console.log("ZM Solver V7.0 loaded");

  const SOLVER_VERSION = "V7.0";

  const DEFAULT_OBJECT_PRIORITIES = {
    mineralMultiplier: 1,
    mineralFlat: 0,
    bubbleFlat: 0,
    blankFlat: 0,
    gateFlat: 0,
    startFlat: 0,
    highMineralThreshold: 28,
    highMineralFlat: 0,
    priorityObjectBonus: -250000,
    avoidObjectPenalty: 250000,
  };

  let GLOBAL_OBJECT_PRIORITIES = { ...DEFAULT_OBJECT_PRIORITIES };

  function normalizeObjectPriorities(priorities) {
    const merged = {
      ...DEFAULT_OBJECT_PRIORITIES,
      ...(priorities || {}),
    };

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

  function setObjectPriorities(priorities) {
    GLOBAL_OBJECT_PRIORITIES = normalizeObjectPriorities(priorities);
    return { ...GLOBAL_OBJECT_PRIORITIES };
  }

  function getObjectPriorities() {
    return { ...GLOBAL_OBJECT_PRIORITIES };
  }

  function normalizeSolverMode(value) {
    return String(value || "standard").trim().toLowerCase() === "custom"
      ? "custom"
      : "standard";
  }

  function normalizePrioritySetting(value) {
    const v = String(value || "").trim().toLowerCase();
    if (v === "priority" || v === "avoid" || v === "normal") return v;
    return "normal";
  }

  function numberCost(n) {
    if (!Number.isFinite(n) || n <= 0) return 0;
    if (n <= 10) return Math.pow(2, n);
    return Math.pow(2, 10) * Math.pow(1.6, n - 10);
  }

  function roundCost(n) {
    if (!Number.isFinite(n)) return n;
    return Math.round(n * 100) / 100;
  }

  function cellKey(r, c) {
    return `${r},${c}`;
  }

  function sameCell(a, b) {
    return !!a && !!b && a[0] === b[0] && a[1] === b[1];
  }

  function dedupeCells(cells) {
    const seen = new Set();
    const out = [];
    for (const [r, c] of cells || []) {
      const key = cellKey(r, c);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push([r, c]);
    }
    return out;
  }

  function pathSet(path) {
    const set = new Set();
    for (const [r, c] of path || []) {
      set.add(cellKey(r, c));
    }
    return set;
  }

  function pathsToSet(paths) {
    const set = new Set();
    for (const path of paths || []) {
      for (const [r, c] of path || []) {
        set.add(cellKey(r, c));
      }
    }
    return set;
  }

  function uniquePath(path) {
    const out = [];
    for (const [r, c] of path || []) {
      if (!out.length || out[out.length - 1][0] !== r || out[out.length - 1][1] !== c) {
        out.push([r, c]);
      }
    }
    return out;
  }

  function mergePaths(a, b) {
    if (!a || !a.length) return b ? [...b] : [];
    if (!b || !b.length) return [...a];
    if (sameCell(a[a.length - 1], b[0])) {
      return [...a, ...b.slice(1)];
    }
    return [...a, ...b];
  }

  function hasPathLoop(path) {
    const seen = new Set();
    for (const [r, c] of path || []) {
      const key = cellKey(r, c);
      if (seen.has(key)) return true;
      seen.add(key);
    }
    return false;
  }

  function pathRawNumberSum(path, grid, freeCells = new Set()) {
    let total = 0;
    for (const [r, c] of path || []) {
      const key = cellKey(r, c);
      if (freeCells.has(key)) continue;
      if (typeof grid[r]?.[c] === "number") total += grid[r][c];
    }
    return total;
  }

  function countBubbleCells(path, grid) {
    let n = 0;
    for (const [r, c] of path || []) {
      if (grid[r]?.[c] === "B") n++;
    }
    return n;
  }

  function countRedBubbles(path, grid) {
    return countBubbleCells(path, grid);
  }

  function firstBubbleStep(path, grid) {
    if (!path || !path.length) return Infinity;
    for (let i = 0; i < path.length; i++) {
      const [r, c] = path[i];
      if (grid[r]?.[c] === "B") return i;
    }
    return Infinity;
  }

  function isWalkableCell(grid, r, c) {
    if (!grid || r < 0 || c < 0 || r >= grid.length || c >= grid[0].length) return false;
    const v = grid[r][c];
    return v !== "X" && v !== "S";
  }

  function isAttackableTile(v) {
    return typeof v === "number" || v === "B" || v === "";
  }

  function getCellPrioritySetting(r, c, objectPriorityMap, getCellObjectType) {
    if (!objectPriorityMap || typeof getCellObjectType !== "function") return "normal";
    const objectType = String(getCellObjectType(r, c) || "").trim().toLowerCase();
    if (!objectType) return "normal";
    return normalizePrioritySetting(objectPriorityMap[objectType]);
  }

  function getPerObjectPriorityAdjustment(r, c, options = {}) {
    const priorities = normalizeObjectPriorities(
      options.objectPriorities || GLOBAL_OBJECT_PRIORITIES
    );
    const setting = getCellPrioritySetting(
      r,
      c,
      options.objectPriorityMap,
      options.getCellObjectType
    );

    if (setting === "priority") return priorities.priorityObjectBonus;
    if (setting === "avoid") return priorities.avoidObjectPenalty;
    return 0;
  }

  function isGoalCell(r, c, goals) {
    for (const [gr, gc] of goals || []) {
      if (gr === r && gc === c) return true;
    }
    return false;
  }

  function isStartCell(r, c, starts) {
    for (const [sr, sc] of starts || []) {
      if (sr === r && sc === c) return true;
    }
    return false;
  }

  function cellWeight(grid, r, c, freeCells, options = {}) {
    if (freeCells && freeCells.has(cellKey(r, c))) return 0;

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

  function dijkstra({
    grid,
    starts,
    goals,
    freeCells = new Set(),
    blockedEdges = new Set(),
    penaltyCells = new Map(),
    objectPriorities = null,
    objectPriorityMap = null,
    getCellObjectType = null,
  }) {
    if (!starts?.length || !goals?.length) return null;

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

  function getLowestUsedRow(grid) {
    let max = -1;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[0].length; c++) {
        if (grid[r][c] !== "") max = Math.max(max, r);
      }
    }
    return max;
  }

  function getStartCells(grid) {
    const rows = grid.length;
    const cols = grid[0].length;
    const lowest = getLowestUsedRow(grid);
    const startRow = Math.min(rows - 1, Math.max(0, lowest + 1));
    const starts = [];

    for (let c = 0; c < cols; c++) {
      if (isWalkableCell(grid, startRow, c)) starts.push([startRow, c]);
    }

    return { startRow, starts };
  }

  function getGateGoals(grid, gateType) {
    const cols = gateType === "end" ? [2, 3, 4] : [1, 2, 3, 4, 5];
    return cols.map((c) => [0, c]).filter(([r, c]) => isWalkableCell(grid, r, c));
  }

  function getBubbles(grid) {
    const out = [];
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[0].length; c++) {
        if (grid[r][c] === "B") out.push([r, c]);
      }
    }
    return out;
  }

  function getPriorityCells(grid, objectPriorityMap, getCellObjectType) {
    const out = [];
    if (!objectPriorityMap || typeof getCellObjectType !== "function") return out;

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

  function getAvoidCells(grid, objectPriorityMap, getCellObjectType) {
    const out = [];
    if (!objectPriorityMap || typeof getCellObjectType !== "function") return out;

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

  function getPathObjectPriorityScore(path, objectPriorityMap, getCellObjectType, priorities) {
    if (!path || !path.length || !objectPriorityMap || typeof getCellObjectType !== "function") {
      return 0;
    }

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

  function getShaftClusters(grid) {
    const rows = grid.length;
    const cols = grid[0].length;
    const seen = new Set();
    const clusters = [];

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

  function sortShaftClustersBottomToTop(clusters) {
    return [...clusters].sort((a, b) => {
      const aBottom = Math.max(...a.map(([r]) => r));
      const bBottom = Math.max(...b.map(([r]) => r));
      if (aBottom !== bBottom) return bBottom - aBottom;

      const aTop = Math.min(...a.map(([r]) => r));
      const bTop = Math.min(...b.map(([r]) => r));
      return bTop - aTop;
    });
  }

  function getShaftAttackInfo(grid, cluster) {
    const attacks = [];
    const entryMap = new Map();

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

  function getPathEndpoints(path) {
    if (!path || !path.length) return [];
    return [path[path.length - 1]];
  }

  function countAdjacentSharedOpens(redPath, bluePath) {
    if (!redPath || !bluePath) return 0;
    const redSet = new Set(redPath.map(([r, c]) => cellKey(r, c)));
    let score = 0;

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

  function bubblePathBonus(path, entry, grid) {
    let bonus = countBubbleCells(path, grid) * 0.4;
    if (entry && grid[entry[0]]?.[entry[1]] === "B") {
      bonus += 4.0;
    }
    return bonus;
  }

  function getEntryBottomDepth(entry, cluster) {
    if (!entry || !cluster || !cluster.length) return 0;
    const bottom = Math.max(...cluster.map(([r]) => r));
    return entry[0] / Math.max(1, bottom);
  }

  function getLowestShaftPreferenceBonus(route, entry, cluster, routeKind, isLowestShaft) {
    if (!route || !entry || !cluster || !isLowestShaft) return 0;
    const bottom = Math.max(...cluster.map(([r]) => r));
    const entryDepth = entry[0];
    const lowerIsBetter = entryDepth / Math.max(1, bottom);

    let bonus = lowerIsBetter * 5.0;
    if (routeKind === "base") bonus += 1.25;

    return bonus;
  }

  function redBacktrackPenalty(path) {
    if (!path || path.length < 3) return 0;

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

  function redLoopAssistPenalty() {
    return 0;
  }

  function getCellDisplayValue(grid, r, c) {
    const v = grid[r]?.[c];
    if (typeof v === "number") return String(v);
    if (v === "B") return "B";
    if (v === "") return "□";
    return String(v);
  }

  function getPathValueLabel(grid, path) {
    if (!path || !path.length) return "(no path)";
    return path.map(([r, c]) => getCellDisplayValue(grid, r, c)).join(" - ");
  }

  function getPathCoordLabel(path) {
    if (!path || !path.length) return "(no path)";
    return path.map(([r, c]) => `${r},${c}`).join(" → ");
  }

  function countMissingPriorityCells(allPriorityCells, usedPaths) {
    if (!allPriorityCells || !allPriorityCells.length) return 0;

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

  function firstBubbleTravelCost(
    path,
    grid,
    objectPriorities,
    objectPriorityMap = null,
    getCellObjectType = null
  ) {
    const idx = firstBubbleStep(path, grid);
    if (idx === Infinity) return Infinity;

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

  function buildRouteAnalysis(grid, allCandidates, best) {
    const sorted = [...allCandidates].sort((a, b) => {
      if (a.unresolvedTargets !== b.unresolvedTargets) {
        return a.unresolvedTargets - b.unresolvedTargets;
      }
      if ((a.missingPriorityCount ?? 0) !== (b.missingPriorityCount ?? 0)) {
        return (a.missingPriorityCount ?? 0) - (b.missingPriorityCount ?? 0);
      }
      if (a.redBubbleCount !== b.redBubbleCount) {
        return b.redBubbleCount - a.redBubbleCount;
      }
      if (a.firstBubbleTravelCost !== b.firstBubbleTravelCost) {
        return a.firstBubbleTravelCost - b.firstBubbleTravelCost;
      }
      if (a.redCost !== b.redCost) {
        return a.redCost - b.redCost;
      }
      if (a.objectPriorityScore !== b.objectPriorityScore) {
        return a.objectPriorityScore - b.objectPriorityScore;
      }
      const aRaw = pathRawNumberSum(a.redPath, grid);
      const bRaw = pathRawNumberSum(b.redPath, grid);
      if (aRaw !== bRaw) return aRaw - bRaw;
      if (a.effectiveTotal !== b.effectiveTotal) return a.effectiveTotal - b.effectiveTotal;
      return 0;
    });

    return sorted.slice(0, 12).map((candidate) => {
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
        effectiveTotal: roundCost(candidate.effectiveTotal),
        deltaFromBest: roundCost(candidate.effectiveTotal - best.effectiveTotal),
      };
    });
  }

  function buildStandardRedCandidates({
    grid,
    starts,
    gateGoals,
    bubbles,
    objectPriorities,
    objectPriorityMap,
    getCellObjectType,
  }) {
    const candidates = [];

    for (const gateGoal of gateGoals) {
      const direct = dijkstra({
        grid,
        starts,
        goals: [gateGoal],
        objectPriorities,
        objectPriorityMap,
        getCellObjectType,
      });

      if (direct) {
        candidates.push({
          mode: "direct",
          variant: "base",
          redBubble: null,
          redBubbles: [],
          path: uniquePath(direct.path),
          redCost: direct.cost,
          gateGoal,
        });
      }
    }

    for (const bubble of bubbles) {
      const toBubble = dijkstra({
        grid,
        starts,
        goals: [bubble],
        objectPriorities,
        objectPriorityMap,
        getCellObjectType,
      });

      if (!toBubble) continue;

      for (const gateGoal of gateGoals) {
        const toGate = dijkstra({
          grid,
          starts: [bubble],
          goals: [gateGoal],
          objectPriorities,
          objectPriorityMap,
          getCellObjectType,
        });

        if (!toGate) continue;

        candidates.push({
          mode: "via bubble",
          variant: "base",
          redBubble: bubble,
          redBubbles: [bubble],
          path: uniquePath(mergePaths(toBubble.path, toGate.path)),
          redCost: toBubble.cost + toGate.cost,
          gateGoal,
        });
      }
    }

    const seen = new Set();
    return candidates
      .filter((cand) => {
        const key = cand.path.map(([r, c]) => cellKey(r, c)).join("|");
        if (seen.has(key)) return false;
        seen.add(key);
        return !hasPathLoop(cand.path);
      })
      .sort((a, b) => a.redCost - b.redCost || a.path.length - b.path.length)
      .slice(0, 40);
  }

  function evaluateOrderedBlueForStandard({
    grid,
    starts,
    redCandidate,
    shaftClustersOrdered,
    bubbles,
    objectPriorities,
    objectPriorityMap,
    getCellObjectType,
    }) {
    const bluePaths = [];
    const shaftEntryDots = [];
    const attackPoints = [];
    let blueCost = 0;
    let unresolved = 0;
    let dependencyCost = 0;
    let assistBonus = 0;
    let lowerShaftBonus = 0;
    let bubbleBonus = 0;

    const reusable = new Set([...pathSet(redCandidate.path)]);
    let cumulativeStarts = dedupeCells(starts.concat(redCandidate.path));

    for (let i = 0; i < shaftClustersOrdered.length; i++) {
      const cluster = shaftClustersOrdered[i];
      const info = getShaftAttackInfo(grid, cluster);

      if (!info.attacks.length) {
        unresolved++;
        continue;
      }

      const route = dijkstra({
        grid,
        starts: cumulativeStarts,
        goals: info.attacks,
        freeCells: reusable,
        objectPriorities,
        objectPriorityMap,
        getCellObjectType,
      });

      if (!route) {
        unresolved++;
        continue;
      }

      const finalPath = uniquePath(route.path);
      const entry = info.entryMap.get(cellKey(route.goal[0], route.goal[1]));

      bluePaths.push(finalPath);
      attackPoints.push(route.goal);
      if (entry) shaftEntryDots.push(entry);

      blueCost += route.cost;
      assistBonus += Math.min(1.25, countAdjacentSharedOpens(redCandidate.path, finalPath) * 0.03);
      lowerShaftBonus += getLowestShaftPreferenceBonus(route, entry, cluster, "base", i === 0);
      bubbleBonus += bubblePathBonus(finalPath, entry, grid);

      for (const [r, c] of finalPath) {
        reusable.add(cellKey(r, c));
      }

      cumulativeStarts = dedupeCells(
        cumulativeStarts.concat(finalPath).concat(getPathEndpoints(finalPath))
      );
    }

    const redBubbleKeys = new Set((redCandidate.redBubbles || []).map(([r, c]) => cellKey(r, c)));

    for (const bubble of bubbles) {
      const key = cellKey(bubble[0], bubble[1]);
      if (redBubbleKeys.has(key)) continue;

      const route = dijkstra({
        grid,
        starts: cumulativeStarts,
        goals: [bubble],
        freeCells: reusable,
        objectPriorities,
        objectPriorityMap,
        getCellObjectType,
      });

      if (!route) {
        unresolved++;
        continue;
      }

      const finalPath = uniquePath(route.path);
      bluePaths.push(finalPath);
      blueCost += route.cost;
      bubbleBonus += bubblePathBonus(finalPath, route.goal, grid);

      for (const [r, c] of finalPath) {
        reusable.add(cellKey(r, c));
      }

      cumulativeStarts = dedupeCells(
        cumulativeStarts.concat(finalPath).concat(getPathEndpoints(finalPath))
      );
    }

    return {
      bluePaths,
      shaftEntryDots,
      attackPoints,
      blueCost,
      unresolved,
      dependencyCost,
      assistBonus,
      lowerShaftBonus,
      bubbleBonus,
      redLoopPenalty: redBacktrackPenalty(redCandidate.path),
      overAssistPenalty: redLoopAssistPenalty(),
    };
  }

  function solveStandard({
    grid,
    gateType,
    eventType,
    objectPriorities,
    objectPriorityMap,
    getCellObjectType,
  }) {
    const rows = grid.length;
    const cols = grid[0].length;
    const { startRow, starts } = getStartCells(grid);

    if (!starts.length) {
      return {
        ok: false,
        message: `SOLVER_VERSION: ${SOLVER_VERSION}\nNo valid start cells one row below the lowest used row.`,
        startRow,
      };
    }

    const gateGoals = getGateGoals(grid, gateType);
    if (!gateGoals.length) {
      return {
        ok: false,
        message: `SOLVER_VERSION: ${SOLVER_VERSION}\nNo valid gate attack cells.`,
        startRow,
      };
    }

    const bubbles = getBubbles(grid);
    const shaftClusters = getShaftClusters(grid);
    const shaftClustersOrdered = sortShaftClustersBottomToTop(shaftClusters);

    const redCandidates = buildStandardRedCandidates({
      grid,
      starts,
      gateGoals,
      bubbles,
      objectPriorities,
      objectPriorityMap,
      getCellObjectType,
    });

    if (!redCandidates.length) {
      return {
        ok: false,
        message: `SOLVER_VERSION: ${SOLVER_VERSION}\nNo valid red path to gate.`,
        startRow,
      };
    }

    let best = null;
    const allCandidates = [];

    for (const redCandidate of redCandidates) {
      const blueEval = evaluateOrderedBlueForStandard({
        grid,
        starts,
        redCandidate,
        shaftClustersOrdered,
        bubbles,
        objectPriorities,
        objectPriorityMap,
        getCellObjectType,
      });

      const redBubbleCount = countRedBubbles(redCandidate.path, grid);
      const firstRedBubbleAt = firstBubbleStep(redCandidate.path, grid);
      const firstBubbleCost = firstBubbleTravelCost(
        redCandidate.path,
        grid,
        objectPriorities,
        objectPriorityMap,
        getCellObjectType
      );

      const redObjectPriorityScore = getPathObjectPriorityScore(
        redCandidate.path,
        objectPriorityMap,
        getCellObjectType,
        objectPriorities
      );

      let blueObjectPriorityScore = 0;
      for (const bluePath of blueEval.bluePaths) {
        blueObjectPriorityScore += getPathObjectPriorityScore(
          bluePath,
          objectPriorityMap,
          getCellObjectType,
          objectPriorities
        );
      }

      const totalObjectPriorityScore = redObjectPriorityScore + blueObjectPriorityScore;

      const effectiveTotal =
        redCandidate.redCost +
        blueEval.blueCost +
        blueEval.dependencyCost -
        blueEval.assistBonus -
        blueEval.lowerShaftBonus -
        blueEval.bubbleBonus +
        blueEval.redLoopPenalty +
        blueEval.overAssistPenalty +
        totalObjectPriorityScore;

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

      if (!best) {
        best = candidate;
        continue;
      }

      if (candidate.unresolvedTargets < best.unresolvedTargets) {
        best = candidate;
        continue;
      }

      if (candidate.unresolvedTargets === best.unresolvedTargets) {
        if (candidate.effectiveTotal < best.effectiveTotal) {
          best = candidate;
          continue;
        }

        if (
          candidate.effectiveTotal === best.effectiveTotal &&
          candidate.redCost < best.redCost
        ) {
          best = candidate;
        }
      }
    }

    if (!best) {
      return {
        ok: false,
        message: `SOLVER_VERSION: ${SOLVER_VERSION}\nNo valid non-loop red path to gate.`,
        startRow,
      };
    }

    const routeAnalysis = buildRouteAnalysis(grid, allCandidates, best);

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
      objectPriorityMap: objectPriorityMap ? { ...objectPriorityMap } : null,
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
      routeAnalysis,
      message:
        `SOLVER_VERSION: ${SOLVER_VERSION}\n` +
        `solver_mode: standard\n` +
        `solver_status: solved\n` +
        `red_cost: ${roundCost(best.redCost)}\n` +
        `blue_cost: ${roundCost(best.blueCost)}\n` +
        `effective_total: ${roundCost(best.effectiveTotal)}`
    };
  }

  function buildCustomTargetGroups({
  grid,
  gateType,
  objectPriorityMap,
  getCellObjectType,
}) {
  const groups = [];
  const normalizedMap = objectPriorityMap || {};

  if (normalizePrioritySetting(normalizedMap.gate) === "priority") {
    const gateGoals = getGateGoals(grid, gateType);
    if (gateGoals.length) {
      groups.push({
        id: "gate",
        label: "Gate",
        kind: "gate",
        goals: gateGoals,
        final: true,
      });
    }
  }

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
        if (type === "gate" || type === "shaft" || type === "bubble") continue;
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

  const nonFinal = groups.filter((g) => !g.final);
  const finals = groups.filter((g) => g.final);

  nonFinal.sort((a, b) => {
    const aRow = Math.max(...a.goals.map(([r]) => r));
    const bRow = Math.max(...b.goals.map(([r]) => r));
    return bRow - aRow;
  });

  return [...nonFinal, ...finals];
}

function computePathTraversalCost(
  path,
  grid,
  objectPriorities,
  objectPriorityMap,
  getCellObjectType,
  freeCells = new Set(),
  starts = [],
  goals = []
) {
  if (!path || !path.length) return 0;

  let total = 0;
  for (let i = 0; i < path.length; i++) {
    const [r, c] = path[i];
    total += cellWeight(grid, r, c, freeCells, {
      objectPriorities,
      objectPriorityMap,
      getCellObjectType,
      starts,
      goals,
    });
  }
  return total;
}

function countPathTurns(path) {
  if (!path || path.length < 3) return 0;
  let turns = 0;

  for (let i = 1; i < path.length - 1; i++) {
    const [r0, c0] = path[i - 1];
    const [r1, c1] = path[i];
    const [r2, c2] = path[i + 1];

    const dr1 = r1 - r0;
    const dc1 = c1 - c0;
    const dr2 = r2 - r1;
    const dc2 = c2 - c1;

    if (dr1 !== dr2 || dc1 !== dc2) turns++;
  }

  return turns;
}

function countPathDownMoves(path) {
  if (!path || path.length < 2) return 0;
  let down = 0;

  for (let i = 1; i < path.length; i++) {
    if (path[i][0] > path[i - 1][0]) down++;
  }

  return down;
}

function buildCustomUsageMap(routes) {
  const usage = new Map();

  for (const route of routes || []) {
    const seenInRoute = new Set();

    for (const [r, c] of route.path || []) {
      const key = cellKey(r, c);
      if (seenInRoute.has(key)) continue;
      seenInRoute.add(key);
      usage.set(key, (usage.get(key) || 0) + 1);
    }
  }

  return usage;
}

function scoreCustomTrunkPrefix(prefix, usageMap, grid) {
  if (!prefix || !prefix.length) return -Infinity;

  let sharedScore = 0;
  let costPenalty = 0;

  for (const [r, c] of prefix) {
    const key = cellKey(r, c);
    const usage = usageMap.get(key) || 0;
    sharedScore += usage * usage * 1000;

    const v = grid[r]?.[c];
    if (typeof v === "number") {
      costPenalty += numberCost(v) * 0.015;
    }
  }

  const turns = countPathTurns(prefix);
  const downMoves = countPathDownMoves(prefix);
  const lengthBonus = prefix.length * 6;

  return sharedScore + lengthBonus - costPenalty - turns * 18 - downMoves * 26;
}

function chooseBestCustomTrunk(routes, usageMap, starts, grid) {
  if (!routes || !routes.length) return [];

  const startSet = new Set((starts || []).map(([r, c]) => cellKey(r, c)));
  const candidates = [];

  for (const route of routes) {
    const path = route.path || [];
    if (!path.length) continue;

    let sawStart = false;
    for (let i = 0; i < path.length; i++) {
      const key = cellKey(path[i][0], path[i][1]);
      if (startSet.has(key)) sawStart = true;
      if (!sawStart) continue;

      const usage = usageMap.get(key) || 0;
      const isLast = i === path.length - 1;

      if (usage >= 2 || isLast) {
        const prefix = uniquePath(path.slice(0, i + 1));
        candidates.push({
          prefix,
          score: scoreCustomTrunkPrefix(prefix, usageMap, grid),
          length: prefix.length,
        });
      }
    }
  }

  if (!candidates.length) {
    const fallback = routes
      .map((route) => route.path || [])
      .filter((path) => path.length)
      .sort((a, b) => a.length - b.length)[0];

    return fallback ? uniquePath(fallback) : [];
  }

  candidates.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return b.length - a.length;
  });

  return uniquePath(candidates[0].prefix);
}

function findBestBranchJoinIndex(path, trunkSet, usageMap) {
  if (!path || !path.length) return -1;

  let bestIndex = -1;
  let bestScore = -Infinity;

  for (let i = 0; i < path.length; i++) {
    const key = cellKey(path[i][0], path[i][1]);
    if (!trunkSet.has(key)) continue;

    const usage = usageMap.get(key) || 0;
    const score = usage * 1000 - i * 10;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
}

function buildCustomPaths({
  grid,
  starts,
  targetGroups,
  objectPriorities,
  objectPriorityMap,
  getCellObjectType,
}) {
  const targetRoutes = [];
  let unresolvedTargets = 0;

  for (const group of targetGroups) {
    const route = dijkstra({
      grid,
      starts,
      goals: group.goals,
      freeCells: new Set(),
      objectPriorities,
      objectPriorityMap,
      getCellObjectType,
    });

    if (!route || !route.path || !route.path.length) {
      unresolvedTargets++;
      continue;
    }

    targetRoutes.push({
      group,
      goal: route.goal,
      path: uniquePath(route.path),
      cost: route.cost,
    });
  }

  if (!targetRoutes.length) {
    return {
      trunkPath: [],
      branchPaths: [],
      redPath: [],
      bluePaths: [],
      redCost: 0,
      blueCost: 0,
      totalCost: 0,
      unresolvedTargets,
      attackPoints: [],
      shaftEntryDots: [],
      visitedTargets: [],
    };
  }

  const usageMap = buildCustomUsageMap(targetRoutes);
  const trunkPath = chooseBestCustomTrunk(targetRoutes, usageMap, starts, grid);
  const trunkSet = pathSet(trunkPath);

  const rawBranches = [];
  const attackPoints = [];
  const shaftEntryDots = [];
  const visitedTargets = [];

  for (const route of targetRoutes) {
    visitedTargets.push(route.group.id);

    if (route.group.kind === "gate") {
      attackPoints.push(route.goal);
    } else if (route.group.kind === "shaft" && route.group.entryMap) {
      attackPoints.push(route.goal);
      const entry = route.group.entryMap.get(cellKey(route.goal[0], route.goal[1]));
      if (entry) shaftEntryDots.push(entry);
    } else if (
      route.group.kind === "bubble" ||
      route.group.kind === "object"
    ) {
      attackPoints.push(route.goal);
    }

    const joinIndex = findBestBranchJoinIndex(route.path, trunkSet, usageMap);

    if (joinIndex < 0) {
      if (!hasPathLoop(route.path)) {
        rawBranches.push(uniquePath(route.path));
      }
      continue;
    }

    if (joinIndex >= route.path.length - 1) {
      continue;
    }

    const branch = uniquePath(route.path.slice(joinIndex));
    if (branch.length > 1 && !hasPathLoop(branch)) {
      rawBranches.push(branch);
    }
  }

  const branchSeen = new Set();
  const branchPaths = rawBranches.filter((branch) => {
    const key = branch.map(([r, c]) => cellKey(r, c)).join("|");
    if (branchSeen.has(key)) return false;
    branchSeen.add(key);
    return true;
  });

  const redCost = computePathTraversalCost(
    trunkPath,
    grid,
    objectPriorities,
    objectPriorityMap,
    getCellObjectType,
    new Set(),
    starts,
    []
  );

  const usedForBlue = pathSet(trunkPath);
  let blueCost = 0;

  for (const branch of branchPaths) {
    blueCost += computePathTraversalCost(
      branch,
      grid,
      objectPriorities,
      objectPriorityMap,
      getCellObjectType,
      usedForBlue,
      starts,
      []
    );

    for (const [r, c] of branch) {
      usedForBlue.add(cellKey(r, c));
    }
  }

  return {
    trunkPath,
    branchPaths,
    redPath: trunkPath,
    bluePaths: branchPaths,
    redCost,
    blueCost,
    totalCost: redCost + blueCost,
    unresolvedTargets,
    attackPoints: dedupeCells(attackPoints),
    shaftEntryDots: dedupeCells(shaftEntryDots),
    visitedTargets,
  };
}

function solveCustom({
  grid,
  gateType,
  eventType,
  objectPriorities,
  objectPriorityMap,
  getCellObjectType,
}) {
  const rows = grid.length;
  const cols = grid[0].length;
  const { startRow, starts } = getStartCells(grid);

  if (!starts.length) {
    return {
      ok: false,
      message: `SOLVER_VERSION: ${SOLVER_VERSION}\nNo valid start cells one row below the lowest used row.`,
      startRow,
    };
  }

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
        `SOLVER_VERSION: ${SOLVER_VERSION}\n` +
        `solver_mode: custom\n` +
        `No custom objectives selected.`,
      startRow,
    };
  }

  const customPaths = buildCustomPaths({
    grid,
    starts,
    targetGroups,
    objectPriorities,
    objectPriorityMap,
    getCellObjectType,
  });

  const redPath = customPaths.redPath || [];
  const bluePaths = customPaths.bluePaths || [];
  const redBubbleCount = countRedBubbles(redPath, grid);
  const firstRedBubbleAt = firstBubbleStep(redPath, grid);
  const firstBubbleCost = firstBubbleTravelCost(
    redPath,
    grid,
    objectPriorities,
    objectPriorityMap,
    getCellObjectType
  );

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
    totalObjectPriorityScore +
    redLoopPenalty +
    missingPriorityCount * 1000000000 +
    customPaths.unresolvedTargets * 1000000000;

  const candidate = {
    redMode: "custom",
    redVariant: "shared-trunk-and-branches",
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
  };

  const routeAnalysis = buildRouteAnalysis(grid, [candidate], candidate);

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
    redBubbleCount,
    firstRedBubbleAt,
    firstBubbleTravelCost:
      firstBubbleCost === Infinity ? null : roundCost(firstBubbleCost),
    redPath,
    redCost: roundCost(candidate.redCost),
    bluePaths,
    blueCost: roundCost(candidate.blueCost),
    totalCost: roundCost(candidate.redCost + candidate.blueCost),
    redObjectPriorityScore: roundCost(redObjectPriorityScore),
    blueObjectPriorityScore: roundCost(blueObjectPriorityScore),
    objectPriorityScore: roundCost(totalObjectPriorityScore),
    missingPriorityCount,
    effectiveTotal: roundCost(effectiveTotal),
    dependencyCost: 0,
    assistBonus: 0,
    lowerShaftBonus: 0,
    bubbleBonus: 0,
    redLoopPenalty: roundCost(redLoopPenalty),
    overAssistPenalty: 0,
    shaftClusters: shaftClustersOrdered,
    shaftEntryDots: customPaths.shaftEntryDots,
    attackPoints: customPaths.attackPoints,
    bubbles,
    unresolvedTargets: customPaths.unresolvedTargets,
    redCandidateCount: 1,
    routeAnalysis,
    message:
      `SOLVER_VERSION: ${SOLVER_VERSION}\n` +
      `solver_mode: custom\n` +
      `solver_status: solved\n` +
      `missing_priority_count: ${missingPriorityCount}\n` +
      `unresolved_targets: ${customPaths.unresolvedTargets}\n` +
      `red_cost: ${roundCost(candidate.redCost)}\n` +
      `blue_cost: ${roundCost(candidate.blueCost)}\n` +
      `effective_total: ${roundCost(effectiveTotal)}`
  };
}

function solveGrid({
  grid,
  gateType = "standard",
  eventType = null,
  objectPriorities = null,
  objectPriorityMap = null,
  getCellObjectType = null,
  solverMode = "standard",
}) {
  const normalizedObjectPriorities = normalizeObjectPriorities(
    objectPriorities || GLOBAL_OBJECT_PRIORITIES
  );
  const normalizedSolverMode = normalizeSolverMode(solverMode);

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

window.ZMPathfinderSolver = {
  solverVersion: SOLVER_VERSION,
  numberCost,
  solveGrid,
  setObjectPriorities,
  getObjectPriorities,
  defaultObjectPriorities: { ...DEFAULT_OBJECT_PRIORITIES },
};
})();
