import "dotenv/config";
import { QueryTypes } from "sequelize";
import { sequelize } from "../config/db";

type ColumnRow = {
  Field: string;
};

const quoteIdentifier = (value: string) => `\`${value.replace(/`/g, "``")}\``;

const findTable = async (name: string) => {
  const [tables] = await sequelize.query(
    "SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'",
  );
  const tableNames = (tables as Record<string, unknown>[])
    .map((row) => Object.values(row)[0])
    .filter((value): value is string => typeof value === "string");

  return tableNames.find((tableName) => tableName.toLowerCase() === name);
};

const addColumns = async (
  tableName: string,
  columnsToAdd: Array<{ name: string; definition: string }>,
) => {
  const columns = await sequelize.query<ColumnRow>(
    `SHOW COLUMNS FROM ${quoteIdentifier(tableName)}`,
    { type: QueryTypes.SELECT },
  );
  const existingColumns = new Set(columns.map((column) => column.Field));

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

const syncNegativeMarkingColumns = async () => {
  const schoolsTable = await findTable("schools");
  if (schoolsTable) {
    await addColumns(schoolsTable, [
      {
        name: "mockTestNegativeMarkingEnabled",
        definition: "TINYINT(1) NOT NULL DEFAULT 0",
      },
      {
        name: "mockTestNegativeMarkingPenalty",
        definition: "DECIMAL(4,2) NOT NULL DEFAULT 0.25",
      },
    ]);
  } else {
    console.warn("Schools table was not found");
  }

  const mockTestsTable = await findTable("mocktests");
  if (mockTestsTable) {
    await addColumns(mockTestsTable, [
      {
        name: "negativeMarkingEnabled",
        definition: "TINYINT(1) NOT NULL DEFAULT 0",
      },
      {
        name: "negativeMarkingPenalty",
        definition: "DECIMAL(4,2) NOT NULL DEFAULT 0.25",
      },
    ]);
  } else {
    console.warn("MockTests table was not found");
  }
};

syncNegativeMarkingColumns()
  .catch((error) => {
    console.error("Failed to sync negative marking columns:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
