import "dotenv/config";
import { QueryTypes } from "sequelize";
import { sequelize } from "../config/db";
import { STAFF_ATTENDANCE_ROLES } from "../utils/roles";

type ColumnRow = {
  Field: string;
  Type: string;
};

const quoteIdentifier = (value: string) => `\`${value.replace(/`/g, "``")}\``;
const quoteEnumValue = (value: string) => `'${value.replace(/'/g, "''")}'`;

const findStaffAttendanceTable = async () => {
  const [tables] = await sequelize.query(
    "SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'",
  );
  const tableNames = (tables as Record<string, unknown>[])
    .map((row) => Object.values(row)[0])
    .filter((value): value is string => typeof value === "string");

  return tableNames.find(
    (tableName) => tableName.toLowerCase() === "staffattendances",
  );
};

const syncStaffAttendanceRoleEnum = async () => {
  const tableName = await findStaffAttendanceTable();

  if (!tableName) {
    throw new Error(
      "StaffAttendances table was not found. Start the server once so Sequelize can create it.",
    );
  }

  const columns = await sequelize.query<ColumnRow>(
    `SHOW COLUMNS FROM ${quoteIdentifier(tableName)}`,
    { type: QueryTypes.SELECT },
  );
  const roleColumn = columns.find((column) => column.Field === "role");

  if (!roleColumn) {
    throw new Error(`${tableName}.role column was not found.`);
  }

  const missingRoles = STAFF_ATTENDANCE_ROLES.filter(
    (role) => !roleColumn.Type.includes(quoteEnumValue(role)),
  );

  if (missingRoles.length === 0) {
    console.log(`${tableName}.role already supports all attendance roles`);
    return;
  }

  const enumValues = STAFF_ATTENDANCE_ROLES.map(quoteEnumValue).join(", ");

  await sequelize.query(
    `ALTER TABLE ${quoteIdentifier(tableName)} MODIFY COLUMN ${quoteIdentifier(
      "role",
    )} ENUM(${enumValues}) NOT NULL`,
  );

  console.log(
    `Updated ${tableName}.role enum. Added: ${missingRoles.join(", ")}`,
  );
};

syncStaffAttendanceRoleEnum()
  .catch((error) => {
    console.error("Failed to sync StaffAttendances role enum:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
