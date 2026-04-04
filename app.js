const MAX_ROWS = 20;
const MINED_ROWS = 15;
const COLS = 7;

const EVENT_TOTALS = {
  "Treasures in Ice": 1299,
  "Volcano Awakening": 1045,
  "Grand Canyon": 1039,
  "Excavations in the Sand": 1025,
  "Moon Odyssey": 1004,
  "Sweet Valley": 988,
  "Essence Cave": 457,
  "Treasure Trove of Gems": 281
};

const DIFFICULTY_MIN = 281;
const DIFFICULTY_MAX = 1299;

const LEGACY_EVENT_ORDER = [
  "Love Story",
  "Clover Festival",
  "Easter Egg Hunt",
  "4th of July",
  "Mystery Reef",
  "Teamwork Festival",
  "Halloween",
  "Fall Festival",
  "Winter Break"
];

const LEGACY_MINE_ORDER = [
  "Mine 1",
  "Mine 2",
  "Mine 3",
  "Mine 4",
  "Mine 5",
  "Mine 6",
  "The Deep"
];

const OBJECT_RENDER_MODE = "overlay";

let currentLanguage = localStorage.getItem("zm_language") || "en";

let grid = [];
let currentRowCount = MINED_ROWS;
let tool = "number";
let lastSelected = { r: 0, c: 0 };
let selectedMapPath = null;
let currentPreviewTitle = "Gate 1";

let currentMapContext = {
  eventType: null,
  eventName: null,
  chamberName: null,
  eventMine: null
};

let solveState = {
  redPath: [],
  bluePaths: [],
  shaftEntryDots: [],
  shaftClusters: [],
  attackPoints: [],
  solved: false,
  message: "No solve yet.",
  routeAnalysis: []
};

function t(key) {
  return window.ZM_TRANSLATIONS?.[currentLanguage]?.[key]
    || window.ZM_TRANSLATIONS?.en?.[key]
    || key;
}

function formatT(key, vars = {}) {
  let str = t(key);
  Object.keys(vars).forEach(k => {
    str = str.replaceAll(`{${k}}`, String(vars[k]));
  });
  return str;
}

function getEventTranslationKey(name) {
  const map = {
    "Treasures in Ice": "treasuresInIce",
    "Treasure Trove of Gems": "treasureTroveOfGems",
    "Essence Cave": "essenceCave",
    "Excavations in the Sand": "excavationsInTheSand",
    "Sweet Valley": "sweetValley",
    "Grand Canyon": "grandCanyon",
    "Volcano Awakening": "volcanoAwakening",
    "Moon Odyssey": "moonOdyssey",
    "Love Story": "loveStory",
    "Clover Festival": "cloverFestival",
    "Easter Egg Hunt": "easterEggHunt",
    "4th of July": "fourthOfJuly",
    "Mystery Reef": "mysteryReef",
    "Teamwork Festival": "teamworkFestival",
    "Halloween": "halloween",
    "Fall Festival": "fallFestival",
    "Winter Break": "winterBreak"
  };
  return map[name] || null;
}

function getMineTranslationKey(name) {
  const map = {
    "Mine 1": "mine1",
    "Mine 2": "mine2",
    "Mine 3": "mine3",
    "Mine 4": "mine4",
    "Mine 5": "mine5",
    "Mine 6": "mine6",
    "The Deep": "theDeep"
  };
  return map[name] || null;
}

function getChamberTranslationKey(name) {
  const map = {
    "Chamber 1": "chamber1",
    "Chamber 2": "chamber2",
    "Chamber 3": "chamber3",
    "Chamber 4": "chamber4",
    "Graveyard": "graveyard"
  };
  return map[name] || null;
}

function getDeepTranslationKey(name) {
  const map = {
    "DEEP 1": "deep1",
    "DEEP 2": "deep2",
    "DEEP 3": "deep3",
    "DEEP 4": "deep4"
  };
  return map[name] || null;
}

function getShaftTypeTranslationKey(name) {
  const map = {
    "Beryl": "beryl",
    "Quartz": "quartz",
    "Cobalt": "cobalt",
    "Amber": "amber",
    "Ametrine": "ametrine",
    "Barite": "barite",
    "Elendir": "elendir",
    "Lapis Lazuli": "lapisLazuli",
    "Aventurine": "aventurine",
    "Obsidian": "obsidian",
    "Peridot": "peridot"
  };
  return map[name] || null;
}

function translateEventName(name) {
  const key = getEventTranslationKey(name);
  return key ? t(key) : name;
}

function translateMineName(name) {
  const key = getMineTranslationKey(name);
  return key ? t(key) : name;
}

function translateChamberName(name) {
  const key = getChamberTranslationKey(name);
  return key ? t(key) : name;
}

function translateDeepName(name) {
  const key = getDeepTranslationKey(name);
  return key ? t(key) : name;
}

function translateShaftType(name) {
  const key = getShaftTypeTranslationKey(name);
  return key ? t(key) : name;
}

function changeLanguage(lang) {
  currentLanguage = lang || "en";
  localStorage.setItem("zm_language", currentLanguage);
  applyLanguage();
  populateEventTypeSelect();
  if (document.getElementById("eventTypeSelect")?.value) {
    refreshTranslatedLoaderSelections();
  }
  render();
  renderPreview();
  renderRouteAudit(solveState.routeAnalysis || []);
}

function refreshTranslatedLoaderSelections() {
  const eventType = document.getElementById("eventTypeSelect");
  const eventName = document.getElementById("eventNameSelect");
  const eventMine = document.getElementById("eventMineSelect");
  const eventChamber = document.getElementById("eventChamberSelect");

  const selectedType = eventType?.value || "";
  const selectedEvent = eventName?.value || "";
  const selectedMine = eventMine?.value || "";
  const selectedChamber = eventChamber?.value || "";

  if (eventType) {
    populateEventTypeSelect();
    eventType.value = selectedType;
  }

  if (selectedType) {
    handleEventTypeChange();
    if (eventName) eventName.value = selectedEvent;
  }

  if (selectedType && selectedEvent) {
    handleEventNameChange();
    if (eventMine) eventMine.value = selectedMine;
  }

  if (selectedType === "Legacy" && selectedEvent && selectedMine) {
    handleEventMineChange();
  }

  if (eventChamber) eventChamber.value = selectedChamber;
  if (selectedType && selectedEvent && selectedChamber) {
    handleEventChamberChange();
  }
}

function applyLanguage() {
  const languageSelect = document.getElementById("languageSelect");
  if (languageSelect) languageSelect.value = currentLanguage;

  const appTitle = document.getElementById("appTitle");
  if (appTitle) appTitle.textContent = t("appTitle");

  const languageLabel = document.getElementById("languageLabel");
  if (languageLabel) languageLabel.textContent = t("language");

  const loggedInBadge = document.getElementById("loggedInBadge");
  if (loggedInBadge && !loggedInBadge.dataset.customText) {
    loggedInBadge.textContent = t("notLoggedIn");
  }

  const addTesterBtn = document.getElementById("addTesterBtn");
  if (addTesterBtn) addTesterBtn.textContent = t("addBetaTester");

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.textContent = t("logout");

  const howInputGridTitle = document.getElementById("howInputGridTitle");
  if (howInputGridTitle) howInputGridTitle.textContent = t("howInputWorks");

  const titleLabel = document.getElementById("titleLabel");
  if (titleLabel) titleLabel.textContent = t("title");

  const gateTypeLabel = document.getElementById("gateTypeLabel");
  if (gateTypeLabel) gateTypeLabel.textContent = t("gateType");

  const gateType = document.getElementById("gateType");
  if (gateType && gateType.options.length >= 2) {
    gateType.options[0].textContent = t("standardGate");
    gateType.options[1].textContent = t("endGate");
  }

  const mapLoaderTitle = document.getElementById("mapLoaderTitle");
  if (mapLoaderTitle) mapLoaderTitle.textContent = t("mapLoader");

  const eventTypeLabel = document.getElementById("eventTypeLabel");
  if (eventTypeLabel) eventTypeLabel.textContent = t("eventType");

  const eventNameLabel = document.getElementById("eventNameLabel");
  if (eventNameLabel) eventNameLabel.textContent = t("eventName");

  const eventMineLabel = document.getElementById("eventMineLabel");
  if (eventMineLabel) eventMineLabel.textContent = t("eventMine");

  const eventChamberLabel = document.getElementById("eventChamberLabel");
  if (eventChamberLabel) eventChamberLabel.textContent = t("eventChamber");

  const loadMapBtn = document.getElementById("loadMapBtn");
  if (loadMapBtn) loadMapBtn.textContent = t("loadMap");

  const clearBoardBtn = document.getElementById("clearBoardBtn");
  if (clearBoardBtn) clearBoardBtn.textContent = t("clearBoard");

  const solveBtn = document.getElementById("solveBtn");
  if (solveBtn) solveBtn.textContent = t("solve");

  const downloadPngBtn = document.getElementById("downloadPngBtn");
  if (downloadPngBtn) downloadPngBtn.textContent = t("downloadPNG");

  const sampleGridBtn = document.getElementById("sampleGridBtn");
  if (sampleGridBtn) sampleGridBtn.textContent = t("sampleGrid");

  const pasteClipboardBtn = document.getElementById("pasteClipboardBtn");
  if (pasteClipboardBtn) pasteClipboardBtn.textContent = t("pasteFromClipboard");

  const solverHelpBtn = document.getElementById("solverHelpBtn");
  if (solverHelpBtn) solverHelpBtn.textContent = t("solverHelp");

  const routeReportBtn = document.getElementById("routeReportBtn");
  if (routeReportBtn) routeReportBtn.textContent = t("routeReport");

  const editableBoardTitle = document.getElementById("editableBoardTitle");
  if (editableBoardTitle) editableBoardTitle.textContent = t("editableBoard");

  const toolNumber = document.getElementById("tool-number");
  if (toolNumber) toolNumber.textContent = t("number");

  const toolBlock = document.getElementById("tool-block");
  if (toolBlock) toolBlock.textContent = t("block");

  const toolBubble = document.getElementById("tool-bubble");
  if (toolBubble) toolBubble.textContent = t("bubble");

  const toolShaft = document.getElementById("tool-shaft");
  if (toolShaft) toolShaft.textContent = t("shaft");

  const previewTitle = document.getElementById("previewTitle");
  if (previewTitle) previewTitle.textContent = t("preview");

  const betaTesterLoginTitle = document.getElementById("betaTesterLoginTitle");
  if (betaTesterLoginTitle) betaTesterLoginTitle.textContent = t("betaTesterLogin");

  const loginTesterId = document.getElementById("loginTesterId");
  if (loginTesterId) loginTesterId.placeholder = t("enterTesterId");

  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) loginBtn.textContent = t("login");

  const routeReportModalTitle = document.getElementById("routeReportModalTitle");
  if (routeReportModalTitle) routeReportModalTitle.textContent = t("routeReportTitle");

  const routeReportCloseBtn = document.getElementById("routeReportCloseBtn");
  if (routeReportCloseBtn) routeReportCloseBtn.textContent = t("close");

  const solverHelpModalTitle = document.getElementById("solverHelpModalTitle");
  if (solverHelpModalTitle) solverHelpModalTitle.textContent = t("solverHelp");

  loadHelpContent();
}

function setReport(msg){
  const reportEl = document.getElementById("report");
  if (!reportEl) return;
  reportEl.textContent = msg;
  updateDifficultyMeter();
}

function getRouteReportOverlay() {
  return document.getElementById("routeReportOverlay");
}

function getRouteReportBody() {
  return document.getElementById("routeReportBody");
}

function openRouteReportModal() {
  const overlay = getRouteReportOverlay();
  if (!overlay) return;
  overlay.classList.add("show");
}

function closeRouteReportModal() {
  const overlay = getRouteReportOverlay();
  if (!overlay) return;
  overlay.classList.remove("show");
}

function renderRouteAudit(routeAnalysis){
  const body = getRouteReportBody();
  if (!body) return;

  const shaftData = getCurrentChamberShaftData();
  const shaftClusters = getOrderedPhysicalShaftClusters();

  body.innerHTML = "";

  const summarySection = document.createElement("div");
  summarySection.className = "help-section";

  const summaryTitle = document.createElement("h3");
  summaryTitle.textContent = t("solveSummary");

  const summaryText = document.createElement("p");
  summaryText.innerHTML =
    `${t("solve")}: <b>${solveState.solved ? t("solvedYes") : t("solvedNo")}</b><br>` +
    `Red path cells: <b>${solveState.redPath.length}</b><br>` +
    `Blue route count: <b>${solveState.bluePaths.length}</b><br>` +
    `${t("physicalShaftClusters")}: <b>${shaftClusters.length}</b><br>` +
    `${t("shaftData")}: <b>${shaftData.length}</b>`;

  summarySection.appendChild(summaryTitle);
  summarySection.appendChild(summaryText);
  body.appendChild(summarySection);

  const shaftSection = document.createElement("div");
  shaftSection.className = "help-section";

  const shaftTitle = document.createElement("h3");
  shaftTitle.textContent = t("shaftData");

  const shaftText = document.createElement("p");

  if (!currentMapContext.eventType || !currentMapContext.eventName || !currentMapContext.chamberName) {
    shaftText.innerHTML = t("noChamberLoadedForShafts");
  } else if (!shaftData.length) {
    shaftText.innerHTML =
      `${t("resolvedShaftDataPath")}<br>` +
      `<b>${getCurrentShaftDataPathLabel()}</b><br><br>` +
      t("noShaftEntries");
  } else {
    const lines = shaftData.map((shaft, index) => {
      const shaftType = translateShaftType(shaft?.shaftType ?? "Unknown");
      const level = shaft?.level ?? "null";
      const auto = shaft?.auto ?? "null";
      return `${index + 1}. ${shaftType} | ${t("level")}: ${level} | ${t("auto")}: ${auto}`;
    });

    shaftText.innerHTML =
      `${t("resolvedShaftDataPath")}<br>` +
      `<b>${getCurrentShaftDataPathLabel()}</b><br><br>` +
      lines.map(line => line.replace(/</g, "&lt;").replace(/>/g, "&gt;")).join("<br>");
  }

  shaftSection.appendChild(shaftTitle);
  shaftSection.appendChild(shaftText);
  body.appendChild(shaftSection);

  const physicalSection = document.createElement("div");
  physicalSection.className = "help-section";

  const physicalTitle = document.createElement("h3");
  physicalTitle.textContent = t("physicalShaftClusters");

  const physicalText = document.createElement("p");
  if (!shaftClusters.length) {
    physicalText.innerHTML = t("noPhysicalShaftClusters");
  } else {
    const clusterLines = shaftClusters.map((cluster, index) => {
      const rows = cluster.map(([r]) => r);
      const cols = cluster.map(([, c]) => c);
      const minR = Math.min(...rows);
      const maxR = Math.max(...rows);
      const minC = Math.min(...cols);
      const maxC = Math.max(...cols);
      const labelLines = getShaftDisplayLines(index, shaftData);
      return `${index + 1}. ${t("rows")} ${minR}-${maxR}, ${t("cols")} ${minC}-${maxC}, ${t("cells")}: ${cluster.length} | ${t("label")}: ${labelLines.join(" / ")}`;
    });

    physicalText.innerHTML = clusterLines.join("<br>");
  }

  physicalSection.appendChild(physicalTitle);
  physicalSection.appendChild(physicalText);
  body.appendChild(physicalSection);

  const reportSection = document.createElement("div");
  reportSection.className = "help-section";

  const reportTitle = document.createElement("h3");
  reportTitle.textContent = t("routeAnalysis");

  reportSection.appendChild(reportTitle);

  if (!routeAnalysis || !routeAnalysis.length) {
    const emptyText = document.createElement("p");
    emptyText.innerHTML = t("noRouteAnalysis");
    reportSection.appendChild(emptyText);
    body.appendChild(reportSection);
    return;
  }

  const approved = routeAnalysis.filter(item => item.approved);
  const rejected = routeAnalysis.filter(item => !item.approved);

  function makeRouteBox(item, isApproved){
    const box = document.createElement("div");
    box.style.borderRadius = "16px";
    box.style.padding = "12px 14px";
    box.style.marginTop = "12px";
    box.style.border = `2px solid ${isApproved ? "rgba(34,197,94,0.55)" : "rgba(239,68,68,0.35)"}`;
    box.style.background = isApproved ? "rgba(34,197,94,0.14)" : "rgba(239,68,68,0.10)";
    box.style.color = "#fff";
    box.style.boxSizing = "border-box";

    const heading = document.createElement("div");
    heading.textContent = isApproved ? t("approvedRoute") : t("ignoredRoute");
    heading.style.fontWeight = "700";
    heading.style.fontSize = "18px";
    heading.style.marginBottom = "8px";

    const pathLine = document.createElement("div");
    pathLine.textContent = item.redPathValues;
    pathLine.style.fontWeight = "700";
    pathLine.style.fontSize = "16px";
    pathLine.style.lineHeight = "1.4";
    pathLine.style.wordBreak = "break-word";
    pathLine.style.marginBottom = "8px";

    const coords = document.createElement("div");
    coords.textContent = item.redPathCoords;
    coords.style.fontSize = "12px";
    coords.style.lineHeight = "1.45";
    coords.style.wordBreak = "break-word";
    coords.style.opacity = "0.92";
    coords.style.marginBottom = "8px";

    const meta = document.createElement("div");
    meta.style.fontSize = "14px";
    meta.style.lineHeight = "1.5";
    meta.innerHTML =
      `${t("mode")}: <b>${item.redMode}</b> | ${t("variant")}: <b>${item.redVariant}</b><br>` +
      `${t("effectiveTotal")}: <b>${item.effectiveTotal}</b>` +
      (isApproved ? "" : ` | ${t("worseBy")}: <b>${item.deltaFromBest}</b>`) + `<br>` +
      `${t("redCost")}: <b>${item.redCost}</b> | ${t("blueCost")}: <b>${item.blueCost}</b><br>` +
      `${t("unresolvedTargets")}: <b>${item.unresolvedTargets}</b><br>` +
      `${t("reason")}: <b>${item.reason}</b>`;

    box.appendChild(heading);
    box.appendChild(pathLine);
    box.appendChild(coords);
    box.appendChild(meta);

    return box;
  }

  approved.forEach(item => reportSection.appendChild(makeRouteBox(item, true)));
  rejected.forEach(item => reportSection.appendChild(makeRouteBox(item, false)));

  body.appendChild(reportSection);
}

function resetSolve(){
  solveState = {
    redPath: [],
    bluePaths: [],
    shaftEntryDots: [],
    shaftClusters: [],
    attackPoints: [],
    solved: false,
    message: "No solve yet.",
    routeAnalysis: []
  };
  renderRouteAudit([]);
}

function initGridData(){
  grid = Array.from({ length: MAX_ROWS }, () => Array(COLS).fill(""));
}

function isGraveyardValue(value){
  return String(value || "").trim().toLowerCase() === "graveyard";
}

function isMainDeepContext(){
  const selectedEventType = document.getElementById("eventTypeSelect")?.value || "";
  return currentMapContext.eventType === "MainDeep" || selectedEventType === "MainDeep";
}

function getRowsForContextFromSelection(){
  const chamber = document.getElementById("eventChamberSelect")?.value || "";
  return isGraveyardValue(chamber) ? MAX_ROWS : MINED_ROWS;
}

function getRowsForContextFromTitle(){
  const title = document.getElementById("titleInput")?.value || "";
  return title.toLowerCase().includes("graveyard") ? MAX_ROWS : MINED_ROWS;
}

function setBoardRowCount(nextRows){
  currentRowCount = nextRows === MAX_ROWS ? MAX_ROWS : MINED_ROWS;
  render();
  renderPreview();
}

function ensureBoardRowCountFromCurrentContext(){
  const rowsFromSelection = getRowsForContextFromSelection();
  const rowsFromTitle = getRowsForContextFromTitle();
  setBoardRowCount(rowsFromSelection === MAX_ROWS || rowsFromTitle === MAX_ROWS ? MAX_ROWS : MINED_ROWS);
}

function getVisibleGridSlice(){
  return grid.slice(0, currentRowCount).map(row => [...row]);
}

function runLoadedGridIntegrityCheck(gridToCheck, titleText = "Loaded Grid"){
  if (!window.ZMMapValidator || typeof window.ZMMapValidator.validateSingleLoadedGrid !== "function") {
    return { ok: true, errors: [] };
  }

  return window.ZMMapValidator.validateSingleLoadedGrid(gridToCheck, titleText);
}

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

function getCurrentChamberShaftData() {
  const type = currentMapContext.eventType;
  const eventName = currentMapContext.eventName;
  const chamberName = currentMapContext.chamberName;
  const mineName = currentMapContext.eventMine;

  if (!type || !eventName || !chamberName || !window.ZM_SHAFT_DATA) {
    return [];
  }

  if (type === "MainDeep") {
    return window.ZM_SHAFT_DATA?.MainDeep?.[eventName]?.[chamberName] || [];
  }

  if (type === "Main") {
    return window.ZM_SHAFT_DATA?.Main?.[eventName]?.[chamberName] || [];
  }

  if (type === "Legacy") {
    return window.ZM_SHAFT_DATA?.Legacy?.[eventName]?.[mineName]?.[chamberName] || [];
  }

  return [];
}

function getCurrentShaftDataPathLabel() {
  const type = currentMapContext.eventType || "(none)";
  const eventName = currentMapContext.eventName || "(none)";
  const chamberName = currentMapContext.chamberName || "(none)";
  const mineName = currentMapContext.eventMine || null;

  if (type === "Legacy") {
    return `ZM_SHAFT_DATA.Legacy["${eventName}"]["${mineName || "(none)"}"]["${chamberName}"]`;
  }

  if (type === "MainDeep") {
    return `ZM_SHAFT_DATA.MainDeep["${eventName}"]["${chamberName}"]`;
  }

  if (type === "Main") {
    return `ZM_SHAFT_DATA.Main["${eventName}"]["${chamberName}"]`;
  }

  return `No shaft-data path resolved`;
}

function getOrderedPhysicalShaftClusters() {
  if (solveState.shaftClusters && solveState.shaftClusters.length) {
    return solveState.shaftClusters;
  }
  return getShaftClustersFromGrid();
}

function getShaftDisplayLines(index, shaftData) {
  const shaft = shaftData[index];
  if (!shaft) return [t("shaft")];

  const lines = [];
  const shaftType = shaft.shaftType ? translateShaftType(String(shaft.shaftType)) : t("shaft");

  lines.push(shaftType);

  if (shaft.level !== null && shaft.level !== undefined && shaft.level !== "") {
    lines.push(String(shaft.level));
  }

  if (shaft.auto !== null && shaft.auto !== undefined && shaft.auto !== "") {
    lines.push(`Auto - ${shaft.auto}`);
  }

  return lines;
}

function drawCenteredMultilineText(ctx, lines, x, y, w, h) {
  if (!lines || !lines.length) return;

  const safeLines = lines.filter(Boolean);
  if (!safeLines.length) return;

  let fontSize = Math.max(12, Math.min(26, Math.floor(Math.min(w, h) / 4.2)));
  const maxWidth = w - 16;
  const maxHeight = h - 16;

  function fits(size) {
    ctx.font = `700 ${size}px Arial`;
    const lineHeight = Math.max(12, Math.floor(size * 1.1));
    const totalHeight = lineHeight * safeLines.length;

    if (totalHeight > maxHeight) return false;

    for (const line of safeLines) {
      if (ctx.measureText(line).width > maxWidth) return false;
    }
    return true;
  }

  while (fontSize > 10 && !fits(fontSize)) {
    fontSize -= 1;
  }

  ctx.font = `700 ${fontSize}px Arial`;
  ctx.fillStyle = "#111";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const lineHeight = Math.max(12, Math.floor(fontSize * 1.1));
  const totalHeight = lineHeight * safeLines.length;
  const startY = y + (h - totalHeight) / 2 + lineHeight / 2;

  safeLines.forEach((line, i) => {
    ctx.fillText(line, x + w / 2, startY + i * lineHeight);
  });
}

function getHtmlCodeFontSize(code){
  const len = String(code || "").length;
  if (len >= 6) return "8px";
  if (len === 5) return "9px";
  if (len === 4) return "10px";
  return "11px";
}

function getCanvasCodeFontSize(code){
  const len = String(code || "").length;
  if (len >= 6) return 8;
  if (len === 5) return 9;
  if (len === 4) return 10;
  return 12;
}

function getCanvasNumberFontSize(code){
  if (!code) return 28;
  const len = String(code).length;
  if (len >= 6) return 21;
  if (len === 5) return 22;
  if (len === 4) return 23;
  return 24;
}

function applyHtmlTileFill(cell, fill){
  if (!cell) return;

  cell.style.background = "";
  cell.style.color = "";

  if (!fill) return;

  if (typeof fill === "string") {
    cell.style.background = fill;
  } else if (fill.type === "dual" && Array.isArray(fill.colors) && fill.colors.length >= 2) {
    cell.style.background = `linear-gradient(135deg, ${fill.colors[0]} 50%, ${fill.colors[1]} 50%)`;
  }
}

function drawCanvasTileFill(ctx, x, y, cellSize, fill){
  if (!fill) return false;

  if (typeof fill === "string") {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, cellSize, cellSize);
    return true;
  }

  if (fill.type === "dual" && Array.isArray(fill.colors) && fill.colors.length >= 2) {
    const gradient = ctx.createLinearGradient(x, y, x + cellSize, y + cellSize);
    gradient.addColorStop(0, fill.colors[0]);
    gradient.addColorStop(0.499, fill.colors[0]);
    gradient.addColorStop(0.5, fill.colors[1]);
    gradient.addColorStop(1, fill.colors[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, cellSize, cellSize);
    return true;
  }

  return false;
}

function loadHelpContent(){
  if (window.ZM_HELP_TRANSLATED?.[currentLanguage]) {
    document.getElementById("shortHelpText").innerHTML = window.ZM_HELP_TRANSLATED[currentLanguage].shortHelp || "";
    document.getElementById("solverHelpBody").innerHTML = window.ZM_HELP_TRANSLATED[currentLanguage].modalHelp || "";
    return;
  }

  if (window.ZM_HELP) {
    document.getElementById("shortHelpText").innerHTML = window.ZM_HELP.shortHelp || "";
    document.getElementById("solverHelpBody").innerHTML = window.ZM_HELP.modalHelp || "";
  }
}

function openSolverHelp(){
  document.getElementById("solverHelpOverlay").classList.add("show");
}

function closeSolverHelp(){
  document.getElementById("solverHelpOverlay").classList.remove("show");
}

function hasUsableGridRecord(record){
  if (!record || typeof record !== "object") return false;
  if (!Array.isArray(record.grid) || !record.grid.length) return false;

  return record.grid.some(row =>
    Array.isArray(row) &&
    row.some(cell => cell !== "" && cell !== null && cell !== undefined)
  );
}

function hasAnyMainMapData(eventName){
  const event = window.ZM_MAP_DATA?.Main?.[eventName];
  if (!event || typeof event !== "object") return false;
  return Object.values(event).some(record => hasUsableGridRecord(record));
}

function hasAnyMainDeepData(eventName){
  const event = window.ZM_MAP_DATA?.MainDeep?.[eventName];
  if (!event || typeof event !== "object") return false;
  return Object.values(event).some(record => hasUsableGridRecord(record));
}

function hasAnyLegacyMineData(eventName, mineName){
  const mine = window.ZM_MAP_DATA?.Legacy?.[eventName]?.[mineName];
  if (!mine || typeof mine !== "object") return false;
  return Object.values(mine).some(record => hasUsableGridRecord(record));
}

function hasAnyLegacyEventData(eventName){
  const mines = window.ZM_MAP_DATA?.Legacy?.[eventName] || {};
  return Object.keys(mines).some(mineName => hasAnyLegacyMineData(eventName, mineName));
}

function mergeOrderedUnique(primary, secondary) {
  const out = [];
  const seen = new Set();

  [...primary, ...secondary].forEach(value => {
    if (!value || seen.has(value)) return;
    seen.add(value);
    out.push(value);
  });

  return out;
}

function getOrderedMainDeepNames() {
  const libraryNames = Object.keys(window.ZM_MAP_LIBRARY?.MainDeep || {});
  const dataNames = Object.keys(window.ZM_MAP_DATA?.MainDeep || {});
  return mergeOrderedUnique(
    libraryNames.filter(eventName => hasAnyMainDeepData(eventName)),
    dataNames.filter(eventName => hasAnyMainDeepData(eventName))
  );
}

function getOrderedMainNames() {
  const libraryNames = Object.keys(window.ZM_MAP_LIBRARY?.Main || {});
  const dataNames = Object.keys(window.ZM_MAP_DATA?.Main || {});
  return mergeOrderedUnique(
    libraryNames.filter(eventName => hasAnyMainMapData(eventName)),
    dataNames.filter(eventName => hasAnyMainMapData(eventName))
  );
}

function getOrderedLegacyNames() {
  const libraryNames = Object.keys(window.ZM_MAP_LIBRARY?.Legacy || {});
  const dataNames = Object.keys(window.ZM_MAP_DATA?.Legacy || {});

  return mergeOrderedUnique(
    LEGACY_EVENT_ORDER.filter(eventName => hasAnyLegacyEventData(eventName)),
    mergeOrderedUnique(
      libraryNames.filter(eventName => hasAnyLegacyEventData(eventName)),
      dataNames.filter(eventName => hasAnyLegacyEventData(eventName))
    )
  );
}

function getOrderedMainDeepChambers(eventName) {
  const libraryChambers = window.ZM_MAP_LIBRARY?.MainDeep?.[eventName] || [];
  const dataChambers = Object.keys(window.ZM_MAP_DATA?.MainDeep?.[eventName] || {});
  return mergeOrderedUnique(
    libraryChambers.filter(chamber => hasUsableGridRecord(window.ZM_MAP_DATA?.MainDeep?.[eventName]?.[chamber])),
    dataChambers.filter(chamber => hasUsableGridRecord(window.ZM_MAP_DATA?.MainDeep?.[eventName]?.[chamber]))
  );
}

function getOrderedMainChambers(eventName) {
  const libraryChambers = window.ZM_MAP_LIBRARY?.Main?.[eventName] || [];
  const dataChambers = Object.keys(window.ZM_MAP_DATA?.Main?.[eventName] || {});
  return mergeOrderedUnique(
    libraryChambers.filter(chamber => hasUsableGridRecord(window.ZM_MAP_DATA?.Main?.[eventName]?.[chamber])),
    dataChambers.filter(chamber => hasUsableGridRecord(window.ZM_MAP_DATA?.Main?.[eventName]?.[chamber]))
  );
}

function getOrderedLegacyMines(eventName) {
  const libraryMines = Object.keys(window.ZM_MAP_LIBRARY?.Legacy?.[eventName] || {});
  const dataMines = Object.keys(window.ZM_MAP_DATA?.Legacy?.[eventName] || {});

  return mergeOrderedUnique(
    LEGACY_MINE_ORDER.filter(mineName => hasAnyLegacyMineData(eventName, mineName)),
    mergeOrderedUnique(
      libraryMines.filter(mineName => hasAnyLegacyMineData(eventName, mineName)),
      dataMines.filter(mineName => hasAnyLegacyMineData(eventName, mineName))
    )
  );
}

function getOrderedLegacyChambers(eventName, eventMine) {
  const libraryChambers = window.ZM_MAP_LIBRARY?.Legacy?.[eventName]?.[eventMine] || [];
  const dataChambers = Object.keys(window.ZM_MAP_DATA?.Legacy?.[eventName]?.[eventMine] || {});
  return mergeOrderedUnique(
    libraryChambers.filter(chamber => hasUsableGridRecord(window.ZM_MAP_DATA?.Legacy?.[eventName]?.[eventMine]?.[chamber])),
    dataChambers.filter(chamber => hasUsableGridRecord(window.ZM_MAP_DATA?.Legacy?.[eventName]?.[eventMine]?.[chamber]))
  );
}

function populateEventTypeSelect(){
  const select = document.getElementById("eventTypeSelect");
  select.innerHTML = `<option value="">${t("selectEventType")}</option>`;

  if (!window.ZM_MAP_DATA) return;

  const mainDeepNames = getOrderedMainDeepNames();
  const mainNames = getOrderedMainNames();
  const legacyNames = getOrderedLegacyNames();

  if (mainDeepNames.length) {
    const option = document.createElement("option");
    option.value = "MainDeep";
    option.textContent = t("mainDeep");
    select.appendChild(option);
  }

  if (mainNames.length) {
    const option = document.createElement("option");
    option.value = "Main";
    option.textContent = t("mainEvents");
    select.appendChild(option);
  }

  if (legacyNames.length) {
    const option = document.createElement("option");
    option.value = "Legacy";
    option.textContent = t("legacyEvents");
    select.appendChild(option);
  }
}

function resetMapLoaderBelow(level){
  const eventNameField = document.getElementById("eventNameField");
  const eventMineField = document.getElementById("eventMineField");
  const eventChamberField = document.getElementById("eventChamberField");

  const eventNameSelect = document.getElementById("eventNameSelect");
  const eventMineSelect = document.getElementById("eventMineSelect");
  const eventChamberSelect = document.getElementById("eventChamberSelect");
  const loadMapBtn = document.getElementById("loadMapBtn");

  if (level <= 1) {
    eventNameSelect.innerHTML = `<option value="">${t("selectEventName")}</option>`;
    eventNameField.classList.add("hidden");
  }

  if (level <= 2) {
    eventMineSelect.innerHTML = `<option value="">${t("selectEventMine")}</option>`;
    eventMineField.classList.add("hidden");
  }

  if (level <= 3) {
    eventChamberSelect.innerHTML = `<option value="">${t("selectEventChamber")}</option>`;
    eventChamberField.classList.add("hidden");
  }

  selectedMapPath = null;
  loadMapBtn.classList.add("hidden");
  updateDifficultyMeter();
}

function handleEventTypeChange(){
  const eventType = document.getElementById("eventTypeSelect").value;
  const eventNameField = document.getElementById("eventNameField");
  const eventNameSelect = document.getElementById("eventNameSelect");

  resetMapLoaderBelow(1);
  if (!eventType || !window.ZM_MAP_DATA || !window.ZM_MAP_DATA[eventType]) {
    ensureBoardRowCountFromCurrentContext();
    updateDifficultyMeter();
    return;
  }

  let validNames = [];

  if (eventType === "MainDeep") {
    validNames = getOrderedMainDeepNames();
  } else if (eventType === "Main") {
    validNames = getOrderedMainNames();
  } else if (eventType === "Legacy") {
    validNames = getOrderedLegacyNames();
  }

  if (!validNames.length) {
    ensureBoardRowCountFromCurrentContext();
    updateDifficultyMeter();
    return;
  }

  eventNameField.classList.remove("hidden");

  validNames.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = eventType === "MainDeep" ? translateDeepName(name) : translateEventName(name);
    eventNameSelect.appendChild(option);
  });

  ensureBoardRowCountFromCurrentContext();
  updateDifficultyMeter();
}

function handleEventNameChange(){
  const eventType = document.getElementById("eventTypeSelect").value;
  const eventName = document.getElementById("eventNameSelect").value;

  const eventMineField = document.getElementById("eventMineField");
  const eventMineSelect = document.getElementById("eventMineSelect");
  const eventChamberField = document.getElementById("eventChamberField");
  const eventChamberSelect = document.getElementById("eventChamberSelect");

  resetMapLoaderBelow(2);
  if (!eventType || !eventName) {
    ensureBoardRowCountFromCurrentContext();
    updateDifficultyMeter();
    return;
  }

  if (eventType === "MainDeep") {
    const chambers = getOrderedMainDeepChambers(eventName);

    if (!chambers.length) {
      ensureBoardRowCountFromCurrentContext();
      updateDifficultyMeter();
      return;
    }

    eventChamberField.classList.remove("hidden");

    chambers.forEach(chamber => {
      const option = document.createElement("option");
      option.value = chamber;
      option.textContent = translateChamberName(chamber);
      eventChamberSelect.appendChild(option);
    });
  } else if (eventType === "Main") {
    const chambers = getOrderedMainChambers(eventName);

    if (!chambers.length) {
      ensureBoardRowCountFromCurrentContext();
      updateDifficultyMeter();
      return;
    }

    eventChamberField.classList.remove("hidden");

    chambers.forEach(chamber => {
      const option = document.createElement("option");
      option.value = chamber;
      option.textContent = translateChamberName(chamber);
      eventChamberSelect.appendChild(option);
    });
  } else if (eventType === "Legacy") {
    const validMines = getOrderedLegacyMines(eventName);

    if (!validMines.length) {
      ensureBoardRowCountFromCurrentContext();
      updateDifficultyMeter();
      return;
    }

    eventMineField.classList.remove("hidden");

    validMines.forEach(mineName => {
      const option = document.createElement("option");
      option.value = mineName;
      option.textContent = translateMineName(mineName);
      eventMineSelect.appendChild(option);
    });
  }

  ensureBoardRowCountFromCurrentContext();
  updateDifficultyMeter();
}

function handleEventMineChange(){
  const eventName = document.getElementById("eventNameSelect").value;
  const eventMine = document.getElementById("eventMineSelect").value;
  const eventChamberField = document.getElementById("eventChamberField");
  const eventChamberSelect = document.getElementById("eventChamberSelect");

  resetMapLoaderBelow(3);
  if (!eventName || !eventMine) {
    ensureBoardRowCountFromCurrentContext();
    updateDifficultyMeter();
    return;
  }

  const chambers = getOrderedLegacyChambers(eventName, eventMine);

  if (!chambers.length) {
    ensureBoardRowCountFromCurrentContext();
    updateDifficultyMeter();
    return;
  }

  eventChamberField.classList.remove("hidden");

  chambers.forEach(chamber => {
    const option = document.createElement("option");
    option.value = chamber;
    option.textContent = translateChamberName(chamber);
    eventChamberSelect.appendChild(option);
  });

  ensureBoardRowCountFromCurrentContext();
  updateDifficultyMeter();
}

function buildAutoTitle(){
  const eventType = document.getElementById("eventTypeSelect").value;
  const eventName = document.getElementById("eventNameSelect").value;
  const eventMine = document.getElementById("eventMineSelect").value;
  const eventChamber = document.getElementById("eventChamberSelect").value;

  if (!eventType || !eventName || !eventChamber) return null;

  const displayEvent = eventType === "MainDeep" ? translateDeepName(eventName) : translateEventName(eventName);
  const displayMine = translateMineName(eventMine);
  const displayChamber = translateChamberName(eventChamber);

  if (eventType === "MainDeep") {
    return `${displayEvent} - ${displayChamber}`;
  }

  if (eventType === "Main") {
    return `${displayEvent} - ${displayChamber}`;
  }

  if (eventType === "Legacy" && eventMine) {
    return `${displayEvent} - ${displayMine} - ${displayChamber}`;
  }

  return displayChamber;
}

function handleEventChamberChange(){
  const loadMapBtn = document.getElementById("loadMapBtn");
  const eventType = document.getElementById("eventTypeSelect").value;
  const eventName = document.getElementById("eventNameSelect").value;
  const eventMine = document.getElementById("eventMineSelect").value;
  const eventChamber = document.getElementById("eventChamberSelect").value;

  selectedMapPath = null;
  loadMapBtn.classList.add("hidden");

  if (!eventType || !eventName || !eventChamber) {
    ensureBoardRowCountFromCurrentContext();
    updateDifficultyMeter();
    return;
  }

  if (eventType === "MainDeep") {
    selectedMapPath = { eventType, eventName, eventChamber };
    loadMapBtn.classList.remove("hidden");
  }

  if (eventType === "Main") {
    selectedMapPath = { eventType, eventName, eventChamber };
    loadMapBtn.classList.remove("hidden");
  }

  if (eventType === "Legacy" && eventMine) {
    selectedMapPath = { eventType, eventName, eventMine, eventChamber };
    loadMapBtn.classList.remove("hidden");
  }

  const autoTitle = buildAutoTitle();
  if (autoTitle) {
    document.getElementById("titleInput").value = autoTitle;
    currentPreviewTitle = autoTitle;
  }

  ensureBoardRowCountFromCurrentContext();
  updateDifficultyMeter();
}

function handleTitleInputChange(){
  currentPreviewTitle = document.getElementById("titleInput").value || "Gate 1";
  ensureBoardRowCountFromCurrentContext();
  updateDifficultyMeter();
}

function getSelectedMapRecord(){
  if (!selectedMapPath || !window.ZM_MAP_DATA) return null;

  if (selectedMapPath.eventType === "MainDeep") {
    return window.ZM_MAP_DATA?.MainDeep?.[selectedMapPath.eventName]?.[selectedMapPath.eventChamber] || null;
  }

  if (selectedMapPath.eventType === "Main") {
    return window.ZM_MAP_DATA?.Main?.[selectedMapPath.eventName]?.[selectedMapPath.eventChamber] || null;
  }

  if (selectedMapPath.eventType === "Legacy") {
    return window.ZM_MAP_DATA?.Legacy?.[selectedMapPath.eventName]?.[selectedMapPath.eventMine]?.[selectedMapPath.eventChamber] || null;
  }

  return null;
}

function loadSelectedMap(){
  const mapRecord = getSelectedMapRecord();
  if (!mapRecord) {
    setReport(t("selectedMapMissing"));
    return;
  }

  clearBoard(false);

  currentMapContext = {
    eventType: selectedMapPath.eventType,
    eventName: selectedMapPath.eventName,
    chamberName: selectedMapPath.eventChamber,
    eventMine: selectedMapPath.eventMine || null
  };

  const autoTitle = buildAutoTitle();
  currentPreviewTitle = autoTitle || "Loaded Map";
  document.getElementById("titleInput").value = currentPreviewTitle;
  document.getElementById("gateType").value = mapRecord.gateType || "standard";

  const isGraveyard = isGraveyardValue(selectedMapPath?.eventChamber);
  setBoardRowCount(isGraveyard ? MAX_ROWS : MINED_ROWS);

  const sourceGrid = mapRecord.grid || [];

  const integrity = runLoadedGridIntegrityCheck(sourceGrid, currentPreviewTitle);
  if (!integrity.ok) {
    setReport(`${t("mapIntegrityFailed")} ${integrity.errors[0]}`);
    return;
  }

  for (let r = 0; r < Math.min(sourceGrid.length, MAX_ROWS); r++) {
    for (let c = 0; c < Math.min(sourceGrid[r].length, COLS); c++) {
      grid[r][c] = sourceGrid[r][c];
    }
  }

  resetSolve();
  render();
  renderPreview();
  setReport(`${t("loadedMap")} ${currentPreviewTitle}`);
  updateDifficultyMeter();
}

function setTool(nextTool){
  tool = nextTool;
  ["number","block","bubble","shaft"].forEach(id => {
    document.getElementById(`tool-${id}`).classList.remove("tool-active");
  });
  document.getElementById(`tool-${nextTool}`).classList.add("tool-active");
}

function render(){
  const gridEl = document.getElementById("grid");
  gridEl.style.gridTemplateColumns = `repeat(${COLS}, minmax(0, 1fr))`;
  gridEl.innerHTML = "";

  for(let r = 0; r < currentRowCount; r++){
    for(let c = 0; c < COLS; c++){
      const cell = document.createElement("div");
      const val = grid[r][c];
      const meta = getTileMeta(
        currentMapContext.eventType,
        currentMapContext.eventName,
        currentMapContext.chamberName,
        r,
        c
      );
      const visual = getObjectVisual(meta);

      cell.className = "cell";
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.onclick = () => clickCell(r, c);

      if(r === lastSelected.r && c === lastSelected.c){
        cell.classList.add("selected");
      }

      if(val === "X"){
        cell.classList.add("block");
      } else if(val === "B"){
        cell.classList.add("bubble");
        cell.textContent = "B";
      } else if(val === "S"){
        cell.classList.add("shaft");
        cell.textContent = "S";
      } else if(typeof val === "number"){
        applyHtmlTileFill(cell, visual.fill);

        if (OBJECT_RENDER_MODE === "object_only" && visual.code) {
          cell.textContent = visual.code;
        } else {
          const wrapper = document.createElement("div");
          wrapper.className = "cell-wrapper";
          wrapper.style.display = "flex";
          wrapper.style.flexDirection = "column";
          wrapper.style.alignItems = "center";
          wrapper.style.justifyContent = "center";
          wrapper.style.height = "100%";
          wrapper.style.width = "100%";

          const number = document.createElement("div");
          number.className = "cell-number";
          number.textContent = String(val);
          number.style.fontWeight = "700";
          number.style.lineHeight = "1";
          wrapper.appendChild(number);

          if (visual.code) {
            const code = document.createElement("div");
            code.className = "cell-code";
            code.textContent = visual.code;
            code.style.fontSize = getHtmlCodeFontSize(visual.code);
            code.style.fontWeight = "700";
            code.style.lineHeight = "1";
            code.style.marginTop = "2px";
            wrapper.appendChild(code);
          }

          cell.appendChild(wrapper);
        }
      }

      gridEl.appendChild(cell);
    }
  }
}

function clickCell(r, c){
  if (r >= currentRowCount) return;
  lastSelected = { r, c };

  if(tool === "number"){
    activateInlineNumberEditor(r, c);
    return;
  }

  if(tool === "block"){
    grid[r][c] = grid[r][c] === "X" ? "" : "X";
  } else if(tool === "bubble"){
    grid[r][c] = grid[r][c] === "B" ? "" : "B";
  } else if(tool === "shaft"){
    const removing = grid[r][c] === "S";
    for(let dr = 0; dr < 3; dr++){
      for(let dc = 0; dc < 2; dc++){
        const rr = r + dr;
        const cc = c + dc;
        if(rr < currentRowCount && grid[rr] && grid[rr][cc] !== undefined){
          grid[rr][cc] = removing ? "" : "S";
        }
      }
    }
  }

  resetSolve();
  render();
  renderPreview();
}

function activateInlineNumberEditor(r, c){
  render();

  const target = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
  if(!target) return;

  target.innerHTML = "";
  const input = document.createElement("input");
  input.type = "number";
  input.min = "1";
  input.className = "cell-editor";
  input.value = typeof grid[r][c] === "number" ? String(grid[r][c]) : "";
  target.appendChild(input);
  input.focus();
  input.select();

  input.onblur = () => {
    const raw = input.value.trim();
    if(raw === ""){
      grid[r][c] = "";
    } else if(!isNaN(raw) && Number(raw) > 0){
      grid[r][c] = Number(raw);
    }
    resetSolve();
    render();
    renderPreview();
  };

  input.onkeydown = (e) => {
    if(e.key === "Enter") input.blur();
  };
}

function parseClipboard(text) {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .filter(row => row.length > 0)
    .map(row => row.split("\t"));
}

async function pasteFromClipboard(){
  try{
    const text = await navigator.clipboard.readText();
    applyText(text);
  } catch(e){
    setReport(t("clipboardBlocked"));
  }
}

function applyText(text){
  if(!text) return;

  const data = parseClipboard(text);
  const startR = lastSelected.r;
  const startC = lastSelected.c;

  for(let ri = 0; ri < data.length; ri++){
    for(let ci = 0; ci < data[ri].length; ci++){
      const r = startR + ri;
      const c = startC + ci;
      if(r >= currentRowCount) continue;
      if(!grid[r] || grid[r][c] === undefined) continue;

      const raw = data[ri][ci];
      const val = String(raw ?? "");

      if(val === ""){
        continue;
      } else if(!isNaN(val)){
        grid[r][c] = Number(val);
      } else if(val.toUpperCase() === "X"){
        grid[r][c] = "X";
      } else if(val.toUpperCase() === "B"){
        grid[r][c] = "B";
      } else if(val.toUpperCase() === "S" || val.toUpperCase() === "SHAFT"){
        for(let dr = 0; dr < 3; dr++){
          for(let dc = 0; dc < 2; dc++){
            const rr = r + dr;
            const cc = c + dc;
            if(rr < currentRowCount && grid[rr] && grid[rr][cc] !== undefined){
              grid[rr][cc] = "S";
            }
          }
        }
      }
    }
  }

  resetSolve();
  render();
  renderPreview();
  setReport(formatT("pastedIntoBoard", { row: startR + 1, col: startC + 1 }));
}

function clearBoard(updateReport = true){
  for(let r = 0; r < MAX_ROWS; r++){
    for(let c = 0; c < COLS; c++){
      grid[r][c] = "";
    }
  }
  currentRowCount = MINED_ROWS;
  currentPreviewTitle = document.getElementById("titleInput")?.value || "Gate 1";
  currentMapContext = {
    eventType: null,
    eventName: null,
    chamberName: null,
    eventMine: null
  };
  resetSolve();
  render();
  renderPreview();
  if (updateReport) setReport(t("boardCleared"));
  updateDifficultyMeter();
}

function loadSampleGrid(){
  clearBoard(false);
  document.getElementById("gateType").value = "standard";
  document.getElementById("titleInput").value = "Gate 1";
  currentPreviewTitle = "Gate 1";
  currentRowCount = MINED_ROWS;

  const sample = [
    [8,9,11,9,12,8,9],
    [10,"X",8,"X",7,11,7],
    [8,7,9,6,9,6,"X"],
    ["X",8,6,8,"B","S","S"],
    ["X",6,7,6,5,"S","S"],
    ["X",5,4,5,"X","S","S"],
    ["X",4,5,4,5,4,6],
    ["S","S",4,5,4,"X",5],
    ["S","S",3,4,3,5,4],
    ["S","S",2,"",2,4,3],
    [1,2,"","","",3,""]
  ];

  for(let r = 0; r < sample.length; r++){
    for(let c = 0; c < COLS; c++){
      grid[r][c] = sample[r][c] === undefined ? "" : sample[r][c];
    }
  }

  resetSolve();
  render();
  renderPreview();
  setReport(t("sampleLoaded"));
  updateDifficultyMeter();
}

function solveBoard(){
  if(!window.ZMPathfinderSolver || typeof window.ZMPathfinderSolver.solveGrid !== "function"){
    setReport(t("solverMissing"));
    return;
  }

  const result = window.ZMPathfinderSolver.solveGrid({
    grid: getVisibleGridSlice(),
    gateType: document.getElementById("gateType").value
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
    routeAnalysis: result.routeAnalysis || []
  };

  setReport(t("solvedMessage"));
  renderRouteAudit(result.routeAnalysis || []);
  renderPreview();
}

function renderPreview(){
  const canvas = document.getElementById("previewCanvas");
  const ctx = canvas.getContext("2d");

  const cell = 86;
  const pad = 22;
  const topPad = 145;

  const usedRows = [];
  for(let r = 0; r < currentRowCount; r++){
    for(let c = 0; c < COLS; c++){
      if(grid[r][c] !== ""){
        usedRows.push(r);
        break;
      }
    }
  }

  const minRow = 0;
  const maxFilled = usedRows.length ? Math.max(...usedRows) : Math.max(4, currentRowCount - 1);
  const maxRow = Math.max(currentRowCount - 1, maxFilled);
  const visibleRows = maxRow - minRow + 1;

  canvas.width = pad * 2 + cell * COLS;
  canvas.height = topPad + visibleRows * cell + 120;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const drawEverything = () => {
    const logo = new Image();
    logo.onload = () => {
      const logoMaxW = 180;
      const logoMaxH = 110;
      const logoRatio = Math.min(logoMaxW / logo.width, logoMaxH / logo.height, 1);
      const logoW = logo.width * logoRatio;
      const logoH = logo.height * logoRatio;

      const headerY = 12;
      const headerH = 118;

      const logoBoxX = 26;
      const logoBoxY = headerY;
      const logoBoxW = 220;
      const logoBoxH = headerH;

      const titleBoxX = logoBoxX + logoBoxW + 16;
      const titleBoxY = headerY;
      const titleBoxW = canvas.width - titleBoxX - 26;
      const titleBoxH = headerH;

      ctx.drawImage(
        logo,
        logoBoxX + (logoBoxW - logoW) / 2,
        logoBoxY + (logoBoxH - logoH) / 2,
        logoW,
        logoH
      );

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(titleBoxX, titleBoxY, titleBoxW, titleBoxH);
      ctx.strokeStyle = "#171b2e";
      ctx.lineWidth = 2;
      ctx.strokeRect(titleBoxX, titleBoxY, titleBoxW, titleBoxH);

      const rawTitle = String(
        currentPreviewTitle || document.getElementById("titleInput").value || "Gate"
      ).trim();

      const parts = rawTitle.split(" - ").map(s => s.trim()).filter(Boolean);

      let line1 = rawTitle.toUpperCase();
      let line2 = "";

      if (parts.length >= 2) {
        line1 = parts.slice(0, -1).join(" - ").toUpperCase();
        line2 = parts[parts.length - 1].toUpperCase();
      }

      ctx.fillStyle = "#111";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.font = "700 22px Arial";
      ctx.fillText(line1, titleBoxX + titleBoxW / 2, titleBoxY + 42);

      if (line2) {
        ctx.font = "700 20px Arial";
        ctx.fillText(line2, titleBoxX + titleBoxW / 2, titleBoxY + 78);
      }

      drawBoardAndPaths(ctx, cell, pad, topPad, minRow, maxRow);
    };
    logo.src = "file_00000000e35071fda5e92d9996ac3621.png";
  };

  drawEverything();
}

function drawBoardAndPaths(ctx, cell, pad, topPad, minRow, maxRow){
  const rowOffset = minRow;

  for(let r = minRow; r <= maxRow; r++){
    for(let c = 0; c < COLS; c++){
      const x = pad + c * cell;
      const y = topPad + (r - rowOffset) * cell;
      const val = grid[r][c];
      const meta = getTileMeta(
        currentMapContext.eventType,
        currentMapContext.eventName,
        currentMapContext.chamberName,
        r,
        c
      );
      const visual = getObjectVisual(meta);

      if(val === "S") continue;

      let usedCustomFill = false;

      if (typeof val === "number" && visual.fill) {
        usedCustomFill = drawCanvasTileFill(ctx, x, y, cell, visual.fill);
      }

      if (!usedCustomFill) {
        if(val === "X"){
          ctx.fillStyle = "#000";
        } else if(val === "B"){
          ctx.fillStyle = "#8fd3f7";
        } else {
          ctx.fillStyle = "#ececef";
        }
        ctx.fillRect(x, y, cell, cell);
      }

      ctx.strokeStyle = "#171b2e";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, cell, cell);

      if(val === "B"){
        ctx.fillStyle = "#111";
        ctx.font = "700 28px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("B", x + cell/2, y + cell/2);
      } else if(typeof val === "number"){
        ctx.fillStyle = "#111";
        ctx.textAlign = "center";

        if (OBJECT_RENDER_MODE === "object_only" && visual.code) {
          ctx.font = "700 22px Arial";
          ctx.textBaseline = "middle";
          ctx.fillText(visual.code, x + cell/2, y + cell/2);
        } else {
          if (visual.code) {
            ctx.font = `700 ${getCanvasNumberFontSize(visual.code)}px Arial`;
            ctx.textBaseline = "middle";
            ctx.fillText(String(val), x + cell/2, y + cell/2 - 10);

            ctx.font = `700 ${getCanvasCodeFontSize(visual.code)}px Arial`;
            ctx.fillText(visual.code, x + cell/2, y + cell/2 + 18);
          } else {
            ctx.font = "700 28px Arial";
            ctx.textBaseline = "middle";
            ctx.fillText(String(val), x + cell/2, y + cell/2);
          }
        }
      }
    }
  }

  const shafts = getOrderedPhysicalShaftClusters();
  const shaftData = getCurrentChamberShaftData();

  for(let i = 0; i < shafts.length; i++){
    const cluster = shafts[i];
    const rows = cluster.map(v => v[0]);
    const cols = cluster.map(v => v[1]);
    const minR = Math.min(...rows);
    const maxR = Math.max(...rows);
    const minC = Math.min(...cols);
    const maxC = Math.max(...cols);

    if(maxR < minRow || minR > maxRow) continue;

    const x = pad + minC * cell;
    const y = topPad + (minR - rowOffset) * cell;
    const w = (maxC - minC + 1) * cell;
    const h = (maxR - minR + 1) * cell;

    ctx.fillStyle = "#98f44d";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#171b2e";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    drawCenteredMultilineText(ctx, getShaftDisplayLines(i, shaftData), x, y, w, h);
  }

  for(const path of solveState.bluePaths){
    drawPath(ctx, path, "#2563eb", 10, cell, pad, topPad, rowOffset);
  }
  drawPath(ctx, solveState.redPath, "#ef4444", 12, cell, pad, topPad, rowOffset);

  const ly = ctx.canvas.height - 35;

  ctx.lineCap = "round";
  ctx.lineWidth = 16;
  ctx.strokeStyle = "#000";
  ctx.beginPath();
  ctx.moveTo(36, ly);
  ctx.lineTo(112, ly);
  ctx.stroke();

  ctx.lineWidth = 10;
  ctx.strokeStyle = "#ef4444";
  ctx.beginPath();
  ctx.moveTo(36, ly);
  ctx.lineTo(112, ly);
  ctx.stroke();

  ctx.fillStyle = "#111";
  ctx.font = "700 18px Arial";
  ctx.textAlign = "left";
  ctx.fillText(t("strongestRed"), 126, ly + 6);

  ctx.lineWidth = 16;
  ctx.strokeStyle = "#000";
  ctx.beginPath();
  ctx.moveTo(370, ly);
  ctx.lineTo(446, ly);
  ctx.stroke();

  ctx.lineWidth = 10;
  ctx.strokeStyle = "#2563eb";
  ctx.beginPath();
  ctx.moveTo(370, ly);
  ctx.lineTo(446, ly);
  ctx.stroke();

  ctx.fillStyle = "#111";
  ctx.fillText(t("strongestBlue"), 460, ly + 6);
}

function getShaftClustersFromGrid(){
  const seen = new Set();
  const clusters = [];

  for(let r = 0; r < currentRowCount; r++){
    for(let c = 0; c < COLS; c++){
      if(grid[r][c] !== "S") continue;
      const key = `${r},${c}`;
      if(seen.has(key)) continue;

      const stack = [[r,c]];
      const cluster = [];

      while(stack.length){
        const [rr,cc] = stack.pop();
        const k = `${rr},${cc}`;
        if(rr < 0 || cc < 0 || rr >= currentRowCount || cc >= COLS) continue;
        if(grid[rr][cc] !== "S" || seen.has(k)) continue;
        seen.add(k);
        cluster.push([rr,cc]);
        stack.push([rr+1,cc],[rr-1,cc],[rr,cc+1],[rr,cc-1]);
      }

      clusters.push(cluster);
    }
  }

  clusters.sort((a, b) => {
    const aBottom = Math.max(...a.map(([r]) => r));
    const bBottom = Math.max(...b.map(([r]) => r));
    if (aBottom !== bBottom) return bBottom - aBottom;
    const aTop = Math.min(...a.map(([r]) => r));
    const bTop = Math.min(...b.map(([r]) => r));
    return bTop - aTop;
  });

  return clusters;
}

function drawPath(ctx, path, color, width, cell, pad, topPad, rowOffset){
  if(!path || path.length < 1) return;

  const isRed = color === "#ef4444";
  const isBlue = color === "#2563eb";

  function center(pt){
    return {
      x: pad + pt[1] * cell + cell / 2,
      y: topPad + (pt[0] - rowOffset) * cell + cell / 2
    };
  }

  function manhattan(a, b){
    return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
  }

  function isInBounds(r, c){
    return r >= 0 && c >= 0 && r < currentRowCount && c < COLS;
  }

  function getCellValue(r, c){
    if (!isInBounds(r, c)) return null;
    return grid[r]?.[c];
  }

  function getBoundaryTouchPoint(fromPt, toPt){
    if (!fromPt || !toPt) return null;

    const [fr, fc] = fromPt;
    const [tr, tc] = toPt;

    const dx = tc - fc;
    const dy = tr - fr;

    if (Math.abs(dx) + Math.abs(dy) !== 1) return null;

    const fromCenter = center(fromPt);

    if (dx === 1) return { x: fromCenter.x + cell / 2, y: fromCenter.y };
    if (dx === -1) return { x: fromCenter.x - cell / 2, y: fromCenter.y };
    if (dy === 1) return { x: fromCenter.x, y: fromCenter.y + cell / 2 };
    if (dy === -1) return { x: fromCenter.x, y: fromCenter.y - cell / 2 };

    return null;
  }

  function getBlueEndpointPoint(){
    if (path.length === 1) return center(path[0]);

    const last = path[path.length - 1];
    const prev = path[path.length - 2];

    const dirs = [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0]
    ];

    for (const [dr, dc] of dirs) {
      const nr = last[0] + dr;
      const nc = last[1] + dc;

      if (prev && nr === prev[0] && nc === prev[1]) continue;
      if (getCellValue(nr, nc) !== "S") continue;

      const touch = getBoundaryTouchPoint(last, [nr, nc]);
      if (touch) return touch;
    }

    return center(last);
  }

  function getRedEndpointPoint(){
    if (path.length === 1) return center(path[0]);

    const last = path[path.length - 1];
    const attackPoints = Array.isArray(solveState.attackPoints) ? solveState.attackPoints : [];

    if (!attackPoints.length) return center(last);

    const adjacentAttackPoints = attackPoints.filter(pt => manhattan(last, pt) === 1);

    if (adjacentAttackPoints.length) {
      const touch = getBoundaryTouchPoint(last, adjacentAttackPoints[0]);
      if (touch) return touch;
    }

    return center(last);
  }

  const points = path.map(center);
  const endpoint = isBlue
    ? getBlueEndpointPoint()
    : isRed
      ? getRedEndpointPoint()
      : center(path[path.length - 1]);

  const lastPoint = points[points.length - 1];

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.lineWidth = width + 5;
  ctx.strokeStyle = "#000";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for(let i = 1; i < points.length; i++){
    ctx.lineTo(points[i].x, points[i].y);
  }

  if (endpoint.x !== lastPoint.x || endpoint.y !== lastPoint.y) {
    ctx.lineTo(endpoint.x, endpoint.y);
  }

  ctx.stroke();

  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for(let i = 1; i < points.length; i++){
    ctx.lineTo(points[i].x, points[i].y);
  }

  if (endpoint.x !== lastPoint.x || endpoint.y !== lastPoint.y) {
    ctx.lineTo(endpoint.x, endpoint.y);
  }

  ctx.stroke();
}

function downloadPNG(){
  renderPreview();
  setTimeout(() => {
    const canvas = document.getElementById("previewCanvas");
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(currentPreviewTitle || document.getElementById("titleInput").value || "zm-pathfinder").replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  }, 160);
}

function clampRatio(value){
  if (DIFFICULTY_MAX === DIFFICULTY_MIN) return 0;
  const ratio = (value - DIFFICULTY_MIN) / (DIFFICULTY_MAX - DIFFICULTY_MIN);
  return Math.max(0, Math.min(1, ratio));
}

function getDifficultyLabel(ratio){
  if (ratio <= 0.125) return "VERY EASY";
  if (ratio <= 0.25) return "EASY";
  if (ratio <= 0.375) return "MILD";
  if (ratio <= 0.50) return "MODERATE";
  if (ratio <= 0.625) return "CHALLENGING";
  if (ratio <= 0.75) return "HARD";
  if (ratio <= 0.875) return "EXTREME";
  return "BRUTAL";
}

function getCurrentEventName(){
  if (isMainDeepContext()) return null;

  const selectedEventName = document.getElementById("eventNameSelect")?.value || "";
  if (selectedEventName && EVENT_TOTALS[selectedEventName] !== undefined) {
    return selectedEventName;
  }

  const title = String(currentPreviewTitle || document.getElementById("titleInput")?.value || "").trim();
  if (!title) return null;

  const names = Object.keys(EVENT_TOTALS).sort((a, b) => b.length - a.length);
  for (const name of names) {
    const translated = translateEventName(name);
    if (title === name || title.startsWith(name + " -") || title === translated || title.startsWith(translated + " -")) {
      return name;
    }
  }

  return null;
}

function ensureDifficultyMeter(){
  let meter = document.getElementById("difficultyMeter");
  if (meter) return meter;

  const btnGrid = document.querySelector(".btn-grid");
  const report = document.getElementById("report");
  if (!btnGrid || !report || !report.parentNode) return null;

  meter = document.createElement("div");
  meter.id = "difficultyMeter";
  meter.style.display = "none";
  meter.style.width = "100%";
  meter.style.boxSizing = "border-box";
  meter.style.borderRadius = "30px";
  meter.style.border = "2px solid rgba(71,87,162,0.45)";
  meter.style.background = "rgba(10,20,55,0.9)";
  meter.style.padding = "14px 18px";
  meter.style.minHeight = "76px";
  meter.style.alignItems = "center";
  meter.style.gap = "14px";
  meter.style.marginTop = "14px";

  const label = document.createElement("div");
  label.id = "difficultyMeterLabel";
  label.style.flex = "0 0 auto";
  label.style.color = "#ffffff";
  label.style.fontFamily = "Arial, sans-serif";
  label.style.fontWeight = "700";
  label.style.fontSize = "22px";
  label.style.letterSpacing = "0.5px";
  label.style.lineHeight = "1";
  label.textContent = "HARD";

  const barWrap = document.createElement("div");
  barWrap.style.flex = "1 1 auto";
  barWrap.style.display = "flex";
  barWrap.style.alignItems = "center";
  barWrap.style.minWidth = "0";

  const bar = document.createElement("div");
  bar.id = "difficultyMeterBar";
  bar.style.position = "relative";
  bar.style.width = "100%";
  bar.style.height = "18px";
  bar.style.borderRadius = "999px";
  bar.style.overflow = "hidden";
  bar.style.border = "2px solid rgba(255,255,255,0.18)";
  bar.style.background = "linear-gradient(90deg, #ffe2e2 0%, #ffc6c6 14%, #ffabab 28%, #ff8f8f 42%, #ff6f6f 56%, #ff4949 70%, #ef1d1d 84%, #ff2400 100%)";
  bar.style.boxShadow = "inset 0 0 0 1px rgba(0,0,0,0.15)";

  const marker = document.createElement("div");
  marker.id = "difficultyMeterMarker";
  marker.style.position = "absolute";
  marker.style.top = "50%";
  marker.style.left = "0%";
  marker.style.transform = "translate(-50%, -50%)";
  marker.style.width = "12px";
  marker.style.height = "12px";
  marker.style.borderRadius = "50%";
  marker.style.background = "#ffffff";
  marker.style.border = "3px solid #0a1737";
  marker.style.boxShadow = "0 0 0 2px rgba(255,255,255,0.2)";

  bar.appendChild(marker);
  barWrap.appendChild(bar);
  meter.appendChild(label);
  meter.appendChild(barWrap);

  report.parentNode.insertBefore(meter, report);

  return meter;
}

function updateDifficultyMeter(){
  const meter = ensureDifficultyMeter();
  const report = document.getElementById("report");
  if (!meter || !report) return;

  if (isMainDeepContext()) {
    meter.style.display = "none";
    report.style.display = "block";
    return;
  }

  const eventName = getCurrentEventName();
  if (!eventName || EVENT_TOTALS[eventName] === undefined) {
    meter.style.display = "none";
    report.style.display = "block";
    return;
  }

  const value = EVENT_TOTALS[eventName];
  const ratio = clampRatio(value);
  const label = getDifficultyLabel(ratio);

  const labelEl = document.getElementById("difficultyMeterLabel");
  const markerEl = document.getElementById("difficultyMeterMarker");

  if (labelEl) {
    labelEl.textContent = label;
  }

  if (markerEl) {
    markerEl.style.left = `${ratio * 100}%`;
  }

  report.style.display = "none";
  meter.style.display = "flex";
}

function init(){
  initGridData();
  currentPreviewTitle = document.getElementById("titleInput").value || "Gate 1";
  loadHelpContent();
  populateEventTypeSelect();
  applyLanguage();

  const editorHelp = document.querySelector(".sticky-tools .help");
  if (editorHelp) {
    editorHelp.style.display = "none";
  }

  if (!window.ZM_MAP_DATA) {
    setReport(t("zmMapDataNotLoaded"));
  } else if (!window.ZMMapValidator) {
    setReport(t("validatorNotLoaded"));
  } else {
    const allErrors = window.ZMMapValidator.validateMainMapData(window.ZM_MAP_DATA);
    if (allErrors.length) {
      console.error("Map data integrity errors:", allErrors);
      setReport(`${t("mapIntegrityWarning")} ${allErrors[0]}`);
    } else {
      setReport(t("ready"));
    }
  }

  render();
  renderPreview();
  initAccessControl();
  updateUserUI();
  ensureDifficultyMeter();
  updateDifficultyMeter();
  renderRouteAudit([]);
}

window.changeLanguage = changeLanguage;
window.openSolverHelp = openSolverHelp;
window.closeSolverHelp = closeSolverHelp;
window.openRouteReportModal = openRouteReportModal;
window.closeRouteReportModal = closeRouteReportModal;
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
