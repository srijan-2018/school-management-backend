"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config(); // ✅ MUST BE FIRST
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const db_1 = require("./config/db");
const swagger_1 = __importDefault(require("./config/swagger"));
// ✅ Import ALL models (VERY IMPORTANT)
require("./models/user.model");
require("./models/class.model");
require("./models/student.model");
require("./models/subject.model");
require("./models/role.model");
require("./models/permission.model");
require("./models/role-permission.model");
require("./models/school.model");
require("./models/section.model");
require("./models/teacher.model");
require("./models/parent.model");
require("./models/parent-student.model");
require("./models/teacher-class.model");
require("./models/attendance.model");
require("./models/exam.model");
require("./models/mark.model");
require("./models/student-document.model");
require("./models/assignment.model");
require("./models/assignment-submission.model");
require("./models/timetable.model");
require("./models/fee.model");
require("./models/fee-payment.model");
require("./models/mock-test.model");
// routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const role_routes_1 = __importDefault(require("./routes/role.routes"));
const permission_routes_1 = __importDefault(require("./routes/permission.routes"));
const erp_routes_1 = __importDefault(require("./routes/erp.routes"));
const error_middleware_1 = require("./middlewares/error.middleware");
// (later)
// import studentRoutes from "./routes/student.routes";
// import classRoutes from "./routes/class.routes";
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((0, morgan_1.default)("dev"));
// ✅ Connect DB
(0, db_1.connectDB)();
// ✅ Sync DB properly
const syncDatabase = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield db_1.sequelize.sync({ alter: true }); // auto update tables
        console.log("Database synced ✅");
    }
    catch (error) {
        console.error("Sync error ❌", error);
    }
});
syncDatabase();
// routes
app.use("/api/auth", auth_routes_1.default);
app.use("/api/users", user_routes_1.default);
app.use("/api/roles", role_routes_1.default);
app.use("/api/permissions", permission_routes_1.default);
app.use("/api", erp_routes_1.default);
// app.use("/api/students", studentRoutes);
// app.use("/api/classes", classRoutes);
app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.default));
app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swagger_1.default);
});
app.get("/", (req, res) => {
    res.send("School Backend Running 🚀");
});
app.use(error_middleware_1.notFoundHandler);
app.use(error_middleware_1.errorHandler);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
