"use strict";

async function addColumnIfMissing(queryInterface, table, column, definition) {
  const description = await queryInterface.describeTable(table);
  if (!description[column]) {
    await queryInterface.addColumn(table, column, definition);
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const schoolIdColumn = {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "Schools", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    };

    const tables = [
      "Classes",
      "Sections",
      "Subjects",
      "Chapters",
      "Attendances",
      "StaffAttendances",
      "AttendanceRules",
      "Timetables",
      "Fees",
      "Assignments",
      "MockTests",
      "Marks",
      "Students",
    ];

    for (const table of tables) {
      try {
        await addColumnIfMissing(queryInterface, table, "schoolId", schoolIdColumn);
      } catch (error) {
        // Table may not exist yet in fresh environments; sequelize.sync will create it.
        console.warn(`Skipping schoolId on ${table}:`, error.message);
      }
    }

    try {
      await addColumnIfMissing(queryInterface, "Schools", "isActive", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
    } catch (error) {
      console.warn("Skipping Schools.isActive:", error.message);
    }

    const createIfMissing = async (tableName, attributes) => {
      const tablesInDb = await queryInterface.showAllTables();
      const normalized = tablesInDb.map((t) =>
        typeof t === "string" ? t.toLowerCase() : String(t).toLowerCase(),
      );
      if (!normalized.includes(tableName.toLowerCase())) {
        await queryInterface.createTable(tableName, attributes);
      }
    };

    await createIfMissing("Admissions", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      schoolId: { type: Sequelize.INTEGER, allowNull: false },
      studentName: { type: Sequelize.STRING, allowNull: false },
      parentName: { type: Sequelize.STRING, allowNull: true },
      email: { type: Sequelize.STRING, allowNull: true },
      phone: { type: Sequelize.STRING, allowNull: true },
      appliedClassId: { type: Sequelize.INTEGER, allowNull: true },
      status: {
        type: Sequelize.ENUM("pending", "approved", "rejected", "enrolled"),
        allowNull: false,
        defaultValue: "pending",
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      enrolledStudentId: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await createIfMissing("LifecycleDocuments", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      schoolId: { type: Sequelize.INTEGER, allowNull: false },
      studentId: { type: Sequelize.INTEGER, allowNull: true },
      admissionId: { type: Sequelize.INTEGER, allowNull: true },
      title: { type: Sequelize.STRING, allowNull: false },
      documentType: { type: Sequelize.STRING, allowNull: true },
      fileUrl: { type: Sequelize.STRING, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await createIfMissing("TransportVehicles", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      schoolId: { type: Sequelize.INTEGER, allowNull: false },
      plateNumber: { type: Sequelize.STRING, allowNull: false },
      capacity: { type: Sequelize.INTEGER, allowNull: true },
      driverName: { type: Sequelize.STRING, allowNull: true },
      driverPhone: { type: Sequelize.STRING, allowNull: true },
      status: {
        type: Sequelize.ENUM("active", "maintenance", "inactive"),
        defaultValue: "active",
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await createIfMissing("TransportRoutes", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      schoolId: { type: Sequelize.INTEGER, allowNull: false },
      name: { type: Sequelize.STRING, allowNull: false },
      vehicleId: { type: Sequelize.INTEGER, allowNull: true },
      stops: { type: Sequelize.JSON, allowNull: true },
      fare: { type: Sequelize.FLOAT, allowNull: true },
      status: {
        type: Sequelize.ENUM("active", "inactive"),
        defaultValue: "active",
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await createIfMissing("TransportAssignments", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      schoolId: { type: Sequelize.INTEGER, allowNull: false },
      studentId: { type: Sequelize.INTEGER, allowNull: false },
      routeId: { type: Sequelize.INTEGER, allowNull: false },
      stopName: { type: Sequelize.STRING, allowNull: true },
      pickupTime: { type: Sequelize.STRING, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await createIfMissing("HostelBuildings", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      schoolId: { type: Sequelize.INTEGER, allowNull: false },
      name: { type: Sequelize.STRING, allowNull: false },
      gender: {
        type: Sequelize.ENUM("male", "female", "mixed"),
        defaultValue: "mixed",
      },
      address: { type: Sequelize.STRING, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await createIfMissing("HostelRooms", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      schoolId: { type: Sequelize.INTEGER, allowNull: false },
      buildingId: { type: Sequelize.INTEGER, allowNull: false },
      roomNumber: { type: Sequelize.STRING, allowNull: false },
      capacity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      occupied: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      monthlyCharge: { type: Sequelize.FLOAT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await createIfMissing("HostelAllocations", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      schoolId: { type: Sequelize.INTEGER, allowNull: false },
      roomId: { type: Sequelize.INTEGER, allowNull: false },
      studentId: { type: Sequelize.INTEGER, allowNull: false },
      startDate: { type: Sequelize.DATEONLY, allowNull: false },
      endDate: { type: Sequelize.DATEONLY, allowNull: true },
      status: {
        type: Sequelize.ENUM("active", "ended"),
        defaultValue: "active",
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await createIfMissing("StaffProfiles", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      schoolId: { type: Sequelize.INTEGER, allowNull: false },
      userId: { type: Sequelize.INTEGER, allowNull: false },
      employeeCode: { type: Sequelize.STRING, allowNull: true },
      department: { type: Sequelize.STRING, allowNull: true },
      designation: { type: Sequelize.STRING, allowNull: true },
      joinDate: { type: Sequelize.DATEONLY, allowNull: true },
      salary: { type: Sequelize.FLOAT, allowNull: true },
      status: {
        type: Sequelize.ENUM("active", "inactive"),
        defaultValue: "active",
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await createIfMissing("LeaveRequests", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      schoolId: { type: Sequelize.INTEGER, allowNull: false },
      userId: { type: Sequelize.INTEGER, allowNull: false },
      leaveType: { type: Sequelize.STRING, allowNull: false },
      startDate: { type: Sequelize.DATEONLY, allowNull: false },
      endDate: { type: Sequelize.DATEONLY, allowNull: false },
      reason: { type: Sequelize.TEXT, allowNull: true },
      status: {
        type: Sequelize.ENUM("pending", "approved", "rejected"),
        defaultValue: "pending",
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await createIfMissing("SalaryStructures", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      schoolId: { type: Sequelize.INTEGER, allowNull: false },
      staffProfileId: { type: Sequelize.INTEGER, allowNull: false },
      basic: { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0 },
      hra: { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0 },
      allowances: { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0 },
      deductions: { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0 },
      effectiveFrom: { type: Sequelize.DATEONLY, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await createIfMissing("PayrollRuns", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      schoolId: { type: Sequelize.INTEGER, allowNull: false },
      month: { type: Sequelize.INTEGER, allowNull: false },
      year: { type: Sequelize.INTEGER, allowNull: false },
      status: {
        type: Sequelize.ENUM("draft", "processed", "paid"),
        defaultValue: "draft",
      },
      totalAmount: { type: Sequelize.FLOAT, allowNull: true, defaultValue: 0 },
      notes: { type: Sequelize.TEXT, allowNull: true },
      payslips: { type: Sequelize.JSON, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    const dropTables = [
      "PayrollRuns",
      "SalaryStructures",
      "LeaveRequests",
      "StaffProfiles",
      "HostelAllocations",
      "HostelRooms",
      "HostelBuildings",
      "TransportAssignments",
      "TransportRoutes",
      "TransportVehicles",
      "LifecycleDocuments",
      "Admissions",
    ];

    for (const table of dropTables) {
      await queryInterface.dropTable(table).catch(() => undefined);
    }
  },
};
