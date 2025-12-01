import { describe, expect, test } from "bun:test";
import { validateTranslations, type TranslationFile } from "./index";

describe("validateTranslations", () => {
  test("正常な翻訳ファイル", () => {
    const translations: TranslationFile = {
      common: {
        submit: "送信",
        cancel: "キャンセル",
        itemCount_one: "1件のアイテム",
        itemCount_other: "{count}件のアイテム",
      },
    };

    const result = validateTranslations(translations);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("複数形キー: _one が不足", () => {
    const translations: TranslationFile = {
      common: {
        itemCount_other: "{count}件のアイテム",
      },
    };

    const result = validateTranslations(translations);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe("missing-plural-one");
    expect(result.errors[0].key).toBe("itemCount");
  });

  test("複数形キー: _other が不足", () => {
    const translations: TranslationFile = {
      common: {
        itemCount_one: "1件のアイテム",
      },
    };

    const result = validateTranslations(translations);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe("missing-plural-other");
    expect(result.errors[0].key).toBe("itemCount");
  });

  test("複数形キー: _one と _other が両方不足", () => {
    const translations: TranslationFile = {
      common: {
        itemCount_zero: "アイテムがありません",
      },
    };

    const result = validateTranslations(translations);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].type).toBe("missing-plural-one");
    expect(result.errors[1].type).toBe("missing-plural-other");
  });

  test("複数形キー: _zero はオプション", () => {
    const translations: TranslationFile = {
      common: {
        itemCount_one: "1件のアイテム",
        itemCount_other: "{count}件のアイテム",
      },
    };

    const result = validateTranslations(translations);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("ネストした複数形キー", () => {
    const translations: TranslationFile = {
      shop: {
        cart: {
          item_one: "1個の商品",
          item_other: "{count}個の商品",
        },
      },
    };

    const result = validateTranslations(translations);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("ネストの深さ: 1階層（正常）", () => {
    const translations: TranslationFile = {
      user: {
        profile: {
          name: "名前",
          email: "メールアドレス",
        },
      },
    };

    const result = validateTranslations(translations);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("ネストの深さ: 2階層以上（エラー）", () => {
    const translations: TranslationFile = {
      user: {
        profile: {
          personal: {
            name: "名前",
          },
        },
      },
    };

    const result = validateTranslations(translations);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].type).toBe("invalid-nesting");
  });

  test("キー名: 有効な形式", () => {
    const translations: TranslationFile = {
      common: {
        submit_button: "送信",
        cancel123: "キャンセル",
        _private: "プライベート",
      },
    };

    const result = validateTranslations(translations);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("キー名: 無効な形式（ハイフン）", () => {
    const translations: TranslationFile = {
      common: {
        "submit-button": "送信",
      },
    };

    const result = validateTranslations(translations);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe("invalid-key-name");
  });

  test("キー名: 無効な形式（数字で始まる）", () => {
    const translations: TranslationFile = {
      common: {
        "123button": "送信",
      },
    };

    const result = validateTranslations(translations);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe("invalid-key-name");
  });

  test("プレースホルダー: 有効な形式", () => {
    const translations: TranslationFile = {
      results: {
        greeting: "こんにちは、{name}さん",
        message: "{user_name}さんに{count}件のメッセージ",
      },
    };

    const result = validateTranslations(translations);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("プレースホルダー: 無効な形式（ハイフン）", () => {
    const translations: TranslationFile = {
      results: {
        greeting: "こんにちは、{user-name}さん",
      },
    };

    const result = validateTranslations(translations);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe("invalid-placeholder");
  });

  test("プレースホルダー: 無効な形式（スペース）", () => {
    const translations: TranslationFile = {
      results: {
        greeting: "こんにちは、{user name}さん",
      },
    };

    const result = validateTranslations(translations);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe("invalid-placeholder");
  });

  test("複数の名前空間とエラー", () => {
    const translations: TranslationFile = {
      common: {
        itemCount_one: "1件",
        // itemCount_other が不足
      },
      user: {
        "invalid-key": "無効",
      },
    };

    const result = validateTranslations(translations);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  test("空の翻訳ファイル", () => {
    const translations: TranslationFile = {};

    const result = validateTranslations(translations);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("空の名前空間", () => {
    const translations: TranslationFile = {
      common: {},
    };

    const result = validateTranslations(translations);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
