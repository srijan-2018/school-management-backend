"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const describeVehicles = await queryInterface.describeTable(
      "TransportVehicles",
    );
    if (!describeVehicles.driverUserId) {
      await queryInterface.addColumn("TransportVehicles", "driverUserId", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    await queryInterface.createTable("TransportTrips", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      schoolId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      routeId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      vehicleId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      driverUserId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      direction: {
        type: Sequelize.ENUM("pickup", "dropoff"),
        allowNull: false,
        defaultValue: "pickup",
      },
      status: {
        type: Sequelize.ENUM(
          "scheduled",
          "in_progress",
          "completed",
          "cancelled",
        ),
        allowNull: false,
        defaultValue: "in_progress",
      },
      startLat: { type: Sequelize.FLOAT, allowNull: true },
      startLng: { type: Sequelize.FLOAT, allowNull: true },
      endLat: { type: Sequelize.FLOAT, allowNull: true },
      endLng: { type: Sequelize.FLOAT, allowNull: true },
      endAddress: { type: Sequelize.STRING, allowNull: true },
      currentLat: { type: Sequelize.FLOAT, allowNull: true },
      currentLng: { type: Sequelize.FLOAT, allowNull: true },
      locationUpdatedAt: { type: Sequelize.DATE, allowNull: true },
      startedAt: { type: Sequelize.DATE, allowNull: true },
      completedAt: { type: Sequelize.DATE, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.createTable("TransportTripStudents", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      tripId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      studentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      assignmentId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      stopName: { type: Sequelize.STRING, allowNull: true },
      status: {
        type: Sequelize.ENUM("expected", "boarded", "dropped", "absent"),
        allowNull: false,
        defaultValue: "expected",
      },
      boardedAt: { type: Sequelize.DATE, allowNull: true },
      droppedAt: { type: Sequelize.DATE, allowNull: true },
      boardedLat: { type: Sequelize.FLOAT, allowNull: true },
      boardedLng: { type: Sequelize.FLOAT, allowNull: true },
      droppedLat: { type: Sequelize.FLOAT, allowNull: true },
      droppedLng: { type: Sequelize.FLOAT, allowNull: true },
      notes: { type: Sequelize.STRING, allowNull: true },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.createTable("TransportTripLocations", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      tripId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      lat: { type: Sequelize.FLOAT, allowNull: false },
      lng: { type: Sequelize.FLOAT, allowNull: false },
      speed: { type: Sequelize.FLOAT, allowNull: true },
      heading: { type: Sequelize.FLOAT, allowNull: true },
      accuracy: { type: Sequelize.FLOAT, allowNull: true },
      recordedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("TransportTrips", ["schoolId", "status"]);
    await queryInterface.addIndex("TransportTrips", ["driverUserId", "status"]);
    await queryInterface.addIndex("TransportTripStudents", [
      "tripId",
      "studentId",
    ]);
    await queryInterface.addIndex("TransportTripLocations", [
      "tripId",
      "recordedAt",
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("TransportTripLocations");
    await queryInterface.dropTable("TransportTripStudents");
    await queryInterface.dropTable("TransportTrips");

    const describeVehicles = await queryInterface.describeTable(
      "TransportVehicles",
    );
    if (describeVehicles.driverUserId) {
      await queryInterface.removeColumn("TransportVehicles", "driverUserId");
    }
  },
};
