import { describe, expect, test } from "bun:test";
import type { Locale, LocaleTranslations, Messages } from "./index";
import { createTranslator, pickMessages } from "./index";

// Locale accepts any BCP 47 language tag, so translations are not limited to en/ja
const allMessages: LocaleTranslations = {
  fr: {
    common: {
      submit: "Envoyer",
      itemCount_one: "{{count}} article",
      itemCount_other: "{{count}} articles",
    },
  },
  "en-US": {
    common: {
      submit: "Submit",
      itemCount_one: "{{count}} item",
      itemCount_other: "{{count}} items",
    },
  },
  "zh-Hant-TW": {
    common: {
      submit: "送出",
      itemCount_one: "{{count}} 個項目",
      itemCount_other: "{{count}} 個項目",
    },
  },
  ru: {
    common: {
      submit: "Отправить",
      itemCount_one: "{{count}} товар",
      itemCount_other: "{{count}} товаров",
    },
  },
};

const commonRequirement = {
  namespace: "common",
  keys: ["submit", "itemCount"],
} as const;

describe("arbitrary locales", () => {
  test("Locale accepts any language tag, not only en/ja", () => {
    for (const locale of ["fr", "en-US", "zh-Hant-TW", "ru"]) {
      const messages = pickMessages(allMessages, commonRequirement, locale);
      const t = createTranslator(messages, commonRequirement);
      expect(messages.locale).toBe(locale);
      expect(t("submit")).not.toBe("submit");
    }
  });

  test("A locale variable typed as string is accepted (e.g. a route param)", () => {
    const localeFromRoute: string = "fr";
    const messages = pickMessages(
      allMessages,
      commonRequirement,
      localeFromRoute
    );
    expect(createTranslator(messages, commonRequirement)("submit")).toBe(
      "Envoyer"
    );
  });

  test("Plural rules follow the given locale (fr treats 0 as singular)", () => {
    const t = createTranslator(
      pickMessages(allMessages, commonRequirement, "fr"),
      commonRequirement
    );
    // Intl.PluralRules("fr").select(0) === "one", unlike English
    expect(t("itemCount", { count: 0 })).toBe("0 article");
    expect(t("itemCount", { count: 1 })).toBe("1 article");
    expect(t("itemCount", { count: 2 })).toBe("2 articles");
  });

  test("Regional tags resolve plural rules through their base language", () => {
    const t = createTranslator(
      pickMessages(allMessages, commonRequirement, "en-US"),
      commonRequirement
    );
    expect(t("itemCount", { count: 1 })).toBe("1 item");
    expect(t("itemCount", { count: 5 })).toBe("5 items");
  });

  test("Locales with extra plural categories fall back to the _other form", () => {
    const t = createTranslator(
      pickMessages(allMessages, commonRequirement, "ru"),
      commonRequirement
    );
    // Intl.PluralRules("ru").select(2) === "few", which has no suffix support
    expect(t("itemCount", { count: 2 })).toBe("2 товаров");
    expect(t("itemCount", { count: 1 })).toBe("1 товар");
  });

  test("A malformed locale tag falls back to _other instead of throwing", () => {
    const messages: Messages = {
      locale: "not a locale!!",
      translations: {
        "common.itemCount_one": "{{count}} item",
        "common.itemCount_other": "{{count}} items",
      },
    };
    const t = createTranslator(messages, commonRequirement);
    expect(t("itemCount", { count: 1 })).toBe("1 items");
  });

  test("An application can still constrain locales with its own union", () => {
    type AppLocale = "en-US" | "fr";
    const messages: Messages<AppLocale> = pickMessages(
      allMessages,
      commonRequirement,
      "fr"
    );
    expect(messages.locale).toBe("fr");

    // Messages<AppLocale> is assignable to the unconstrained Messages
    const widened: Messages = messages;
    expect(widened.locale).toBe("fr");

    const locale: Locale = "de-CH";
    expect(typeof locale).toBe("string");
  });
});
