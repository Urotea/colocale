import { describe, expect, test } from "bun:test";
import {
  mergeRequirements,
  pickMessages,
  createTranslator,
  type TranslationRequirement,
  type TranslationFile,
  type Messages,
} from "./index";

// Test translation files
const testMessages: TranslationFile = {
  common: {
    submit: "送信",
    cancel: "キャンセル",
    itemCount_zero: "アイテムがありません",
    itemCount_one: "1件のアイテム",
    itemCount_other: "{count}件のアイテム",
  },
  user: {
    profile: {
      name: "名前",
      email: "メールアドレス",
    },
  },
  shop: {
    cart: {
      item_zero: "カートは空です",
      item_one: "1個の商品",
      item_other: "{count}個の商品",
    },
    cartSummary_zero: "{user}さんのカートは空です",
    cartSummary_one: "{user}さんのカートに1個の商品があります",
    cartSummary_other: "{user}さんのカートに{count}個の商品があります",
  },
  results: {
    itemsFound: "{count}件取得しました",
    greeting: "こんにちは、{name}さん",
  },
};

describe("mergeRequirements", () => {
  test("Merge single translation requirement", () => {
    const req: TranslationRequirement = {
      keys: ["submit"],
      namespace: "common",
    };
    const result = mergeRequirements(req);
    expect(result).toEqual([req]);
  });

  test("Merge multiple translation requirements", () => {
    const req1: TranslationRequirement = {
      keys: ["submit"],
      namespace: "common",
    };
    const req2: TranslationRequirement = {
      keys: ["name"],
      namespace: "user",
    };
    const result = mergeRequirements(req1, req2);
    expect(result).toEqual([req1, req2]);
  });

  test("Flatten arrays", () => {
    const req1: TranslationRequirement = {
      keys: ["submit"],
      namespace: "common",
    };
    const req2: TranslationRequirement = {
      keys: ["name"],
      namespace: "user",
    };
    const result = mergeRequirements([req1], req2);
    expect(result).toEqual([req1, req2]);
  });

  test("Flatten nested arrays", () => {
    const req1: TranslationRequirement = {
      keys: ["submit"],
      namespace: "common",
    };
    const req2: TranslationRequirement = {
      keys: ["name"],
      namespace: "user",
    };
    const req3: TranslationRequirement = {
      keys: ["item"],
      namespace: "shop",
    };
    const result = mergeRequirements([[req1, req2]], req3);
    expect(result).toEqual([req1, req2, req3]);
  });

  test("Empty array", () => {
    const result = mergeRequirements();
    expect(result).toEqual([]);
  });
});

describe("pickMessages", () => {
  test("Single translation requirement", () => {
    const requirements: TranslationRequirement[] = [
      {
        keys: ["submit", "cancel"],
        namespace: "common",
      },
    ];
    const result = pickMessages(testMessages, requirements);
    expect(result).toEqual({
      "common.submit": "送信",
      "common.cancel": "キャンセル",
    });
  });

  test("Multiple translation requirements", () => {
    const requirements: TranslationRequirement[] = [
      {
        keys: ["submit"],
        namespace: "common",
      },
      {
        keys: ["itemsFound"],
        namespace: "results",
      },
    ];
    const result = pickMessages(testMessages, requirements);
    expect(result).toEqual({
      "common.submit": "送信",
      "results.itemsFound": "{count}件取得しました",
    });
  });

  test("Nested keys", () => {
    const requirements: TranslationRequirement[] = [
      {
        keys: ["profile.name", "profile.email"],
        namespace: "user",
      },
    ];
    const result = pickMessages(testMessages, requirements);
    expect(result).toEqual({
      "user.profile.name": "名前",
      "user.profile.email": "メールアドレス",
    });
  });

  test("Automatic extraction of plural keys", () => {
    const requirements: TranslationRequirement[] = [
      {
        keys: ["itemCount"],
        namespace: "common",
      },
    ];
    const result = pickMessages(testMessages, requirements);
    expect(result).toEqual({
      "common.itemCount_zero": "アイテムがありません",
      "common.itemCount_one": "1件のアイテム",
      "common.itemCount_other": "{count}件のアイテム",
    });
  });

  test("Automatic extraction of nested plural keys", () => {
    const requirements: TranslationRequirement[] = [
      {
        keys: ["cart.item"],
        namespace: "shop",
      },
    ];
    const result = pickMessages(testMessages, requirements);
    expect(result).toEqual({
      "shop.cart.item_zero": "カートは空です",
      "shop.cart.item_one": "1個の商品",
      "shop.cart.item_other": "{count}個の商品",
    });
  });

  test("Non-existent key", () => {
    const requirements: TranslationRequirement[] = [
      {
        keys: ["nonexistent"],
        namespace: "common",
      },
    ];
    const result = pickMessages(testMessages, requirements);
    expect(result).toEqual({});
  });

  test("Non-existent namespace", () => {
    const requirements: TranslationRequirement[] = [
      {
        keys: ["submit"],
        namespace: "nonexistent",
      },
    ];
    const result = pickMessages(testMessages, requirements);
    expect(result).toEqual({});
  });
});

describe("createTranslator", () => {
  test("Basic translation", () => {
    const messages: Messages = {
      "common.submit": "送信",
      "common.cancel": "キャンセル",
    };
    const t = createTranslator(messages, "common");
    expect(t("submit")).toBe("送信");
    expect(t("cancel")).toBe("キャンセル");
  });

  test("Placeholder replacement (single)", () => {
    const messages: Messages = {
      "results.itemsFound": "{count}件取得しました",
    };
    const t = createTranslator(messages, "results");
    expect(t("itemsFound", { count: 5 })).toBe("5件取得しました");
  });

  test("Placeholder replacement (multiple)", () => {
    const messages: Messages = {
      "results.greeting": "こんにちは、{name}さん",
    };
    const t = createTranslator(messages, "results");
    expect(t("greeting", { name: "田中" })).toBe("こんにちは、田中さん");
  });

  test("Plural handling (count = 0)", () => {
    const messages: Messages = {
      "common.itemCount_zero": "アイテムがありません",
      "common.itemCount_one": "1件のアイテム",
      "common.itemCount_other": "{count}件のアイテム",
    };
    const t = createTranslator(messages, "common");
    expect(t("itemCount", { count: 0 })).toBe("アイテムがありません");
  });

  test("Plural handling (count = 1)", () => {
    const messages: Messages = {
      "common.itemCount_zero": "アイテムがありません",
      "common.itemCount_one": "1件のアイテム",
      "common.itemCount_other": "{count}件のアイテム",
    };
    const t = createTranslator(messages, "common");
    expect(t("itemCount", { count: 1 })).toBe("1件のアイテム");
  });

  test("Plural handling (count = 2+)", () => {
    const messages: Messages = {
      "common.itemCount_zero": "アイテムがありません",
      "common.itemCount_one": "1件のアイテム",
      "common.itemCount_other": "{count}件のアイテム",
    };
    const t = createTranslator(messages, "common");
    expect(t("itemCount", { count: 5 })).toBe("5件のアイテム");
    expect(t("itemCount", { count: 100 })).toBe("100件のアイテム");
  });

  test("Combination of plurals + placeholders", () => {
    const messages: Messages = {
      "shop.cartSummary_zero": "{user}さんのカートは空です",
      "shop.cartSummary_one": "{user}さんのカートに1個の商品があります",
      "shop.cartSummary_other": "{user}さんのカートに{count}個の商品があります",
    };
    const t = createTranslator(messages, "shop");
    expect(t("cartSummary", { count: 0, user: "田中" })).toBe(
      "田中さんのカートは空です"
    );
    expect(t("cartSummary", { count: 1, user: "田中" })).toBe(
      "田中さんのカートに1個の商品があります"
    );
    expect(t("cartSummary", { count: 5, user: "田中" })).toBe(
      "田中さんのカートに5個の商品があります"
    );
  });

  test("Partial plural keys (_other only)", () => {
    const messages: Messages = {
      "common.itemCount_other": "{count}件のアイテム",
    };
    const t = createTranslator(messages, "common");
    // If count === 0 and _zero is not available, fallback to _other
    expect(t("itemCount", { count: 0 })).toBe("0件のアイテム");
    // If count === 1, _one is required so not found (react-i18next compatible)
    expect(t("itemCount", { count: 1 })).toBe("itemCount");
    expect(t("itemCount", { count: 5 })).toBe("5件のアイテム");
  });

  test("Partial plural keys (_one and _other only)", () => {
    const messages: Messages = {
      "common.itemCount_one": "1件のアイテム",
      "common.itemCount_other": "{count}件のアイテム",
    };
    const t = createTranslator(messages, "common");
    expect(t("itemCount", { count: 0 })).toBe("0件のアイテム");
    expect(t("itemCount", { count: 1 })).toBe("1件のアイテム");
    expect(t("itemCount", { count: 5 })).toBe("5件のアイテム");
  });

  test("Non-existent key", () => {
    const messages: Messages = {
      "common.submit": "送信",
    };
    const t = createTranslator(messages, "common");
    expect(t("nonexistent")).toBe("nonexistent");
  });

  test("Multiple uses of same placeholder", () => {
    const messages: Messages = {
      "test.repeated": "{name}さん、こんにちは。{name}さんの注文を確認します。",
    };
    const t = createTranslator(messages, "test");
    expect(t("repeated", { name: "田中" })).toBe(
      "田中さん、こんにちは。田中さんの注文を確認します。"
    );
  });

  test("Number to string conversion", () => {
    const messages: Messages = {
      "test.number": "価格: {price}円",
    };
    const t = createTranslator(messages, "test");
    expect(t("number", { price: 1000 })).toBe("価格: 1000円");
  });
});

describe("Edge cases", () => {
  test("Plural with negative number", () => {
    const messages: Messages = {
      "common.itemCount_zero": "アイテムがありません",
      "common.itemCount_one": "1件のアイテム",
      "common.itemCount_other": "{count}件のアイテム",
    };
    const t = createTranslator(messages, "common");
    expect(t("itemCount", { count: -1 })).toBe("-1件のアイテム");
  });

  test("Plural with decimal number", () => {
    const messages: Messages = {
      "common.itemCount_zero": "アイテムがありません",
      "common.itemCount_one": "1件のアイテム",
      "common.itemCount_other": "{count}件のアイテム",
    };
    const t = createTranslator(messages, "common");
    expect(t("itemCount", { count: 0.5 })).toBe("0.5件のアイテム");
  });
});
