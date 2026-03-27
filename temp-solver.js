/* =========================================
   ZM TEMP SOLVER ENGINE (ISOLATED)
   Version: 0.1 (Model Foundation)
   Safe: DOES NOT TOUCH EXISTING SOLVER
========================================= */

window.ZM_TEMP_MODEL = (() => {

  /* ================================
     CORE CONSTANTS
  ================================= */

  const ZOMBIE_FACTOR = 2.099;
  const MINERAL_TAIL_FACTOR = 1.6005;

  const MAX_ZOMBIE = 50;
  const MAX_MINERAL = 90;

  /* ================================
     BASE TABLE (1–12 EXACT)
  ================================= */

  const BASE_TABLE = {
    1: 1.00,
    2: 2.15,
    3: 6.70,
    4: 20.50,
    5: 63.30,
    6: 195.00,
    7: 810.00,
    8: 3700.00,
    9: 12250.00,
    10: 22400.00,
    11: 37000.00,
    12: 65000.00
  };

  /* ================================
     MINERAL BASE
  ================================= */

  function getMineralBase(m) {
    if (!Number.isFinite(m) || m < 1) return 0;

    if (BASE_TABLE[m]) return BASE_TABLE[m];

    // Extrapolation (12+)
    return BASE_TABLE[12] * Math.pow(MINERAL_TAIL_FACTOR, m - 12);
  }

  /* ================================
     ZOMBIE POWER
  ================================= */

  function getZombiePower(z) {
    if (!Number.isFinite(z) || z < 1) return 1;
    return Math.pow(ZOMBIE_FACTOR, z);
  }

  /* ================================
     TIME CALCULATION
  ================================= */

  function getTime(z, m) {
    return getMineralBase(m) / getZombiePower(z);
  }

  /* ================================
     GRID WEIGHT (PATH TOTAL)
     - Counts each tile once
     - Ignores bubbles/shafts for now
  ================================= */

  function calculatePathWeight(path, grid) {
    const seen = new Set();
    let total = 0;

    for (const [r, c] of path) {
      const key = `${r},${c}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const val = grid[r][c];

      if (typeof val === "number") {
        total += getMineralBase(val);
      }
    }

    return total;
  }

  /* ================================
     PATH TIME (FULL MODEL)
  ================================= */

  function calculatePathTime(path, grid, zombieLevel) {
    const weight = calculatePathWeight(path, grid);
    return weight / getZombiePower(zombieLevel);
  }

  /* ================================
     DEBUG / ANALYSIS HELPERS
  ================================= */

  function generateMineralTable(max = MAX_MINERAL) {
    const table = [];

    let prev = null;

    for (let m = 1; m <= max; m++) {
      const base = getMineralBase(m);
      const mult = prev ? base / prev : null;

      table.push({
        mineral: m,
        base,
        multiplier: mult
      });

      prev = base;
    }

    return table;
  }

  function generateZombieTable(max = MAX_ZOMBIE) {
    const table = [];

    for (let z = 1; z <= max; z++) {
      table.push({
        level: z,
        power: getZombiePower(z)
      });
    }

    return table;
  }

  function predictTimeGrid(zMax = 50, mMax = 90) {
    const grid = [];

    for (let z = 1; z <= zMax; z++) {
      const row = [];
      for (let m = 1; m <= mMax; m++) {
        row.push(getTime(z, m));
      }
      grid.push(row);
    }

    return grid;
  }

  /* ================================
     FUTURE: PRIORITY SYSTEM HOOK
     (NOT ACTIVE YET)
  ================================= */

  function calculatePathWithPriorities(path, grid, zombieLevel, options = {}) {
    // Placeholder for:
    // - keys
    // - chests
    // - emblems
    // - ignore toggles

    return calculatePathTime(path, grid, zombieLevel);
  }

  /* ================================
     PUBLIC API
  ================================= */

  return {
    getMineralBase,
    getZombiePower,
    getTime,
    calculatePathWeight,
    calculatePathTime,
    calculatePathWithPriorities,
    generateMineralTable,
    generateZombieTable,
    predictTimeGrid
  };

})();
