import dotenv from "dotenv";
dotenv.config({ override: true });

import { sequelize, connectDB } from "../config/db";

// Import all models
import "../models/user.model";
import "../models/class.model";
import "../models/student.model";
import "../models/subject.model";
import "../models/role.model";
import "../models/permission.model";
import "../models/role-permission.model";
import "../models/school.model";
import "../models/section.model";
import "../models/teacher.model";
import "../models/parent.model";
import "../models/parent-student.model";
import "../models/teacher-class.model";
import "../models/attendance.model";
import "../models/exam.model";
import "../models/mark.model";
import "../models/student-document.model";
import "../models/assignment.model";
import "../models/assignment-submission.model";
import "../models/timetable.model";
import "../models/fee.model";
import "../models/fee-payment.model";
import "../models/mock-test.model";

const run = async () => {
  try {
    await connectDB();

    await sequelize.sync({
      alter: true,
    });

    console.log("DB Sync Successful ✅");

    process.exit(0);
  } catch (error) {
    console.error(error);

    process.exit(1);
  }
};

run();
