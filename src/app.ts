import dotenv from "dotenv";
dotenv.config(); // ✅ MUST BE FIRST

import express from "express";
import cors from "cors";
import morgan from "morgan";

import { connectDB, sequelize } from "./config/db";

// ✅ Import ALL models (VERY IMPORTANT)
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
import {
  errorHandler,
  notFoundHandler,
} from "./middlewares/error.middleware";
// (later)
// import studentRoutes from "./routes/student.routes";
// import classRoutes from "./routes/class.routes";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// ✅ Connect DB
connectDB();

// ✅ Sync DB properly
const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true }); // auto update tables
    console.log("Database synced ✅");
  } catch (error) {
    console.error("Sync error ❌", error);
  }
};

syncDatabase();

// routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api", erpRoutes);
// app.use("/api/students", studentRoutes);
// app.use("/api/classes", classRoutes);

app.get("/", (req, res) => {
  res.send("School Backend Running 🚀");
});

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
