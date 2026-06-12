import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import School from "./school.model";
import Class from "./class.model";
import User from "./user.model";

class ElearningPlaylist extends Model {
  public id!: number;
  public schoolId!: number;
  public title!: string;
  public description?: string | null;
  public classId?: number | null;
  public createdByUserId?: number | null;
}

ElearningPlaylist.init(
  {
    schoolId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    classId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    createdByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "ElearningPlaylist",
    timestamps: true,
  },
);

ElearningPlaylist.belongsTo(School, { foreignKey: "schoolId" });
ElearningPlaylist.belongsTo(Class, { foreignKey: "classId" });
ElearningPlaylist.belongsTo(User, {
  foreignKey: "createdByUserId",
  as: "createdBy",
});

export default ElearningPlaylist;
