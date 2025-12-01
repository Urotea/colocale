import type { PlaceholderValues } from "./types";

/**
 * ドット記法のパスからネストしたオブジェクトの値を取得
 * @param obj - 検索対象のオブジェクト
 * @param path - ドット記法のパス（例: "profile.name"）
 * @returns 見つかった文字列、または undefined
 */
export function getNestedValue(
  obj: Record<string, any>,
  path: string
): string | undefined {
  const keys = path.split(".");
  let current: any = obj;

  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }

  return typeof current === "string" ? current : undefined;
}

/**
 * メッセージ内のプレースホルダーを値で置換
 * プレースホルダー形式: {name}
 * @param message - プレースホルダーを含む文字列
 * @param values - 置換する値のオブジェクト
 * @returns 置換後の文字列
 */
export function replacePlaceholders(
  message: string,
  values: PlaceholderValues
): string {
  let result = message;
  for (const [key, value] of Object.entries(values)) {
    const placeholder = `{${key}}`;
    result = result.replaceAll(placeholder, String(value));
  }
  return result;
}
