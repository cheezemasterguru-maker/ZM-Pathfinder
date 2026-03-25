const ADMIN_NAME = "CheezeMasterGuru";
const ADMIN_ID = "7625451";
const TESTER_STORAGE_KEY = "zm_pathfinder_beta_testers";
const SESSION_STORAGE_KEY = "zm_pathfinder_beta_session";

const DEFAULT_TESTERS = [
  { name: "CheezeMasterGuru", id: "7625451", isAdmin: true },
  { name: "AniLaBanani", id: "23358613", isAdmin: false },
  { name: "ChristopherH", id: "17462546", isAdmin: false },
  { name: "Azshannia", id: "13276937", isAdmin: false },
  { name: "Sonlite", id: "19540845", isAdmin: false },
  { name: "FatJesus", id: "16332297", isAdmin: false },
  { name: "Garon98", id: "4120350", isAdmin: false },
  { name: "XCONN6286", id: "12507785", isAdmin: false },
  { name: "FS1997", id: "19770641", isAdmin: false },
  { name: "bball523", id: "891092", isAdmin: false },
  { name: "Norsixa", id: "22673958", isAdmin: false }
];

window.currentTester = null;

function normalizeId(value){
  return String(value || "").trim();
}

function initializeTesters(){
  let existing = [];
  try{
    existing = JSON.parse(localStorage.getItem(TESTER_STORAGE_KEY) || "[]");
  } catch(e){
    existing = [];
  }

  if (!Array.isArray(existing)) existing = [];

  const merged = [...existing];

  DEFAULT_TESTERS.forEach(def => {
    const exists = merged.some(t => normalizeId(t.id) === normalizeId(def.id));
    if (!exists) merged.push(def);
  });

  const hasAdmin = merged.some(t => normalizeId(t.id) === normalizeId(ADMIN_ID));
  if (!hasAdmin) {
    merged.unshift({ name: ADMIN_NAME, id: ADMIN_ID, isAdmin: true });
  }

  localStorage.setItem(TESTER_STORAGE_KEY, JSON.stringify(merged));
}

function getStoredTesters(){
  let testers = [];
  try{
    testers = JSON.parse(localStorage.getItem(TESTER_STORAGE_KEY) || "[]");
  } catch(e){
    testers = [];
  }
  return Array.isArray(testers) ? testers : [];
}

function saveStoredTesters(testers){
  localStorage.setItem(TESTER_STORAGE_KEY, JSON.stringify(testers));
}

function getStoredSession(){
  try{
    return JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "null");
  } catch(e){
    return null;
  }
}

function saveSession(session){
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function clearSession(){
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

function findTesterById(id){
  const testers = getStoredTesters();
  const wanted = normalizeId(id);
  return testers.find(t => normalizeId(t.id) === wanted) || null;
}

function setLoginStatus(msg, ok = false){
  const el = document.getElementById("loginStatus");
  if (!el) return;
  el.textContent = msg;
  el.className = "status-text " + (msg ? (ok ? "status-ok" : "status-error") : "");
}

function setAddTesterStatus(msg, ok = false){
  const el = document.getElementById("addTesterStatus");
  if (!el) return;
  el.textContent = msg;
  el.className = "status-text " + (msg ? (ok ? "status-ok" : "status-error") : "");
}

function updateUserUI(){
  const badge = document.getElementById("loggedInBadge");
  const addBtn = document.getElementById("addTesterBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const mapLoaderSection = document.getElementById("mapLoaderSection");

  if (window.currentTester) {
    badge.textContent = `Logged in as: ${window.currentTester.name} (${window.currentTester.id})`;
    badge.className = "user-badge" + (window.currentTester.isAdmin ? " admin-badge" : "");

    if (window.currentTester.isAdmin) {
      addBtn.classList.remove("hidden");
      mapLoaderSection.classList.remove("hidden");
    } else {
      addBtn.classList.add("hidden");
      mapLoaderSection.classList.add("hidden");
    }

    logoutBtn.classList.remove("hidden");
  } else {
    badge.textContent = "Not logged in";
    badge.className = "user-badge";
    addBtn.classList.add("hidden");
    logoutBtn.classList.add("hidden");
    mapLoaderSection.classList.add("hidden");
  }
}

function unlockApp(){
  document.getElementById("appShell").classList.remove("locked");
  document.getElementById("loginOverlay").classList.remove("show");
  updateUserUI();
}

function lockApp(){
  document.getElementById("appShell").classList.add("locked");
  document.getElementById("loginOverlay").classList.add("show");
  updateUserUI();
}

function clearLoginField(){
  document.getElementById("loginTesterId").value = "";
  setLoginStatus("");
}

function loginTester(){
  const id = normalizeId(document.getElementById("loginTesterId").value);

  if (!id) {
    setLoginStatus("Enter a tester ID.");
    return;
  }

  const tester = findTesterById(id);
  if (!tester) {
    setLoginStatus("Tester ID not found.");
    return;
  }

  window.currentTester = tester;
  saveSession(tester);
  setLoginStatus(`Welcome, ${tester.name}.`, true);
  updateUserUI();

  setTimeout(() => {
    unlockApp();
    clearLoginField();
  }, 250);
}

function logoutTester(){
  window.currentTester = null;
  clearSession();
  closeAddTesterModal();
  closeSolverHelp();
  lockApp();
  setLoginStatus("");
}

function renderTesterList(){
  const list = document.getElementById("testerList");
  const testers = getStoredTesters();
  list.innerHTML = "";

  testers.forEach(tester => {
    const item = document.createElement("div");
    item.className = "tester-item";

    const meta = document.createElement("div");
    meta.className = "tester-meta";

    const name = document.createElement("div");
    name.className = "tester-name";
    name.textContent = tester.name + (tester.isAdmin ? " (Admin)" : "");

    const id = document.createElement("div");
    id.className = "tester-id";
    id.textContent = tester.id;

    meta.appendChild(name);
    meta.appendChild(id);
    item.appendChild(meta);

    if (!tester.isAdmin) {
      const removeBtn = document.createElement("button");
      removeBtn.className = "btn-danger";
      removeBtn.textContent = "Remove";
      removeBtn.onclick = () => removeBetaTester(tester.id);
      item.appendChild(removeBtn);
    }

    list.appendChild(item);
  });
}

function openAddTesterModal(){
  if (!window.currentTester || !window.currentTester.isAdmin) return;

  renderTesterList();
  setAddTesterStatus("");
  document.getElementById("adminIdInput").value = "";
  document.getElementById("newTesterName").value = "";
  document.getElementById("newTesterId").value = "";
  document.getElementById("addTesterOverlay").classList.add("show");
}

function closeAddTesterModal(){
  document.getElementById("addTesterOverlay").classList.remove("show");
  setAddTesterStatus("");
}

function removeBetaTester(id){
  if (!window.currentTester || !window.currentTester.isAdmin) return;

  const testers = getStoredTesters().filter(t => normalizeId(t.id) !== normalizeId(id));
  saveStoredTesters(testers);
  renderTesterList();
  setAddTesterStatus("Tester removed.", true);
}

function addBetaTester(){
  const adminId = normalizeId(document.getElementById("adminIdInput").value);
  const name = String(document.getElementById("newTesterName").value || "").trim();
  const id = normalizeId(document.getElementById("newTesterId").value);

  if (adminId !== normalizeId(ADMIN_ID)) {
    setAddTesterStatus("Invalid admin ID.");
    return;
  }

  if (!name || !id) {
    setAddTesterStatus("Enter tester name and tester ID.");
    return;
  }

  const testers = getStoredTesters();
  const exists = testers.some(t => normalizeId(t.id) === id);

  if (exists) {
    setAddTesterStatus("Tester ID already exists.");
    return;
  }

  testers.push({
    name,
    id,
    isAdmin: false
  });

  saveStoredTesters(testers);
  renderTesterList();
  setAddTesterStatus(`Added tester locally: ${name} (${id})`, true);

  document.getElementById("newTesterName").value = "";
  document.getElementById("newTesterId").value = "";
}

function initAccessControl(){
  initializeTesters();

  const session = getStoredSession();
  if (session) {
    const tester = findTesterById(session.id);
    if (tester) {
      window.currentTester = tester;
      unlockApp();
      return;
    }
  }

  window.currentTester = null;
  lockApp();
}

window.loginTester = loginTester;
window.logoutTester = logoutTester;
window.clearLoginField = clearLoginField;
window.openAddTesterModal = openAddTesterModal;
window.closeAddTesterModal = closeAddTesterModal;
window.addBetaTester = addBetaTester;
window.initAccessControl = initAccessControl;
window.updateUserUI = updateUserUI;
