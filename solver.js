(function () {
  console.log("ZM Solver V4.8 loaded");

  const SOLVER_VERSION = "V4.8";

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

  function cellWeight(grid, r, c, freeCells) {
    if (freeCells && freeCells.has(`${r},${c}`)) return 0;
    const v = grid[r][c];
    if (v === "B") return 0;
    return typeof v === "number" ? numberCost(v) : 0;
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
      dist[r][c] = 0;
      steps[r][c] = 0;
      open.push({ r, c, cost: 0, len: 0 });
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
        const nextCost = cur.cost + cellWeight(grid, nr, nc, freeCells) + penalty;
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

  function buildForkDetours(grid, starts, goal) {
    const base = dijkstra({ grid, starts, goals: [goal] });
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
        if ((nr === prev[0] && nc === prev[1]) || (nr === next[0] && nc === next[1])) continue;

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
          blockedEdges: block
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

  function buildRedCandidates(grid, starts, gateGoals, bubbles) {
    const candidates = [];

    for (const gateGoal of gateGoals) {
      const direct = dijkstra({ grid, starts, goals: [gateGoal] });
      if (direct) {
        addCandidate(candidates, {
          mode: "direct",
          variant: "base",
          redBubble: null,
          redBubbles: [],
          path: uniquePath(direct.path),
          redCost: direct.cost,
          gateGoal
        });

        const penalized = dijkstra({
          grid,
          starts,
          goals: [gateGoal],
          penaltyCells: buildPenaltyCellsFromPath(direct.path, 0.35)
        });
        if (penalized) {
          addCandidate(candidates, {
            mode: "direct",
            variant: "penalized",
            redBubble: null,
            redBubbles: [],
            path: uniquePath(penalized.path),
            redCost: penalized.cost,
            gateGoal
          });
        }

        const blocked = dijkstra({
          grid,
          starts,
          goals: [gateGoal],
          blockedEdges: buildBlockedEdgesFromPath(direct.path)
        });
        if (blocked) {
          addCandidate(candidates, {
            mode: "direct",
            variant: "blocked",
            redBubble: null,
            redBubbles: [],
            path: uniquePath(blocked.path),
            redCost: blocked.cost,
            gateGoal
          });
        }

        const forkDetours = buildForkDetours(grid, starts, gateGoal);
        for (const fork of forkDetours) {
          addCandidate(candidates, {
            mode: "direct",
            variant: "fork-detour",
            redBubble: null,
            redBubbles: [],
            path: uniquePath(fork.path),
            redCost: fork.cost,
            gateGoal
          });
        }
      }
    }

    for (const bubble of bubbles) {
      const a = dijkstra({ grid, starts, goals: [bubble] });
      if (!a) continue;

      for (const gateGoal of gateGoals) {
        const b = dijkstra({ grid, starts: [bubble], goals: [gateGoal] });
        if (b) {
          addCandidate(candidates, {
            mode: "via bubble",
            variant: "base",
            redBubble: bubble,
            redBubbles: [bubble],
            path: uniquePath(mergePaths(a.path, b.path)),
            redCost: a.cost + b.cost,
            gateGoal
          });
        }

        const bPenalized = dijkstra({
          grid,
          starts: [bubble],
          goals: [gateGoal],
          penaltyCells: b ? buildPenaltyCellsFromPath(b.path, 0.35) : new Map()
        });
        if (bPenalized) {
          addCandidate(candidates, {
            mode: "via bubble",
            variant: "penalized",
            redBubble: bubble,
            redBubbles: [bubble],
            path: uniquePath(mergePaths(a.path, bPenalized.path)),
            redCost: a.cost + bPenalized.cost,
            gateGoal
          });
        }

        const bBlocked = dijkstra({
          grid,
          starts: [bubble],
          goals: [gateGoal],
          blockedEdges: b ? buildBlockedEdgesFromPath(b.path) : new Set()
        });
        if (bBlocked) {
          addCandidate(candidates, {
            mode: "via bubble",
            variant: "blocked",
            redBubble: bubble,
            redBubbles: [bubble],
            path: uniquePath(mergePaths(a.path, bBlocked.path)),
            redCost: a.cost + bBlocked.cost,
            gateGoal
          });
        }

        const forkDetours = buildForkDetours(grid, [bubble], gateGoal);
        for (const fork of forkDetours) {
          addCandidate(candidates, {
            mode: "via bubble",
            variant: "fork-detour",
            redBubble: bubble,
            redBubbles: [bubble],
            path: uniquePath(mergePaths(a.path, fork.path)),
            redCost: a.cost + fork.cost,
            gateGoal
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

  function buildLegacyEndRedCandidates(grid, starts, gateGoals, bubbles) {
    const candidates = [];

    for (const gateGoal of gateGoals) {
      const direct = dijkstra({ grid, starts, goals: [gateGoal] });
      if (direct) {
        addCandidate(candidates, {
          mode: "legacy end",
          variant: "direct",
          redBubble: null,
          redBubbles: [],
          path: uniquePath(direct.path),
          redCost: direct.cost,
          gateGoal
        });
      }
    }

    for (const bubble1 of bubbles) {
      const a = dijkstra({ grid, starts, goals: [bubble1] });
      if (!a) continue;

      for (const gateGoal of gateGoals) {
        const b = dijkstra({ grid, starts: [bubble1], goals: [gateGoal] });
        if (!b) continue;

        addCandidate(candidates, {
          mode: "legacy end",
          variant: "via-1-bubble",
          redBubble: bubble1,
          redBubbles: [bubble1],
          path: uniquePath(mergePaths(a.path, b.path)),
          redCost: a.cost + b.cost,
          gateGoal
        });
      }

      for (const bubble2 of bubbles) {
        if (bubble1[0] === bubble2[0] && bubble1[1] === bubble2[1]) continue;

        const b12 = dijkstra({ grid, starts: [bubble1], goals: [bubble2] });
        if (!b12) continue;

        for (const gateGoal of gateGoals) {
          const c = dijkstra({ grid, starts: [bubble2], goals: [gateGoal] });
          if (!c) continue;

          addCandidate(candidates, {
            mode: "legacy end",
            variant: "via-2-bubbles",
            redBubble: bubble1,
            redBubbles: [bubble1, bubble2],
            path: uniquePath(mergePaths(mergePaths(a.path, b12.path), c.path)),
            redCost: a.cost + b12.cost + c.cost,
            gateGoal
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

    deduped.sort((a, b) => {
      const aBubbleCount = countRedBubbles(a.path, grid);
      const bBubbleCount = countRedBubbles(b.path, grid);
      if (aBubbleCount !== bBubbleCount) return bBubbleCount - aBubbleCount;

      const aFirst = firstBubbleStep(a.path, grid);
      const bFirst = firstBubbleStep(b.path, grid);
      if (aFirst !== bFirst) return aFirst - bFirst;

      return a.redCost - b.redCost || a.path.length - b.path.length;
    });

    return deduped.slice(0, 64);
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

  function redLoopAssistPenalty(redPath, bluePaths, shaftAttackInfos, grid, starts) {
    if (!redPath || !redPath.length || !bluePaths || !bluePaths.length) return 0;

    let penalty = 0;
    const redSet = new Set(redPath.map(([r, c]) => `${r},${c}`));

    for (let i = 0; i < bluePaths.length && i < shaftAttackInfos.length; i++) {
      const bluePath = bluePaths[i];
      const info = shaftAttackInfos[i];
      if (!bluePath || !bluePath.length || !info || !info.attacks || !info.attacks.length) continue;

      const blueStandalone = dijkstra({
        grid,
        starts,
        goals: info.attacks,
        freeCells: new Set()
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
    isLowestShaft
  }) {
    const route = dijkstra({
      grid,
      starts,
      goals,
      freeCells: reusable
    });
    if (!route) return null;

    const entry = entryMap.get(`${route.goal[0]},${route.goal[1]}`);
    const finalPath = route.path;

    const rawCost = route.cost;
    const minerCount = pathMinerCount(finalPath, grid, reusable);
    const rawValueSum = pathRawNumberSum(finalPath, grid, reusable);
    const sharedCount = pathSharesWithRed(finalPath, redPath);
    const adjacentShared = countAdjacentSharedOpens(redPath, finalPath);
    const lowerBonus = getLowestShaftPreferenceBonus(route, entry, cluster, routeKind, isLowestShaft);
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
      entryDepth
    };
  }

  function chooseBestBlueRouteOption(options, isLowestShaft) {
    if (!options.length) return null;

    const baseOptions = options.filter(o => o.kind === "base");
    const bestBase = baseOptions.length
      ? [...baseOptions].sort((a, b) =>
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

    options.sort((a, b) =>
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

  function evaluateOrderedBlueForRedCandidate(grid, starts, redCandidate, shaftClustersOrdered, bubbles) {
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
        isLowestShaft
      });
      if (cumulativeOption) {
        const directStandalone = dijkstra({
          grid,
          starts,
          goals: info.attacks,
          freeCells: new Set()
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
        isLowestShaft
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
        cumulativeStarts
          .concat(chosen.finalPath)
          .concat(getPathEndpoints(chosen.finalPath))
      );
    }

    const redBubbleKeys = new Set((redCandidate.redBubbles || []).map(([r, c]) => `${r},${c}`));

    for (const bubble of bubbles) {
      const key = `${bubble[0]},${bubble[1]}`;
      if (redBubbleKeys.has(key)) continue;

      const bubbleRoute = dijkstra({
        grid,
        starts: cumulativeStarts,
        goals: [bubble],
        freeCells: reusable,
      });

      if (bubbleRoute) {
        bluePaths.push(bubbleRoute.path);
        blueCost += bubbleRoute.cost;
        bubbleBonus += bubblePathBonus(bubbleRoute.path, bubbleRoute.goal, grid);

        for (const [r, c] of bubbleRoute.path) {
          reusable.add(`${r},${c}`);
        }

        cumulativeStarts = dedupeCells(
          cumulativeStarts
            .concat(bubbleRoute.path)
            .concat(getPathEndpoints(bubbleRoute.path))
        );
      } else {
        unresolved++;
      }
    }

    const redLoopPenalty = redBacktrackPenalty(redCandidate.path);
    const overAssistPenalty = redLoopAssistPenalty(redCandidate.path, bluePaths, shaftAttackInfos, grid, starts);

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
      overAssistPenalty
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
      if (a.effectiveTotal !== b.effectiveTotal) {
        return a.effectiveTotal - b.effectiveTotal;
      }
      return a.redCost - b.redCost;
    });

    const sliced = sorted.slice(0, 12);

    return sliced.map((candidate) => {
      const approved = candidate === best;
      let reason = "Chosen";

      if (!approved) {
        if (candidate.unresolvedTargets > best.unresolvedTargets) {
          reason = `More unresolved targets (${candidate.unresolvedTargets} vs ${best.unresolvedTargets})`;
        } else if (candidate.effectiveTotal > best.effectiveTotal) {
          reason = `Higher effective total by ${roundCost(candidate.effectiveTotal - best.effectiveTotal)}`;
        } else if (candidate.redCost > best.redCost) {
          reason = `Higher red cost by ${roundCost(candidate.redCost - best.redCost)}`;
        } else {
          reason = "Lost tie-break";
        }
      }

      return {
        approved,
        status: approved ? "APPROVED" : "IGNORED",
        reason,
        redMode: candidate.redMode,
        redVariant: candidate.redVariant,
        unresolvedTargets: candidate.unresolvedTargets,
        redPathValues: getPathValueLabel(grid, candidate.redPath),
        redPathCoords: getPathCoordLabel(candidate.redPath),
        redCost: roundCost(candidate.redCost),
        blueCost: roundCost(candidate.blueCost),
        effectiveTotal: roundCost(candidate.effectiveTotal),
        deltaFromBest: roundCost(candidate.effectiveTotal - best.effectiveTotal)
      };
    });
  }

  function isLegacyEndPriorityMode(eventType, gateType) {
    return eventType === "Legacy" && gateType === "end";
  }

  function solveGrid({ grid, gateType = "standard", eventType = null }) {
    const rows = grid.length;
    const cols = grid[0].length;
    const legacyEndMode = isLegacyEndPriorityMode(eventType, gateType);

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
      ? buildLegacyEndRedCandidates(grid, starts, gateGoals, bubbles)
      : buildRedCandidates(grid, starts, gateGoals, bubbles);

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
      const blueEval = evaluateOrderedBlueForRedCandidate(
        grid,
        starts,
        redCandidate,
        shaftClustersOrdered,
        bubbles
      );

      const redBubbleCount = countRedBubbles(redCandidate.path, grid);
      const firstRedBubbleAt = firstBubbleStep(redCandidate.path, grid);
      const firstRedBubbleBonus = firstRedBubbleAt === Infinity ? 0 : Math.max(0, 140 - firstRedBubbleAt * 6);

      let effectiveTotal =
        redCandidate.redCost +
        blueEval.blueCost +
        blueEval.dependencyCost -
        blueEval.assistBonus -
        blueEval.lowerShaftBonus -
        blueEval.bubbleBonus +
        blueEval.redLoopPenalty +
        blueEval.overAssistPenalty;

      if (legacyEndMode) {
  // HARD PRIORITY: bubbles override everything
  effectiveTotal -= redBubbleCount * 1000;

  // STRONG push for earlier bubbles
  effectiveTotal -= firstRedBubbleBonus * 3;

  // Reduce bias toward clean/cheap gate paths
  effectiveTotal -= redCandidate.redCost * 0.15;
}

      const candidate = {
        redMode: redCandidate.mode,
        redVariant: redCandidate.variant,
        redBubble: redCandidate.redBubble,
        redBubbles: redCandidate.redBubbles || (redCandidate.redBubble ? [redCandidate.redBubble] : []),
        redBubbleCount,
        firstRedBubbleAt,
        firstRedBubbleBonus,
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
        effectiveTotal
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
          if (
            candidate.redBubbleCount === best.redBubbleCount &&
            candidate.firstRedBubbleAt < best.firstRedBubbleAt
          ) {
            best = candidate;
            continue;
          }
        }

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
      redMode: best.redMode,
      redVariant: best.redVariant,
      redBubble: best.redBubble,
      redBubbles: best.redBubbles,
      redBubbleCount: best.redBubbleCount,
      firstRedBubbleAt: best.firstRedBubbleAt,
      firstRedBubbleBonus: roundCost(best.firstRedBubbleBonus),
      redPath: best.redPath,
      redCost: roundCost(best.redCost),
      bluePaths: best.bluePaths,
      blueCost: roundCost(best.blueCost),
      totalCost: roundCost(best.redCost + best.blueCost),
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
        `red_mode: ${best.redMode}\n` +
        `red_variant: ${best.redVariant}\n` +
        `red_bubble_count: ${best.redBubbleCount}\n` +
        `first_red_bubble_at: ${best.firstRedBubbleAt === Infinity ? "none" : best.firstRedBubbleAt}\n` +
        `red_cost: ${roundCost(best.redCost)}\n` +
        `blue_cost: ${roundCost(best.blueCost)}\n` +
        `dependency_cost: ${roundCost(best.dependencyCost)}\n` +
        `assist_bonus: ${roundCost(best.assistBonus)}\n` +
        `lower_shaft_bonus: ${roundCost(best.lowerShaftBonus)}\n` +
        `bubble_bonus: ${roundCost(best.bubbleBonus)}\n` +
        `first_red_bubble_bonus: ${roundCost(best.firstRedBubbleBonus)}\n` +
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
    solveGrid
  };
})();
