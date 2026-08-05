import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import Notification from "./notification.model";
import User from "./user.model";

class NotificationRead extends Model {
  public id!: number;
  public notificationId!: number;
  public userId!: number;
  public readAt!: Date;
}

NotificationRead.init(
  {
    notificationId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    readAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: "NotificationRead",
    tableName: "NotificationReads",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["notificationId", "userId"],
      },
    ],
  },
);

NotificationRead.belongsTo(Notification, { foreignKey: "notificationId" });
NotificationRead.belongsTo(User, { foreignKey: "userId" });
Notification.hasMany(NotificationRead, {
  foreignKey: "notificationId",
  as: "reads",
});

export default NotificationRead;
