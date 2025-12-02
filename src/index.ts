// ============================================================================
// Re-exports from separate modules
// ============================================================================

// Types
export type {
  TranslationRequirement,
  Messages,
  TranslationFile,
  ConstrainedTranslatorFunction,
} from "./types";

// Validation
export { validateTranslations, validateCrossLocale } from "./validation";

// Utilities
export { defineRequirement } from "./utils";

// Loader (for CLI and programmatic use)
export type { LocaleTranslations } from "./cli/loader";
export {
  loadTranslationsFromDirectory,
  loadAllLocaleTranslations,
} from "./cli/loader";

// Internal utilities (for internal use, but exported for testing)
import { getNestedValue, replacePlaceholders } from "./utils";
import { extractPluralKeys, resolvePluralMessage } from "./plural";

// ============================================================================
// Core API Functions
// ============================================================================

import type {
  TranslationRequirement,
  TranslationFile,
  Messages,
  PlaceholderValues,
  ConstrainedTranslatorFunction,
} from "./types";

/**
 * Merge multiple translation requirements into a single array
 * @param requirements - Translation requirements (variadic)
 * @returns Array of translation requirements
 */
export function mergeRequirements(
  ...requirements: TranslationRequirement<string>[]
): TranslationRequirement<string>[] {
  return requirements;
}

/**
 * Extract only the required translations from translation files
 *
 * When base keys are specified, keys with _zero, _one, _other suffixes are automatically extracted
 *
 * @template R - Array of TranslationRequirements
 * @param allMessages - Object containing all translation data
 * @param requirements - List of required translation keys
 * @returns Messages object (key format: "namespace.key")
 */
export function pickMessages<R extends readonly TranslationRequirement<any>[]>(
  allMessages: TranslationFile,
  requirements: R
): Messages {
  const messages: Record<string, string> = {};
  const isDev = process.env.NODE_ENV === "development";

  for (const requirement of requirements) {
    const { namespace, keys } = requirement;
    const namespaceData = allMessages[namespace];

    if (!namespaceData) {
      if (isDev) {
        console.warn(`[colocale] Namespace "${namespace}" not found`);
      }
      continue;
    }

    for (const key of keys) {
      // Check direct key
      if (typeof namespaceData[key] === "string") {
        messages[`${namespace}.${key}`] = namespaceData[key] as string;
      } else {
        // Check nested key
        const value = getNestedValue(namespaceData, key);
        if (value !== undefined) {
          messages[`${namespace}.${key}`] = value;
        } else if (isDev) {
          console.warn(
            `[colocale] Translation key "${key}" not found in namespace "${namespace}"`
          );
        }
      }

      // Attempt automatic extraction of plural keys
      const pluralKeys = extractPluralKeys(allMessages, namespace, key);
      for (const pluralKey of pluralKeys) {
        const value = getNestedValue(namespaceData, pluralKey);
        if (value !== undefined) {
          messages[`${namespace}.${pluralKey}`] = value;
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
 * // Generics are optional - use 'satisfies' for type inference
 * const requirement = {
 *   keys: ["profile.name", "profile.email"] as const,
 *   namespace: "user",
 * } satisfies TranslationRequirement;
 *
 * const t = createTranslator(messages, requirement);
 * t("profile.name"); // ✓ OK
 * t("profile.invalid"); // ✗ Type error
 * ```
 */
export function createTranslator<R extends TranslationRequirement<string>>(
  messages: Messages,
  requirement: R
): ConstrainedTranslatorFunction<R> {
  const isDev = process.env.NODE_ENV === "development";
  const messagesRecord = messages as Record<string, string>;
  const namespace = requirement.namespace;

  return (key: string, values?: PlaceholderValues): string => {
    let message: string | undefined;

    // If count is provided, attempt plural handling
    if (values && "count" in values && typeof values.count === "number") {
      message = resolvePluralMessage(
        messagesRecord,
        namespace,
        key as string,
        values.count
      );
    }

    // If not plural or plural resolution failed, try regular key
    if (message === undefined) {
      const fullKey = `${namespace}.${key}`;
      message = messagesRecord[fullKey];
    }

    // If message not found, return key as-is
    if (message === undefined) {
      if (isDev) {
        console.warn(`[colocale] Translation not found: "${namespace}.${key}"`);
      }
      return key as string;
    }

    // Replace placeholders
    if (values) {
      return replacePlaceholders(message, values);
    }

    return message;
  };
}
