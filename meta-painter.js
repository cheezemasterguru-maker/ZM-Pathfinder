56px=====================
   ZM META PAINTER
========================= */

const MP_COLS = 7;
const MP_MAX_ROWS = 20;
const MP_MINED_ROWS = 13;

/* =========================
   STATE
========================= */

let mpCurrentTester = null;
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

/* =========================
   TOOL ORDER
========================= */

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

/* =========================
   AUTH (ADMIN ONLY)
========================= */

function metaPainterLogin() {
  const id = String(document.getElementById("adminLoginId").value || "").trim();
  const status = document.getElementById("adminLoginStatus");

  if (!id) {
    status.textContent = "Enter admin ID.";
    return;
  }

  const tester = findTesterById(id);

  if (!tester || !tester.isAdmin) {
    status.textContent = "Admin access denied.";
    return;
  }

  window.currentTester = tester;
  mpCurrentTester = tester;
  saveSession(tester);

  document.getElementById("lockedOverlay").classList.add("hidden");
  document.getElementById("adminBadge").textContent =
    `Admin: ${tester.name} (${tester.id})`;

  status.textContent = "";
}

function mpInitAccess() {
  initializeTesters();

  const session = getStoredSession();

  if (session && session.id) {
    const tester = findTesterById(session.id);

    if (tester && tester.isAdmin) {
      window.currentTester = tester;
      mpCurrentTester = tester;

      document.getElementById("lockedOverlay").classList.add("hidden");
      document.getElementById("adminBadge").textContent =
        `Admin: ${tester.name} (${tester.id})`;
      return;
    }
  }

  document.getElementById("lockedOverlay").classList.remove("hidden");
}

/* =========================
   STATUS
========================= */

function mpStatus(msg) {
  const el = document.getElementById("metaPainterStatus");
  if (el) el.textContent = msg;
}

/* =========================
   DROPDOWNS
========================= */

function mpPopulateEventTypeSelect() {
  const select = document.getElementById("eventTypeSelect");
  select.innerHTML = '<option value="">Select Event Type</option>';

  if (window.ZM_MAP_DATA?.Main) {
    const opt = document.createElement("option");
    opt.value = "Main";
    opt.textContent = "Main";
    select.appendChild(opt);
  }

  if (window.ZM_MAP_DATA?.Legacy) {
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

  if (level <= 1) eventName.innerHTML = '<option value="">Select Event Name</option>';
  if (level <= 2) eventMine.innerHTML = '<option value="">Select Event Mine</option>';
  if (level <= 3) chamber.innerHTML = '<option value="">Select Chamber</option>';

  mpSelectedMapPath = null;
}

function mpHandleEventTypeChange() {
  const type = document.getElementById("eventTypeSelect").value;
  const eventName = document.getElementById("eventNameSelect");

  mpResetBelow(1);

  if (!type) return;

  const names = Object.keys(window.ZM_MAP_DATA[type] || {});

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

  mpResetBelow(2);
  if (!type || !name) return;

  const chambers = Object.keys(window.ZM_MAP_DATA[type][name] || {});

  chambers.forEach(ch => {
    const opt = document.createElement("option");
    opt.value = ch;
    opt.textContent = ch;
    chamber.appendChild(opt);
  });
}

function mpHandleEventMineChange() {}

function mpHandleEventChamberChange() {
  const type = document.getElementById("eventTypeSelect").value;
  const name = document.getElementById("eventNameSelect").value;
  const chamber = document.getElementById("eventChamberSelect").value;

  if (!type || !name || !chamber) return;

  mpSelectedMapPath = { eventType: type, eventName: name, chamberName: chamber };
}

/* =========================
   LOAD MAP
========================= */

function mpLoadSelectedChamber() {
  const path = mpSelectedMapPath;
  if (!path) {
    mpStatus("Select a chamber first.");
    return;
  }

  const record =
    window.ZM_MAP_DATA?.[path.eventType]?.[path.eventName]?.[path.chamberName];

  if (!record) {
    mpStatus("Map not found.");
    return;
  }

  mpCurrentContext = path;

  const source = record.grid || [];

  mpCurrentRowCount =
    path.chamberName.toLowerCase() === "graveyard"
      ? MP_MAX_ROWS
      : MP_MINED_ROWS;

  mpCurrentBaseGrid = Array.from({ length: MP_MAX_ROWS }, (_, r) =>
    Array.from({ length: MP_COLS }, (_, c) => source[r]?.[c] ?? "")
  );

  mpCurrentMeta =
    window.ZM_TILE_META?.[path.eventType]?.[path.eventName]?.[path.chamberName]?.tiles
      ? JSON.parse(JSON.stringify(
          window.ZM_TILE_META[path.eventType][path.eventName][path.chamberName].tiles
        ))
      : {};

  mpRenderGrid();
  mpGenerateOutput();

  mpStatus(`Loaded ${path.eventName} - ${path.chamberName}`);
}

/* =========================
   TOOLS
========================= */

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

/* =========================
   GRID RENDER
========================= */

function mpClickTile(r, c) {
  const val = mpCurrentBaseGrid[r][c];
  if (typeof val !== "number") return;

  const key = `${r},${c}`;

  if (mpCurrentTool === "plain" || mpCurrentTool === "clear") {
    delete mpCurrentMeta[key];
  } else {
    if (mpCurrentTool.startsWith("chest:")) {
      mpCurrentMeta[key] = {
        object: "chest",
        subtype: mpCurrentTool.split(":")[1]
      };
    } else {
      mpCurrentMeta[key] = { object: mpCurrentTool };
    }
  }

  mpRenderGrid();
  mpGenerateOutput();
}

function mpRenderGrid() {
  const grid = document.getElementById("metaGrid");
  grid.innerHTML = "";
  grid.style.gridTemplateColumns = `repeat(${MP_COLS}, 42px)`;

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

/* =========================
   OUTPUT
========================= */

function mpGenerateOutput() {
  const box = document.getElementById("outputBox");

  const entries = Object.entries(mpCurrentMeta).sort((a, b) => {
    const [ar, ac] = a[0].split(",").map(Number);
    const [br, bc] = b[0].split(",").map(Number);
    return ar - br || ac - bc;
  });

  let out = `"${mpCurrentContext.chamberName}": {\n  tiles: {\n`;

  entries.forEach(([key, meta], i) => {
    let line = `    "${key}": { object: "${meta.object}"`;
    if (meta.subtype) line += `, subtype: "${meta.subtype}"`;
    line += " }";
    if (i < entries.length - 1) line += ",";
    out += line + "\n";
  });

  out += "  }\n}";

  box.value = out;
}

function mpCopyOutput() {
  navigator.clipboard.writeText(document.getElementById("outputBox").value);
  mpStatus("Copied.");
}

function mpDownloadOutput() {
  const text = document.getElementById("outputBox").value;
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "tile-meta.txt";
  a.click();

  URL.revokeObjectURL(url);
}

function mpClearCurrentMetadata() {
  mpCurrentMeta = {};
  mpRenderGrid();
  mpGenerateOutput();
}

/* =========================
   INIT
========================= */

window.addEventListener("load", () => {
  mpInitAccess();
  mpPopulateEventTypeSelect();
  mpBuildToolGrid();
});
