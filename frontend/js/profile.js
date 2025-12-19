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
    btnChangePassword: Array.from(document.querySelectorAll("button")).find(
      (b) => (b.textContent || "").trim().toLowerCase() === "change password"
    ),
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
  }

  async function loadMe() {
    const data = await apiFetch("/api/auth/me");
    setUser(data.user);
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

  (async () => {
    try {
      await loadMe();
    } catch (err) {
      console.error(err);
      alert(err?.message || "Gagal memuat profile.");
      if ((err?.message || "").toLowerCase().includes("token")) {
        localStorage.removeItem("token");
        window.location.href = "login.html";
      }
    }
  })();
});
