window.ZMMapValidator = (() => {
  const VALID_TILE_TYPES = new Set(["X", "S", "B", ""]);
  const MAIN_EVENT_3_CHAMBER = new Set([
    "Essence Cave",
    "Treasure Trove of Gems"
  ]);

  function isNumberTile(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function isValidTile(value) {
    return isNumberTile(value) || VALID_TILE_TYPES.has(value);
  }

  function isSpecialSmallEvent(eventName) {
    return MAIN_EVENT_3_CHAMBER.has(eventName);
  }

  function isGraveyardName(chamberName) {
    return String(chamberName || "").trim().toLowerCase() === "graveyard";
  }

  function getExpectedMainChambers(eventName) {
    return MAIN_EVENT_3_CHAMBER.has(eventName)
      ? ["Chamber 1", "Chamber 2", "Chamber 3", "Graveyard"]
      : ["Chamber 1", "Chamber 2", "Chamber 3", "Chamber 4", "Graveyard"];
  }

  function getExpectedRowCount(eventName, chamberName) {
    const isGraveyard = isGraveyardName(chamberName);

    if (isSpecialSmallEvent(eventName)) {
      return isGraveyard ? 16 : 13;
    }

    return isGraveyard ? 20 : 15;
  }

  function inferEventAndChamberFromTitle(title) {
    const raw = String(title || "").trim();
    if (!raw) {
      return { eventName: "", chamberName: "" };
    }

    const parts = raw.split(" - ").map(s => s.trim()).filter(Boolean);

    if (parts.length >= 2) {
      return {
        eventName: parts.slice(0, -1).join(" - "),
        chamberName: parts[parts.length - 1]
      };
    }

    return {
      eventName: "",
      chamberName: raw
    };
  }

  function validateGridShape(grid, label, expectedRows = null) {
    const errors = [];

    if (!Array.isArray(grid)) {
      errors.push(`${label}: grid is not an array.`);
      return errors;
    }

    if (grid.length < 1) {
      errors.push(`${label}: grid has no rows.`);
      return errors;
    }

    if (expectedRows !== null && grid.length !== expectedRows) {
      errors.push(`${label}: grid has ${grid.length} rows, expected ${expectedRows}.`);
    }

    for (let r = 0; r < grid.length; r++) {
      if (!Array.isArray(grid[r])) {
        errors.push(`${label}: row ${r + 1} is not an array.`);
        continue;
      }

      if (grid[r].length !== 7) {
        errors.push(`${label}: row ${r + 1} has ${grid[r].length} columns, expected 7.`);
      }
    }

    return errors;
  }

  function validateTiles(grid, label) {
    const errors = [];

    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const value = grid[r][c];
        if (!isValidTile(value)) {
          errors.push(
            `${label}: invalid tile at row ${r + 1}, col ${c + 1} -> ${JSON.stringify(value)}.`
          );
        }
      }
    }

    return errors;
  }

  function getShaftCells(grid) {
    const cells = [];
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c] === "S") {
          cells.push([r, c]);
        }
      }
    }
    return cells;
  }

  function floodFillShafts(grid) {
    const visited = new Set();
    const clusters = [];

    function key(r, c) {
      return `${r},${c}`;
    }

    function neighbors(r, c) {
      return [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1]
      ];
    }

    for (const [startR, startC] of getShaftCells(grid)) {
      const startKey = key(startR, startC);
      if (visited.has(startKey)) continue;

      const queue = [[startR, startC]];
      const cluster = [];
      visited.add(startKey);

      while (queue.length) {
        const [r, c] = queue.shift();
        cluster.push([r, c]);

        for (const [nr, nc] of neighbors(r, c)) {
          if (
            nr >= 0 &&
            nr < grid.length &&
            nc >= 0 &&
            nc < 7 &&
            grid[nr][nc] === "S"
          ) {
            const k = key(nr, nc);
            if (!visited.has(k)) {
              visited.add(k);
              queue.push([nr, nc]);
            }
          }
        }
      }

      clusters.push(cluster);
    }

    return clusters;
  }

  function validateShafts(grid, label) {
    const errors = [];
    const clusters = floodFillShafts(grid);

    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      const rows = cluster.map(([r]) => r);
      const cols = cluster.map(([, c]) => c);

      const minR = Math.min(...rows);
      const maxR = Math.max(...rows);
      const minC = Math.min(...cols);
      const maxC = Math.max(...cols);

      const height = maxR - minR + 1;
      const width = maxC - minC + 1;

      if (cluster.length !== 6 || height !== 3 || width !== 2) {
        errors.push(
          `${label}: shaft cluster ${i + 1} is invalid. Expected exactly 2x3 (6 cells), got ${width}x${height} with ${cluster.length} cells.`
        );
        continue;
      }

      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          if (grid[r]?.[c] !== "S") {
            errors.push(
              `${label}: shaft cluster ${i + 1} is missing an S at row ${r + 1}, col ${c + 1}.`
            );
          }
        }
      }
    }

    return errors;
  }

  function validateEventStructure(mainData, eventName) {
    const errors = [];
    const event = mainData[eventName];

    if (!event || typeof event !== "object") {
      errors.push(`Main/${eventName}: event data missing or invalid.`);
      return errors;
    }

    const expected = getExpectedMainChambers(eventName);

    for (const chamberName of expected) {
      if (!(chamberName in event)) {
        errors.push(`Main/${eventName}: missing key "${chamberName}".`);
      }
    }

    return errors;
  }

  function validateChamberObject(chamber, label, eventName, chamberName) {
    const errors = [];

    if (!chamber || typeof chamber !== "object") {
      errors.push(`${label}: chamber object missing or invalid.`);
      return errors;
    }

    if (typeof chamber.title !== "string" || !chamber.title.trim()) {
      errors.push(`${label}: missing or invalid title.`);
    }

    if (chamber.gateType !== "standard" && chamber.gateType !== "end") {
      errors.push(`${label}: gateType must be "standard" or "end".`);
    }

    if (!("grid" in chamber)) {
      errors.push(`${label}: missing grid.`);
      return errors;
    }

    const expectedRows = getExpectedRowCount(eventName, chamberName);

    errors.push(...validateGridShape(chamber.grid, label, expectedRows));

    if (Array.isArray(chamber.grid)) {
      errors.push(...validateTiles(chamber.grid, label));
      errors.push(...validateShafts(chamber.grid, label));
    }

    return errors;
  }

  function validateMainMapData(data) {
    const errors = [];

    if (!data || typeof data !== "object") {
      return ["ZM_MAP_DATA is missing or invalid."];
    }

    if (!data.Main || typeof data.Main !== "object") {
      return ['ZM_MAP_DATA.Main is missing or invalid.'];
    }

    if (!("Legacy" in data) || typeof data.Legacy !== "object" || data.Legacy === null) {
      return ['ZM_MAP_DATA.Legacy is missing or invalid.'];
    }

    const main = data.Main;

    for (const eventName of Object.keys(main)) {
      errors.push(...validateEventStructure(main, eventName));

      const event = main[eventName];
      if (!event || typeof event !== "object") continue;

      for (const [key, value] of Object.entries(event)) {
        if (key === "Graveyard") {
          if (value === null) {
            continue;
          }

          errors.push(
            ...validateChamberObject(
              value,
              `Main/${eventName}/${key}`,
              eventName,
              key
            )
          );
          continue;
        }

        errors.push(
          ...validateChamberObject(
            value,
            `Main/${eventName}/${key}`,
            eventName,
            key
          )
        );
      }
    }

    return errors;
  }

  function validateSingleLoadedGrid(grid, title = "Loaded Grid") {
    const errors = [];
    const inferred = inferEventAndChamberFromTitle(title);

    let expectedRows = null;
    if (inferred.eventName && inferred.chamberName) {
      expectedRows = getExpectedRowCount(inferred.eventName, inferred.chamberName);
    }

    errors.push(...validateGridShape(grid, title, expectedRows));

    if (Array.isArray(grid)) {
      errors.push(...validateTiles(grid, title));
      errors.push(...validateShafts(grid, title));
    }

    return {
      ok: errors.length === 0,
      errors
    };
  }

  return {
    validateMainMapData,
    validateSingleLoadedGrid
  };
})();
