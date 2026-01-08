// js/profile.js
document.addEventListener("DOMContentLoaded", () => {
  if (!window.NP_UTIL || typeof apiFetch !== "function") {
    alert("Script belum termuat.");
    return;
  }

  // wajib login
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  const el = {
    headerName: document.querySelector(".header-info h2"),
    headerEmail: document.querySelector(".header-info p"),
    inputName: document.querySelector('.input-group input[type="text"]'),
    inputEmail: document.querySelector('.input-group input[type="email"]'),
    btnSave: document.querySelector(".btn-save"),
    btnLogout: Array.from(document.querySelectorAll("button")).find(
      (b) => (b.textContent || "").trim().toLowerCase() === "logout"
    ),
    btnChangePassword: document.getElementById("changePasswordBtn"),
    // Notification elements
    notifEnabled: document.getElementById("notifEnabled"),
    notifH3: document.getElementById("notifH3"),
    notifH1: document.getElementById("notifH1"),
    notifUpdates: document.getElementById("notifUpdates"),
    saveNotifBtn: document.getElementById("saveNotifBtn"),
  };

  function setUser(u) {
    const name = u?.name || u?.email || "";
    if (el.headerName) el.headerName.textContent = name;
    if (el.headerEmail) el.headerEmail.textContent = u?.email || "";
    if (el.inputName) el.inputName.value = u?.name || "";
    if (el.inputEmail) {
      el.inputEmail.value = u?.email || "";
      el.inputEmail.disabled = true;
    }

    // Set notification preferences
    if (u?.emailNotifications) {
      const prefs = u.emailNotifications;
      if (el.notifEnabled) el.notifEnabled.checked = prefs.enabled !== false;
      if (el.notifH3) el.notifH3.checked = prefs.reminderH3 !== false;
      if (el.notifH1) el.notifH1.checked = prefs.reminderH1 !== false;
      if (el.notifUpdates) el.notifUpdates.checked = prefs.eventUpdates !== false;
    }
  }

  async function loadMe() {
    try {
      const data = await apiFetch("/api/auth/me");
      setUser(data.user);
    } catch (err) {
      console.error(err);
      alert("Failed to load profile");
    }
  }

  async function saveMe() {
    const name = (el.inputName?.value || "").trim();
    if (!name) {
      alert("Username tidak boleh kosong.");
      return;
    }

    const data = await apiFetch("/api/auth/me", {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });

    setUser(data.user);
    localStorage.setItem("user", JSON.stringify(data.user));
    alert("Profile tersimpan.");
  }

  // Save notification settings
  if (el.saveNotifBtn) {
    el.saveNotifBtn.addEventListener("click", async () => {
      try {
        el.saveNotifBtn.disabled = true;
        el.saveNotifBtn.textContent = "Saving...";

        const payload = {
          enabled: el.notifEnabled?.checked || false,
          reminderH3: el.notifH3?.checked || false,
          reminderH1: el.notifH1?.checked || false,
          eventUpdates: el.notifUpdates?.checked || false,
        };

        await apiFetch("/api/auth/notifications", {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        alert("Notification settings saved successfully!");
        el.saveNotifBtn.textContent = "Save Notification Settings";
        el.saveNotifBtn.disabled = false;
      } catch (err) {
        console.error(err);
        alert(err?.message || "Failed to save notification settings");
        el.saveNotifBtn.textContent = "Save Notification Settings";
        el.saveNotifBtn.disabled = false;
      }
    });
  }

  if (el.btnSave) {
    el.btnSave.addEventListener("click", () => {
      (async () => {
        try {
          await saveMe();
        } catch (err) {
          console.error(err);
          alert(err?.message || "Gagal menyimpan profile.");
        }
      })();
    });
  }

  if (el.btnLogout) {
    el.btnLogout.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "login.html";
    });
  }

  if (el.btnChangePassword) {
    el.btnChangePassword.addEventListener("click", () => {
      alert(
        "Change Password via API sudah tersedia. UI-nya belum dibuat di halaman ini."
      );
    });
  }

  // Load user data on page load
  loadMe();
});
