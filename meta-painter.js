const MP_COLS = 7;
const MP_MAX_ROWS = 20;
const MP_MINED_ROWS = 15;

const MP_LEGACY_EVENT_ORDER = [
  "Love Story",
  "Clover Valley",
  "Easter Egg Hunt",
  "4th of July",
  "Mystery Reef",
  "Teamwork Festival",
  "Halloween",
  "Fall Festival",
  "Winter Break"
];

const MP_LEGACY_MINE_ORDER = [
  "Mine 1",
  "Mine 2",
  "Mine 3",
  "Mine 4",
  "Mine 5",
  "The Deep"
];

let mpSelectedMapPath = null;
let mpCurrentBaseGrid = [];
let mpCurrentRowCount = MP_MINED_ROWS;
let mpCurrentTool = "plain";

let mpCurrentContext = {
  eventType: null,
  eventName: null,
  eventMine: null,
  chamberName: null
};

let mpCurrentMeta = {};
let mpUndoStack = [];

const MP_TOOL_ORDER = [
  "gems",
  "badges",
  "emblems",
  "keys",
  "essence",
  "stickers",
  "chest:wood",
  "chest:iron",
  "chest:steel",
  "chest:silver",
  "chest:gold"
];

function mpStatus(msg) {
  const el = document.getElementById("metaPainterStatus");
  if (el) el.textContent = msg;
}

function mpCloneMeta(meta) {
  return JSON.parse(JSON.stringify(meta || {}));
}

function mpPushUndoState() {
  mpUndoStack.push(mpCloneMeta(mpCurrentMeta));
  if (mpUndoStack.length > 100) {
    mpUndoStack.shift();
  }
}

function mpUndoLastAction() {
  if (!mpUndoStack.length) {
    mpStatus("Nothing to undo.");
    return;
  }

  mpCurrentMeta = mpUndoStack.pop();
  mpRenderGrid();
  mpGenerateOutput();
  mpStatus("Undo applied.");
}

function mpHasUsableGridRecord(record) {
  if (!record || typeof record !== "object") return false;
  if (!Array.isArray(record.grid) || !record.grid.length) return false;

  return record.grid.some(row =>
    Array.isArray(row) &&
    row.some(cell => cell !== "" && cell !== null && cell !== undefined)
  );
}

function mpHasAnyMainDeepData(eventName) {
  const event = window.ZM_MAP_DATA?.MainDeep?.[eventName];
  if (!event || typeof event !== "object") return false;
  return Object.values(event).some(record => mpHasUsableGridRecord(record));
}

function mpHasAnyMainData(eventName) {
  const event = window.ZM_MAP_DATA?.Main?.[eventName];
  if (!event || typeof event !== "object") return false;
  return Object.values(event).some(record => mpHasUsableGridRecord(record));
}

function mpHasAnyLegacyMineData(eventName, mineName) {
  const mine = window.ZM_MAP_DATA?.Legacy?.[eventName]?.[mineName];
  if (!mine || typeof mine !== "object") return false;
  return Object.values(mine).some(record => mpHasUsableGridRecord(record));
}

function mpHasAnyLegacyEventData(eventName) {
  const mines = window.ZM_MAP_DATA?.Legacy?.[eventName] || {};
  return Object.keys(mines).some(mineName => mpHasAnyLegacyMineData(eventName, mineName));
}

function mpUniqueOrdered(primary, secondary) {
  const out = [];
  const seen = new Set();

  [...primary, ...secondary].forEach(value => {
    if (!value || seen.has(value)) return;
    seen.add(value);
    out.push(value);
  });

  return out;
}

function mpGetOrderedMainDeepNames() {
  const libraryNames = Object.keys(window.ZM_MAP_LIBRARY?.MainDeep || {});
  const dataNames = Object.keys(window.ZM_MAP_DATA?.MainDeep || {});
  return mpUniqueOrdered(
    libraryNames.filter(name => mpHasAnyMainDeepData(name)),
    dataNames.filter(name => mpHasAnyMainDeepData(name))
  );
}

function mpGetOrderedMainNames() {
  const libraryNames = Object.keys(window.ZM_MAP_LIBRARY?.Main || {});
  const dataNames = Object.keys(window.ZM_MAP_DATA?.Main || {});
  return mpUniqueOrdered(
    libraryNames.filter(name => mpHasAnyMainData(name)),
    dataNames.filter(name => mpHasAnyMainData(name))
  );
}

function mpGetOrderedLegacyNames() {
  const libraryNames = Object.keys(window.ZM_MAP_LIBRARY?.Legacy || {});
  const dataNames = Object.keys(window.ZM_MAP_DATA?.Legacy || {});

  return mpUniqueOrdered(
    MP_LEGACY_EVENT_ORDER.filter(name => mpHasAnyLegacyEventData(name)),
    mpUniqueOrdered(
      libraryNames.filter(name => mpHasAnyLegacyEventData(name)),
      dataNames.filter(name => mpHasAnyLegacyEventData(name))
    )
  );
}

function mpGetOrderedMainDeepChambers(eventName) {
  const libraryChambers = window.ZM_MAP_LIBRARY?.MainDeep?.[eventName] || [];
  const dataChambers = Object.keys(window.ZM_MAP_DATA?.MainDeep?.[eventName] || {});
  return mpUniqueOrdered(
    libraryChambers.filter(ch => mpHasUsableGridRecord(window.ZM_MAP_DATA?.MainDeep?.[eventName]?.[ch])),
    dataChambers.filter(ch => mpHasUsableGridRecord(window.ZM_MAP_DATA?.MainDeep?.[eventName]?.[ch]))
  );
}

function mpGetOrderedMainChambers(eventName) {
  const libraryChambers = window.ZM_MAP_LIBRARY?.Main?.[eventName] || [];
  const dataChambers = Object.keys(window.ZM_MAP_DATA?.Main?.[eventName] || {});
  return mpUniqueOrdered(
    libraryChambers.filter(ch => mpHasUsableGridRecord(window.ZM_MAP_DATA?.Main?.[eventName]?.[ch])),
    dataChambers.filter(ch => mpHasUsableGridRecord(window.ZM_MAP_DATA?.Main?.[eventName]?.[ch]))
  );
}

function mpGetOrderedLegacyMines(eventName) {
  const libraryMines = Object.keys(window.ZM_MAP_LIBRARY?.Legacy?.[eventName] || {});
  const dataMines = Object.keys(window.ZM_MAP_DATA?.Legacy?.[eventName] || {});

  return mpUniqueOrdered(
    MP_LEGACY_MINE_ORDER.filter(mine => mpHasAnyLegacyMineData(eventName, mine)),
    mpUniqueOrdered(
      libraryMines.filter(mine => mpHasAnyLegacyMineData(eventName, mine)),
      dataMines.filter(mine => mpHasAnyLegacyMineData(eventName, mine))
    )
  );
}

function mpGetOrderedLegacyChambers(eventName, mineName) {
  const libraryChambers = window.ZM_MAP_LIBRARY?.Legacy?.[eventName]?.[mineName] || [];
  const dataChambers = Object.keys(window.ZM_MAP_DATA?.Legacy?.[eventName]?.[mineName] || {});
  return mpUniqueOrdered(
    libraryChambers.filter(ch => mpHasUsableGridRecord(window.ZM_MAP_DATA?.Legacy?.[eventName]?.[mineName]?.[ch])),
    dataChambers.filter(ch => mpHasUsableGridRecord(window.ZM_MAP_DATA?.Legacy?.[eventName]?.[mineName]?.[ch]))
  );
}

function mpPopulateEventTypeSelect() {
  const select = document.getElementById("eventTypeSelect");
  select.innerHTML = '<option value="">Select Event Type</option>';

  const mainDeepNames = mpGetOrderedMainDeepNames();
  const mainNames = mpGetOrderedMainNames();
  const legacyNames = mpGetOrderedLegacyNames();

  if (mainDeepNames.length) {
    const opt = document.createElement("option");
    opt.value = "MainDeep";
    opt.textContent = "Main DEEP";
    select.appendChild(opt);
  }

  if (mainNames.length) {
    const opt = document.createElement("option");
    opt.value = "Main";
    opt.textContent = "Main";
    select.appendChild(opt);
  }

  if (legacyNames.length) {
    const opt = document.createElement("option");
    opt.value = "Legacy";
    opt.textContent = "Legacy";
    select.appendChild(opt);
  }
}

function mpResetBelow(level) {
  const eventName = document.getElementById("eventNameSelect");
  const eventMine = document.getElementById("eventMineSelect");
  const chamber = document.getElementById("eventChamberSelect");
  const eventMineField = document.getElementById("eventMineField");

  if (level <= 1) eventName.innerHTML = '<option value="">Select Event Name</option>';
  if (level <= 2) {
    eventMine.innerHTML = '<option value="">Select Event Mine</option>';
    eventMineField.classList.add("hidden");
  }
  if (level <= 3) chamber.innerHTML = '<option value="">Select Chamber</option>';

  mpSelectedMapPath = null;
}

function mpHandleEventTypeChange() {
  const type = document.getElementById("eventTypeSelect").value;
  const eventName = document.getElementById("eventNameSelect");

  mpResetBelow(1);

  if (!type) return;

  let names = [];

  if (type === "MainDeep") {
    names = mpGetOrderedMainDeepNames();
  } else if (type === "Main") {
    names = mpGetOrderedMainNames();
  } else if (type === "Legacy") {
    names = mpGetOrderedLegacyNames();
  }

  names.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    eventName.appendChild(opt);
  });
}

function mpHandleEventNameChange() {
  const type = document.getElementById("eventTypeSelect").value;
  const name = document.getElementById("eventNameSelect").value;
  const chamber = document.getElementById("eventChamberSelect");
  const eventMine = document.getElementById("eventMineSelect");
  const eventMineField = document.getElementById("eventMineField");

  mpResetBelow(2);
  if (!type || !name) return;

  if (type === "MainDeep") {
    const chambers = mpGetOrderedMainDeepChambers(name);

    chambers.forEach(ch => {
      const opt = document.createElement("option");
      opt.value = ch;
      opt.textContent = ch;
      chamber.appendChild(opt);
    });
  } else if (type === "Main") {
    const chambers = mpGetOrderedMainChambers(name);

    chambers.forEach(ch => {
      const opt = document.createElement("option");
      opt.value = ch;
      opt.textContent = ch;
      chamber.appendChild(opt);
    });
  } else {
    const mines = mpGetOrderedLegacyMines(name);

    if (!mines.length) return;

    eventMineField.classList.remove("hidden");

    mines.forEach(mine => {
      const opt = document.createElement("option");
      opt.value = mine;
      opt.textContent = mine;
      eventMine.appendChild(opt);
    });
  }
}

function mpHandleEventMineChange() {
  const name = document.getElementById("eventNameSelect").value;
  const mine = document.getElementById("eventMineSelect").value;
  const chamber = document.getElementById("eventChamberSelect");

  mpResetBelow(3);
  if (!name || !mine) return;

  const chambers = mpGetOrderedLegacyChambers(name, mine);

  chambers.forEach(ch => {
    const opt = document.createElement("option");
    opt.value = ch;
    opt.textContent = ch;
    chamber.appendChild(opt);
  });
}

function mpHandleEventChamberChange() {
  const type = document.getElementById("eventTypeSelect").value;
  const name = document.getElementById("eventNameSelect").value;
  const mine = document.getElementById("eventMineSelect").value;
  const chamber = document.getElementById("eventChamberSelect").value;

  if (!type || !name || !chamber) return;

  if (type === "MainDeep") {
    mpSelectedMapPath = { eventType: type, eventName: name, chamberName: chamber };
  } else if (type === "Main") {
    mpSelectedMapPath = { eventType: type, eventName: name, chamberName: chamber };
  } else {
    mpSelectedMapPath = { eventType: type, eventName: name, eventMine: mine, chamberName: chamber };
  }
}

function mpLoadSelectedChamber() {
  const path = mpSelectedMapPath;
  if (!path) {
    mpStatus("Select a chamber first.");
    return;
  }

  let record = null;

  if (path.eventType === "MainDeep") {
    record = window.ZM_MAP_DATA?.MainDeep?.[path.eventName]?.[path.chamberName];
  } else if (path.eventType === "Main") {
    record = window.ZM_MAP_DATA?.Main?.[path.eventName]?.[path.chamberName];
  } else {
    record = window.ZM_MAP_DATA?.Legacy?.[path.eventName]?.[path.eventMine]?.[path.chamberName];
  }

  if (!record) {
    mpStatus("Map not found.");
    return;
  }

  mpCurrentContext = {
    eventType: path.eventType,
    eventName: path.eventName,
    eventMine: path.eventMine || null,
    chamberName: path.chamberName
  };

  const source = record.grid || [];

  mpCurrentRowCount =
    String(path.chamberName || "").trim().toLowerCase() === "graveyard"
      ? MP_MAX_ROWS
      : MP_MINED_ROWS;

  mpCurrentBaseGrid = Array.from({ length: MP_MAX_ROWS }, (_, r) =>
    Array.from({ length: MP_COLS }, (_, c) => source[r]?.[c] ?? "")
  );

  mpUndoStack = [];

  if (path.eventType === "Legacy") {
    mpCurrentMeta =
      window.ZM_TILE_META?.[path.eventType]?.[path.eventName]?.[path.eventMine]?.[path.chamberName]?.tiles
        ? JSON.parse(
            JSON.stringify(window.ZM_TILE_META[path.eventType][path.eventName][path.eventMine][path.chamberName].tiles)
          )
        : {};
  } else {
    mpCurrentMeta =
      window.ZM_TILE_META?.[path.eventType]?.[path.eventName]?.[path.chamberName]?.tiles
        ? JSON.parse(
            JSON.stringify(window.ZM_TILE_META[path.eventType][path.eventName][path.chamberName].tiles)
          )
        : {};
  }

  mpRenderGrid();
  mpGenerateOutput();

  const statusParts = [path.eventName];
  if (path.eventType === "Legacy" && path.eventMine) statusParts.push(path.eventMine);
  statusParts.push(path.chamberName);

  mpStatus(`Loaded ${statusParts.join(" - ")}`);
}

function mpSetTool(tool) {
  mpCurrentTool = tool;

  document.querySelectorAll(".tool-btn").forEach(b => b.classList.remove("active"));
  const btn = document.querySelector(`[data-tool="${tool}"]`);
  if (btn) btn.classList.add("active");
}

function mpBuildToolGrid() {
  const grid = document.getElementById("toolGrid");
  grid.innerHTML = "";

  MP_TOOL_ORDER.forEach(tool => {
    const btn = document.createElement("button");
    btn.className = "tool-btn";
    btn.dataset.tool = tool;
    btn.type = "button";

    let label = tool;
    let fill = "#e5e7eb";

    if (tool.startsWith("chest:")) {
      const subtype = tool.split(":")[1];
      const def = window.ZM_OBJECT_TYPES.chest.subtypes[subtype];
      label = def.code;
      fill = typeof def.fill === "string"
        ? def.fill
        : `linear-gradient(135deg, ${def.fill.colors[0]} 50%, ${def.fill.colors[1]} 50%)`;
    } else {
      const def = window.ZM_OBJECT_TYPES[tool];
      label = def.code;
      fill = typeof def.fill === "string"
        ? def.fill
        : `linear-gradient(135deg, ${def.fill.colors[0]} 50%, ${def.fill.colors[1]} 50%)`;
    }

    btn.textContent = label;
    btn.style.background = fill;
    btn.onclick = () => mpSetTool(tool);

    grid.appendChild(btn);
  });

  mpSetTool("plain");
}

function mpClickTile(r, c) {
  const val = mpCurrentBaseGrid[r][c];
  if (typeof val !== "number") return;

  const key = `${r},${c}`;
  mpPushUndoState();

  if (mpCurrentTool === "plain" || mpCurrentTool === "clear") {
    delete mpCurrentMeta[key];
  } else if (mpCurrentTool.startsWith("chest:")) {
    mpCurrentMeta[key] = {
      object: "chest",
      subtype: mpCurrentTool.split(":")[1]
    };
  } else {
    mpCurrentMeta[key] = { object: mpCurrentTool };
  }

  mpRenderGrid();
  mpGenerateOutput();
}

function mpRenderGrid() {
  const grid = document.getElementById("metaGrid");
  grid.innerHTML = "";
  grid.style.gridTemplateColumns = `repeat(${MP_COLS}, 40px)`;

  for (let r = 0; r < mpCurrentRowCount; r++) {
    for (let c = 0; c < MP_COLS; c++) {
      const val = mpCurrentBaseGrid[r][c];
      const cell = document.createElement("div");
      cell.className = "meta-cell";

      if (val === "X") {
        cell.classList.add("blocked");
        cell.textContent = "X";
      } else if (val === "B") {
        cell.classList.add("bubble");
        cell.textContent = "B";
      } else if (val === "S") {
        cell.classList.add("shaft");
        cell.textContent = "S";
      } else if (typeof val === "number") {
        cell.classList.add("paintable");

        const num = document.createElement("div");
        num.className = "base-number";
        num.textContent = val;

        const meta = mpCurrentMeta[`${r},${c}`];

        if (meta) {
          let code = "";
          let fill = "";

          if (meta.object === "chest") {
            const def = window.ZM_OBJECT_TYPES.chest.subtypes[meta.subtype];
            code = def.code;
            fill = def.fill;
          } else {
            const def = window.ZM_OBJECT_TYPES[meta.object];
            code = def.code;
            fill = def.fill;
          }

          if (fill) {
            if (typeof fill === "string") {
              cell.style.background = fill;
            } else {
              cell.style.background =
                `linear-gradient(135deg, ${fill.colors[0]} 50%, ${fill.colors[1]} 50%)`;
            }
          }

          const label = document.createElement("div");
          label.className = "base-type";
          label.textContent = code;
          cell.appendChild(num);
          cell.appendChild(label);
        } else {
          cell.appendChild(num);
        }

        cell.onclick = () => mpClickTile(r, c);
      }

      grid.appendChild(cell);
    }
  }
}

function mpGenerateOutput() {
  const box = document.getElementById("outputBox");

  if (!mpCurrentContext.chamberName) {
    box.value = "";
    return;
  }

  const entries = Object.entries(mpCurrentMeta).sort((a, b) => {
    const [ar, ac] = a[0].split(",").map(Number);
    const [br, bc] = b[0].split(",").map(Number);
    return ar - br || ac - bc;
  });

  let out = "";

  if (mpCurrentContext.eventType === "Legacy" && mpCurrentContext.eventMine) {
    out += `"${mpCurrentContext.eventMine}": {\n`;
    out += `  "${mpCurrentContext.chamberName}": {\n`;
    out += `    tiles: {\n`;
  } else {
    out += `"${mpCurrentContext.chamberName}": {\n`;
    out += `  tiles: {\n`;
  }

  entries.forEach(([key, meta], i) => {
    let line = `      "${key}": { object: "${meta.object}"`;
    if (meta.subtype) line += `, subtype: "${meta.subtype}"`;
    line += " }";
    if (i < entries.length - 1) line += ",";
    out += line + "\n";
  });

  if (mpCurrentContext.eventType === "Legacy" && mpCurrentContext.eventMine) {
    out += `    }\n`;
    out += `  }\n`;
    out += `}`;
  } else {
    out += "  }\n}";
  }

  box.value = out;
}

function mpCopyOutput() {
  const text = document.getElementById("outputBox").value;
  if (!text.trim()) {
    mpStatus("Nothing to copy.");
    return;
  }

  navigator.clipboard.writeText(text)
    .then(() => mpStatus("Copied."))
    .catch(() => mpStatus("Copy failed."));
}

function mpDownloadOutput() {
  const text = document.getElementById("outputBox").value;
  if (!text.trim()) {
    mpStatus("Nothing to download.");
    return;
  }

  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "tile-meta.txt";
  a.click();

  URL.revokeObjectURL(url);
  mpStatus("Downloaded.");
}

function mpClearCurrentMetadata() {
  mpPushUndoState();
  mpCurrentMeta = {};
  mpRenderGrid();
  mpGenerateOutput();
  mpStatus("Current chamber metadata cleared.");
}

window.mpHandleEventTypeChange = mpHandleEventTypeChange;
window.mpHandleEventNameChange = mpHandleEventNameChange;
window.mpHandleEventMineChange = mpHandleEventMineChange;
window.mpHandleEventChamberChange = mpHandleEventChamberChange;
window.mpLoadSelectedChamber = mpLoadSelectedChamber;
window.mpSetTool = mpSetTool;
window.mpGenerateOutput = mpGenerateOutput;
window.mpCopyOutput = mpCopyOutput;
window.mpDownloadOutput = mpDownloadOutput;
window.mpClearCurrentMetadata = mpClearCurrentMetadata;
window.mpUndoLastAction = mpUndoLastAction;

window.addEventListener("load", () => {
  mpPopulateEventTypeSelect();
  mpBuildToolGrid();
});
