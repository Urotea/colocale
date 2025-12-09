import { describe, expect, test } from "bun:test";
import type { LocaleTranslations, Messages } from "./index";
import { pickMessages } from "./index";

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
    // biome-ignore lint/suspicious/noExplicitAny: Testing non-existent locale
    const result = pickMessages(localeGroupedMessages, requirements, "fr" as any);
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
