import type { TranslationFile } from "../types";

/**
 * Plural suffixes used in translation keys (Intl.PluralRules compatible)
 * Only "one" and "other" are supported
 */
const PLURAL_SUFFIXES = [
  "_one",
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
 * Capitalize first letter
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Generate TypeScript interface from translation file structure
 * @param translations - Translation file data
 * @returns TypeScript interface definition as a string
 */
export function generateTypescriptInterface(
  translations: TranslationFile
): string {
  const lines: string[] = [];

  // Add header comment
  lines.push("/**");
  lines.push(" * Auto-generated translation types");
  lines.push(" * DO NOT EDIT MANUALLY");
  lines.push(" */");
  lines.push("");

  // Add types needed for defineRequirement
  lines.push("/**");
  lines.push(" * Translation requirement type");
  lines.push(" */");
  lines.push("interface TranslationRequirement<K extends readonly string[]> {");
  lines.push("  namespace: string;");
  lines.push("  keys: K;");
  lines.push("}");
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

  // Generate KeysForNamespace type for each namespace
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

      // In flat structure, all values are strings
      keys.push(`"${baseKey}"`);
    }

    const capitalizedNs = capitalizeFirst(namespace);
    lines.push("/**");
    lines.push(` * Valid keys for the '${namespace}' namespace`);
    lines.push(" */");
    lines.push(`type ${capitalizedNs}Keys = ${keys.join(" | ")};`);
    lines.push("");
  }

  lines.push("/**");
  lines.push(" * Get valid keys for a specific namespace");
  lines.push(" * @template N - The namespace name");
  lines.push(" */");
  lines.push("type KeysForNamespace<N extends Namespace> =");
  const namespaceKeyMap = Object.keys(translations)
    .map((ns) => {
      const capitalizedNs = capitalizeFirst(ns);
      return `  N extends "${ns}" ? ${capitalizedNs}Keys :`;
    })
    .join("\n");
  lines.push(namespaceKeyMap);
  lines.push("  never;");
  lines.push("");

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
  lines.push("function defineRequirement<");
  lines.push("  N extends Namespace,");
  lines.push("  const K extends readonly KeysForNamespace<N>[]");
  lines.push(">(");
  lines.push("  namespace: N,");
  lines.push("  keys: K");
  lines.push("): TranslationRequirement<K> {");
  lines.push("  return { keys, namespace };");
  lines.push("}");
  lines.push("");
  lines.push("/**");
  lines.push(" * @public");
  lines.push(" */");
  lines.push("export default defineRequirement;");
  lines.push("");

  return lines.join("\n");
}
