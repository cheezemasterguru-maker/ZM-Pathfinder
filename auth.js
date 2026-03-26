// ================================
// ZM Pathfinder AUTH (ID ONLY FIX)
// ================================

const ADMIN_NAME = "CheezeMasterGuru";
const ADMIN_ID = "7625451";

const TESTER_STORAGE_KEY = "zm_pathfinder_beta_testers";
const SESSION_STORAGE_KEY = "zm_pathfinder_session";

// ================================
// DEFAULT TESTERS
// ================================
const DEFAULT_TESTERS = [
  { name: "CheezeMasterGuru", id: "7625451", isAdmin: true },
  { name: "AniLaBanani", id: "23358613", isAdmin: false },
  { name: "ChristopherH", id: "17462546", isAdmin: false },
  { name: "Azshannia", id: "13276937", isAdmin: false },
  { name: "Sonlite", id: "19540845", isAdmin: false },
  { name: "FatJesus", id: "16332297", isAdmin: false },
  { name: "Garon98", id: "4120350", isAdmin: false },
  { name: "XCONN6286", id: "12507785", isAdmin: false },
  { name: "FS1997", id: "19770641", isAdmin: false }
];

// ================================
// STATE
// ================================
let testers = [];

// ================================
// LOAD TESTERS
// ================================
function loadTesters(){
  const saved = localStorage.getItem(TESTER_STORAGE_KEY);
  if (saved) {
    try {
      testers = JSON.parse(saved);
      return;
    } catch {}
  }
  testers = [...DEFAULT_TESTERS];
}

// ================================
// SAVE TESTERS
// ================================
function saveTesters(){
  localStorage.setItem(TESTER_STORAGE_KEY, JSON.stringify(testers));
}

// ================================
// RESTORE SESSION
// ================================
function restoreSession(){
  const saved = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!saved) {
    window.currentTester = null;
    return;
  }

  try {
    const parsed = JSON.parse(saved);
    const match = testers.find(t => t.id === parsed.id);

    if (match) {
      window.currentTester = match;
    } else {
      window.currentTester = parsed;
    }
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    window.currentTester = null;
  }
}

// ================================
// LOGIN (ID ONLY)
// ================================
function loginTester(){
  const idInput = document.getElementById("testerId");
  const id = String(idInput?.value || "").trim();

  if (!id) {
    alert("Enter Tester ID.");
    return;
  }

  let tester = testers.find(t => t.id === id);

  // If not found, auto-create
  if (!tester) {
    tester = {
      name: id === ADMIN_ID ? ADMIN_NAME : `User-${id}`,
      id,
      isAdmin: id === ADMIN_ID
    };
    testers.push(tester);
    saveTesters();
  }

  tester.isAdmin = (tester.id === ADMIN_ID);

  // SAVE SESSION
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(tester));
  window.currentTester = tester;

  updateUserUI();
}

// ================================
// LOGOUT
// ================================
function logoutTester(){
  localStorage.removeItem(SESSION_STORAGE_KEY);
  window.currentTester = null;
  updateUserUI();
}

// ================================
// UI UPDATE
// ================================
function updateUserUI(){
  const badge = document.getElementById("loggedInBadge");
  const loginSection = document.getElementById("loginSection");

  if (!badge || !loginSection) return;

  if (window.currentTester) {
    badge.textContent = `Logged in as: ${window.currentTester.name} (${window.currentTester.id})`;
    badge.classList.remove("hidden");
    loginSection.classList.add("hidden");
  } else {
    badge.classList.add("hidden");
    loginSection.classList.remove("hidden");
  }
}

// ================================
// INIT
// ================================
function initAccessControl(){
  loadTesters();
  restoreSession();
  updateUserUI();
}

// ================================
// EXPORTS
// ================================
window.loginTester = loginTester;
window.logoutTester = logoutTester;
window.updateUserUI = updateUserUI;
window.initAccessControl = initAccessControl;
