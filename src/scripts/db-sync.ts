import "dotenv/config";

import { connectDB, sequelize } from "../config/db";
import "../models";

const syncDatabase = async () => {
  const shouldAlter = process.env.DB_SYNC_ALTER === "true";

  try {
    console.log("Connecting database for db:sync...");
    await connectDB();

    console.log("Running sequelize.sync()");
    console.log("DB_SYNC_ALTER:", shouldAlter);

    await sequelize.sync({
      alter: shouldAlter,
    });

    console.log("db:sync completed successfully ✅");
  } catch (error) {
    console.error("db:sync failed ❌");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
};

void syncDatabase();
