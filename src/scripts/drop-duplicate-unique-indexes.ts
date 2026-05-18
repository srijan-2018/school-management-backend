import "dotenv/config";
import { sequelize } from "../config/db";

type TableRow = Record<string, unknown>;

type IndexRow = {
  Key_name: string;
  Non_unique: number;
  Seq_in_index: number;
  Column_name: string;
};

type IndexDefinition = {
  name: string;
  nonUnique: number;
  columns: string[];
};

const quoteIdentifier = (value: string) => `\`${value.replace(/`/g, "``")}\``;

const getTables = async () => {
  const [rows] = await sequelize.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");

  return (rows as TableRow[])
    .map((row) => Object.values(row)[0])
    .filter((value): value is string => typeof value === "string");
};

const getIndexes = async (table: string) => {
  const [rows] = await sequelize.query(`SHOW INDEX FROM ${quoteIdentifier(table)}`);
  const byName = new Map<string, IndexRow[]>();

  for (const row of rows as IndexRow[]) {
    const existingRows = byName.get(row.Key_name) ?? [];
    existingRows.push(row);
    byName.set(row.Key_name, existingRows);
  }

  return Array.from(byName.entries()).map<IndexDefinition>(([name, indexRows]) => ({
    name,
    nonUnique: Number(indexRows[0].Non_unique),
    columns: indexRows
      .sort((a, b) => Number(a.Seq_in_index) - Number(b.Seq_in_index))
      .map((row) => row.Column_name),
  }));
};

const chooseIndexToKeep = (indexes: IndexDefinition[]) => {
  return [...indexes].sort((a, b) => {
    const generatedA = /_\d+$/.test(a.name);
    const generatedB = /_\d+$/.test(b.name);

    if (generatedA !== generatedB) return generatedA ? 1 : -1;
    return a.name.length - b.name.length || a.name.localeCompare(b.name);
  })[0];
};

const dropDuplicateUniqueIndexes = async () => {
  const tables = await getTables();
  let droppedCount = 0;

  for (const table of tables) {
    const uniqueIndexes = (await getIndexes(table)).filter(
      (index) => index.name !== "PRIMARY" && index.nonUnique === 0,
    );

    const bySignature = new Map<string, IndexDefinition[]>();

    for (const index of uniqueIndexes) {
      const signature = index.columns.join("\u0000");
      const existingIndexes = bySignature.get(signature) ?? [];
      existingIndexes.push(index);
      bySignature.set(signature, existingIndexes);
    }

    for (const indexes of bySignature.values()) {
      if (indexes.length < 2) continue;

      const keep = chooseIndexToKeep(indexes);
      const duplicates = indexes.filter((index) => index.name !== keep.name);

      console.log(
        `Keeping ${table}.${keep.name}; dropping duplicates: ${duplicates
          .map((index) => index.name)
          .join(", ")}`,
      );

      for (const duplicate of duplicates) {
        await sequelize.query(
          `ALTER TABLE ${quoteIdentifier(table)} DROP INDEX ${quoteIdentifier(duplicate.name)}`,
        );
        droppedCount += 1;
      }
    }
  }

  console.log(`Dropped ${droppedCount} duplicate unique index(es).`);
};

dropDuplicateUniqueIndexes()
  .catch((error) => {
    console.error("Failed to drop duplicate unique indexes:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
