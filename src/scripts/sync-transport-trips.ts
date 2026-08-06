import "dotenv/config";
import { sequelize } from "../config/db";
import "../models";
import TransportVehicle from "../models/transport-vehicle.model";
import TransportRoute from "../models/transport-route.model";
import TransportAssignment from "../models/transport-assignment.model";
import TransportTrip from "../models/transport-trip.model";
import TransportTripStudent from "../models/transport-trip-student.model";
import TransportTripLocation from "../models/transport-trip-location.model";

async function main() {
  await sequelize.authenticate();

  await TransportVehicle.sync({ alter: true });
  console.log("Synced TransportVehicles");

  await TransportRoute.sync({ alter: true });
  console.log("Synced TransportRoutes");

  await TransportAssignment.sync({ alter: true });
  console.log("Synced TransportAssignments");

  await TransportTrip.sync({ alter: true });
  console.log("Synced TransportTrips");

  await TransportTripStudent.sync({ alter: true });
  console.log("Synced TransportTripStudents");

  await TransportTripLocation.sync({ alter: true });
  console.log("Synced TransportTripLocations");

  console.log("Transport trip schema sync completed.");
  await sequelize.close();
}

main().catch((error) => {
  console.error("Transport trip schema sync failed:", error);
  process.exit(1);
});
