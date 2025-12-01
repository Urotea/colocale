/**
 * 翻訳キーを表す文字列型
 * ネスト構造をドット記法で表現（例: "user.profile.name"）
 * 複数形のサフィックス（_zero, _one, _other）を含む場合もある
 */
export type TranslationKey = string;

/**
 * コンポーネントが必要とする翻訳キーの要求
 */
export interface TranslationRequirement {
  /** コンポーネントが必要とする翻訳キーの配列（読み取り専用） */
  keys: readonly TranslationKey[];
  /** 翻訳の名前空間（例: "common", "user", "shop"） */
  namespace: string;
}

/**
 * 解決済み翻訳メッセージを格納するオブジェクト
 * キー形式: "namespace.key" （例: "common.submit"）
 */
export type Messages = Record<string, string>;

/**
 * プレースホルダーに渡す値のオブジェクト
 */
export type PlaceholderValues = Record<string, string | number>;

/**
 * 複数形処理に使用するオプション
 */
export interface PluralOptions {
  /** 複数形判定に使用する数値 */
  count: number;
}

/**
 * 翻訳ファイルの型
 * トップレベル: 名前空間のマップ
 * 名前空間内: キーと翻訳文字列のマップ（1階層のネストまで許可）
 */
export type TranslationFile = Record<string, NamespaceTranslations>;

export type NamespaceTranslations = Record<string, string | NestedTranslations>;

export type NestedTranslations = Record<string, string>;

/**
 * 翻訳関数の型
 */
export type TranslatorFunction = (
  key: string,
  values?: PlaceholderValues
) => string;

/**
 * 検証エラーの種類
 */
export type ValidationErrorType =
  | "missing-plural-one"
  | "missing-plural-other"
  | "invalid-nesting"
  | "invalid-key-name"
  | "invalid-placeholder";

/**
 * 検証エラー
 */
export interface ValidationError {
  /** エラーの種類 */
  type: ValidationErrorType;
  /** 名前空間 */
  namespace: string;
  /** キーのパス */
  key: string;
  /** エラーメッセージ */
  message: string;
}

/**
 * 検証結果
 */
export interface ValidationResult {
  /** エラーがあるかどうか */
  valid: boolean;
  /** エラーのリスト */
  errors: ValidationError[];
  /** 警告のリスト */
  warnings: ValidationError[];
}

// ============================================================================
// Type Safety Utilities
// ============================================================================

/**
 * ネストしたオブジェクトからドット記法のキーパスを生成する型ユーティリティ
 */
export type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}` | K
          : K
        : never;
    }[keyof T]
  : never;

/**
 * 型安全な翻訳要求
 */
export interface TypedTranslationRequirement<
  N extends string,
  K extends string
> {
  keys: readonly K[];
  namespace: N;
}

/**
 * 名前空間から利用可能なキーを抽出する型ユーティリティ
 */
export type ExtractKeys<N extends string, AllKeys extends string> = Extract<
  AllKeys,
  `${N}.${string}`
> extends `${N}.${infer K}`
  ? K
  : never;

/**
 * 型安全な翻訳関数
 */
export type TypedTranslator<
  N extends string,
  AllKeys extends string = string
> = <K extends ExtractKeys<N, AllKeys>>(
  key: K,
  values?: PlaceholderValues
) => string;
