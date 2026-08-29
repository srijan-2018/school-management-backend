import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

class School extends Model {
  public id!: number;
  public name!: string;
  public code?: string | null;
  public email?: string | null;
  public phone?: string | null;
  public address?: string | null;
  public isActive!: boolean;
  public mockTestNegativeMarkingEnabled!: boolean;
  public mockTestNegativeMarkingPenalty!: number;
}

School.init(
  {
    name: { type: DataTypes.STRING, allowNull: false },
    code: { type: DataTypes.STRING, allowNull: true, unique: true },
    email: { type: DataTypes.STRING, allowNull: true },
    phone: { type: DataTypes.STRING, allowNull: true },
    address: { type: DataTypes.STRING, allowNull: true },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    mockTestNegativeMarkingEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    mockTestNegativeMarkingPenalty: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: false,
      defaultValue: 0.25,
    },
  },
  { sequelize, modelName: "School", timestamps: true },
);

export default School;
