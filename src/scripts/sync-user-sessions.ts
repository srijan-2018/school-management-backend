import "dotenv/config";
import "../config/db";
import "../models";
import UserSession from "../models/user-session.model";

async function main() {
  await UserSession.sync({ alter: true });
  // eslint-disable-next-line no-console
  console.log("UserSessions synced.");
  process.exit(0);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
