// js/splitbill_final.js
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

  const code = (NP_UTIL.NP_qs("code") || "").toUpperCase();
  if (!code) {
    alert("Code event tidak ada.");
    location.href = "dashboard.html";
    return;
  }

  // helpers
  const fmtRp = (n) =>
    "Rp" +
    Math.round(n)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const paidKey = (c) => `np:billpaid:${c}`;
  const getPaidMap = () =>
    JSON.parse(localStorage.getItem(paidKey(code)) || "{}");
  const setPaidMap = (m) =>
    localStorage.setItem(paidKey(code), JSON.stringify(m));


  let ev = null;
  let finalData = null; // { mode, total, rows }

  async function ensureJoined() {
    await apiFetch(`/api/events/${encodeURIComponent(code)}/join`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  async function fetchEvent() {
    ev = await apiFetch(`/api/events/${encodeURIComponent(code)}`);
    return ev;
  }

  async function fetchFinal() {
    finalData = await apiFetch(`/api/events/${encodeURIComponent(code)}/bill/final`);
    return finalData;
  }

  // render UI
  function getRows() {
    return finalData?.rows || [];
  }

  function renderHeader() {
    document.getElementById("evTitle").textContent = ev?.title || "Untitled";
    document.getElementById("modeBadge").textContent =
      (finalData?.mode || "EVEN") === "EVEN" ? "EVENLY" : "BY ITEM";
    document.getElementById("totalAmt").textContent = fmtRp(finalData?.total || 0);
  }

  const resultList = document.getElementById("resultList");
  const paidMap = getPaidMap();

  function paint() {
    const rows = getRows();

    resultList.innerHTML = rows
      .map((r) => {
        const paid = !!paidMap[r.memberId];
        const rightBtn = paid
          ? `<span class="paid-badge">✓&nbsp; Paid</span>`
          : `<button class="paid-btn" data-id="${r.memberId}">Mark as Paid</button>`;
        return `
        <li class="result-item">
          <div class="name">${NP_UTIL.NP_escape(r.name)}</div>
          <div class="amount">${fmtRp(r.amount)}</div>
          <div class="act">${rightBtn}</div>
        </li>`;
      })
      .join("");
  }

  async function refresh() {
    try {
      await ensureJoined();
      await fetchEvent();
      await fetchFinal();
      renderHeader();
      paint();
    } catch (err) {
      console.error(err);
      alert(err?.message || "Gagal memuat final split bill.");
      if ((err?.message || "").toLowerCase().includes("token")) {
        localStorage.removeItem("token");
        window.location.href = "login.html";
      }
    }
  }

  refresh();

  // mark paid handlers
  resultList.addEventListener("click", (e) => {
    if (e.target.classList.contains("paid-btn")) {
      const id = e.target.getAttribute("data-id");
      paidMap[id] = true;
      setPaidMap(paidMap);
      paint();
    }
  });

  // buttons bawah
  document.getElementById("backSplit").onclick = () =>
    (location.href = "splitbill.html?code=" + encodeURIComponent(code));
  document.getElementById("copySum").onclick = () => {
    const rows = getRows();
    const text = [
      `Split Bill Result — ${ev?.title || "Untitled"}`,
      `Mode: ${(finalData?.mode || "EVEN") === "EVEN" ? "Evenly" : "By Item"}`,
      `Total Bill: ${fmtRp(finalData?.total || 0)}`,
      ...rows.map((r) => `${r.name}: ${fmtRp(r.amount)}`),
    ].join("\n");
    navigator.clipboard?.writeText(text);
    alert("Summary copied to clipboard.");
  };
  // back ke Dashboard (dashboard.html)
  document.getElementById("goDash").onclick = () => {
    location.href = "dashboard.html";
  };
});
