import type { Locale } from "./types";
import { getNestedValue } from "./utils";

/**
 * Select appropriate plural key suffix based on Intl.PluralRules
 *
 * Any BCP 47 language tag is accepted. A malformed tag (which `Intl.PluralRules`
 * rejects with a RangeError) yields `undefined` so the caller can fall back to
 * the `_other` form instead of throwing.
 *
 * @param baseKey - Base key name (e.g., "itemCount")
 * @param count - Numeric value to determine suffix
 * @param locale - Locale for pluralization rules (optional, defaults to "en")
 * @returns Key with suffix (e.g., "itemCount_one", "itemCount_other"), or undefined for a malformed locale
 */
function selectPluralKey(
  baseKey: string,
  count: number,
  locale: Locale = "en"
): string | undefined {
  let rule: Intl.LDMLPluralRule;
  try {
    rule = new Intl.PluralRules(locale).select(count);
  } catch {
    // Malformed locale tag (e.g. taken straight from a URL segment)
    return undefined;
  }
  return `${baseKey}_${rule}`;
}

/**
 * Resolve message based on Intl.PluralRules
 *
 * Rules:
 * - Uses Intl.PluralRules to determine the appropriate form (e.g., "one", "other")
 * - Only supports _one and _other suffixes
 * - Falls back to _other if the selected form is not found. Locales with
 *   additional plural categories (e.g. "few"/"many" in ru, pl, ar) therefore
 *   resolve to the _other form.
 * - Falls back to _other if the locale tag is malformed (never throws)
 *
 * @param messages - Translation messages map
 * @param namespace - Namespace
 * @param baseKey - Base key
 * @param count - Count value
 * @param locale - Locale for pluralization rules (optional, defaults to "en")
 * @returns Resolved message, or undefined
 */
export function resolvePluralMessage(
  messages: Record<string, string>,
  namespace: string,
  baseKey: string,
  count: number,
  locale: Locale = "en"
): string | undefined {
  const selectedKey = selectPluralKey(baseKey, count, locale);

  // Try selected key
  if (selectedKey !== undefined) {
    const fullKey = `${namespace}.${selectedKey}`;
    if (fullKey in messages) {
      return messages[fullKey];
    }
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
