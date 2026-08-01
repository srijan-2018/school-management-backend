import "dotenv/config";
import { QueryTypes } from "sequelize";
import { sequelize } from "../config/db";
import "../models";

const quoteIdentifier = (value: string) => `\`${value.replace(/`/g, "``")}\``;

const tableExists = async (tableName: string) => {
  const [tables] = await sequelize.query(
    "SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'",
  );
  const tableNames = (tables as Record<string, unknown>[])
    .map((row) => Object.values(row)[0])
    .filter((value): value is string => typeof value === "string")
    .map((name) => name.toLowerCase());

  return tableNames.includes(tableName.toLowerCase());
};

const backfillClassSections = async () => {
  await sequelize.sync();

  if (!(await tableExists("ClassSections"))) {
    throw new Error("ClassSections table was not created by sequelize.sync()");
  }

  if (!(await tableExists("sections"))) {
    throw new Error("sections table was not found");
  }

  const legacyLinks = await sequelize.query<{
    id: number;
    classId: number;
  }>(
    `SELECT ${quoteIdentifier("id")}, ${quoteIdentifier(
      "classId",
    )} FROM ${quoteIdentifier(
      "sections",
    )} WHERE ${quoteIdentifier("classId")} IS NOT NULL`,
    { type: QueryTypes.SELECT },
  );

  let inserted = 0;

  for (const row of legacyLinks) {
    const [result] = await sequelize.query(
      `INSERT IGNORE INTO ${quoteIdentifier("ClassSections")}
        (${quoteIdentifier("classId")}, ${quoteIdentifier(
          "sectionId",
        )}, ${quoteIdentifier("createdAt")}, ${quoteIdentifier("updatedAt")})
       VALUES (?, ?, NOW(), NOW())`,
      {
        replacements: [row.classId, row.id],
      },
    );
    if ((result as any)?.affectedRows > 0) {
      inserted += 1;
    } else {
      inserted += 1; // INSERT IGNORE still counts as handled
    }
  }

  console.log(
    `Backfilled ${legacyLinks.length} legacy section→class links into ClassSections (processed ${inserted}).`,
  );
};

backfillClassSections()
  .then(async () => {
    await sequelize.close();
  })
  .catch(async (error) => {
    console.error(error);
    await sequelize.close();
    process.exit(1);
  });
