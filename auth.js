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

/* -------------------- UTIL -------------------- */

function normalizeId(value){
  return String(value || "").trim();
}

/* -------------------- TESTERS -------------------- */

function initializeTesters(){
  let existing = [];

  try {
    existing = JSON.parse(localStorage.getItem(TESTER_STORAGE_KEY) || "[]");
  } catch {
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
  try {
    const data = JSON.parse(localStorage.getItem(TESTER_STORAGE_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveStoredTesters(testers){
  localStorage.setItem(TESTER_STORAGE_KEY, JSON.stringify(testers));
}

function findTesterById(id){
  const testers = getStoredTesters();
  return testers.find(t => normalizeId(t.id) === normalizeId(id)) || null;
}

/* -------------------- SESSION -------------------- */

function getStoredSession(){
  try {
    return JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function saveSession(session){
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function clearSession(){
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

/* -------------------- UI -------------------- */

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
    } else {
      addBtn.classList.add("hidden");
    }

    mapLoaderSection.classList.remove("hidden");
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

/* -------------------- AUTH -------------------- */

function loginTester(){
  const id = normalizeId(document.getElementById("loginTesterId").value);

  if (!id) return;

  const tester = findTesterById(id);
  if (!tester) return;

  window.currentTester = tester;

  // 🔑 SAVE SESSION
  saveSession(tester);

  unlockApp();
}

function logoutTester(){
  window.currentTester = null;
  clearSession();
  lockApp();
}

/* -------------------- INIT -------------------- */

function initAccessControl(){
  initializeTesters();

  const session = getStoredSession();

  if (session && session.id) {
    const tester = findTesterById(session.id);

    if (tester) {
      window.currentTester = tester;
      unlockApp();
      return;
    }
  }

  lockApp();
}

/* 🔥 FORCE RUN AFTER EVERYTHING LOADS */
window.addEventListener("load", () => {
  setTimeout(initAccessControl, 50);
});

/* -------------------- EXPORT -------------------- */

window.loginTester = loginTester;
window.logoutTester = logoutTester;
window.initAccessControl = initAccessControl;
window.updateUserUI = updateUserUI;
