const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

// Node 18+ sebenarnya sudah ada fetch global,
// tapi ini biar aman kalau environment beda
const fetch = global.fetch || require("node-fetch");

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

/* ===================== HELPERS ===================== */
function signToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      id: user._id.toString(),
      email: user.email,
    },
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

/* ===================== REGISTER ===================== */
router.post("/register", async (req, res, next) => {
  try {
    const data = RegisterSchema.parse(req.body);

    const email = String(data.email).toLowerCase().trim();
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: "Email already used" });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await User.create({
      email,
      passwordHash,
      name: data.username || data.name || "",
    });

    res.status(201).json({
      token: signToken(user),
      user: userDto(user),
    });
  } catch (e) {
    next(e);
  }
});

/* ===================== LOGIN ===================== */
router.post("/login", async (req, res, next) => {
  try {
    const data = LoginSchema.parse(req.body);

    const email = String(data.email).toLowerCase().trim();
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(data.password, user.passwordHash || "");
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.json({
      token: signToken(user),
      user: userDto(user),
    });
  } catch (e) {
    next(e);
  }
});

/* ===================== GOOGLE OAUTH (REDIRECT FLOW) ===================== */
const GOOGLE_AUTH_URL =
  "https://accounts.google.com/o/oauth2/v2/auth" +
  "?response_type=code" +
  "&client_id=" +
  encodeURIComponent(process.env.GOOGLE_CLIENT_ID) +
  "&redirect_uri=" +
  encodeURIComponent(process.env.GOOGLE_CALLBACK_URL) +
  "&scope=" +
  encodeURIComponent("openid email profile") +
  "&access_type=offline" +
  "&prompt=consent";

/** STEP 1: redirect ke Google */
router.get("/google", (req, res) => {
  res.redirect(GOOGLE_AUTH_URL);
});

/** STEP 2: callback dari Google */
router.get("/google/callback", async (req, res, next) => {
  try {
    const code = req.query.code;
    if (!code) {
      return res.status(400).send("Missing code");
    }

    // Tukar authorization code -> token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_CALLBACK_URL,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    console.log("=== GOOGLE TOKEN RESPONSE ===");
    console.log(tokenData);
    console.log("============================");

    if (!tokenData.id_token) {
      return res.status(400).json({
        message: "Google auth failed",
        tokenData,
      });
    }

    // Verifikasi ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: tokenData.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const p = ticket.getPayload();
    const email = p.email.toLowerCase().trim();
    const googleId = p.sub;
    const name = p.name || "";
    const photo = p.picture || "";

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      user = await User.create({
        email,
        googleId,
        name,
        photo,
      });
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

    // redirect balik ke frontend
    res.redirect(`http://localhost:5503/auth-success.html?token=${token}`);
  } catch (e) {
    next(e);
  }
});

/* ===================== ME ===================== */
router.get("/me", authRequired, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user: userDto(user) });
  } catch (e) {
    next(e);
  }
});

/* ===================== CHANGE PASSWORD ===================== */
router.post("/change-password", authRequired, async (req, res, next) => {
  try {
    const data = ChangePasswordSchema.parse(req.body);
    const user = await User.findById(req.user.id);

    if (!user || !user.passwordHash) {
      return res
        .status(400)
        .json({ message: "Password not set for this account" });
    }

    const ok = await bcrypt.compare(data.oldPassword, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid old password" });
    }

    user.passwordHash = await bcrypt.hash(data.newPassword, 12);
    await user.save();

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/* ===================== EXPORT ===================== */
module.exports = router;
