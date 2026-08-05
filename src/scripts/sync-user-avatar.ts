import "dotenv/config";
import "../config/db";
import User from "../models/user.model";

async function main() {
  await User.sync({ alter: true });
  // eslint-disable-next-line no-console
  console.log("Users table synced (gender, avatarId).");
  process.exit(0);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
