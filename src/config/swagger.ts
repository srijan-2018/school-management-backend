import swaggerJsdoc from "swagger-jsdoc";

const PORT = process.env.PORT || 5000;
const baseUrl = process.env.API_BASE_URL || `http://localhost:${PORT}/api`;

const jsonContent = (schema: Record<string, unknown>) => ({
  required: true,
  content: {
    "application/json": {
      schema,
    },
  },
});

const idParameter = (name = "id", description = "Resource id") => ({
  name,
  in: "path",
  required: true,
  description,
  schema: {
    type: "integer",
  },
});

const queryParameter = (
  name: string,
  description: string,
  schema: Record<string, unknown>,
) => ({
  name,
  in: "query",
  required: false,
  description,
  schema,
});

const paginationParameters = () => [
  queryParameter("page", "Page number", {
    type: "integer",
    example: 1,
    default: 1,
    minimum: 1,
  }),
  queryParameter("limit", "Items per page", {
    type: "integer",
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 100,
  }),
];

const messageResponse = (description: string) => ({
  description,
  content: {
    "application/json": {
      schema: {
        $ref: "#/components/schemas/MessageResponse",
      },
    },
  },
});

const objectBody = (title: string) =>
  jsonContent({
    type: "object",
    description: `${title} payload. Send fields that match your Sequelize model.`,
    additionalProperties: true,
  });

const createBody = (title: string) =>
  jsonContent({
    oneOf: [
      {
        type: "object",
        description: `${title} payload. Send fields that match your Sequelize model.`,
        additionalProperties: true,
      },
      {
        type: "array",
        description: `Bulk ${title.toLowerCase()} payload.`,
        items: {
          type: "object",
          additionalProperties: true,
        },
      },
    ],
  });

const protectedCrudPaths = (
  tag: string,
  itemName: string,
  collectionName: string,
  basePath: string,
  methods: Array<"list" | "create" | "get" | "update" | "delete">,
) => {
  const paths: Record<string, unknown> = {};

  const collectionPath: Record<string, unknown> = {};
  const itemPath: Record<string, unknown> = {};

  if (methods.includes("list")) {
    collectionPath.get = {
      tags: [tag],
      summary: `List ${collectionName}`,
      security: [{ bearerAuth: [] }],
      parameters: paginationParameters(),
      responses: {
        200: messageResponse(`${collectionName} list`),
        401: messageResponse("Unauthorized"),
      },
    };
  }

  if (methods.includes("create")) {
    collectionPath.post = {
      tags: [tag],
      summary: `Create ${itemName}`,
      security: [{ bearerAuth: [] }],
      requestBody: createBody(`Create ${itemName}`),
      responses: {
        201: messageResponse(`${itemName} created`),
        400: messageResponse("Validation error"),
        401: messageResponse("Unauthorized"),
      },
    };
  }

  if (methods.includes("get")) {
    itemPath.get = {
      tags: [tag],
      summary: `Get ${itemName} by id`,
      security: [{ bearerAuth: [] }],
      parameters: [idParameter()],
      responses: {
        200: messageResponse(`${itemName} details`),
        401: messageResponse("Unauthorized"),
        404: messageResponse("Not found"),
      },
    };
  }

  if (methods.includes("update")) {
    itemPath.put = {
      tags: [tag],
      summary: `Update ${itemName}`,
      security: [{ bearerAuth: [] }],
      parameters: [idParameter()],
      requestBody: objectBody(`Update ${itemName}`),
      responses: {
        200: messageResponse(`${itemName} updated`),
        400: messageResponse("Validation error"),
        401: messageResponse("Unauthorized"),
        404: messageResponse("Not found"),
      },
    };
  }

  if (methods.includes("delete")) {
    itemPath.delete = {
      tags: [tag],
      summary: `Delete ${itemName}`,
      security: [{ bearerAuth: [] }],
      parameters: [idParameter()],
      responses: {
        200: messageResponse(`${itemName} deleted`),
        401: messageResponse("Unauthorized"),
        404: messageResponse("Not found"),
      },
    };
  }

  if (Object.keys(collectionPath).length > 0) {
    paths[basePath] = collectionPath;
  }

  if (Object.keys(itemPath).length > 0) {
    paths[`${basePath}/{id}`] = itemPath;
  }

  return paths;
};

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "School Management API",
      version: "1.0.0",
      description: "API documentation for the School Management System.",
    },
    servers: [
      {
        url: baseUrl,
        description: "Local API server",
      },
    ],
    tags: [
      { name: "Auth" },
      { name: "Users" },
      { name: "Roles" },
      { name: "Permissions" },
      { name: "Schools" },
      { name: "Students" },
      { name: "Teachers" },
      { name: "Parents" },
      { name: "Classes" },
      { name: "Sections" },
      { name: "Subjects" },
      { name: "Attendance" },
      { name: "Exams" },
      { name: "Marks" },
      { name: "Mock Tests" },
      { name: "Assignments" },
      { name: "Timetable" },
      { name: "Fees" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        MessageResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
            },
          },
          additionalProperties: true,
        },
        AuthUser: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            name: { type: "string", example: "Admin User" },
            email: { type: "string", example: "admin@example.com" },
            role: { type: "string", example: "admin" },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            message: { type: "string" },
            token: { type: "string" },
            accessToken: { type: "string" },
            refreshToken: { type: "string" },
            user: { $ref: "#/components/schemas/AuthUser" },
          },
        },
        LoginResponse: {
          type: "object",
          properties: {
            message: { type: "string" },
            accessToken: { type: "string" },
            refreshToken: { type: "string" },
            user: { $ref: "#/components/schemas/AuthUser" },
          },
        },
        RegisterRequest: {
          type: "object",
          required: ["name", "email", "password", "role"],
          properties: {
            name: { type: "string", example: "Admin User" },
            email: { type: "string", example: "admin@example.com" },
            password: { type: "string", example: "password123" },
            role: { type: "string", example: "admin" },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", example: "admin@example.com" },
            password: { type: "string", example: "password123" },
          },
        },
        RefreshTokenRequest: {
          type: "object",
          required: ["refreshToken"],
          properties: {
            refreshToken: { type: "string" },
          },
        },
      },
    },
    paths: {
      "/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Register a user",
          requestBody: jsonContent({
            $ref: "#/components/schemas/RegisterRequest",
          }),
          responses: {
            201: {
              description: "User registered",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/LoginResponse" },
                },
              },
            },
            400: messageResponse("Validation error"),
          },
        },
      },
      "/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Log in",
          requestBody: jsonContent({
            $ref: "#/components/schemas/LoginRequest",
          }),
          responses: {
            200: {
              description: "Login successful",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AuthResponse" },
                },
              },
            },
            400: messageResponse("Invalid credentials"),
            404: messageResponse("User not found"),
          },
        },
      },
      "/auth/refresh-token": {
        post: {
          tags: ["Auth"],
          summary: "Refresh access token",
          requestBody: jsonContent({
            $ref: "#/components/schemas/RefreshTokenRequest",
          }),
          responses: {
            200: messageResponse("Token refreshed"),
            401: messageResponse("Invalid refresh token"),
          },
        },
      },
      "/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Log out",
          requestBody: jsonContent({
            $ref: "#/components/schemas/RefreshTokenRequest",
          }),
          responses: {
            200: messageResponse("Logout successful"),
            400: messageResponse("Validation error"),
          },
        },
      },
      "/auth/change-password": {
        put: {
          tags: ["Auth"],
          summary: "Change password",
          security: [{ bearerAuth: [] }],
          requestBody: jsonContent({
            type: "object",
            required: ["currentPassword", "newPassword"],
            properties: {
              currentPassword: { type: "string" },
              newPassword: { type: "string", minLength: 6 },
            },
          }),
          responses: {
            200: messageResponse("Password changed"),
            400: messageResponse("Validation error"),
            401: messageResponse("Unauthorized"),
          },
        },
      },
      "/auth/forgot-password": {
        post: {
          tags: ["Auth"],
          summary: "Create password reset token",
          requestBody: jsonContent({
            type: "object",
            required: ["email"],
            properties: {
              email: { type: "string", example: "admin@example.com" },
            },
          }),
          responses: {
            200: {
              description: "Password reset token created",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: {
                        type: "string",
                        example: "Password reset token created",
                      },
                      resetToken: {
                        type: "string",
                        example:
                          "4f6d4d95b970f4c7ab4f4ef7088878e9911da1839683fec7cb6b7727e9e9833a",
                      },
                      expiresIn: {
                        type: "string",
                        example: "15 minutes",
                      },
                    },
                    required: ["message", "resetToken", "expiresIn"],
                  },
                },
              },
            },
            400: messageResponse("Validation error"),
          },
        },
      },
      "/auth/reset-password": {
        post: {
          tags: ["Auth"],
          summary: "Reset password",
          requestBody: jsonContent({
            type: "object",
            required: ["resetToken", "newPassword"],
            properties: {
              resetToken: { type: "string" },
              newPassword: { type: "string", minLength: 6 },
            },
          }),
          responses: {
            200: messageResponse("Password reset"),
            400: messageResponse("Validation error"),
          },
        },
      },
      ...protectedCrudPaths("Users", "user", "users", "/users", [
        "list",
        "create",
        "get",
        "update",
        "delete",
      ]),
      ...protectedCrudPaths("Roles", "role", "roles", "/roles", [
        "list",
        "create",
        "update",
        "delete",
      ]),
      ...protectedCrudPaths(
        "Permissions",
        "permission",
        "permissions",
        "/permissions",
        ["list", "create"],
      ),
      "/permissions/assign": {
        post: {
          tags: ["Permissions"],
          summary: "Assign permissions to a role",
          security: [{ bearerAuth: [] }],
          requestBody: objectBody("Assign permissions"),
          responses: {
            200: messageResponse("Permissions assigned"),
            401: messageResponse("Unauthorized"),
          },
        },
      },
      ...protectedCrudPaths("Schools", "school", "schools", "/schools", [
        "list",
        "create",
        "get",
        "update",
      ]),
      ...protectedCrudPaths("Students", "student", "students", "/students", [
        "list",
        "create",
        "get",
        "update",
        "delete",
      ]),
      "/students/{id}/attendance": {
        get: {
          tags: ["Students"],
          summary: "Get student attendance",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter(), ...paginationParameters()],
          responses: { 200: messageResponse("Student attendance") },
        },
      },
      "/students/{id}/results": {
        get: {
          tags: ["Students"],
          summary: "Get student results",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter(), ...paginationParameters()],
          responses: { 200: messageResponse("Student results") },
        },
      },
      "/students/{id}/fees": {
        get: {
          tags: ["Students"],
          summary: "Get student fees",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter(), ...paginationParameters()],
          responses: { 200: messageResponse("Student fees") },
        },
      },
      "/students/{id}/documents": {
        get: {
          tags: ["Students"],
          summary: "Get student documents",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter(), ...paginationParameters()],
          responses: { 200: messageResponse("Student documents") },
        },
      },
      ...protectedCrudPaths("Teachers", "teacher", "teachers", "/teachers", [
        "list",
        "create",
        "update",
        "delete",
      ]),
      "/teachers/{id}/classes": {
        get: {
          tags: ["Teachers"],
          summary: "Get teacher classes",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter(), ...paginationParameters()],
          responses: { 200: messageResponse("Teacher classes") },
        },
      },
      "/teachers/{id}/schedule": {
        get: {
          tags: ["Teachers"],
          summary: "Get teacher schedule",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter(), ...paginationParameters()],
          responses: { 200: messageResponse("Teacher schedule") },
        },
      },
      ...protectedCrudPaths("Parents", "parent", "parents", "/parents", [
        "list",
        "create",
        "update",
      ]),
      "/parents/{id}/students": {
        get: {
          tags: ["Parents"],
          summary: "Get parent students",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter(), ...paginationParameters()],
          responses: { 200: messageResponse("Parent students") },
        },
      },
      ...protectedCrudPaths("Classes", "class", "classes", "/classes", [
        "list",
        "create",
        "get",
        "update",
        "delete",
      ]),
      "/classes/{classId}/sections": {
        post: {
          tags: ["Sections"],
          summary: "Create section for a class",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter("classId", "Class id")],
          requestBody: objectBody("Create section"),
          responses: {
            201: messageResponse("Section created"),
            400: messageResponse("Validation error"),
            401: messageResponse("Unauthorized"),
          },
        },
      },
      ...protectedCrudPaths("Sections", "section", "sections", "/sections", [
        "list",
        "create",
        "get",
        "update",
        "delete",
      ]),
      "/subjects": {
        get: {
          tags: ["Subjects"],
          summary: "List subjects",
          security: [{ bearerAuth: [] }],
          parameters: paginationParameters(),
          responses: {
            200: messageResponse("Subjects list"),
            401: messageResponse("Unauthorized"),
          },
        },
        post: {
          tags: ["Subjects"],
          summary: "Create subject",
          description:
            "Create one subject for a class, or send an array to add multiple subjects class-wise in one request.",
          security: [{ bearerAuth: [] }],
          requestBody: jsonContent({
            oneOf: [
              {
                type: "object",
                required: ["name", "classId"],
                properties: {
                  name: {
                    type: "string",
                    example: "Mathematics",
                  },
                  classId: {
                    type: "integer",
                    example: 1,
                  },
                },
              },
              {
                type: "array",
                description:
                  "Bulk create subjects for the same or different classes.",
                items: {
                  type: "object",
                  required: ["name", "classId"],
                  properties: {
                    name: {
                      type: "string",
                      example: "Science",
                    },
                    classId: {
                      type: "integer",
                      example: 1,
                    },
                  },
                },
                example: [
                  {
                    name: "Mathematics",
                    classId: 1,
                  },
                  {
                    name: "Science",
                    classId: 1,
                  },
                  {
                    name: "English",
                    classId: 2,
                  },
                ],
              },
            ],
          }),
          responses: {
            201: messageResponse("Subject created"),
            400: messageResponse("Validation error"),
            401: messageResponse("Unauthorized"),
          },
        },
      },
      "/subjects/class/{classId}": {
        get: {
          tags: ["Subjects"],
          summary: "Get subjects by class",
          security: [{ bearerAuth: [] }],
          parameters: [
            idParameter("classId", "Class id"),
            ...paginationParameters(),
          ],
          responses: {
            200: messageResponse("Class subjects"),
            401: messageResponse("Unauthorized"),
          },
        },
      },
      "/subjects/{id}": {
        put: {
          tags: ["Subjects"],
          summary: "Update subject",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter()],
          requestBody: jsonContent({
            type: "object",
            properties: {
              name: {
                type: "string",
                example: "Advanced Mathematics",
              },
              classId: {
                type: "integer",
                example: 1,
              },
            },
          }),
          responses: {
            200: messageResponse("Subject updated"),
            400: messageResponse("Validation error"),
            401: messageResponse("Unauthorized"),
            404: messageResponse("Not found"),
          },
        },
        delete: {
          tags: ["Subjects"],
          summary: "Delete subject",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter()],
          responses: {
            200: messageResponse("Subject deleted"),
            401: messageResponse("Unauthorized"),
            404: messageResponse("Not found"),
          },
        },
      },
      "/attendance/mark": {
        post: {
          tags: ["Attendance"],
          summary: "Mark attendance",
          security: [{ bearerAuth: [] }],
          requestBody: objectBody("Mark attendance"),
          responses: { 201: messageResponse("Attendance marked") },
        },
      },
      "/attendance/class/{classId}": {
        get: {
          tags: ["Attendance"],
          summary: "Get attendance by class",
          security: [{ bearerAuth: [] }],
          parameters: [
            idParameter("classId", "Class id"),
            ...paginationParameters(),
          ],
          responses: { 200: messageResponse("Class attendance") },
        },
      },
      "/attendance/student/{studentId}": {
        get: {
          tags: ["Attendance"],
          summary: "Get attendance by student",
          security: [{ bearerAuth: [] }],
          parameters: [
            idParameter("studentId", "Student id"),
            ...paginationParameters(),
          ],
          responses: { 200: messageResponse("Student attendance") },
        },
      },
      "/attendance/rules": {
        get: {
          tags: ["Attendance"],
          summary: "Get attendance rules",
          security: [{ bearerAuth: [] }],
          responses: { 200: messageResponse("Attendance rules") },
        },
        put: {
          tags: ["Attendance"],
          summary: "Update attendance rules",
          security: [{ bearerAuth: [] }],
          requestBody: objectBody("Attendance rules payload"),
          responses: { 200: messageResponse("Attendance rules updated") },
        },
      },
      "/attendance/check-in": {
        post: {
          tags: ["Attendance"],
          summary: "Check in staff attendance",
          security: [{ bearerAuth: [] }],
          requestBody: objectBody("Staff check-in payload"),
          responses: { 201: messageResponse("Checked in successfully") },
        },
      },
      "/attendance/check-out": {
        post: {
          tags: ["Attendance"],
          summary: "Check out staff attendance",
          security: [{ bearerAuth: [] }],
          requestBody: objectBody("Staff check-out payload"),
          responses: { 200: messageResponse("Checked out successfully") },
        },
      },
      "/attendance/me": {
        get: {
          tags: ["Attendance"],
          summary: "Get my staff attendance history",
          security: [{ bearerAuth: [] }],
          parameters: paginationParameters(),
          responses: { 200: messageResponse("My attendance history") },
        },
      },
      ...protectedCrudPaths(
        "Attendance",
        "attendance",
        "attendance",
        "/attendance",
        ["update"],
      ),
      ...protectedCrudPaths("Exams", "exam", "exams", "/exams", [
        "list",
        "create",
        "get",
        "update",
      ]),
      ...protectedCrudPaths("Marks", "mark", "marks", "/marks", [
        "create",
        "update",
      ]),
      "/marks/student/{id}": {
        get: {
          tags: ["Marks"],
          summary: "Get marks by student",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter(), ...paginationParameters()],
          responses: { 200: messageResponse("Student marks") },
        },
      },
      "/mock-tests": {
        get: {
          tags: ["Mock Tests"],
          summary: "List mock tests",
          security: [{ bearerAuth: [] }],
          parameters: [
            ...paginationParameters(),
            queryParameter("studentId", "Filter by student id", {
              type: "integer",
              example: 1,
            }),
            queryParameter("classId", "Filter by class id", {
              type: "integer",
              example: 1,
            }),
            queryParameter("subjectId", "Filter by subject id", {
              type: "integer",
              example: 1,
            }),
            queryParameter("status", "Filter by mock test status", {
              type: "string",
              example: "completed",
            }),
            queryParameter("onlyAssigned", "Only include assigned mock tests", {
              type: "boolean",
              example: true,
            }),
          ],
          responses: { 200: messageResponse("Mock tests list") },
        },
      },
      "/mock-tests/progress": {
        get: {
          tags: ["Mock Tests"],
          summary: "Get mock test progress summary",
          security: [{ bearerAuth: [] }],
          parameters: [
            queryParameter("studentId", "Filter by student id", {
              type: "integer",
              example: 1,
            }),
          ],
          responses: { 200: messageResponse("Mock test progress") },
        },
      },
      "/mock-tests/generate": {
        post: {
          tags: ["Mock Tests"],
          summary: "Generate mock test",
          security: [{ bearerAuth: [] }],
          requestBody: objectBody("Generate mock test"),
          responses: { 200: messageResponse("Mock test generated") },
        },
      },
      "/mock-tests/submit": {
        post: {
          tags: ["Mock Tests"],
          summary: "Submit mock test",
          security: [{ bearerAuth: [] }],
          requestBody: objectBody("Submit mock test"),
          responses: { 200: messageResponse("Mock test submitted") },
        },
      },
      "/mock-tests/{id}/assign": {
        post: {
          tags: ["Mock Tests"],
          summary: "Assign mock test to student",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter()],
          requestBody: objectBody("Assign mock test"),
          responses: { 200: messageResponse("Mock test assigned") },
        },
      },
      "/mock-tests/{id}": {
        get: {
          tags: ["Mock Tests"],
          summary: "Get mock test by id",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter()],
          responses: { 200: messageResponse("Mock test details") },
        },
      },
      "/mock-tests/result/{id}": {
        get: {
          tags: ["Mock Tests"],
          summary: "Get mock test result",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter()],
          responses: { 200: messageResponse("Mock test result") },
        },
      },
      "/mock-tests/ai-suggestion/{id}": {
        get: {
          tags: ["Mock Tests"],
          summary: "Get mock test AI suggestion",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter()],
          responses: { 200: messageResponse("Mock test AI suggestion") },
        },
      },
      "/mock-tests/{id}/pdf": {
        get: {
          tags: ["Mock Tests"],
          summary: "Download mock test PDF",
          security: [{ bearerAuth: [] }],
          parameters: [
            idParameter(),
            queryParameter(
              "includeAnswers",
              "Include answers in PDF. Aliases also accepted: withAnswers, answers.",
              {
                type: "boolean",
                example: true,
              },
            ),
          ],
          responses: { 200: messageResponse("Mock test PDF") },
        },
      },
      ...protectedCrudPaths(
        "Assignments",
        "assignment",
        "assignments",
        "/assignments",
        ["list", "create"],
      ),
      "/assignments/submit": {
        post: {
          tags: ["Assignments"],
          summary: "Submit assignment",
          security: [{ bearerAuth: [] }],
          requestBody: objectBody("Submit assignment"),
          responses: { 201: messageResponse("Assignment submitted") },
        },
      },
      "/assignments/student/{id}": {
        get: {
          tags: ["Assignments"],
          summary: "Get assignments by student",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter(), ...paginationParameters()],
          responses: { 200: messageResponse("Student assignments") },
        },
      },
      ...protectedCrudPaths(
        "Timetable",
        "timetable entry",
        "timetable",
        "/timetable",
        ["create", "update"],
      ),
      "/timetable/class/{id}": {
        get: {
          tags: ["Timetable"],
          summary: "Get timetable by class",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter(), ...paginationParameters()],
          responses: { 200: messageResponse("Class timetable") },
        },
      },
      ...protectedCrudPaths("Fees", "fee", "fees", "/fees", ["create"]),
      "/fees/student/{id}": {
        get: {
          tags: ["Fees"],
          summary: "Get fees by student",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter(), ...paginationParameters()],
          responses: { 200: messageResponse("Student fees") },
        },
      },
      "/fees/payment": {
        post: {
          tags: ["Fees"],
          summary: "Create fee payment",
          security: [{ bearerAuth: [] }],
          requestBody: objectBody("Create fee payment"),
          responses: { 201: messageResponse("Fee payment created") },
        },
      },
      "/fees/transactions": {
        get: {
          tags: ["Fees"],
          summary: "Get fee transactions",
          security: [{ bearerAuth: [] }],
          parameters: paginationParameters(),
          responses: { 200: messageResponse("Fee transactions") },
        },
      },
      "/fees/defaulters": {
        get: {
          tags: ["Fees"],
          summary: "Get fee defaulters",
          security: [{ bearerAuth: [] }],
          parameters: paginationParameters(),
          responses: { 200: messageResponse("Fee defaulters") },
        },
      },
    },
  },
  apis: ["./src/routes/*.ts", "./src/controllers/*.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
