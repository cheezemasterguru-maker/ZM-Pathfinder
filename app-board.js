function renderRouteAudit(routeAnalysis) {
  const body = getRouteReportBody();
  if (!body) return;

  const shaftData = getCurrentChamberShaftData();
  const shaftClusters = getOrderedPhysicalShaftClusters();

  body.innerHTML = "";
  body.style.whiteSpace = "normal";
  body.style.wordBreak = "break-word";
  body.style.overflowWrap = "anywhere";
  body.style.boxSizing = "border-box";
  body.style.maxWidth = "100%";

  const summarySection = document.createElement("div");
  summarySection.className = "help-section";
  summarySection.style.whiteSpace = "normal";
  summarySection.style.wordBreak = "break-word";
  summarySection.style.overflowWrap = "anywhere";
  summarySection.style.maxWidth = "100%";

  const summaryTitle = document.createElement("h3");
  summaryTitle.textContent = t("solveSummary");

  const summaryText = document.createElement("p");
  summaryText.style.whiteSpace = "normal";
  summaryText.style.wordBreak = "break-word";
  summaryText.style.overflowWrap = "anywhere";
  summaryText.innerHTML =
    `${t("solve")}: <b>${solveState.solved ? t("solvedYes") : t("solvedNo")}</b><br>` +
    `Solver version: <b>${solveState.solverVersion || "unknown"}</b><br>` +
    `Legacy end mode: <b>${solveState.legacyEndMode ? "Yes" : "No"}</b><br>` +
    `Red bubble count: <b>${solveState.redBubbleCount ?? 0}</b><br>` +
    `First bubble travel cost: <b>${solveState.firstBubbleTravelCost ?? "n/a"}</b><br>` +
    `Red cost: <b>${solveState.redCost ?? "n/a"}</b> | Blue cost: <b>${solveState.blueCost ?? "n/a"}</b><br>` +
    `Object priority score: <b>${solveState.objectPriorityScore ?? 0}</b><br>` +
    `Effective total: <b>${solveState.effectiveTotal ?? "n/a"}</b><br>` +
    `Red path cells: <b>${solveState.redPath.length}</b><br>` +
    `Blue route count: <b>${solveState.bluePaths.length}</b><br>` +
    `${t("physicalShaftClusters")}: <b>${shaftClusters.length}</b><br>` +
    `${t("shaftData")}: <b>${shaftData.length}</b>`;

  summarySection.appendChild(summaryTitle);
  summarySection.appendChild(summaryText);
  body.appendChild(summarySection);

  const shaftSection = document.createElement("div");
  shaftSection.className = "help-section";
  shaftSection.style.whiteSpace = "normal";
  shaftSection.style.wordBreak = "break-word";
  shaftSection.style.overflowWrap = "anywhere";
  shaftSection.style.maxWidth = "100%";

  const shaftTitle = document.createElement("h3");
  shaftTitle.textContent = t("shaftData");

  const shaftText = document.createElement("p");
  shaftText.style.whiteSpace = "normal";
  shaftText.style.wordBreak = "break-word";
  shaftText.style.overflowWrap = "anywhere";

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
      lines.map((line) => line.replace(/</g, "&lt;").replace(/>/g, "&gt;")).join("<br>");
  }

  shaftSection.appendChild(shaftTitle);
  shaftSection.appendChild(shaftText);
  body.appendChild(shaftSection);

  const physicalSection = document.createElement("div");
  physicalSection.className = "help-section";
  physicalSection.style.whiteSpace = "normal";
  physicalSection.style.wordBreak = "break-word";
  physicalSection.style.overflowWrap = "anywhere";
  physicalSection.style.maxWidth = "100%";

  const physicalTitle = document.createElement("h3");
  physicalTitle.textContent = t("physicalShaftClusters");

  const physicalText = document.createElement("p");
  physicalText.style.whiteSpace = "normal";
  physicalText.style.wordBreak = "break-word";
  physicalText.style.overflowWrap = "anywhere";

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
  reportSection.style.whiteSpace = "normal";
  reportSection.style.wordBreak = "break-word";
  reportSection.style.overflowWrap = "anywhere";
  reportSection.style.maxWidth = "100%";

  const reportTitle = document.createElement("h3");
  reportTitle.textContent = t("routeAnalysis");

  reportSection.appendChild(reportTitle);

  if (!routeAnalysis || !routeAnalysis.length) {
    const emptyText = document.createElement("p");
    emptyText.style.whiteSpace = "normal";
    emptyText.style.wordBreak = "break-word";
    emptyText.style.overflowWrap = "anywhere";
    emptyText.innerHTML = t("noRouteAnalysis");
    reportSection.appendChild(emptyText);
    body.appendChild(reportSection);
    return;
  }

  const approved = routeAnalysis.filter((item) => item.approved);
  const rejected = routeAnalysis.filter((item) => !item.approved);

  function makeRouteBox(item, isApproved) {
    const box = document.createElement("div");
    box.style.borderRadius = "16px";
    box.style.padding = "12px 14px";
    box.style.marginTop = "12px";
    box.style.border = `2px solid ${isApproved ? "rgba(34,197,94,0.55)" : "rgba(239,68,68,0.35)"}`;
    box.style.background = isApproved ? "rgba(34,197,94,0.14)" : "rgba(239,68,68,0.10)";
    box.style.color = "#fff";
    box.style.boxSizing = "border-box";
    box.style.maxWidth = "100%";
    box.style.whiteSpace = "normal";
    box.style.wordBreak = "break-word";
    box.style.overflowWrap = "anywhere";
    box.style.overflow = "hidden";

    const heading = document.createElement("div");
    heading.textContent = isApproved ? t("approvedRoute") : t("ignoredRoute");
    heading.style.fontWeight = "700";
    heading.style.fontSize = "18px";
    heading.style.marginBottom = "8px";
    heading.style.whiteSpace = "normal";
    heading.style.wordBreak = "break-word";
    heading.style.overflowWrap = "anywhere";

    const pathLine = document.createElement("div");
    pathLine.textContent = item.redPathValues;
    pathLine.style.fontWeight = "700";
    pathLine.style.fontSize = "16px";
    pathLine.style.lineHeight = "1.4";
    pathLine.style.wordBreak = "break-word";
    pathLine.style.overflowWrap = "anywhere";
    pathLine.style.whiteSpace = "normal";
    pathLine.style.marginBottom = "8px";

    const coords = document.createElement("div");
    coords.textContent = item.redPathCoords;
    coords.style.fontSize = "12px";
    coords.style.lineHeight = "1.45";
    coords.style.wordBreak = "break-word";
    coords.style.overflowWrap = "anywhere";
    coords.style.whiteSpace = "normal";
    coords.style.opacity = "0.92";
    coords.style.marginBottom = "8px";

    const meta = document.createElement("div");
    meta.style.fontSize = "14px";
    meta.style.lineHeight = "1.5";
    meta.style.wordBreak = "break-word";
    meta.style.overflowWrap = "anywhere";
    meta.style.whiteSpace = "normal";

    const redBubbleCount = item.redBubbleCount ?? 0;
    const firstBubbleTravelCost = item.firstBubbleTravelCost ?? "n/a";
    const objectPriorityScore = item.objectPriorityScore ?? 0;

    meta.innerHTML =
      `${t("mode")}: <b>${item.redMode}</b> | ${t("variant")}: <b>${item.redVariant}</b><br>` +
      `Red bubble count: <b>${redBubbleCount}</b> | First bubble travel cost: <b>${firstBubbleTravelCost}</b><br>` +
      `Object priority score: <b>${objectPriorityScore}</b><br>` +
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

  approved.forEach((item) => reportSection.appendChild(makeRouteBox(item, true)));
  rejected.forEach((item) => reportSection.appendChild(makeRouteBox(item, false)));

  body.appendChild(reportSection);
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

function getHtmlCodeFontSize(code) {
  const len = String(code || "").length;
  if (len >= 6) return "8px";
  if (len === 5) return "9px";
  if (len === 4) return "10px";
  return "11px";
}

function getCanvasCodeFontSize(code) {
  const len = String(code || "").length;
  if (len >= 6) return 8;
  if (len === 5) return 9;
  if (len === 4) return 10;
  return 12;
}

function getCanvasNumberFontSize(code) {
  if (!code) return 28;
  const len = String(code).length;
  if (len >= 6) return 21;
  if (len === 5) return 22;
  if (len === 4) return 23;
  return 24;
}

function applyHtmlTileFill(cell, fill) {
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

function drawCanvasTileFill(ctx, x, y, cellSize, fill) {
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

function setTool(nextTool) {
  tool = nextTool;
  ["number", "block", "bubble", "shaft"].forEach((id) => {
    document.getElementById(`tool-${id}`).classList.remove("tool-active");
  });
  document.getElementById(`tool-${nextTool}`).classList.add("tool-active");
}

function render() {
  const gridEl = document.getElementById("grid");
  gridEl.style.gridTemplateColumns = `repeat(${COLS}, minmax(0, 1fr))`;
  gridEl.innerHTML = "";

  for (let r = 0; r < currentRowCount; r++) {
    for (let c = 0; c < COLS; c++) {
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

      if (r === lastSelected.r && c === lastSelected.c) {
        cell.classList.add("selected");
      }

      if (val === "X") {
        cell.classList.add("block");
      } else if (val === "B") {
        cell.classList.add("bubble");
        cell.textContent = "B";
      } else if (val === "S") {
        cell.classList.add("shaft");
        cell.textContent = "S";
      } else if (typeof val === "number") {
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

function clickCell(r, c) {
  if (r >= currentRowCount) return;
  lastSelected = { r, c };

  if (tool === "number") {
    activateInlineNumberEditor(r, c);
    return;
  }

  if (tool === "block") {
    grid[r][c] = grid[r][c] === "X" ? "" : "X";
  } else if (tool === "bubble") {
    grid[r][c] = grid[r][c] === "B" ? "" : "B";
  } else if (tool === "shaft") {
    const removing = grid[r][c] === "S";
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 2; dc++) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr < currentRowCount && grid[rr] && grid[rr][cc] !== undefined) {
          grid[rr][cc] = removing ? "" : "S";
        }
      }
    }
  }

  if (typeof scanActiveObjectTypes === "function") {
    scanActiveObjectTypes();
  }

  resetSolve();
  render();
  renderPreview();
}

function activateInlineNumberEditor(r, c) {
  render();

  const target = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
  if (!target) return;

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
    if (raw === "") {
      grid[r][c] = "";
    } else if (!isNaN(raw) && Number(raw) > 0) {
      grid[r][c] = Number(raw);
    }

    if (typeof scanActiveObjectTypes === "function") {
      scanActiveObjectTypes();
    }

    resetSolve();
    render();
    renderPreview();
  };

  input.onkeydown = (e) => {
    if (e.key === "Enter") input.blur();
  };
}

function parseClipboard(text) {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .filter((row) => row.length > 0)
    .map((row) => row.split("\t"));
}

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    applyText(text);
  } catch (e) {
    setReport(t("clipboardBlocked"));
  }
}

function applyText(text) {
  if (!text) return;

  const data = parseClipboard(text);
  const startR = lastSelected.r;
  const startC = lastSelected.c;

  for (let ri = 0; ri < data.length; ri++) {
    for (let ci = 0; ci < data[ri].length; ci++) {
      const r = startR + ri;
      const c = startC + ci;
      if (r >= currentRowCount) continue;
      if (!grid[r] || grid[r][c] === undefined) continue;

      const raw = data[ri][ci];
      const val = String(raw ?? "");

      if (val === "") {
        continue;
      } else if (!isNaN(val)) {
        grid[r][c] = Number(val);
      } else if (val.toUpperCase() === "X") {
        grid[r][c] = "X";
      } else if (val.toUpperCase() === "B") {
        grid[r][c] = "B";
      } else if (val.toUpperCase() === "S" || val.toUpperCase() === "SHAFT") {
        for (let dr = 0; dr < 3; dr++) {
          for (let dc = 0; dc < 2; dc++) {
            const rr = r + dr;
            const cc = c + dc;
            if (rr < currentRowCount && grid[rr] && grid[rr][cc] !== undefined) {
              grid[rr][cc] = "S";
            }
          }
        }
      }
    }
  }

  if (typeof scanActiveObjectTypes === "function") {
    scanActiveObjectTypes();
  }

  resetSolve();
  render();
  renderPreview();
  setReport(formatT("pastedIntoBoard", { row: startR + 1, col: startC + 1 }));
}

function clearBoard(updateReport = true) {
  for (let r = 0; r < MAX_ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
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

  if (typeof scanActiveObjectTypes === "function") {
    scanActiveObjectTypes();
  }

  resetSolve();
  render();
  renderPreview();
  if (updateReport) setReport(t("boardCleared"));
  updateDifficultyMeter();
}

function loadSampleGrid() {
  clearBoard(false);
  document.getElementById("gateType").value = "standard";
  document.getElementById("titleInput").value = "Gate 1";
  currentPreviewTitle = "Gate 1";
  currentRowCount = MINED_ROWS;

  const sample = [
    [8, 9, 11, 9, 12, 8, 9],
    [10, "X", 8, "X", 7, 11, 7],
    [8, 7, 9, 6, 9, 6, "X"],
    ["X", 8, 6, 8, "B", "S", "S"],
    ["X", 6, 7, 6, 5, "S", "S"],
    ["X", 5, 4, 5, "X", "S", "S"],
    ["X", 4, 5, 4, 5, 4, 6],
    ["S", "S", 4, 5, 4, "X", 5],
    ["S", "S", 3, 4, 3, 5, 4],
    ["S", "S", 2, "", 2, 4, 3],
    [1, 2, "", "", "", 3, ""]
  ];

  for (let r = 0; r < sample.length; r++) {
    for (let c = 0; c < COLS; c++) {
      grid[r][c] = sample[r][c] === undefined ? "" : sample[r][c];
    }
  }

  if (typeof scanActiveObjectTypes === "function") {
    scanActiveObjectTypes();
  }

  resetSolve();
  render();
  renderPreview();
  setReport(t("sampleLoaded"));
  updateDifficultyMeter();
}

function renderPreview() {
  const canvas = document.getElementById("previewCanvas");
  const ctx = canvas.getContext("2d");

  const cell = 86;
  const pad = 22;
  const topPad = 145;

  const usedRows = [];
  for (let r = 0; r < currentRowCount; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] !== "") {
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

      const parts = rawTitle.split(" - ").map((s) => s.trim()).filter(Boolean);

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

function drawBoardAndPaths(ctx, cell, pad, topPad, minRow, maxRow) {
  const rowOffset = minRow;

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = 0; c < COLS; c++) {
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

      if (val === "S") continue;

      let usedCustomFill = false;

      if (typeof val === "number" && visual.fill) {
        usedCustomFill = drawCanvasTileFill(ctx, x, y, cell, visual.fill);
      }

      if (!usedCustomFill) {
        if (val === "X") {
          ctx.fillStyle = "#000";
        } else if (val === "B") {
          ctx.fillStyle = "#8fd3f7";
        } else {
          ctx.fillStyle = "#ececef";
        }
        ctx.fillRect(x, y, cell, cell);
      }

      ctx.strokeStyle = "#171b2e";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, cell, cell);

      if (val === "B") {
        ctx.fillStyle = "#111";
        ctx.font = "700 28px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("B", x + cell / 2, y + cell / 2);
      } else if (typeof val === "number") {
        ctx.fillStyle = "#111";
        ctx.textAlign = "center";

        if (OBJECT_RENDER_MODE === "object_only" && visual.code) {
          ctx.font = "700 22px Arial";
          ctx.textBaseline = "middle";
          ctx.fillText(visual.code, x + cell / 2, y + cell / 2);
        } else {
          if (visual.code) {
            ctx.font = `700 ${getCanvasNumberFontSize(visual.code)}px Arial`;
            ctx.textBaseline = "middle";
            ctx.fillText(String(val), x + cell / 2, y + cell / 2 - 10);

            ctx.font = `700 ${getCanvasCodeFontSize(visual.code)}px Arial`;
            ctx.fillText(visual.code, x + cell / 2, y + cell / 2 + 18);
          } else {
            ctx.font = "700 28px Arial";
            ctx.textBaseline = "middle";
            ctx.fillText(String(val), x + cell / 2, y + cell / 2);
          }
        }
      }
    }
  }

  const shafts = getOrderedPhysicalShaftClusters();
  const shaftData = getCurrentChamberShaftData();

  for (let i = 0; i < shafts.length; i++) {
    const cluster = shafts[i];
    const rows = cluster.map((v) => v[0]);
    const cols = cluster.map((v) => v[1]);
    const minR = Math.min(...rows);
    const maxR = Math.max(...rows);
    const minC = Math.min(...cols);
    const maxC = Math.max(...cols);

    if (maxR < minRow || minR > maxRow) continue;

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

  for (const path of solveState.bluePaths) {
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

function getShaftClustersFromGrid() {
  const seen = new Set();
  const clusters = [];

  for (let r = 0; r < currentRowCount; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] !== "S") continue;
      const key = `${r},${c}`;
      if (seen.has(key)) continue;

      const stack = [[r, c]];
      const cluster = [];

      while (stack.length) {
        const [rr, cc] = stack.pop();
        const k = `${rr},${cc}`;
        if (rr < 0 || cc < 0 || rr >= currentRowCount || cc >= COLS) continue;
        if (grid[rr][cc] !== "S" || seen.has(k)) continue;
        seen.add(k);
        cluster.push([rr, cc]);
        stack.push([rr + 1, cc], [rr - 1, cc], [rr, cc + 1], [rr, cc - 1]);
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

function drawPath(ctx, path, color, width, cell, pad, topPad, rowOffset) {
  if (!path || path.length < 1) return;

  const isRed = color === "#ef4444";
  const isBlue = color === "#2563eb";

  function center(pt) {
    return {
      x: pad + pt[1] * cell + cell / 2,
      y: topPad + (pt[0] - rowOffset) * cell + cell / 2
    };
  }

  function manhattan(a, b) {
    return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
  }

  function isInBounds(r, c) {
    return r >= 0 && c >= 0 && r < currentRowCount && c < COLS;
  }

  function getCellValue(r, c) {
    if (!isInBounds(r, c)) return null;
    return grid[r]?.[c];
  }

  function getBoundaryTouchPoint(fromPt, toPt) {
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

  function getBlueEndpointPoint() {
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

  function getRedEndpointPoint() {
    if (path.length === 1) return center(path[0]);

    const last = path[path.length - 1];
    const attackPoints = Array.isArray(solveState.attackPoints) ? solveState.attackPoints : [];

    if (!attackPoints.length) return center(last);

    const adjacentAttackPoints = attackPoints.filter((pt) => manhattan(last, pt) === 1);

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

  for (let i = 1; i < points.length; i++) {
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

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }

  if (endpoint.x !== lastPoint.x || endpoint.y !== lastPoint.y) {
    ctx.lineTo(endpoint.x, endpoint.y);
  }

  ctx.stroke();
}

function downloadPNG() {
  renderPreview();
  setTimeout(() => {
    const canvas = document.getElementById("previewCanvas");
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(currentPreviewTitle || document.getElementById("titleInput").value || "zm-pathfinder")
      .replace(/\s+/g, "-")
      .toLowerCase()}.png`;
    a.click();
  }, 160);
}

window.setTool = setTool;
window.clearBoard = clearBoard;
window.downloadPNG = downloadPNG;
window.loadSampleGrid = loadSampleGrid;
window.pasteFromClipboard = pasteFromClipboard;
window.renderPreview = renderPreview;
window.renderRouteAudit = renderRouteAudit;
window.getCurrentChamberShaftData = getCurrentChamberShaftData;
window.getCurrentShaftDataPathLabel = getCurrentShaftDataPathLabel;
window.getOrderedPhysicalShaftClusters = getOrderedPhysicalShaftClusters;
window.getShaftDisplayLines = getShaftDisplayLines;
window.getShaftClustersFromGrid = getShaftClustersFromGrid;x
