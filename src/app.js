const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config({ quiet: process.env.NODE_ENV === "test" });

const authRoutes = require("./routes/auth.routes");
const creditoRoutes = require("./routes/credito.routes");
const entitiesRoutes = require("./routes/entities.routes");

const app = express();
app.disable("x-powered-by");

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    const error = new Error("Origen no permitido por CORS");
    error.status = 403;
    return callback(error);
  },
  credentials: true
}));
app.use(express.json({ limit: "1mb" }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX || 300),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Demasiadas solicitudes. Intenta nuevamente mas tarde"
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Demasiados intentos. Intenta nuevamente mas tarde"
  }
});

app.get("/", (req, res) => {
  res.json({ message: "Backend Altoque funcionando correctamente" });
});

app.get("/health", (req, res) => {
  res.json({ success: true, service: "altoque-backend" });
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/bootstrap-admin", authLimiter);

app.use("/api/auth", apiLimiter, authRoutes);
app.use("/api/creditos", apiLimiter, creditoRoutes);
app.use("/api/entities", apiLimiter, entitiesRoutes);

app.use((err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({
    success: false,
    message: status >= 500 ? "Error interno del servidor" : err.message
  });
});

module.exports = app;
