"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Users", "schoolId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "Schools",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addIndex("Users", ["schoolId"], {
      name: "users_school_id_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("Users", "users_school_id_idx");
    await queryInterface.removeColumn("Users", "schoolId");
  },
};
