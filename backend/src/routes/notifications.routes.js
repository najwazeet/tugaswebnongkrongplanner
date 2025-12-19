const express = require("express");
const Event = require("../models/Event");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

router.use(authRequired);

function parseTs(s) {
  if (!s) return NaN;
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? NaN : dt.getTime();
}

router.get("/", async (req, res, next) => {
  try {
    const uid = req.user.id;

    const events = await Event.find({
      $or: [{ ownerUserId: uid }, { "members.userId": uid }],
    })
      .select("code title status finalDateTime finalLocation updatedAt")
      .sort({ updatedAt: -1 })
      .lean();

    const now = Date.now();

    const notifications = [];

    for (const ev of events) {
      const finalTs = parseTs(ev.finalDateTime);

      if (ev.status === "FINAL") {
        notifications.push({
          id: `${ev._id.toString()}-FINAL`,
          code: ev.code,
          at: ev.updatedAt,
          text: `Final date has been selected for ‘${ev.title}’.`,
        });
      }

      if (!isNaN(finalTs)) {
        const diff = finalTs - now;
        const oneDay = 24 * 60 * 60 * 1000;
        if (diff > 0 && diff <= oneDay) {
          notifications.push({
            id: `${ev._id.toString()}-TOMORROW`,
            code: ev.code,
            at: ev.updatedAt,
            text: `Your event ‘${ev.title}’ starts tomorrow.`,
          });
        }
      }
    }

    notifications.sort((a, b) => {
      const ta = parseTs(a.at) || 0;
      const tb = parseTs(b.at) || 0;
      return tb - ta;
    });

    res.json({ notifications });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
