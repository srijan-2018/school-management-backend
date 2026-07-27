import "dotenv/config";
import { QueryTypes } from "sequelize";
import { sequelize } from "../config/db";

type ColumnRow = {
  Field: string;
};

const quoteIdentifier = (value: string) => `\`${value.replace(/`/g, "``")}\``;

const findMockTestTable = async () => {
  const [tables] = await sequelize.query(
    "SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'",
  );
  const tableNames = (tables as Record<string, unknown>[])
    .map((row) => Object.values(row)[0])
    .filter((value): value is string => typeof value === "string");

  return tableNames.find((tableName) => tableName.toLowerCase() === "mocktests");
};

const syncMockTestChapterColumns = async () => {
  const tableName = await findMockTestTable();
  if (!tableName) {
    throw new Error(
      "MockTests table was not found. Start the server once so Sequelize can create it.",
    );
  }

  const columns = await sequelize.query<ColumnRow>(
    `SHOW COLUMNS FROM ${quoteIdentifier(tableName)}`,
    { type: QueryTypes.SELECT },
  );
  const existingColumns = new Set(columns.map((column) => column.Field));

  const columnsToAdd = [
    {
      name: "chapterId",
      definition: "INT NULL AFTER `subjectName`",
    },
    {
      name: "chapterName",
      definition: "VARCHAR(255) NULL AFTER `chapterId`",
    },
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
};

syncMockTestChapterColumns()
  .catch((error) => {
    console.error("Failed to sync MockTests chapter columns:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
