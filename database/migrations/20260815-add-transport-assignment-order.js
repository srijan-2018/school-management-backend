"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("TransportAssignments");
    if (!table.sortOrder) {
      await queryInterface.addColumn("TransportAssignments", "sortOrder", {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("TransportAssignments");
    if (table.sortOrder) {
      await queryInterface.removeColumn("TransportAssignments", "sortOrder");
    }
  },
};
