import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import School from "./school.model";

class LifecycleDocument extends Model {
  public id!: number;
  public schoolId!: number;
}

LifecycleDocument.init(
  {
    schoolId: { type: DataTypes.INTEGER, allowNull: false },
    studentId: { type: DataTypes.INTEGER, allowNull: true },
    admissionId: { type: DataTypes.INTEGER, allowNull: true },
    title: { type: DataTypes.STRING, allowNull: false },
    documentType: { type: DataTypes.STRING, allowNull: true },
    fileUrl: { type: DataTypes.STRING, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    modelName: "LifecycleDocument",
    tableName: "LifecycleDocuments",
    timestamps: true,
  },
);

LifecycleDocument.belongsTo(School, { foreignKey: "schoolId" });
School.hasMany(LifecycleDocument, {
  foreignKey: "schoolId",
  as: "lifecycleDocuments",
});

export default LifecycleDocument;
