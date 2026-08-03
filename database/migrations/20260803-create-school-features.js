"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const normalized = tables.map((table) =>
      typeof table === "string" ? table.toLowerCase() : String(table).toLowerCase(),
    );

    if (normalized.includes("schoolfeatures")) {
      return;
    }

    await queryInterface.createTable("SchoolFeatures", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      schoolId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      featureKey: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      enabled: {
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

    await queryInterface.addIndex("SchoolFeatures", ["schoolId", "featureKey"], {
      unique: true,
      name: "school_features_school_feature_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("SchoolFeatures").catch(() => undefined);
  },
};
