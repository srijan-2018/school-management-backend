"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("AuditLogs", {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      actorUserId: { type: Sequelize.INTEGER, allowNull: true },
      actorRole: { type: Sequelize.STRING(64), allowNull: true },
      actorSchoolId: { type: Sequelize.INTEGER, allowNull: true },
      actorEmail: { type: Sequelize.STRING(191), allowNull: true },
      actorName: { type: Sequelize.STRING(191), allowNull: true },
      module: { type: Sequelize.STRING(64), allowNull: false },
      action: { type: Sequelize.STRING(64), allowNull: false },
      method: { type: Sequelize.STRING(16), allowNull: false },
      path: { type: Sequelize.STRING(512), allowNull: false },
      resourceType: { type: Sequelize.STRING(64), allowNull: true },
      resourceId: { type: Sequelize.STRING(64), allowNull: true },
      statusCode: { type: Sequelize.INTEGER, allowNull: false },
      success: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      ipAddress: { type: Sequelize.STRING(64), allowNull: true },
      userAgent: { type: Sequelize.STRING(512), allowNull: true },
      summary: { type: Sequelize.STRING(512), allowNull: true },
      metadata: { type: Sequelize.JSON, allowNull: true },
      durationMs: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("AuditLogs", ["createdAt"]);
    await queryInterface.addIndex("AuditLogs", ["module"]);
    await queryInterface.addIndex("AuditLogs", ["action"]);
    await queryInterface.addIndex("AuditLogs", ["actorUserId"]);
    await queryInterface.addIndex("AuditLogs", ["success"]);
    await queryInterface.addIndex("AuditLogs", ["statusCode"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("AuditLogs");
  },
};
