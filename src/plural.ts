import type { Messages, NamespaceTranslations } from "./types";
import { getNestedValue } from "./utils";

/**
 * Select appropriate plural key suffix based on count using Intl.PluralRules
 * @param baseKey - Base key name (e.g., "itemCount")
 * @param count - Numeric value to determine suffix
 * @param locale - Optional locale for plural rules (defaults to "en")
 * @returns Key with suffix (e.g., "itemCount_one", "itemCount_other")
 */
function selectPluralKey(
  baseKey: string,
  count: number,
  locale = "en"
): string {
  const pluralRules = new Intl.PluralRules(locale);
  const category = pluralRules.select(count);
  return `${baseKey}_${category}`;
}

/**
 * Resolve message based on Intl.PluralRules
 *
 * Uses Intl.PluralRules API to determine the correct plural form.
 * Common categories: "one", "other" (English), but varies by locale.
 *
 * @param messages - Messages object
 * @param namespace - Namespace
 * @param baseKey - Base key
 * @param count - Count value
 * @param locale - Optional locale for plural rules (defaults to "en")
 * @returns Resolved message, or undefined
 */
export function resolvePluralMessage(
  messages: Messages,
  namespace: string,
  baseKey: string,
  count: number,
  locale = "en"
): string | undefined {
  const selectedKey = selectPluralKey(baseKey, count, locale);
  const fullKey = `${namespace}.${selectedKey}`;

  // Try selected key
  if (fullKey in messages) {
    return messages[fullKey];
  }

  // Fallback to _other if the selected category is not found
  const otherKey = `${namespace}.${baseKey}_other`;
  if (otherKey in messages) {
    return messages[otherKey];
  }

  return undefined;
}

/**
 * All possible plural categories from Intl.PluralRules
 * Different locales may use different subsets
 */
const INTL_PLURAL_CATEGORIES = [
  "_zero",
  "_one",
  "_two",
  "_few",
  "_many",
  "_other",
] as const;

/**
 * Extract all plural-related keys from translation file (flat structure)
 * @param allMessages - All translation data
 * @param namespace - Namespace
 * @param baseKey - Base key
 * @returns Array of existing plural keys
 */
export function extractPluralKeys(
  allMessages: Record<string, unknown>,
  namespace: string,
  baseKey: string
): string[] {
  const namespaceData = allMessages[namespace];
  if (!namespaceData || typeof namespaceData !== "object") {
    return [];
  }

  const pluralKeys: string[] = [];

  for (const suffix of INTL_PLURAL_CATEGORIES) {
    const keyWithSuffix = `${baseKey}${suffix}`;
    // Check direct key in flat structure
    const value = getNestedValue(
      namespaceData as Record<string, unknown>,
      keyWithSuffix
    );
    if (value !== undefined) {
      pluralKeys.push(keyWithSuffix);
    }
  }

  return pluralKeys;
}
