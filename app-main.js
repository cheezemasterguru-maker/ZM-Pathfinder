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
  routeAnalysis: [],
  solverVersion: null,
  legacyEndMode: false,
  redBubbleCount: 0,
  firstBubbleTravelCost: null,
  effectiveTotal: null,
  redCost: null,
  blueCost: null
};

/* ------------------------------
   Local painter/meta overrides
------------------------------ */

let selectedPainterObject = "plain";
let boardMetaOverrides = {};
let originalGetTileMetaRef = null;

function getBoardMetaKey(eventType, eventName, chamberName, r, c) {
  return [
    eventType || "",
    eventName || "",
    chamberName || "",
    String(r),
    String(c)
  ].join("||");
}

function parsePainterObjectValue(value) {
  const raw = String(value || "plain").trim().toLowerCase();

  if (!raw || raw === "plain") {
    return null;
  }

  if (raw.startsWith("chest:")) {
    const subtype = raw.split(":")[1] || "";
    return {
      object: "chest",
      subtype
    };
  }

  return {
    object: raw
  };
}

function installTileMetaOverrideLayer() {
  if (typeof window.getTileMeta !== "function") return;
  if (window.getTileMeta.__zmPainterWrapped) return;

  originalGetTileMetaRef = window.getTileMeta;

  const wrapped = function(eventType, eventName, chamberName, r, c) {
    const baseMeta = originalGetTileMetaRef
      ? originalGetTileMetaRef(eventType, eventName, chamberName, r, c)
      : null;

    const key = getBoardMetaKey(eventType, eventName, chamberName, r, c);
    const override = boardMetaOverrides[key];

    if (override === undefined) {
      return baseMeta;
    }

    if (override === null) {
      return null;
    }

    return override;
  };

  wrapped.__zmPainterWrapped = true;
  window.getTileMeta = wrapped;
}

function clearBoardMetaOverrides() {
  boardMetaOverrides = {};
}

function applyPainterMetaToSelectedTile() {
  const r = lastSelected?.r ?? 0;
  const c = lastSelected?.c ?? 0;

  if (r < 0 || c < 0 || r >= currentRowCount || c >= COLS) return;

  const key = getBoardMetaKey(
    currentMapContext.eventType,
    currentMapContext.eventName,
    currentMapContext.chamberName,
    r,
    c
  );

  const parsed = parsePainterObjectValue(selectedPainterObject);

  boardMetaOverrides[key] = parsed;

  if (typeof scanActiveObjectTypes === "function") {
    scanActiveObjectTypes();
  }

  if (typeof render === "function") render();
  if (typeof renderPreview === "function") renderPreview();
}

function clearSelectedTileMeta() {
  const r = lastSelected?.r ?? 0;
  const c = lastSelected?.c ?? 0;

  if (r < 0 || c < 0 || r >= currentRowCount || c >= COLS) return;

  const key = getBoardMetaKey(
    currentMapContext.eventType,
    currentMapContext.eventName,
    currentMapContext.chamberName,
    r,
    c
  );

  boardMetaOverrides[key] = null;

  if (typeof scanActiveObjectTypes === "function") {
    scanActiveObjectTypes();
  }

  if (typeof render === "function") render();
  if (typeof renderPreview === "function") renderPreview();
}

function clearAllBoardMeta() {
  clearBoardMetaOverrides();

  if (typeof scanActiveObjectTypes === "function") {
    scanActiveObjectTypes();
  }

  if (typeof render === "function") render();
  if (typeof renderPreview === "function") renderPreview();
}

function updatePainterButtonStates() {
  const buttons = document.querySelectorAll("[onclick^=\"setPainterObject(\"]");
  buttons.forEach((btn) => btn.classList.remove("tool-active"));

  const normalized = String(selectedPainterObject || "plain").toLowerCase();

  buttons.forEach((btn) => {
    const onclickText = btn.getAttribute("onclick") || "";
    const match = onclickText.match(/setPainterObject\('([^']+)'\)/i);
    if (!match) return;

    if (String(match[1]).toLowerCase() === normalized) {
      btn.classList.add("tool-active");
    }
  });
}

function setPainterObject(value) {
  selectedPainterObject = value || "plain";
  updatePainterButtonStates();
}

function syncSteelMultiplierDisplay() {
  const multiplierEl = document.getElementById("steelMultiplier");
  const displayEl = document.getElementById("steelMultiplierDisplay");

  if (!displayEl) return;

  const raw = String(multiplierEl?.value || "1");
  displayEl.textContent = `${raw}x`;
}

/* ------------------------------
   Existing app logic
------------------------------ */

function t(key) {
  return window.ZM_TRANSLATIONS?.[currentLanguage]?.[key]
    || window.ZM_TRANSLATIONS?.en?.[key]
    || key;
}

function formatT(key, vars = {}) {
  let str = t(key);
  Object.keys(vars).forEach((k) => {
    str = str.replaceAll(`{${k}}`, String(vars[k]));
  });
  return str;
}

function safeT(key, fallback) {
  const value = t(key);
  return value === key ? fallback : value;
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

  if (typeof render === "function") render();
  if (typeof renderPreview === "function") renderPreview();
  if (typeof renderRouteAudit === "function") {
    renderRouteAudit(solveState.routeAnalysis || []);
  }

  updatePainterButtonStates();
  syncSteelMultiplierDisplay();
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
    if (eventMine) eventMine.value = selectedMine;
  }

  if (eventChamber) eventChamber.value = selectedChamber;
  if (selectedType && selectedEvent && selectedChamber) {
    handleEventChamberChange();
    if (eventChamber) eventChamber.value = selectedChamber;
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

  const objectPrioritiesBtn = document.getElementById("objectPrioritiesBtn");
  if (objectPrioritiesBtn) {
    objectPrioritiesBtn.textContent = safeT("objectPriorities", "Object Priorities");
  }

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

  const toolDelete = document.getElementById("tool-delete");
  if (toolDelete) toolDelete.textContent = safeT("delete", "Delete");

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

  const objectPrioritiesIntro = document.getElementById("objectPrioritiesIntro");
  if (objectPrioritiesIntro) {
    objectPrioritiesIntro.textContent = safeT(
      "objectPrioritiesIntro",
      "Optional object preferences for the current board."
    );
  }

  const objectPrioritiesResetBtn = document.getElementById("objectPrioritiesResetBtn");
  if (objectPrioritiesResetBtn) {
    objectPrioritiesResetBtn.textContent = safeT("reset", "Reset");
  }

  const objectPrioritiesCloseBtn = document.getElementById("objectPrioritiesCloseBtn");
  if (objectPrioritiesCloseBtn) {
    objectPrioritiesCloseBtn.textContent = t("close");
  }

  loadHelpContent();
}

function setReport(msg) {
  const reportEl = document.getElementById("report");
  if (!reportEl) return;

  reportEl.textContent = msg;
  reportEl.style.whiteSpace = "pre-wrap";
  reportEl.style.overflowWrap = "anywhere";
  reportEl.style.wordBreak = "break-word";

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

function resetSolve() {
  solveState = {
    redPath: [],
    bluePaths: [],
    shaftEntryDots: [],
    shaftClusters: [],
    attackPoints: [],
    solved: false,
    message: "No solve yet.",
    routeAnalysis: [],
    solverVersion: null,
    legacyEndMode: false,
    redBubbleCount: 0,
    firstBubbleTravelCost: null,
    effectiveTotal: null,
    redCost: null,
    blueCost: null
  };

  if (typeof renderRouteAudit === "function") {
    renderRouteAudit([]);
  }
}

function initGridData() {
  grid = Array.from({ length: MAX_ROWS }, () => Array(COLS).fill(""));
}

function isGraveyardValue(value) {
  return String(value || "").trim().toLowerCase() === "graveyard";
}

function isMainDeepContext() {
  const selectedEventType = document.getElementById("eventTypeSelect")?.value || "";
  return currentMapContext.eventType === "MainDeep" || selectedEventType === "MainDeep";
}

function getRowsForContextFromSelection() {
  const chamber = document.getElementById("eventChamberSelect")?.value || "";
  return isGraveyardValue(chamber) ? MAX_ROWS : MINED_ROWS;
}

function getRowsForContextFromTitle() {
  const title = document.getElementById("titleInput")?.value || "";
  return title.toLowerCase().includes("graveyard") ? MAX_ROWS : MINED_ROWS;
}

function setBoardRowCount(nextRows) {
  currentRowCount = nextRows === MAX_ROWS ? MAX_ROWS : MINED_ROWS;

  if (typeof render === "function") render();
  if (typeof renderPreview === "function") renderPreview();
  if (typeof scanActiveObjectTypes === "function") scanActiveObjectTypes();
}

function ensureBoardRowCountFromCurrentContext() {
  const rowsFromSelection = getRowsForContextFromSelection();
  const rowsFromTitle = getRowsForContextFromTitle();
  setBoardRowCount(
    rowsFromSelection === MAX_ROWS || rowsFromTitle === MAX_ROWS ? MAX_ROWS : MINED_ROWS
  );
}

function getVisibleGridSlice() {
  return grid.slice(0, currentRowCount).map((row) => [...row]);
}

function runLoadedGridIntegrityCheck(gridToCheck, titleText = "Loaded Grid") {
  if (!window.ZMMapValidator || typeof window.ZMMapValidator.validateSingleLoadedGrid !== "function") {
    return { ok: true, errors: [] };
  }

  return window.ZMMapValidator.validateSingleLoadedGrid(gridToCheck, titleText);
}

function loadHelpContent() {
  const shortHelp = document.getElementById("shortHelpText");
  const solverHelpBody = document.getElementById("solverHelpBody");

  const translated = window.ZM_HELP_TRANSLATED?.[currentLanguage];
  const fallback = window.ZM_HELP_TRANSLATED?.en || window.ZM_HELP || {};

  if (shortHelp) {
    shortHelp.innerHTML =
      translated?.shortHelp ||
      fallback.shortHelp ||
      "";
  }

  if (solverHelpBody) {
    solverHelpBody.innerHTML =
      translated?.modalHelp ||
      fallback.modalHelp ||
      "";
  }
}

function openSolverHelp() {
  document.getElementById("solverHelpOverlay")?.classList.add("show");
}

function closeSolverHelp() {
  document.getElementById("solverHelpOverlay")?.classList.remove("show");
}

function hasUsableGridRecord(record) {
  if (!record || typeof record !== "object") return false;
  if (!Array.isArray(record.grid) || !record.grid.length) return false;

  return record.grid.some((row) =>
    Array.isArray(row) &&
    row.some((cell) => cell !== "" && cell !== null && cell !== undefined)
  );
}

function hasAnyMainMapData(eventName) {
  const event = window.ZM_MAP_DATA?.Main?.[eventName];
  if (!event || typeof event !== "object") return false;
  return Object.values(event).some((record) => hasUsableGridRecord(record));
}

function hasAnyMainDeepData(eventName) {
  const event = window.ZM_MAP_DATA?.MainDeep?.[eventName];
  if (!event || typeof event !== "object") return false;
  return Object.values(event).some((record) => hasUsableGridRecord(record));
}

function hasAnyLegacyMineData(eventName, mineName) {
  const mine = window.ZM_MAP_DATA?.Legacy?.[eventName]?.[mineName];
  if (!mine || typeof mine !== "object") return false;
  return Object.values(mine).some((record) => hasUsableGridRecord(record));
}

function hasAnyLegacyEventData(eventName) {
  const mines = window.ZM_MAP_DATA?.Legacy?.[eventName] || {};
  return Object.keys(mines).some((mineName) => hasAnyLegacyMineData(eventName, mineName));
}

function mergeOrderedUnique(primary, secondary) {
  const out = [];
  const seen = new Set();

  [...primary, ...secondary].forEach((value) => {
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
    libraryNames.filter((eventName) => hasAnyMainDeepData(eventName)),
    dataNames.filter((eventName) => hasAnyMainDeepData(eventName))
  );
}

function getOrderedMainNames() {
  const libraryNames = Object.keys(window.ZM_MAP_LIBRARY?.Main || {});
  const dataNames = Object.keys(window.ZM_MAP_DATA?.Main || {});
  return mergeOrderedUnique(
    libraryNames.filter((eventName) => hasAnyMainMapData(eventName)),
    dataNames.filter((eventName) => hasAnyMainMapData(eventName))
  );
}

function getOrderedLegacyNames() {
  const libraryNames = Object.keys(window.ZM_MAP_LIBRARY?.Legacy || {});
  const dataNames = Object.keys(window.ZM_MAP_DATA?.Legacy || {});

  return mergeOrderedUnique(
    LEGACY_EVENT_ORDER.filter((eventName) => hasAnyLegacyEventData(eventName)),
    mergeOrderedUnique(
      libraryNames.filter((eventName) => hasAnyLegacyEventData(eventName)),
      dataNames.filter((eventName) => hasAnyLegacyEventData(eventName))
    )
  );
}

function getOrderedMainDeepChambers(eventName) {
  const libraryChambers = window.ZM_MAP_LIBRARY?.MainDeep?.[eventName] || [];
  const dataChambers = Object.keys(window.ZM_MAP_DATA?.MainDeep?.[eventName] || {});
  return mergeOrderedUnique(
    libraryChambers.filter((chamber) =>
      hasUsableGridRecord(window.ZM_MAP_DATA?.MainDeep?.[eventName]?.[chamber])
    ),
    dataChambers.filter((chamber) =>
      hasUsableGridRecord(window.ZM_MAP_DATA?.MainDeep?.[eventName]?.[chamber])
    )
  );
}

function getOrderedMainChambers(eventName) {
  const libraryChambers = window.ZM_MAP_LIBRARY?.Main?.[eventName] || [];
  const dataChambers = Object.keys(window.ZM_MAP_DATA?.Main?.[eventName] || {});
  return mergeOrderedUnique(
    libraryChambers.filter((chamber) =>
      hasUsableGridRecord(window.ZM_MAP_DATA?.Main?.[eventName]?.[chamber])
    ),
    dataChambers.filter((chamber) =>
      hasUsableGridRecord(window.ZM_MAP_DATA?.Main?.[eventName]?.[chamber])
    )
  );
}

function getOrderedLegacyMines(eventName) {
  const libraryMines = Object.keys(window.ZM_MAP_LIBRARY?.Legacy?.[eventName] || {});
  const dataMines = Object.keys(window.ZM_MAP_DATA?.Legacy?.[eventName] || {});

  return mergeOrderedUnique(
    LEGACY_MINE_ORDER.filter((mineName) => hasAnyLegacyMineData(eventName, mineName)),
    mergeOrderedUnique(
      libraryMines.filter((mineName) => hasAnyLegacyMineData(eventName, mineName)),
      dataMines.filter((mineName) => hasAnyLegacyMineData(eventName, mineName))
    )
  );
}

function getOrderedLegacyChambers(eventName, eventMine) {
  const libraryChambers = window.ZM_MAP_LIBRARY?.Legacy?.[eventName]?.[eventMine] || [];
  const dataChambers = Object.keys(window.ZM_MAP_DATA?.Legacy?.[eventName]?.[eventMine] || {});
  return mergeOrderedUnique(
    libraryChambers.filter((chamber) =>
      hasUsableGridRecord(window.ZM_MAP_DATA?.Legacy?.[eventName]?.[eventMine]?.[chamber])
    ),
    dataChambers.filter((chamber) =>
      hasUsableGridRecord(window.ZM_MAP_DATA?.Legacy?.[eventName]?.[eventMine]?.[chamber])
    )
  );
}

function populateEventTypeSelect() {
  const select = document.getElementById("eventTypeSelect");
  const mapLoaderSection = document.getElementById("mapLoaderSection");

  if (!select) return;

  select.innerHTML = `<option value="">${t("selectEventType")}</option>`;

  if (!window.ZM_MAP_DATA) {
    if (mapLoaderSection) mapLoaderSection.classList.add("hidden");
    return;
  }

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

  if (mapLoaderSection) {
    const hasAny = !!(mainDeepNames.length || mainNames.length || legacyNames.length);
    mapLoaderSection.classList.toggle("hidden", !hasAny);
  }
}

function resetMapLoaderBelow(level) {
  const eventNameField = document.getElementById("eventNameField");
  const eventMineField = document.getElementById("eventMineField");
  const eventChamberField = document.getElementById("eventChamberField");

  const eventNameSelect = document.getElementById("eventNameSelect");
  const eventMineSelect = document.getElementById("eventMineSelect");
  const eventChamberSelect = document.getElementById("eventChamberSelect");
  const loadMapBtn = document.getElementById("loadMapBtn");

  if (level <= 1) {
    if (eventNameSelect) eventNameSelect.innerHTML = `<option value="">${t("selectEventName")}</option>`;
    if (eventNameField) eventNameField.classList.add("hidden");
  }

  if (level <= 2) {
    if (eventMineSelect) eventMineSelect.innerHTML = `<option value="">${t("selectEventMine")}</option>`;
    if (eventMineField) eventMineField.classList.add("hidden");
  }

  if (level <= 3) {
    if (eventChamberSelect) eventChamberSelect.innerHTML = `<option value="">${t("selectEventChamber")}</option>`;
    if (eventChamberField) eventChamberField.classList.add("hidden");
  }

  selectedMapPath = null;
  if (loadMapBtn) loadMapBtn.classList.add("hidden");
  updateDifficultyMeter();
}

function handleEventTypeChange() {
  const eventType = document.getElementById("eventTypeSelect")?.value || "";
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

  if (eventNameField) eventNameField.classList.remove("hidden");

  validNames.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = eventType === "MainDeep"
      ? translateDeepName(name)
      : translateEventName(name);
    eventNameSelect?.appendChild(option);
  });

  ensureBoardRowCountFromCurrentContext();
  updateDifficultyMeter();
}

function handleEventNameChange() {
  const eventType = document.getElementById("eventTypeSelect")?.value || "";
  const eventName = document.getElementById("eventNameSelect")?.value || "";

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

    if (eventChamberField) eventChamberField.classList.remove("hidden");

    chambers.forEach((chamber) => {
      const option = document.createElement("option");
      option.value = chamber;
      option.textContent = translateChamberName(chamber);
      eventChamberSelect?.appendChild(option);
    });
  } else if (eventType === "Main") {
    const chambers = getOrderedMainChambers(eventName);

    if (!chambers.length) {
      ensureBoardRowCountFromCurrentContext();
      updateDifficultyMeter();
      return;
    }

    if (eventChamberField) eventChamberField.classList.remove("hidden");

    chambers.forEach((chamber) => {
      const option = document.createElement("option");
      option.value = chamber;
      option.textContent = translateChamberName(chamber);
      eventChamberSelect?.appendChild(option);
    });
  } else if (eventType === "Legacy") {
    const validMines = getOrderedLegacyMines(eventName);

    if (!validMines.length) {
      ensureBoardRowCountFromCurrentContext();
      updateDifficultyMeter();
      return;
    }

    if (eventMineField) eventMineField.classList.remove("hidden");

    validMines.forEach((mineName) => {
      const option = document.createElement("option");
      option.value = mineName;
      option.textContent = translateMineName(mineName);
      eventMineSelect?.appendChild(option);
    });
  }

  ensureBoardRowCountFromCurrentContext();
  updateDifficultyMeter();
}

function handleEventMineChange() {
  const eventName = document.getElementById("eventNameSelect")?.value || "";
  const eventMine = document.getElementById("eventMineSelect")?.value || "";
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

  if (eventChamberField) eventChamberField.classList.remove("hidden");

  chambers.forEach((chamber) => {
    const option = document.createElement("option");
    option.value = chamber;
    option.textContent = translateChamberName(chamber);
    eventChamberSelect?.appendChild(option);
  });

  ensureBoardRowCountFromCurrentContext();
  updateDifficultyMeter();
}

function buildAutoTitle() {
  const eventType = document.getElementById("eventTypeSelect")?.value || "";
  const eventName = document.getElementById("eventNameSelect")?.value || "";
  const eventMine = document.getElementById("eventMineSelect")?.value || "";
  const eventChamber = document.getElementById("eventChamberSelect")?.value || "";

  if (!eventType || !eventName || !eventChamber) return null;

  const displayEvent = eventType === "MainDeep"
    ? translateDeepName(eventName)
    : translateEventName(eventName);
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

function handleEventChamberChange() {
  const loadMapBtn = document.getElementById("loadMapBtn");
  const eventType = document.getElementById("eventTypeSelect")?.value || "";
  const eventName = document.getElementById("eventNameSelect")?.value || "";
  const eventMine = document.getElementById("eventMineSelect")?.value || "";
  const eventChamber = document.getElementById("eventChamberSelect")?.value || "";

  selectedMapPath = null;
  if (loadMapBtn) loadMapBtn.classList.add("hidden");

  if (!eventType || !eventName || !eventChamber) {
    ensureBoardRowCountFromCurrentContext();
    updateDifficultyMeter();
    return;
  }

  if (eventType === "MainDeep") {
    selectedMapPath = { eventType, eventName, eventChamber };
    if (loadMapBtn) loadMapBtn.classList.remove("hidden");
  }

  if (eventType === "Main") {
    selectedMapPath = { eventType, eventName, eventChamber };
    if (loadMapBtn) loadMapBtn.classList.remove("hidden");
  }

  if (eventType === "Legacy" && eventMine) {
    selectedMapPath = { eventType, eventName, eventMine, eventChamber };
    if (loadMapBtn) loadMapBtn.classList.remove("hidden");
  }

  const autoTitle = buildAutoTitle();
  if (autoTitle) {
    const titleInput = document.getElementById("titleInput");
    if (titleInput) titleInput.value = autoTitle;
    currentPreviewTitle = autoTitle;
  }

  ensureBoardRowCountFromCurrentContext();
  updateDifficultyMeter();
}

function handleTitleInputChange() {
  currentPreviewTitle = document.getElementById("titleInput")?.value || "Gate 1";
  ensureBoardRowCountFromCurrentContext();
  updateDifficultyMeter();
}

function getSelectedMapRecord() {
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

function loadSelectedMap() {
  const mapRecord = getSelectedMapRecord();
  if (!mapRecord) {
    setReport(t("selectedMapMissing"));
    return;
  }

  if (typeof clearBoard === "function") {
    clearBoard(false);
  }

  clearBoardMetaOverrides();

  currentMapContext = {
    eventType: selectedMapPath.eventType,
    eventName: selectedMapPath.eventName,
    chamberName: selectedMapPath.eventChamber,
    eventMine: selectedMapPath.eventMine || null
  };

  const autoTitle = buildAutoTitle();
  currentPreviewTitle = autoTitle || "Loaded Map";

  const titleInput = document.getElementById("titleInput");
  if (titleInput) titleInput.value = currentPreviewTitle;

  const gateType = document.getElementById("gateType");
  if (gateType) gateType.value = mapRecord.gateType || "standard";

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

  if (typeof scanActiveObjectTypes === "function") {
    scanActiveObjectTypes();
  }

  resetSolve();
  if (typeof render === "function") render();
  if (typeof renderPreview === "function") renderPreview();
  setReport(`${t("loadedMap")} ${currentPreviewTitle}`);
  updateDifficultyMeter();
}

function clampRatio(value) {
  if (DIFFICULTY_MAX === DIFFICULTY_MIN) return 0;
  const ratio = (value - DIFFICULTY_MIN) / (DIFFICULTY_MAX - DIFFICULTY_MIN);
  return Math.max(0, Math.min(1, ratio));
}

function getDifficultyLabel(ratio) {
  if (ratio <= 0.125) return "VERY EASY";
  if (ratio <= 0.25) return "EASY";
  if (ratio <= 0.375) return "MILD";
  if (ratio <= 0.50) return "MODERATE";
  if (ratio <= 0.625) return "CHALLENGING";
  if (ratio <= 0.75) return "HARD";
  if (ratio <= 0.875) return "EXTREME";
  return "BRUTAL";
}

function getCurrentEventName() {
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
    if (
      title === name ||
      title.startsWith(name + " -") ||
      title === translated ||
      title.startsWith(translated + " -")
    ) {
      return name;
    }
  }

  return null;
}

function ensureDifficultyMeter() {
  let meter = document.getElementById("difficultyMeter");
  if (meter) return meter;

  const report = document.getElementById("report");
  if (!report || !report.parentNode) return null;

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

function updateDifficultyMeter() {
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

/* Steel Showdown */

function getSteelShowdownMultiplier() {
  const value = Number(document.getElementById("steelMultiplier")?.value || 1);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function getSteelShowdownGateValue() {
  const gateType = document.getElementById("gateType")?.value || "standard";
  return gateType === "end" ? 10 : 5;
}

function getSteelShowdownBubbleCount() {
  let count = 0;
  for (let r = 0; r < currentRowCount; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r]?.[c] === "B") count += 1;
    }
  }
  return count;
}

function getSteelShowdownShaftClusterCount() {
  if (typeof getOrderedPhysicalShaftClusters === "function") {
    const clusters = getOrderedPhysicalShaftClusters();
    return Array.isArray(clusters) ? clusters.length : 0;
  }

  const seen = new Set();
  let clusterCount = 0;

  for (let r = 0; r < currentRowCount; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r]?.[c] !== "S") continue;

      const key = `${r},${c}`;
      if (seen.has(key)) continue;

      clusterCount += 1;
      const stack = [[r, c]];

      while (stack.length) {
        const [rr, cc] = stack.pop();
        const k = `${rr},${cc}`;

        if (rr < 0 || cc < 0 || rr >= currentRowCount || cc >= COLS) continue;
        if (grid[rr]?.[cc] !== "S" || seen.has(k)) continue;

        seen.add(k);
        stack.push([rr + 1, cc], [rr - 1, cc], [rr, cc + 1], [rr, cc - 1]);
      }
    }
  }

  return clusterCount;
}

function getSteelShowdownObjectCount() {
  let count = 0;

  if (typeof getTileMeta !== "function") return 0;

  for (let r = 0; r < currentRowCount; r++) {
    for (let c = 0; c < COLS; c++) {
      const val = grid[r]?.[c];

      if (typeof val !== "number") continue;

      const meta = getTileMeta(
        currentMapContext.eventType,
        currentMapContext.eventName,
        currentMapContext.chamberName,
        r,
        c
      );

      if (meta && typeof meta === "object" && meta.object) {
        count += 1;
      }
    }
  }

  return count;
}

function updateSteelShowdownDisplay(baseTotal, finalTotal) {
  const baseEl = document.getElementById("steelBaseGears");
  const totalEl = document.getElementById("steelTotalGears");

  if (baseEl) baseEl.textContent = String(baseTotal);
  if (totalEl) totalEl.textContent = String(finalTotal);

  syncSteelMultiplierDisplay();
}

function calculateSteelShowdown() {
  const objectCount = getSteelShowdownObjectCount();
  const bubbleCount = getSteelShowdownBubbleCount();
  const shaftClusterCount = getSteelShowdownShaftClusterCount();
  const gateValue = getSteelShowdownGateValue();
  const multiplier = getSteelShowdownMultiplier();

  const baseTotal =
    objectCount +
    (bubbleCount * 5) +
    (shaftClusterCount * 3) +
    gateValue;

  const finalTotal = baseTotal * multiplier;

  updateSteelShowdownDisplay(baseTotal, finalTotal);
}

function init() {
  initGridData();

  installTileMetaOverrideLayer();

  const titleInput = document.getElementById("titleInput");
  currentPreviewTitle = titleInput?.value || "Gate 1";

  loadHelpContent();
  populateEventTypeSelect();
  applyLanguage();

  const multiplierEl = document.getElementById("steelMultiplier");
  if (multiplierEl) {
    multiplierEl.addEventListener("change", syncSteelMultiplierDisplay);
    multiplierEl.addEventListener("input", syncSteelMultiplierDisplay);
  }

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

  if (typeof render === "function") render();
  if (typeof renderPreview === "function") renderPreview();

  if (typeof initAccessControl === "function") initAccessControl();
  if (typeof updateUserUI === "function") updateUserUI();

  ensureDifficultyMeter();
  updateDifficultyMeter();
  updateSteelShowdownDisplay(0, 0);
  updatePainterButtonStates();

  if (typeof scanActiveObjectTypes === "function") {
    scanActiveObjectTypes();
  }

  if (typeof renderRouteAudit === "function") {
    renderRouteAudit([]);
  }
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
window.calculateSteelShowdown = calculateSteelShowdown;

window.setPainterObject = setPainterObject;
window.clearSelectedTileMeta = clearSelectedTileMeta;
window.clearAllBoardMeta = clearAllBoardMeta;
window.applyPainterMetaToSelectedTile = applyPainterMetaToSelectedTile;
window.syncSteelMultiplierDisplay = syncSteelMultiplierDisplay;

window.addEventListener("load", init);
