import "dotenv/config";
import { QueryTypes } from "sequelize";
import { sequelize } from "../config/db";

type ColumnRow = {
  Field: string;
  Null: string;
};

const quoteIdentifier = (value: string) => `\`${value.replace(/`/g, "``")}\``;

const findStudentsTable = async () => {
  const [tables] = await sequelize.query(
    "SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'",
  );
  const tableNames = (tables as Record<string, unknown>[])
    .map((row) => Object.values(row)[0])
    .filter((value): value is string => typeof value === "string");

  return tableNames.find((tableName) => tableName.toLowerCase() === "students");
};

const syncStudentColumns = async () => {
  const tableName = await findStudentsTable();

  if (!tableName) {
    throw new Error(
      "Students table was not found. Start the server once so Sequelize can create it.",
    );
  }

  const columns = await sequelize.query<ColumnRow>(
    `SHOW COLUMNS FROM ${quoteIdentifier(tableName)}`,
    { type: QueryTypes.SELECT },
  );
  const sectionIdColumn = columns.find(
    (column) => column.Field === "sectionId",
  );

  if (!sectionIdColumn) {
    await sequelize.query(
      `ALTER TABLE ${quoteIdentifier(tableName)} ADD COLUMN ${quoteIdentifier(
        "sectionId",
      )} INT NULL AFTER ${quoteIdentifier("classId")}`,
    );
    console.log(`Added ${tableName}.sectionId`);
    return;
  }

  if (sectionIdColumn.Null === "YES") {
    console.log(`${tableName}.sectionId already exists and allows NULL values`);
    return;
  }

  await sequelize.query(
    `ALTER TABLE ${quoteIdentifier(tableName)} MODIFY COLUMN ${quoteIdentifier(
      "sectionId",
    )} INT NULL`,
  );
  console.log(`Updated ${tableName}.sectionId to allow NULL values`);
};

syncStudentColumns()
  .catch((error) => {
    console.error("Failed to sync Students columns:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
