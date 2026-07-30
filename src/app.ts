import dotenv from "dotenv";
dotenv.config({ override: true });

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";

import { connectDB, sequelize } from "./config/db";
import swaggerSpec from "./config/swagger";
import { bootstrapAdmin } from "./scripts/bootstrap-admin";

import "./models";

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import roleRoutes from "./routes/role.routes";
import permissionRoutes from "./routes/permission.routes";
import erpRoutes from "./routes/erp.routes";
import auditRoutes from "./routes/audit.routes";

import { auditRequestLogger } from "./middlewares/audit.middleware";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";

const app = express();
const runtimeEnv = process.env.NODE_ENV ?? "development";

const corsOrigins = (process.env.CORS_ORIGINS ?? "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  helmet({
    contentSecurityPolicy: runtimeEnv === "production" ? undefined : false,
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(
  cors({
    origin: corsOrigins.includes("*") ? true : corsOrigins,
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-School-Id",
      "X-Requested-With",
    ],
    exposedHeaders: ["X-School-Id"],
  }),
);

app.use(
  express.json({
    limit: process.env.JSON_BODY_LIMIT ?? "2mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
  }),
);

app.use(morgan("dev"));
app.use(auditRequestLogger);

console.log("NODE_ENV:", runtimeEnv);
console.log("AI provider:", process.env.AI_PROVIDER ?? "groq");
console.log("AI model:", process.env.GROQ_MODEL ?? "llama-3.1-8b-instant");

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api", erpRoutes);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/api-docs.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "School Backend Running",
    environment: process.env.NODE_ENV,
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 8000;

const startServer = async () => {
  try {
    console.log("Connecting database...");
    await connectDB();
    console.log("Database connection successful");

    if (runtimeEnv !== "production") {
      console.log("Running in DEVELOPMENT mode");
      const shouldAlter = process.env.DB_SYNC_ALTER === "true";
      console.log("DB_SYNC_ALTER:", shouldAlter);
      await sequelize.sync({
        alter: shouldAlter,
      });
      console.log("Database synced successfully");
    } else {
      console.log("Running in PRODUCTION mode");
      await sequelize.authenticate();
      console.log("Production database authenticated");
    }

    await bootstrapAdmin();

    app.listen(PORT, () => {
      console.log(`
========================================
Server running successfully
Environment : ${runtimeEnv}
Port        : ${PORT}
Swagger     : /api-docs
========================================
      `);
    });
  } catch (error) {
    console.error("Startup error");
    console.error(error);
    process.exit(1);
  }
};

startServer();
