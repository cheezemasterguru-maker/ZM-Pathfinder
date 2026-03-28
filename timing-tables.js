window.ZM_TIMING_TABLES = (() => {
  const MAX_ZOMBIE_LEVEL = 50;
  const MAX_OBJECT_LEVEL = 90;

  // Calibrated from measured shaft/gate data only
  const ZOMBIE_FACTOR = 2.085;

  const SHAFT_FACTOR = 2.20;
  const SHAFT_BASE = 0.47;

  const GATE_FACTOR = 2.20;
  const GATE_BASE = 1.05;

  function roundSeconds(value) {
    return Math.max(1, Math.round(value));
  }

  function formatTime(seconds) {
    const total = roundSeconds(seconds);

    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }

    return `${minutes}:${String(secs).padStart(2, "0")}`;
  }

  function getShaftTimeSeconds(zombieLevel, shaftLevel) {
    return SHAFT_BASE
      * Math.pow(SHAFT_FACTOR, shaftLevel)
      / Math.pow(ZOMBIE_FACTOR, zombieLevel);
  }

  function getGateTimeSeconds(zombieLevel, gateLevel) {
    return GATE_BASE
      * Math.pow(GATE_FACTOR, gateLevel)
      / Math.pow(ZOMBIE_FACTOR, zombieLevel);
  }

  function buildTypeMatrix(type) {
    const header = ["Zombie\\Level"];
    for (let level = 1; level <= MAX_OBJECT_LEVEL; level++) {
      header.push(level);
    }

    const secondsMatrix = [header];
    const readableMatrix = [header];

    for (let zombieLevel = 1; zombieLevel <= MAX_ZOMBIE_LEVEL; zombieLevel++) {
      const secondsRow = [`L${zombieLevel}`];
      const readableRow = [`L${zombieLevel}`];

      for (let objectLevel = 1; objectLevel <= MAX_OBJECT_LEVEL; objectLevel++) {
        const seconds = type === "shaft"
          ? getShaftTimeSeconds(zombieLevel, objectLevel)
          : getGateTimeSeconds(zombieLevel, objectLevel);

        const rounded = roundSeconds(seconds);

        secondsRow.push(rounded);
        readableRow.push(formatTime(rounded));
      }

      secondsMatrix.push(secondsRow);
      readableMatrix.push(readableRow);
    }

    return {
      secondsMatrix,
      readableMatrix
    };
  }

  function buildLookupObject(type) {
    const out = {};

    for (let zombieLevel = 1; zombieLevel <= MAX_ZOMBIE_LEVEL; zombieLevel++) {
      out[zombieLevel] = {};

      for (let objectLevel = 1; objectLevel <= MAX_OBJECT_LEVEL; objectLevel++) {
        const seconds = type === "shaft"
          ? getShaftTimeSeconds(zombieLevel, objectLevel)
          : getGateTimeSeconds(zombieLevel, objectLevel);

        const rounded = roundSeconds(seconds);

        out[zombieLevel][objectLevel] = {
          seconds: rounded,
          readable: formatTime(rounded)
        };
      }
    }

    return out;
  }

  function matrixToCsv(matrix) {
    return matrix
      .map(row =>
        row.map(value => {
          const text = String(value ?? "");
          if (text.includes(",") || text.includes('"') || text.includes("\n")) {
            return `"${text.replace(/"/g, '""')}"`;
          }
          return text;
        }).join(",")
      )
      .join("\n");
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

  const shaft = buildTypeMatrix("shaft");
  const gate = buildTypeMatrix("gate");

  const shaftLookup = buildLookupObject("shaft");
  const gateLookup = buildLookupObject("gate");

  function downloadShaftSecondsCsv() {
    downloadTextFile("zm_shaft_times_seconds.csv", matrixToCsv(shaft.secondsMatrix));
  }

  function downloadShaftReadableCsv() {
    downloadTextFile("zm_shaft_times_readable.csv", matrixToCsv(shaft.readableMatrix));
  }

  function downloadGateSecondsCsv() {
    downloadTextFile("zm_gate_times_seconds.csv", matrixToCsv(gate.secondsMatrix));
  }

  function downloadGateReadableCsv() {
    downloadTextFile("zm_gate_times_readable.csv", matrixToCsv(gate.readableMatrix));
  }

  function getShaftEntry(zombieLevel, shaftLevel) {
    const z = Number(zombieLevel);
    const l = Number(shaftLevel);
    return shaftLookup[z]?.[l] || null;
  }

  function getGateEntry(zombieLevel, gateLevel) {
    const z = Number(zombieLevel);
    const l = Number(gateLevel);
    return gateLookup[z]?.[l] || null;
  }

  return {
    constants: {
      MAX_ZOMBIE_LEVEL,
      MAX_OBJECT_LEVEL,
      ZOMBIE_FACTOR,
      SHAFT_FACTOR,
      SHAFT_BASE,
      GATE_FACTOR,
      GATE_BASE
    },

    formatTime,

    getShaftTimeSeconds,
    getGateTimeSeconds,

    getShaftEntry,
    getGateEntry,

    shaftSecondsMatrix: shaft.secondsMatrix,
    shaftReadableMatrix: shaft.readableMatrix,
    gateSecondsMatrix: gate.secondsMatrix,
    gateReadableMatrix: gate.readableMatrix,

    shaftLookup,
    gateLookup,

    downloadShaftSecondsCsv,
    downloadShaftReadableCsv,
    downloadGateSecondsCsv,
    downloadGateReadableCsv
  };
})();
