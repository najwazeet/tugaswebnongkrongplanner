require("dotenv").config();

const cors = require("cors");
const passport = require("passport");

// load passport config (Google Strategy)
require("./src/config/passport");

const { createServer } = require("./src/app");

const app = createServer();

/* =====================
   MIDDLEWARE
===================== */
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

app.use(passport.initialize());

/* =====================
   ROUTES
===================== */
app.use("/api/auth", require("./src/routes/auth.routes"));

/* =====================
   HEALTH CHECK
===================== */
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

/* =====================
   ERROR HANDLER (WAJIB PALING BAWAH)
===================== */
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);
  res.status(500).json({
    message: "Internal Server Error",
  });
});

/* =====================
   SERVER
===================== */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
