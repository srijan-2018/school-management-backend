"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("TransportTrips");
    if (!table.locationText) {
      await queryInterface.addColumn("TransportTrips", "locationText", {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("TransportTrips");
    if (table.locationText) {
      await queryInterface.removeColumn("TransportTrips", "locationText");
    }
  },
};
