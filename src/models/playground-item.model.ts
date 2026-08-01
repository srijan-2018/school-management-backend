import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import School from "./school.model";

export const PLAYGROUND_CATEGORIES = [
  "letter",
  "word",
  "sentence_group",
  "phrase",
] as const;

export type PlaygroundCategory = (typeof PLAYGROUND_CATEGORIES)[number];

class PlaygroundItem extends Model {
  public id!: number;
  public schoolId!: number;
  public category!: PlaygroundCategory;
  public title!: string;
  public emoji?: string | null;
  public example?: string | null;
  public color?: string | null;
  public icon?: string | null;
  public lines?: string | null;
  public sortOrder!: number;
  public isActive!: boolean;
}

PlaygroundItem.init(
  {
    schoolId: { type: DataTypes.INTEGER, allowNull: false },
    category: {
      type: DataTypes.ENUM(...PLAYGROUND_CATEGORIES),
      allowNull: false,
    },
    title: { type: DataTypes.STRING, allowNull: false },
    emoji: { type: DataTypes.STRING, allowNull: true },
    example: { type: DataTypes.TEXT, allowNull: true },
    color: { type: DataTypes.STRING, allowNull: true },
    icon: { type: DataTypes.STRING, allowNull: true },
    lines: { type: DataTypes.TEXT, allowNull: true },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: "PlaygroundItem",
    tableName: "PlaygroundItems",
    timestamps: true,
  },
);

PlaygroundItem.belongsTo(School, { foreignKey: "schoolId" });
School.hasMany(PlaygroundItem, {
  foreignKey: "schoolId",
  as: "playgroundItems",
});

export default PlaygroundItem;
