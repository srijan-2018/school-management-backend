import { DataTypes, Model, Optional } from "sequelize";

import { sequelize } from "../config/db";
import User from "./user.model";

export type AuditLogAttributes = {
  id: number;
  actorUserId: number | null;
  actorRole: string | null;
  actorSchoolId: number | null;
  actorEmail: string | null;
  actorName: string | null;
  module: string;
  action: string;
  method: string;
  path: string;
  resourceType: string | null;
  resourceId: string | null;
  statusCode: number;
  success: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  durationMs: number | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type AuditLogCreation = Optional<
  AuditLogAttributes,
  | "id"
  | "actorUserId"
  | "actorRole"
  | "actorSchoolId"
  | "actorEmail"
  | "actorName"
  | "resourceType"
  | "resourceId"
  | "ipAddress"
  | "userAgent"
  | "summary"
  | "metadata"
  | "durationMs"
>;

class AuditLog extends Model<AuditLogAttributes, AuditLogCreation> implements AuditLogAttributes {
  public id!: number;
  public actorUserId!: number | null;
  public actorRole!: string | null;
  public actorSchoolId!: number | null;
  public actorEmail!: string | null;
  public actorName!: string | null;
  public module!: string;
  public action!: string;
  public method!: string;
  public path!: string;
  public resourceType!: string | null;
  public resourceId!: string | null;
  public statusCode!: number;
  public success!: boolean;
  public ipAddress!: string | null;
  public userAgent!: string | null;
  public summary!: string | null;
  public metadata!: Record<string, unknown> | null;
  public durationMs!: number | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AuditLog.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    actorUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    actorRole: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    actorSchoolId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    actorEmail: {
      type: DataTypes.STRING(191),
      allowNull: true,
    },
    actorName: {
      type: DataTypes.STRING(191),
      allowNull: true,
    },
    module: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    method: {
      type: DataTypes.STRING(16),
      allowNull: false,
    },
    path: {
      type: DataTypes.STRING(512),
      allowNull: false,
    },
    resourceType: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    resourceId: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    statusCode: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    success: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    ipAddress: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    summary: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    durationMs: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "AuditLog",
    tableName: "AuditLogs",
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ["createdAt"] },
      { fields: ["module"] },
      { fields: ["action"] },
      { fields: ["actorUserId"] },
      { fields: ["success"] },
      { fields: ["statusCode"] },
    ],
  },
);

AuditLog.belongsTo(User, {
  foreignKey: "actorUserId",
  as: "actor",
  constraints: false,
});

export default AuditLog;
