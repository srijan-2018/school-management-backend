"use strict";

async function addColumnIfMissing(queryInterface, table, column, definition) {
  const description = await queryInterface.describeTable(table);
  if (!description[column]) {
    await queryInterface.addColumn(table, column, definition);
  }
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await addColumnIfMissing(
        queryInterface,
        "Schools",
        "mockTestNegativeMarkingEnabled",
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      );
      await addColumnIfMissing(
        queryInterface,
        "Schools",
        "mockTestNegativeMarkingPenalty",
        {
          type: Sequelize.DECIMAL(4, 2),
          allowNull: false,
          defaultValue: 0.25,
        },
      );
    } catch (error) {
      console.warn("Skipping Schools negative marking columns:", error.message);
    }

    try {
      await addColumnIfMissing(
        queryInterface,
        "MockTests",
        "negativeMarkingEnabled",
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      );
      await addColumnIfMissing(
        queryInterface,
        "MockTests",
        "negativeMarkingPenalty",
        {
          type: Sequelize.DECIMAL(4, 2),
          allowNull: false,
          defaultValue: 0.25,
        },
      );
    } catch (error) {
      console.warn("Skipping MockTests negative marking columns:", error.message);
    }
  },

  async down(queryInterface) {
    const dropIfPresent = async (table, column) => {
      try {
        const description = await queryInterface.describeTable(table);
        if (description[column]) {
          await queryInterface.removeColumn(table, column);
        }
      } catch {
        // Table may not exist.
      }
    };

    await dropIfPresent("MockTests", "negativeMarkingPenalty");
    await dropIfPresent("MockTests", "negativeMarkingEnabled");
    await dropIfPresent("Schools", "mockTestNegativeMarkingPenalty");
    await dropIfPresent("Schools", "mockTestNegativeMarkingEnabled");
  },
};
