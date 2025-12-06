import { describe, expect, test } from "bun:test";
import {
  type Messages,
  type TranslationFile,
  createTranslator,
  mergeRequirements,
  pickMessages,
} from "./index";

// Test translation structure type
interface TestTranslationStructure {
  common: {
    submit: string;
    cancel: string;
    itemCount: string;
  };
  user: {
    profile: {
      name: string;
      email: string;
    };
  };
  shop: {
    cart: {
      item: string;
    };
    cartSummary: string;
  };
  results: {
    itemsFound: string;
    greeting: string;
  };
}

// Test translation files
const testMessages: TranslationFile = {
  common: {
    submit: "送信",
    cancel: "キャンセル",
    itemCount_zero: "アイテムがありません",
    itemCount_one: "1件のアイテム",
    itemCount_other: "{{count}}件のアイテム",
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
      item_other: "{{count}}個の商品",
    },
    cartSummary_zero: "{{user}}さんのカートは空です",
    cartSummary_one: "{{user}}さんのカートに1個の商品があります",
    cartSummary_other: "{{user}}さんのカートに{{count}}個の商品があります",
  },
  results: {
    itemsFound: "{{count}}件取得しました",
    greeting: "こんにちは、{{name}}さん",
  },
};

describe("mergeRequirements", () => {
  test("Merge single translation requirement", () => {
    const req = { namespace: "common", keys: ["submit"] };
    const result = mergeRequirements(req);
    expect(result).toEqual({
      namespace: "__merged__",
      keys: ["common.submit"],
    });
  });

  test("Merge multiple translation requirements", () => {
    const req1 = { namespace: "common", keys: ["submit"] };
    const req2 = { namespace: "user", keys: ["profile.name"] };
    const result = mergeRequirements(req1, req2);
    expect(result).toEqual({
      namespace: "__merged__",
      keys: ["common.submit", "user.profile.name"],
    });
  });

  test("Merge arrays", () => {
    const req1 = { namespace: "common", keys: ["submit"] };
    const req2 = { namespace: "user", keys: ["profile.name"] };
    const result = mergeRequirements(req1, req2);
    expect(result).toEqual({
      namespace: "__merged__",
      keys: ["common.submit", "user.profile.name"],
    });
  });

  test("Merge multiple requirements", () => {
    const req1 = { namespace: "common", keys: ["submit"] };
    const req2 = { namespace: "user", keys: ["profile.name"] };
    const req3 = { namespace: "shop", keys: ["cartSummary"] };
    const result = mergeRequirements(req1, req2, req3);
    expect(result).toEqual({
      namespace: "__merged__",
      keys: ["common.submit", "user.profile.name", "shop.cartSummary"],
    });
  });

  test("Empty array", () => {
    const result = mergeRequirements();
    expect(result).toEqual({
      namespace: "",
      keys: [],
    });
  });

  test("Flatten array of requirements", () => {
    const req1 = { namespace: "common", keys: ["submit"] };
    const req2 = { namespace: "user", keys: ["profile.name"] };
    const req3 = { namespace: "shop", keys: ["cartSummary"] };
    const result = mergeRequirements([req1, req2], req3);
    expect(result).toEqual({
      namespace: "__merged__",
      keys: ["common.submit", "user.profile.name", "shop.cartSummary"],
    });
  });

  test("Flatten multiple arrays of requirements", () => {
    const req1 = { namespace: "common", keys: ["submit"] };
    const req2 = { namespace: "user", keys: ["profile.name"] };
    const req3 = { namespace: "shop", keys: ["cartSummary"] };
    const result = mergeRequirements([req1, req2], [req3]);
    expect(result).toEqual({
      namespace: "__merged__",
      keys: ["common.submit", "user.profile.name", "shop.cartSummary"],
    });
  });

  test("Merge nested mergeRequirements results", () => {
    const req1 = { namespace: "common", keys: ["submit"] };
    const req2 = { namespace: "user", keys: ["profile.name"] };
    const req3 = { namespace: "shop", keys: ["cartSummary"] };
    const req4 = { namespace: "results", keys: ["itemsFound"] };

    const merged1 = mergeRequirements(req1, req2);
    const merged2 = mergeRequirements(req3, req4);
    const allMerged = mergeRequirements(merged1, merged2);

    expect(allMerged).toEqual({
      namespace: "__merged__",
      keys: [
        "common.submit",
        "user.profile.name",
        "shop.cartSummary",
        "results.itemsFound",
      ],
    });
  });

  test("Mix single requirements and arrays", () => {
    const req1 = { namespace: "common", keys: ["submit"] };
    const req2 = { namespace: "user", keys: ["profile.name"] };
    const req3 = { namespace: "shop", keys: ["cartSummary"] };
    const req4 = { namespace: "results", keys: ["itemsFound"] };

    const result = mergeRequirements(req1, [req2, req3], req4);
    expect(result).toEqual({
      namespace: "__merged__",
      keys: [
        "common.submit",
        "user.profile.name",
        "shop.cartSummary",
        "results.itemsFound",
      ],
    });
  });

  test("Flatten single-element array", () => {
    const req = { namespace: "common", keys: ["submit"] };
    const result = mergeRequirements([req]);
    expect(result).toEqual({
      namespace: "__merged__",
      keys: ["common.submit"],
    });
  });

  test("Flatten empty array within arguments", () => {
    const req1 = { namespace: "common", keys: ["submit"] };
    const req2 = { namespace: "user", keys: ["profile.name"] };
    const result = mergeRequirements(req1, [], req2);
    expect(result).toEqual({
      namespace: "__merged__",
      keys: ["common.submit", "user.profile.name"],
    });
  });
});

describe("pickMessages", () => {
  test("Single translation requirement", () => {
    const requirements = [{ namespace: "common", keys: ["submit", "cancel"] }];
    const result = pickMessages(testMessages, requirements);
    expect(result).toEqual({
      "common.submit": "送信",
      "common.cancel": "キャンセル",
    });
  });

  test("Multiple translation requirements", () => {
    const requirements = [
      { namespace: "common", keys: ["submit"] },
      { namespace: "results", keys: ["itemsFound"] },
    ];
    const result = pickMessages(testMessages, requirements);
    expect(result).toEqual({
      "common.submit": "送信",
      "results.itemsFound": "{{count}}件取得しました",
    });
  });

  test("Nested keys", () => {
    const requirements = [
      { namespace: "user", keys: ["profile.name", "profile.email"] },
    ];
    const result = pickMessages(testMessages, requirements);
    expect(result).toEqual({
      "user.profile.name": "名前",
      "user.profile.email": "メールアドレス",
    });
  });

  test("Automatic extraction of plural keys", () => {
    const requirements = [{ namespace: "common", keys: ["itemCount"] }];
    const result = pickMessages(testMessages, requirements);
    expect(result).toEqual({
      "common.itemCount_zero": "アイテムがありません",
      "common.itemCount_one": "1件のアイテム",
      "common.itemCount_other": "{{count}}件のアイテム",
    });
  });

  test("Automatic extraction of nested plural keys", () => {
    const requirements = [{ namespace: "shop", keys: ["cart.item"] }];
    const result = pickMessages(testMessages, requirements);
    expect(result).toEqual({
      "shop.cart.item_zero": "カートは空です",
      "shop.cart.item_one": "1個の商品",
      "shop.cart.item_other": "{{count}}個の商品",
    });
  });

  test("Non-existent key", () => {
    const requirements = [
      // biome-ignore lint/suspicious/noExplicitAny: Testing invalid key handling
      { namespace: "common", keys: ["nonexistent" as any] },
    ];
    const result = pickMessages(testMessages, requirements);
    expect(result).toEqual({});
  });

  test("Non-existent namespace", () => {
    const requirements = [
      // biome-ignore lint/suspicious/noExplicitAny: Testing invalid namespace handling
      { namespace: "nonexistent" as any, keys: ["submit"] },
    ];
    const result = pickMessages(testMessages, requirements);
    expect(result).toEqual({});
  });

  test("Single requirement object (not array)", () => {
    const requirement = { namespace: "common", keys: ["submit", "cancel"] };
    const result = pickMessages(testMessages, requirement);
    expect(result).toEqual({
      "common.submit": "送信",
      "common.cancel": "キャンセル",
    });
  });

  test("Merged requirement from mergeRequirements", () => {
    const req1 = { namespace: "common", keys: ["submit"] };
    const req2 = { namespace: "results", keys: ["itemsFound"] };
    const merged = mergeRequirements(req1, req2);
    const result = pickMessages(testMessages, merged);
    expect(result).toEqual({
      "common.submit": "送信",
      "results.itemsFound": "{{count}}件取得しました",
    });
  });

  test("Merged requirement with nested keys", () => {
    const req1 = { namespace: "user", keys: ["profile.name"] };
    const req2 = { namespace: "shop", keys: ["cartSummary"] };
    const merged = mergeRequirements(req1, req2);
    const result = pickMessages(testMessages, merged);
    expect(result).toEqual({
      "user.profile.name": "名前",
      "shop.cartSummary_zero": "{{user}}さんのカートは空です",
      "shop.cartSummary_one": "{{user}}さんのカートに1個の商品があります",
      "shop.cartSummary_other": "{{user}}さんのカートに{{count}}個の商品があります",
    });
  });
});

describe("createTranslator with TranslationRequirement", () => {
  test("Basic translation", () => {
    const messages: Messages = {
      "common.submit": "送信",
      "common.cancel": "キャンセル",
    };
    const requirement = { namespace: "common", keys: ["submit", "cancel"] };
    const t = createTranslator(messages, requirement);
    expect(t("submit")).toBe("送信");
    expect(t("cancel")).toBe("キャンセル");
  });

  test("Placeholder replacement (single)", () => {
    const messages: Messages = {
      "results.itemsFound": "{{count}}件取得しました",
    };
    const requirement = { namespace: "results", keys: ["itemsFound"] };
    const t = createTranslator(messages, requirement);
    expect(t("itemsFound", { count: 5 })).toBe("5件取得しました");
  });

  test("Placeholder replacement (multiple)", () => {
    const messages: Messages = {
      "results.greeting": "こんにちは、{{name}}さん",
    };
    const requirement = { namespace: "results", keys: ["greeting"] };
    const t = createTranslator(messages, requirement);
    expect(t("greeting", { name: "田中" })).toBe("こんにちは、田中さん");
  });

  test("Plural handling (count = 0)", () => {
    const messages: Messages = {
      "common.itemCount_zero": "アイテムがありません",
      "common.itemCount_one": "1件のアイテム",
      "common.itemCount_other": "{{count}}件のアイテム",
    };
    const requirement = { namespace: "common", keys: ["itemCount"] };
    const t = createTranslator(messages, requirement);
    expect(t("itemCount", { count: 0 })).toBe("アイテムがありません");
  });

  test("Plural handling (count = 1)", () => {
    const messages: Messages = {
      "common.itemCount_zero": "アイテムがありません",
      "common.itemCount_one": "1件のアイテム",
      "common.itemCount_other": "{{count}}件のアイテム",
    };
    const requirement = { namespace: "common", keys: ["itemCount"] };
    const t = createTranslator(messages, requirement);
    expect(t("itemCount", { count: 1 })).toBe("1件のアイテム");
  });

  test("Plural handling (count = 2+)", () => {
    const messages: Messages = {
      "common.itemCount_zero": "アイテムがありません",
      "common.itemCount_one": "1件のアイテム",
      "common.itemCount_other": "{{count}}件のアイテム",
    };
    const requirement = { namespace: "common", keys: ["itemCount"] };
    const t = createTranslator(messages, requirement);
    expect(t("itemCount", { count: 5 })).toBe("5件のアイテム");
    expect(t("itemCount", { count: 100 })).toBe("100件のアイテム");
  });

  test("Combination of plurals + placeholders", () => {
    const messages: Messages = {
      "shop.cartSummary_zero": "{{user}}さんのカートは空です",
      "shop.cartSummary_one": "{{user}}さんのカートに1個の商品があります",
      "shop.cartSummary_other":
        "{{user}}さんのカートに{{count}}個の商品があります",
    };
    const requirement = { namespace: "shop", keys: ["cartSummary"] };
    const t = createTranslator(messages, requirement);
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
      "common.itemCount_other": "{{count}}件のアイテム",
    };
    const requirement = { namespace: "common", keys: ["itemCount"] };
    const t = createTranslator(messages, requirement);
    // If count === 0 and _zero is not available, fallback to _other
    expect(t("itemCount", { count: 0 })).toBe("0件のアイテム");
    // If count === 1, _one is required so not found (react-i18next compatible)
    expect(t("itemCount", { count: 1 })).toBe("itemCount");
    expect(t("itemCount", { count: 5 })).toBe("5件のアイテム");
  });

  test("Partial plural keys (_one and _other only)", () => {
    const messages: Messages = {
      "common.itemCount_one": "1件のアイテム",
      "common.itemCount_other": "{{count}}件のアイテム",
    };
    const requirement = { namespace: "common", keys: ["itemCount"] };
    const t = createTranslator(messages, requirement);
    expect(t("itemCount", { count: 0 })).toBe("0件のアイテム");
    expect(t("itemCount", { count: 1 })).toBe("1件のアイテム");
    expect(t("itemCount", { count: 5 })).toBe("5件のアイテム");
  });

  test("Non-existent key", () => {
    const messages: Messages = {
      "common.submit": "送信",
    };
    const requirement = {
      namespace: "common",
      keys: [
        "submit",
        // biome-ignore lint/suspicious/noExplicitAny: Testing invalid key handling
        "nonexistent" as any,
      ],
    };
    const t = createTranslator(messages, requirement);
    // biome-ignore lint/suspicious/noExplicitAny: Testing invalid key handling
    expect(t("nonexistent" as any)).toBe("nonexistent");
  });

  test("Multiple uses of same placeholder", () => {
    const messages: Messages = {
      "results.greeting":
        "{{name}}さん、こんにちは。{{name}}さんの注文を確認します。",
    };
    const requirement = { namespace: "results", keys: ["greeting"] };
    const t = createTranslator(messages, requirement);
    expect(t("greeting", { name: "田中" })).toBe(
      "田中さん、こんにちは。田中さんの注文を確認します。"
    );
  });

  test("Number to string conversion", () => {
    const messages: Messages = {
      "results.itemsFound": "価格: {{price}}円",
    };
    const requirement = { namespace: "results", keys: ["itemsFound"] };
    const t = createTranslator(messages, requirement);
    expect(t("itemsFound", { price: 1000 })).toBe("価格: 1000円");
  });
});

describe("Edge cases", () => {
  test("Plural with negative number", () => {
    const messages: Messages = {
      "common.itemCount_zero": "アイテムがありません",
      "common.itemCount_one": "1件のアイテム",
      "common.itemCount_other": "{{count}}件のアイテム",
    };
    const requirement = { namespace: "common", keys: ["itemCount"] };
    const t = createTranslator(messages, requirement);
    expect(t("itemCount", { count: -1 })).toBe("-1件のアイテム");
  });

  test("Plural with decimal number", () => {
    const messages: Messages = {
      "common.itemCount_zero": "アイテムがありません",
      "common.itemCount_one": "1件のアイテム",
      "common.itemCount_other": "{{count}}件のアイテム",
    };
    const requirement = { namespace: "common", keys: ["itemCount"] };
    const t = createTranslator(messages, requirement);
    expect(t("itemCount", { count: 0.5 })).toBe("0.5件のアイテム");
  });
});
