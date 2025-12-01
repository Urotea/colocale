import { describe, expect, test } from "bun:test";
import {
  mergeRequirements,
  pickMessages,
  createTranslator,
  type TranslationRequirement,
  type TranslationFile,
  type Messages,
} from "./index";

// テスト用の翻訳ファイル
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
  test("単一の翻訳要求をマージ", () => {
    const req: TranslationRequirement = {
      keys: ["submit"],
      namespace: "common",
    };
    const result = mergeRequirements(req);
    expect(result).toEqual([req]);
  });

  test("複数の翻訳要求をマージ", () => {
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

  test("配列をフラット化", () => {
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

  test("ネストした配列をフラット化", () => {
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

  test("空配列", () => {
    const result = mergeRequirements();
    expect(result).toEqual([]);
  });
});

describe("pickMessages", () => {
  test("単一の翻訳要求", () => {
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

  test("複数の翻訳要求", () => {
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

  test("ネストしたキー", () => {
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

  test("複数形キーの自動抽出", () => {
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

  test("ネストした複数形キーの自動抽出", () => {
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

  test("存在しないキー", () => {
    const requirements: TranslationRequirement[] = [
      {
        keys: ["nonexistent"],
        namespace: "common",
      },
    ];
    const result = pickMessages(testMessages, requirements);
    expect(result).toEqual({});
  });

  test("存在しない名前空間", () => {
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
  test("基本的な翻訳", () => {
    const messages: Messages = {
      "common.submit": "送信",
      "common.cancel": "キャンセル",
    };
    const t = createTranslator(messages, "common");
    expect(t("submit")).toBe("送信");
    expect(t("cancel")).toBe("キャンセル");
  });

  test("プレースホルダー置換（単一）", () => {
    const messages: Messages = {
      "results.itemsFound": "{count}件取得しました",
    };
    const t = createTranslator(messages, "results");
    expect(t("itemsFound", { count: 5 })).toBe("5件取得しました");
  });

  test("プレースホルダー置換（複数）", () => {
    const messages: Messages = {
      "results.greeting": "こんにちは、{name}さん",
    };
    const t = createTranslator(messages, "results");
    expect(t("greeting", { name: "田中" })).toBe("こんにちは、田中さん");
  });

  test("複数形処理（count = 0）", () => {
    const messages: Messages = {
      "common.itemCount_zero": "アイテムがありません",
      "common.itemCount_one": "1件のアイテム",
      "common.itemCount_other": "{count}件のアイテム",
    };
    const t = createTranslator(messages, "common");
    expect(t("itemCount", { count: 0 })).toBe("アイテムがありません");
  });

  test("複数形処理（count = 1）", () => {
    const messages: Messages = {
      "common.itemCount_zero": "アイテムがありません",
      "common.itemCount_one": "1件のアイテム",
      "common.itemCount_other": "{count}件のアイテム",
    };
    const t = createTranslator(messages, "common");
    expect(t("itemCount", { count: 1 })).toBe("1件のアイテム");
  });

  test("複数形処理（count = 2+）", () => {
    const messages: Messages = {
      "common.itemCount_zero": "アイテムがありません",
      "common.itemCount_one": "1件のアイテム",
      "common.itemCount_other": "{count}件のアイテム",
    };
    const t = createTranslator(messages, "common");
    expect(t("itemCount", { count: 5 })).toBe("5件のアイテム");
    expect(t("itemCount", { count: 100 })).toBe("100件のアイテム");
  });

  test("複数形 + プレースホルダーの組み合わせ", () => {
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

  test("部分的な複数形キー（_otherのみ）", () => {
    const messages: Messages = {
      "common.itemCount_other": "{count}件のアイテム",
    };
    const t = createTranslator(messages, "common");
    // count === 0 の場合、_zero がなければ _other にフォールバック
    expect(t("itemCount", { count: 0 })).toBe("0件のアイテム");
    // count === 1 の場合、_one が必須なので見つからない（react-i18next互換）
    expect(t("itemCount", { count: 1 })).toBe("itemCount");
    expect(t("itemCount", { count: 5 })).toBe("5件のアイテム");
  });

  test("部分的な複数形キー（_oneと_otherのみ）", () => {
    const messages: Messages = {
      "common.itemCount_one": "1件のアイテム",
      "common.itemCount_other": "{count}件のアイテム",
    };
    const t = createTranslator(messages, "common");
    expect(t("itemCount", { count: 0 })).toBe("0件のアイテム");
    expect(t("itemCount", { count: 1 })).toBe("1件のアイテム");
    expect(t("itemCount", { count: 5 })).toBe("5件のアイテム");
  });

  test("存在しないキー", () => {
    const messages: Messages = {
      "common.submit": "送信",
    };
    const t = createTranslator(messages, "common");
    expect(t("nonexistent")).toBe("nonexistent");
  });

  test("同一プレースホルダーの複数使用", () => {
    const messages: Messages = {
      "test.repeated": "{name}さん、こんにちは。{name}さんの注文を確認します。",
    };
    const t = createTranslator(messages, "test");
    expect(t("repeated", { name: "田中" })).toBe(
      "田中さん、こんにちは。田中さんの注文を確認します。"
    );
  });

  test("数値の文字列変換", () => {
    const messages: Messages = {
      "test.number": "価格: {price}円",
    };
    const t = createTranslator(messages, "test");
    expect(t("number", { price: 1000 })).toBe("価格: 1000円");
  });
});

describe("エッジケース", () => {
  test("負の数での複数形", () => {
    const messages: Messages = {
      "common.itemCount_zero": "アイテムがありません",
      "common.itemCount_one": "1件のアイテム",
      "common.itemCount_other": "{count}件のアイテム",
    };
    const t = createTranslator(messages, "common");
    expect(t("itemCount", { count: -1 })).toBe("-1件のアイテム");
  });

  test("小数での複数形", () => {
    const messages: Messages = {
      "common.itemCount_zero": "アイテムがありません",
      "common.itemCount_one": "1件のアイテム",
      "common.itemCount_other": "{count}件のアイテム",
    };
    const t = createTranslator(messages, "common");
    expect(t("itemCount", { count: 0.5 })).toBe("0.5件のアイテム");
  });
});
