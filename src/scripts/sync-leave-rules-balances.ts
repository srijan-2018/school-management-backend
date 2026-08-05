import "../config/db";
import LeaveRule from "../models/leave-rule.model";
import LeaveBalance from "../models/leave-balance.model";

async function main() {
  await LeaveRule.sync({ alter: true });
  await LeaveBalance.sync({ alter: true });
  // eslint-disable-next-line no-console
  console.log("LeaveRules and LeaveBalances synced.");
  process.exit(0);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
