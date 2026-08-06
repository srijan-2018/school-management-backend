import { DataTypes, Model, Optional } from "sequelize";

import { sequelize } from "../config/db";
import User from "./user.model";

export type UserSessionAttributes = {
  id: number;
  userId: number;
  deviceId: string;
  deviceName: string | null;
  refreshTokenHash: string;
  isActive: boolean;
  lastActiveAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

type UserSessionCreation = Optional<
  UserSessionAttributes,
  "id" | "deviceName" | "isActive" | "lastActiveAt"
>;

class UserSession
  extends Model<UserSessionAttributes, UserSessionCreation>
  implements UserSessionAttributes
{
  public id!: number;
  public userId!: number;
  public deviceId!: string;
  public deviceName!: string | null;
  public refreshTokenHash!: string;
  public isActive!: boolean;
  public lastActiveAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

UserSession.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    deviceId: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    deviceName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    refreshTokenHash: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    lastActiveAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: "UserSession",
    tableName: "UserSessions",
    indexes: [
      { fields: ["userId"] },
      { fields: ["refreshTokenHash"] },
      { fields: ["userId", "isActive"] },
    ],
  },
);

UserSession.belongsTo(User, { foreignKey: "userId", as: "user" });
User.hasMany(UserSession, { foreignKey: "userId", as: "sessions" });

export default UserSession;
