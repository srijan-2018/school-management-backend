"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("MockTests").catch(() => null);
    if (!table) {
      return;
    }

    if (!table.durationSeconds) {
      await queryInterface.addColumn("MockTests", "durationSeconds", {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
      });
    }

    if (!table.attemptStartedAt) {
      await queryInterface.addColumn("MockTests", "attemptStartedAt", {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      });
    }

    if (!table.attemptEndsAt) {
      await queryInterface.addColumn("MockTests", "attemptEndsAt", {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      });
    }

    if (!table.draftAnswers) {
      await queryInterface.addColumn("MockTests", "draftAnswers", {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null,
      });
    }

    if (!table.questionStatuses) {
      await queryInterface.addColumn("MockTests", "questionStatuses", {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null,
      });
    }

    if (!table.submissionReason) {
      await queryInterface.addColumn("MockTests", "submissionReason", {
        type: Sequelize.ENUM("MANUAL_SUBMIT", "TIME_EXPIRED", "EXAM_EXIT"),
        allowNull: true,
        defaultValue: null,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("MockTests").catch(() => null);
    if (!table) {
      return;
    }

    for (const column of [
      "submissionReason",
      "questionStatuses",
      "draftAnswers",
      "attemptEndsAt",
      "attemptStartedAt",
      "durationSeconds",
    ]) {
      if (table[column]) {
        await queryInterface.removeColumn("MockTests", column);
      }
    }
  },
};
