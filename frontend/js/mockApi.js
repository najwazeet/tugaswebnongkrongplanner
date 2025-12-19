// js/mockApi.js
(function (w) {
  const LS_EVENTS = "np:events",
    LS_CLIENT = "np:client";
  function load() {
    return JSON.parse(localStorage.getItem(LS_EVENTS) || "[]");
  }
  function save(arr) {
    localStorage.setItem(LS_EVENTS, JSON.stringify(arr));
  }
  function client() {
    let c = JSON.parse(localStorage.getItem(LS_CLIENT) || "null");
    if (!c) {
      c = { id: NP_UTIL.NP_uid(), name: "You" };
      localStorage.setItem(LS_CLIENT, JSON.stringify(c));
    }
    return c;
  }
  function setClientName(name) {
    const c = client();
    if (name) c.name = name;
    localStorage.setItem(LS_CLIENT, JSON.stringify(c));
    return c;
  }

  function createEvent({
    title,
    description,
    proposedDates = [],
    locationOptions = [],
    initialLocation = "",
    deadline = null,
  }) {
    const me = client();
    const now = new Date().toISOString();
    const code = NP_UTIL.NP_generateCode();
    const ev = {
      id: NP_UTIL.NP_uid(),
      code,
      title,
      description,
      initialLocation,
      deadline,
      createdAt: now,
      status: "POLLING",
      finalDateTime: null,
      finalLocation: null,
      ownerId: me.id,
      participants: [{ id: me.id, name: me.name, joinedAt: now }],
      dateOptions: proposedDates.map((iso) => ({ id: NP_UTIL.NP_uid(), iso })),
      locationOptions: locationOptions.map((label) => ({
        id: NP_UTIL.NP_uid(),
        label,
      })),
      memberChoices: {},
      messages: [],
    };
    const all = load();
    all.push(ev);
    save(all);
    return ev;
  }
  function getEvent(code) {
    return load().find((e) => e.code === code) || null;
  }
  function updateEvent(code, fn) {
    const arr = load();
    const i = arr.findIndex((e) => e.code === code);
    if (i < 0) return null;
    const next = typeof fn === "function" ? fn(arr[i]) : fn;
    arr[i] = next;
    save(arr);
    return next;
  }
  function joinEvent(code, name) {
    const me = setClientName(name || "You");
    const now = new Date().toISOString();
    return updateEvent(code, (e) => {
      if (!e.participants.some((p) => p.id === me.id))
        e.participants.push({ id: me.id, name: me.name, joinedAt: now });
      return e;
    });
  }
  function addDateOption(code, iso) {
    return updateEvent(code, (e) => {
      e.dateOptions.push({ id: NP_UTIL.NP_uid(), iso });
      return e;
    });
  }
  function addLocationOption(code, label) {
    return updateEvent(code, (e) => {
      e.locationOptions.push({ id: NP_UTIL.NP_uid(), label });
      return e;
    });
  }
  function vote(code, type, optionId) {
    const me = client();
    return updateEvent(code, (e) => {
      const c = e.memberChoices[me.id] || {};
      if (type === "DATE") c.dateOptionId = optionId;
      if (type === "LOCATION") c.locationOptionId = optionId;
      e.memberChoices[me.id] = c;
      return e;
    });
  }
  function postMessage(code, text) {
    const me = client();
    const now = new Date().toISOString();
    return updateEvent(code, (e) => {
      e.messages.push({
        id: NP_UTIL.NP_uid(),
        memberId: me.id,
        name: me.name,
        text,
        at: now,
      });
      return e;
    });
  }
  function getRanking(e) {
    const dc = new Map(),
      lc = new Map();
    Object.values(e.memberChoices).forEach((c) => {
      if (c.dateOptionId)
        dc.set(c.dateOptionId, (dc.get(c.dateOptionId) || 0) + 1);
      if (c.locationOptionId)
        lc.set(c.locationOptionId, (lc.get(c.locationOptionId) || 0) + 1);
    });
    const dateRank = e.dateOptions
      .map((o) => ({ id: o.id, iso: o.iso, votes: dc.get(o.id) || 0 }))
      .sort((a, b) => b.votes - a.votes);
    const locRank = e.locationOptions
      .map((o) => ({ id: o.id, label: o.label, votes: lc.get(o.id) || 0 }))
      .sort((a, b) => b.votes - a.votes);
    return { dateRank, locRank };
  }
  function listEvents() {
    return load();
  }
  function finalize(code) {
    return updateEvent(code, (e) => {
      const { dateRank, locRank } = getRanking(e);
      if (dateRank.length) e.finalDateTime = dateRank[0].iso;
      if (locRank.length) e.finalLocation = locRank[0].label;
      e.status = "FINAL";
      return e;
    });
  }

  // ===== Bills (per event) =====
  function billKey(code) {
    return `np:bill:${code}`;
  }
  function getBill(code) {
    const raw = localStorage.getItem(billKey(code));
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {}
    }
    return { total: 0, splitMode: "EVEN", items: [] }; // default
  }
  function saveBill(code, bill) {
    localStorage.setItem(billKey(code), JSON.stringify(bill));
    return bill;
  }
  function addBillItem(code, item) {
    const b = getBill(code);
    const it = { id: NP_UTIL.NP_uid(), ...item };
    b.items.push(it);
    saveBill(code, b);
    return it;
  }
  function removeBillItem(code, itemId) {
    const b = getBill(code);
    b.items = b.items.filter((i) => i.id !== itemId);
    saveBill(code, b);
    return b;
  }
  function clearBill(code) {
    saveBill(code, { total: 0, splitMode: "EVEN", items: [] });
  }

  w.MockApi = {
    createEvent,
    getEvent,
    updateEvent,
    joinEvent,
    addDateOption,
    addLocationOption,
    vote,
    postMessage,
    getRanking,
    listEvents,
    finalize,
    setClientName,
    getClient: () => client(),
    // bills
    getBill,
    saveBill,
    addBillItem,
    removeBillItem,
    clearBill,
  };
})(window);
