import "dotenv/config";
import { QueryTypes } from "sequelize";
import { sequelize } from "../config/db";
import LeaveRequest from "../models/leave-request.model";
import SchoolCalendar from "../models/school-calendar.model";
import "../models";

const columnExists = async (tableName: string, columnName: string) => {
  const rows = await sequelize.query<{ Field: string }>(
    `SHOW COLUMNS FROM \`${tableName}\` LIKE :columnName`,
    {
      replacements: { columnName },
      type: QueryTypes.SELECT,
    },
  );
  return rows.length > 0;
};

const tableExists = async (tableName: string) => {
  const rows = await sequelize.query<{ name: string }>(
    `SHOW TABLES LIKE :tableName`,
    {
      replacements: { tableName },
      type: QueryTypes.SELECT,
    },
  );
  return rows.length > 0;
};

const syncHrLeaveAndCalendar = async () => {
  await sequelize.authenticate();
  console.log("Connected. Syncing LeaveRequests + SchoolCalendars...");

  if (await tableExists("LeaveRequests")) {
    if (!(await columnExists("LeaveRequests", "approvedBy"))) {
      await sequelize.query(
        "ALTER TABLE `LeaveRequests` ADD COLUMN `approvedBy` INTEGER NULL",
      );
      console.log("Added LeaveRequests.approvedBy");
    }
    if (!(await columnExists("LeaveRequests", "approvedAt"))) {
      await sequelize.query(
        "ALTER TABLE `LeaveRequests` ADD COLUMN `approvedAt` DATETIME NULL",
      );
      console.log("Added LeaveRequests.approvedAt");
    }
    if (!(await columnExists("LeaveRequests", "reviewNote"))) {
      await sequelize.query(
        "ALTER TABLE `LeaveRequests` ADD COLUMN `reviewNote` TEXT NULL",
      );
      console.log("Added LeaveRequests.reviewNote");
    }
  } else {
    await LeaveRequest.sync();
    console.log("Created LeaveRequests table");
  }

  await LeaveRequest.sync({ alter: true });
  await SchoolCalendar.sync({ alter: true });
  console.log("Synced LeaveRequest and SchoolCalendar models");

  await sequelize.close();
};

syncHrLeaveAndCalendar().catch(async (error) => {
  console.error(error);
  await sequelize.close().catch(() => undefined);
  process.exit(1);
});
