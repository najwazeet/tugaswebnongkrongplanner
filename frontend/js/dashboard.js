document.addEventListener("DOMContentLoaded", () => {
  // wajib login
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  loadDashboard();
});

async function loadDashboard() {
  try {
    const data = await apiFetch("/api/events"); // { events: [...] }
    const events = data.events || [];
    renderEvents(events);
  } catch (err) {
    console.error(err);
    alert(err.message || "Session expired, please login again");
    localStorage.removeItem("token");
    window.location.href = "login.html";
  }
}

function renderEvents(events) {
  const upcomingContainer = document.getElementById("upcoming-events");
  const pastContainer = document.getElementById("past-events");

  if (!upcomingContainer || !pastContainer) {
    console.error(
      "Container not found. Need #upcoming-events and #past-events"
    );
    return;
  }

  upcomingContainer.innerHTML = "";
  pastContainer.innerHTML = "";

  const now = Date.now();

  // helper: parse date ISO / "YYYY-MM-DD HH:mm"
  const parseTs = (s) => {
    if (!s) return NaN;
    s = String(s).trim();
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) {
      const [d, t] = s.split(" ");
      const [y, m, day] = d.split("-").map(Number);
      const [hh, mm] = t.split(":").map(Number);
      return new Date(y, m - 1, day, hh, mm).getTime();
    }
    const dt = new Date(s);
    return isNaN(dt.getTime()) ? NaN : dt.getTime();
  };

  // urutin terbaru dulu
  const sorted = [...events].sort((a, b) => {
    const ta = parseTs(a.finalDateTime || a.createdAt) || 0;
    const tb = parseTs(b.finalDateTime || b.createdAt) || 0;
    return tb - ta;
  });

  sorted.forEach((ev) => {
    // tentuin masuk upcoming atau past
    const finalTs = parseTs(ev.finalDateTime);
    const isPast = ev.status === "ENDED" || (!isNaN(finalTs) && finalTs < now);

    const card = buildEventCard(ev);
    if (isPast) pastContainer.appendChild(card);
    else upcomingContainer.appendChild(card);
  });
}

function buildEventCard(ev) {
  const card = document.createElement("div");
  card.className =
    "event-card " + (ev.status === "POLLING" ? "yellow-card" : "peach-card");

  const dateText = ev.finalDateTime || "-";
  const locText = ev.finalLocation || "-";

  card.innerHTML = `
    <div class="event-info">
      <h3>${escapeHtml(ev.title || "-")}</h3>
      <p>- ${escapeHtml(dateText)}</p>
      <p>- ${escapeHtml(locText)}</p>
    </div>
    <button class="detail-btn">+ Detail</button>
  `;

  card.querySelector(".detail-btn").addEventListener("click", () => {
    window.location.href = `detailevent.html?code=${encodeURIComponent(
      ev.code
    )}`;
  });

  return card;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
