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

function solveBoard(){
  if(!window.ZMPathfinderSolver || typeof window.ZMPathfinderSolver.solveGrid !== "function"){
    setReport(t("solverMissing"));
    return;
  }

  const result = window.ZMPathfinderSolver.solveGrid({
    grid: getVisibleGridSlice(),
    gateType: document.getElementById("gateType").value,
    eventType: currentMapContext.eventType,
    eventName: currentMapContext.eventName,
    eventMine: currentMapContext.eventMine,
    chamberName: currentMapContext.chamberName
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
    routeAnalysis: result.routeAnalysis || [],
    solverVersion: result.solverVersion || null,
    legacyEndMode: !!result.legacyEndMode,
    redBubbleCount: result.redBubbleCount ?? 0,
    firstBubbleTravelCost: result.firstBubbleTravelCost ?? null,
    effectiveTotal: result.effectiveTotal ?? null,
    redCost: result.redCost ?? null,
    blueCost: result.blueCost ?? null
  };

  setReport(result.message || t("solvedMessage"));
  renderRouteAudit(result.routeAnalysis || []);
  renderPreview();
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
