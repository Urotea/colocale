import { describe, expect, test } from "bun:test";
import type { LocaleTranslations } from "./index";
import { createTranslator, pickMessages } from "./index";

// Test locale-grouped translation structure
const localeGroupedMessages: LocaleTranslations = {
  ja: {
    common: {
      submit: "送信",
      cancel: "キャンセル",
      itemCount_one: "1件のアイテム",
      itemCount_other: "{{count}}件のアイテム",
    },
    user: {
      "profile.name": "名前",
      "profile.email": "メールアドレス",
    },
  },
  en: {
    common: {
      submit: "Submit",
      cancel: "Cancel",
      itemCount_one: "1 item",
      itemCount_other: "{{count}} items",
    },
    user: {
      "profile.name": "Name",
      "profile.email": "Email",
    },
  },
};

describe("pickMessages with locale-grouped format", () => {
  test("Extract Japanese translations from locale-grouped format", () => {
    const requirements = [{ namespace: "common", keys: ["submit", "cancel"] }];
    const result = pickMessages(localeGroupedMessages, requirements, "ja");
    expect(result).toEqual({
      locale: "ja",
      translations: {
        "common.submit": "送信",
        "common.cancel": "キャンセル",
      },
    });
  });

  test("Extract English translations from locale-grouped format", () => {
    const requirements = [{ namespace: "common", keys: ["submit", "cancel"] }];
    const result = pickMessages(localeGroupedMessages, requirements, "en");
    expect(result).toEqual({
      locale: "en",
      translations: {
        "common.submit": "Submit",
        "common.cancel": "Cancel",
      },
    });
  });

  test("Extract nested keys from locale-grouped format", () => {
    const requirements = [
      { namespace: "user", keys: ["profile.name", "profile.email"] },
    ];
    const result = pickMessages(localeGroupedMessages, requirements, "ja");
    expect(result).toEqual({
      locale: "ja",
      translations: {
        "user.profile.name": "名前",
        "user.profile.email": "メールアドレス",
      },
    });
  });

  test("Extract plural keys from locale-grouped format", () => {
    const requirements = [{ namespace: "common", keys: ["itemCount"] }];
    const result = pickMessages(localeGroupedMessages, requirements, "ja");
    expect(result).toEqual({
      locale: "ja",
      translations: {
        "common.itemCount_one": "1件のアイテム",
        "common.itemCount_other": "{{count}}件のアイテム",
      },
    });
  });

  test("Extract multiple namespaces from locale-grouped format", () => {
    const requirements = [
      { namespace: "common", keys: ["submit"] },
      { namespace: "user", keys: ["profile.name"] },
    ];
    const result = pickMessages(localeGroupedMessages, requirements, "en");
    expect(result).toEqual({
      locale: "en",
      translations: {
        "common.submit": "Submit",
        "user.profile.name": "Name",
      },
    });
  });

  test("Non-existent locale returns empty translations", () => {
    const requirements = [{ namespace: "common", keys: ["submit"] }];
    const result = pickMessages(
      localeGroupedMessages,
      requirements,
      // biome-ignore lint/suspicious/noExplicitAny: Testing non-existent locale
      "fr" as any
    );
    expect(result).toEqual({
      locale: "fr",
      translations: {},
    });
  });

  test("Single requirement object (not array) works with locale-grouped format", () => {
    const requirement = { namespace: "common", keys: ["submit"] };
    const result = pickMessages(localeGroupedMessages, requirement, "ja");
    expect(result).toEqual({
      locale: "ja",
      translations: {
        "common.submit": "送信",
      },
    });
  });
});

describe("pickMessages with null requirements", () => {
  test("Pick all Japanese translations across every namespace", () => {
    const result = pickMessages(localeGroupedMessages, null, "ja");
    expect(result).toEqual({
      locale: "ja",
      translations: {
        "common.submit": "送信",
        "common.cancel": "キャンセル",
        "common.itemCount_one": "1件のアイテム",
        "common.itemCount_other": "{{count}}件のアイテム",
        "user.profile.name": "名前",
        "user.profile.email": "メールアドレス",
      },
    });
  });

  test("Pick all English translations across every namespace", () => {
    const result = pickMessages(localeGroupedMessages, null, "en");
    expect(result).toEqual({
      locale: "en",
      translations: {
        "common.submit": "Submit",
        "common.cancel": "Cancel",
        "common.itemCount_one": "1 item",
        "common.itemCount_other": "{{count}} items",
        "user.profile.name": "Name",
        "user.profile.email": "Email",
      },
    });
  });

  test("Only the specified locale is picked", () => {
    const result = pickMessages(localeGroupedMessages, null, "ja");
    expect(Object.values(result.translations)).not.toContain("Submit");
  });

  test("Non-existent locale returns empty translations", () => {
    const result = pickMessages(
      localeGroupedMessages,
      null,
      // biome-ignore lint/suspicious/noExplicitAny: Testing non-existent locale
      "fr" as any
    );
    expect(result).toEqual({
      locale: "fr",
      translations: {},
    });
  });

  test("Locale with no namespaces returns empty translations", () => {
    const result = pickMessages({ ja: {} }, null, "ja");
    expect(result).toEqual({
      locale: "ja",
      translations: {},
    });
  });

  test("Non-string values are skipped", () => {
    const messages = {
      ja: {
        common: {
          submit: "送信",
          // biome-ignore lint/suspicious/noExplicitAny: Testing invalid value type
          nested: { name: "名前" } as any,
        },
      },
    };
    const result = pickMessages(messages, null, "ja");
    expect(result).toEqual({
      locale: "ja",
      translations: {
        "common.submit": "送信",
      },
    });
  });

  test("createTranslator works with messages picked via null", () => {
    const messages = pickMessages(localeGroupedMessages, null, "ja");
    const t = createTranslator(messages, {
      namespace: "common",
      keys: ["submit", "itemCount"],
    });
    expect(t("submit")).toBe("送信");
    expect(t("itemCount", { count: 3 })).toBe("3件のアイテム");
  });
});
