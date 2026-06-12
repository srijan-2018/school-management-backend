import "dotenv/config";
import { QueryTypes } from "sequelize";
import { sequelize } from "../config/db";
import "../models/exam-schedule.model";
import "../models/exam.model";
import ExamSchedule from "../models/exam-schedule.model";
import Exam from "../models/exam.model";

type ColumnRow = {
  Field: string;
  Null: string;
};

const quoteIdentifier = (value: string) => `\`${value.replace(/`/g, "``")}\``;

const findTable = async (targetName: string) => {
  const [tables] = await sequelize.query(
    "SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'",
  );
  const tableNames = (tables as Record<string, unknown>[])
    .map((row) => Object.values(row)[0])
    .filter((value): value is string => typeof value === "string");

  return tableNames.find(
    (tableName) => tableName.toLowerCase() === targetName.toLowerCase(),
  );
};

const ensureExamScheduleTable = async () => {
  await ExamSchedule.sync({ alter: true });
  console.log("ExamSchedules table is ready");
};

const ensureExamColumns = async () => {
  const tableName = await findTable("exams");

  if (!tableName) {
    await Exam.sync({ force: false });
    console.log("Exams table created");
    return;
  }

  const columns = await sequelize.query<ColumnRow>(
    `SHOW COLUMNS FROM ${quoteIdentifier(tableName)}`,
    { type: QueryTypes.SELECT },
  );
  const existingColumns = new Set(columns.map((column) => column.Field));

  const columnsToAdd = [
    { name: "schoolId", definition: "INT NULL" },
    { name: "scheduleId", definition: "INT NULL" },
    { name: "description", definition: "TEXT NULL" },
    { name: "startTime", definition: "VARCHAR(255) NULL" },
    { name: "endTime", definition: "VARCHAR(255) NULL" },
    { name: "durationMinutes", definition: "INT NULL" },
    { name: "passingMarks", definition: "FLOAT NULL" },
    {
      name: "status",
      definition:
        "ENUM('draft', 'scheduled', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled'",
    },
    { name: "sortOrder", definition: "INT NULL DEFAULT 0" },
    { name: "createdByUserId", definition: "INT NULL" },
  ];

  for (const column of columnsToAdd) {
    if (existingColumns.has(column.name)) {
      console.log(`${tableName}.${column.name} already exists`);
      continue;
    }

    await sequelize.query(
      `ALTER TABLE ${quoteIdentifier(tableName)} ADD COLUMN ${quoteIdentifier(
        column.name,
      )} ${column.definition}`,
    );
    console.log(`Added ${tableName}.${column.name}`);
  }

  const classIdColumn = columns.find((column) => column.Field === "classId");

  if (classIdColumn && classIdColumn.Null === "NO") {
    await sequelize.query(
      `ALTER TABLE ${quoteIdentifier(tableName)} MODIFY COLUMN ${quoteIdentifier(
        "classId",
      )} INT NULL`,
    );
    console.log(`Updated ${tableName}.classId to allow NULL values`);
  }

  await Exam.sync({ alter: true });
  console.log("Exams table schema synced");
};

const syncExamColumns = async () => {
  await ensureExamScheduleTable();
  await ensureExamColumns();
};

syncExamColumns()
  .catch((error) => {
    console.error("Failed to sync Exams columns:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
