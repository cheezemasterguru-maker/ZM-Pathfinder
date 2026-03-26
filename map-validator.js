const MAX_ROWS = 20;
const MINED_ROWS = 13;
const COLS = 7;

let grid = [];
let currentRowCount = MINED_ROWS;
let tool = "number";
let lastSelected = { r: 0, c: 0 };
let selectedMapPath = null;
let currentPreviewTitle = "Gate 1";

let solveState = {
  redPath: [],
  bluePaths: [],
  shaftEntryDots: [],
  shaftClusters: [],
  solved: false,
  message: "No solve yet."
};

function setReport(msg){
  document.getElementById("report").textContent = msg;
}

function resetSolve(){
  solveState = {
    redPath: [],
    bluePaths: [],
    shaftEntryDots: [],
    shaftClusters: [],
    solved: false,
    message: "No solve yet."
  };
}

function initGridData(){
  grid = Array.from({ length: MAX_ROWS }, () => Array(COLS).fill(""));
}

function isGraveyardValue(value){
  return String(value || "").trim().toLowerCase() === "graveyard";
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

function loadHelpContent(){
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

function hasAnyMainMapData(eventName){
  const chamberList = window.ZM_MAP_LIBRARY?.Main?.[eventName] || [];
  return chamberList.some(chamber => !!window.ZM_MAP_DATA?.Main?.[eventName]?.[chamber]);
}

function hasAnyLegacyMineData(eventName, mineName){
  const chamberList = window.ZM_MAP_LIBRARY?.Legacy?.[eventName]?.[mineName] || [];
  return chamberList.some(chamber => !!window.ZM_MAP_DATA?.Legacy?.[eventName]?.[mineName]?.[chamber]);
}

function hasAnyLegacyEventData(eventName){
  const mines = window.ZM_MAP_LIBRARY?.Legacy?.[eventName] || {};
  return Object.keys(mines).some(mineName => hasAnyLegacyMineData(eventName, mineName));
}

function populateEventTypeSelect(){
  const select = document.getElementById("eventTypeSelect");
  select.innerHTML = '<option value="">Select Event Type</option>';

  if (!window.ZM_MAP_LIBRARY || !window.ZM_MAP_DATA) return;

  const mainHasData = Object.keys(window.ZM_MAP_LIBRARY.Main || {}).some(eventName => hasAnyMainMapData(eventName));
  const legacyHasData = Object.keys(window.ZM_MAP_LIBRARY.Legacy || {}).some(eventName => hasAnyLegacyEventData(eventName));

  if (mainHasData) {
    const option = document.createElement("option");
    option.value = "Main";
    option.textContent = "Main";
    select.appendChild(option);
  }

  if (legacyHasData) {
    const option = document.createElement("option");
    option.value = "Legacy";
    option.textContent = "Legacy";
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
    eventNameSelect.innerHTML = '<option value="">Select Event Name</option>';
    eventNameField.classList.add("hidden");
  }

  if (level <= 2) {
    eventMineSelect.innerHTML = '<option value="">Select Event Mine</option>';
    eventMineField.classList.add("hidden");
  }

  if (level <= 3) {
    eventChamberSelect.innerHTML = '<option value="">Select Event Chamber</option>';
    eventChamberField.classList.add("hidden");
  }

  selectedMapPath = null;
  loadMapBtn.classList.add("hidden");
}

function handleEventTypeChange(){
  const eventType = document.getElementById("eventTypeSelect").value;
  const eventNameField = document.getElementById("eventNameField");
  const eventNameSelect = document.getElementById("eventNameSelect");

  resetMapLoaderBelow(1);
  if (!eventType || !window.ZM_MAP_LIBRARY || !window.ZM_MAP_LIBRARY[eventType]) {
    ensureBoardRowCountFromCurrentContext();
    return;
  }

  let validNames = [];

  if (eventType === "Main") {
    validNames = Object.keys(window.ZM_MAP_LIBRARY.Main || {}).filter(eventName => hasAnyMainMapData(eventName));
  } else if (eventType === "Legacy") {
    validNames = Object.keys(window.ZM_MAP_LIBRARY.Legacy || {}).filter(eventName => hasAnyLegacyEventData(eventName));
  }

  if (!validNames.length) {
    ensureBoardRowCountFromCurrentContext();
    return;
  }

  eventNameField.classList.remove("hidden");

  validNames.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    eventNameSelect.appendChild(option);
  });

  ensureBoardRowCountFromCurrentContext();
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
    return;
  }

  if (eventType === "Main") {
    const chambers = (window.ZM_MAP_LIBRARY?.Main?.[eventName] || []).filter(chamber => {
      return !!window.ZM_MAP_DATA?.Main?.[eventName]?.[chamber];
    });

    if (!chambers.length) {
      ensureBoardRowCountFromCurrentContext();
      return;
    }

    eventChamberField.classList.remove("hidden");

    chambers.forEach(chamber => {
      const option = document.createElement("option");
      option.value = chamber;
      option.textContent = chamber;
      eventChamberSelect.appendChild(option);
    });
  } else if (eventType === "Legacy") {
    const validMines = Object.keys(window.ZM_MAP_LIBRARY?.Legacy?.[eventName] || {}).filter(mineName => {
      return hasAnyLegacyMineData(eventName, mineName);
    });

    if (!validMines.length) {
      ensureBoardRowCountFromCurrentContext();
      return;
    }

    eventMineField.classList.remove("hidden");

    validMines.forEach(mineName => {
      const option = document.createElement("option");
      option.value = mineName;
      option.textContent = mineName;
      eventMineSelect.appendChild(option);
    });
  }

  ensureBoardRowCountFromCurrentContext();
}

function handleEventMineChange(){
  const eventName = document.getElementById("eventNameSelect").value;
  const eventMine = document.getElementById("eventMineSelect").value;
  const eventChamberField = document.getElementById("eventChamberField");
  const eventChamberSelect = document.getElementById("eventChamberSelect");

  resetMapLoaderBelow(3);
  if (!eventName || !eventMine) {
    ensureBoardRowCountFromCurrentContext();
    return;
  }

  const chambers = (window.ZM_MAP_LIBRARY?.Legacy?.[eventName]?.[eventMine] || []).filter(chamber => {
    return !!window.ZM_MAP_DATA?.Legacy?.[eventName]?.[eventMine]?.[chamber];
  });

  if (!chambers.length) {
    ensureBoardRowCountFromCurrentContext();
    return;
  }

  eventChamberField.classList.remove("hidden");

  chambers.forEach(chamber => {
    const option = document.createElement("option");
    option.value = chamber;
    option.textContent = chamber;
    eventChamberSelect.appendChild(option);
  });

  ensureBoardRowCountFromCurrentContext();
}

function buildAutoTitle(){
  const eventType = document.getElementById("eventTypeSelect").value;
  const eventName = document.getElementById("eventNameSelect").value;
  const eventMine = document.getElementById("eventMineSelect").value;
  const eventChamber = document.getElementById("eventChamberSelect").value;

  if (!eventType || !eventName || !eventChamber) return null;

  if (eventType === "Main") {
    return `${eventName} - ${eventChamber}`;
  }

  if (eventType === "Legacy" && eventMine) {
    return `${eventName} - ${eventMine} - ${eventChamber}`;
  }

  return eventChamber;
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
    return;
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
}

function handleTitleInputChange(){
  currentPreviewTitle = document.getElementById("titleInput").value || "Gate 1";
  ensureBoardRowCountFromCurrentContext();
}

function getSelectedMapRecord(){
  if (!selectedMapPath || !window.ZM_MAP_DATA) return null;

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
    setReport("Selected map data was not found in maps.js.");
    return;
  }

  clearBoard(false);

  const autoTitle = buildAutoTitle();
  currentPreviewTitle = mapRecord.title || autoTitle || "Loaded Map";
  document.getElementById("titleInput").value = currentPreviewTitle;
  document.getElementById("gateType").value = mapRecord.gateType || "standard";

  const isGraveyard = isGraveyardValue(selectedMapPath?.eventChamber);
  setBoardRowCount(isGraveyard ? MAX_ROWS : MINED_ROWS);

  const sourceGrid = mapRecord.grid || [];

  const integrity = runLoadedGridIntegrityCheck(sourceGrid, currentPreviewTitle);
  if (!integrity.ok) {
    setReport(`Map integrity check failed: ${integrity.errors[0]}`);
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
  setReport(`Loaded map: ${currentPreviewTitle}`);
}

function init(){
  initGridData();
  currentPreviewTitle = document.getElementById("titleInput").value || "Gate 1";

  loadHelpContent();
  populateEventTypeSelect();

  if (!window.ZM_MAP_DATA) {
    setReport("ZM_MAP_DATA not loaded.");
  } else if (!window.ZMMapValidator) {
    setReport("ZMMapValidator not loaded.");
  } else {
    const errors = window.ZMMapValidator.validateMainMapData(window.ZM_MAP_DATA);

    if (errors.length) {
      console.error("Map data errors:", errors);
      setReport(errors[0]);
    } else {
      setReport("Map data loaded successfully.");
    }
  }

  render();
  renderPreview();
  initAccessControl();
  updateUserUI();
}

window.addEventListener("load", init);
