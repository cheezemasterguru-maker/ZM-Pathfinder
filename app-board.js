(function () {
  "use strict";

  const w = window;

  if (!w.grid) w.grid = Array.from({ length: w.MAX_ROWS || 20 }, () => Array(w.COLS || 7).fill(""));
  if (!w.solveState) {
    w.solveState = {
      redPath: [],
      bluePaths: [],
      shaftEntryDots: [],
      shaftClusters: [],
      attackPoints: [],
      solved: false,
      message: "",
      routeAnalysis: [],
      solverVersion: null,
      solverMode: "standard",
      legacyEndMode: false,
      redBubbleCount: 0,
      firstBubbleTravelCost: null,
      effectiveTotal: null,
      redCost: null,
      blueCost: null,
      redObjectPriorityScore: 0,
      blueObjectPriorityScore: 0,
      objectPriorityScore: 0,
      missingPriorityCount: 0
    };
  }

  if (!Number.isFinite(w.MAX_ROWS)) w.MAX_ROWS = 20;
  if (!Number.isFinite(w.MINED_ROWS)) w.MINED_ROWS = 13;
  if (!Number.isFinite(w.COLS)) w.COLS = 7;
  if (!Number.isFinite(w.currentRowCount)) w.currentRowCount = w.MINED_ROWS;

  if (!w.currentMapContext) {
    w.currentMapContext = {
      eventType: null,
      eventName: null,
      chamberName: null,
      eventMine: null
    };
  }

  if (!w.lastSelected) w.lastSelected = { r: 0, c: 0 };
  if (!w.currentPreviewTitle) w.currentPreviewTitle = "Gate 1";
  if (!w.tool) w.tool = "number";
  if (!w.OBJECT_RENDER_MODE) w.OBJECT_RENDER_MODE = "overlay";

  function t(key) {
    if (typeof w.t === "function" && w.t !== t) return w.t(key);
    return key;
  }

  function formatT(key, values = {}) {
    if (typeof w.formatT === "function" && w.formatT !== formatT) return w.formatT(key, values);
    let out = key;
    Object.keys(values).forEach((k) => {
      out = out.replace(new RegExp(`\\{${k}\\}`, "g"), String(values[k]));
    });
    return out;
  }

  function setReport(msg) {
    if (typeof w.setReport === "function" && w.setReport !== setReport) return w.setReport(msg);
    const el = document.getElementById("report");
    if (el) el.textContent = msg || "";
  }

  function updateDifficultyMeter() {
    if (typeof w.updateDifficultyMeter === "function" && w.updateDifficultyMeter !== updateDifficultyMeter) {
      return w.updateDifficultyMeter();
    }
  }

  function translateShaftType(value) {
    if (typeof w.translateShaftType === "function" && w.translateShaftType !== translateShaftType) {
      return w.translateShaftType(value);
    }
    return String(value || "Shaft");
  }

  function getRouteReportBody() {
    if (typeof w.getRouteReportBody === "function" && w.getRouteReportBody !== getRouteReportBody) {
      return w.getRouteReportBody();
    }
    return document.getElementById("routeReportBody");
  }

  function openRouteReportModal() {
    const el = document.getElementById("routeReportOverlay");
    if (el) el.classList.add("show");
  }

  function closeRouteReportModal() {
    const el = document.getElementById("routeReportOverlay");
    if (el) el.classList.remove("show");
  }

  function getTileMeta(eventType, eventName, chamberName, r, c) {
    if (typeof w.getTileMeta === "function" && w.getTileMeta !== getTileMeta) {
      return w.getTileMeta(eventType, eventName, chamberName, r, c);
    }

    const mineName = w.currentMapContext?.eventMine;

    if (eventType === "Legacy") {
      return (
        w.ZM_TILE_META?.Legacy?.[eventName]?.[mineName]?.[chamberName]?.tiles?.[`${r},${c}`] ||
        { object: "plain" }
      );
    }

    return (
      w.ZM_TILE_META?.[eventType]?.[eventName]?.[chamberName]?.tiles?.[`${r},${c}`] ||
      { object: "plain" }
    );
  }

  function getObjectVisual(meta) {
    if (typeof w.getObjectVisual === "function" && w.getObjectVisual !== getObjectVisual) {
      return w.getObjectVisual(meta);
    }

    if (!meta || !meta.object || meta.object === "plain" || !w.ZM_OBJECT_TYPES) {
      return { code: "", fill: null };
    }

    const objDef = w.ZM_OBJECT_TYPES[meta.object];
    if (!objDef) return { code: "", fill: null };

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

  function getPriorityVisualMeta(objectType) {
    if (typeof w.getPriorityVisualMeta === "function" && w.getPriorityVisualMeta !== getPriorityVisualMeta) {
      return w.getPriorityVisualMeta(objectType);
    }
    return null;
  }

  function scanActiveObjectTypes() {
    if (typeof w.scanActiveObjectTypes === "function" && w.scanActiveObjectTypes !== scanActiveObjectTypes) {
      return w.scanActiveObjectTypes();
    }
    return [];
  }

  function getSolverMode() {
    if (typeof w.getSolverMode === "function" && w.getSolverMode !== getSolverMode) {
      return w.getSolverMode();
    }
    return w.solveState?.solverMode || "standard";
  }

  function getObjectPriorityValue(type) {
    if (typeof w.getObjectPriorityValue === "function" && w.getObjectPriorityValue !== getObjectPriorityValue) {
      return w.getObjectPriorityValue(type);
    }
    return "normal";
  }

  function formatObjectPriorityLabel(type) {
    if (typeof w.formatObjectPriorityLabel === "function" && w.formatObjectPriorityLabel !== formatObjectPriorityLabel) {
      return w.formatObjectPriorityLabel(type);
    }
    return String(type || "");
  }

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
      `${t("solve")}: <b>${w.solveState.solved ? t("solvedYes") : t("solvedNo")}</b><br>` +
      `Solver version: <b>${w.solveState.solverVersion || "unknown"}</b><br>` +
      `Solver mode: <b>${w.solveState.solverMode || "standard"}</b><br>` +
      `Legacy end mode: <b>${w.solveState.legacyEndMode ? "Yes" : "No"}</b><br>` +
      `Red bubble count: <b>${w.solveState.redBubbleCount ?? 0}</b><br>` +
      `First bubble travel cost: <b>${w.solveState.firstBubbleTravelCost ?? "n/a"}</b><br>` +
      `Red cost: <b>${w.solveState.redCost ?? "n/a"}</b> | Blue cost: <b>${w.solveState.blueCost ?? "n/a"}</b><br>` +
      `Object priority score: <b>${w.solveState.objectPriorityScore ?? 0}</b><br>` +
      `Effective total: <b>${w.solveState.effectiveTotal ?? "n/a"}</b><br>` +
      `Red path cells: <b>${w.solveState.redPath.length}</b><br>` +
      `Blue route count: <b>${w.solveState.bluePaths.length}</b><br>` +
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

    if (!w.currentMapContext.eventType || !w.currentMapContext.eventName || !w.currentMapContext.chamberName) {
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

      const pathLine = document.createElement("div");
      pathLine.textContent = item.redPathValues;
      pathLine.style.fontWeight = "700";
      pathLine.style.fontSize = "16px";
      pathLine.style.lineHeight = "1.4";
      pathLine.style.marginBottom = "8px";

      const coords = document.createElement("div");
      coords.textContent = item.redPathCoords;
      coords.style.fontSize = "12px";
      coords.style.lineHeight = "1.45";
      coords.style.opacity = "0.92";
      coords.style.marginBottom = "8px";

      const meta = document.createElement("div");
      meta.style.fontSize = "14px";
      meta.style.lineHeight = "1.5";

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
    const type = w.currentMapContext.eventType;
    const eventName = w.currentMapContext.eventName;
    const chamberName = w.currentMapContext.chamberName;
    const mineName = w.currentMapContext.eventMine;

    if (!type || !eventName || !chamberName || !w.ZM_SHAFT_DATA) return [];

    if (type === "MainDeep") {
      return w.ZM_SHAFT_DATA?.MainDeep?.[eventName]?.[chamberName] || [];
    }

    if (type === "Main") {
      return w.ZM_SHAFT_DATA?.Main?.[eventName]?.[chamberName] || [];
    }

    if (type === "Legacy") {
      return w.ZM_SHAFT_DATA?.Legacy?.[eventName]?.[mineName]?.[chamberName] || [];
    }

    return [];
  }

  function getCurrentShaftDataPathLabel() {
    const type = w.currentMapContext.eventType || "(none)";
    const eventName = w.currentMapContext.eventName || "(none)";
    const chamberName = w.currentMapContext.chamberName || "(none)";
    const mineName = w.currentMapContext.eventMine || null;

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

  function getShaftClustersFromGrid() {
    const seen = new Set();
    const clusters = [];

    for (let r = 0; r < w.currentRowCount; r++) {
      for (let c = 0; c < w.COLS; c++) {
        if (w.grid[r][c] !== "S") continue;
        const key = `${r},${c}`;
        if (seen.has(key)) continue;

        const stack = [[r, c]];
        const cluster = [];

        while (stack.length) {
          const [rr, cc] = stack.pop();
          const k = `${rr},${cc}`;
          if (rr < 0 || cc < 0 || rr >= w.currentRowCount || cc >= w.COLS) continue;
          if (w.grid[rr][cc] !== "S" || seen.has(k)) continue;
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

  function getOrderedPhysicalShaftClusters() {
    if (w.solveState.shaftClusters && w.solveState.shaftClusters.length) {
      return w.solveState.shaftClusters;
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

  function drawCenteredMultilineText(ctx, lines, x, y, wBox, hBox) {
    if (!lines || !lines.length) return;

    const safeLines = lines.filter(Boolean);
    if (!safeLines.length) return;

    let fontSize = Math.max(12, Math.min(26, Math.floor(Math.min(wBox, hBox) / 4.2)));
    const maxWidth = wBox - 16;
    const maxHeight = hBox - 16;

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
    const startY = y + (hBox - totalHeight) / 2 + lineHeight / 2;

    safeLines.forEach((line, i) => {
      ctx.fillText(line, x + wBox / 2, startY + i * lineHeight);
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
    w.tool = nextTool;
    ["number", "block", "bubble", "shaft"].forEach((id) => {
      const el = document.getElementById(`tool-${id}`);
      if (el) el.classList.remove("tool-active");
    });
    const activeEl = document.getElementById(`tool-${nextTool}`);
    if (activeEl) activeEl.classList.add("tool-active");
  }

  function render() {
    const gridEl = document.getElementById("grid");
    if (!gridEl) return;

    gridEl.style.gridTemplateColumns = `repeat(${w.COLS}, minmax(0, 1fr))`;
    gridEl.innerHTML = "";

    for (let r = 0; r < w.currentRowCount; r++) {
      for (let c = 0; c < w.COLS; c++) {
        const cell = document.createElement("div");
        const val = w.grid[r][c];
        const meta = getTileMeta(
          w.currentMapContext.eventType,
          w.currentMapContext.eventName,
          w.currentMapContext.chamberName,
          r,
          c
        );
        const visual = getObjectVisual(meta);

        cell.className = "cell";
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.onclick = () => clickCell(r, c);

        if (r === w.lastSelected.r && c === w.lastSelected.c) {
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

          if (w.OBJECT_RENDER_MODE === "object_only" && visual.code) {
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
    if (r >= w.currentRowCount) return;
    w.lastSelected = { r, c };

    if (w.tool === "number") {
      activateInlineNumberEditor(r, c);
      return;
    }

    if (w.tool === "block") {
      w.grid[r][c] = w.grid[r][c] === "X" ? "" : "X";
    } else if (w.tool === "bubble") {
      w.grid[r][c] = w.grid[r][c] === "B" ? "" : "B";
    } else if (w.tool === "shaft") {
      const removing = w.grid[r][c] === "S";
      for (let dr = 0; dr < 3; dr++) {
        for (let dc = 0; dc < 2; dc++) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr < w.currentRowCount && w.grid[rr] && w.grid[rr][cc] !== undefined) {
            w.grid[rr][cc] = removing ? "" : "S";
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
    input.value = typeof w.grid[r][c] === "number" ? String(w.grid[r][c]) : "";
    target.appendChild(input);
    input.focus();
    input.select();

    input.onblur = () => {
      const raw = input.value.trim();
      if (raw === "") {
        w.grid[r][c] = "";
      } else if (!isNaN(raw) && Number(raw) > 0) {
        w.grid[r][c] = Number(raw);
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
    const startR = w.lastSelected.r;
    const startC = w.lastSelected.c;

    for (let ri = 0; ri < data.length; ri++) {
      for (let ci = 0; ci < data[ri].length; ci++) {
        const r = startR + ri;
        const c = startC + ci;
        if (r >= w.currentRowCount) continue;
        if (!w.grid[r] || w.grid[r][c] === undefined) continue;

        const raw = data[ri][ci];
        const val = String(raw ?? "");

        if (val === "") {
          continue;
        } else if (!isNaN(val)) {
          w.grid[r][c] = Number(val);
        } else if (val.toUpperCase() === "X") {
          w.grid[r][c] = "X";
        } else if (val.toUpperCase() === "B") {
          w.grid[r][c] = "B";
        } else if (val.toUpperCase() === "S" || val.toUpperCase() === "SHAFT") {
          for (let dr = 0; dr < 3; dr++) {
            for (let dc = 0; dc < 2; dc++) {
              const rr = r + dr;
              const cc = c + dc;
              if (rr < w.currentRowCount && w.grid[rr] && w.grid[rr][cc] !== undefined) {
                w.grid[rr][cc] = "S";
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
    for (let r = 0; r < w.MAX_ROWS; r++) {
      for (let c = 0; c < w.COLS; c++) {
        w.grid[r][c] = "";
      }
    }

    w.currentRowCount = w.MINED_ROWS;
    w.currentPreviewTitle = document.getElementById("titleInput")?.value || "Gate 1";
    w.currentMapContext = {
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
    const gateTypeEl = document.getElementById("gateType");
    if (gateTypeEl) gateTypeEl.value = "standard";
    const titleInput = document.getElementById("titleInput");
    if (titleInput) titleInput.value = "Gate 1";
    w.currentPreviewTitle = "Gate 1";
    w.currentRowCount = w.MINED_ROWS;

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
      for (let c = 0; c < w.COLS; c++) {
        w.grid[r][c] = sample[r][c] === undefined ? "" : sample[r][c];
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

  function getPriorityLegendItems() {
    const items = [];
    const currentMode =
      (w.solveState && w.solveState.solverMode) ||
      (typeof getSolverMode === "function" ? getSolverMode() : "standard");

    if (currentMode !== "custom") return items;
    if (typeof scanActiveObjectTypes !== "function") return items;

    const active = scanActiveObjectTypes() || [];
    const priorityOrder = ["priority", "normal", "avoid"];

    function labelForSetting(setting) {
      if (setting === "priority") return "Priority";
      if (setting === "avoid") return "Avoid";
      return "Normal";
    }

    active
      .filter((type) => typeof getObjectPriorityValue === "function")
      .map((type) => ({
        type,
        setting: getObjectPriorityValue(type)
      }))
      .sort((a, b) => {
        const pa = priorityOrder.indexOf(a.setting);
        const pb = priorityOrder.indexOf(b.setting);
        if (pa !== pb) return pa - pb;
        const la = typeof formatObjectPriorityLabel === "function" ? formatObjectPriorityLabel(a.type) : a.type;
        const lb = typeof formatObjectPriorityLabel === "function" ? formatObjectPriorityLabel(b.type) : b.type;
        return la.localeCompare(lb);
      })
      .forEach((item) => {
        items.push({
          type: item.type,
          label: typeof formatObjectPriorityLabel === "function"
            ? formatObjectPriorityLabel(item.type)
            : item.type,
          setting: item.setting,
          settingLabel: labelForSetting(item.setting)
        });
      });

    return items;
  }

  function drawLegendBadge(ctx, item, x, y) {
    const boxSize = 18;
    const radius = 4;

    ctx.save();

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + boxSize - radius, y);
    ctx.quadraticCurveTo(x + boxSize, y, x + boxSize, y + radius);
    ctx.lineTo(x + boxSize, y + boxSize - radius);
    ctx.quadraticCurveTo(x + boxSize, y + boxSize, x + boxSize - radius, y + boxSize);
    ctx.lineTo(x + radius, y + boxSize);
    ctx.quadraticCurveTo(x, y + boxSize, x, y + boxSize - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();

    if (item.type === "gate") {
      ctx.fillStyle = "#f3d36a";
      ctx.fill();
      ctx.fillStyle = "#111";
      ctx.font = "700 11px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("G", x + boxSize / 2, y + boxSize / 2 + 0.5);
    } else if (item.type === "shaft") {
      ctx.fillStyle = "#98f44d";
      ctx.fill();
      ctx.fillStyle = "#111";
      ctx.font = "700 11px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("S", x + boxSize / 2, y + boxSize / 2 + 0.5);
    } else if (item.type === "bubble") {
      ctx.fillStyle = "#8fd3f7";
      ctx.fill();
      ctx.fillStyle = "#111";
      ctx.font = "700 11px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("B", x + boxSize / 2, y + boxSize / 2 + 0.5);
    } else {
      const visualMeta = typeof getPriorityVisualMeta === "function"
        ? getPriorityVisualMeta(item.type)
        : null;
      const visual = typeof getObjectVisual === "function"
        ? getObjectVisual(visualMeta)
        : { code: "", fill: "#2a3558" };

      if (visual.fill) {
        if (typeof visual.fill === "string") {
          ctx.fillStyle = visual.fill;
          ctx.fill();
        } else if (
          visual.fill.type === "dual" &&
          Array.isArray(visual.fill.colors) &&
          visual.fill.colors.length >= 2
        ) {
          const grad = ctx.createLinearGradient(x, y, x + boxSize, y + boxSize);
          grad.addColorStop(0, visual.fill.colors[0]);
          grad.addColorStop(0.499, visual.fill.colors[0]);
          grad.addColorStop(0.5, visual.fill.colors[1]);
          grad.addColorStop(1, visual.fill.colors[1]);
          ctx.fillStyle = grad;
          ctx.fill();
        } else {
          ctx.fillStyle = "#2a3558";
          ctx.fill();
        }
      } else {
        ctx.fillStyle = "#2a3558";
        ctx.fill();
      }

      if (visual.code) {
        ctx.fillStyle = "#111";
        ctx.font = "700 9px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(visual.code, x + boxSize / 2, y + boxSize / 2 + 0.5);
      }
    }

    ctx.strokeStyle = "#171b2e";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  function renderPreview() {
    const canvas = document.getElementById("previewCanvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cell = 86;
    const pad = 22;
    const topPad = 145;

    const legendItems = getPriorityLegendItems();
    const customMode =
      ((w.solveState && w.solveState.solverMode) ||
        (typeof getSolverMode === "function" ? getSolverMode() : "standard")) === "custom";

    const usedRows = [];
    for (let r = 0; r < w.currentRowCount; r++) {
      for (let c = 0; c < w.COLS; c++) {
        if (w.grid[r][c] !== "") {
          usedRows.push(r);
          break;
        }
      }
    }

    const minRow = 0;
    const maxFilled = usedRows.length ? Math.max(...usedRows) : Math.max(4, w.currentRowCount - 1);
    const maxRow = Math.max(w.currentRowCount - 1, maxFilled);
    const visibleRows = maxRow - minRow + 1;

    const legendHeight = customMode
      ? Math.max(120, 42 + Math.ceil(Math.max(1, legendItems.length) / 2) * 24)
      : 120;

    canvas.width = pad * 2 + cell * w.COLS;
    canvas.height = topPad + visibleRows * cell + legendHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const drawEverything = (logoReady, logo) => {
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

      if (logoReady && logo) {
        const logoMaxW = 180;
        const logoMaxH = 110;
        const logoRatio = Math.min(logoMaxW / logo.width, logoMaxH / logo.height, 1);
        const logoW = logo.width * logoRatio;
        const logoH = logo.height * logoRatio;

        ctx.drawImage(
          logo,
          logoBoxX + (logoBoxW - logoW) / 2,
          logoBoxY + (logoBoxH - logoH) / 2,
          logoW,
          logoH
        );
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(logoBoxX, logoBoxY, logoBoxW, logoBoxH);
        ctx.strokeStyle = "#171b2e";
        ctx.lineWidth = 2;
        ctx.strokeRect(logoBoxX, logoBoxY, logoBoxW, logoBoxH);
        ctx.fillStyle = "#111";
        ctx.font = "700 26px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("ZM", logoBoxX + logoBoxW / 2, logoBoxY + logoBoxH / 2);
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(titleBoxX, titleBoxY, titleBoxW, titleBoxH);
      ctx.strokeStyle = "#171b2e";
      ctx.lineWidth = 2;
      ctx.strokeRect(titleBoxX, titleBoxY, titleBoxW, titleBoxH);

      const rawTitle = String(
        w.currentPreviewTitle || document.getElementById("titleInput")?.value || "Gate"
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

      drawBoardAndPaths(ctx, cell, pad, topPad, minRow, maxRow, legendHeight, legendItems, customMode);
    };

    const logo = new Image();
    logo.onload = () => drawEverything(true, logo);
    logo.onerror = () => drawEverything(false, null);
    logo.src = "file_00000000e35071fda5e92d9996ac3621.png";
  }

  function drawBoardAndPaths(ctx, cell, pad, topPad, minRow, maxRow, legendHeight, legendItems, customMode) {
    const rowOffset = minRow;

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = 0; c < w.COLS; c++) {
        const x = pad + c * cell;
        const y = topPad + (r - rowOffset) * cell;
        const val = w.grid[r][c];
        const meta = getTileMeta(
          w.currentMapContext.eventType,
          w.currentMapContext.eventName,
          w.currentMapContext.chamberName,
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

          if (w.OBJECT_RENDER_MODE === "object_only" && visual.code) {
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
      const width = (maxC - minC + 1) * cell;
      const height = (maxR - minR + 1) * cell;

      ctx.fillStyle = "#98f44d";
      ctx.fillRect(x, y, width, height);
      ctx.strokeStyle = "#171b2e";
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);

      drawCenteredMultilineText(ctx, getShaftDisplayLines(i, shaftData), x, y, width, height);
    }

    const customColor = "#a855f7";

    if (customMode) {
      for (const path of w.solveState.bluePaths) {
        drawPath(ctx, path, customColor, 10, cell, pad, topPad, rowOffset);
      }
      drawPath(ctx, w.solveState.redPath, customColor, 12, cell, pad, topPad, rowOffset);
    } else {
      for (const path of w.solveState.bluePaths) {
        drawPath(ctx, path, "#2563eb", 10, cell, pad, topPad, rowOffset);
      }
      drawPath(ctx, w.solveState.redPath, "#ef4444", 12, cell, pad, topPad, rowOffset);
    }

    const legendTop = ctx.canvas.height - legendHeight + 18;

    if (customMode) {
      ctx.fillStyle = "#111";
      ctx.font = "700 18px Arial";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("Custom Priorities", 30, legendTop);

      const lineY = legendTop + 10;
      ctx.lineCap = "round";
      ctx.lineWidth = 16;
      ctx.strokeStyle = "#000";
      ctx.beginPath();
      ctx.moveTo(ctx.canvas.width - 170, lineY + 8);
      ctx.lineTo(ctx.canvas.width - 90, lineY + 8);
      ctx.stroke();

      ctx.lineWidth = 10;
      ctx.strokeStyle = customColor;
      ctx.beginPath();
      ctx.moveTo(ctx.canvas.width - 170, lineY + 8);
      ctx.lineTo(ctx.canvas.width - 90, lineY + 8);
      ctx.stroke();

      ctx.fillStyle = "#111";
      ctx.font = "700 13px Arial";
      ctx.textAlign = "left";
      ctx.fillText("Custom Route", ctx.canvas.width - 82, lineY + 2);

      let x = 30;
      let y = legendTop + 30;
      const maxWidth = ctx.canvas.width - 30;
      const rowHeight = 24;

      ctx.font = "600 12px Arial";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";

      for (const item of legendItems) {
        const text = `${item.label}: ${item.settingLabel}`;
        const textWidth = ctx.measureText(text).width;
        const itemWidth = 18 + 8 + textWidth + 18;

        if (x + itemWidth > maxWidth) {
          x = 30;
          y += rowHeight;
        }

        drawLegendBadge(ctx, item, x, y - 9);
        ctx.fillStyle = "#111";
        ctx.fillText(text, x + 26, y + 1);

        x += itemWidth;
      }
    } else {
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
  }

  function drawPath(ctx, path, color, width, cell, pad, topPad, rowOffset) {
    if (!path || path.length < 1) return;

    const customMode =
      ((w.solveState && w.solveState.solverMode) ||
        (typeof getSolverMode === "function" ? getSolverMode() : "standard")) === "custom";

    const isRed = color === "#ef4444" || (customMode && color === "#a855f7");
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
      return r >= 0 && c >= 0 && r < w.currentRowCount && c < w.COLS;
    }

    function getCellValue(r, c) {
      if (!isInBounds(r, c)) return null;
      return w.grid[r]?.[c];
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
      const attackPoints = Array.isArray(w.solveState.attackPoints) ? w.solveState.attackPoints : [];

      if (!attackPoints.length) return center(last);

      const adjacentAttack = attackPoints.find((pt) => manhattan(last, pt) === 1);
      if (adjacentAttack) {
        const touch = getBoundaryTouchPoint(last, adjacentAttack);
        if (touch) return touch;
      }

      return center(last);
    }

    function getStartStubPoint() {
      const first = path[0];
      const second = path.length > 1 ? path[1] : null;

      if (!first || !second) return center(first);

      const dx = second[1] - first[1];
      const dy = second[0] - first[0];
      const firstCenter = center(first);

      if (dx === 1) return { x: firstCenter.x - cell / 2, y: firstCenter.y };
      if (dx === -1) return { x: firstCenter.x + cell / 2, y: firstCenter.y };
      if (dy === 1) return { x: firstCenter.x, y: firstCenter.y - cell / 2 };
      if (dy === -1) return { x: firstCenter.x, y: firstCenter.y + cell / 2 };

      return firstCenter;
    }

    const points = path.map(center);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();

    if (isRed) {
      const startStub = getStartStubPoint();
      ctx.moveTo(startStub.x, startStub.y);
      ctx.lineTo(points[0].x, points[0].y);
    } else {
      ctx.moveTo(points[0].x, points[0].y);
    }

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    if (isBlue) {
      const endPoint = getBlueEndpointPoint();
      ctx.lineTo(endPoint.x, endPoint.y);
    } else if (isRed) {
      const endPoint = getRedEndpointPoint();
      if (endPoint.x !== points[points.length - 1].x || endPoint.y !== points[points.length - 1].y) {
        ctx.lineTo(endPoint.x, endPoint.y);
      }
    }

    ctx.strokeStyle = "#000";
    ctx.lineWidth = width + 6;
    ctx.stroke();

    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function resetSolve() {
    w.solveState = {
      redPath: [],
      bluePaths: [],
      shaftEntryDots: [],
      shaftClusters: [],
      attackPoints: [],
      solved: false,
      message: "",
      routeAnalysis: [],
      solverVersion: null,
      solverMode: typeof getSolverMode === "function" ? getSolverMode() : "standard",
      legacyEndMode: false,
      redBubbleCount: 0,
      firstBubbleTravelCost: null,
      effectiveTotal: null,
      redCost: null,
      blueCost: null,
      redObjectPriorityScore: 0,
      blueObjectPriorityScore: 0,
      objectPriorityScore: 0,
      missingPriorityCount: 0
    };
  }

  function getVisibleGridSlice() {
    return w.grid.slice(0, w.currentRowCount).map((row) => row.slice(0, w.COLS));
  }

  function downloadPNG() {
    renderPreview();
    const canvas = document.getElementById("previewCanvas");
    if (!canvas) return;

    const link = document.createElement("a");
    const safeTitle = String(
      w.currentPreviewTitle || document.getElementById("titleInput")?.value || "zm-pathfinder"
    )
      .trim()
      .replace(/[^\w\-]+/g, "_");

    link.href = canvas.toDataURL("image/png");
    link.download = `${safeTitle}.png`;
    link.click();
  }

  w.setTool = setTool;
  w.render = render;
  w.renderPreview = renderPreview;
  w.clickCell = clickCell;
  w.clearBoard = clearBoard;
  w.loadSampleGrid = loadSampleGrid;
  w.pasteFromClipboard = pasteFromClipboard;
  w.applyText = applyText;
  w.downloadPNG = downloadPNG;
  w.resetSolve = resetSolve;
  w.getVisibleGridSlice = getVisibleGridSlice;

  if (typeof openRouteReportModal === "function") {
    w.openRouteReportModal = openRouteReportModal;
  }
  if (typeof closeRouteReportModal === "function") {
    w.closeRouteReportModal = closeRouteReportModal;
  }
  w.renderRouteAudit = renderRouteAudit;

  function safeInitialRender() {
    try {
      const gridEl = document.getElementById("grid");
      const canvasEl = document.getElementById("previewCanvas");

      if (!gridEl || !canvasEl) return false;
      if (!Array.isArray(w.grid)) return false;

      if (!Number.isFinite(w.currentRowCount) || w.currentRowCount <= 0) {
        w.currentRowCount = w.MINED_ROWS;
      }

      render();
      renderPreview();
      return true;
    } catch (err) {
      console.error("Initial render failed:", err);
      return false;
    }
  }

  function bootRenderWithRetry(attempt = 0) {
    if (safeInitialRender()) return;

    if (attempt >= 40) {
      console.error("Grid/preview never became ready.");
      return;
    }

    setTimeout(() => {
      bootRenderWithRetry(attempt + 1);
    }, 150);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      bootRenderWithRetry(0);
    });
  } else {
    bootRenderWithRetry(0);
  }
})();
