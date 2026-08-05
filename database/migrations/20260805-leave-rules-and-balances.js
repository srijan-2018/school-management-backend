"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const normalized = tables.map((t) =>
      typeof t === "string" ? t.toLowerCase() : String(t).toLowerCase(),
    );

    if (!normalized.includes("leaverules")) {
      await queryInterface.createTable("LeaveRules", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        schoolId: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        leaveType: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        annualAllowance: {
          type: Sequelize.FLOAT,
          allowNull: false,
          defaultValue: 0,
        },
        maxConsecutiveDays: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        minNoticeDays: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
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

      await queryInterface.addIndex("LeaveRules", ["schoolId", "leaveType"], {
        unique: true,
        name: "leave_rules_school_type_unique",
      });
    }

    if (!normalized.includes("leavebalances")) {
      await queryInterface.createTable("LeaveBalances", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        schoolId: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        leaveType: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        year: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        totalDays: {
          type: Sequelize.FLOAT,
          allowNull: false,
          defaultValue: 0,
        },
        usedDays: {
          type: Sequelize.FLOAT,
          allowNull: false,
          defaultValue: 0,
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

      await queryInterface.addIndex(
        "LeaveBalances",
        ["schoolId", "userId", "leaveType", "year"],
        {
          unique: true,
          name: "leave_balances_school_user_type_year_unique",
        },
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("LeaveBalances").catch(() => undefined);
    await queryInterface.dropTable("LeaveRules").catch(() => undefined);
  },
};
