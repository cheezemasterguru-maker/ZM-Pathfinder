
window.ZMDifficulty = (() => {
  const DIFFICULTY_VERSION = "V1.0";

  const state = {
    generatedAt: null,
    version: DIFFICULTY_VERSION,
    events: {}
  };

  function isAdminUser() {
    return !!(window.currentTester && window.currentTester.isAdmin);
  }

  function isMainEventObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function isChamberKey(key) {
    return key !== "Graveyard";
  }

  function hasUsableGrid(mapRecord) {
    return !!(
      mapRecord &&
      typeof mapRecord === "object" &&
      Array.isArray(mapRecord.grid) &&
      mapRecord.grid.length
    );
  }

  function cloneData(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function round2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  function getMainEvents() {
    const main = window.ZM_MAP_DATA?.Main;
    if (!main || typeof main !== "object") return [];
    return Object.keys(main);
  }

  function getOfficialEventMaps(eventName) {
    return window.ZM_MAP_DATA?.Main?.[eventName] || null;
  }

  function getChamberKeysForEvent(eventName) {
    const eventMaps = getOfficialEventMaps(eventName);
    if (!isMainEventObject(eventMaps)) return [];

    return Object.keys(eventMaps).filter((key) => {
      if (!isChamberKey(key)) return false;
      return hasUsableGrid(eventMaps[key]);
    });
  }

  function getGraveyardRecordForEvent(eventName) {
    const eventMaps = getOfficialEventMaps(eventName);
    if (!isMainEventObject(eventMaps)) return null;

    const graveyard = eventMaps.Graveyard;
    return hasUsableGrid(graveyard) ? graveyard : null;
  }

  function calculateGraveyardTotalWeight(grid) {
    const numberCost = window.ZMPathfinderSolver?.numberCost;
    if (typeof numberCost !== "function") {
      throw new Error("Solver numberCost() is missing.");
    }

    let total = 0;

    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const value = grid[r][c];
        if (typeof value === "number" && Number.isFinite(value) && value > 0) {
          total += numberCost(value);
        }
      }
    }

    return round2(total);
  }

  function solveOfficialChamber(mapRecord) {
    const solver = window.ZMPathfinderSolver?.solveGrid;
    if (typeof solver !== "function") {
      throw new Error("Solver solveGrid() is missing.");
    }

    if (!hasUsableGrid(mapRecord)) {
      return {
        ok: false,
        message: "Map record missing usable grid."
      };
    }

    const gridCopy = mapRecord.grid.map((row) => [...row]);

    const result = solver({
      grid: gridCopy,
      gateType: mapRecord.gateType || "standard"
    });

    if (!result || !result.ok) {
      return {
        ok: false,
        message: result?.message || "Solver failed."
      };
    }

    return {
      ok: true,
      totalCost: round2(result.totalCost || 0),
      redCost: round2(result.redCost || 0),
      blueCost: round2(result.blueCost || 0),
      solverVersion: result.solverVersion || null,
      message: result.message || ""
    };
  }

  function normalizeSeries(valuesByKey) {
    const keys = Object.keys(valuesByKey);
    if (!keys.length) return {};

    const values = keys.map((k) => Number(valuesByKey[k]) || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);

    const normalized = {};

    if (max === min) {
      for (const key of keys) normalized[key] = 0;
      return normalized;
    }

    for (const key of keys) {
      const value = Number(valuesByKey[key]) || 0;
      normalized[key] = Math.round(((value - min) / (max - min)) * 100);
    }

    return normalized;
  }

  function buildEventRecordSkeleton(eventName) {
    return {
      eventName,
      eventDifficultyWeight: 0,
      eventDifficultyPercent: 0,
      chamberWeights: {},
      chamberDetails: {},
      graveyardDifficultyWeight: null,
      graveyardDifficultyPercent: null,
      hasGraveyard: false,
      graveyardTitle: null,
      buildErrors: []
    };
  }

  function rebuildOfficialDifficultyData() {
    if (!isAdminUser()) {
      return {
        ok: false,
        message: "Only admin can rebuild official difficulty data."
      };
    }

    if (!window.ZM_MAP_DATA || !window.ZM_MAP_DATA.Main) {
      return {
        ok: false,
        message: "ZM_MAP_DATA.Main is missing."
      };
    }

    if (!window.ZMPathfinderSolver || typeof window.ZMPathfinderSolver.solveGrid !== "function") {
      return {
        ok: false,
        message: "ZMPathfinderSolver.solveGrid is missing."
      };
    }

    if (typeof window.ZMPathfinderSolver.numberCost !== "function") {
      return {
        ok: false,
        message: "ZMPathfinderSolver.numberCost is missing."
      };
    }

    const nextState = {
      generatedAt: new Date().toISOString(),
      version: DIFFICULTY_VERSION,
      events: {}
    };

    const chamberTotalsForNormalization = {};
    const graveyardTotalsForNormalization = {};

    for (const eventName of getMainEvents()) {
      const eventRecord = buildEventRecordSkeleton(eventName);
      const eventMaps = getOfficialEventMaps(eventName);

      if (!isMainEventObject(eventMaps)) {
        eventRecord.buildErrors.push("Event object missing or invalid.");
        nextState.events[eventName] = eventRecord;
        continue;
      }

      const chamberKeys = getChamberKeysForEvent(eventName);

      for (const chamberKey of chamberKeys) {
        const mapRecord = eventMaps[chamberKey];
        const solved = solveOfficialChamber(mapRecord);

        if (!solved.ok) {
          eventRecord.buildErrors.push(
            `${chamberKey}: ${solved.message || "Unable to solve official chamber."}`
          );
          continue;
        }

        eventRecord.chamberWeights[chamberKey] = solved.totalCost;
        eventRecord.chamberDetails[chamberKey] = {
          title: mapRecord.title || `${eventName} - ${chamberKey}`,
          totalCost: solved.totalCost,
          redCost: solved.redCost,
          blueCost: solved.blueCost,
          solverVersion: solved.solverVersion
        };

        eventRecord.eventDifficultyWeight += solved.totalCost;
      }

      eventRecord.eventDifficultyWeight = round2(eventRecord.eventDifficultyWeight);
      chamberTotalsForNormalization[eventName] = eventRecord.eventDifficultyWeight;

      const graveyardRecord = getGraveyardRecordForEvent(eventName);
      if (graveyardRecord) {
        eventRecord.hasGraveyard = true;
        eventRecord.graveyardTitle =
          graveyardRecord.title || `${eventName} - Graveyard`;

        try {
          const graveyardWeight = calculateGraveyardTotalWeight(graveyardRecord.grid);
          eventRecord.graveyardDifficultyWeight = graveyardWeight;
          graveyardTotalsForNormalization[eventName] = graveyardWeight;
        } catch (err) {
          eventRecord.buildErrors.push(
            `Graveyard: ${err?.message || "Unable to calculate graveyard weight."}`
          );
          eventRecord.graveyardDifficultyWeight = null;
          eventRecord.hasGraveyard = false;
          eventRecord.graveyardTitle = null;
        }
      }

      nextState.events[eventName] = eventRecord;
    }

    const normalizedChamberPercents = normalizeSeries(chamberTotalsForNormalization);
    const normalizedGraveyardPercents = normalizeSeries(graveyardTotalsForNormalization);

    for (const eventName of Object.keys(nextState.events)) {
      const record = nextState.events[eventName];

      record.eventDifficultyPercent =
        normalizedChamberPercents[eventName] ?? 0;

      if (record.hasGraveyard && record.graveyardDifficultyWeight !== null) {
        record.graveyardDifficultyPercent =
          normalizedGraveyardPercents[eventName] ?? 0;
      } else {
        record.graveyardDifficultyPercent = null;
      }
    }

    state.generatedAt = nextState.generatedAt;
    state.version = nextState.version;
    state.events = nextState.events;

    return {
      ok: true,
      message: "Official difficulty data rebuilt.",
      generatedAt: state.generatedAt,
      version: state.version,
      eventsBuilt: Object.keys(state.events).length,
      data: cloneData(state)
    };
  }

  function getDifficultyData() {
    return cloneData(state);
  }

  function getEventDifficulty(eventName) {
    const record = state.events?.[eventName];
    return record ? cloneData(record) : null;
  }

  function hasDifficultyData() {
    return !!state.generatedAt && Object.keys(state.events || {}).length > 0;
  }

  return {
    version: DIFFICULTY_VERSION,
    rebuildOfficialDifficultyData,
    getDifficultyData,
    getEventDifficulty,
    hasDifficultyData
  };
})();
