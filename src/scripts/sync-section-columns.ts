import "dotenv/config";
import { QueryTypes } from "sequelize";
import { sequelize } from "../config/db";

type ColumnRow = {
  Field: string;
  Type: string;
  Null: string;
};

const quoteIdentifier = (value: string) => `\`${value.replace(/`/g, "``")}\``;

const findSectionsTable = async () => {
  const [tables] = await sequelize.query(
    "SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'",
  );
  const tableNames = (tables as Record<string, unknown>[])
    .map((row) => Object.values(row)[0])
    .filter((value): value is string => typeof value === "string");

  return tableNames.find((tableName) => tableName.toLowerCase() === "sections");
};

const syncSectionColumns = async () => {
  const tableName = await findSectionsTable();

  if (!tableName) {
    throw new Error(
      "Sections table was not found. Start the server once so Sequelize can create it.",
    );
  }

  const columns = await sequelize.query<ColumnRow>(
    `SHOW COLUMNS FROM ${quoteIdentifier(tableName)}`,
    { type: QueryTypes.SELECT },
  );
  const classIdColumn = columns.find((column) => column.Field === "classId");

  if (!classIdColumn) {
    throw new Error(`${tableName}.classId column was not found.`);
  }

  if (classIdColumn.Null === "YES") {
    console.log(`${tableName}.classId is already nullable`);
    return;
  }

  await sequelize.query(
    `ALTER TABLE ${quoteIdentifier(tableName)} MODIFY COLUMN ${quoteIdentifier(
      "classId",
    )} INT NULL`,
  );
  console.log(`Updated ${tableName}.classId to allow NULL values`);
};

syncSectionColumns()
  .catch((error) => {
    console.error("Failed to sync Sections columns:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
