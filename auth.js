// ==========================
// ZM PATHFINDER AUTH SYSTEM
// ==========================

const ADMIN_NAME = "CheezeMasterGuru";
const ADMIN_ID = "7625451";

const TESTER_STORAGE_KEY = "zm_pathfinder_beta_testers";
const SESSION_STORAGE_KEY = "zm_session";

// ==========================
// DEFAULT TESTERS (UNCHANGED)
// ==========================
const DEFAULT_TESTERS = [
  { name: "CheezeMasterGuru", id: "7625451", isAdmin: true },
  { name: "AniLaBanani", id: "23358613", isAdmin: true },
  { name: "ChristopherH", id: "17462546", isAdmin: true },
  { name: "Azshannia", id: "13276937", isAdmin: true },
  { name: "Sonlite", id: "19540845", isAdmin: true },
  { name: "FatJesus", id: "16332297", isAdmin: true },
  { name: "Garon98", id: "4120350", isAdmin: true },
  { name: "XCONN6286", id: "12507785", isAdmin: true },
  { name: "FS1997", id: "19770641", isAdmin: true }
];

// ==========================
// INTERNAL STATE
// ==========================
let testers = [];

// ==========================
// LOAD TESTERS
// ==========================
function loadTesters() {
  try {
    const saved = localStorage.getItem(TESTER_STORAGE_KEY);
    testers = saved ? JSON.parse(saved) : DEFAULT_TESTERS.slice();
  } catch {
    testers = DEFAULT_TESTERS.slice();
  }
}

// ==========================
// SAVE TESTERS
// ==========================
function saveTesters() {
  localStorage.setItem(TESTER_STORAGE_KEY, JSON.stringify(testers));
}

// ==========================
// RESTORE SESSION (FIXES LOGIN LOOP)
// ==========================
function restoreSession() {
  try {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      window.currentTester = JSON.parse(saved);
    }
  } catch {
    window.currentTester = null;
  }
}

// ==========================
// LOGIN (ID ONLY)
// ==========================
function loginTester() {
  const idInput = document.getElementById("testerIdInput");
  if (!idInput) return;

  const id = idInput.value.trim();

  if (!id) {
    alert("Enter Tester ID.");
    return;
  }

  const tester = testers.find(t => t.id === id);

  if (!tester) {
    alert("Tester not found.");
    return;
  }

  window.currentTester = tester;

  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(tester));

  updateUserUI();
}

// ==========================
// LOGOUT
// ==========================
function logoutTester() {
  window.currentTester = null;
  localStorage.removeItem(SESSION_STORAGE_KEY);
  updateUserUI();
}

// ==========================
// ADD TESTER (ADMIN ONLY)
// ==========================
function addTester() {
  if (!window.currentTester || !window.currentTester.isAdmin) {
    alert("Admin only.");
    return;
  }

  const name = prompt("Enter tester name:");
  const id = prompt("Enter tester ID:");

  if (!name || !id) {
    alert("Both name and ID required.");
    return;
  }

  if (testers.some(t => t.id === id)) {
    alert("Tester already exists.");
    return;
  }

  testers.push({
    name,
    id,
    isAdmin: false
  });

  saveTesters();
  alert("Tester added.");
}

// ==========================
// UI UPDATE
// ==========================
function updateUserUI() {
  const badge = document.getElementById("loggedInBadge");
  const appShell = document.getElementById("appShell");

  if (window.currentTester) {
    if (badge) {
      badge.textContent = `Logged in as: ${window.currentTester.name} (${window.currentTester.id})`;
    }

    appShell?.classList.remove("locked");
  } else {
    if (badge) {
      badge.textContent = "";
    }

    appShell?.classList.add("locked");
  }
}

// ==========================
// INIT
// ==========================
function initAccessControl() {
  loadTesters();
  restoreSession();
  updateUserUI();
}

// ==========================
// EXPORTS
// ==========================
window.loginTester = loginTester;
window.logoutTester = logoutTester;
window.addTester = addTester;
window.initAccessControl = initAccessControl;
