import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import School from "./school.model";
import Class from "./class.model";
import User from "./user.model";
import ElearningPlaylist from "./elearning-playlist.model";

export const ELEARNING_CONTENT_TYPES = [
  "video",
  "pdf",
  "document",
  "file",
] as const;

export type ElearningContentType = (typeof ELEARNING_CONTENT_TYPES)[number];

class ElearningContent extends Model {
  public id!: number;
  public schoolId!: number;
  public playlistId?: number | null;
  public title!: string;
  public description?: string | null;
  public type!: ElearningContentType;
  public contentUrl!: string;
  public thumbnailUrl?: string | null;
  public fileName?: string | null;
  public classId?: number | null;
  public sortOrder?: number | null;
  public createdByUserId?: number | null;
}

ElearningContent.init(
  {
    schoolId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    playlistId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM(...ELEARNING_CONTENT_TYPES),
      allowNull: false,
    },
    contentUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    thumbnailUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    classId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    createdByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "ElearningContent",
    timestamps: true,
  },
);

ElearningContent.belongsTo(School, { foreignKey: "schoolId" });
ElearningContent.belongsTo(Class, { foreignKey: "classId" });
ElearningContent.belongsTo(ElearningPlaylist, { foreignKey: "playlistId" });
ElearningContent.belongsTo(User, {
  foreignKey: "createdByUserId",
  as: "createdBy",
});
ElearningPlaylist.hasMany(ElearningContent, {
  foreignKey: "playlistId",
  as: "contents",
});

export default ElearningContent;
