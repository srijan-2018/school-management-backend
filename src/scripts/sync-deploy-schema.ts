import "dotenv/config";
import { sequelize } from "../config/db";
import "../models";
import User from "../models/user.model";
import Notification from "../models/notification.model";
import NotificationRead from "../models/notification-read.model";

/**
 * Production has no migration tool and never runs sequelize.sync() at boot, so
 * every model change must be applied here or the new columns/tables are missing
 * at runtime. Add newly changed models to this list.
 */
const models = [
  { name: "Users", model: User },
  { name: "Notifications", model: Notification },
  { name: "NotificationReads", model: NotificationRead },
];

async function main() {
  await sequelize.authenticate();

  for (const { name, model } of models) {
    await model.sync({ alter: true });
    console.log(`Synced ${name}`);
  }

  console.log("Deploy schema sync completed.");
  await sequelize.close();
}

main().catch((error) => {
  console.error("Deploy schema sync failed:", error);
  process.exit(1);
});
