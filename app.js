const MAX_ROWS = 20;
const STANDARD_ROWS = 13;
const COLS = 7;

let grid = [];
let currentRowCount = STANDARD_ROWS;
let tool = "number";
let lastSelected = { r: 0, c: 0 };
let selectedMapPath = null;
let currentPreviewTitle = "Gate 1";

function setReport(msg) {
  document.getElementById("report").textContent = msg;
}

function initGridData() {
  grid = Array.from({ length: MAX_ROWS }, () => Array(COLS).fill(""));
}

function isGraveyardValue(value) {
  return String(value || "").toLowerCase().includes("graveyard");
}

function setBoardRowCount(rows) {
  currentRowCount = rows;
  render();
  renderPreview();
}

function populateEventTypeSelect() {
  const select = document.getElementById("eventTypeSelect");
  select.innerHTML = '<option value="">Select Event Type</option>';

  Object.keys(window.ZM_MAPS).forEach(key => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = key;
    select.appendChild(opt);
  });
}

function resetMapLoaderBelow(level) {
  document.getElementById("eventNameField").classList.add("hidden");
  document.getElementById("eventMineField").classList.add("hidden");
  document.getElementById("eventChamberField").classList.add("hidden");
  document.getElementById("loadMapBtn").classList.add("hidden");

  document.getElementById("eventNameSelect").innerHTML = '<option value="">Select Event Name</option>';
  document.getElementById("eventMineSelect").innerHTML = '<option value="">Select Event Mine</option>';
  document.getElementById("eventChamberSelect").innerHTML = '<option value="">Select Event Chamber</option>';

  selectedMapPath = null;
}

function handleEventTypeChange() {
  const type = document.getElementById("eventTypeSelect").value;
  resetMapLoaderBelow(1);

  if (!type) return;

  const select = document.getElementById("eventNameSelect");
  document.getElementById("eventNameField").classList.remove("hidden");

  Object.keys(window.ZM_MAPS[type]).forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });
}

function handleEventNameChange() {
  const type = document.getElementById("eventTypeSelect").value;
  const name = document.getElementById("eventNameSelect").value;

  resetMapLoaderBelow(2);

  if (!type || !name) return;

  if (type === "Main") {
    document.getElementById("eventChamberField").classList.remove("hidden");
    const chambers = Object.keys(window.ZM_MAPS.Main[name]);
    const select = document.getElementById("eventChamberSelect");

    chambers.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      select.appendChild(opt);
    });
  }

  if (type === "Legacy") {
    document.getElementById("eventMineField").classList.remove("hidden");
    const mines = Object.keys(window.ZM_MAPS.Legacy[name]);
    const select = document.getElementById("eventMineSelect");

    mines.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      select.appendChild(opt);
    });
  }
}

function handleEventMineChange() {
  const name = document.getElementById("eventNameSelect").value;
  const mine = document.getElementById("eventMineSelect").value;

  resetMapLoaderBelow(3);

  if (!name || !mine) return;

  document.getElementById("eventChamberField").classList.remove("hidden");
  const chambers = Object.keys(window.ZM_MAPS.Legacy[name][mine]);
  const select = document.getElementById("eventChamberSelect");

  chambers.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
}

function handleEventChamberChange() {
  const type = document.getElementById("eventTypeSelect").value;
  const name = document.getElementById("eventNameSelect").value;
  const mine = document.getElementById("eventMineSelect").value;
  const chamber = document.getElementById("eventChamberSelect").value;

  if (!type || !name || !chamber) return;

  selectedMapPath = { type, name, mine, chamber };
  document.getElementById("loadMapBtn").classList.remove("hidden");

  const title =
    type === "Main"
      ? `${name} - ${chamber}`
      : `${name} - ${mine} - ${chamber}`;

  document.getElementById("titleInput").value = title;
  currentPreviewTitle = title;

  // GRID SIZE
  if (isGraveyardValue(chamber)) {
    setBoardRowCount(MAX_ROWS);
  } else {
    setBoardRowCount(STANDARD_ROWS);
  }

  // GATE TYPE AUTO SET
  if (type === "Legacy" && isGraveyardValue(chamber)) {
    document.getElementById("gateType").value = "end";
  }
}

function normalizeMapGrid(sourceGrid, rowCount) {
  const out = Array.from({ length: MAX_ROWS }, () => Array(COLS).fill(""));

  for (let r = 0; r < sourceGrid.length; r++) {
    let row = sourceGrid[r] || [];
    while (row.length < COLS) row.push("");

    for (let c = 0; c < COLS; c++) {
      let val = row[c];

      if (val === "block") val = "X";
      if (val === "bubble") val = "B";

      if (val === "shaft") {
        for (let dr = 0; dr < 3; dr++) {
          for (let dc = 0; dc < 2; dc++) {
            const rr = r + dr;
            const cc = c + dc;
            if (rr < rowCount && cc < COLS) {
              out[rr][cc] = "S";
            }
          }
        }
        continue;
      }

      if (val !== "" && val !== null && val !== undefined) {
        out[r][c] = isNaN(val) ? val : Number(val);
      }
    }
  }

  return out;
}

function loadSelectedMap() {
  if (!selectedMapPath) return;

  let map;

  if (selectedMapPath.type === "Main") {
    map = window.ZM_MAPS.Main[selectedMapPath.name][selectedMapPath.chamber];
  } else {
    map = window.ZM_MAPS.Legacy[selectedMapPath.name][selectedMapPath.mine][selectedMapPath.chamber];
  }

  if (!map) return;

  const isGraveyard = map.isGraveyard;
  setBoardRowCount(isGraveyard ? MAX_ROWS : STANDARD_ROWS);

  grid = normalizeMapGrid(map.grid, currentRowCount);

  document.getElementById("gateType").value = map.type || "standard";

  render();
  renderPreview();
}

function setTool(t) {
  tool = t;
  ["number","block","bubble","shaft"].forEach(id => {
    document.getElementById(`tool-${id}`).classList.remove("tool-active");
  });
  document.getElementById(`tool-${t}`).classList.add("tool-active");
}

function render() {
  const gridEl = document.getElementById("grid");
  gridEl.innerHTML = "";

  for (let r = 0; r < currentRowCount; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement("div");
      const val = grid[r][c];

      cell.className = "cell";
      cell.onclick = () => clickCell(r,c);

      if (val === "X") cell.classList.add("block");
      else if (val === "B") {
        cell.classList.add("bubble");
        cell.textContent = "B";
      }
      else if (val === "S") {
        cell.classList.add("shaft");
        cell.textContent = "S";
      }
      else if (typeof val === "number") {
        cell.textContent = val;
      }

      gridEl.appendChild(cell);
    }
  }
}

function clickCell(r,c){
  if(tool==="block") grid[r][c]=grid[r][c]==="X"?"":"X";
  else if(tool==="bubble") grid[r][c]=grid[r][c]==="B"?"":"B";
  else if(tool==="shaft"){
    const remove=grid[r][c]==="S";
    for(let dr=0;dr<3;dr++){
      for(let dc=0;dc<2;dc++){
        if(grid[r+dr] && grid[r+dr][c+dc]!==undefined){
          grid[r+dr][c+dc]=remove?"":"S";
        }
      }
    }
  }

  render();
  renderPreview();
}

function renderPreview(){}

function init(){
  initGridData();
  populateEventTypeSelect();
  render();
}

window.handleEventTypeChange = handleEventTypeChange;
window.handleEventNameChange = handleEventNameChange;
window.handleEventMineChange = handleEventMineChange;
window.handleEventChamberChange = handleEventChamberChange;
window.loadSelectedMap = loadSelectedMap;
window.setTool = setTool;

window.addEventListener("load", init);
