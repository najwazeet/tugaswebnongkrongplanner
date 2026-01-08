require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");
const passport = require("passport");

const { connectDB } = require("./src/config/db");
const { createServer } = require("./src/app");

// =====================
// INIT
// =====================
const app = createServer();
const PORT = process.env.PORT || 3000;

// =====================
// DATABASE
// =====================
connectDB();

// =====================
// EMAIL REMINDER CRON JOBS
// =====================
const { startEventReminder } = require("./src/jobs/eventReminder.crom");
startEventReminder();

// =====================
// PASSPORT (GOOGLE)
// =====================
require("./src/config/passport");

// =====================
// MIDDLEWARE
// =====================
app.use(
  cors({
    origin: [
      "http://localhost:5500",
      "http://localhost:5503",
      "http://127.0.0.1:5503",
      "http://localhost:3000",
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(passport.initialize());

// =====================
// 🔥 SERVE FRONTEND (INI KUNCI UTAMA)
// =====================
app.use(express.static(path.join(__dirname, "../frontend")));

// =====================
// ROUTES
// =====================
app.use("/api/auth", require("./src/routes/auth.routes"));

// =====================
// DEFAULT PAGE
// =====================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/login.html"));
});

// =====================
// HEALTH CHECK
// =====================
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// =====================
// ERROR HANDLER (PALING BAWAH)
// =====================
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);
  res.status(500).json({
    message: "Internal Server Error",
  });
});

// =====================
// SERVER
// =====================
app.listen(PORT, () => {
  console.log(`[SERVER] Running on http://localhost:${PORT}`);
});
