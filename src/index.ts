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
} from "./types";

// Validation
export { validateTranslations } from "./validation";

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
} from "./types";

/**
 * 複数の翻訳要求を1つの配列にマージ
 * @param requirements - 翻訳要求またはその配列（可変長引数）
 * @returns フラット化された翻訳要求の配列
 */
export function mergeRequirements(
  ...requirements: (TranslationRequirement | TranslationRequirement[])[]
): TranslationRequirement[] {
  return requirements.flat(Infinity) as TranslationRequirement[];
}

/**
 * 翻訳ファイルから必要な翻訳のみを抽出
 *
 * 基本キーが指定された場合、_zero, _one, _other サフィックス付きキーも自動的に抽出
 *
 * @param allMessages - 全翻訳データを含むオブジェクト
 * @param requirements - 必要な翻訳キーのリスト
 * @returns Messages オブジェクト（キー形式: "namespace.key"）
 */
export function pickMessages(
  allMessages: TranslationFile,
  requirements: TranslationRequirement[]
): Messages {
  const messages: Messages = {};
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
      // 直接キーをチェック
      if (typeof namespaceData[key] === "string") {
        messages[`${namespace}.${key}`] = namespaceData[key] as string;
      } else {
        // ネストしたキーをチェック
        const value = getNestedValue(namespaceData, key);
        if (value !== undefined) {
          messages[`${namespace}.${key}`] = value;
        } else if (isDev) {
          console.warn(
            `[colocale] Translation key "${key}" not found in namespace "${namespace}"`
          );
        }
      }

      // 複数形キーの自動抽出を試みる
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
 * 特定の名前空間に紐づいた翻訳関数を生成
 *
 * values に count プロパティが含まれている場合、自動的に複数形処理を行う
 *
 * @param messages - Messages オブジェクト
 * @param namespace - 翻訳の名前空間
 * @returns 翻訳関数
 */
export function createTranslator(
  messages: Messages,
  namespace: string
): TranslatorFunction {
  const isDev = process.env.NODE_ENV === "development";

  return (key: string, values?: PlaceholderValues): string => {
    let message: string | undefined;

    // count が提供されている場合、複数形処理を試みる
    if (values && "count" in values && typeof values.count === "number") {
      message = resolvePluralMessage(messages, namespace, key, values.count);
    }

    // 複数形でない、または複数形の解決に失敗した場合、通常のキーを試す
    if (message === undefined) {
      const fullKey = `${namespace}.${key}`;
      message = messages[fullKey];
    }

    // メッセージが見つからない場合、キーをそのまま返す
    if (message === undefined) {
      if (isDev) {
        console.warn(`[colocale] Translation not found: "${namespace}.${key}"`);
      }
      return key;
    }

    // プレースホルダーの置換
    if (values) {
      return replacePlaceholders(message, values);
    }

    return message;
  };
}
