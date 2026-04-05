const OBJECT_PRIORITY_REGISTRY = [
  "wood",
  "iron",
  "steel",
  "silver",
  "gold",
  "key",
  "emblem",
  "essence",
  "badge"
];

let objectPriorities = {};
let activeObjectTypes = [];

function normalizeObjectTypeName(value) {
  return String(value || "").trim().toLowerCase();
}

function formatObjectPriorityLabel(objectType) {
  const normalized = normalizeObjectTypeName(objectType);
  if (!normalized) return "";
  return normalized
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function initObjectPriorities() {
  objectPriorities = {};
  OBJECT_PRIORITY_REGISTRY.forEach(type => {
    objectPriorities[type] = "normal";
  });
}

initObjectPriorities();

function getTileMeta(eventType, eventName, chamberName, r, c){
  const mineName = currentMapContext.eventMine;

  if (eventType === "Legacy") {
    return window.ZM_TILE_META?.Legacy?.[eventName]?.[mineName]?.[chamberName]?.tiles?.[`${r},${c}`]
      || { object: "plain" };
  }

  return window.ZM_TILE_META?.[eventType]?.[eventName]?.[chamberName]?.tiles?.[`${r},${c}`]
    || { object: "plain" };
}

function getObjectVisual(meta){
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

  if (normalized === "plain") return false;
  if (normalized === "bubble") return false;
  if (normalized === "shaft") return false;
  if (normalized === "gate") return false;

  return OBJECT_PRIORITY_REGISTRY.includes(normalized);
}

function scanActiveObjectTypes() {
  const found = new Set();

  for (let r = 0; r < currentRowCount; r++) {
    for (let c = 0; c < COLS; c++) {
      const meta = getTileMeta(
        currentMapContext.eventType,
        currentMapContext.eventName,
        currentMapContext.chamberName,
        r,
        c
      );

      const objectType = normalizeObjectTypeName(meta?.object);
      if (isPriorityEligibleObject(objectType)) {
        found.add(objectType);
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

function resetObjectPriorities() {
  scanActiveObjectTypes();
  activeObjectTypes.forEach(type => {
    objectPriorities[type] = "normal";
  });
  renderObjectPrioritiesModal();
}

function getObjectPriorityMultiplier(objectType) {
  const priority = getObjectPriorityValue(objectType);
  if (priority === "avoid") return 1.35;
  if (priority === "priority") return 0.75;
  return 1;
}

function getCellObjectPriorityMultiplier(r, c) {
  const meta = getTileMeta(
    currentMapContext.eventType,
    currentMapContext.eventName,
    currentMapContext.chamberName,
    r,
    c
  );

  const objectType = normalizeObjectTypeName(meta?.object);
  if (!isPriorityEligibleObject(objectType)) return 1;
  return getObjectPriorityMultiplier(objectType);
}

function getObjectPriorityMapForSolver() {
  const map = {};
  activeObjectTypes.forEach(type => {
    map[type] = getObjectPriorityValue(type);
  });
  return map;
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
  button.onclick = onClick;
  return button;
}

function renderObjectPrioritiesModal() {
  const body = document.getElementById("objectPrioritiesBody");
  if (!body) return;

  scanActiveObjectTypes();
  body.innerHTML = "";

  if (!activeObjectTypes.length) {
    const empty = document.createElement("div");
    empty.className = "help-section";
    empty.innerHTML = "No optional objects found on the current board.";
    body.appendChild(empty);
    return;
  }

  activeObjectTypes.forEach(objectType => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.gap = "12px";
    row.style.padding = "10px 0";
    row.style.borderBottom = "1px solid rgba(255,255,255,0.08)";

    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.alignItems = "center";
    left.style.gap = "10px";
    left.style.minWidth = "0";

    const preview = document.createElement("div");
    preview.style.width = "34px";
    preview.style.height = "34px";
    preview.style.borderRadius = "8px";
    preview.style.border = "2px solid rgba(255,255,255,0.12)";
    preview.style.flex = "0 0 auto";

    const visual = getObjectVisual({ object: objectType });
    if (visual.fill) {
      if (typeof visual.fill === "string") {
        preview.style.background = visual.fill;
      } else if (visual.fill.type === "dual" && Array.isArray(visual.fill.colors) && visual.fill.colors.length >= 2) {
        preview.style.background = `linear-gradient(135deg, ${visual.fill.colors[0]} 50%, ${visual.fill.colors[1]} 50%)`;
      }
    } else {
      preview.style.background = "#2a3558";
    }

    const labelWrap = document.createElement("div");
    labelWrap.style.minWidth = "0";

    const title = document.createElement("div");
    title.textContent = formatObjectPriorityLabel(objectType);
    title.style.fontWeight = "700";
    title.style.lineHeight = "1.2";

    const subtitle = document.createElement("div");
    subtitle.textContent = getObjectVisual({ object: objectType }).code || objectType;
    subtitle.style.fontSize = "12px";
    subtitle.style.opacity = "0.75";
    subtitle.style.lineHeight = "1.2";
    subtitle.style.marginTop = "2px";

    labelWrap.appendChild(title);
    labelWrap.appendChild(subtitle);

    left.appendChild(preview);
    left.appendChild(labelWrap);

    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.flexWrap = "wrap";
    right.style.justifyContent = "flex-end";
    right.style.gap = "8px";

    const current = getObjectPriorityValue(objectType);

    right.appendChild(
      buildObjectPriorityButton("Avoid", current === "avoid", () => {
        setObjectPriorityValue(objectType, "avoid");
        renderObjectPrioritiesModal();
      })
    );

    right.appendChild(
      buildObjectPriorityButton("Normal", current === "normal", () => {
        setObjectPriorityValue(objectType, "normal");
        renderObjectPrioritiesModal();
      })
    );

    right.appendChild(
      buildObjectPriorityButton("Priority", current === "priority", () => {
        setObjectPriorityValue(objectType, "priority");
        renderObjectPrioritiesModal();
      })
    );

    row.appendChild(left);
    row.appendChild(right);
    body.appendChild(row);
  });
}

function solveBoard(){
  if(!window.ZMPathfinderSolver || typeof window.ZMPathfinderSolver.solveGrid !== "function"){
    setReport(t("solverMissing"));
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
    getCellObjectPriorityMultiplier
  });

  if(!result || !result.ok){
    resetSolve();
    setReport(result && result.message ? result.message : t("solverFailed"));
    renderPreview();
    return;
  }

  solveState = {
    redPath: result.redPath || [],
    bluePaths: result.bluePaths || [],
    shaftEntryDots: result.shaftEntryDots || [],
    shaftClusters: result.shaftClusters || [],
    attackPoints: result.attackPoints || [],
    solved: true,
    message: result.message || t("solvedMessage"),
    routeAnalysis: result.routeAnalysis || [],
    solverVersion: result.solverVersion || null,
    legacyEndMode: !!result.legacyEndMode,
    redBubbleCount: result.redBubbleCount ?? 0,
    firstBubbleTravelCost: result.firstBubbleTravelCost ?? null,
    effectiveTotal: result.effectiveTotal ?? null,
    redCost: result.redCost ?? null,
    blueCost: result.blueCost ?? null
  };

  setReport(result.message || t("solvedMessage"));
  renderRouteAudit(result.routeAnalysis || []);
  renderPreview();
}

window.changeLanguage = changeLanguage;
window.openSolverHelp = openSolverHelp;
window.closeSolverHelp = closeSolverHelp;
window.openRouteReportModal = openRouteReportModal;
window.closeRouteReportModal = closeRouteReportModal;
window.openObjectPrioritiesModal = openObjectPrioritiesModal;
window.closeObjectPrioritiesModal = closeObjectPrioritiesModal;
window.resetObjectPriorities = resetObjectPriorities;
window.handleEventTypeChange = handleEventTypeChange;
window.handleEventNameChange = handleEventNameChange;
window.handleEventMineChange = handleEventMineChange;
window.handleEventChamberChange = handleEventChamberChange;
window.loadSelectedMap = loadSelectedMap;
window.handleTitleInputChange = handleTitleInputChange;
window.setTool = setTool;
window.clearBoard = clearBoard;
window.solveBoard = solveBoard;
window.downloadPNG = downloadPNG;
window.loadSampleGrid = loadSampleGrid;
window.pasteFromClipboard = pasteFromClipboard;
window.renderPreview = renderPreview;

window.addEventListener("load", init);
