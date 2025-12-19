// js/createevent.js
document.addEventListener("DOMContentLoaded", () => {
  if (!window.NP_UTIL || typeof apiFetch !== "function") {
    alert("Script belum termuat. Cek urutan script di createevent.html");
    return;
  }

  // wajib login
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  const $ = (sel) => document.querySelector(sel);

  const titleEl = $("#title");
  const descEl = $("#description");
  const dateEl = $("#date");
  const timeEl = $("#time");
  const locEl = $("#location");
  const dlEl = $("#deadline");

  const addDateBtn = $("#addDateInline");
  const addLocBtn = $("#addLocInline");

  const dateList = $("#date-list");
  const locList = $("#loc-list");

  const btnReset = $("#btn-reset");
  const btnSubmit = $("#btn-submit");

  const DATES = []; // ISO strings
  const LOCS = []; // labels

  function renderDates() {
    dateList.innerHTML = DATES.map(
      (iso, i) =>
        `<li class="chip">${NP_UTIL.NP_escape(
          NP_UTIL.NP_fmt(iso)
        )} <span class="chip-x" data-i="${i}">×</span></li>`
    ).join("");
  }
  function renderLocs() {
    locList.innerHTML = LOCS.map(
      (lab, i) =>
        `<li class="chip">${NP_UTIL.NP_escape(
          lab
        )} <span class="chip-x" data-i="${i}">×</span></li>`
    ).join("");
  }

  addDateBtn.addEventListener("click", () => {
    const d = (dateEl.value || "").trim();
    const t = (timeEl.value || "").trim();
    if (!d) return alert("Pilih Date dulu");
    const iso = new Date(`${d}T${t || "00:00"}`).toISOString();
    DATES.push(iso);
    renderDates();
  });
  dateList.addEventListener("click", (e) => {
    if (e.target.classList.contains("chip-x")) {
      DATES.splice(Number(e.target.dataset.i), 1);
      renderDates();
    }
  });

  addLocBtn.addEventListener("click", () => {
    const v = (locEl.value || "").trim();
    if (!v) return;
    LOCS.push(v);
    locEl.value = "";
    renderLocs();
  });
  locList.addEventListener("click", (e) => {
    if (e.target.classList.contains("chip-x")) {
      LOCS.splice(Number(e.target.dataset.i), 1);
      renderLocs();
    }
  });

  btnReset.addEventListener("click", () => {
    titleEl.value = "";
    descEl.value = "";
    dateEl.value = "";
    timeEl.value = "";
    locEl.value = "";
    dlEl.value = "";
    DATES.length = 0;
    LOCS.length = 0;
    renderDates();
    renderLocs();
  });

  btnSubmit.addEventListener("click", () => {
    const title = (titleEl.value || "").trim();
    const description = (descEl.value || "").trim();
    const initialLocation = (locEl.value || "").trim();
    const deadline = (dlEl.value || "").trim() || null;

    if (!title) return alert("Event Title wajib diisi");

    // kalau user masih menulis 1 lokasi di field utama, ikutkan juga
    if (initialLocation && !LOCS.includes(initialLocation))
      LOCS.push(initialLocation);

    (async () => {
      try {
        const payload = {
          title,
          description,
          deadline,
          proposedDates: DATES,
          locationOptions: LOCS,
        };

        const data = await apiFetch("/api/events", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        alert("Event created! Code: " + data.code);
        location.href = "detailevent.html?code=" + encodeURIComponent(data.code);
      } catch (err) {
        console.error(err);
        if (err?.message) alert(err.message);
        else alert("Gagal membuat event. Pastikan backend aktif dan kamu sudah login.");
      }
    })();
  });
});
