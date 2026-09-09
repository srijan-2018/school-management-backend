"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface
      .describeTable("MockTests")
      .catch(() => null);
    if (!table) {
      return;
    }

    if (!table.assignmentBatchId) {
      await queryInterface.addColumn("MockTests", "assignmentBatchId", {
        type: Sequelize.STRING(64),
        allowNull: true,
        defaultValue: null,
      });
    }

    try {
      await queryInterface.addIndex("MockTests", ["assignmentBatchId"], {
        name: "mock_tests_assignment_batch_id_idx",
      });
    } catch {
      // Index may already exist.
    }
  },

  async down(queryInterface) {
    const table = await queryInterface
      .describeTable("MockTests")
      .catch(() => null);
    if (!table) {
      return;
    }

    try {
      await queryInterface.removeIndex(
        "MockTests",
        "mock_tests_assignment_batch_id_idx",
      );
    } catch {
      // ignore
    }

    if (table.assignmentBatchId) {
      await queryInterface.removeColumn("MockTests", "assignmentBatchId");
    }
  },
};
