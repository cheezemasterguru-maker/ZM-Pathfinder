const MAX_ROWS = 20;
const STANDARD_CHAMBER_ROWS = 15;
const STANDARD_GRAVEYARD_ROWS = 20;
const SMALL_EVENT_CHAMBER_ROWS = 13;
const SMALL_EVENT_GRAVEYARD_ROWS = 16;
const COLS = 7;

let grid = [];
let currentRowCount = STANDARD_CHAMBER_ROWS;
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

function isSmallEventName(eventName){
  const normalized = String(eventName || "").trim();
  return normalized === "Essence Cave" || normalized === "Treasure Trove of Gems";
}

function getExpectedRowsForEventAndChamber(eventName, chamberName){
  const isGraveyard = isGraveyardValue(chamberName);

  if (isSmallEventName(eventName)) {
    return isGraveyard ? SMALL_EVENT_GRAVEYARD_ROWS : SMALL_EVENT_CHAMBER_ROWS;
  }

  return isGraveyard ? STANDARD_GRAVEYARD_ROWS : STANDARD_CHAMBER_ROWS;
}

function getEventNameFromSelection(){
  return document.getElementById("eventNameSelect")?.value || "";
}

function getChamberNameFromSelection(){
  return document.getElementById("eventChamberSelect")?.value || "";
}

function parseEventAndChamberFromTitle(title){
  const raw = String(title || "").trim();
  if (!raw) return { eventName: "", chamberName: "" };

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

function getRowsForContextFromSelection(){
  const eventName = getEventNameFromSelection();
  const chamberName = getChamberNameFromSelection();

  if (!chamberName) {
    return STANDARD_CHAMBER_ROWS;
  }

  return getExpectedRowsForEventAndChamber(eventName, chamberName);
}

function getRowsForContextFromTitle(){
  const title = document.getElementById("titleInput")?.value || "";
  const parsed = parseEventAndChamberFromTitle(title);

  if (!parsed.chamberName) {
    return STANDARD_CHAMBER_ROWS;
  }

  return getExpectedRowsForEventAndChamber(parsed.eventName, parsed.chamberName);
}

function setBoardRowCount(nextRows){
  const allowed = new Set([
    SMALL_EVENT_CHAMBER_ROWS,
    STANDARD_CHAMBER_ROWS,
    SMALL_EVENT_GRAVEYARD_ROWS,
    STANDARD_GRAVEYARD_ROWS
  ]);

  currentRowCount = allowed.has(nextRows) ? nextRows : STANDARD_CHAMBER_ROWS;
  render();
  renderPreview();
}

function ensureBoardRowCountFromCurrentContext(){
  const rowsFromSelection = getRowsForContextFromSelection();
  const rowsFromTitle = getRowsForContextFromTitle();

  const nextRows = Math.max(rowsFromSelection, rowsFromTitle);
  setBoardRowCount(nextRows);
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

  const sourceGrid = mapRecord.grid || [];

const cushionRows = 2;
const minimumRows = isGraveyardValue(selectedMapPath?.eventChamber) ? 16 : 13;
const rowsForMap = Math.min(
  MAX_ROWS,
  Math.max(minimumRows, sourceGrid.length + cushionRows)
);

setBoardRowCount(rowsForMap);

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
        cell.textContent = String(val);
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
    setReport("Clipboard access was blocked by the browser. Copy again, tap a cell, then retry Paste From Clipboard.");
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
  setReport(`Pasted into board starting at Row ${startR + 1}, Col ${startC + 1}.`);
}

function clearBoard(updateReport = true){
  for(let r = 0; r < MAX_ROWS; r++){
    for(let c = 0; c < COLS; c++){
      grid[r][c] = "";
    }
  }
  currentRowCount = STANDARD_CHAMBER_ROWS;
  resetSolve();
  render();
  renderPreview();
  if (updateReport) setReport("Board cleared.");
}

function loadSampleGrid(){
  clearBoard(false);
  document.getElementById("gateType").value = "standard";
  document.getElementById("titleInput").value = "Gate 1";
  currentPreviewTitle = "Gate 1";
  currentRowCount = STANDARD_CHAMBER_ROWS;

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
  setReport("Sample Grid loaded.");
}

function solveBoard(){
  if(!window.ZMPathfinderSolver || typeof window.ZMPathfinderSolver.solveGrid !== "function"){
    setReport("solver.js is missing or not loaded.");
    return;
  }

  const result = window.ZMPathfinderSolver.solveGrid({
    grid: getVisibleGridSlice(),
    gateType: document.getElementById("gateType").value
  });

  if(!result || !result.ok){
    resetSolve();
    setReport(result && result.message ? result.message : "Solver failed.");
    renderPreview();
    return;
  }

  solveState = {
    redPath: result.redPath || [],
    bluePaths: result.bluePaths || [],
    shaftEntryDots: result.shaftEntryDots || [],
    shaftClusters: result.shaftClusters || [],
    solved: true,
    message: result.message || "Solved."
  };

  setReport(result.message || "Solved.");
renderPreview();

// 🔒 ADMIN ONLY: record difficulty

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

      if(val === "S") continue;

      if(val === "X"){
        ctx.fillStyle = "#000";
      } else if(val === "B"){
        ctx.fillStyle = "#8fd3f7";
      } else {
        ctx.fillStyle = "#ececef";
      }

      ctx.fillRect(x, y, cell, cell);
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
        ctx.font = "700 28px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(val), x + cell/2, y + cell/2);
      }
    }
  }

  const shafts = solveState.shaftClusters && solveState.shaftClusters.length
    ? solveState.shaftClusters
    : getShaftClustersFromGrid();

  for(const cluster of shafts){
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

    ctx.fillStyle = "#111";
    ctx.font = "700 26px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Shaft", x + w/2, y + h/2);
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
  ctx.fillText("1st Strongest Z", 126, ly + 6);

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
  ctx.fillText("2nd Strongest Z", 460, ly + 6);
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

  return clusters;
}

function drawPath(ctx, path, color, width, cell, pad, topPad, rowOffset){
  if(!path || path.length < 2) return;

  function center(pt){
    return {
      x: pad + pt[1] * cell + cell / 2,
      y: topPad + (pt[0] - rowOffset) * cell + cell / 2
    };
  }

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.lineWidth = width + 5;
  ctx.strokeStyle = "#000";
  ctx.beginPath();
  let p = center(path[0]);
  ctx.moveTo(p.x, p.y);
  for(let i = 1; i < path.length; i++){
    p = center(path[i]);
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();

  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.beginPath();
  p = center(path[0]);
  ctx.moveTo(p.x, p.y);
  for(let i = 1; i < path.length; i++){
    p = center(path[i]);
    ctx.lineTo(p.x, p.y);
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

function init(){
  initGridData();
  currentPreviewTitle = document.getElementById("titleInput").value || "Gate 1";
  loadHelpContent();
  populateEventTypeSelect();

  if (window.ZMMapValidator && typeof window.ZMMapValidator.validateMainMapData === "function") {
    const allErrors = window.ZMMapValidator.validateMainMapData(window.ZM_MAP_DATA);
    if (allErrors.length) {
      console.error("Map data integrity errors:", allErrors);
      setReport(`Map data integrity warning: ${allErrors[0]}`);
    }
  }

  render();
  renderPreview();
  initAccessControl();
  updateUserUI();
}

window.openSolverHelp = openSolverHelp;
window.closeSolverHelp = closeSolverHelp;
window.setReport = setReport;
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
