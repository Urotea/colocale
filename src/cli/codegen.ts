import type { TranslationFile, NestedTranslations } from "../types";

/**
 * Generate TypeScript interface from translation file structure
 * @param translations - Translation file data
 * @param interfaceName - Name of the generated interface (default: "TranslationStructure")
 * @returns TypeScript interface definition as a string
 */
export function generateTypescriptInterface(
  translations: TranslationFile,
  interfaceName: string = "TranslationStructure"
): string {
  const lines: string[] = [];

  // Add header comment
  lines.push("/**");
  lines.push(" * Auto-generated translation types");
  lines.push(" * DO NOT EDIT MANUALLY");
  lines.push(" */");
  lines.push("");

  // Generate namespace interfaces
  const namespaceInterfaces: string[] = [];

  for (const [namespace, namespaceData] of Object.entries(translations)) {
    const interfaceNamespace = capitalizeFirst(namespace);
    const namespaceInterfaceName = `${interfaceNamespace}Messages`;

    lines.push(`export interface ${namespaceInterfaceName} {`);

    for (const [key, value] of Object.entries(namespaceData)) {
      if (typeof value === "string") {
        // Direct string value
        lines.push(`  "${key}": string;`);
      } else {
        // Nested object
        const nestedInterfaceName = `${interfaceNamespace}${capitalizeFirst(
          key
        )}`;
        lines.push(`  "${key}": ${nestedInterfaceName};`);

        // Store nested interface for later generation
        namespaceInterfaces.push(
          generateNestedInterface(
            nestedInterfaceName,
            value as NestedTranslations
          )
        );
      }
    }

    lines.push("}");
    lines.push("");
  }

  // Add nested interfaces
  for (const nestedInterface of namespaceInterfaces) {
    lines.push(nestedInterface);
    lines.push("");
  }

  // Generate main interface that combines all namespaces
  lines.push(`export interface ${interfaceName} {`);
  for (const namespace of Object.keys(translations)) {
    const interfaceNamespace = capitalizeFirst(namespace);
    lines.push(`  "${namespace}": ${interfaceNamespace}Messages;`);
  }
  lines.push("}");
  lines.push("");

  // Generate union type for all translation keys
  lines.push("/**");
  lines.push(" * Union type of all translation keys");
  lines.push(" */");
  lines.push("export type TranslationKeys =");

  const allKeys: string[] = [];
  for (const [namespace, namespaceData] of Object.entries(translations)) {
    for (const key of Object.keys(namespaceData)) {
      // Add base key
      allKeys.push(`"${namespace}.${key}"`);

      // Check for nested keys
      const value = namespaceData[key];
      if (typeof value === "object" && value !== null) {
        for (const nestedKey of Object.keys(value)) {
          allKeys.push(`"${namespace}.${key}.${nestedKey}"`);
        }
      }

      // Check for plural keys (_one, _other, etc.)
      const pluralSuffixes = [
        "_zero",
        "_one",
        "_two",
        "_few",
        "_many",
        "_other",
      ];
      for (const suffix of pluralSuffixes) {
        const pluralKey = `${key}${suffix}`;
        if (namespaceData[pluralKey]) {
          allKeys.push(`"${namespace}.${pluralKey}"`);
        }
      }
    }
  }

  const keyUnion = allKeys.map((k) => `  | ${k}`).join("\n");
  lines.push(keyUnion);
  lines.push(";");
  lines.push("");

  return lines.join("\n");
}

/**
 * Generate nested interface
 */
function generateNestedInterface(
  interfaceName: string,
  nested: NestedTranslations
): string {
  const lines: string[] = [];
  lines.push(`export interface ${interfaceName} {`);

  for (const key of Object.keys(nested)) {
    lines.push(`  "${key}": string;`);
  }

  lines.push("}");

  return lines.join("\n");
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Generate import statement for the generated types
 * @param generatedTypePath - Path to the generated types file (e.g., "./messages.types")
 * @returns Import statement string
 */
export function generateImportStatement(
  generatedTypePath: string = "./messages.types"
): string {
  return `import type { TranslationStructure, TranslationKey } from "${generatedTypePath}";`;
}

/**
 * Generate example usage code
 * @returns Example code as a string
 */
export function generateUsageExample(): string {
  return `
// Example usage:
import { pickMessages, createTranslator } from "colocale";
import type { TranslationStructure, TranslationKey } from "./messages.types";

// Type-safe messages
const allMessages: TranslationStructure = /* your loaded messages */;

// Type-safe translation keys
const key: TranslationKey<"common"> = "submit";

// Type-safe translator
const t = createTranslator<"common", TranslationKey<"common">>(messages, "common");
t("submit"); // ✓ Type-safe
t("invalid"); // ✗ Type error
`.trim();
}
