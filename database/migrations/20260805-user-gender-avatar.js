"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = "Users";
    const desc = await queryInterface.describeTable(table).catch(() => null);
    if (!desc) return;

    if (!desc.gender) {
      await queryInterface.addColumn(table, "gender", {
        type: Sequelize.ENUM("male", "female"),
        allowNull: true,
      });
    }

    if (!desc.avatarId) {
      await queryInterface.addColumn(table, "avatarId", {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = "Users";
    const desc = await queryInterface.describeTable(table).catch(() => null);
    if (!desc) return;

    if (desc.avatarId) {
      await queryInterface.removeColumn(table, "avatarId");
    }
    if (desc.gender) {
      await queryInterface.removeColumn(table, "gender");
    }
  },
};
