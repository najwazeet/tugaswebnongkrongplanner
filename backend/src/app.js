const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const { connectDB } = require("./config/db");
const { notFound, errorHandler } = require("./middleware/error");

const authRoutes = require("./routes/auth.routes");
const eventRoutes = require("./routes/events.routes");
const notificationRoutes = require("./routes/notifications.routes");

function createServer() {
  const app = express();

  // connect database
  connectDB();

  // security & logging
  app.use(helmet());
  app.use(morgan("dev"));

  // body parser
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  // CORS whitelist
  const allowedOrigins = new Set([
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:5502",
    "http://127.0.0.1:5502",
    "http://127.0.0.1:5503",
  ]);

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true); // Postman / curl
        return cb(null, allowedOrigins.has(origin));
      },
      credentials: false,
    })
  );

  // rate limit
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: 120,
    })
  );

  // health check
  app.get("/health", (req, res) => {
    res.json({ ok: true });
  });

  // routes
  app.use("/api/auth", authRoutes);
  app.use("/api/events", eventRoutes);
  app.use("/api/notifications", notificationRoutes);

  // error handlers
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createServer };
