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
const defaultBaseUrl = spec.servers?.[0]?.url ?? "http://localhost:5000/api";
const outputPath = path.resolve(
  process.cwd(),
  "postman",
  "school-management-api.postman_collection.json",
);

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

const buildRequestBody = (requestBody?: RequestBodyObject) => {
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

const buildUrl = (routePath: string) => {
  const postmanPath = routePath.replace(/\{([^}]+)\}/g, ":$1");
  const cleanBaseUrl = "{{baseUrl}}".replace(/\/$/, "");
  const cleanPath = postmanPath.startsWith("/")
    ? postmanPath
    : `/${postmanPath}`;
  const raw = `${cleanBaseUrl}${cleanPath}`;
  const pathSegments = cleanPath.split("/").filter(Boolean);
  const variables = pathSegments
    .filter((segment) => segment.startsWith(":"))
    .map((segment) => ({
      key: segment.slice(1),
      value: "1",
    }));

  return {
    raw,
    host: ["{{baseUrl}}"],
    path: pathSegments,
    variable: variables,
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
    body: buildRequestBody(operation.requestBody),
    url: buildUrl(routePath),
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
