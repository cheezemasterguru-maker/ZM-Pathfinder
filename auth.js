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
  { name: "Norsixa", id: "22673958", isAdmin: false },
  { name: "TheDude", id: "20750358", isAdmin: false }
];

window.currentTester = null;

function normalizeId(value){
  return String(value || "").trim();
}

/* ---------- STORAGE ---------- */

function safeGet(key, fallback){
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch(e){
    return fallback;
  }
}

function safeSet(key, value){
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch(e){}
}

function initializeTesters(){
  let existing = safeGet(TESTER_STORAGE_KEY, []);

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

  safeSet(TESTER_STORAGE_KEY, merged);
}

function getStoredTesters(){
  const testers = safeGet(TESTER_STORAGE_KEY, []);
  return Array.isArray(testers) ? testers : [];
}

function saveStoredTesters(testers){
  safeSet(TESTER_STORAGE_KEY, testers);
}

function getStoredSession(){
  const session = safeGet(SESSION_STORAGE_KEY, null);

  // 🔴 HARD FIX: reject corrupt session
  if (!session || !session.id) return null;

  return session;
}

function saveSession(session){
  safeSet(SESSION_STORAGE_KEY, session);
}

function clearSession(){
  try { localStorage.removeItem(SESSION_STORAGE_KEY); } catch(e){}
}

/* ---------- CORE ---------- */

function findTesterById(id){
  const testers = getStoredTesters();
  const wanted = normalizeId(id);
  return testers.find(t => normalizeId(t.id) === wanted) || null;
}

/* ---------- UI ---------- */

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

  if (!badge || !addBtn || !logoutBtn || !mapLoaderSection) return;

  if (window.currentTester) {
    badge.textContent = `Logged in as: ${window.currentTester.name} (${window.currentTester.id})`;
    badge.className = "user-badge" + (window.currentTester.isAdmin ? " admin-badge" : "");

    addBtn.classList.toggle("hidden", !window.currentTester.isAdmin);
    logoutBtn.classList.remove("hidden");
    mapLoaderSection.classList.remove("hidden");
  } else {
    badge.textContent = "Not logged in";
    badge.className = "user-badge";
    addBtn.classList.add("hidden");
    logoutBtn.classList.add("hidden");
    mapLoaderSection.classList.add("hidden");
  }
}

/* ---------- LOCK SYSTEM ---------- */

function unlockApp(){
  const shell = document.getElementById("appShell");
  const overlay = document.getElementById("loginOverlay");

  if (shell) shell.classList.remove("locked");
  if (overlay) overlay.classList.remove("show");

  updateUserUI();
}

function lockApp(){
  const shell = document.getElementById("appShell");
  const overlay = document.getElementById("loginOverlay");

  if (shell) shell.classList.add("locked");
  if (overlay) overlay.classList.add("show");

  updateUserUI();
}

/* ---------- LOGIN ---------- */

function clearLoginField(){
  const input = document.getElementById("loginTesterId");
  if (input) input.value = "";
  setLoginStatus("");
}

function loginTester(){
  const input = document.getElementById("loginTesterId");
  const id = normalizeId(input?.value);

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
  saveSession({ id: tester.id });

  unlockApp();
  setLoginStatus(`Welcome, ${tester.name}.`, true);
  clearLoginField();
}

function logoutTester(){
  window.currentTester = null;
  clearSession();

  closeAddTesterModal?.();
  closeSolverHelp?.();

  lockApp();
  setLoginStatus("");
}

/* ---------- ADMIN ---------- */

function renderTesterList(){
  const list = document.getElementById("testerList");
  if (!list) return;

  const testers = getStoredTesters();
  list.innerHTML = "";

  testers.forEach(tester => {
    const item = document.createElement("div");
    item.className = "tester-item";

    item.innerHTML = `
      <div class="tester-meta">
        <div class="tester-name">${tester.name}${tester.isAdmin ? " (Admin)" : ""}</div>
        <div class="tester-id">${tester.id}</div>
      </div>
    `;

    if (!tester.isAdmin) {
      const btn = document.createElement("button");
      btn.className = "btn-danger";
      btn.textContent = "Remove";
      btn.onclick = () => removeBetaTester(tester.id);
      item.appendChild(btn);
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

  if (testers.some(t => normalizeId(t.id) === id)) {
    setAddTesterStatus("Tester ID already exists.");
    return;
  }

  testers.push({ name, id, isAdmin: false });
  saveStoredTesters(testers);

  renderTesterList();
  setAddTesterStatus(`Added tester locally: ${name} (${id})`, true);

  document.getElementById("newTesterName").value = "";
  document.getElementById("newTesterId").value = "";
}

/* ---------- INIT ---------- */

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

/* ---------- EXPORTS ---------- */

window.loginTester = loginTester;
window.logoutTester = logoutTester;
window.clearLoginField = clearLoginField;
window.openAddTesterModal = openAddTesterModal;
window.closeAddTesterModal = closeAddTesterModal;
window.addBetaTester = addBetaTester;
window.initAccessControl = initAccessControl;
window.updateUserUI = updateUserUI;
