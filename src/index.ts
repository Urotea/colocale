// ============================================================================
// Re-exports from separate modules
// ============================================================================

// Types
export type {
  TranslationKey,
  TranslationRequirement,
  Messages,
  PlaceholderValues,
  PluralOptions,
  TranslationFile,
  NamespaceTranslations,
  NestedTranslations,
  TranslatorFunction,
  ValidationError,
  ValidationErrorType,
  ValidationResult,
  NestedKeyOf,
  TypedTranslationRequirement,
  ExtractKeys,
  TypedTranslator,
  RequirementKeys,
  ConstrainedTranslatorFunction,
} from "./types";

// Validation
export { validateTranslations, validateCrossLocale } from "./validation";

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
  TranslatorFunction,
  ConstrainedTranslatorFunction,
} from "./types";

/**
 * Merge multiple translation requirements into a single array
 * @template K - Translation keys type
 * @param requirements - Translation requirement(s) or array of requirements (variadic)
 * @returns Flattened array of translation requirements
 */
export function mergeRequirements<K extends string = string>(
  ...requirements: (TranslationRequirement<K> | TranslationRequirement<K>[])[]
): TranslationRequirement<K>[] {
  return requirements.flat(Infinity) as TranslationRequirement<K>[];
}

/**
 * Extract only the required translations from translation files
 *
 * When base keys are specified, keys with _zero, _one, _other suffixes are automatically extracted
 *
 * @template K - Translation keys type
 * @param allMessages - Object containing all translation data
 * @param requirements - List of required translation keys
 * @returns Messages object (key format: "namespace.key")
 */
export function pickMessages<K extends string = string>(
  allMessages: TranslationFile,
  requirements: TranslationRequirement<K>[]
): Messages<K> {
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

  return messages as Messages<K>;
}

/**
 * Generate a translation function bound to a specific namespace
 *
 * When values contain a count property, automatic plural handling is performed
 *
 * @template K - Translation keys type
 * @param messages - Messages object
 * @param namespace - Translation namespace
 * @returns Translation function
 */
export function createTranslator<K extends string = string>(
  messages: Messages<K>,
  namespace: string
): TranslatorFunction<K>;

/**
 * Generate a translation function bound to a specific namespace with keys constrained by TranslationRequirement
 *
 * When values contain a count property, automatic plural handling is performed
 *
 * @template R - TranslationRequirement type that defines allowed keys
 * @param messages - Messages object
 * @param requirement - TranslationRequirement that defines the namespace and allowed keys
 * @returns Translation function constrained to keys in the requirement
 */
export function createTranslator<R extends TranslationRequirement<string>>(
  messages: Messages<string>,
  requirement: R
): ConstrainedTranslatorFunction<R>;

// Implementation
export function createTranslator<K extends string = string>(
  messages: Messages<K> | Messages<string>,
  namespaceOrRequirement: string | TranslationRequirement<string>
): TranslatorFunction<K> | ConstrainedTranslatorFunction<TranslationRequirement<string>> {
  const isDev = process.env.NODE_ENV === "development";
  const messagesRecord = messages as Record<string, string>;
  const namespace =
    typeof namespaceOrRequirement === "string"
      ? namespaceOrRequirement
      : namespaceOrRequirement.namespace;

  return (key: K | string, values?: PlaceholderValues): string => {
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
