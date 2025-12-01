import type { Messages, NamespaceTranslations } from "./types";
import { getNestedValue } from "./utils";

/**
 * 数値に応じて適切な複数形キーのサフィックスを選択
 * @param baseKey - 基本キー名（例: "itemCount"）
 * @param count - 判定する数値
 * @returns サフィックス付きキー（例: "itemCount_zero", "itemCount_one", "itemCount_other"）
 */
export function selectPluralKey(baseKey: string, count: number): string {
  if (count === 0) {
    return `${baseKey}_zero`;
  } else if (count === 1) {
    return `${baseKey}_one`;
  } else {
    return `${baseKey}_other`;
  }
}

/**
 * 複数形ルールに基づいてメッセージを解決（react-i18next 互換）
 *
 * ルール:
 * - count === 0: _zero があればそれを使用、なければ _other を使用
 * - count === 1: _one を使用（必須）
 * - その他: _other を使用（必須）
 *
 * @param messages - Messages オブジェクト
 * @param namespace - 名前空間
 * @param baseKey - 基本キー
 * @param count - 数値
 * @returns 解決されたメッセージ、または undefined
 */
export function resolvePluralMessage(
  messages: Messages,
  namespace: string,
  baseKey: string,
  count: number
): string | undefined {
  const selectedKey = selectPluralKey(baseKey, count);
  const fullKey = `${namespace}.${selectedKey}`;

  // 選択されたキーを試す
  if (fullKey in messages) {
    return messages[fullKey];
  }

  // count === 0 かつ _zero が見つからない場合のみ、_other にフォールバック
  if (count === 0) {
    const otherKey = `${namespace}.${baseKey}_other`;
    if (otherKey in messages) {
      return messages[otherKey];
    }
  }

  return undefined;
}

/**
 * 翻訳ファイルから複数形に関連するすべてのキーを抽出
 * @param allMessages - 全翻訳データ
 * @param namespace - 名前空間
 * @param baseKey - 基本キー
 * @returns 存在する複数形キーの配列
 */
export function extractPluralKeys(
  allMessages: Record<string, any>,
  namespace: string,
  baseKey: string
): string[] {
  const namespaceData = allMessages[namespace];
  if (!namespaceData) {
    return [];
  }

  const pluralKeys: string[] = [];
  const suffixes = ["_zero", "_one", "_other"];

  for (const suffix of suffixes) {
    const keyWithSuffix = `${baseKey}${suffix}`;
    // 直接キーをチェック
    if (keyWithSuffix in namespaceData) {
      pluralKeys.push(keyWithSuffix);
    } else {
      // ネストしたキーをチェック
      const value = getNestedValue(namespaceData, keyWithSuffix);
      if (value !== undefined) {
        pluralKeys.push(keyWithSuffix);
      }
    }
  }

  return pluralKeys;
}
