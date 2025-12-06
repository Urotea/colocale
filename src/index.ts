// ============================================================================
// Re-exports from separate modules
// ============================================================================

// Types
export type {
  TranslationRequirement,
  Messages,
  TranslationFile,
  ConstrainedTranslatorFunction,
  LocaleTranslations,
  Namespace,
  KeysForNamespace,
} from "./types";

// Validation
export { validateTranslations, validateCrossLocale } from "./validation";

import { extractPluralKeys, resolvePluralMessage } from "./plural";
import { getNestedValue, replacePlaceholders } from "./utils";

// ============================================================================
// Core API Functions
// ============================================================================

import type {
  ConstrainedTranslatorFunction,
  Messages,
  PlaceholderValues,
  TranslationFile,
  TranslationRequirement,
} from "./types";

/**
 * Merge multiple translation requirements into a single requirement
 * @param requirements - Translation requirements or arrays of translation requirements (variadic)
 * @returns A single TranslationRequirement with merged keys
 */
export function mergeRequirements(
  ...requirements: (
    | TranslationRequirement<readonly string[]>
    | TranslationRequirement<readonly string[]>[]
  )[]
): TranslationRequirement<readonly string[]> {
  const flattened = requirements.flat();
  
  if (flattened.length === 0) {
    return { namespace: "__merged__", keys: [] };
  }
  
  // Collect all namespaces and keys
  const namespaceKeysMap = new Map<string, Set<string>>();
  
  for (const req of flattened) {
    if (!namespaceKeysMap.has(req.namespace)) {
      namespaceKeysMap.set(req.namespace, new Set());
    }
    const keySet = namespaceKeysMap.get(req.namespace)!;
    for (const key of req.keys) {
      keySet.add(key);
    }
  }
  
  // Merge all keys with namespace prefix
  const allKeys: string[] = [];
  for (const [namespace, keySet] of namespaceKeysMap) {
    for (const key of keySet) {
      // If the namespace is already __merged__, the keys already have namespace prefix
      if (namespace === "__merged__") {
        allKeys.push(key);
      } else {
        allKeys.push(`${namespace}.${key}`);
      }
    }
  }
  
  return {
    namespace: "__merged__",
    keys: allKeys,
  };
}

/**
 * Extract only the required translations from translation files
 *
 * When base keys are specified, keys with _zero, _one, _other suffixes are automatically extracted
 *
 * @template R - TranslationRequirement or array of TranslationRequirements
 * @param allMessages - Object containing all translation data
 * @param requirements - Required translation keys (single requirement or array)
 * @returns Messages object (key format: "namespace.key")
 */
export function pickMessages<
  R extends TranslationRequirement<readonly string[]> | readonly TranslationRequirement<readonly string[]>[]
>(allMessages: TranslationFile, requirements: R): Messages {
  const messages: Record<string, string> = {};
  
  // Normalize to array
  const requirementsArray = Array.isArray(requirements) ? requirements : [requirements];

  for (const requirement of requirementsArray) {
    const { namespace, keys } = requirement;
    
    for (const key of keys) {
      // Handle merged namespace format (namespace.key)
      let actualNamespace = namespace;
      let actualKey = key;
      
      if (namespace === "__merged__" && key.includes(".")) {
        // Split namespace.key for merged requirements
        const parts = key.split(".");
        actualNamespace = parts[0];
        actualKey = parts.slice(1).join(".");
      }
      
      const namespaceData = allMessages[actualNamespace];
      if (!namespaceData) {
        continue;
      }

      // Check direct key
      if (typeof namespaceData[actualKey] === "string") {
        messages[`${actualNamespace}.${actualKey}`] = namespaceData[actualKey] as string;
      } else {
        // Check nested key
        const value = getNestedValue(namespaceData, actualKey);
        if (value !== undefined) {
          messages[`${actualNamespace}.${actualKey}`] = value;
        }
      }

      // Attempt automatic extraction of plural keys
      const pluralKeys = extractPluralKeys(allMessages, actualNamespace, actualKey);
      for (const pluralKey of pluralKeys) {
        const value = getNestedValue(namespaceData, pluralKey);
        if (value !== undefined) {
          messages[`${actualNamespace}.${pluralKey}`] = value;
        }
      }
    }
  }

  return messages;
}

/**
 * Generate a translation function bound to a specific namespace with keys constrained by TranslationRequirement
 *
 * When values contain a count property, automatic plural handling is performed
 *
 * @template R - TranslationRequirement type that defines allowed keys
 * @param messages - Messages object
 * @param requirement - TranslationRequirement that defines the namespace and allowed keys
 * @returns Translation function constrained to keys in the requirement
 *
 * @example
 * ```typescript
 * import { createTranslator, defineRequirement } from "colocale";
 *
 * const userProfileTranslations = defineRequirement("user", [
 *   "profile.name",
 *   "profile.email",
 * ]);
 *
 * const t = createTranslator(messages, userProfileTranslations);
 * t("profile.name"); // ✓ OK
 * t("profile.invalid"); // ✗ Type error
 * ```
 */
export function createTranslator<
  R extends TranslationRequirement<readonly string[]>
>(messages: Messages, requirement: R): ConstrainedTranslatorFunction<R> {
  const namespace = requirement.namespace;

  return (key: string, values?: PlaceholderValues): string => {
    let message: string | undefined;

    // If count is provided, attempt plural handling
    if (values && "count" in values && typeof values.count === "number") {
      message = resolvePluralMessage(messages, namespace, key, values.count);
    }

    // If not plural or plural resolution failed, try regular key
    if (message === undefined) {
      const fullKey = `${namespace}.${key}`;
      message = messages[fullKey];
    }

    // If message not found, return key as-is
    if (message === undefined) {
      return key;
    }

    // Replace placeholders
    if (values) {
      return replacePlaceholders(message, values);
    }

    return message;
  };
}
