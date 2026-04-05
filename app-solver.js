const OBJECT_PRIORITY_DEFINITIONS = {
  wood: {
    label: "Wood",
    visualMeta: { object: "chest", subtype: "wood" }
  },
  iron: {
    label: "Iron",
    visualMeta: { object: "chest", subtype: "iron" }
  },
  steel: {
    label: "Steel",
    visualMeta: { object: "chest", subtype: "steel" }
  },
  silver: {
    label: "Silver",
    visualMeta: { object: "chest", subtype: "silver" }
  },
  gold: {
    label: "Gold",
    visualMeta: { object: "chest", subtype: "gold" }
  },
  key: {
    label: "Key",
    visualMeta: { object: "keys" }
  },
  emblem: {
    label: "Emblem",
    visualMeta: { object: "emblems" }
  },
  essence: {
    label: "Essence",
    visualMeta: { object: "essence" }
  },
  badge: {
    label: "Badge",
    visualMeta: { object: "badges" }
  },
  gems: {
    label: "Gems",
    visualMeta: { object: "gems" }
  },
  sticker: {
    label: "Sticker",
    visualMeta: { object: "stickers" }
  }
};

const OBJECT_PRIORITY_REGISTRY = Object.keys(OBJECT_PRIORITY_DEFINITIONS);

let objectPriorities = {};
let activeObjectTypes = [];

function solverSafeT(key, fallback) {
  if (typeof t !== "function") return fallback;
  const value = t(key);
  return value === key ? fallback : value;
}

function normalizeObjectTypeName(value) {
  return String(value || "").trim().toLowerCase();
}

function formatObjectPriorityLabel(objectType) {
  const normalized = normalizeObjectTypeName(objectType);
  if (!normalized) return "";
  return OBJECT_PRIORITY_DEFINITIONS[normalized]?.label || normalized;
}

function initObjectPriorities() {
  objectPriorities = {};
  OBJECT_PRIORITY_REGISTRY.forEach((type) => {
    objectPriorities[type] = "normal";
  });
}

initObjectPriorities();

function getTileMeta(eventType, eventName, chamberName, r, c) {
  const mineName = currentMapContext.eventMine;

  if (eventType === "Legacy") {
    return (
      window.ZM_TILE_META?.Legacy?.[eventName]?.[mineName]?.[chamberName]?.tiles?.[`${r},${c}`] ||
      { object: "plain" }
    );
  }

  return (
    window.ZM_TILE_META?.[eventType]?.[eventName]?.[chamberName]?.tiles?.[`${r},${c}`] ||
    { object: "plain" }
  );
}

function getObjectVisual(meta) {
  if (!meta || !meta.object || meta.object === "plain" || !window.ZM_OBJECT_TYPES) {
    return { code: "", fill: null };
  }

  const objDef = window.ZM_OBJECT_TYPES[meta.object];
  if (!objDef) {
    return { code: "", fill: null };
  }

  if (meta.subtype && objDef.subtypes?.[meta.subtype]) {
    return {
      code: objDef.subtypes[meta.subtype].code || "",
      fill: objDef.subtypes[meta.subtype].fill || null
    };
  }

  return {
    code: objDef.code || "",
    fill: objDef.fill || null
  };
}

function isPriorityEligibleObject(objectType) {
  const normalized = normalizeObjectTypeName(objectType);
  if (!normalized) return false;
  return OBJECT_PRIORITY_REGISTRY.includes(normalized);
}

function getPriorityObjectTypeFromMeta(meta) {
  if (!meta) return "";

  const objectType = normalizeObjectTypeName(meta.object);
  const subtype = normalizeObjectTypeName(meta.subtype);

  if (objectType === "chest" && isPriorityEligibleObject(subtype)) {
    return subtype;
  }

  if (objectType === "keys") return "key";
  if (objectType === "emblems") return "emblem";
  if (objectType === "badges") return "badge";
  if (objectType === "stickers") return "sticker";
  if (objectType === "gems") return "gems";
  if (objectType === "essence") return "essence";

  if (isPriorityEligibleObject(objectType)) return objectType;
  if (isPriorityEligibleObject(subtype)) return subtype;

  return "";
}

function getPriorityVisualMeta(objectType) {
  const normalized = normalizeObjectTypeName(objectType);
  return OBJECT_PRIORITY_DEFINITIONS[normalized]?.visualMeta || { object: normalized };
}

function getCellObjectType(r, c) {
  const meta = getTileMeta(
    currentMapContext.eventType,
    currentMapContext.eventName,
    currentMapContext.chamberName,
    r,
    c
  );
  return getPriorityObjectTypeFromMeta(meta);
}

function scanActiveObjectTypes() {
  const found = new Set();

  for (let r = 0; r < currentRowCount; r++) {
    for (let c = 0; c < COLS; c++) {
      const priorityType = getCellObjectType(r, c);
      if (priorityType) {
        found.add(priorityType);
      }
    }
  }

  activeObjectTypes = Array.from(found);
  return activeObjectTypes;
}

function getObjectPriorityValue(objectType) {
  const normalized = normalizeObjectTypeName(objectType);
  return objectPriorities[normalized] || "normal";
}

function setObjectPriorityValue(objectType, value) {
  const normalized = normalizeObjectTypeName(objectType);
  if (!normalized) return;
  if (!["avoid", "normal", "priority"].includes(value)) return;
  objectPriorities[normalized] = value;
}

function getObjectPriorityMapForSolver() {
  const map = {};
  activeObjectTypes.forEach((type) => {
    map[type] = getObjectPriorityValue(type);
  });
  return map;
}

function rerunSolveAfterPriorityChange() {
  if (solveState?.solved) {
    solveBoard();
  } else {
    if (typeof render === "function") render();
    if (typeof renderPreview === "function") renderPreview();
  }
}

function applyObjectPriorityChange(objectType, value) {
  setObjectPriorityValue(objectType, value);
  renderObjectPrioritiesModal();
  rerunSolveAfterPriorityChange();
}

function resetObjectPriorities() {
  scanActiveObjectTypes();
  activeObjectTypes.forEach((type) => {
    objectPriorities[type] = "normal";
  });
  renderObjectPrioritiesModal();
  rerunSolveAfterPriorityChange();
}

function openObjectPrioritiesModal() {
  scanActiveObjectTypes();
  renderObjectPrioritiesModal();
  const overlay = document.getElementById("objectPrioritiesOverlay");
  if (overlay) overlay.classList.add("show");
}

function closeObjectPrioritiesModal() {
  const overlay = document.getElementById("objectPrioritiesOverlay");
  if (overlay) overlay.classList.remove("show");
}

function buildObjectPriorityButton(label, active, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn-action";
  button.textContent = label;
  button.style.minWidth = "88px";
  button.style.opacity = active ? "1" : "0.7";
  button.style.outline = active ? "2px solid rgba(255,255,255,0.85)" : "none";
  button.style.fontWeight = active ? "700" : "600";
  button.style.whiteSpace = "nowrap";
  button.onclick = onClick;
  return button;
}

function renderObjectPrioritiesModal() {
  const body = document.getElementById("objectPrioritiesBody");
  if (!body) return;

  scanActiveObjectTypes();
  body.innerHTML = "";
  body.style.overflowWrap = "anywhere";
  body.style.wordBreak = "break-word";
  body.style.boxSizing = "border-box";
  body.style.maxWidth = "100%";

  if (!activeObjectTypes.length) {
    const empty = document.createElement("div");
    empty.className = "help-section";
    empty.style.overflowWrap = "anywhere";
    empty.style.wordBreak = "break-word";
    empty.textContent = solverSafeT(
      "noOptionalObjectsFound",
      "No optional objects found on the current board."
    );
    body.appendChild(empty);
    return;
  }

  activeObjectTypes.forEach((objectType) => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.gap = "12px";
    row.style.padding = "10px 0";
    row.style.borderBottom = "1px solid rgba(255,255,255,0.08)";
    row.style.boxSizing = "border-box";
    row.style.maxWidth = "100%";
    row.style.flexWrap = "wrap";

    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.alignItems = "center";
    left.style.gap = "10px";
    left.style.minWidth = "0";
    left.style.flex = "1 1 220px";
    left.style.overflow = "hidden";

    const preview = document.createElement("div");
    preview.style.width = "34px";
    preview.style.height = "34px";
    preview.style.borderRadius = "8px";
    preview.style.border = "2px solid rgba(255,255,255,0.12)";
    preview.style.flex = "0 0 auto";

    const visualMeta = getPriorityVisualMeta(objectType);
    const visual = getObjectVisual(visualMeta);

    if (visual.fill) {
      if (typeof visual.fill === "string") {
        preview.style.background = visual.fill;
      } else if (
        visual.fill.type === "dual" &&
        Array.isArray(visual.fill.colors) &&
        visual.fill.colors.length >= 2
      ) {
        preview.style.background = `linear-gradient(135deg, ${visual.fill.colors[0]} 50%, ${visual.fill.colors[1]} 50%)`;
      }
    } else {
      preview.style.background = "#2a3558";
    }

    const labelWrap = document.createElement("div");
    labelWrap.style.minWidth = "0";
    labelWrap.style.overflow = "hidden";
    labelWrap.style.flex = "1 1 auto";

    const title = document.createElement("div");
    title.textContent = formatObjectPriorityLabel(objectType);
    title.style.fontWeight = "700";
    title.style.lineHeight = "1.2";
    title.style.overflowWrap = "anywhere";
    title.style.wordBreak = "break-word";

    const subtitle = document.createElement("div");
    subtitle.textContent = visual.code || objectType;
    subtitle.style.fontSize = "12px";
    subtitle.style.opacity = "0.75";
    subtitle.style.lineHeight = "1.2";
    subtitle.style.marginTop = "2px";
    subtitle.style.overflowWrap = "anywhere";
    subtitle.style.wordBreak = "break-word";

    labelWrap.appendChild(title);
    labelWrap.appendChild(subtitle);

    left.appendChild(preview);
    left.appendChild(labelWrap);

    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.flexWrap = "wrap";
    right.style.justifyContent = "flex-end";
    right.style.gap = "8px";
    right.style.flex = "0 1 auto";
    right.style.maxWidth = "100%";

    const current = getObjectPriorityValue(objectType);

    right.appendChild(
      buildObjectPriorityButton(
        solverSafeT("avoid", "Avoid"),
        current === "avoid",
        () => applyObjectPriorityChange(objectType, "avoid")
      )
    );

    right.appendChild(
      buildObjectPriorityButton(
        solverSafeT("normal", "Normal"),
        current === "normal",
        () => applyObjectPriorityChange(objectType, "normal")
      )
    );

    right.appendChild(
      buildObjectPriorityButton(
        solverSafeT("priority", "Priority"),
        current === "priority",
        () => applyObjectPriorityChange(objectType, "priority")
      )
    );

    row.appendChild(left);
    row.appendChild(right);
    body.appendChild(row);
  });
}

function solveBoard() {
  if (!window.ZMPathfinderSolver || typeof window.ZMPathfinderSolver.solveGrid !== "function") {
    setReport(typeof t === "function" ? t("solverMissing") : "Solver missing");
    return;
  }

  scanActiveObjectTypes();

  const result = window.ZMPathfinderSolver.solveGrid({
    grid: getVisibleGridSlice(),
    gateType: document.getElementById("gateType").value,
    eventType: currentMapContext.eventType,
    eventName: currentMapContext.eventName,
    eventMine: currentMapContext.eventMine,
    chamberName: currentMapContext.chamberName,
    objectPriorityMap: getObjectPriorityMapForSolver(),
    getCellObjectType
  });

  if (!result || !result.ok) {
    resetSolve();
    setReport(result && result.message ? result.message : (typeof t === "function" ? t("solverFailed") : "Solver failed"));
    if (typeof renderPreview === "function") renderPreview();
    return;
  }

  solveState = {
    redPath: result.redPath || [],
    bluePaths: result.bluePaths || [],
    shaftEntryDots: result.shaftEntryDots || [],
    shaftClusters: result.shaftClusters || [],
    attackPoints: result.attackPoints || [],
    solved: true,
    message: result.message || (typeof t === "function" ? t("solvedMessage") : "Solved"),
    routeAnalysis: result.routeAnalysis || [],
    solverVersion: result.solverVersion || null,
    legacyEndMode: !!result.legacyEndMode,
    redBubbleCount: result.redBubbleCount ?? 0,
    firstBubbleTravelCost: result.firstBubbleTravelCost ?? null,
    effectiveTotal: result.effectiveTotal ?? null,
    redCost: result.redCost ?? null,
    blueCost: result.blueCost ?? null,
    redObjectPriorityScore: result.redObjectPriorityScore ?? 0,
    blueObjectPriorityScore: result.blueObjectPriorityScore ?? 0,
    objectPriorityScore: result.objectPriorityScore ?? 0
  };

  setReport(result.message || (typeof t === "function" ? t("solvedMessage") : "Solved"));
  if (typeof renderRouteAudit === "function") {
    renderRouteAudit(result.routeAnalysis || []);
  }
  if (typeof renderPreview === "function") {
    renderPreview();
  }
}

window.openObjectPrioritiesModal = openObjectPrioritiesModal;
window.closeObjectPrioritiesModal = closeObjectPrioritiesModal;
window.resetObjectPriorities = resetObjectPriorities;
window.solveBoard = solveBoard;
window.scanActiveObjectTypes = scanActiveObjectTypes;
window.getCellObjectType = getCellObjectType;
