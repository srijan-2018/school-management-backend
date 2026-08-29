import "dotenv/config";
import { sequelize } from "../config/db";
import { ensureNegativeMarkingSchema } from "../services/ensure-negative-marking-schema";

ensureNegativeMarkingSchema()
  .then(() => {
    console.log("Negative marking columns are ready");
  })
  .catch((error) => {
    console.error("Failed to sync negative marking columns:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
