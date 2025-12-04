import type { NestedTranslations, TranslationFile } from "../types";

/**
 * Plural suffixes used in translation keys
 */
const PLURAL_SUFFIXES = [
  "_zero",
  "_one",
  "_two",
  "_few",
  "_many",
  "_other",
] as const;

/**
 * Remove plural suffix from a key if it exists
 * @param key - Translation key that may have a plural suffix
 * @returns Key without plural suffix
 */
function removePluralSuffix(key: string): string {
  for (const suffix of PLURAL_SUFFIXES) {
    if (key.endsWith(suffix)) {
      return key.slice(0, -suffix.length);
    }
  }
  return key;
}

/**
 * Check if a key has a plural suffix
 * @param key - Translation key to check
 * @returns True if the key has a plural suffix
 */
function hasPluralSuffix(key: string): boolean {
  return PLURAL_SUFFIXES.some((suffix) => key.endsWith(suffix));
}

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

  // Add import statement for createDefineRequirement
  lines.push("import { createDefineRequirement } from 'colocale';");
  lines.push("");

  // Generate namespace interfaces
  const namespaceInterfaces: string[] = [];

  for (const [namespace, namespaceData] of Object.entries(translations)) {
    const interfaceNamespace = capitalizeFirst(namespace);
    const namespaceInterfaceName = `${interfaceNamespace}Messages`;

    lines.push(`interface ${namespaceInterfaceName} {`);

    const processedKeys = new Set<string>();

    for (const [key, value] of Object.entries(namespaceData)) {
      // Remove plural suffix for the key
      const baseKey = removePluralSuffix(key);

      // Skip if we've already processed this base key
      if (processedKeys.has(baseKey)) {
        continue;
      }
      processedKeys.add(baseKey);

      if (typeof value === "string") {
        // Direct string value
        lines.push(`  "${baseKey}": string;`);
      } else if (typeof value === "object" && value !== null) {
        // Nested object
        const nestedInterfaceName = `${interfaceNamespace}${capitalizeFirst(
          baseKey
        )}Messages`;
        lines.push(`  "${baseKey}": ${nestedInterfaceName};`);

        // Store nested interface for later generation
        namespaceInterfaces.push(
          generateNestedInterface(nestedInterfaceName, value)
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
  lines.push(`interface ${interfaceName} {`);
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
  lines.push("type TranslationKeys =");

  const allKeys: string[] = [];
  for (const [namespace, namespaceData] of Object.entries(translations)) {
    const processedKeys = new Set<string>();

    for (const key of Object.keys(namespaceData)) {
      // Remove plural suffix for the key
      const baseKey = removePluralSuffix(key);

      // Skip if we've already processed this base key
      if (processedKeys.has(baseKey)) {
        continue;
      }
      processedKeys.add(baseKey);

      // Check for nested keys
      const value = namespaceData[key];
      if (typeof value === "object" && value !== null) {
        // Only add nested keys, not the parent object key
        for (const nestedKey of Object.keys(value)) {
          const baseNestedKey = removePluralSuffix(nestedKey);
          allKeys.push(`"${namespace}.${baseKey}.${baseNestedKey}"`);
        }
      } else {
        // Only add the key if its value is a string (not an object)
        allKeys.push(`"${namespace}.${baseKey}"`);
      }
    }
  }

  const keyUnion = allKeys.map((k) => `  | ${k}`).join("\n");
  lines.push(keyUnion);
  lines.push(";");
  lines.push("");

  // Generate helper types for type-safe defineRequirement
  lines.push("/**");
  lines.push(" * Internal helper types for translation structure");
  lines.push(" */");
  lines.push("");
  lines.push("/**");
  lines.push(" * Union type of all valid namespace names");
  lines.push(" */");
  lines.push(
    `type Namespace = ${Object.keys(translations)
      .map((ns) => `"${ns}"`)
      .join(" | ")};`
  );
  lines.push("");

  // Generate namespace-specific key types
  for (const [namespace, namespaceData] of Object.entries(translations)) {
    const keys: string[] = [];
    const processedKeys = new Set<string>();

    for (const key of Object.keys(namespaceData)) {
      // Remove plural suffix for the key
      const baseKey = removePluralSuffix(key);

      // Skip if we've already processed this base key
      if (processedKeys.has(baseKey)) {
        continue;
      }
      processedKeys.add(baseKey);

      // Check for nested keys (only 1 level supported by design)
      const value = namespaceData[key];
      if (typeof value === "object" && value !== null) {
        // Only add nested keys, not the parent object key
        const nestedProcessedKeys = new Set<string>();
        for (const nestedKey of Object.keys(value)) {
          const baseNestedKey = removePluralSuffix(nestedKey);
          if (!nestedProcessedKeys.has(baseNestedKey)) {
            nestedProcessedKeys.add(baseNestedKey);
            keys.push(`"${baseKey}.${baseNestedKey}"`);
          }
        }
      } else {
        // Only add the key if its value is a string (not an object)
        keys.push(`"${baseKey}"`);
      }
    }

    const capitalizedNs = capitalizeFirst(namespace);
    lines.push("/**");
    lines.push(` * Valid keys for the '${namespace}' namespace`);
    lines.push(" */");
    lines.push(`type ${capitalizedNs}Keys = ${keys.join(" | ")};`);
    lines.push("");
  }

  // Add the exported defineRequirement function
  lines.push("/**");
  lines.push(
    " * Type-safe defineRequirement function for this translation structure"
  );
  lines.push(" * ");
  lines.push(" * @example");
  lines.push(" * ```typescript");
  lines.push(" * import defineRequirement from './defineRequirement';");
  lines.push(" * ");
  lines.push(" * // Full type inference and validation");
  lines.push(
    ' * const req = defineRequirement("common", ["submit", "cancel"]);'
  );
  lines.push(" * ```");
  lines.push(" */");
  lines.push(
    `const defineRequirement = createDefineRequirement<${interfaceName}>();`
  );
  lines.push("");
  lines.push("/**");
  lines.push(" * @public");
  lines.push(" */");
  lines.push("export default defineRequirement;");
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
  lines.push(`interface ${interfaceName} {`);

  const processedKeys = new Set<string>();

  for (const key of Object.keys(nested)) {
    // Remove plural suffix for the key
    const baseKey = removePluralSuffix(key);

    // Skip if we've already processed this base key
    if (processedKeys.has(baseKey)) {
      continue;
    }
    processedKeys.add(baseKey);

    lines.push(`  "${baseKey}": string;`);
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
