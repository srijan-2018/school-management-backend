import "dotenv/config";
import { sequelize } from "../config/db";
import "../models";
import User from "../models/user.model";
import UserSession from "../models/user-session.model";
import Notification from "../models/notification.model";
import NotificationRead from "../models/notification-read.model";
import TransportVehicle from "../models/transport-vehicle.model";
import TransportRoute from "../models/transport-route.model";
import TransportAssignment from "../models/transport-assignment.model";
import TransportTrip from "../models/transport-trip.model";
import TransportTripStudent from "../models/transport-trip-student.model";
import TransportTripLocation from "../models/transport-trip-location.model";

/**
 * Production has no migration tool and never runs sequelize.sync() at boot, so
 * every model change must be applied here or the new columns/tables are missing
 * at runtime. Add newly changed models to this list.
 */
const models = [
  { name: "Users", model: User },
  { name: "UserSessions", model: UserSession },
  { name: "Notifications", model: Notification },
  { name: "NotificationReads", model: NotificationRead },
  { name: "TransportVehicles", model: TransportVehicle },
  { name: "TransportRoutes", model: TransportRoute },
  { name: "TransportAssignments", model: TransportAssignment },
  { name: "TransportTrips", model: TransportTrip },
  { name: "TransportTripStudents", model: TransportTripStudent },
  { name: "TransportTripLocations", model: TransportTripLocation },
];

async function main() {
  await sequelize.authenticate();

  for (const { name, model } of models) {
    if (name === "TransportAssignments") {
      // Remove legacy rows that reference routes deleted before foreign keys
      // were enforced. There is no valid route to restore on these rows.
      const queryInterface = sequelize.getQueryInterface();
      const table = await queryInterface
        .describeTable("TransportAssignments")
        .catch(() => null);
      if (table) {
        const [, metadata] = await sequelize.query(
          `DELETE assignments
           FROM TransportAssignments AS assignments
           LEFT JOIN TransportRoutes AS routes ON routes.id = assignments.routeId
           WHERE routes.id IS NULL`,
        );
        const deletedCount =
          (metadata as { affectedRows?: number }).affectedRows ?? 0;
        if (deletedCount > 0) {
          console.log(`Removed ${deletedCount} orphan transport assignment(s)`);
        }
      }
    }

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
