// js/notification.js
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

  const list = document.querySelector(".notif-list");

  function timeAgo(d) {
    const t = new Date(d).getTime();
    if (isNaN(t)) return "";
    const diff = Date.now() - t;
    const min = Math.floor(diff / 60000);
    if (min < 1) return "just now";
    if (min < 60) return `${min} mins ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} hours ago`;
    const day = Math.floor(hr / 24);
    return `${day} days ago`;
  }

  function render(items) {
    if (!list) return;

    if (!items.length) {
      list.innerHTML =
        '<div class="notif-item"><div class="notif-info"><p class="notif-text">Belum ada notifikasi.</p></div></div>';
      return;
    }

    list.innerHTML = items
      .map((n) => {
        return `
        <div class="notif-item">
          <div class="notif-info">
            <p class="notif-text">${NP_UTIL.NP_escape(n.text)}</p>
            <span class="notif-time">${NP_UTIL.NP_escape(timeAgo(n.at))}</span>
          </div>
          <button class="btn-detail" data-code="${NP_UTIL.NP_escape(
            n.code
          )}">+ Detail</button>
        </div>`;
      })
      .join("");
  }

  async function refresh() {
    const data = await apiFetch("/api/notifications");
    render(data.notifications || []);
  }

  if (list) {
    list.addEventListener("click", (e) => {
      if (e.target.classList.contains("btn-detail")) {
        const code = e.target.getAttribute("data-code") || "";
        if (!code) return;
        window.location.href = "detailevent.html?code=" + encodeURIComponent(code);
      }
    });
  }

  (async () => {
    try {
      await refresh();
    } catch (err) {
      console.error(err);
      alert(err?.message || "Gagal memuat notifikasi.");
      if ((err?.message || "").toLowerCase().includes("token")) {
        localStorage.removeItem("token");
        window.location.href = "login.html";
      }
    }
  })();
});
