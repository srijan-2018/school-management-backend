import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";
import School from "./school.model";
import Subject from "./subject.model";
import User from "./user.model";

class ChatMessage extends Model {
  public id!: number;
  public schoolId!: number;
  public subjectId!: number;
  public senderUserId!: number;
  public receiverUserId!: number;
  public message!: string;
  public isRead!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ChatMessage.init(
  {
    schoolId: { type: DataTypes.INTEGER, allowNull: false },
    subjectId: { type: DataTypes.INTEGER, allowNull: false },
    senderUserId: { type: DataTypes.INTEGER, allowNull: false },
    receiverUserId: { type: DataTypes.INTEGER, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    sequelize,
    modelName: "ChatMessage",
    tableName: "ChatMessages",
    timestamps: true,
    indexes: [
      {
        fields: ["subjectId", "senderUserId", "receiverUserId"],
        name: "idx_chat_conversation",
      },
      {
        fields: ["receiverUserId", "isRead"],
        name: "idx_chat_unread",
      },
      {
        fields: ["schoolId"],
        name: "idx_chat_school",
      },
    ],
  },
);

ChatMessage.belongsTo(School, { foreignKey: "schoolId" });
ChatMessage.belongsTo(Subject, { foreignKey: "subjectId" });
ChatMessage.belongsTo(User, { foreignKey: "senderUserId", as: "sender" });
ChatMessage.belongsTo(User, { foreignKey: "receiverUserId", as: "receiver" });

export default ChatMessage;
