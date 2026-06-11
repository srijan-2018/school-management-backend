import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import School from "./school.model";

class InventoryItem extends Model {
  public id!: number;
  public schoolId!: number;
  public name!: string;
  public category?: string | null;
  public quantity!: number;
  public unit?: string | null;
  public minQuantity?: number | null;
  public description?: string | null;
  public location?: string | null;
}

InventoryItem.init(
  {
    schoolId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    quantity: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    minQuantity: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "InventoryItem",
    timestamps: true,
  },
);

InventoryItem.belongsTo(School, { foreignKey: "schoolId" });
School.hasMany(InventoryItem, { foreignKey: "schoolId", as: "inventoryItems" });

export default InventoryItem;
