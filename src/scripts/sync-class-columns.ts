import "dotenv/config";
import { QueryTypes } from "sequelize";
import { sequelize } from "../config/db";

type ColumnRow = {
  Field: string;
  Null: string;
};

const quoteIdentifier = (value: string) => `\`${value.replace(/`/g, "``")}\``;

const findClassesTable = async () => {
  const [tables] = await sequelize.query(
    "SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'",
  );
  const tableNames = (tables as Record<string, unknown>[])
    .map((row) => Object.values(row)[0])
    .filter((value): value is string => typeof value === "string");

  return tableNames.find((tableName) => tableName.toLowerCase() === "classes");
};

const syncClassColumns = async () => {
  const tableName = await findClassesTable();

  if (!tableName) {
    throw new Error(
      "Classes table was not found. Start the server once so Sequelize can create it.",
    );
  }

  const columns = await sequelize.query<ColumnRow>(
    `SHOW COLUMNS FROM ${quoteIdentifier(tableName)}`,
    { type: QueryTypes.SELECT },
  );
  const sectionColumn = columns.find((column) => column.Field === "section");

  if (!sectionColumn) {
    throw new Error(`${tableName}.section column was not found.`);
  }

  if (sectionColumn.Null === "YES") {
    console.log(`${tableName}.section is already nullable`);
    return;
  }

  await sequelize.query(
    `ALTER TABLE ${quoteIdentifier(tableName)} MODIFY COLUMN ${quoteIdentifier(
      "section",
    )} VARCHAR(255) NULL`,
  );
  console.log(`Updated ${tableName}.section to allow NULL values`);
};

syncClassColumns()
  .catch((error) => {
    console.error("Failed to sync Classes columns:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
