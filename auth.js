const ADMIN_ID = "7625451";
const SESSION_STORAGE_KEY = "zm_session";

// ================================
// RESTORE SESSION
// ================================
(function () {
  const saved = localStorage.getItem(SESSION_STORAGE_KEY);
  if (saved) {
    try {
      window.currentTester = JSON.parse(saved);
    } catch {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      window.currentTester = null;
    }
  } else {
    window.currentTester = null;
  }
})();

// ================================
// LOGIN
// ================================
function loginTester() {
  const input = document.getElementById("testerId");
  const id = String(input?.value || "").trim();

  if (!id) {
    alert("Enter Tester ID.");
    return;
  }

  const tester = {
    name: id === ADMIN_ID ? "CheezeMasterGuru" : `User-${id}`,
    id,
    isAdmin: id === ADMIN_ID
  };

  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(tester));
  window.currentTester = tester;

  unlockApp();
}

// ================================
// LOGOUT
// ================================
function logoutTester() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  window.currentTester = null;
  lockApp();
}

// ================================
// 🔥 UI CONTROL (THIS FIXES BLANK SCREEN)
// ================================
function unlockApp() {
  const shell = document.getElementById("appShell");
  if (shell) shell.classList.remove("locked");

  updateUserUI();
}

function lockApp() {
  const shell = document.getElementById("appShell");
  if (shell) shell.classList.add("locked");

  updateUserUI();
}

// ================================
// UI UPDATE
// ================================
function updateUserUI() {
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
// INIT (CRITICAL)
// ================================
window.addEventListener("load", () => {
  if (window.currentTester) {
    unlockApp();
  } else {
    lockApp();
  }
});

// ================================
// EXPORTS
// ================================
window.loginTester = loginTester;
window.logoutTester = logoutTester;
window.updateUserUI = updateUserUI;
