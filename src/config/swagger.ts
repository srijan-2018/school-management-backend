import swaggerJsdoc from "swagger-jsdoc";

const PORT = process.env.PORT || 8000;
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

const jsonResponse = (description: string, schemaRef: string) => ({
  description,
  content: {
    "application/json": {
      schema: {
        $ref: schemaRef,
      },
    },
  },
});

const subjectIdParameter = () => ({
  name: "subjectId",
  in: "path",
  required: true,
  description: "Subject id",
  schema: {
    type: "integer",
    minimum: 1,
  },
});

const requiredQueryParameter = (
  name: string,
  description: string,
  schema: Record<string, unknown>,
) => ({
  name,
  in: "query",
  required: true,
  description,
  schema,
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
  extraListParameters: unknown[] = [],
) => {
  const paths: Record<string, unknown> = {};

  const collectionPath: Record<string, unknown> = {};
  const itemPath: Record<string, unknown> = {};

  if (methods.includes("list")) {
    collectionPath.get = {
      tags: [tag],
      summary: `List ${collectionName}`,
      security: [{ bearerAuth: [] }],
      parameters: [...paginationParameters(), ...extraListParameters],
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
      { name: "Inventory" },
      { name: "E-Learning" },
      { name: "Notifications" },
      { name: "Chat" },
      { name: "Transport" },
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
            schoolId: { type: "integer", nullable: true, example: 1 },
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
        ChatUnreadCountResponse: {
          type: "object",
          properties: {
            unreadCount: {
              type: "integer",
              minimum: 0,
              example: 0,
              description:
                "Total unread inbound chat messages for the current user",
            },
          },
        },
        ChatMarkReadResult: {
          type: "object",
          properties: {
            updated: {
              type: "integer",
              minimum: 0,
              example: 0,
              description:
                "Messages marked read in this request (0 if already read)",
            },
            conversationUnreadCount: {
              type: "integer",
              minimum: 0,
              example: 0,
              description:
                "Unread messages from the other participant in this subject thread",
            },
            unreadCount: {
              type: "integer",
              minimum: 0,
              example: 0,
              description: "Total unread inbound messages for the current user",
            },
          },
        },
        ChatMarkReadResponse: {
          type: "object",
          properties: {
            message: { type: "string", example: "Messages marked as read" },
            updated: { type: "integer", minimum: 0, example: 2 },
            conversationUnreadCount: { type: "integer", minimum: 0, example: 0 },
            unreadCount: { type: "integer", minimum: 0, example: 0 },
          },
        },
        ChatMarkAllReadResponse: {
          type: "object",
          properties: {
            message: { type: "string", example: "All messages marked as read" },
            updated: { type: "integer", minimum: 0, example: 5 },
            unreadCount: { type: "integer", minimum: 0, example: 0 },
          },
        },
        ChatSubjectItem: {
          type: "object",
          properties: {
            subjectId: { type: "integer", example: 12 },
            subjectName: { type: "string", example: "LIFE SCIENCE" },
            lastMessageAt: {
              type: "string",
              format: "date-time",
            },
            unreadCount: { type: "integer", minimum: 0, example: 0 },
          },
        },
        ChatSubjectsResponse: {
          type: "object",
          properties: {
            subjects: {
              type: "array",
              items: { $ref: "#/components/schemas/ChatSubjectItem" },
            },
          },
        },
        ChatStudentItem: {
          type: "object",
          properties: {
            studentUserId: { type: "integer", example: 45 },
            studentName: { type: "string", example: "Testing" },
            avatarId: { type: "string", nullable: true, example: null },
            lastMessageAt: {
              type: "string",
              format: "date-time",
            },
            unreadCount: { type: "integer", minimum: 0, example: 0 },
          },
        },
        ChatStudentsResponse: {
          type: "object",
          properties: {
            students: {
              type: "array",
              items: { $ref: "#/components/schemas/ChatStudentItem" },
            },
          },
        },
        ChatUserPreview: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            avatarId: { type: "string", nullable: true },
          },
        },
        ChatMessage: {
          type: "object",
          properties: {
            id: { type: "integer", example: 101 },
            schoolId: { type: "integer", example: 1 },
            subjectId: { type: "integer", example: 12 },
            senderUserId: { type: "integer", example: 45 },
            receiverUserId: { type: "integer", example: 8 },
            message: { type: "string", example: "Hi sir..." },
            isRead: { type: "boolean", example: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            sender: { $ref: "#/components/schemas/ChatUserPreview" },
            receiver: { $ref: "#/components/schemas/ChatUserPreview" },
          },
        },
        ChatPagination: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 50 },
            total: { type: "integer", example: 15 },
            totalPages: { type: "integer", example: 1 },
            hasNextPage: { type: "boolean", example: false },
            hasPreviousPage: { type: "boolean", example: false },
          },
        },
        ChatMessagesResponse: {
          type: "object",
          properties: {
            messages: {
              type: "array",
              items: { $ref: "#/components/schemas/ChatMessage" },
            },
            pagination: { $ref: "#/components/schemas/ChatPagination" },
            updated: {
              type: "integer",
              minimum: 0,
              description:
                "Returned inbound messages marked read when loading this page",
            },
            conversationUnreadCount: {
              type: "integer",
              minimum: 0,
              description:
                "Unread in this thread after this read (for students, all inbound replies in the subject)",
            },
            unreadCount: {
              type: "integer",
              minimum: 0,
              description: "Total unread for the current user after this read",
            },
          },
        },
        ChatSendMessageRequest: {
          type: "object",
          required: ["receiverUserId", "message"],
          properties: {
            receiverUserId: { type: "integer", example: 45 },
            message: { type: "string", example: "Hello" },
          },
        },
        ChatSendMessageResponse: {
          type: "object",
          properties: {
            message: { type: "string", example: "Message sent" },
            chatMessage: { $ref: "#/components/schemas/ChatMessage" },
          },
        },
        ChatSubjectTeacher: {
          type: "object",
          properties: {
            teacherId: { type: "integer", nullable: true },
            userId: { type: "integer", nullable: true },
            name: { type: "string", example: "Teacher Name" },
            email: { type: "string", nullable: true },
            avatarId: { type: "string", nullable: true },
          },
        },
        ChatSubjectTeacherResponse: {
          type: "object",
          properties: {
            teacher: {
              oneOf: [
                { $ref: "#/components/schemas/ChatSubjectTeacher" },
                { type: "null" },
              ],
            },
            message: {
              type: "string",
              description: "Present when no teacher is assigned",
              example: "No teacher assigned to this subject",
            },
          },
        },
      },
    },
    paths: {
      "/transport/vehicles": {
        get: {
          tags: ["Transport"],
          summary: "List transport vehicles",
          security: [{ bearerAuth: [] }],
          parameters: paginationParameters(),
          responses: {
            200: messageResponse("Vehicles list"),
            401: messageResponse("Unauthorized"),
            400: messageResponse("School context required"),
          },
        },
        post: {
          tags: ["Transport"],
          summary: "Create a vehicle and map a driver",
          security: [{ bearerAuth: [] }],
          requestBody: jsonContent({
            type: "object",
            required: ["plateNumber", "driverUserId"],
            properties: {
              plateNumber: { type: "string", example: "WB-111777" },
              capacity: { type: "integer", example: 40 },
              driverUserId: { type: "integer", example: 12 },
              status: { type: "string", enum: ["active", "inactive", "maintenance"] },
            },
          }),
          responses: {
            201: messageResponse("Vehicle created"),
            400: messageResponse("Validation error"),
            401: messageResponse("Unauthorized"),
            403: messageResponse("Forbidden"),
          },
        },
      },
      "/transport/vehicles/{id}": {
        put: {
          tags: ["Transport"],
          summary: "Update a vehicle or driver mapping",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter()],
          requestBody: jsonContent({ type: "object" }),
          responses: {
            200: messageResponse("Vehicle updated"),
            404: messageResponse("Vehicle not found"),
            401: messageResponse("Unauthorized"),
          },
        },
        delete: {
          tags: ["Transport"],
          summary: "Delete or deactivate a vehicle",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter()],
          responses: {
            200: messageResponse("Vehicle deleted or deactivated"),
            409: messageResponse("Vehicle has an active trip"),
            404: messageResponse("Vehicle not found"),
          },
        },
      },
      "/transport/routes": {
        get: {
          tags: ["Transport"],
          summary: "List routes with linked buses",
          security: [{ bearerAuth: [] }],
          parameters: paginationParameters(),
          responses: { 200: messageResponse("Routes list") },
        },
        post: {
          tags: ["Transport"],
          summary: "Create a route linked to a bus",
          security: [{ bearerAuth: [] }],
          requestBody: jsonContent({
            type: "object",
            required: ["name", "vehicleId"],
            properties: {
              name: { type: "string", example: "South Kolkata" },
              vehicleId: { type: "integer", example: 3 },
              stops: { type: "array", items: { type: "string" } },
              fare: { type: "number" },
              status: { type: "string", enum: ["active", "inactive"] },
            },
          }),
          responses: { 201: messageResponse("Route created") },
        },
      },
      "/transport/routes/{id}": {
        put: {
          tags: ["Transport"],
          summary: "Update a route or linked bus",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter()],
          requestBody: jsonContent({ type: "object" }),
          responses: { 200: messageResponse("Route updated") },
        },
        delete: {
          tags: ["Transport"],
          summary: "Delete a route without student assignments",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter()],
          responses: {
            200: messageResponse("Route deleted"),
            409: messageResponse("Route still has student assignments"),
          },
        },
      },
      "/transport/assignments": {
        get: {
          tags: ["Transport"],
          summary: "List student route assignments",
          security: [{ bearerAuth: [] }],
          parameters: paginationParameters(),
          responses: { 200: messageResponse("Assignments list") },
        },
        post: {
          tags: ["Transport"],
          summary: "Map a student to a route",
          security: [{ bearerAuth: [] }],
          requestBody: jsonContent({
            type: "object",
            required: ["studentId", "routeId"],
            properties: {
              studentId: { type: "integer", example: 42 },
              routeId: { type: "integer", example: 3 },
              stopName: { type: "string", example: "School gate" },
              pickupTime: { type: "string", example: "07:15" },
              sortOrder: { type: "integer", example: 0 },
            },
          }),
          responses: { 201: messageResponse("Assignment created") },
        },
      },
      "/transport/assignments/{id}": {
        put: {
          tags: ["Transport"],
          summary: "Edit a student route assignment",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter()],
          requestBody: jsonContent({ type: "object" }),
          responses: { 200: messageResponse("Assignment updated") },
        },
        delete: {
          tags: ["Transport"],
          summary: "Delete a student route assignment",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter()],
          responses: { 200: messageResponse("Assignment deleted") },
        },
      },
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
      ], [
        queryParameter("schoolId", "Filter users by school id", {
          type: "integer",
          example: 1,
          minimum: 1,
        }),
        queryParameter("role", "Filter users by role", {
          type: "string",
          example: "student",
        }),
        queryParameter("search", "Search users by name, email, role, or school", {
          type: "string",
          example: "rachhel",
        }),
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
      ...protectedCrudPaths(
        "Students",
        "student",
        "students",
        "/students",
        ["list", "create", "get", "update", "delete"],
        [
          {
            name: "classId",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1 },
            description: "Filter students by class id",
          },
        ],
      ),
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
      ], [
        queryParameter("userId", "Filter parents by user id", {
          type: "integer",
          example: 15,
          minimum: 1,
        }),
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
      "/exams/schedules": {
        get: {
          tags: ["Exams"],
          summary: "List exam schedules",
          security: [{ bearerAuth: [] }],
          parameters: [
            ...paginationParameters(),
            queryParameter("classId", "Filter schedules by class id", {
              type: "integer",
              example: 1,
            }),
            queryParameter("status", "Filter by schedule status", {
              type: "string",
              enum: ["draft", "active", "completed"],
              example: "active",
            }),
            queryParameter("search", "Search exam schedules", {
              type: "string",
              example: "first term",
            }),
          ],
          responses: { 200: messageResponse("Exam schedules list") },
        },
        post: {
          tags: ["Exams"],
          summary: "Create exam schedule",
          security: [{ bearerAuth: [] }],
          requestBody: objectBody("Create exam schedule"),
          responses: { 201: messageResponse("Exam schedule created") },
        },
      },
      "/exams/schedules/{id}": {
        get: {
          tags: ["Exams"],
          summary: "Get exam schedule by id",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter()],
          responses: { 200: messageResponse("Exam schedule details") },
        },
        put: {
          tags: ["Exams"],
          summary: "Update exam schedule",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter()],
          requestBody: objectBody("Update exam schedule"),
          responses: { 200: messageResponse("Exam schedule updated") },
        },
        delete: {
          tags: ["Exams"],
          summary: "Delete exam schedule",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter()],
          responses: { 200: messageResponse("Exam schedule deleted") },
        },
      },
      "/exams": {
        get: {
          tags: ["Exams"],
          summary: "List exams",
          security: [{ bearerAuth: [] }],
          parameters: [
            ...paginationParameters(),
            queryParameter("classId", "Filter exams by class id", {
              type: "integer",
              example: 1,
            }),
            queryParameter("scheduleId", "Filter exams by schedule id", {
              type: "integer",
              example: 1,
            }),
            queryParameter("subjectId", "Filter exams by subject id", {
              type: "integer",
              example: 1,
            }),
            queryParameter("status", "Filter by exam status", {
              type: "string",
              enum: ["draft", "scheduled", "completed", "cancelled"],
              example: "scheduled",
            }),
            queryParameter("search", "Search exams", {
              type: "string",
              example: "mathematics",
            }),
          ],
          responses: { 200: messageResponse("Exams list") },
        },
        post: {
          tags: ["Exams"],
          summary: "Create exam",
          security: [{ bearerAuth: [] }],
          requestBody: objectBody("Create exam"),
          responses: { 201: messageResponse("Exam created") },
        },
      },
      "/exams/{id}": {
        get: {
          tags: ["Exams"],
          summary: "Get exam by id",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter()],
          responses: { 200: messageResponse("Exam details") },
        },
        put: {
          tags: ["Exams"],
          summary: "Update exam",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter()],
          requestBody: objectBody("Update exam"),
          responses: { 200: messageResponse("Exam updated") },
        },
        delete: {
          tags: ["Exams"],
          summary: "Delete exam",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter()],
          responses: { 200: messageResponse("Exam deleted") },
        },
      },
      "/exams/{id}/marks": {
        get: {
          tags: ["Exams"],
          summary: "List marks for an exam",
          security: [{ bearerAuth: [] }],
          parameters: [
            idParameter(),
            ...paginationParameters(),
            queryParameter("search", "Search marks by student name, email, or roll number", {
              type: "string",
              example: "rahul",
            }),
          ],
          responses: { 200: messageResponse("Exam marks list") },
        },
        post: {
          tags: ["Exams"],
          summary: "Create or update exam marks in bulk",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter()],
          requestBody: jsonContent({
            type: "object",
            required: ["marks"],
            properties: {
              marks: {
                type: "array",
                items: {
                  type: "object",
                  required: ["studentId", "marks"],
                  properties: {
                    studentId: { type: "integer", example: 1 },
                    marks: { type: "number", example: 85 },
                    grade: { type: "string", example: "A" },
                    remarks: { type: "string", example: "Excellent work" },
                  },
                },
              },
            },
          }),
          responses: { 201: messageResponse("Exam marks saved") },
        },
      },
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
        post: {
          tags: ["Mock Tests"],
          summary: "Create mock test manually",
          security: [{ bearerAuth: [] }],
          requestBody: objectBody("Create mock test with questions"),
          responses: { 201: messageResponse("Mock test created") },
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
      "/mock-tests/settings": {
        get: {
          tags: ["Mock Tests"],
          summary: "Get mock test negative marking settings for the school",
          security: [{ bearerAuth: [] }],
          responses: { 200: messageResponse("Negative marking settings") },
        },
        put: {
          tags: ["Mock Tests"],
          summary:
            "Enable or disable negative marking for mock tests (School Owner or Super Admin)",
          security: [{ bearerAuth: [] }],
          requestBody: objectBody(
            "Negative marking payload: { enabled, penalty }",
          ),
          responses: { 200: messageResponse("Negative marking updated") },
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
          parameters: [
            ...paginationParameters(),
            queryParameter("search", "Search fee, student, class, or section", {
              type: "string",
              example: "rachhel",
            }),
          ],
          responses: { 200: messageResponse("Fee defaulters") },
        },
      },
      "/fees/{id}/offline-payment": {
        post: {
          tags: ["Fees"],
          summary: "Mark offline fee payment as paid",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter()],
          requestBody: jsonContent({
            type: "object",
            properties: {
              amount: { type: "number", example: 8000 },
              method: { type: "string", example: "offline" },
              transactionId: { type: "string", example: "CASH-001" },
            },
          }),
          responses: {
            201: messageResponse("Offline payment marked as paid"),
            401: messageResponse("Unauthorized"),
            403: messageResponse("Forbidden"),
            404: messageResponse("Fee not found"),
          },
        },
      },
      "/fees/reminders/whatsapp": {
        post: {
          tags: ["Fees"],
          summary: "Send WhatsApp fee reminders",
          security: [{ bearerAuth: [] }],
          requestBody: jsonContent({
            type: "object",
            properties: {
              studentId: { type: "integer", example: 1 },
              feeId: { type: "integer", example: 1 },
              message: {
                type: "string",
                example: "Please pay your pending school fee.",
              },
            },
          }),
          responses: {
            200: messageResponse("Fee reminders processed"),
            401: messageResponse("Unauthorized"),
            403: messageResponse("Forbidden"),
          },
        },
      },
      "/inventory": {
        get: {
          tags: ["Inventory"],
          summary: "List inventory items",
          security: [{ bearerAuth: [] }],
          parameters: [
            ...paginationParameters(),
            queryParameter("schoolId", "Filter inventory by school id", {
              type: "integer",
              example: 3,
              minimum: 1,
            }),
            queryParameter("category", "Filter inventory by category", {
              type: "string",
              example: "stationery",
            }),
            queryParameter("search", "Search inventory items", {
              type: "string",
              example: "notebook",
            }),
            queryParameter("stockStatus", "Filter by stock status", {
              type: "string",
              enum: ["available", "low_stock", "out_of_stock"],
              example: "low_stock",
            }),
          ],
          responses: { 200: messageResponse("Inventory items list") },
        },
        post: {
          tags: ["Inventory"],
          summary: "Create inventory item",
          security: [{ bearerAuth: [] }],
          requestBody: objectBody("Create inventory item"),
          responses: { 201: messageResponse("Inventory item created") },
        },
      },
      "/inventory/{id}": {
        get: {
          tags: ["Inventory"],
          summary: "Get inventory item by id",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter()],
          responses: { 200: messageResponse("Inventory item details") },
        },
        put: {
          tags: ["Inventory"],
          summary: "Update inventory item",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter()],
          requestBody: objectBody("Update inventory item"),
          responses: { 200: messageResponse("Inventory item updated") },
        },
        delete: {
          tags: ["Inventory"],
          summary: "Delete inventory item",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter()],
          responses: { 200: messageResponse("Inventory item deleted") },
        },
      },
      "/inventory/{id}/adjust": {
        post: {
          tags: ["Inventory"],
          summary: "Adjust inventory stock",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter()],
          requestBody: jsonContent({
            type: "object",
            required: ["type", "quantity"],
            properties: {
              type: { type: "string", enum: ["in", "out"], example: "in" },
              quantity: { type: "number", example: 10 },
            },
          }),
          responses: { 200: messageResponse("Inventory stock adjusted") },
        },
      },
      "/elearning/playlists": {
        get: {
          tags: ["E-Learning"],
          summary: "List e-learning playlists",
          security: [{ bearerAuth: [] }],
          parameters: [
            ...paginationParameters(),
            queryParameter("classId", "Filter playlists by class id", {
              type: "integer",
              example: 1,
            }),
            queryParameter("search", "Search playlists", {
              type: "string",
              example: "math",
            }),
          ],
          responses: { 200: messageResponse("Playlists list") },
        },
        post: {
          tags: ["E-Learning"],
          summary: "Create e-learning playlist",
          security: [{ bearerAuth: [] }],
          requestBody: objectBody("Create playlist"),
          responses: { 201: messageResponse("Playlist created") },
        },
      },
      "/elearning/playlists/{id}": {
        get: {
          tags: ["E-Learning"],
          summary: "Get playlist by id",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter()],
          responses: { 200: messageResponse("Playlist details") },
        },
        put: {
          tags: ["E-Learning"],
          summary: "Update playlist",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter()],
          requestBody: objectBody("Update playlist"),
          responses: { 200: messageResponse("Playlist updated") },
        },
        delete: {
          tags: ["E-Learning"],
          summary: "Delete playlist",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter()],
          responses: { 200: messageResponse("Playlist deleted") },
        },
      },
      "/elearning/contents": {
        get: {
          tags: ["E-Learning"],
          summary: "List e-learning contents",
          security: [{ bearerAuth: [] }],
          parameters: [
            ...paginationParameters(),
            queryParameter("classId", "Filter contents by class id", {
              type: "integer",
              example: 1,
            }),
            queryParameter("playlistId", "Filter contents by playlist id", {
              type: "integer",
              example: 1,
            }),
            queryParameter("type", "Filter by content type", {
              type: "string",
              enum: ["video", "pdf", "document", "file"],
              example: "video",
            }),
            queryParameter("search", "Search contents", {
              type: "string",
              example: "algebra",
            }),
          ],
          responses: { 200: messageResponse("Contents list") },
        },
        post: {
          tags: ["E-Learning"],
          summary: "Create e-learning content",
          security: [{ bearerAuth: [] }],
          requestBody: objectBody("Create content"),
          responses: { 201: messageResponse("Content created") },
        },
      },
      "/elearning/contents/{id}": {
        get: {
          tags: ["E-Learning"],
          summary: "Get content by id",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter()],
          responses: { 200: messageResponse("Content details") },
        },
        put: {
          tags: ["E-Learning"],
          summary: "Update content",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter()],
          requestBody: objectBody("Update content"),
          responses: { 200: messageResponse("Content updated") },
        },
        delete: {
          tags: ["E-Learning"],
          summary: "Delete content",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter()],
          responses: { 200: messageResponse("Content deleted") },
        },
      },
      "/notifications": {
        get: {
          tags: ["Notifications"],
          summary: "List my notifications",
          security: [{ bearerAuth: [] }],
          parameters: [
            ...paginationParameters(),
            queryParameter(
              "schoolId",
              "School context (required for platform admins without a school)",
              {
                type: "integer",
                example: 5,
                minimum: 1,
              },
            ),
          ],
          responses: {
            200: messageResponse("Notifications list"),
            400: messageResponse("Missing school context"),
            401: messageResponse("Unauthorized"),
          },
        },
      },
      "/notifications/unread-count": {
        get: {
          tags: ["Notifications"],
          summary: "Get unread notification count",
          security: [{ bearerAuth: [] }],
          parameters: [
            queryParameter(
              "schoolId",
              "School context (required for platform admins without a school)",
              {
                type: "integer",
                example: 5,
                minimum: 1,
              },
            ),
          ],
          responses: {
            200: {
              description: "Unread notification count",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      unreadCount: {
                        type: "integer",
                        minimum: 0,
                        example: 0,
                      },
                    },
                  },
                },
              },
            },
            400: messageResponse("Missing school context"),
            401: messageResponse("Unauthorized"),
          },
        },
      },
      "/notifications/notices": {
        post: {
          tags: ["Notifications"],
          summary: "Publish a notice notification",
          security: [{ bearerAuth: [] }],
          requestBody: jsonContent({
            type: "object",
            required: ["title"],
            properties: {
              title: { type: "string", example: "School closed tomorrow" },
              body: {
                type: "string",
                example: "The school will remain closed due to heavy rain.",
              },
              audienceRoles: {
                type: "array",
                items: { type: "string" },
                example: ["teacher", "student", "parent"],
              },
            },
          }),
          responses: {
            201: messageResponse("Notice published"),
            400: messageResponse("Validation error"),
            401: messageResponse("Unauthorized"),
            403: messageResponse("Forbidden"),
          },
        },
      },
      "/notifications/read-all": {
        patch: {
          tags: ["Notifications"],
          summary: "Mark all notifications as read",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "All notifications marked as read",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: {
                        type: "string",
                        example: "All notifications marked as read",
                      },
                      updated: {
                        type: "integer",
                        minimum: 0,
                        example: 3,
                      },
                    },
                  },
                },
              },
            },
            401: messageResponse("Unauthorized"),
          },
        },
      },
      "/notifications/{id}/read": {
        patch: {
          tags: ["Notifications"],
          summary: "Mark a notification as read",
          security: [{ bearerAuth: [] }],
          parameters: [idParameter("id", "Notification id")],
          responses: {
            200: messageResponse("Notification marked as read"),
            400: messageResponse("Invalid notification id"),
            401: messageResponse("Unauthorized"),
            404: messageResponse("Notification not found"),
          },
        },
      },
      "/chat/subjects": {
        get: {
          tags: ["Chat"],
          summary: "List subjects with active chats",
          description:
            "Returns subjects where the current user has sent or received messages, with per-subject unread counts.",
          security: [{ bearerAuth: [] }],
          responses: {
            200: jsonResponse(
              "Chat subjects",
              "#/components/schemas/ChatSubjectsResponse",
            ),
            401: messageResponse("Unauthorized"),
            400: messageResponse("School context required"),
          },
        },
      },
      "/chat/unread-count": {
        get: {
          tags: ["Chat"],
          summary: "Total unread chat count",
          description:
            "Inbound messages only (receiver is the current user, isRead is false).",
          security: [{ bearerAuth: [] }],
          responses: {
            200: jsonResponse(
              "Unread count",
              "#/components/schemas/ChatUnreadCountResponse",
            ),
            401: messageResponse("Unauthorized"),
            400: messageResponse("School context required"),
          },
        },
      },
      "/chat/read-all": {
        patch: {
          tags: ["Chat"],
          summary: "Mark all inbound chat messages as read",
          security: [{ bearerAuth: [] }],
          responses: {
            200: jsonResponse(
              "All messages marked as read",
              "#/components/schemas/ChatMarkAllReadResponse",
            ),
            401: messageResponse("Unauthorized"),
            400: messageResponse("School context required"),
          },
        },
      },
      "/chat/subject/{subjectId}/teacher": {
        get: {
          tags: ["Chat"],
          summary: "Get teacher assigned to a subject",
          description: "Used by students to resolve who to message.",
          security: [{ bearerAuth: [] }],
          parameters: [subjectIdParameter()],
          responses: {
            200: jsonResponse(
              "Subject teacher",
              "#/components/schemas/ChatSubjectTeacherResponse",
            ),
            400: messageResponse("Invalid subject id"),
            401: messageResponse("Unauthorized"),
          },
        },
      },
      "/chat/subject/{subjectId}/students": {
        get: {
          tags: ["Chat"],
          summary: "List students who chatted (teacher inbox)",
          description:
            "Per-student unread counts count inbound messages from that student only.",
          security: [{ bearerAuth: [] }],
          parameters: [subjectIdParameter()],
          responses: {
            200: jsonResponse(
              "Students with active chats",
              "#/components/schemas/ChatStudentsResponse",
            ),
            400: messageResponse("Invalid subject id"),
            401: messageResponse("Unauthorized"),
          },
        },
      },
      "/chat/subject/{subjectId}/messages": {
        get: {
          tags: ["Chat"],
          summary: "Get conversation messages",
          description:
            "Marks only inbound messages returned in this page as read, then returns updated unread counts.",
          security: [{ bearerAuth: [] }],
          parameters: [
            subjectIdParameter(),
            requiredQueryParameter(
              "with",
              "Other participant user id",
              { type: "integer", minimum: 1, example: 45 },
            ),
            ...paginationParameters(),
          ],
          responses: {
            200: jsonResponse(
              "Messages and read state",
              "#/components/schemas/ChatMessagesResponse",
            ),
            400: messageResponse("Invalid subject id or missing with user id"),
            401: messageResponse("Unauthorized"),
          },
        },
        post: {
          tags: ["Chat"],
          summary: "Send a chat message",
          security: [{ bearerAuth: [] }],
          parameters: [subjectIdParameter()],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ChatSendMessageRequest",
                },
              },
            },
          },
          responses: {
            201: jsonResponse(
              "Message sent",
              "#/components/schemas/ChatSendMessageResponse",
            ),
            400: messageResponse("Validation error"),
            401: messageResponse("Unauthorized"),
          },
        },
      },
      "/chat/subject/{subjectId}/read": {
        patch: {
          tags: ["Chat"],
          summary: "Mark conversation as read",
          description:
            "Marks inbound messages from `from` (sender user id) as read. Omit `from` to mark every inbound message in the subject as read. Response includes `updated` (0 if already read) and current unread counts.",
          security: [{ bearerAuth: [] }],
          parameters: [
            subjectIdParameter(),
            queryParameter(
              "from",
              "Sender user id (the other participant). Optional.",
              { type: "integer", minimum: 1, example: 45 },
            ),
          ],
          responses: {
            200: jsonResponse(
              "Messages marked as read",
              "#/components/schemas/ChatMarkReadResponse",
            ),
            400: messageResponse("Invalid subject id or missing from user id"),
            401: messageResponse("Unauthorized"),
          },
        },
      },
      "/chat/subject/{subjectId}/unread-count": {
        get: {
          tags: ["Chat"],
          summary: "Unread count for a subject",
          security: [{ bearerAuth: [] }],
          parameters: [subjectIdParameter()],
          responses: {
            200: jsonResponse(
              "Subject unread count",
              "#/components/schemas/ChatUnreadCountResponse",
            ),
            400: messageResponse("Invalid subject id"),
            401: messageResponse("Unauthorized"),
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.ts", "./src/controllers/*.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
