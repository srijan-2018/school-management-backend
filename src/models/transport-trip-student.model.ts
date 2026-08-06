import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import Student from "./student.model";
import TransportTrip from "./transport-trip.model";
import TransportAssignment from "./transport-assignment.model";

export type TransportTripStudentStatus =
  | "expected"
  | "boarded"
  | "dropped"
  | "absent";

class TransportTripStudent extends Model {
  public id!: number;
  public tripId!: number;
  public studentId!: number;
  public assignmentId?: number | null;
  public stopName?: string | null;
  public status!: TransportTripStudentStatus;
  public boardedAt?: Date | null;
  public droppedAt?: Date | null;
  public boardedLat?: number | null;
  public boardedLng?: number | null;
  public droppedLat?: number | null;
  public droppedLng?: number | null;
  public notes?: string | null;
}

TransportTripStudent.init(
  {
    tripId: { type: DataTypes.INTEGER, allowNull: false },
    studentId: { type: DataTypes.INTEGER, allowNull: false },
    assignmentId: { type: DataTypes.INTEGER, allowNull: true },
    stopName: { type: DataTypes.STRING, allowNull: true },
    status: {
      type: DataTypes.ENUM("expected", "boarded", "dropped", "absent"),
      allowNull: false,
      defaultValue: "expected",
    },
    boardedAt: { type: DataTypes.DATE, allowNull: true },
    droppedAt: { type: DataTypes.DATE, allowNull: true },
    boardedLat: { type: DataTypes.FLOAT, allowNull: true },
    boardedLng: { type: DataTypes.FLOAT, allowNull: true },
    droppedLat: { type: DataTypes.FLOAT, allowNull: true },
    droppedLng: { type: DataTypes.FLOAT, allowNull: true },
    notes: { type: DataTypes.STRING, allowNull: true },
  },
  {
    sequelize,
    modelName: "TransportTripStudent",
    tableName: "TransportTripStudents",
    timestamps: true,
  },
);

TransportTripStudent.belongsTo(TransportTrip, {
  foreignKey: "tripId",
  as: "trip",
});
TransportTrip.hasMany(TransportTripStudent, {
  foreignKey: "tripId",
  as: "students",
});
TransportTripStudent.belongsTo(Student, {
  foreignKey: "studentId",
  as: "student",
});
TransportTripStudent.belongsTo(TransportAssignment, {
  foreignKey: "assignmentId",
  as: "assignment",
});

export default TransportTripStudent;
