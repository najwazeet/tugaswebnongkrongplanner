const express = require("express");
const Event = require("../models/Event");
const { authRequired } = require("../middleware/auth");
const { generateCode } = require("../utils/code");
const { computeFinalSplit } = require("../utils/bill");

const {
  CreateEventSchema,
  AddDateSchema,
  AddLocSchema,
  VoteSchema,
  MessageSchema,
  BillSetSchema,
  BillItemSchema,
} = require("../utils/validators");

const router = express.Router();

router.use(authRequired);

/** helper: count votes for optionId from Map */
function countVotes(mapObj) {
  const counts = {};
  for (const [userId, optionId] of mapObj.entries()) {
    counts[optionId] = (counts[optionId] || 0) + 1;
  }
  return counts;
}

function isAfterDeadline(ev) {
  if (!ev.deadline) return false; // kalau deadline null, voting tetap buka
  // deadline disimpan "YYYY-MM-DD"
  const end = new Date(ev.deadline + "T23:59:59").getTime();
  return Date.now() > end;
}

function pickTopOption(options, counts, getKey) {
  if (!options || options.length === 0) return null;
  return (
    options
      .map((o) => ({ o, v: counts[getKey(o)] || 0 }))
      // kalau seri, pilih yang dibuat lebih dulu (urutan array)
      .sort((a, b) => b.v - a.v)[0]?.o || null
  );
}

async function finalizeIfNeeded(ev, countVotes) {
  if (ev.status !== "POLLING") return false;
  if (!isAfterDeadline(ev)) return false;

  const dateCounts = countVotes(ev.votes.date);
  const locCounts = countVotes(ev.votes.location);

  const topDate = pickTopOption(ev.dateOptions, dateCounts, (o) =>
    o._id.toString()
  );
  const topLoc = pickTopOption(ev.locationOptions, locCounts, (o) =>
    o._id.toString()
  );

  ev.finalDateTime = topDate?.iso || ev.finalDateTime;
  ev.finalLocation = topLoc?.label || ev.finalLocation;
  ev.status = "FINAL";

  await ev.save();
  return true;
}

function safeUsername(email) {
  return (email || "user").split("@")[0].slice(0, 30);
}

/** Create Event (auth) */
router.post("/", async (req, res, next) => {
  try {
    const data = CreateEventSchema.parse(req.body);

    let code = generateCode(6);
    while (await Event.exists({ code })) code = generateCode(6);

    const ownerId = req.user.id;

    const ev = await Event.create({
      code,
      ownerUserId: ownerId,
      title: data.title,
      description: data.description,
      deadline: data.deadline,

      members: [{ userId: ownerId, name: safeUsername(req.user.email) }],

      dateOptions: data.proposedDates.map((iso) => ({
        iso,
        createdBy: ownerId,
      })),
      locationOptions: data.locationOptions.map((label) => ({
        label,
        createdBy: ownerId,
      })),

      bill: { total: 0, splitMode: "EVEN", items: [] },
    });

    res.status(201).json({ code: ev.code, id: ev._id.toString() });
  } catch (e) {
    next(e);
  }
});

/** List Events for user (auth) */
router.get("/", async (req, res, next) => {
  try {
    const uid = req.user.id;

    const events = await Event.find({
      $or: [{ ownerUserId: uid }, { "members.userId": uid }],
    })
      .select(
        "code title status finalDateTime finalLocation createdAt deadline"
      )
      .sort({ createdAt: -1 })
      .lean();

    res.json({ events });
  } catch (e) {
    next(e);
  }
});

/** Join by invite link (auth) */
router.post("/:code/join", async (req, res, next) => {
  try {
    const code = req.params.code.toUpperCase();
    const uid = req.user.id;
    const name = safeUsername(req.user.email);

    const ev = await Event.findOne({ code });
    if (!ev) return res.status(404).json({ message: "Event not found" });

    const exists = ev.members.some((m) => m.userId.toString() === uid);
    if (!exists) ev.members.push({ userId: uid, name });

    await ev.save();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/** Detail Event by code (auth) */
router.get("/:code", async (req, res, next) => {
  try {
    const code = req.params.code.toUpperCase();
    const uid = req.user.id;

    // PENTING: jangan lean, karena kita mau ev.save()
    const ev = await Event.findOne({ code });
    if (!ev) return res.status(404).json({ message: "Event not found" });

    const isMember = (ev.members || []).some(
      (m) => m.userId.toString() === uid
    );
    if (!isMember) return res.status(403).json({ message: "Join event first" });

    // AUTO FINALIZE kalau lewat deadline
    await finalizeIfNeeded(ev, countVotes);

    const myVotes = {
      dateOptionId: ev.votes?.date?.get?.(uid) || null,
      locationOptionId: ev.votes?.location?.get?.(uid) || null,
    };

    // setelah finalize, bikin data response seperti biasa
    const dateCounts = countVotes(ev.votes.date);
    const locCounts = countVotes(ev.votes.location);

    const dateRank = (ev.dateOptions || [])
      .map((o) => ({
        id: o._id.toString(),
        iso: o.iso,
        votes: dateCounts[o._id.toString()] || 0,
      }))
      .sort((a, b) => b.votes - a.votes);

    const locRank = (ev.locationOptions || [])
      .map((o) => ({
        id: o._id.toString(),
        label: o.label,
        votes: locCounts[o._id.toString()] || 0,
      }))
      .sort((a, b) => b.votes - a.votes);

    res.json({
      code: ev.code,
      ownerUserId: ev.ownerUserId?.toString?.() || null,
      title: ev.title,
      description: ev.description,
      status: ev.status,
      deadline: ev.deadline,
      finalDateTime: ev.finalDateTime,
      finalLocation: ev.finalLocation,
      members: (ev.members || []).map((m) => ({
        id: m._id.toString(), // <-- ini memberId yang dipakai split bill
        userId: m.userId.toString(),
        name: m.name,
      })),

      dateRank,
      locRank,
      myVotes,
      messages: (ev.messages || []).map((msg) => ({
        id: msg._id.toString(),
        userId: msg.userId?.toString?.() || null,
        name: msg.name,
        text: msg.text,
        at: msg.at,
      })),
      bill: ev.bill || { total: 0, splitMode: "EVEN", items: [] },
    });
  } catch (e) {
    next(e);
  }
});

/** Add date option (auth, member only) */
router.post("/:code/options/datetime", async (req, res, next) => {
  try {
    const code = req.params.code.toUpperCase();
    const data = AddDateSchema.parse(req.body);
    const uid = req.user.id;

    const ev = await Event.findOne({ code });
    if (!ev) return res.status(404).json({ message: "Event not found" });

    if (isAfterDeadline(ev) || ev.status !== "POLLING") {
      return res.status(400).json({ message: "Polling already closed" });
    }

    const isMember = ev.members.some((m) => m.userId.toString() === uid);
    if (!isMember) return res.status(403).json({ message: "Join event first" });

    ev.dateOptions.push({ iso: data.iso, createdBy: uid });
    await ev.save();

    res.status(201).json({ optionId: ev.dateOptions.at(-1)._id.toString() });
  } catch (e) {
    next(e);
  }
});

router.post("/:code/options/location", async (req, res, next) => {
  try {
    const code = req.params.code.toUpperCase();
    const data = AddLocSchema.parse(req.body);
    const uid = req.user.id;

    const ev = await Event.findOne({ code });
    if (!ev) return res.status(404).json({ message: "Event not found" });

    if (isAfterDeadline(ev) || ev.status !== "POLLING") {
      return res.status(400).json({ message: "Polling already closed" });
    }

    const isMember = ev.members.some((m) => m.userId.toString() === uid);
    if (!isMember) return res.status(403).json({ message: "Join event first" });

    ev.locationOptions.push({ label: data.label, createdBy: uid });
    await ev.save();

    res
      .status(201)
      .json({ optionId: ev.locationOptions.at(-1)._id.toString() });
  } catch (e) {
    next(e);
  }
});

/** Vote (auth, member only) */
router.post("/:code/vote/datetime", async (req, res, next) => {
  try {
    const code = req.params.code.toUpperCase();
    const data = VoteSchema.parse(req.body);
    const uid = req.user.id;

    const ev = await Event.findOne({ code });
    if (!ev) return res.status(404).json({ message: "Event not found" });

    if (isAfterDeadline(ev) || ev.status !== "POLLING") {
      return res.status(400).json({ message: "Voting already closed" });
    }

    const isMember = ev.members.some((m) => m.userId.toString() === uid);
    if (!isMember) return res.status(403).json({ message: "Join event first" });

    ev.votes.date.set(uid, data.optionId);
    await ev.save();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post("/:code/vote/location", async (req, res, next) => {
  try {
    const code = req.params.code.toUpperCase();
    const data = VoteSchema.parse(req.body);
    const uid = req.user.id;

    const ev = await Event.findOne({ code });
    if (!ev) return res.status(404).json({ message: "Event not found" });

    if (isAfterDeadline(ev) || ev.status !== "POLLING") {
      return res.status(400).json({ message: "Voting already closed" });
    }

    const isMember = ev.members.some((m) => m.userId.toString() === uid);
    if (!isMember) return res.status(403).json({ message: "Join event first" });

    ev.votes.location.set(uid, data.optionId);
    await ev.save();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/** Post message (auth, member only) */
router.post("/:code/messages", async (req, res, next) => {
  try {
    const code = req.params.code.toUpperCase();
    const data = MessageSchema.parse(req.body);
    const uid = req.user.id;

    const ev = await Event.findOne({ code });
    if (!ev) return res.status(404).json({ message: "Event not found" });

    const member = ev.members.find((m) => m.userId.toString() === uid);
    if (!member) return res.status(403).json({ message: "Join event first" });

    ev.messages.push({
      userId: uid,
      memberId: member._id.toString(),
      name: member.name,
      text: data.text,
    });
    await ev.save();

    res.status(201).json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/** Finalize event (owner only) */
router.post("/:code/finalize", async (req, res, next) => {
  try {
    const code = req.params.code.toUpperCase();
    const uid = req.user.id;

    const ev = await Event.findOne({ code });
    if (!ev) return res.status(404).json({ message: "Event not found" });
    if (ev.ownerUserId.toString() !== uid)
      return res.status(403).json({ message: "Forbidden" });

    const dateCounts = countVotes(ev.votes.date);
    const locCounts = countVotes(ev.votes.location);

    const topDate = ev.dateOptions
      .map((o) => ({ o, v: dateCounts[o._id.toString()] || 0 }))
      .sort((a, b) => b.v - a.v)[0]?.o;

    const topLoc = ev.locationOptions
      .map((o) => ({ o, v: locCounts[o._id.toString()] || 0 }))
      .sort((a, b) => b.v - a.v)[0]?.o;

    ev.finalDateTime = topDate?.iso || ev.finalDateTime;
    ev.finalLocation = topLoc?.label || ev.finalLocation;
    ev.status = "FINAL";

    await ev.save();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/** ===== Split Bill (auth, member only) ===== */

async function requireMember(ev, uid) {
  const member = ev.members.find((m) => m.userId.toString() === uid);
  return member || null;
}

router.post("/:code/bill", async (req, res, next) => {
  try {
    const code = req.params.code.toUpperCase();
    const data = BillSetSchema.parse(req.body);
    const uid = req.user.id;

    const ev = await Event.findOne({ code });
    if (!ev) return res.status(404).json({ message: "Event not found" });

    const member = await requireMember(ev, uid);
    if (!member) return res.status(403).json({ message: "Join event first" });

    ev.bill.total = data.total;
    if (data.splitMode) ev.bill.splitMode = data.splitMode;
    await ev.save();

    res.json({ ok: true, bill: ev.bill });
  } catch (e) {
    next(e);
  }
});

router.post("/:code/bill/items", async (req, res, next) => {
  try {
    const code = req.params.code.toUpperCase();
    const data = BillItemSchema.parse(req.body);
    const uid = req.user.id;

    const ev = await Event.findOne({ code });
    if (!ev) return res.status(404).json({ message: "Event not found" });

    const member = await requireMember(ev, uid);
    if (!member) return res.status(403).json({ message: "Join event first" });

    const memOk = ev.members.some(
      (m) => m._id.toString() === data.assigneeMemberId
    );
    if (!memOk)
      return res.status(400).json({ message: "assigneeMemberId not in event" });

    ev.bill.items.push({
      name: data.name,
      cost: data.cost,
      assigneeMemberId: data.assigneeMemberId,
    });
    await ev.save();

    res.status(201).json({ itemId: ev.bill.items.at(-1)._id.toString() });
  } catch (e) {
    next(e);
  }
});

router.delete("/:code/bill/items/:itemId", async (req, res, next) => {
  try {
    const code = req.params.code.toUpperCase();
    const { itemId } = req.params;
    const uid = req.user.id;

    const ev = await Event.findOne({ code });
    if (!ev) return res.status(404).json({ message: "Event not found" });

    const member = await requireMember(ev, uid);
    if (!member) return res.status(403).json({ message: "Join event first" });

    ev.bill.items = ev.bill.items.filter((i) => i._id.toString() !== itemId);
    await ev.save();

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get("/:code/bill/final", async (req, res, next) => {
  try {
    const code = req.params.code.toUpperCase();
    const uid = req.user.id;

    const ev = await Event.findOne({ code }).lean();
    if (!ev) return res.status(404).json({ message: "Event not found" });

    const isMember = (ev.members || []).some(
      (m) => m.userId.toString() === uid
    );
    if (!isMember) return res.status(403).json({ message: "Join event first" });

    const rows = computeFinalSplit({
      members: ev.members,
      bill: ev.bill || {},
    });
    res.json({
      mode: ev.bill?.splitMode || "EVEN",
      total: ev.bill?.total || 0,
      rows,
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
