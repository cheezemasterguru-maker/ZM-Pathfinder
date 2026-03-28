window.ZM_TILE_META_CONVERTER = (() => {
  const TOKEN_MAP = {
    "": null,
    ".": null,
    "-": null,
    "_": null,
    "0": null,
    "PLAIN": null,

    "GEM": { object: "gems" },
    "BDG": { object: "badges" },
    "E": { object: "emblems" },
    "K": { object: "keys" },
    "ESS": { object: "essence" },
    "STK": { object: "stickers" },

    "WD": { object: "chest", subtype: "wood" },
    "IRN": { object: "chest", subtype: "iron" },
    "STL": { object: "chest", subtype: "steel" },
    "SIL": { object: "chest", subtype: "silver" },
    "GLD": { object: "chest", subtype: "gold" }
  };

  function cloneMeta(meta) {
    if (!meta) return null;
    return JSON.parse(JSON.stringify(meta));
  }

  function normalizeToken(token) {
    return String(token ?? "").trim().toUpperCase();
  }

  function tokenToMeta(token) {
    const normalized = normalizeToken(token);
    if (!(normalized in TOKEN_MAP)) {
      throw new Error(`Unknown object token: "${token}"`);
    }
    return cloneMeta(TOKEN_MAP[normalized]);
  }

  function validateOverlayGrid(grid) {
    if (!Array.isArray(grid) || !grid.length) {
      throw new Error("Overlay grid must be a non-empty 2D array.");
    }

    const width = grid[0].length;
    if (!width) {
      throw new Error("Overlay grid rows must not be empty.");
    }

    for (let r = 0; r < grid.length; r++) {
      if (!Array.isArray(grid[r])) {
        throw new Error(`Overlay grid row ${r} is not an array.`);
      }
      if (grid[r].length !== width) {
        throw new Error(
          `Overlay grid is not rectangular. Row 0 has ${width} columns, row ${r} has ${grid[r].length}.`
        );
      }
    }

    return { rows: grid.length, cols: width };
  }

  function gridToTilesObject(grid) {
    validateOverlayGrid(grid);

    const tiles = {};

    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const meta = tokenToMeta(grid[r][c]);
        if (meta) {
          tiles[`${r},${c}`] = meta;
        }
      }
    }

    return tiles;
  }

  function buildChamberPatch({ eventName, chamberName, overlayGrid }) {
    if (!eventName || !chamberName) {
      throw new Error("eventName and chamberName are required.");
    }

    const tiles = gridToTilesObject(overlayGrid);

    return {
      Main: {
        [eventName]: {
          [chamberName]: {
            tiles
          }
        }
      }
    };
  }

  function buildTileMetaBlock({ eventName, chamberName, overlayGrid, indent = 2 }) {
    if (!eventName || !chamberName) {
      throw new Error("eventName and chamberName are required.");
    }

    const tiles = gridToTilesObject(overlayGrid);
    const spaces = " ".repeat(indent);
    const inner = " ".repeat(indent * 2);
    const lines = [];

    lines.push(`"${chamberName}": {`);
    lines.push(`${spaces}tiles: {`);

    const entries = Object.entries(tiles);
    entries.forEach(([key, value], index) => {
      const parts = [`object: "${value.object}"`];
      if (value.subtype) parts.push(`subtype: "${value.subtype}"`);
      const suffix = index < entries.length - 1 ? "," : "";
      lines.push(`${inner}"${key}": { ${parts.join(", ")} }${suffix}`);
    });

    lines.push(`${spaces}}`);
    lines.push(`}`);

    return lines.join("\n");
  }

  function buildWholeEventPreview({ eventName, chamberOverlays, indent = 2 }) {
    if (!eventName || !chamberOverlays || typeof chamberOverlays !== "object") {
      throw new Error("eventName and chamberOverlays are required.");
    }

    const chamberNames = Object.keys(chamberOverlays);
    const blocks = chamberNames.map((chamberName) =>
      buildTileMetaBlock({
        eventName,
        chamberName,
        overlayGrid: chamberOverlays[chamberName],
        indent
      })
    );

    return `"${eventName}": {\n${indentMultiline(blocks.join(",\n\n"), indent)}\n}`;
  }

  function indentMultiline(text, indent) {
    const spaces = " ".repeat(indent);
    return String(text)
      .split("\n")
      .map(line => spaces + line)
      .join("\n");
  }

  function copyText(text) {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text);
    }

    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    return Promise.resolve();
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function convertAndCopyChamber({ eventName, chamberName, overlayGrid }) {
    const text = buildTileMetaBlock({ eventName, chamberName, overlayGrid });
    return copyText(text).then(() => text);
  }

  function convertAndDownloadChamber({ eventName, chamberName, overlayGrid }) {
    const text = buildTileMetaBlock({ eventName, chamberName, overlayGrid });
    const safeEvent = eventName.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
    const safeChamber = chamberName.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
    downloadText(`${safeEvent}_${safeChamber}_tile_meta.txt`, text);
    return text;
  }

  return {
    TOKEN_MAP,
    tokenToMeta,
    gridToTilesObject,
    buildChamberPatch,
    buildTileMetaBlock,
    buildWholeEventPreview,
    convertAndCopyChamber,
    convertAndDownloadChamber
  };
})();
