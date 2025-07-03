import { GraphQLClient } from "graphql-request";
import dotenv from "dotenv";
import path from "path";
import * as fs from "fs";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const BASEBASE_ENDPOINT = "https://app.basebase.us/graphql";

// Type definitions for introspection result
interface IntrospectionField {
  name: string;
  type: {
    name?: string;
    kind: string;
    ofType?: {
      name?: string;
      kind: string;
    };
  };
  args?: IntrospectionField[];
}

interface IntrospectionType {
  name: string;
  kind: string;
  description?: string;
  fields?: IntrospectionField[];
  inputFields?: IntrospectionField[];
}

interface IntrospectionResult {
  __schema: {
    types: IntrospectionType[];
    mutationType?: {
      name: string;
      fields: IntrospectionField[];
    };
    queryType?: {
      name: string;
      fields: IntrospectionField[];
    };
  };
}

// GraphQL Introspection Query
const INTROSPECTION_QUERY = `
  query IntrospectionQuery {
    __schema {
      types {
        name
        kind
        description
        fields {
          name
          type {
            name
            kind
            ofType {
              name
              kind
            }
          }
          args {
            name
            type {
              name
              kind
              ofType {
                name
                kind
              }
            }
          }
        }
        inputFields {
          name
          type {
            name
            kind
            ofType {
              name
              kind
            }
          }
        }
      }
      mutationType {
        name
        fields {
          name
          type {
            name
            kind
          }
          args {
            name
            type {
              name
              kind
              ofType {
                name
                kind
              }
            }
          }
        }
      }
      queryType {
        name
        fields {
          name
          type {
            name
            kind
          }
          args {
            name
            type {
              name
              kind
              ofType {
                name
                kind
              }
            }
          }
        }
      }
    }
  }
`;

async function introspectSchema(): Promise<void> {
  try {
    if (!process.env.BASEBASE_TOKEN) {
      throw new Error("BASEBASE_TOKEN environment variable is required");
    }

    const client = new GraphQLClient(BASEBASE_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${process.env.BASEBASE_TOKEN}`,
      },
    });

    console.log("Running GraphQL introspection on:", BASEBASE_ENDPOINT);
    console.log(
      "Using token:",
      process.env.BASEBASE_TOKEN.substring(0, 10) + "..."
    );

    const result =
      await client.request<IntrospectionResult>(INTROSPECTION_QUERY);

    console.log("\n=== SCHEMA INTROSPECTION RESULTS ===\n");

    // Find NewsStory related types
    const newsStoryTypes = result.__schema.types.filter(
      (type: IntrospectionType) =>
        type.name && type.name.toLowerCase().includes("newsstory")
    );

    console.log("📰 NEWS STORY RELATED TYPES:");
    newsStoryTypes.forEach((type: IntrospectionType) => {
      console.log(`\n${type.name} (${type.kind}):`);
      if (type.fields) {
        type.fields.forEach((field: IntrospectionField) => {
          const fieldType = field.type.ofType
            ? field.type.ofType.name
            : field.type.name;
          console.log(`  - ${field.name}: ${fieldType}`);
        });
      }
      if (type.inputFields) {
        type.inputFields.forEach((field: IntrospectionField) => {
          const fieldType = field.type.ofType
            ? field.type.ofType.name
            : field.type.name;
          console.log(`  - ${field.name}: ${fieldType}`);
        });
      }
    });

    // Find NewsSource related types
    const newsSourceTypes = result.__schema.types.filter(
      (type: IntrospectionType) =>
        type.name && type.name.toLowerCase().includes("newssource")
    );

    console.log("\n\n📡 NEWS SOURCE RELATED TYPES:");
    newsSourceTypes.forEach((type: IntrospectionType) => {
      console.log(`\n${type.name} (${type.kind}):`);
      if (type.fields) {
        type.fields.forEach((field: IntrospectionField) => {
          const fieldType = field.type.ofType
            ? field.type.ofType.name
            : field.type.name;
          console.log(`  - ${field.name}: ${fieldType}`);
        });
      }
      if (type.inputFields) {
        type.inputFields.forEach((field: IntrospectionField) => {
          const fieldType = field.type.ofType
            ? field.type.ofType.name
            : field.type.name;
          console.log(`  - ${field.name}: ${fieldType}`);
        });
      }
    });

    // Show available mutations
    console.log("\n\n🔧 AVAILABLE MUTATIONS:");
    if (result.__schema.mutationType && result.__schema.mutationType.fields) {
      result.__schema.mutationType.fields.forEach(
        (mutation: IntrospectionField) => {
          console.log(`\n${mutation.name}:`);
          if (mutation.args && mutation.args.length > 0) {
            mutation.args.forEach((arg: IntrospectionField) => {
              const argType = arg.type.ofType
                ? arg.type.ofType.name
                : arg.type.name;
              console.log(`  - ${arg.name}: ${argType}`);
            });
          }
        }
      );
    }

    // Show available queries
    console.log("\n\n🔍 AVAILABLE QUERIES:");
    if (result.__schema.queryType && result.__schema.queryType.fields) {
      result.__schema.queryType.fields.forEach((query: IntrospectionField) => {
        console.log(`\n${query.name}:`);
        if (query.args && query.args.length > 0) {
          query.args.forEach((arg: IntrospectionField) => {
            const argType = arg.type.ofType
              ? arg.type.ofType.name
              : arg.type.name;
            console.log(`  - ${arg.name}: ${argType}`);
          });
        }
      });
    }

    // Save full schema to file for detailed inspection
    console.log("\n\n💾 Saving full schema to schema-introspection.json");
    fs.writeFileSync(
      "schema-introspection.json",
      JSON.stringify(result, null, 2)
    );
  } catch (error: unknown) {
    console.error("Introspection failed:", error);
    if (error && typeof error === "object" && "response" in error) {
      console.error(
        "Response:",
        JSON.stringify((error as any).response, null, 2)
      );
    }
    process.exit(1);
  }
}

console.log("Starting GraphQL schema introspection...");
introspectSchema();
