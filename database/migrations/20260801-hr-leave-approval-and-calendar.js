"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const leaveTable = "LeaveRequests";
    const leaveDesc = await queryInterface.describeTable(leaveTable).catch(() => null);

    if (leaveDesc && !leaveDesc.approvedBy) {
      await queryInterface.addColumn(leaveTable, "approvedBy", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
    if (leaveDesc && !leaveDesc.approvedAt) {
      await queryInterface.addColumn(leaveTable, "approvedAt", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
    if (leaveDesc && !leaveDesc.reviewNote) {
      await queryInterface.addColumn(leaveTable, "reviewNote", {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    const tables = await queryInterface.showAllTables();
    const normalized = tables.map((t) =>
      typeof t === "string" ? t.toLowerCase() : String(t).toLowerCase(),
    );
    if (!normalized.includes("schoolcalendars")) {
      await queryInterface.createTable("SchoolCalendars", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        schoolId: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        title: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        type: {
          type: Sequelize.ENUM("holiday", "event"),
          allowNull: false,
          defaultValue: "event",
        },
        startDate: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        endDate: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        isAllDay: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
        },
      });
    }
  },

  async down(queryInterface) {
    const leaveTable = "LeaveRequests";
    const leaveDesc = await queryInterface.describeTable(leaveTable).catch(() => null);
    if (leaveDesc?.reviewNote) {
      await queryInterface.removeColumn(leaveTable, "reviewNote");
    }
    if (leaveDesc?.approvedAt) {
      await queryInterface.removeColumn(leaveTable, "approvedAt");
    }
    if (leaveDesc?.approvedBy) {
      await queryInterface.removeColumn(leaveTable, "approvedBy");
    }
    await queryInterface.dropTable("SchoolCalendars").catch(() => undefined);
  },
};
