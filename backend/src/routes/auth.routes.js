const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const User = require("../models/User");
const { authRequired } = require("../middleware/auth");
const {
  RegisterSchema,
  LoginSchema,
  UpdateMeSchema,
  ChangePasswordSchema,
} = require("../utils/validators");

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function signToken(user) {
  // ✅ biar middleware auth yang baca "id" ATAU "sub" sama-sama aman
  return jwt.sign(
    { sub: user._id.toString(), id: user._id.toString(), email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

function userDto(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name || "",
    photo: user.photo || "",
  };
}

/** Register (email + password) */
router.post("/register", async (req, res, next) => {
  try {
    const data = RegisterSchema.parse(req.body);

    const email = String(data.email || "")
      .toLowerCase()
      .trim();
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "Email already used" });

    const passwordHash = await bcrypt.hash(data.password, 12);

    // ✅ simpan name kalau ada (frontend kamu kirim username)
    // phone: kalau model User kamu punya field phone, uncomment baris phone
    const user = await User.create({
      email,
      passwordHash,
      name: data.username || data.name || "",
      // phone: data.phone || "",
    });

    res.status(201).json({ id: user._id.toString(), email: user.email });
  } catch (e) {
    next(e);
  }
});

/** Login (email + password) */
router.post("/login", async (req, res, next) => {
  try {
    const data = LoginSchema.parse(req.body);

    const email = String(data.email || "")
      .toLowerCase()
      .trim();
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    // kalau user Google tidak punya passwordHash, compare akan false (aman)
    const ok = await bcrypt.compare(data.password, user.passwordHash || "");
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = signToken(user);
    res.json({ token, user: userDto(user) });
  } catch (e) {
    next(e);
  }
});

/**
 * Login/Register with Google (GIS ID token -> JWT aplikasi)
 * Frontend wajib POST { credential } (ID token dari Google Identity Services)
 */
router.post("/google", async (req, res, next) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: "Missing credential" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const p = ticket.getPayload();
    const googleId = p?.sub;
    const email = String(p?.email || "")
      .toLowerCase()
      .trim();
    const name = p?.name || "";
    const photo = p?.picture || "";
    const emailVerified = !!p?.email_verified;

    if (!googleId) {
      return res.status(400).json({ message: "Invalid Google token" });
    }
    if (!email || !emailVerified) {
      return res.status(400).json({ message: "Google email not verified" });
    }

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      user = await User.create({ email, googleId, name, photo });
    } else {
      let changed = false;
      if (!user.googleId) {
        user.googleId = googleId;
        changed = true;
      }
      if (!user.name && name) {
        user.name = name;
        changed = true;
      }
      if (!user.photo && photo) {
        user.photo = photo;
        changed = true;
      }
      if (changed) await user.save();
    }

    const token = signToken(user);
    res.json({ token, user: userDto(user) });
  } catch (e) {
    next(e);
  }
});

/** Current user (auth) */
router.get("/me", authRequired, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user: userDto(user) });
  } catch (e) {
    next(e);
  }
});

/** Update current user (auth) */
router.patch("/me", authRequired, async (req, res, next) => {
  try {
    const data = UpdateMeSchema.parse(req.body);
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (typeof data.name === "string") user.name = data.name;
    if (typeof data.photo === "string") user.photo = data.photo;

    await user.save();
    res.json({ user: userDto(user) });
  } catch (e) {
    next(e);
  }
});

/** Change password (auth, only for non-Google users with passwordHash) */
router.post("/change-password", authRequired, async (req, res, next) => {
  try {
    const data = ChangePasswordSchema.parse(req.body);
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.passwordHash) {
      return res
        .status(400)
        .json({ message: "Password not set for this account" });
    }

    const ok = await bcrypt.compare(data.oldPassword, user.passwordHash || "");
    if (!ok) return res.status(401).json({ message: "Invalid old password" });

    user.passwordHash = await bcrypt.hash(data.newPassword, 12);
    await user.save();

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
