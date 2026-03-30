const MAX_ROWS = 20;
const MINED_ROWS = 13;
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

// "overlay" = number stays visible and object code shows underneath
// "object_only" = code replaces number
const OBJECT_RENDER_MODE = "overlay";

let grid = [];
let currentRowCount = MINED_ROWS;
let tool = "number";
let lastSelected = { r: 0, c: 0 };
let selectedMapPath = null;
let currentPreviewTitle = "Gate 1";

let currentMapContext = {
  eventType: null,
  eventName: null,
  chamberName: null
};

let solveState = {
  redPath: [],
  bluePaths: [],
  shaftEntryDots: [],
  shaftClusters: [],
  solved: false,
  message: "No solve yet.",
  routeAnalysis: []
};

function setReport(msg){
  const reportEl = document.getElementById("report");
  if (!reportEl) return;
  reportEl.textContent = msg;
  updateDifficultyMeter();
}

function ensureRouteAuditCard(){
  let card = document.getElementById("routeAuditCard");
  if (card) return card;

  const page = document.querySelector(".page");
  const editorCard = document.querySelector(".editor-card");
  if (!page || !editorCard) return null;

  card = document.createElement("div");
  card.id = "routeAuditCard";
  card.className = "card";
  card.style.display = "none";

  const title = document.createElement("div");
  title.className = "section-title";
  title.style.marginTop = "0";
  title.textContent = "Route Report";

  const body = document.createElement("div");
  body.id = "routeAuditBody";

  card.appendChild(title);
  card.appendChild(body);

  editorCard.insertAdjacentElement("afterend", card);
  return card;
}

function renderRouteAudit(routeAnalysis){
  const card = ensureRouteAuditCard();
  const body = document.getElementById("routeAuditBody");
  if (!card || !body) return;

  if (!routeAnalysis || !routeAnalysis.length) {
    card.style.display = "none";
    body.innerHTML = "";
    return;
  }

  const approved = routeAnalysis.filter(item => item.approved);
  const rejected = routeAnalysis.filter(item => !item.approved);

  function makeRouteBox(item, isApproved){
    const box = document.createElement("div");
    box.style.borderRadius = "16px";
    box.style.padding = "12px 14px";
    box.style.marginBottom = "12px";
    box.style.border = `2px solid ${isApproved ? "rgba(34,197,94,0.55)" : "rgba(239,68,68,0.35)"}`;
    box.style.background = isApproved ? "rgba(34,197,94,0.14)" : "rgba(239,68,68,0.10)";
    box.style.color = "#fff";
    box.style.boxSizing = "border-box";

    const heading = document.createElement("div");
    heading.textContent = isApproved ? "APPROVED ROUTE" : "IGNORED ROUTE";
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

    const meta = document.createElement("div");
    meta.style.fontSize = "14px";
    meta.style.lineHeight = "1.5";
    meta.innerHTML =
      `Mode: <b>${item.redMode}</b> | Variant: <b>${item.redVariant}</b><br>` +
      `Effective total: <b>${item.effectiveTotal}</b>` +
      (isApproved ? "" : ` | Worse by: <b>${item.deltaFromBest}</b>`) + `<br>` +
      `Red cost: <b>${item.redCost}</b> | Blue cost: <b>${item.blueCost}</b><br>` +
      `Unresolved targets: <b>${item.unresolvedTargets}</b><br>` +
      `Reason: <b>${item.reason}</b>`;

    box.appendChild(heading);
    box.appendChild(pathLine);
    box.appendChild(meta);

    return box;
  }

  body.innerHTML = "";

  approved.forEach(item => body.appendChild(makeRouteBox(item, true)));
  rejected.forEach(item => body.appendChild(makeRouteBox(item, false)));

  card.style.display = "block";
}

function resetSolve(){
  solveState = {
    redPath: [],
    bluePaths: [],
    shaftEntryDots: [],
    shaftClusters: [],
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
  const event = window.ZM_MAP_DATA?.Main?.[eventName];
  if (!event || typeof event !== "object") return false;
  return Object.values(event).some(chamber => !!chamber);
}

function hasAnyLegacyMineData(eventName, mineName){
  const mine = window.ZM_MAP_DATA?.Legacy?.[eventName]?.[mineName];
  if (!mine || typeof mine !== "object") return false;
  return Object.values(mine).some(chamber => !!chamber);
}

function hasAnyLegacyEventData(eventName){
  const mines = window.ZM_MAP_DATA?.Legacy?.[eventName] || {};
  return Object.keys(mines).some(mineName => hasAnyLegacyMineData(eventName, mineName));
}

function populateEventTypeSelect(){
  const select = document.getElementById("eventTypeSelect");
  select.innerHTML = '<option value="">Select Event Type</option>';

  if (!window.ZM_MAP_DATA) return;

  const mainHasData = Object.keys(window.ZM_MAP_DATA.Main || {}).some(eventName => hasAnyMainMapData(eventName));
  const legacyHasData = Object.keys(window.ZM_MAP_DATA.Legacy || {}).some(eventName => hasAnyLegacyEventData(eventName));

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

  if (eventType === "Main") {
    const libraryNames = Object.keys(window.ZM_MAP_LIBRARY?.Main || {});
    const dataNames = Object.keys(window.ZM_MAP_DATA.Main || {});
    validNames = [
      ...libraryNames.filter(eventName => hasAnyMainMapData(eventName)),
      ...dataNames.filter(eventName =>
        !libraryNames.includes(eventName) && hasAnyMainMapData(eventName)
      )
    ];
  } else if (eventType === "Legacy") {
    const libraryNames = Object.keys(window.ZM_MAP_LIBRARY?.Legacy || {});
    const dataNames = Object.keys(window.ZM_MAP_DATA.Legacy || {});
    validNames = [
      ...libraryNames.filter(eventName => hasAnyLegacyEventData(eventName)),
      ...dataNames.filter(eventName =>
        !libraryNames.includes(eventName) && hasAnyLegacyEventData(eventName)
      )
    ];
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
    option.textContent = name;
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

  if (eventType === "Main") {
    const libraryChambers = window.ZM_MAP_LIBRARY?.Main?.[eventName] || [];
    const dataChambers = Object.keys(window.ZM_MAP_DATA?.Main?.[eventName] || {});
    const chambers = [
      ...libraryChambers.filter(chamber => !!window.ZM_MAP_DATA?.Main?.[eventName]?.[chamber]),
      ...dataChambers.filter(chamber =>
        !libraryChambers.includes(chamber) && !!window.ZM_MAP_DATA?.Main?.[eventName]?.[chamber]
      )
    ];

    if (!chambers.length) {
      ensureBoardRowCountFromCurrentContext();
      updateDifficultyMeter();
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
    const libraryMines = Object.keys(window.ZM_MAP_LIBRARY?.Legacy?.[eventName] || {});
    const dataMines = Object.keys(window.ZM_MAP_DATA?.Legacy?.[eventName] || {});
    const validMines = [
      ...libraryMines.filter(mineName => hasAnyLegacyMineData(eventName, mineName)),
      ...dataMines.filter(mineName =>
        !libraryNamesIncludes(libraryMines, mineName) && hasAnyLegacyMineData(eventName, mineName)
      )
    ];

    if (!validMines.length) {
      ensureBoardRowCountFromCurrentContext();
      updateDifficultyMeter();
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
  updateDifficultyMeter();
}

function libraryNamesIncludes(arr, value){
  return arr.includes(value);
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

  const libraryChambers = window.ZM_MAP_LIBRARY?.Legacy?.[eventName]?.[eventMine] || [];
  const dataChambers = Object.keys(window.ZM_MAP_DATA?.Legacy?.[eventName]?.[eventMine] || {});
  const chambers = [
    ...libraryChambers.filter(chamber => !!window.ZM_MAP_DATA?.Legacy?.[eventName]?.[eventMine]?.[chamber]),
    ...dataChambers.filter(chamber =>
      !libraryChambers.includes(chamber) && !!window.ZM_MAP_DATA?.Legacy?.[eventName]?.[eventMine]?.[chamber]
    )
  ];

  if (!chambers.length) {
    ensureBoardRowCountFromCurrentContext();
    updateDifficultyMeter();
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
  updateDifficultyMeter();
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
    updateDifficultyMeter();
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
  updateDifficultyMeter();
}

function handleTitleInputChange(){
  currentPreviewTitle = document.getElementById("titleInput").value || "Gate 1";
  ensureBoardRowCountFromCurrentContext();
  updateDifficultyMeter();
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

  currentMapContext = {
    eventType: selectedMapPath.eventType,
    eventName: selectedMapPath.eventName,
    chamberName: selectedMapPath.eventChamber
  };

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
  currentRowCount = MINED_ROWS;
  currentPreviewTitle = document.getElementById("titleInput")?.value || "Gate 1";
  currentMapContext = {
    eventType: null,
    eventName: null,
    chamberName: null
  };
  resetSolve();
  render();
  renderPreview();
  if (updateReport) setReport("Board cleared.");
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
  setReport("Sample Grid loaded.");
  updateDifficultyMeter();
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
    message: result.message || "Solved.",
    routeAnalysis: result.routeAnalysis || []
  };

  setReport("Solved.");
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
  const selectedEventName = document.getElementById("eventNameSelect")?.value || "";
  if (selectedEventName && EVENT_TOTALS[selectedEventName] !== undefined) {
    return selectedEventName;
  }

  const title = String(currentPreviewTitle || document.getElementById("titleInput")?.value || "").trim();
  if (!title) return null;

  const names = Object.keys(EVENT_TOTALS).sort((a, b) => b.length - a.length);
  for (const name of names) {
    if (title === name || title.startsWith(name + " -")) {
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

  const editorHelp = document.querySelector(".sticky-tools .help");
  if (editorHelp) {
    editorHelp.style.display = "none";
  }

  ensureRouteAuditCard();

  if (!window.ZM_MAP_DATA) {
    setReport("ZM_MAP_DATA not loaded.");
  } else if (!window.ZMMapValidator) {
    setReport("ZMMapValidator not loaded.");
  } else {
    const allErrors = window.ZMMapValidator.validateMainMapData(window.ZM_MAP_DATA);
    if (allErrors.length) {
      console.error("Map data integrity errors:", allErrors);
      setReport(`Map data integrity warning: ${allErrors[0]}`);
    } else {
      setReport("Ready.");
    }
  }

  render();
  renderPreview();
  initAccessControl();
  updateUserUI();
  ensureDifficultyMeter();
  updateDifficultyMeter();
}

window.openSolverHelp = openSolverHelp;
window.closeSolverHelp = closeSolverHelp;
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
