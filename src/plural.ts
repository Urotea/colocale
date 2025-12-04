import type { Messages, NamespaceTranslations } from "./types";
import { getNestedValue } from "./utils";

/**
 * Select appropriate plural key suffix based on count
 * @param baseKey - Base key name (e.g., "itemCount")
 * @param count - Numeric value to determine suffix
 * @returns Key with suffix (e.g., "itemCount_zero", "itemCount_one", "itemCount_other")
 */
function selectPluralKey(baseKey: string, count: number): string {
  if (count === 0) {
    return `${baseKey}_zero`;
  } else if (count === 1) {
    return `${baseKey}_one`;
  } else {
    return `${baseKey}_other`;
  }
}

/**
 * Resolve message based on plural rules (react-i18next compatible)
 *
 * Rules:
 * - count === 0: Use _zero if available, otherwise use _other
 * - count === 1: Use _one (required)
 * - Other: Use _other (required)
 *
 * @param messages - Messages object
 * @param namespace - Namespace
 * @param baseKey - Base key
 * @param count - Count value
 * @returns Resolved message, or undefined
 */
export function resolvePluralMessage(
  messages: Messages,
  namespace: string,
  baseKey: string,
  count: number
): string | undefined {
  const selectedKey = selectPluralKey(baseKey, count);
  const fullKey = `${namespace}.${selectedKey}`;

  // Try selected key
  if (fullKey in messages) {
    return messages[fullKey];
  }

  // Fallback to _other only if count === 0 and _zero is not found
  if (count === 0) {
    const otherKey = `${namespace}.${baseKey}_other`;
    if (otherKey in messages) {
      return messages[otherKey];
    }
  }

  return undefined;
}

/**
 * Extract all plural-related keys from translation file
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
  const suffixes = ["_zero", "_one", "_other"];

  for (const suffix of suffixes) {
    const keyWithSuffix = `${baseKey}${suffix}`;
    // Check direct key
    if (keyWithSuffix in namespaceData) {
      pluralKeys.push(keyWithSuffix);
    } else {
      // Check nested key
      const value = getNestedValue(
        namespaceData as Record<string, unknown>,
        keyWithSuffix
      );
      if (value !== undefined) {
        pluralKeys.push(keyWithSuffix);
      }
    }
  }

  return pluralKeys;
}
