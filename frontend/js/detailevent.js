// js/detailevent.js — label di KIRI, lalu bar, tombol Vote, jumlah vote
document.addEventListener("DOMContentLoaded", () => {
  if (!window.NP_UTIL || typeof apiFetch !== "function") {
    alert("Script belum termuat. Cek urutan script di detailevent.html");
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
    alert("Event code tidak ada. Buka dari Dashboard.");
    location.href = "dashboard.html";
    return;
  }

  const el = {
    title: document.getElementById("event-title"),
    desc: document.getElementById("event-description"),
    fdate: document.getElementById("final-date"),
    ftime: document.getElementById("final-time"),
    floc: document.getElementById("final-location"),
    timePoll: document.getElementById("poll-options-time"),
    locPoll: document.getElementById("poll-options-location"),
    prefList: document.getElementById("preference-list"),
    addPref: document.getElementById("add-preference-btn"),
    members: document.getElementById("member-list"),
    deadline: document.getElementById("poll-deadline"),
    msgs: document.getElementById("messages"),
    chatInput: document.getElementById("chat-input"),
    sendBtn: document.getElementById("send-chat-btn"),
    inviteBtn: document.querySelector(".invite-btn"),
  };

  // Join (sekali, simpan di localStorage)
  const me = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();

  let currentEvent = null;
  let tick = null;

  function shouldPauseRender() {
    const a = document.activeElement;
    if (!a) return false;
    const id = a.id || "";
    if (id === "newDateTime" || id === "newLocation") return true;
    const tag = (a.tagName || "").toUpperCase();
    if (tag !== "INPUT" && tag !== "TEXTAREA") return false;
    return (
      (el.timePoll && el.timePoll.contains(a)) ||
      (el.locPoll && el.locPoll.contains(a))
    );
  }

  async function joinOnce() {
    await apiFetch(`/api/events/${encodeURIComponent(code)}/join`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  async function fetchEvent() {
    return apiFetch(`/api/events/${encodeURIComponent(code)}`);
  }

  function render() {
    const ev = currentEvent;
    if (!ev) {
      el.title.textContent = "Event tidak ditemukan";
      return;
    }
    const dateRank = ev.dateRank || [];
    const locRank = ev.locRank || [];
    const myVotes = ev.myVotes || { dateOptionId: null, locationOptionId: null };

    // Header
    el.title.textContent = ev.title || "Untitled";
    el.desc.textContent = ev.description || "-";
    const topDate = dateRank[0]?.iso || null;
    const topLoc = locRank[0]?.label || ev.finalLocation || "-";
    el.fdate.textContent = topDate ? NP_UTIL.NP_fmtDate(topDate) : "—";
    el.ftime.textContent = topDate ? NP_UTIL.NP_fmtTime(topDate) : "—";
    el.floc.textContent = ev.finalLocation || topLoc || "—";
    el.deadline.textContent = ev.deadline || "—";

    // Your preferences
    const myC = {
      dateOptionId: myVotes.dateOptionId,
      locationOptionId: myVotes.locationOptionId,
    };
    el.prefList.innerHTML = `
      <div class="preference-item">
        <div><div><b>Date/Time</b></div>
        <div class="pref-type">${
          myC.dateOptionId
            ? NP_UTIL.NP_fmt(
                dateRank.find((o) => o.id === myC.dateOptionId)?.iso
              )
            : "Belum memilih"
        }</div></div>
      </div>
      <div class="preference-item">
        <div><div><b>Location</b></div>
        <div class="pref-type">${
          myC.locationOptionId
            ? NP_UTIL.NP_escape(
                locRank.find((o) => o.id === myC.locationOptionId)?.label
              )
            : "Belum memilih"
        }</div></div>
      </div>
    `;
    el.addPref.onclick = () =>
      document
        .querySelector(".poll-section")
        .scrollIntoView({ behavior: "smooth" });

    // ===== Date/Time Poll =====
    el.timePoll.innerHTML = `
      <div class="preference-item" style="border-bottom:0">
        <input type="datetime-local" id="newDateTime" style="padding:8px;border:1px solid #ffefc2;border-radius:10px;background:#fffdf7;flex:1">
        <button class="vote-btn" id="addDateBtn">+ Add</button>
      </div>
      <div id="timeOptions"></div>
    `;
    document.getElementById("addDateBtn").onclick = () => {
      const v = document.getElementById("newDateTime").value;
      if (!v) return alert("Isi tanggal & jam");
      (async () => {
        try {
          await apiFetch(`/api/events/${encodeURIComponent(code)}/options/datetime`, {
            method: "POST",
            body: JSON.stringify({ iso: new Date(v).toISOString() }),
          });
          await refresh();
        } catch (err) {
          console.error(err);
          alert(err?.message || "Gagal menambah opsi tanggal.");
        }
      })();
    };

    const timeOptions = document.getElementById("timeOptions");
    const totalDateVotes = Math.max(
      1,
      dateRank.reduce((s, o) => s + o.votes, 0)
    );
    timeOptions.innerHTML =
      dateRank
        .map((o) => {
          const selected = myC.dateOptionId === o.id;
          const pct = Math.round((o.votes * 100) / totalDateVotes);
          const label = NP_UTIL.NP_escape(NP_UTIL.NP_fmt(o.iso));
          return `
        <div class="poll-item ${selected ? "selected" : ""}">
          <div class="label-col">${label}</div>
          <div class="progress-bar-container"><div class="progress-bar" style="width:${pct}%"></div></div>
          <button class="vote-btn" data-type="DATE" data-id="${o.id}">${
            selected ? "Voted" : "Vote"
          }</button>
          <div class="pref-type count-col">${o.votes} vote</div>
        </div>`;
        })
        .join("") || '<div class="pref-type">Belum ada opsi.</div>';

    timeOptions.onclick = (e) => {
      if (
        e.target.classList.contains("vote-btn") &&
        e.target.dataset.type === "DATE"
      ) {
        (async () => {
          try {
            await apiFetch(`/api/events/${encodeURIComponent(code)}/vote/datetime`, {
              method: "POST",
              body: JSON.stringify({ optionId: e.target.dataset.id }),
            });
            await refresh();
          } catch (err) {
            console.error(err);
            alert(err?.message || "Gagal vote date/time.");
          }
        })();
      }
    };

    // ===== Location Poll =====
    el.locPoll.innerHTML = `
      <div class="preference-item" style="border-bottom:0">
        <input type="text" id="newLocation" placeholder="Tambah lokasi..." style="padding:8px;border:1px solid #ffefc2;border-radius:10px;background:#fffdf7;flex:1">
        <button class="vote-btn" id="addLocBtn">+ Add</button>
      </div>
      <div id="locOptions"></div>
    `;
    document.getElementById("addLocBtn").onclick = () => {
      const v = (document.getElementById("newLocation").value || "").trim();
      if (!v) return;
      (async () => {
        try {
          await apiFetch(`/api/events/${encodeURIComponent(code)}/options/location`, {
            method: "POST",
            body: JSON.stringify({ label: v }),
          });
          await refresh();
        } catch (err) {
          console.error(err);
          alert(err?.message || "Gagal menambah opsi lokasi.");
        }
      })();
    };

    const locOptions = document.getElementById("locOptions");
    const totalLocVotes = Math.max(
      1,
      locRank.reduce((s, o) => s + o.votes, 0)
    );
    locOptions.innerHTML =
      locRank
        .map((o) => {
          const selected = myC.locationOptionId === o.id;
          const pct = Math.round((o.votes * 100) / totalLocVotes);
          const label = NP_UTIL.NP_escape(o.label);
          return `
        <div class="poll-item ${selected ? "selected" : ""}">
          <div class="label-col">${label}</div>
          <div class="progress-bar-container"><div class="progress-bar" style="width:${pct}%"></div></div>
          <button class="vote-btn" data-type="LOCATION" data-id="${o.id}">${
            selected ? "Voted" : "Vote"
          }</button>
          <div class="pref-type count-col">${o.votes} vote</div>
        </div>`;
        })
        .join("") || '<div class="pref-type">Belum ada opsi.</div>';

    locOptions.onclick = (e) => {
      if (
        e.target.classList.contains("vote-btn") &&
        e.target.dataset.type === "LOCATION"
      ) {
        (async () => {
          try {
            await apiFetch(`/api/events/${encodeURIComponent(code)}/vote/location`, {
              method: "POST",
              body: JSON.stringify({ optionId: e.target.dataset.id }),
            });
            await refresh();
          } catch (err) {
            console.error(err);
            alert(err?.message || "Gagal vote lokasi.");
          }
        })();
      }
    };

    // Members
    el.members.innerHTML =
      (ev.members || [])
        .map(
          (p) => `
      <div class="member-item"><i class="fas fa-user-circle" style="margin-right:8px"></i>
      <span>${NP_UTIL.NP_escape(p.name)}</span></div>`
        )
        .join("") || '<div class="pref-type">Belum ada anggota.</div>';

    // Discussion
    el.msgs.innerHTML = (ev.messages || [])
      .map(
        (m) => `
      <div class="message-item">
        <span class="user-name">${NP_UTIL.NP_escape(m.name)}</span>
        <span class="timestamp">• ${NP_UTIL.NP_fmt(m.at)}</span>
        <div>${NP_UTIL.NP_escape(m.text)}</div>
      </div>`
      )
      .join("");
    el.sendBtn.onclick = () => {
      const t = (el.chatInput.value || "").trim();
      if (!t) return;
      (async () => {
        try {
          await apiFetch(`/api/events/${encodeURIComponent(code)}/messages`, {
            method: "POST",
            body: JSON.stringify({ text: t }),
          });
          el.chatInput.value = "";
          await refresh();
        } catch (err) {
          console.error(err);
          alert(err?.message || "Gagal mengirim pesan.");
        }
      })();
    };

    // Invite
    el.inviteBtn.onclick = () => {
      const url = `${location.origin}${
        location.pathname
      }?code=${encodeURIComponent(code)}`;
      NP_UTIL.NP_copy(url);
      alert("Link event dicopy:\n" + url);
    };

    const endBtn = document.getElementById("endEvent");
    if (endBtn) {
      endBtn.style.display = ev.ownerUserId && me?.id && ev.ownerUserId === me.id ? "" : "none";
    }
  }

  async function refresh() {
    try {
      currentEvent = await fetchEvent();
      if (shouldPauseRender()) return;
      render();
    } catch (err) {
      console.error(err);
      alert(err?.message || "Gagal mengambil detail event.");
      if ((err?.message || "").toLowerCase().includes("token")) {
        localStorage.removeItem("token");
        window.location.href = "login.html";
      }
    }
  }

  (async () => {
    try {
      await joinOnce();
      await refresh();
      tick = setInterval(refresh, 1500);
      window.addEventListener("beforeunload", () => {
        if (tick) clearInterval(tick);
      });
    } catch (err) {
      console.error(err);
      alert(err?.message || "Gagal join event.");
      if ((err?.message || "").toLowerCase().includes("token")) {
        localStorage.removeItem("token");
        window.location.href = "login.html";
      }
    }
  })();

  // === Actions (Split Bill & End Event) ===
  (function attachActions() {
    const rightCol = document.querySelector(".column-right");
    let act = document.getElementById("actions-card");
    if (!act) {
      act = document.createElement("section");
      act.className = "actions-card";
      act.id = "actions-card";
      rightCol.appendChild(act);
    }
    act.innerHTML = `
    <button id="goSplit" class="btn-split">Split Bill</button>
    <button id="endEvent" class="btn-end">End Event</button>
  `;
    document.getElementById("goSplit").onclick = () => {
      location.href = "splitbill.html?code=" + encodeURIComponent(code);
    };
    document.getElementById("endEvent").onclick = () => {
      if (
        confirm(
          "End event sekarang? Polling akan ditutup dan final diambil dari vote tertinggi."
        )
      ) {
        (async () => {
          try {
            await apiFetch(`/api/events/${encodeURIComponent(code)}/finalize`, {
              method: "POST",
              body: JSON.stringify({}),
            });
            await refresh();
          } catch (err) {
            console.error(err);
            alert(err?.message || "Gagal finalize event.");
          }
        })();
      }
    };

    const endBtn = document.getElementById("endEvent");
    if (endBtn && currentEvent?.ownerUserId && me?.id) {
      endBtn.style.display = currentEvent.ownerUserId === me.id ? "" : "none";
    }
  })();
});
