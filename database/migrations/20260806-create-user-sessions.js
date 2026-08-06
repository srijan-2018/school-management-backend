"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const normalized = tables.map((table) =>
      typeof table === "string" ? table.toLowerCase() : String(table).toLowerCase(),
    );

    if (normalized.includes("usersessions")) {
      return;
    }

    await queryInterface.createTable("UserSessions", {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      deviceId: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      deviceName: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      refreshTokenHash: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      lastActiveAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("UserSessions", ["userId"]);
    await queryInterface.addIndex("UserSessions", ["refreshTokenHash"]);
    await queryInterface.addIndex("UserSessions", ["userId", "isActive"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("UserSessions").catch(() => undefined);
  },
};
