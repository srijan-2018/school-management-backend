import fs from "fs";
import path from "path";
import swaggerSpec from "../config/swagger";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type SchemaObject = {
  type?: string;
  format?: string;
  example?: JsonValue;
  default?: JsonValue;
  enum?: JsonValue[];
  items?: SchemaObject;
  properties?: Record<string, SchemaObject>;
  additionalProperties?: boolean | SchemaObject;
  required?: string[];
  oneOf?: SchemaObject[];
  allOf?: SchemaObject[];
  $ref?: string;
};

type RequestBodyObject = {
  content?: Record<string, { schema?: SchemaObject }>;
};

type ParameterObject = {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  example?: JsonValue;
  schema?: SchemaObject;
};

type OperationObject = {
  tags?: string[];
  summary?: string;
  description?: string;
  security?: Array<Record<string, unknown>>;
  requestBody?: RequestBodyObject;
  parameters?: ParameterObject[];
};

type OpenApiSpec = {
  info?: {
    title?: string;
    version?: string;
    description?: string;
  };
  servers?: Array<{ url?: string }>;
  paths?: Record<string, Partial<Record<string, OperationObject>>>;
  components?: {
    schemas?: Record<string, SchemaObject>;
  };
};

const spec = swaggerSpec as unknown as OpenApiSpec;
const schemas = spec.components?.schemas ?? {};
const defaultBaseUrl = spec.servers?.[0]?.url ?? "http://localhost:8000/api";
const outputPath = path.resolve(
  process.cwd(),
  "postman",
  "school-management-api.postman_collection.json",
);

const requestExamples: Record<string, JsonValue> = {
  "POST /auth/register": {
    name: "Admin User",
    email: "admin@example.com",
    password: "password123",
    role: "admin",
  },
  "POST /auth/login": {
    email: "admin@example.com",
    password: "password123",
  },
  "POST /auth/refresh-token": {
    refreshToken: "{{refreshToken}}",
  },
  "POST /auth/logout": {
    refreshToken: "{{refreshToken}}",
  },
  "PUT /auth/change-password": {
    currentPassword: "password123",
    newPassword: "newPassword123",
  },
  "POST /auth/forgot-password": {
    email: "admin@example.com",
  },
  "POST /auth/reset-password": {
    resetToken: "sample-reset-token",
    newPassword: "newPassword123",
  },
  "POST /users": {
    name: "School Owner User",
    email: "owner@example.com",
    password: "password123",
    role: "school_owner",
    schoolId: 1,
  },
  "PUT /users/{id}": {
    name: "Updated Staff User",
    email: "staff.updated@example.com",
    role: "staff",
    schoolId: 1,
  },
  "POST /roles": {
    name: "hod",
    description: "Head of department role",
  },
  "PUT /roles/{id}": {
    name: "hod_updated",
    description: "Updated head of department role",
  },
  "POST /permissions": {
    name: "view_reports",
    description: "Can view academic reports",
  },
  "POST /permissions/assign": {
    roleId: 1,
    permissionIds: [1, 2, 3],
  },
  "POST /schools": {
    name: "Central High School",
    code: "CHS001",
    email: "info@centralhigh.edu",
    phone: "+2348000000000",
    address: "123 Main Street",
  },
  "PUT /schools/{id}": {
    name: "Central High School Updated",
    email: "contact@centralhigh.edu",
    phone: "+2348000000001",
    address: "124 Main Street",
  },
  "POST /classes": {
    name: "Primary 5",
    section: "A",
  },
  "PUT /classes/{id}": {
    name: "Primary 5",
    section: "B",
  },
  "POST /sections": {
    name: "A",
    classId: 1,
  },
  "POST /classes/{classId}/sections": {
    name: "B",
  },
  "PUT /sections/{id}": {
    name: "C",
    classId: 1,
  },
  "POST /subjects": [
    {
      name: "Mathematics",
      classId: 1,
    },
    {
      name: "English Language",
      classId: 1,
    },
  ],
  "PUT /subjects/{id}": {
    name: "Advanced Mathematics",
    classId: 1,
  },
  "POST /students": {
    userId: 101,
    classId: 1,
    sectionId: 1,
    rollNumber: "STU-001",
  },
  "PUT /students/{id}": {
    classId: 2,
    sectionId: 3,
    rollNumber: "STU-002",
  },
  "POST /teachers": {
    userId: 102,
    employeeId: "EMP-001",
    qualification: "B.Ed",
    phone: "+2348000000002",
  },
  "PUT /teachers/{id}": {
    employeeId: "EMP-001",
    qualification: "M.Ed",
    phone: "+2348000000003",
  },
  "POST /parents": {
    userId: 103,
    phone: "+2348000000004",
    address: "45 Parent Avenue",
    studentIds: [1, 2],
  },
  "PUT /parents/{id}": {
    phone: "+2348000000005",
    address: "46 Parent Avenue",
  },
  "POST /attendance/mark": {
    studentId: 1,
    classId: 1,
    date: "2026-05-21",
    status: "present",
    remarks: "On time",
  },
  "PUT /attendance/{id}": {
    status: "late",
    remarks: "Arrived after assembly",
  },
  "PUT /attendance/rules": {
    workDayStartTime: "08:00",
    lateAfterTime: "08:15",
    checkOutStartTime: "15:00",
    requireLocation: true,
    officeLatitude: 6.5244,
    officeLongitude: 3.3792,
    allowedRadiusMeters: 200,
  },
  "POST /attendance/check-in": {
    latitude: 6.5244,
    longitude: 3.3792,
    locationText: "Main office gate",
  },
  "POST /attendance/check-out": {
    latitude: 6.5244,
    longitude: 3.3792,
    locationText: "Main office gate",
  },
  "POST /exams": {
    name: "First Term Mathematics Exam",
    classId: 1,
    subjectId: 1,
    examDate: "2026-06-10",
    totalMarks: 100,
  },
  "PUT /exams/{id}": {
    name: "First Term Mathematics Exam Updated",
    examDate: "2026-06-12",
    totalMarks: 100,
  },
  "POST /marks": {
    studentId: 1,
    subjectId: 1,
    examId: 1,
    score: 85,
    grade: "A",
    remarks: "Excellent work",
  },
  "PUT /marks/{id}": {
    score: 88,
    grade: "A",
    remarks: "Regraded after review",
  },
  "POST /mock-tests/generate": {
    className: "Grade 10",
    subjectName: "Mathematics",
    level: "medium",
    questionCount: 10,
  },
  "POST /mock-tests/submit": {
    mockTestId: 1,
    submittedAnswers: [
      { questionIndex: 0, selectedAnswer: "A" },
      { questionIndex: 1, selectedAnswer: "B" },
    ],
    startTime: "2026-05-21T10:00:00.000Z",
    endTime: "2026-05-21T10:30:00.000Z",
  },
  "POST /mock-tests/{id}/assign": {
    studentIds: [1, 2],
  },
  "POST /assignments": {
    title: "Algebra Homework",
    description: "Solve questions 1 to 10",
    classId: 1,
    subjectId: 1,
    teacherId: 1,
    dueDate: "2026-05-30",
  },
  "POST /assignments/submit": {
    assignmentId: 1,
    studentId: 1,
    submissionText: "My completed assignment answers",
    attachmentUrl: "https://example.com/submissions/assignment-1.pdf",
  },
  "POST /timetable": {
    classId: 1,
    sectionId: "",
    subjectId: 1,
    teacherId: 1,
    day: "Monday",
    startTime: "09:00",
    endTime: "10:00",
    room: "Room 3",
  },
  "PUT /timetable/{id}": {
    sectionId: "",
    day: "Tuesday",
    startTime: "10:00",
    endTime: "11:00",
    room: "Room 4",
  },
  "POST /fees": {
    studentId: 1,
    amount: 80000,
    term: "First Term",
    session: "2026/2027",
    dueDate: "2026-06-01",
    description: "School fees for first term",
  },
  "POST /fees/payment": {
    feeId: 1,
    amount: 80000,
    paymentDate: "2026-05-21",
    paymentMethod: "bank_transfer",
    reference: "TXN-10001",
  },
};

const resolveSchema = (schema?: SchemaObject): SchemaObject | undefined => {
  if (!schema) {
    return undefined;
  }

  if (!schema.$ref) {
    return schema;
  }

  const schemaName = schema.$ref.split("/").pop();

  if (!schemaName) {
    return schema;
  }

  return schemas[schemaName] ?? schema;
};

const buildExampleFromSchema = (schema?: SchemaObject): JsonValue => {
  const resolved = resolveSchema(schema);

  if (!resolved) {
    return {};
  }

  if (resolved.example !== undefined) {
    return resolved.example;
  }

  if (resolved.default !== undefined) {
    return resolved.default;
  }

  if (resolved.oneOf?.length) {
    return buildExampleFromSchema(resolved.oneOf[0]);
  }

  if (resolved.allOf?.length) {
    return resolved.allOf.reduce<JsonValue>((merged, current) => {
      const example = buildExampleFromSchema(current);

      if (
        merged &&
        typeof merged === "object" &&
        !Array.isArray(merged) &&
        example &&
        typeof example === "object" &&
        !Array.isArray(example)
      ) {
        return { ...merged, ...example };
      }

      return example;
    }, {});
  }

  if (resolved.enum?.length) {
    return resolved.enum[0] ?? "";
  }

  switch (resolved.type) {
    case "object": {
      const entries = Object.entries(resolved.properties ?? {}).map(
        ([key, propertySchema]) => [
          key,
          buildExampleFromSchema(propertySchema),
        ],
      );

      if (entries.length > 0) {
        return Object.fromEntries(entries);
      }

      if (
        resolved.additionalProperties &&
        typeof resolved.additionalProperties === "object"
      ) {
        return {
          sample: buildExampleFromSchema(resolved.additionalProperties),
        };
      }

      return {};
    }
    case "array":
      return [buildExampleFromSchema(resolved.items)];
    case "integer":
    case "number":
      return 0;
    case "boolean":
      return true;
    case "string":
      if (resolved.format === "email") {
        return "user@example.com";
      }

      if (resolved.format === "date-time") {
        return "2026-01-01T00:00:00.000Z";
      }

      return "string";
    default:
      return {};
  }
};

const buildRequestBody = (
  method: string,
  routePath: string,
  requestBody?: RequestBodyObject,
) => {
  const requestExample =
    requestExamples[`${method.toUpperCase()} ${routePath}`];

  if (requestExample !== undefined) {
    return {
      mode: "raw",
      raw: JSON.stringify(requestExample, null, 2),
      options: {
        raw: {
          language: "json",
        },
      },
    };
  }

  const jsonSchema = requestBody?.content?.["application/json"]?.schema;

  if (!jsonSchema) {
    return undefined;
  }

  return {
    mode: "raw",
    raw: JSON.stringify(buildExampleFromSchema(jsonSchema), null, 2),
    options: {
      raw: {
        language: "json",
      },
    },
  };
};

const getParameterExampleValue = (parameter: ParameterObject) => {
  if (parameter.example !== undefined) {
    return parameter.example;
  }

  if (parameter.schema?.example !== undefined) {
    return parameter.schema.example;
  }

  if (parameter.schema?.default !== undefined) {
    return parameter.schema.default;
  }

  switch (parameter.schema?.type) {
    case "integer":
    case "number":
      return 1;
    case "boolean":
      return true;
    default:
      return "sample";
  }
};

const buildUrl = (routePath: string, parameters?: ParameterObject[]) => {
  const postmanPath = routePath.replace(/\{([^}]+)\}/g, ":$1");
  const cleanBaseUrl = "{{baseUrl}}".replace(/\/$/, "");
  const cleanPath = postmanPath.startsWith("/")
    ? postmanPath
    : `/${postmanPath}`;
  const pathSegments = cleanPath.split("/").filter(Boolean);
  const variables = pathSegments
    .filter((segment) => segment.startsWith(":"))
    .map((segment) => ({
      key: segment.slice(1),
      value: "1",
    }));
  const query = (parameters ?? [])
    .filter((parameter) => parameter.in === "query")
    .map((parameter) => ({
      key: parameter.name,
      value: String(getParameterExampleValue(parameter)),
      description: parameter.description,
      disabled: false,
    }));
  const queryString = query.length
    ? `?${query
        .map(
          (parameter) =>
            `${encodeURIComponent(parameter.key)}=${encodeURIComponent(parameter.value)}`,
        )
        .join("&")}`
    : "";
  const raw = `${cleanBaseUrl}${cleanPath}${queryString}`;

  return {
    raw,
    host: ["{{baseUrl}}"],
    path: pathSegments,
    variable: variables,
    ...(query.length > 0 ? { query } : {}),
  };
};

const buildHeaders = (operation: OperationObject) => {
  const headers: Array<{ key: string; value: string; type: string }> = [];

  if (operation.requestBody?.content?.["application/json"]) {
    headers.push({
      key: "Content-Type",
      value: "application/json",
      type: "text",
    });
  }

  if (operation.security?.some((security) => "bearerAuth" in security)) {
    headers.push({
      key: "Authorization",
      value: "Bearer {{accessToken}}",
      type: "text",
    });
  }

  return headers;
};

const buildEvents = (method: string, routePath: string) => {
  const events: Array<{
    listen: string;
    script: { type: string; exec: string[] };
  }> = [];
  const normalizedPath = routePath.toLowerCase();

  if (
    method === "POST" &&
    (normalizedPath === "/auth/login" || normalizedPath === "/auth/register")
  ) {
    events.push({
      listen: "test",
      script: {
        type: "text/javascript",
        exec: [
          "const data = pm.response.json();",
          "pm.collectionVariables.set('accessToken', data.accessToken || data.token || '');",
          "pm.collectionVariables.set('refreshToken', data.refreshToken || '');",
        ],
      },
    });
  }

  if (method === "POST" && normalizedPath === "/auth/refresh-token") {
    events.push({
      listen: "test",
      script: {
        type: "text/javascript",
        exec: [
          "const data = pm.response.json();",
          "pm.collectionVariables.set('accessToken', data.accessToken || data.token || '');",
          "pm.collectionVariables.set('refreshToken', data.refreshToken || pm.collectionVariables.get('refreshToken') || '');",
        ],
      },
    });
  }

  if (method === "POST" && normalizedPath === "/auth/logout") {
    events.push({
      listen: "test",
      script: {
        type: "text/javascript",
        exec: [
          "pm.collectionVariables.set('accessToken', '');",
          "pm.collectionVariables.set('refreshToken', '');",
        ],
      },
    });
  }

  return events;
};

const createRequestItem = (
  method: string,
  routePath: string,
  operation: OperationObject,
) => ({
  name: operation.summary ?? `${method} ${routePath}`,
  request: {
    method,
    header: buildHeaders(operation),
    body: buildRequestBody(method, routePath, operation.requestBody),
    url: buildUrl(routePath, operation.parameters),
    description: operation.description ?? operation.summary ?? "",
  },
  response: [],
  event: buildEvents(method, routePath),
});

const groupedItems = new Map<
  string,
  Array<ReturnType<typeof createRequestItem>>
>();

for (const [routePath, methods] of Object.entries(spec.paths ?? {})) {
  for (const [method, operation] of Object.entries(methods ?? {})) {
    if (!operation) {
      continue;
    }

    const tag = operation.tags?.[0] ?? "Misc";
    const collectionItems = groupedItems.get(tag) ?? [];

    collectionItems.push(
      createRequestItem(method.toUpperCase(), routePath, operation),
    );
    groupedItems.set(tag, collectionItems);
  }
}

const item = Array.from(groupedItems.entries())
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([tag, requests]) => ({
    name: tag,
    item: requests.sort((left, right) => left.name.localeCompare(right.name)),
  }));

const collection = {
  info: {
    name: spec.info?.title ?? "School Management API",
    description:
      spec.info?.description ??
      "Postman collection generated from the OpenAPI definition.",
    schema:
      "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    version: spec.info?.version ?? "1.0.0",
  },
  variable: [
    { key: "baseUrl", value: defaultBaseUrl },
    { key: "accessToken", value: "" },
    { key: "refreshToken", value: "" },
  ],
  item,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2));

console.log(`Postman collection written to ${outputPath}`);
