import dotenv from "dotenv";
dotenv.config({ override: true }); // MUST BE FIRST

import express from "express";
import cors from "cors";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";

import { connectDB, sequelize } from "./config/db";
import swaggerSpec from "./config/swagger";

// ===============================
// Import ALL models
// ===============================
import "./models";

// ===============================
// Routes
// ===============================
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import roleRoutes from "./routes/role.routes";
import permissionRoutes from "./routes/permission.routes";
import erpRoutes from "./routes/erp.routes";
import auditRoutes from "./routes/audit.routes";

// ===============================
// Middlewares
// ===============================
import { auditRequestLogger } from "./middlewares/audit.middleware";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";

const app = express();
const runtimeEnv = process.env.NODE_ENV ?? "development";

// ===============================
// Middleware
// ===============================
app.use(cors());

app.use(
  express.json({
    limit: "10mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
  }),
);

app.use(morgan("dev"));
app.use(auditRequestLogger);

// ===============================
// Environment Logs
// ===============================
console.log("NODE_ENV:", runtimeEnv);
console.log("AI provider:", process.env.AI_PROVIDER ?? "groq");
console.log("AI model:", process.env.GROQ_MODEL ?? "llama-3.1-8b-instant");

// ===============================
// API Routes
// ===============================
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api", erpRoutes);

// ===============================
// Swagger
// ===============================
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// ===============================
// Health Route
// ===============================
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "School Backend Running 🚀",
    environment: process.env.NODE_ENV,
  });
});

// ===============================
// Error Handlers
// ===============================
app.use(notFoundHandler);
app.use(errorHandler);

// ===============================
// Port
// ===============================
const PORT = process.env.PORT || 8000;

// ===============================
// Server Startup
// ===============================
const startServer = async () => {
  try {
    console.log("Connecting database...");

    // Connect DB
    await connectDB();

    console.log("Database connection successful ✅");

    // =========================================
    // DEVELOPMENT MODE
    // =========================================
    if (runtimeEnv !== "production") {
      console.log("Running in DEVELOPMENT mode");

      const shouldAlter = process.env.DB_SYNC_ALTER === "true";

      console.log("DB_SYNC_ALTER:", shouldAlter);

      await sequelize.sync({
        alter: shouldAlter,
      });

      console.log("Database synced successfully ✅");
    }

    // =========================================
    // PRODUCTION MODE
    // =========================================
    else {
      console.log("Running in PRODUCTION mode");

      // ONLY authenticate in production
      // NEVER use alter:true in production
      await sequelize.authenticate();

      console.log("Production database authenticated ✅");
    }

    // =========================================
    // Start Express Server
    // =========================================
    app.listen(PORT, () => {
      console.log(`
========================================
🚀 Server running successfully
🌍 Environment : ${runtimeEnv}
📡 Port        : ${PORT}
📘 Swagger     : /api-docs
========================================
      `);
    });
  } catch (error) {
    console.error("Startup error ❌");

    console.error(error);

    process.exit(1);
  }
};

// ===============================
// Initialize Server
// ===============================
startServer();
