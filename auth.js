// ================================
// ZM Pathfinder - Auth System FIXED
// ================================

const ADMIN_NAME = "CheezeMasterGuru";
const ADMIN_ID = "7625451";

const TESTER_STORAGE_KEY = "zm_pathfinder_user";

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
let testers = [...DEFAULT_TESTERS];

// ================================
// RESTORE USER (RUNS ON LOAD)
// ================================
(function restoreUser(){
  const saved = localStorage.getItem(TESTER_STORAGE_KEY);
  if (saved) {
    try {
      window.currentTester = JSON.parse(saved);
    } catch {
      localStorage.removeItem(TESTER_STORAGE_KEY);
      window.currentTester = null;
    }
  } else {
    window.currentTester = null;
  }
})();

// ================================
// LOGIN
// ================================
function loginTester(name, id){
  name = String(name || "").trim();
  id = String(id || "").trim();

  if (!name || !id) {
    alert("Enter name and ID.");
    return;
  }

  let tester = testers.find(t => t.name === name && t.id === id);

  // If not found, create new tester
  if (!tester) {
    tester = {
      name,
      id,
      isAdmin: name === ADMIN_NAME && id === ADMIN_ID
    };
    testers.push(tester);
  }

  // Force admin check (always correct)
  tester.isAdmin = (tester.name === ADMIN_NAME && tester.id === ADMIN_ID);

  // SAVE + SET
  localStorage.setItem(TESTER_STORAGE_KEY, JSON.stringify(tester));
  window.currentTester = tester;

  updateUserUI();
}

// ================================
// LOGOUT
// ================================
function logoutTester(){
  localStorage.removeItem(TESTER_STORAGE_KEY);
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
  updateUserUI();
}

// ================================
// GLOBAL EXPORTS
// ================================
window.loginTester = loginTester;
window.logoutTester = logoutTester;
window.updateUserUI = updateUserUI;
window.initAccessControl = initAccessControl;
