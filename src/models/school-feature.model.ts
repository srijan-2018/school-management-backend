import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import School from "./school.model";

class SchoolFeature extends Model {
  public id!: number;
  public schoolId!: number;
  public featureKey!: string;
  public enabled!: boolean;
}

SchoolFeature.init(
  {
    schoolId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    featureKey: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: "SchoolFeature",
    tableName: "SchoolFeatures",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["schoolId", "featureKey"],
        name: "school_features_school_feature_unique",
      },
    ],
  },
);

School.hasMany(SchoolFeature, {
  foreignKey: "schoolId",
  as: "features",
  onDelete: "CASCADE",
});
SchoolFeature.belongsTo(School, {
  foreignKey: "schoolId",
  as: "school",
});

export default SchoolFeature;
