import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import School from "./school.model";
import User from "./user.model";

export const NOTIFICATION_TYPES = [
  "exam",
  "event",
  "holiday",
  "notice",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

class Notification extends Model {
  public id!: number;
  public schoolId!: number;
  public type!: NotificationType;
  public title!: string;
  public body?: string | null;
  public sourceType?: string | null;
  public sourceId?: number | null;
  public audienceRoles!: string;
  public createdByUserId?: number | null;
}

Notification.init(
  {
    schoolId: { type: DataTypes.INTEGER, allowNull: false },
    type: {
      type: DataTypes.ENUM(...NOTIFICATION_TYPES),
      allowNull: false,
      defaultValue: "notice",
    },
    title: { type: DataTypes.STRING, allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: true },
    sourceType: { type: DataTypes.STRING, allowNull: true },
    sourceId: { type: DataTypes.INTEGER, allowNull: true },
    audienceRoles: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "[]",
    },
    createdByUserId: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    sequelize,
    modelName: "Notification",
    tableName: "Notifications",
    timestamps: true,
  },
);

Notification.belongsTo(School, { foreignKey: "schoolId" });
Notification.belongsTo(User, {
  foreignKey: "createdByUserId",
  as: "createdBy",
});
School.hasMany(Notification, {
  foreignKey: "schoolId",
  as: "notifications",
});

export default Notification;
