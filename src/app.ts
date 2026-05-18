import dotenv from "dotenv";
dotenv.config({ override: true }); // ✅ MUST BE FIRST

import express from "express";
import cors from "cors";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";

import { connectDB, sequelize } from "./config/db";
import swaggerSpec from "./config/swagger";

// ✅ Import ALL models
import "./models/user.model";
import "./models/class.model";
import "./models/student.model";
import "./models/subject.model";
import "./models/role.model";
import "./models/permission.model";
import "./models/role-permission.model";
import "./models/school.model";
import "./models/section.model";
import "./models/teacher.model";
import "./models/parent.model";
import "./models/parent-student.model";
import "./models/teacher-class.model";
import "./models/attendance.model";
import "./models/exam.model";
import "./models/mark.model";
import "./models/student-document.model";
import "./models/assignment.model";
import "./models/assignment-submission.model";
import "./models/timetable.model";
import "./models/fee.model";
import "./models/fee-payment.model";
import "./models/mock-test.model";

// routes
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import roleRoutes from "./routes/role.routes";
import permissionRoutes from "./routes/permission.routes";
import erpRoutes from "./routes/erp.routes";

import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";

const app = express();

// middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// logs
console.log("AI provider:", process.env.AI_PROVIDER ?? "groq");
console.log("AI model:", process.env.GROQ_MODEL ?? "llama-3.1-8b-instant");

// routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api", erpRoutes);

// swagger
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// health route
app.get("/", (req, res) => {
  res.send("School Backend Running 🚀");
});

// error handlers
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// ✅ Proper startup flow
const startServer = async () => {
  try {
    // connect database
    await connectDB();

    // sync database
    const shouldAlter = process.env.DB_SYNC_ALTER === "true";

    console.log("DB_SYNC_ALTER:", shouldAlter);

    await sequelize.sync({
      alter: shouldAlter,
    });

    console.log("Database synced ✅");

    // start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Startup error ❌", error);
    process.exit(1);
  }
};

startServer();
