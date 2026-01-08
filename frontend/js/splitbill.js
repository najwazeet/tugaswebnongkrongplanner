// js/splitbill.js
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
    alert("Code event tidak ada. Buka dari Detail Event.");
    location.href = "dashboard.html";
    return;
  }

  // --- helpers rupiah ---
  const fmtRp = (n) =>
    "Rp" +
    Math.round(n)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const parseRp = (s) => Number(String(s || "").replace(/[^\d]/g, "")) || 0;

  // el
  const totalInput = document.getElementById("totalInput");
  const attendeesBox = document.getElementById("attendees");
  const assignSel = document.getElementById("assignTo");
  const itemName = document.getElementById("itemName");
  const itemCost = document.getElementById("itemCost");
  const addItem = document.getElementById("addItem");
  const itemsList = document.getElementById("itemsList");
  const optEven = document.getElementById("optEven");
  const optItem = document.getElementById("optItem");
  const summaryRows = document.getElementById("summaryRows");
  const remainingRow = document.getElementById("remainingRow");
  const calcBtn = document.getElementById("calcBtn");

  let currentEvent = null;
  let members = []; // [{ id, name, userId }]
  let joined = false;

  async function ensureJoined() {
    if (joined) return;
    try {
      await apiFetch(`/api/events/${encodeURIComponent(code)}/join`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      joined = true;
    } catch (err) {
      // kalau gagal join karena alasan lain, biarkan fetchEvent melempar error berikutnya
      console.error(err);
    }
  }

  function getBill() {
    const b = currentEvent?.bill || {};
    return {
      total: typeof b.total === "number" ? b.total : 0,
      splitMode: b.splitMode || "EVEN",
      items: Array.isArray(b.items) ? b.items : [],
    };
  }

  async function fetchEvent() {
    currentEvent = await apiFetch(`/api/events/${encodeURIComponent(code)}`);
    members = currentEvent?.members || [];
    return currentEvent;
  }

  function distributeRemainder(rem, n) {
    const q = Math.floor(rem / n);
    const r = rem - q * n;
    const arr = Array(n).fill(q);
    for (let i = 0; i < r; i++) arr[i] += 1;
    return arr;
  }

  function renderAttendees() {
    attendeesBox.innerHTML = members
      .map(
        (m) =>
          `<div class="att"><i>👤</i><span>${NP_UTIL.NP_escape(
            m.name
          )}</span></div>`
      )
      .join("");

    assignSel.innerHTML =
      `<option value="">Select Attendee</option>` +
      members
        .map(
          (m) => `<option value="${m.id}">${NP_UTIL.NP_escape(m.name)}</option>`
        )
        .join("");
  }

  function renderBillInputs() {
    const b = getBill();
    totalInput.value = b.total ? fmtRp(b.total) : "";
    optEven.classList.toggle("active", (b.splitMode || "EVEN") === "EVEN");
    optItem.classList.toggle("active", (b.splitMode || "EVEN") === "ITEM");
  }

  function renderItems() {
    const b = getBill();
    itemsList.innerHTML =
      (b.items || [])
        .map((it) => {
          const itemId = String(it._id || it.id || "");
          const assigneeId = String(it.assigneeMemberId || "");
          const person = members.find((m) => m.id === assigneeId)?.name || "-";
          return `<li>
        <div class="left">
          <span class="name">${NP_UTIL.NP_escape(it.name)}</span>
          <span class="meta">${NP_UTIL.NP_escape(person)}</span>
        </div>
        <div>
          <span class="meta" style="margin-right:8px">${fmtRp(it.cost)}</span>
          <button class="rm" data-id="${NP_UTIL.NP_escape(
            itemId
          )}">Remove</button>
        </div>
      </li>`;
        })
        .join("") ||
      '<div class="meta" style="padding:6px 0 0 2px">Belum ada item.</div>';
  }

  async function setBill(partial) {
    const b = getBill();
    const payload = {
      total: typeof partial.total === "number" ? partial.total : b.total,
      splitMode: partial.splitMode || b.splitMode,
    };
    await apiFetch(`/api/events/${encodeURIComponent(code)}/bill`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  let totalSyncTimer = null;
  totalInput.addEventListener("input", () => {
    const n = parseRp(totalInput.value);
    totalInput.value = n ? fmtRp(n) : "";
    if (totalSyncTimer) clearTimeout(totalSyncTimer);
    totalSyncTimer = setTimeout(async () => {
      try {
        await setBill({ total: n });
        await refresh();
      } catch (err) {
        console.error(err);
      }
    }, 400);
  });
  itemCost.addEventListener("input", () => {
    const n = parseRp(itemCost.value);
    itemCost.value = n ? n.toLocaleString("id-ID") : "";
  });

  // add item
  addItem.addEventListener("click", () => {
    const name = (itemName.value || "").trim();
    const cost = parseRp(itemCost.value);
    const who = assignSel.value;
    if (!name || !cost || !who) {
      alert("Lengkapi item name, cost, dan assignee.");
      return;
    }
    (async () => {
      try {
        await apiFetch(`/api/events/${encodeURIComponent(code)}/bill/items`, {
          method: "POST",
          body: JSON.stringify({ name, cost, assigneeMemberId: who }),
        });
        itemName.value = "";
        itemCost.value = "";
        assignSel.value = "";
        await refresh();
      } catch (err) {
        console.error(err);
        alert(err?.message || "Gagal menambah item.");
      }
    })();
  });
  itemsList.onclick = (e) => {
    if (e.target.classList.contains("rm")) {
      const itemId = e.target.dataset.id;
      (async () => {
        try {
          await apiFetch(
            `/api/events/${encodeURIComponent(
              code
            )}/bill/items/${encodeURIComponent(itemId)}`,
            { method: "DELETE" }
          );
          await refresh();
        } catch (err) {
          console.error(err);
          alert(err?.message || "Gagal menghapus item.");
        }
      })();
    }
  };

  // choose split mode
  function setMode(mode) {
    (async () => {
      try {
        await setBill({ splitMode: mode });
        await refresh();
      } catch (err) {
        console.error(err);
        alert(err?.message || "Gagal mengubah mode split.");
      }
    })();
  }
  optEven.addEventListener("click", () => setMode("EVEN"));
  optItem.addEventListener("click", () => setMode("ITEM"));

  // calculate
  function calculate() {
    const b = getBill();
    const total = b.total || 0;
    const rows = [];
    const n = members.length || 1;

    if ((b.splitMode || "EVEN") === "EVEN") {
      const shares = distributeRemainder(total, n);
      for (let i = 0; i < members.length; i++) {
        rows.push({ name: members[i].name, amount: shares[i] });
      }
    } else {
      // ITEM mode: summary = total item per attendee SAJA
      const base = new Map(members.map((m) => [m.id, 0]));

      for (const it of b.items || []) {
        const k = String(it.assigneeMemberId || "");
        base.set(k, (base.get(k) || 0) + (it.cost || 0));
      }

      for (let i = 0; i < members.length; i++) {
        rows.push({
          name: members[i].name,
          amount: base.get(members[i].id) || 0,
        });
      }
    }

    // render summary
    summaryRows.innerHTML = rows
      .map(
        (r) =>
          `<div class="row"><div>${NP_UTIL.NP_escape(r.name)}</div><div>${fmtRp(
            r.amount
          )}</div></div>`
      )
      .join("");

    // remaining balance (total vs sum items)
    const sumItems = (getBill().items || []).reduce(
      (s, i) => s + (i.cost || 0),
      0
    );
    const remain = total - sumItems;
    remainingRow.textContent = remain
      ? `Remaining Balance  ${fmtRp(remain)}`
      : "";
  }

  calcBtn.addEventListener("click", calculate);

  // buka halaman final
  document.getElementById("finalBtn").addEventListener("click", () => {
    location.href = "splitbill_final.html?code=" + encodeURIComponent(code);
  });
  // kembali ke detail event
  document.getElementById("sbBack").addEventListener("click", () => {
    location.href = "detailevent.html?code=" + encodeURIComponent(code);
  });

  // first paint (biar ada summary awal kalau total/items sudah tersimpan)
  async function refresh() {
    try {
      await ensureJoined();
      await fetchEvent();
      renderAttendees();
      renderBillInputs();
      renderItems();
      calculate();
    } catch (err) {
      console.error(err);
      alert(err?.message || "Gagal memuat data split bill.");
      if ((err?.message || "").toLowerCase().includes("token")) {
        localStorage.removeItem("token");
        window.location.href = "login.html";
      }
    }
  }

  refresh();
});
