window.ZM_TIMING_ENGINE = (() => {
  const MAX_ZOMBIE_LEVEL = 50;
  const MAX_MINERAL_LEVEL = 90;

  // Derived from your measured sheet/model work
  const ZOMBIE_FACTOR_PER_LEVEL = 2.099;
  const MINERAL_TAIL_FACTOR = 1.6005;

  // Normalized mineral base curve
  // 1–12 are locked from the measured model
  const BASE_MINERAL_TABLE = {
    1: 1.0,
    2: 2.15,
    3: 6.7,
    4: 20.5,
    5: 63.3,
    6: 195.0,
    7: 810.0,
    8: 3700.0,
    9: 12250.0,
    10: 22400.0,
    11: 37000.0,
    12: 65000.0
  };

  // Placeholder modifiers until you provide real data
  const DEFAULT_TILE_MODIFIERS = {
    mineral: 1,
    object: 1,
    shaft: null,
    gate: null
  };

  function isFinitePositiveNumber(value) {
    return typeof value === "number" && Number.isFinite(value) && value > 0;
  }

  function clampInteger(value, min, max) {
    const n = Math.floor(Number(value));
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function getMineralBase(mineralLevel) {
    const m = clampInteger(mineralLevel, 1, MAX_MINERAL_LEVEL);

    if (BASE_MINERAL_TABLE[m]) {
      return BASE_MINERAL_TABLE[m];
    }

    return BASE_MINERAL_TABLE[12] * Math.pow(MINERAL_TAIL_FACTOR, m - 12);
  }

  function getZombiePower(zombieLevel) {
    const z = clampInteger(zombieLevel, 1, MAX_ZOMBIE_LEVEL);
    return Math.pow(ZOMBIE_FACTOR_PER_LEVEL, z);
  }

  function getBaseMineralTime(zombieLevel, mineralLevel) {
    return getMineralBase(mineralLevel) / getZombiePower(zombieLevel);
  }

  function getTileTime({
    zombieLevel,
    mineralLevel,
    tileType = "mineral",
    modifier = null
  }) {
    const baseTime = getBaseMineralTime(zombieLevel, mineralLevel);

    if (tileType === "bubble") {
      throw new Error("Bubble timing is event-specific and must be supplied separately.");
    }

    const effectiveModifier =
      isFinitePositiveNumber(modifier)
        ? modifier
        : DEFAULT_TILE_MODIFIERS[tileType];

    if (!isFinitePositiveNumber(effectiveModifier)) {
      return baseTime;
    }

    return baseTime * effectiveModifier;
  }

  function formatMinutesToReadable(minutes) {
    if (!Number.isFinite(minutes) || minutes < 0) return "";

    const totalSeconds = Math.round(minutes * 60);
    const hours = Math.floor(totalSeconds / 3600);
    const remaining = totalSeconds % 3600;
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;

    if (hours > 0) {
      return `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }

    return `${mins}:${String(secs).padStart(2, "0")}`;
  }

  function buildMineralTimingTable({
    maxZombieLevel = MAX_ZOMBIE_LEVEL,
    maxMineralLevel = MAX_MINERAL_LEVEL
  } = {}) {
    const zMax = clampInteger(maxZombieLevel, 1, MAX_ZOMBIE_LEVEL);
    const mMax = clampInteger(maxMineralLevel, 1, MAX_MINERAL_LEVEL);

    const rows = [];

    for (let z = 1; z <= zMax; z++) {
      for (let m = 1; m <= mMax; m++) {
        const baseTime = getBaseMineralTime(z, m);

        rows.push({
          zombieLevel: z,
          mineralLevel: m,
          baseMineralValue: getMineralBase(m),
          zombiePower: getZombiePower(z),
          baseTimeMinutes: baseTime,
          baseTimeReadable: formatMinutesToReadable(baseTime)
        });
      }
    }

    return rows;
  }

  function buildSpecialTileTimingTable({
    maxZombieLevel = MAX_ZOMBIE_LEVEL,
    maxMineralLevel = MAX_MINERAL_LEVEL,
    shaftModifier = null,
    gateModifier = null
  } = {}) {
    const zMax = clampInteger(maxZombieLevel, 1, MAX_ZOMBIE_LEVEL);
    const mMax = clampInteger(maxMineralLevel, 1, MAX_MINERAL_LEVEL);

    const rows = [];

    for (let z = 1; z <= zMax; z++) {
      for (let m = 1; m <= mMax; m++) {
        const baseTime = getBaseMineralTime(z, m);
        const shaftTime = isFinitePositiveNumber(shaftModifier) ? baseTime * shaftModifier : null;
        const gateTime = isFinitePositiveNumber(gateModifier) ? baseTime * gateModifier : null;

        rows.push({
          zombieLevel: z,
          mineralLevel: m,
          mineralTimeMinutes: baseTime,
          mineralTimeReadable: formatMinutesToReadable(baseTime),
          shaftModifier: shaftModifier,
          shaftTimeMinutes: shaftTime,
          shaftTimeReadable: shaftTime == null ? "" : formatMinutesToReadable(shaftTime),
          gateModifier: gateModifier,
          gateTimeMinutes: gateTime,
          gateTimeReadable: gateTime == null ? "" : formatMinutesToReadable(gateTime)
        });
      }
    }

    return rows;
  }

  function buildMineralMatrix({
    maxZombieLevel = MAX_ZOMBIE_LEVEL,
    maxMineralLevel = MAX_MINERAL_LEVEL,
    readable = false
  } = {}) {
    const zMax = clampInteger(maxZombieLevel, 1, MAX_ZOMBIE_LEVEL);
    const mMax = clampInteger(maxMineralLevel, 1, MAX_MINERAL_LEVEL);

    const header = ["Zombie\\Mineral"];
    for (let m = 1; m <= mMax; m++) {
      header.push(`M${m}`);
    }

    const matrix = [header];

    for (let z = 1; z <= zMax; z++) {
      const row = [`L${z}`];

      for (let m = 1; m <= mMax; m++) {
        const time = getBaseMineralTime(z, m);
        row.push(readable ? formatMinutesToReadable(time) : time);
      }

      matrix.push(row);
    }

    return matrix;
  }

  function toCsv(rows) {
    return rows
      .map(row =>
        row
          .map(value => {
            const str = value == null ? "" : String(value);
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(",")
      )
      .join("\n");
  }

  function mineralTableToCsv(options = {}) {
    const rows = buildMineralTimingTable(options);
    const header = [
      "Zombie Level",
      "Mineral Level",
      "Base Mineral Value",
      "Zombie Power",
      "Base Time Minutes",
      "Base Time Readable"
    ];

    const csvRows = [header];

    for (const row of rows) {
      csvRows.push([
        row.zombieLevel,
        row.mineralLevel,
        row.baseMineralValue,
        row.zombiePower,
        row.baseTimeMinutes,
        row.baseTimeReadable
      ]);
    }

    return toCsv(csvRows);
  }

  function specialTileTableToCsv(options = {}) {
    const rows = buildSpecialTileTimingTable(options);
    const header = [
      "Zombie Level",
      "Mineral Level",
      "Mineral Time Minutes",
      "Mineral Time Readable",
      "Shaft Modifier",
      "Shaft Time Minutes",
      "Shaft Time Readable",
      "Gate Modifier",
      "Gate Time Minutes",
      "Gate Time Readable"
    ];

    const csvRows = [header];

    for (const row of rows) {
      csvRows.push([
        row.zombieLevel,
        row.mineralLevel,
        row.mineralTimeMinutes,
        row.mineralTimeReadable,
        row.shaftModifier,
        row.shaftTimeMinutes,
        row.shaftTimeReadable,
        row.gateModifier,
        row.gateTimeMinutes,
        row.gateTimeReadable
      ]);
    }

    return toCsv(csvRows);
  }

  function downloadTextFile(filename, content, mimeType = "text/csv;charset=utf-8;") {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function downloadMineralCsv(options = {}) {
    const csv = mineralTableToCsv(options);
    downloadTextFile("zm_mineral_timing_table.csv", csv);
  }

  function downloadSpecialTileCsv(options = {}) {
    const csv = specialTileTableToCsv(options);
    downloadTextFile("zm_special_tile_timing_table.csv", csv);
  }

  return {
    MAX_ZOMBIE_LEVEL,
    MAX_MINERAL_LEVEL,
    ZOMBIE_FACTOR_PER_LEVEL,
    MINERAL_TAIL_FACTOR,
    BASE_MINERAL_TABLE,
    DEFAULT_TILE_MODIFIERS,

    getMineralBase,
    getZombiePower,
    getBaseMineralTime,
    getTileTime,
    formatMinutesToReadable,

    buildMineralTimingTable,
    buildSpecialTileTimingTable,
    buildMineralMatrix,

    mineralTableToCsv,
    specialTileTableToCsv,
    downloadMineralCsv,
    downloadSpecialTileCsv
  };
})();
