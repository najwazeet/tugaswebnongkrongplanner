const express = require("express");
const Event = require("../models/Event");
const { authRequired } = require("../middleware/auth");
const User = require("../models/User");
const emailService = require("../services/email.service");

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

// TEST ENDPOINT: Send H-3 reminder email
router.post("/test/h3-reminder", async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create mock event data
    const mockEvent = {
      title: "Test Event - H-3 Reminder",
      finalDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      finalLocation: "Test Location, Jakarta",
      code: "TEST123"
    };

    console.log("[TEST] Sending H-3 reminder email to:", user.email);
    
    await emailService.sendReminderH3({
      to: user.email,
      userName: user.name,
      eventTitle: mockEvent.title,
      eventDate: new Date(mockEvent.finalDateTime).toLocaleString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      eventLocation: mockEvent.finalLocation
    });
    
    res.json({ 
      success: true, 
      message: "H-3 reminder email sent successfully!",
      sentTo: user.email,
      eventDetails: {
        title: mockEvent.title,
        date: mockEvent.finalDateTime,
        location: mockEvent.finalLocation
      }
    });
  } catch (e) {
    console.error("[TEST ERROR] Failed to send H-3 email:", e);
    next(e);
  }
});

// TEST ENDPOINT: Send H-1 reminder email
router.post("/test/h1-reminder", async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create mock event data
    const mockEvent = {
      title: "Test Event - H-1 Reminder",
      finalDateTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
      finalLocation: "Test Location, Jakarta",
      code: "TEST456"
    };

    console.log("[TEST] Sending H-1 reminder email to:", user.email);
    
    await emailService.sendReminderH1({
      to: user.email,
      userName: user.name,
      eventTitle: mockEvent.title,
      eventDate: new Date(mockEvent.finalDateTime).toLocaleString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      eventLocation: mockEvent.finalLocation
    });
    
    res.json({ 
      success: true, 
      message: "H-1 reminder email sent successfully!",
      sentTo: user.email,
      eventDetails: {
        title: mockEvent.title,
        date: mockEvent.finalDateTime,
        location: mockEvent.finalLocation
      }
    });
  } catch (e) {
    console.error("[TEST ERROR] Failed to send H-1 email:", e);
    next(e);
  }
});

// TEST ENDPOINT: Send event update email
router.post("/test/event-update", async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create mock event data
    const mockEvent = {
      title: "Test Event - Update Notification",
      finalDateTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      finalLocation: "Updated Location, Surabaya",
      code: "TEST789"
    };

    console.log("[TEST] Sending event update email to:", user.email);
    
    await emailService.sendEventUpdate({
      to: user.email,
      userName: user.name,
      eventTitle: mockEvent.title,
      eventDate: new Date(mockEvent.finalDateTime).toLocaleString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      eventLocation: mockEvent.finalLocation
    });
    
    res.json({ 
      success: true, 
      message: "Event update email sent successfully!",
      sentTo: user.email,
      eventDetails: {
        title: mockEvent.title,
        date: mockEvent.finalDateTime,
        location: mockEvent.finalLocation
      }
    });
  } catch (e) {
    console.error("[TEST ERROR] Failed to send event update email:", e);
    next(e);
  }
});

module.exports = router;
