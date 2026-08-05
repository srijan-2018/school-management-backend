import "dotenv/config";
import "../config/db";
import "../models";
import Notification from "../models/notification.model";
import NotificationRead from "../models/notification-read.model";

async function main() {
  await Notification.sync({ alter: true });
  await NotificationRead.sync({ alter: true });
  // eslint-disable-next-line no-console
  console.log("Notifications and NotificationReads synced.");
  process.exit(0);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
