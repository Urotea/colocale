import type { Messages, NamespaceTranslations } from "./types";
import { getNestedValue } from "./utils";

/**
 * Select appropriate plural key suffix based on Intl.PluralRules
 * @param baseKey - Base key name (e.g., "itemCount")
 * @param count - Numeric value to determine suffix
 * @param locale - Locale for pluralization rules (optional, defaults to "en")
 * @returns Key with suffix (e.g., "itemCount_one", "itemCount_other")
 */
function selectPluralKey(baseKey: string, count: number, locale = "en"): string {
  const pluralRules = new Intl.PluralRules(locale);
  const rule = pluralRules.select(count);
  return `${baseKey}_${rule}`;
}

/**
 * Resolve message based on Intl.PluralRules
 *
 * Rules:
 * - Uses Intl.PluralRules to determine the appropriate form (e.g., "one", "other")
 * - Only supports _one and _other suffixes
 * - Falls back to _other if the selected form is not found
 *
 * @param messages - Messages object
 * @param namespace - Namespace
 * @param baseKey - Base key
 * @param count - Count value
 * @param locale - Locale for pluralization rules (optional, defaults to "en")
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

  // Fallback to _other if the selected form is not found
  const otherKey = `${namespace}.${baseKey}_other`;
  if (otherKey in messages) {
    return messages[otherKey];
  }

  return undefined;
}

/**
 * Extract all plural-related keys from translation file (flat structure)
 * Based on Intl.PluralRules, only _one and _other suffixes are supported
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
  const suffixes = ["_one", "_other"];

  for (const suffix of suffixes) {
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
