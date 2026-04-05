(function () {
  console.log("ZM Solver V5.7 loaded");

  const SOLVER_VERSION = "V5.7";

  const DEFAULT_OBJECT_PRIORITIES = {
    mineralMultiplier: 1,
    mineralFlat: 0,
    bubbleFlat: 0,
    blankFlat: 0,
    gateFlat: 0,
    startFlat: 0,
    highMineralThreshold: 28,
    highMineralFlat: 0,
    priorityObjectBonus: -250,
    avoidObjectPenalty: 250,
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
        Number.isFinite(merged.priorityObjectBonus) ? merged.priorityObjectBonus : -250,
      avoidObjectPenalty:
        Number.isFinite(merged.avoidObjectPenalty) ? merged.avoidObjectPenalty : 250,
    };
  }

  function setObjectPriorities(priorities) {
    GLOBAL_OBJECT_PRIORITIES = normalizeObjectPriorities(priorities);
    return { ...GLOBAL_OBJECT_PRIORITIES };
  }

  function getObjectPriorities() {
    return { ...GLOBAL_OBJECT_PRIORITIES };
  }

  function numberCost(n) {
    if (!Number.isFinite(n) || n <= 0) return 0;
    if (n <= 10) return Math.pow(2, n);
    return Math.pow(2, 10) * Math.pow(1.6, n - 10);
  }

  function roundCost(n) {
    return Math.round(n * 100) / 100;
  }

  function isWalkableCell(grid, r, c) {
    if (r < 0 || c < 0 || r >= grid.length || c >= grid[0].length) return false;
    const v = grid[r][c];
    return v !== "X" && v !== "S";
  }

  function isAttackableTile(v) {
    return typeof v === "number" || v === "B" || v === "";
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

  function normalizePrioritySetting(value) {
    const v = String(value || "").trim().toLowerCase();
    if (v === "priority" || v === "avoid" || v === "normal") return v;
    return "normal";
  }

  function cellWeight(grid, r, c, freeCells, options = {}) {
    if (freeCells && freeCells.has(`${r},${c}`)) return 0;

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

    return baseCost;
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

      if (setting === "priority") {
        score += normalized.priorityObjectBonus;
      } else if (setting === "avoid") {
        score += normalized.avoidObjectPenalty;
      }
    }

    return score;
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

  function getShaftClusters(grid) {
    const rows = grid.length;
    const cols = grid[0].length;
    const seen = new Set();
    const clusters = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] !== "S") continue;
        const key = `${r},${c}`;
        if (seen.has(key)) continue;

        const stack = [[r, c]];
        const cluster = [];

        while (stack.length) {
          const [rr, cc] = stack.pop();
          const k = `${rr},${cc}`;
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

  function getShaftAttackInfo(grid, cluster) {
    const clusterSet = new Set(cluster.map(([r, c]) => `${r},${c}`));
    const attacks = [];
    const entryMap = new Map();

    for (const [r, c] of cluster) {
      const neighbors = [
        [r + 1, c],
        [r - 1, c],
        [r, c + 1],
        [r, c - 1],
      ];

      for (const [rr, cc] of neighbors) {
        if (rr < 0 || cc < 0 || rr >= grid.length || cc >= grid[0].length) continue;
        if (clusterSet.has(`${rr},${cc}`)) continue;

        if (isAttackableTile(grid[rr][cc])) {
          const key = `${rr},${cc}`;
          if (!entryMap.has(key)) {
            attacks.push([rr, cc]);
            entryMap.set(key, [r, c]);
          }
        }
      }
    }

    return { attacks, entryMap };
  }

  function dijkstra({
    grid,
    starts,
    goals,
    freeCells = new Set(),
    blockedEdges = new Set(),
    penaltyCells = new Map(),
    objectPriorities = null,
  }) {
    if (!starts.length || !goals.length) return null;

    const rows = grid.length;
    const cols = grid[0].length;
    const goalSet = new Set(goals.map(([r, c]) => `${r},${c}`));
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

      if (goalSet.has(`${cur.r},${cur.c}`)) {
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
        return { path, cost: cur.cost, goal: [cur.r, cur.c], len: cur.len };
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

        const penalty = penaltyCells.get(`${nr},${nc}`) || 0;
        const nextCost =
          cur.cost +
          cellWeight(grid, nr, nc, freeCells, {
            objectPriorities,
            goals,
            starts,
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

  function pathSet(path) {
    const set = new Set();
    for (const [r, c] of path || []) set.add(`${r},${c}`);
    return set;
  }

  function mergePaths(a, b) {
    if (!a || !a.length) return b ? [...b] : [];
    if (!b || !b.length) return [...a];
    return [...a, ...b.slice(1)];
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

  function hasPathLoop(path) {
    const seen = new Set();
    for (const [r, c] of path || []) {
      const key = `${r},${c}`;
      if (seen.has(key)) return true;
      seen.add(key);
    }
    return false;
  }

  function dedupeCells(cells) {
    const seen = new Set();
    const out = [];
    for (const [r, c] of cells) {
      const key = `${r},${c}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push([r, c]);
    }
    return out;
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

  function getPathEndpoints(path) {
    if (!path || !path.length) return [];
    return [path[path.length - 1]];
  }

  function countAdjacentSharedOpens(redPath, bluePath) {
    if (!redPath || !bluePath) return 0;
    const redSet = new Set(redPath.map(([r, c]) => `${r},${c}`));
    let score = 0;
    for (const [r, c] of bluePath) {
      const neighbors = [
        [r + 1, c],
        [r - 1, c],
        [r, c + 1],
        [r, c - 1],
      ];
      for (const [rr, cc] of neighbors) {
        if (redSet.has(`${rr},${cc}`)) {
          score++;
          break;
        }
      }
    }
    return score;
  }

  function countBubbleCells(path, grid) {
    let n = 0;
    for (const [r, c] of path || []) {
      if (grid[r] && grid[r][c] === "B") n++;
    }
    return n;
  }

  function bubblePathBonus(path, entry, grid) {
    let bonus = countBubbleCells(path, grid) * 0.4;
    if (entry && grid[entry[0]] && grid[entry[0]][entry[1]] === "B") {
      bonus += 4.0;
    }
    return bonus;
  }

  function pathTouchesAnyStart(path, starts) {
    const startSet = new Set(starts.map(([r, c]) => `${r},${c}`));
    for (const [r, c] of path || []) {
      if (startSet.has(`${r},${c}`)) return true;
    }
    return false;
  }

  function buildPenaltyCellsFromPath(path, amount) {
    const m = new Map();
    for (const [r, c] of path || []) {
      m.set(`${r},${c}`, amount);
    }
    return m;
  }

  function buildPenaltyCellsForHighMinerals(path, grid, amount, threshold = 28) {
    const m = new Map();
    for (const [r, c] of path || []) {
      const v = grid[r]?.[c];
      if (typeof v === "number" && v >= threshold) {
        m.set(`${r},${c}`, amount);
      }
    }
    return m;
  }

  function buildPenaltyCellsForWeightedPath(path, grid, multiplier = 0.35) {
    const m = new Map();
    for (const [r, c] of path || []) {
      const v = grid[r]?.[c];
      if (typeof v === "number") {
        m.set(`${r},${c}`, numberCost(v) * multiplier);
      }
    }
    return m;
  }

  function buildBlockedEdgesFromPath(path) {
    const s = new Set();
    for (let i = 0; i < (path || []).length - 1; i++) {
      const [r1, c1] = path[i];
      const [r2, c2] = path[i + 1];
      s.add(`${r1},${c1}->${r2},${c2}`);
      s.add(`${r2},${c2}->${r1},${c1}`);
    }
    return s;
  }

  function buildEarlyBlockedEdgesFromPath(path, count = 3) {
    const s = new Set();
    for (let i = 0; i < Math.min(count, Math.max(0, (path || []).length - 1)); i++) {
      const [r1, c1] = path[i];
      const [r2, c2] = path[i + 1];
      s.add(`${r1},${c1}->${r2},${c2}`);
      s.add(`${r2},${c2}->${r1},${c1}`);
    }
    return s;
  }

  function buildForkDetours(grid, starts, goal, objectPriorities) {
    const base = dijkstra({
      grid,
      starts,
      goals: [goal],
      objectPriorities
    });
    if (!base || !base.path || base.path.length < 4) return [];

    const detours = [];
    const usedEdges = new Set();

    for (let i = 1; i < base.path.length - 2; i++) {
      const [r, c] = base.path[i];
      const prev = base.path[i - 1];
      const next = base.path[i + 1];

      const neighbors = [
        [r + 1, c],
        [r - 1, c],
        [r, c + 1],
        [r, c - 1],
      ];

      let branchCount = 0;
      for (const [nr, nc] of neighbors) {
        if (isWalkableCell(grid, nr, nc)) branchCount++;
      }
      if (branchCount < 3) continue;

      for (const [nr, nc] of neighbors) {
        if (!isWalkableCell(grid, nr, nc)) continue;
        if ((nr === prev[0] && nc === prev[1]) || (nr === next[0] && nc === next[1])) {
          continue;
        }

        const block = new Set();
        block.add(`${r},${c}->${next[0]},${next[1]}`);
        block.add(`${next[0]},${next[1]}->${r},${c}`);

        const key = Array.from(block).sort().join("|");
        if (usedEdges.has(key)) continue;
        usedEdges.add(key);

        const alt = dijkstra({
          grid,
          starts,
          goals: [goal],
          blockedEdges: block,
          objectPriorities
        });

        if (alt && alt.path && alt.path.length) {
          detours.push(alt);
        }
      }
    }

    return detours;
  }

  function addCandidate(candidates, candidate) {
    if (!candidate || !candidate.path || !candidate.path.length) return;
    if (hasPathLoop(candidate.path)) return;
    candidates.push(candidate);
  }

  function countRedBubbles(path, grid) {
    let count = 0;
    for (const [r, c] of path || []) {
      if (grid[r] && grid[r][c] === "B") count++;
    }
    return count;
  }

  function firstBubbleStep(path, grid) {
    if (!path || !path.length) return Infinity;
    for (let i = 0; i < path.length; i++) {
      const [r, c] = path[i];
      if (grid[r] && grid[r][c] === "B") return i;
    }
    return Infinity;
  }

  function firstBubbleTravelCost(path, grid, objectPriorities) {
    const idx = firstBubbleStep(path, grid);
    if (idx === Infinity) return Infinity;

    let total = 0;
    for (let i = 1; i <= idx; i++) {
      const [r, c] = path[i];
      total += cellWeight(grid, r, c, new Set(), {
        objectPriorities
      });
    }
    return total;
  }

  function pathMinerCount(path, grid, freeCells = new Set()) {
    let count = 0;
    for (const [r, c] of path || []) {
      const key = `${r},${c}`;
      if (freeCells.has(key)) continue;
      if (typeof grid[r][c] === "number") count++;
    }
    return count;
  }

  function pathRawNumberSum(path, grid, freeCells = new Set()) {
    let total = 0;
    for (const [r, c] of path || []) {
      const key = `${r},${c}`;
      if (freeCells.has(key)) continue;
      if (typeof grid[r][c] === "number") total += grid[r][c];
    }
    return total;
  }

  function pathSharesWithRed(path, redPath) {
    const redSet = new Set((redPath || []).map(([r, c]) => `${r},${c}`));
    let shared = 0;
    for (const [r, c] of path || []) {
      if (redSet.has(`${r},${c}`)) shared++;
    }
    return shared;
  }

  function pathHasHeavyMineralBeforeFirstBubble(path, grid, threshold = 28) {
    const idx = firstBubbleStep(path, grid);
    if (idx === Infinity) return false;
    for (let i = 0; i <= idx; i++) {
      const [r, c] = path[i];
      const v = grid[r]?.[c];
      if (typeof v === "number" && v >= threshold) return true;
    }
    return false;
  }

  function getEntryBottomDepth(entry, cluster) {
    if (!entry || !cluster || !cluster.length) return 0;
    const bottom = Math.max(...cluster.map(([r]) => r));
    return entry[0] / Math.max(1, bottom);
  }

  function buildSingleAttackRouteOption({
    grid,
    starts,
    goals,
    reusable,
    redPath,
    entryMap,
    cluster,
    routeKind,
    isLowestShaft,
    objectPriorities,
  }) {
    const route = dijkstra({
      grid,
      starts,
      goals,
      freeCells: reusable,
      objectPriorities,
    });
    if (!route) return null;

    const entry = entryMap.get(`${route.goal[0]},${route.goal[1]}`);
    const finalPath = route.path;

    const rawCost = route.cost;
    const minerCount = pathMinerCount(finalPath, grid, reusable);
    const rawValueSum = pathRawNumberSum(finalPath, grid, reusable);
    const sharedCount = pathSharesWithRed(finalPath, redPath);
    const adjacentShared = countAdjacentSharedOpens(redPath, finalPath);
    const lowerBonus = getLowestShaftPreferenceBonus(
      route,
      entry,
      cluster,
      routeKind,
      isLowestShaft
    );
    const bubbleBonus = bubblePathBonus(finalPath, entry, grid);
    const entryDepth = getEntryBottomDepth(entry, cluster);

    return {
      kind: routeKind,
      route,
      entry,
      finalPath,
      rawCost,
      minerCount,
      rawValueSum,
      sharedCount,
      adjacentShared,
      lowerBonus,
      bubbleBonus,
      entryDepth,
    };
  }

  function chooseBestBlueRouteOption(options, isLowestShaft) {
    if (!options.length) return null;

    const baseOptions = options.filter((o) => o.kind === "base");
    const bestBase = baseOptions.length
      ? [...baseOptions].sort(
          (a, b) =>
            a.rawCost - b.rawCost ||
            a.minerCount - b.minerCount ||
            a.rawValueSum - b.rawValueSum ||
            b.entryDepth - a.entryDepth ||
            a.route.len - b.route.len
        )[0]
      : null;

    for (const o of options) {
      let score = o.rawCost;
      score += o.minerCount * 10;
      score += o.rawValueSum * 0.35;
      score -= o.lowerBonus;
      score -= o.bubbleBonus;
      score -= Math.min(0.8, o.sharedCount * 0.08);
      score -= Math.min(0.5, o.adjacentShared * 0.05);

      if (isLowestShaft) {
        score -= o.entryDepth * 3.5;
      }

      o.score = score;
    }

    options.sort(
      (a, b) =>
        a.score - b.score ||
        a.rawCost - b.rawCost ||
        a.minerCount - b.minerCount ||
        a.rawValueSum - b.rawValueSum ||
        b.entryDepth - a.entryDepth ||
        a.route.len - b.route.len
    );

    let chosen = options[0];

    if (bestBase) {
      const scoreGap = chosen.score - bestBase.score;
      const baseClearlyCleaner =
        bestBase.minerCount < chosen.minerCount ||
        bestBase.rawValueSum < chosen.rawValueSum;

      const baseStronglyPreferredLowest =
        isLowestShaft &&
        bestBase.entryDepth > chosen.entryDepth &&
        bestBase.rawCost <= chosen.rawCost * 1.08;

      const baseNearEqual =
        scoreGap >= -6 &&
        bestBase.rawCost <= chosen.rawCost * 1.10;

      if (
        chosen.kind !== "base" &&
        (baseStronglyPreferredLowest || (baseNearEqual && baseClearlyCleaner))
      ) {
        chosen = bestBase;
      }

      if (
        chosen.kind !== "base" &&
        bestBase.rawCost < chosen.rawCost &&
        bestBase.minerCount <= chosen.minerCount &&
        bestBase.rawValueSum <= chosen.rawValueSum
      ) {
        chosen = bestBase;
      }
    }

    return chosen;
  }

  function makePathVariants(grid, starts, goal, objectPriorities) {
    const out = [];

    function push(tag, route) {
      if (!route || !route.path || !route.path.length) return;
      const path = uniquePath(route.path);
      if (hasPathLoop(path)) return;
      out.push({
        tag,
        route: { ...route, path },
      });
    }

    const base = dijkstra({ grid, starts, goals: [goal], objectPriorities });
    push("base", base);

    if (base) {
      push(
        "path-penalized",
        dijkstra({
          grid,
          starts,
          goals: [goal],
          penaltyCells: buildPenaltyCellsFromPath(base.path, 0.9),
          objectPriorities,
        })
      );

      push(
        "weighted-path-penalized",
        dijkstra({
          grid,
          starts,
          goals: [goal],
          penaltyCells: buildPenaltyCellsForWeightedPath(base.path, grid, 0.45),
          objectPriorities,
        })
      );

      push(
        "high-mineral-penalized",
        dijkstra({
          grid,
          starts,
          goals: [goal],
          penaltyCells: buildPenaltyCellsForHighMinerals(base.path, grid, 400000, 28),
          objectPriorities,
        })
      );

      push(
        "edge-blocked",
        dijkstra({
          grid,
          starts,
          goals: [goal],
          blockedEdges: buildBlockedEdgesFromPath(base.path),
          objectPriorities,
        })
      );

      push(
        "early-edge-blocked",
        dijkstra({
          grid,
          starts,
          goals: [goal],
          blockedEdges: buildEarlyBlockedEdgesFromPath(base.path, 3),
          objectPriorities,
        })
      );
    }

    const detours = buildForkDetours(grid, starts, goal, objectPriorities);
    for (const detour of detours) {
      push("fork-detour", detour);
    }

    const seen = new Set();
    const deduped = out.filter((item) => {
      const key = item.route.path.map(([r, c]) => `${r},${c}`).join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    deduped.sort((a, b) => {
      if (a.route.cost !== b.route.cost) return a.route.cost - b.route.cost;
      const aRaw = pathRawNumberSum(a.route.path, grid);
      const bRaw = pathRawNumberSum(b.route.path, grid);
      if (aRaw !== bRaw) return aRaw - bRaw;
      return a.route.len - b.route.len;
    });

    return deduped.slice(0, 12);
  }

  function buildRedCandidates(grid, starts, gateGoals, bubbles, objectPriorities) {
    const candidates = [];

    for (const gateGoal of gateGoals) {
      const direct = dijkstra({ grid, starts, goals: [gateGoal], objectPriorities });
      if (direct) {
        addCandidate(candidates, {
          mode: "direct",
          variant: "base",
          redBubble: null,
          redBubbles: [],
          path: uniquePath(direct.path),
          redCost: direct.cost,
          gateGoal,
        });

        const penalized = dijkstra({
          grid,
          starts,
          goals: [gateGoal],
          penaltyCells: buildPenaltyCellsFromPath(direct.path, 0.35),
          objectPriorities,
        });
        if (penalized) {
          addCandidate(candidates, {
            mode: "direct",
            variant: "penalized",
            redBubble: null,
            redBubbles: [],
            path: uniquePath(penalized.path),
            redCost: penalized.cost,
            gateGoal,
          });
        }

        const blocked = dijkstra({
          grid,
          starts,
          goals: [gateGoal],
          blockedEdges: buildBlockedEdgesFromPath(direct.path),
          objectPriorities,
        });
        if (blocked) {
          addCandidate(candidates, {
            mode: "direct",
            variant: "blocked",
            redBubble: null,
            redBubbles: [],
            path: uniquePath(blocked.path),
            redCost: blocked.cost,
            gateGoal,
          });
        }

        const forkDetours = buildForkDetours(grid, starts, gateGoal, objectPriorities);
        for (const fork of forkDetours) {
          addCandidate(candidates, {
            mode: "direct",
            variant: "fork-detour",
            redBubble: null,
            redBubbles: [],
            path: uniquePath(fork.path),
            redCost: fork.cost,
            gateGoal,
          });
        }
      }
    }

    for (const bubble of bubbles) {
      const a = dijkstra({ grid, starts, goals: [bubble], objectPriorities });
      if (!a) continue;

      for (const gateGoal of gateGoals) {
        const b = dijkstra({
          grid,
          starts: [bubble],
          goals: [gateGoal],
          objectPriorities
        });
        if (b) {
          addCandidate(candidates, {
            mode: "via bubble",
            variant: "base",
            redBubble: bubble,
            redBubbles: [bubble],
            path: uniquePath(mergePaths(a.path, b.path)),
            redCost: a.cost + b.cost,
            gateGoal,
          });
        }

        const bPenalized = dijkstra({
          grid,
          starts: [bubble],
          goals: [gateGoal],
          penaltyCells: b ? buildPenaltyCellsFromPath(b.path, 0.35) : new Map(),
          objectPriorities
        });
        if (bPenalized) {
          addCandidate(candidates, {
            mode: "via bubble",
            variant: "penalized",
            redBubble: bubble,
            redBubbles: [bubble],
            path: uniquePath(mergePaths(a.path, bPenalized.path)),
            redCost: a.cost + bPenalized.cost,
            gateGoal,
          });
        }

        const bBlocked = dijkstra({
          grid,
          starts: [bubble],
          goals: [gateGoal],
          blockedEdges: b ? buildBlockedEdgesFromPath(b.path) : new Set(),
          objectPriorities
        });
        if (bBlocked) {
          addCandidate(candidates, {
            mode: "via bubble",
            variant: "blocked",
            redBubble: bubble,
            redBubbles: [bubble],
            path: uniquePath(mergePaths(a.path, bBlocked.path)),
            redCost: a.cost + bBlocked.cost,
            gateGoal,
          });
        }

        const forkDetours = buildForkDetours(grid, [bubble], gateGoal, objectPriorities);
        for (const fork of forkDetours) {
          addCandidate(candidates, {
            mode: "via bubble",
            variant: "fork-detour",
            redBubble: bubble,
            redBubbles: [bubble],
            path: uniquePath(mergePaths(a.path, fork.path)),
            redCost: a.cost + fork.cost,
            gateGoal,
          });
        }
      }
    }

    const seen = new Set();
    const deduped = candidates.filter((cand) => {
      const key = cand.path.map(([r, c]) => `${r},${c}`).join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    deduped.sort((a, b) => a.redCost - b.redCost || a.path.length - b.path.length);
    return deduped.slice(0, 36);
  }

  function buildLegacyEndRedCandidates(
    grid,
    starts,
    gateGoals,
    bubbles,
    objectPriorities
  ) {
    const candidates = [];

    function addLegacyCandidate(mode, variant, redBubbles, path, redCost, gateGoal) {
      addCandidate(candidates, {
        mode,
        variant,
        redBubble: redBubbles && redBubbles.length ? redBubbles[0] : null,
        redBubbles: redBubbles || [],
        path: uniquePath(path),
        redCost,
        gateGoal,
      });
    }

    for (const gateGoal of gateGoals) {
      const directVariants = makePathVariants(grid, starts, gateGoal, objectPriorities);
      for (const direct of directVariants) {
        addLegacyCandidate(
          "legacy end",
          `direct-${direct.tag}`,
          [],
          direct.route.path,
          direct.route.cost,
          gateGoal
        );
      }
    }

    for (const bubble1 of bubbles) {
      const toBubbleVariants = makePathVariants(grid, starts, bubble1, objectPriorities);
      if (!toBubbleVariants.length) continue;

      for (const leg1 of toBubbleVariants) {
        for (const gateGoal of gateGoals) {
          const toGateVariants = makePathVariants(
            grid,
            [bubble1],
            gateGoal,
            objectPriorities
          );
          for (const legGate of toGateVariants) {
            addLegacyCandidate(
              "legacy end",
              `via-1-bubble-${leg1.tag}-${legGate.tag}`,
              [bubble1],
              mergePaths(leg1.route.path, legGate.route.path),
              leg1.route.cost + legGate.route.cost,
              gateGoal
            );
          }
        }

        for (const bubble2 of bubbles) {
          if (bubble1[0] === bubble2[0] && bubble1[1] === bubble2[1]) continue;

          const toBubble2Variants = makePathVariants(
            grid,
            [bubble1],
            bubble2,
            objectPriorities
          );
          if (!toBubble2Variants.length) continue;

          for (const leg2 of toBubble2Variants) {
            for (const gateGoal of gateGoals) {
              const toGate2Variants = makePathVariants(
                grid,
                [bubble2],
                gateGoal,
                objectPriorities
              );

              for (const legGate of toGate2Variants) {
                addLegacyCandidate(
                  "legacy end",
                  `via-2-bubbles-${leg1.tag}-${leg2.tag}-${legGate.tag}`,
                  [bubble1, bubble2],
                  mergePaths(mergePaths(leg1.route.path, leg2.route.path), legGate.route.path),
                  leg1.route.cost + leg2.route.cost + legGate.route.cost,
                  gateGoal
                );
              }
            }
          }
        }
      }
    }

    const seen = new Set();
    const deduped = candidates.filter((cand) => {
      const key = cand.path.map(([r, c]) => `${r},${c}`).join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    deduped.sort((a, b) => {
      const aBubbleCount = countRedBubbles(a.path, grid);
      const bBubbleCount = countRedBubbles(b.path, grid);
      if (aBubbleCount !== bBubbleCount) return bBubbleCount - aBubbleCount;

      const aTravel = firstBubbleTravelCost(a.path, grid, objectPriorities);
      const bTravel = firstBubbleTravelCost(b.path, grid, objectPriorities);
      if (aTravel !== bTravel) return aTravel - bTravel;

      if (a.redCost !== b.redCost) return a.redCost - b.redCost;

      const aRaw = pathRawNumberSum(a.path, grid);
      const bRaw = pathRawNumberSum(b.path, grid);
      if (aRaw !== bRaw) return aRaw - bRaw;

      const threshold =
        normalizeObjectPriorities(objectPriorities).highMineralThreshold;
      const aHeavy = pathHasHeavyMineralBeforeFirstBubble(a.path, grid, threshold) ? 1 : 0;
      const bHeavy = pathHasHeavyMineralBeforeFirstBubble(b.path, grid, threshold) ? 1 : 0;
      if (aHeavy !== bHeavy) return aHeavy - bHeavy;

      const aFirst = firstBubbleStep(a.path, grid);
      const bFirst = firstBubbleStep(b.path, grid);
      if (aFirst !== bFirst) return aFirst - bFirst;

      return a.path.length - b.path.length;
    });

    return deduped.slice(0, 320);
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

    const seen = new Set();
    for (const [r, c] of path) {
      const key = `${r},${c}`;
      if (seen.has(key)) penalty += 4.0;
      seen.add(key);
    }

    return Math.max(0, penalty);
  }

  function redLoopAssistPenalty(redPath, bluePaths, shaftAttackInfos, grid, starts, objectPriorities) {
    if (!redPath || !redPath.length || !bluePaths || !bluePaths.length) return 0;

    let penalty = 0;
    const redSet = new Set(redPath.map(([r, c]) => `${r},${c}`));

    for (let i = 0; i < bluePaths.length && i < shaftAttackInfos.length; i++) {
      const bluePath = bluePaths[i];
      const info = shaftAttackInfos[i];
      if (!bluePath || !bluePath.length || !info || !info.attacks || !info.attacks.length) {
        continue;
      }

      const blueStandalone = dijkstra({
        grid,
        starts,
        goals: info.attacks,
        freeCells: new Set(),
        objectPriorities
      });

      if (!blueStandalone) continue;

      const blueActualTouchesRed = bluePath.some(([r, c]) => redSet.has(`${r},${c}`));
      const blueHasCleanLocal = blueStandalone.cost < 50000;

      if (blueActualTouchesRed && blueHasCleanLocal) {
        penalty += 3.5;
      }
    }

    return penalty;
  }

  function evaluateOrderedBlueForRedCandidate(
    grid,
    starts,
    redCandidate,
    shaftClustersOrdered,
    bubbles,
    objectPriorities
  ) {
    const bluePaths = [];
    const shaftEntryDots = [];
    const attackPoints = [];
    const shaftAttackInfos = [];
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
      shaftAttackInfos.push(info);

      if (!info.attacks.length) {
        unresolved++;
        continue;
      }

      const routeOptions = [];
      const isLowestShaft = i === 0;

      const cumulativeOption = buildSingleAttackRouteOption({
        grid,
        starts: cumulativeStarts,
        goals: info.attacks,
        reusable,
        redPath: redCandidate.path,
        entryMap: info.entryMap,
        cluster,
        routeKind: "cumulative",
        isLowestShaft,
        objectPriorities,
      });

      if (cumulativeOption) {
        const directStandalone = dijkstra({
          grid,
          starts,
          goals: info.attacks,
          freeCells: new Set(),
          objectPriorities,
        });

        let dep = 0;
        if (directStandalone) {
          const gap = cumulativeOption.rawCost - directStandalone.cost;
          if (gap > 0) dep += gap * 0.75;
          if (isLowestShaft && cumulativeOption.entryDepth < 0.75) dep += 16;
          if (!pathTouchesAnyStart(cumulativeOption.finalPath, starts)) dep += 1.5;
        }

        cumulativeOption.dependency = dep;
        routeOptions.push(cumulativeOption);
      }

      const baseOption = buildSingleAttackRouteOption({
        grid,
        starts,
        goals: info.attacks,
        reusable,
        redPath: redCandidate.path,
        entryMap: info.entryMap,
        cluster,
        routeKind: "base",
        isLowestShaft,
        objectPriorities,
      });

      if (baseOption) {
        baseOption.dependency = 0;
        routeOptions.push(baseOption);
      }

      const chosen = chooseBestBlueRouteOption(routeOptions, isLowestShaft);

      if (!chosen) {
        unresolved++;
        continue;
      }

      bluePaths.push(chosen.finalPath);
      attackPoints.push(chosen.route.goal);

      if (chosen.entry) shaftEntryDots.push(chosen.entry);

      blueCost += chosen.rawCost;
      dependencyCost += chosen.dependency || 0;

      assistBonus += Math.min(1.25, chosen.sharedCount * 0.06 + chosen.adjacentShared * 0.03);
      lowerShaftBonus += chosen.lowerBonus || 0;
      bubbleBonus += chosen.bubbleBonus || 0;

      for (const [r, c] of chosen.finalPath) {
        reusable.add(`${r},${c}`);
      }

      cumulativeStarts = dedupeCells(
        cumulativeStarts.concat(chosen.finalPath).concat(getPathEndpoints(chosen.finalPath))
      );
    }

    const redBubbleKeys = new Set(
      (redCandidate.redBubbles || []).map(([r, c]) => `${r},${c}`)
    );

    for (const bubble of bubbles) {
      const key = `${bubble[0]},${bubble[1]}`;
      if (redBubbleKeys.has(key)) continue;

      const bubbleRoute = dijkstra({
        grid,
        starts: cumulativeStarts,
        goals: [bubble],
        freeCells: reusable,
        objectPriorities,
      });

      if (bubbleRoute) {
        bluePaths.push(bubbleRoute.path);
        blueCost += bubbleRoute.cost;
        bubbleBonus += bubblePathBonus(bubbleRoute.path, bubbleRoute.goal, grid);

        for (const [r, c] of bubbleRoute.path) {
          reusable.add(`${r},${c}`);
        }

        cumulativeStarts = dedupeCells(
          cumulativeStarts.concat(bubbleRoute.path).concat(getPathEndpoints(bubbleRoute.path))
        );
      } else {
        unresolved++;
      }
    }

    const redLoopPenalty = redBacktrackPenalty(redCandidate.path);
    const overAssistPenalty = redLoopAssistPenalty(
      redCandidate.path,
      bluePaths,
      shaftAttackInfos,
      grid,
      starts,
      objectPriorities
    );

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
      redLoopPenalty,
      overAssistPenalty,
    };
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
    const values = path.map(([r, c]) => getCellDisplayValue(grid, r, c));
    return values.join(" - ");
  }

  function getPathCoordLabel(path) {
    if (!path || !path.length) return "(no path)";
    return path.map(([r, c]) => `${r},${c}`).join(" → ");
  }

  function buildRouteAnalysis(grid, allCandidates, best) {
    const sorted = [...allCandidates].sort((a, b) => {
      if (a.unresolvedTargets !== b.unresolvedTargets) {
        return a.unresolvedTargets - b.unresolvedTargets;
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
      if (aRaw !== bRaw) {
        return aRaw - bRaw;
      }
      if (a.effectiveTotal !== b.effectiveTotal) {
        return a.effectiveTotal - b.effectiveTotal;
      }
      return 0;
    });

    const sliced = sorted.slice(0, 12);

    return sliced.map((candidate) => {
      const approved = candidate === best;
      let reason = "Chosen";

      if (!approved) {
        if (candidate.unresolvedTargets > best.unresolvedTargets) {
          reason = `More unresolved targets (${candidate.unresolvedTargets} vs ${best.unresolvedTargets})`;
        } else if (candidate.redBubbleCount < best.redBubbleCount) {
          reason = `Fewer red bubbles (${candidate.redBubbleCount} vs ${best.redBubbleCount})`;
        } else if (candidate.firstBubbleTravelCost > best.firstBubbleTravelCost) {
          reason = `Higher first bubble travel cost by ${roundCost(
            candidate.firstBubbleTravelCost - best.firstBubbleTravelCost
          )}`;
        } else if (candidate.redCost > best.redCost) {
          reason = `Higher red cost by ${roundCost(candidate.redCost - best.redCost)}`;
        } else if (candidate.objectPriorityScore > best.objectPriorityScore) {
          reason = `Worse object priority score by ${roundCost(
            candidate.objectPriorityScore - best.objectPriorityScore
          )}`;
        } else {
          const bestRaw = pathRawNumberSum(best.redPath, grid);
          const candRaw = pathRawNumberSum(candidate.redPath, grid);
          if (candRaw > bestRaw) {
            reason = `Higher raw mineral burden by ${candRaw - bestRaw}`;
          } else if (candidate.effectiveTotal > best.effectiveTotal) {
            reason = `Higher effective total by ${roundCost(
              candidate.effectiveTotal - best.effectiveTotal
            )}`;
          } else {
            reason = "Lost tie-break";
          }
        }
      }

      return {
        approved,
        status: approved ? "APPROVED" : "IGNORED",
        reason,
        redMode: candidate.redMode,
        redVariant: candidate.redVariant,
        unresolvedTargets: candidate.unresolvedTargets,
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

  function isLegacyEndPriorityMode(eventType, gateType) {
    return eventType === "Legacy" && gateType === "end";
  }

  function solveGrid({
    grid,
    gateType = "standard",
    eventType = null,
    objectPriorities = null,
    objectPriorityMap = null,
    getCellObjectType = null,
  }) {
    const rows = grid.length;
    const cols = grid[0].length;
    const legacyEndMode = isLegacyEndPriorityMode(eventType, gateType);
    const normalizedObjectPriorities = normalizeObjectPriorities(
      objectPriorities || GLOBAL_OBJECT_PRIORITIES
    );

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

    const redCandidates = legacyEndMode
      ? buildLegacyEndRedCandidates(
          grid,
          starts,
          gateGoals,
          bubbles,
          normalizedObjectPriorities
        )
      : buildRedCandidates(
          grid,
          starts,
          gateGoals,
          bubbles,
          normalizedObjectPriorities
        );

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
      if (hasPathLoop(redCandidate.path)) continue;

      const blueEval = evaluateOrderedBlueForRedCandidate(
        grid,
        starts,
        redCandidate,
        shaftClustersOrdered,
        bubbles,
        normalizedObjectPriorities
      );

      const redBubbleCount = countRedBubbles(redCandidate.path, grid);
      const firstRedBubbleAt = firstBubbleStep(redCandidate.path, grid);
      const firstBubbleCost = firstBubbleTravelCost(
        redCandidate.path,
        grid,
        normalizedObjectPriorities
      );
      const redRaw = pathRawNumberSum(redCandidate.path, grid);
      const redObjectPriorityScore = getPathObjectPriorityScore(
        redCandidate.path,
        objectPriorityMap,
        getCellObjectType,
        normalizedObjectPriorities
      );

      let blueObjectPriorityScore = 0;
      for (const bluePath of blueEval.bluePaths) {
        blueObjectPriorityScore += getPathObjectPriorityScore(
          bluePath,
          objectPriorityMap,
          getCellObjectType,
          normalizedObjectPriorities
        );
      }

      const totalObjectPriorityScore = redObjectPriorityScore + blueObjectPriorityScore;

      let effectiveTotal =
        redCandidate.redCost +
        blueEval.blueCost +
        blueEval.dependencyCost -
        blueEval.assistBonus -
        blueEval.lowerShaftBonus -
        blueEval.bubbleBonus +
        blueEval.redLoopPenalty +
        blueEval.overAssistPenalty +
        totalObjectPriorityScore;

      if (legacyEndMode) {
        effectiveTotal += firstBubbleCost === Infinity ? 999999999999 : firstBubbleCost * 25;
        effectiveTotal += redRaw * 1000;
        effectiveTotal -= redBubbleCount * 1000000000;
      }

      const candidate = {
        redMode: redCandidate.mode,
        redVariant: redCandidate.variant,
        redBubble: redCandidate.redBubble,
        redBubbles: redCandidate.redBubbles || (redCandidate.redBubble ? [redCandidate.redBubble] : []),
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
        if (legacyEndMode) {
          if (candidate.redBubbleCount > best.redBubbleCount) {
            best = candidate;
            continue;
          }

          if (candidate.redBubbleCount === best.redBubbleCount) {
            if (candidate.firstBubbleTravelCost < best.firstBubbleTravelCost) {
              best = candidate;
              continue;
            }

            if (candidate.firstBubbleTravelCost === best.firstBubbleTravelCost) {
              if (candidate.redCost < best.redCost) {
                best = candidate;
                continue;
              }

              if (candidate.redCost === best.redCost) {
                if (candidate.objectPriorityScore < best.objectPriorityScore) {
                  best = candidate;
                  continue;
                }
              }

              const candidateRaw = pathRawNumberSum(candidate.redPath, grid);
              const bestRaw = pathRawNumberSum(best.redPath, grid);

              if (candidate.redCost === best.redCost && candidateRaw < bestRaw) {
                best = candidate;
                continue;
              }

              if (
                candidate.redCost === best.redCost &&
                candidateRaw === bestRaw &&
                candidate.effectiveTotal < best.effectiveTotal
              ) {
                best = candidate;
                continue;
              }
            }
          }
        }

        if (candidate.effectiveTotal < best.effectiveTotal) {
          best = candidate;
          continue;
        }

        if (
          candidate.effectiveTotal === best.effectiveTotal &&
          candidate.objectPriorityScore < best.objectPriorityScore
        ) {
          best = candidate;
          continue;
        }

        if (
          candidate.effectiveTotal === best.effectiveTotal &&
          candidate.objectPriorityScore === best.objectPriorityScore &&
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
      legacyEndMode,
      startRow,
      solverVersion: SOLVER_VERSION,
      objectPriorities: { ...normalizedObjectPriorities },
      objectPriorityMap: objectPriorityMap ? { ...objectPriorityMap } : null,
      redMode: best.redMode,
      redVariant: best.redVariant,
      redBubble: best.redBubble,
      redBubbles: best.redBubbles,
      redBubbleCount: best.redBubbleCount,
      firstRedBubbleAt: best.firstRedBubbleAt,
      firstBubbleTravelCost:
        best.firstBubbleTravelCost === Infinity
          ? null
          : roundCost(best.firstBubbleTravelCost),
      redPath: best.redPath,
      redCost: roundCost(best.redCost),
      bluePaths: best.bluePaths,
      blueCost: roundCost(best.blueCost),
      totalCost: roundCost(best.redCost + best.blueCost),
      redObjectPriorityScore: roundCost(best.redObjectPriorityScore),
      blueObjectPriorityScore: roundCost(best.blueObjectPriorityScore),
      objectPriorityScore: roundCost(best.objectPriorityScore),
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
        "solver_status: solved\n" +
        `event_type: ${eventType || "unknown"}\n` +
        `legacy_end_mode: ${legacyEndMode ? "yes" : "no"}\n` +
        `object_priorities: ${JSON.stringify(normalizedObjectPriorities)}\n` +
        `object_priority_map: ${JSON.stringify(objectPriorityMap || {})}\n` +
        `red_mode: ${best.redMode}\n` +
        `red_variant: ${best.redVariant}\n` +
        `red_bubble_count: ${best.redBubbleCount}\n` +
        `first_red_bubble_at: ${
          best.firstRedBubbleAt === Infinity ? "none" : best.firstRedBubbleAt
        }\n` +
        `first_bubble_travel_cost: ${
          best.firstBubbleTravelCost === Infinity
            ? "none"
            : roundCost(best.firstBubbleTravelCost)
        }\n` +
        `red_cost: ${roundCost(best.redCost)}\n` +
        `blue_cost: ${roundCost(best.blueCost)}\n` +
        `red_object_priority_score: ${roundCost(best.redObjectPriorityScore)}\n` +
        `blue_object_priority_score: ${roundCost(best.blueObjectPriorityScore)}\n` +
        `object_priority_score: ${roundCost(best.objectPriorityScore)}\n` +
        `dependency_cost: ${roundCost(best.dependencyCost)}\n` +
        `assist_bonus: ${roundCost(best.assistBonus)}\n` +
        `lower_shaft_bonus: ${roundCost(best.lowerShaftBonus)}\n` +
        `bubble_bonus: ${roundCost(best.bubbleBonus)}\n` +
        `red_loop_penalty: ${roundCost(best.redLoopPenalty)}\n` +
        `over_assist_penalty: ${roundCost(best.overAssistPenalty)}\n` +
        `bubble_count: ${bubbles.length}\n` +
        `shaft_count: ${shaftClustersOrdered.length}\n` +
        `red_candidate_count: ${redCandidates.length}\n` +
        `unresolved_targets: ${best.unresolvedTargets}\n` +
        `total_cost: ${roundCost(best.redCost + best.blueCost)}\n` +
        `effective_total: ${roundCost(best.effectiveTotal)}`
    };
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
