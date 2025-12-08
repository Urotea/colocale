import { describe, expect, test } from "bun:test";
import { type TranslationFile, validateTranslations } from "./index";

describe("validateTranslations", () => {
  test("Valid translation file", () => {
    const translations: TranslationFile = {
      common: {
        submit: "送信",
        cancel: "キャンセル",
        itemCount_one: "1件のアイテム",
        itemCount_other: "{{count}}件のアイテム",
      },
    };

    const result = validateTranslations(translations);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("Plural keys: missing _one (allowed with Intl.PluralRules)", () => {
    const translations: TranslationFile = {
      common: {
        itemCount_other: "{{count}}件のアイテム",
      },
    };

    const result = validateTranslations(translations);
    // With Intl.PluralRules, only _other is required
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("Plural keys: missing _other", () => {
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

  test("Plural keys: missing both _one and _other", () => {
    const translations: TranslationFile = {
      common: {
        itemCount_few: "{{count}}件のアイテム",
      },
    };

    const result = validateTranslations(translations);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe("missing-plural-other");
  });

  test("Plural keys: all Intl.PluralRules categories are supported", () => {
    const translations: TranslationFile = {
      common: {
        itemCount_one: "{{count}}件のアイテム",
        itemCount_other: "{{count}}件のアイテム",
      },
    };

    const result = validateTranslations(translations);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("Nested plural keys (flat structure)", () => {
    const translations: TranslationFile = {
      shop: {
        "cart.item_one": "{{count}}個の商品",
        "cart.item_other": "{{count}}個の商品",
      },
    };

    const result = validateTranslations(translations);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("Nesting depth: 0 level flat structure with dots (valid)", () => {
    const translations: TranslationFile = {
      user: {
        "profile.name": "名前",
        "profile.email": "メールアドレス",
      },
    };

    const result = validateTranslations(translations);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("Nesting depth: 1+ levels (error)", () => {
    const translations: TranslationFile = {
      user: {
        profile: {
          name: "名前",
        },
        // biome-ignore lint/suspicious/noExplicitAny: Testing invalid object handling
      } as any,
    };

    const result = validateTranslations(translations);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].type).toBe("invalid-nesting");
  });

  test("Key names: valid format", () => {
    const translations: TranslationFile = {
      common: {
        submit_button: "送信",
        cancel123: "キャンセル",
        _private: "プライベート",
        "profile.name": "名前", // dots allowed in flat structure
      },
    };

    const result = validateTranslations(translations);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("Key names: invalid format (hyphen)", () => {
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

  test("Key names: invalid format (starts with number)", () => {
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

  test("Placeholders: valid format", () => {
    const translations: TranslationFile = {
      results: {
        greeting: "こんにちは、{{name}}さん",
        message: "{{user_name}}さんに{{count}}件のメッセージ",
      },
    };

    const result = validateTranslations(translations);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("Placeholders: invalid format (hyphen)", () => {
    const translations: TranslationFile = {
      results: {
        greeting: "こんにちは、{{user-name}}さん",
      },
    };

    const result = validateTranslations(translations);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe("invalid-placeholder");
  });

  test("Placeholders: invalid format (space)", () => {
    const translations: TranslationFile = {
      results: {
        greeting: "こんにちは、{{user name}}さん",
      },
    };

    const result = validateTranslations(translations);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe("invalid-placeholder");
  });

  test("Multiple namespaces with errors", () => {
    const translations: TranslationFile = {
      common: {
        itemCount_one: "{{count}}件",
        // itemCount_other is missing - should cause error
      },
      user: {
        "invalid-key": "無効",
      },
    };

    const result = validateTranslations(translations);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  test("Empty translation file", () => {
    const translations: TranslationFile = {};

    const result = validateTranslations(translations);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("Empty namespace", () => {
    const translations: TranslationFile = {
      common: {},
    };

    const result = validateTranslations(translations);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
