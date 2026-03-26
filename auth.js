// ================================
// EXISTING CONSTANTS (UNCHANGED)
// ================================
const ADMIN_NAME = "CheezeMasterGuru";
const ADMIN_ID = "7625451";

const TESTER_STORAGE_KEY = "zm_pathfinder_beta_testers";
const SESSION_STORAGE_KEY = "zm_pathfinder_session";

// ================================
// DEFAULT TESTERS (UNCHANGED)
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
// LOAD TESTERS FROM STORAGE
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
// 🔥 RESTORE LOGGED-IN USER (FIX)
// ================================
function restoreSession(){
  const saved = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!saved) {
    window.currentTester = null;
    return;
  }

  try {
    const parsed = JSON.parse(saved);

    // Re-link to tester list (important)
    const match = testers.find(t => t.name === parsed.name && t.id === parsed.id);

    if (match) {
      window.currentTester = match;
    } else {
      // fallback if tester list changed
      window.currentTester = parsed;
    }
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    window.currentTester = null;
  }
}

// ================================
// LOGIN
// ================================
function loginTester(){
  const nameInput = document.getElementById("testerName");
  const idInput = document.getElementById("testerId");

  const name = String(nameInput?.value || "").trim();
  const id = String(idInput?.value || "").trim();

  if (!name || !id) {
    alert("Enter name and ID.");
    return;
  }

  let tester = testers.find(t => t.name === name && t.id === id);

  if (!tester) {
    tester = {
      name,
      id,
      isAdmin: name === ADMIN_NAME && id === ADMIN_ID
    };
    testers.push(tester);
    saveTesters();
  }

  tester.isAdmin = (tester.name === ADMIN_NAME && tester.id === ADMIN_ID);

  // 🔥 SAVE SESSION (THIS FIXES LOGIN LOOP)
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
// INIT ACCESS CONTROL
// ================================
function initAccessControl(){
  loadTesters();        // load tester list
  restoreSession();     // 🔥 restore login
  updateUserUI();       // update UI
}

// ================================
// EXPORTS
// ================================
window.loginTester = loginTester;
window.logoutTester = logoutTester;
window.updateUserUI = updateUserUI;
window.initAccessControl = initAccessControl;
