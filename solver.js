(function () {
  function numberCost(n) {
    if (!Number.isFinite(n) || n <= 0) return 0;
    if (n <= 10) return Math.pow(2, n);
    return Math.pow(2, 10) * Math.pow(1.6, n - 10);
  }

  function isWalkableCell(grid, r, c) {
    if (r < 0 || c < 0 || r >= grid.length || c >= grid[0].length) return false;
    const v = grid[r][c];
    return v !== "X" && v !== "S";
  }

  function cellWeight(grid, r, c, freeCells) {
    if (freeCells && freeCells.has(`${r},${c}`)) return 0;
    const v = grid[r][c];
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
    return cols
      .map((c) => [0, c])
      .filter(([r, c]) => isWalkableCell(grid, r, c));
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

        if (typeof grid[rr][cc] === "number") {
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

  function dijkstra({ grid, starts, goals, freeCells = new Set() }) {
    if (!starts.length || !goals.length) return null;

    const rows = grid.length;
    const cols = grid[0].length;
    const goalSet = new Set(goals.map(([r, c]) => `${r},${c}`));
    const dist = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
    const steps = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
    const prev = Array.from({ length: rows }, () => Array(cols).fill(null));
    const open = [];

    for (const [r, c] of starts) {
      dist[r][c] = 0;
      steps[r][c] = 0;
      open.push({ r, c, cost: 0, len: 0 });
    }

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
        return { path, cost: cur.cost, goal: [cur.r, cur.c] };
      }

      const neighbors = [
        [cur.r + 1, cur.c],
        [cur.r - 1, cur.c],
        [cur.r, cur.c + 1],
        [cur.r, cur.c - 1],
      ];

      for (const [nr, nc] of neighbors) {
        if (!isWalkableCell(grid, nr, nc)) continue;

        const nextCost = cur.cost + cellWeight(grid, nr, nc, freeCells);
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

  function appendEntryStep(path, entryCell) {
    if (!path || !path.length || !entryCell) return path || [];
    const last = path[path.length - 1];
    if (last[0] === entryCell[0] && last[1] === entryCell[1]) return path;
    return [...path, entryCell];
  }

  function roundCost(n) {
    return Math.round(n * 100) / 100;
  }

  function solveGrid({ grid, gateType = "standard" }) {
    const rows = grid.length;
    const cols = grid[0].length;

    const { startRow, starts } = getStartCells(grid);
    if (!starts.length) {
      return {
        ok: false,
        message: "No valid start cells one row below the lowest used row.",
        startRow,
      };
    }

    const gateGoals = getGateGoals(grid, gateType);
    if (!gateGoals.length) {
      return {
        ok: false,
        message: "No valid gate attack cells.",
        startRow,
      };
    }

    const bubbles = getBubbles(grid);
    const shaftClusters = getShaftClusters(grid);

    let bestRed = dijkstra({ grid, starts, goals: gateGoals });
    let redMode = "direct";
    let redBubble = null;

    for (const bubble of bubbles) {
      const a = dijkstra({ grid, starts, goals: [bubble] });
      const b = dijkstra({ grid, starts: [bubble], goals: gateGoals });

      if (a && b) {
        const total = a.cost + b.cost;
        if (!bestRed || total < bestRed.cost) {
          bestRed = {
            path: uniquePath(mergePaths(a.path, b.path)),
            cost: total,
            goal: b.goal,
          };
          redMode = "via bubble";
          redBubble = bubble;
        }
      }
    }

    if (!bestRed) {
      return {
        ok: false,
        message: "No valid red path to gate.",
        startRow,
      };
    }

    const freeRed = pathSet(bestRed.path);
    const bluePaths = [];
    const shaftEntryDots = [];
    const attackPoints = [];
    let blueCost = 0;
    let unresolved = 0;

    for (const cluster of shaftClusters) {
      const info = getShaftAttackInfo(grid, cluster);
      if (!info.attacks.length) {
        unresolved++;
        continue;
      }

      const shaftRoute = dijkstra({
        grid,
        starts: starts.concat(bestRed.path),
        goals: info.attacks,
        freeCells: freeRed,
      });

      if (!shaftRoute) {
        unresolved++;
        continue;
      }

      attackPoints.push(shaftRoute.goal);

      const entry = info.entryMap.get(`${shaftRoute.goal[0]},${shaftRoute.goal[1]}`);
      if (entry) {
        shaftEntryDots.push(entry);
        bluePaths.push(appendEntryStep(shaftRoute.path, entry));
      } else {
        bluePaths.push(shaftRoute.path);
      }

      blueCost += shaftRoute.cost;
    }

    const redBubbleKey = redBubble ? `${redBubble[0]},${redBubble[1]}` : null;
    for (const bubble of bubbles) {
      const key = `${bubble[0]},${bubble[1]}`;
      if (key === redBubbleKey) continue;

      const bubbleRoute = dijkstra({
        grid,
        starts: starts.concat(bestRed.path),
        goals: [bubble],
        freeCells: freeRed,
      });

      if (bubbleRoute) {
        bluePaths.push(bubbleRoute.path);
        blueCost += bubbleRoute.cost;
      } else {
        unresolved++;
      }
    }

    return {
      ok: true,
      rows,
      cols,
      gateType,
      startRow,
      redMode,
      redBubble,
      redPath: bestRed.path,
      redCost: roundCost(bestRed.cost),
      bluePaths,
      blueCost: roundCost(blueCost),
      totalCost: roundCost(bestRed.cost + blueCost),
      shaftClusters,
      shaftEntryDots,
      attackPoints,
      bubbles,
      unresolvedTargets: unresolved,
      message:
        "solver_status: solved\n" +
        `red_mode: ${redMode}\n` +
        `red_cost: ${roundCost(bestRed.cost)}\n` +
        `blue_cost: ${roundCost(blueCost)}\n` +
        `bubble_count: ${bubbles.length}\n` +
        `shaft_count: ${shaftClusters.length}\n` +
        `unresolved_targets: ${unresolved}\n` +
        `total_cost: ${roundCost(bestRed.cost + blueCost)}`
    };
  }

  window.ZMPathfinderSolver = {
    numberCost,
    solveGrid
  };
})();
