import { describe, expect, test } from "bun:test";
import type { LocaleTranslations, Messages } from "./index";
import {
  createTranslator,
  InvalidPlaceholderError,
  pickMessages,
} from "./index";

// Keys that every plain object inherits from Object.prototype. Looking them up
// with `in` or a bare index access finds a function or the prototype itself,
// neither of which is a translation.
const INHERITED_KEYS = [
  "toString",
  "constructor",
  "valueOf",
  "hasOwnProperty",
  "__proto__",
];

const messages: Messages = {
  locale: "en",
  translations: { "common.submit": "Submit" },
};

describe("keys inherited from Object.prototype", () => {
  test("An unconstrained translator returns the key itself, as for any missing message", () => {
    const t = createTranslator(messages);

    for (const key of INHERITED_KEYS) {
      expect(t(key)).toBe(key);
    }
  });

  test("The plural path also treats an inherited key as missing", () => {
    const t = createTranslator(messages);

    for (const key of INHERITED_KEYS) {
      expect(t(key, { count: 1 })).toBe(key);
    }
  });

  test("A namespaced translator is unaffected as well", () => {
    const requirement = { namespace: "common", keys: ["submit"] } as const;
    const t = createTranslator(messages, requirement) as (
      key: string
    ) => string;

    for (const key of INHERITED_KEYS) {
      expect(t(key)).toBe(key);
    }
    expect(t("submit")).toBe("Submit");
  });

  test("pickMessages does not invent translations for an inherited namespace", () => {
    const allMessages: LocaleTranslations = {
      en: { common: { submit: "Submit" } },
    };

    for (const namespace of INHERITED_KEYS) {
      const result = pickMessages(
        allMessages,
        { namespace, keys: ["name", "length", "itemCount"] },
        "en"
      );
      expect(result.translations).toEqual({});
    }
  });

  test("pickMessages does not invent translations for an inherited locale", () => {
    const allMessages: LocaleTranslations = {
      en: { common: { submit: "Submit" } },
    };
    const requirement = { namespace: "common", keys: ["submit"] };

    for (const locale of INHERITED_KEYS) {
      expect(pickMessages(allMessages, requirement, locale)).toEqual({
        locale,
        translations: {},
      });
      expect(pickMessages(allMessages, null, locale)).toEqual({
        locale,
        translations: {},
      });
    }
  });

  test("A missing {{toString}} placeholder is reported, not silently left in place", () => {
    const t = createTranslator({
      locale: "en",
      translations: { "common.greet": "Hello {{toString}}" },
    });

    expect(() => t("common.greet", { name: "Ada" })).toThrow(
      InvalidPlaceholderError
    );
    expect(t("common.greet", { toString: "Ada" })).toBe("Hello Ada");
  });
});

describe("translations that really do use those names", () => {
  // JSON.parse creates own properties, so a translation file may legitimately
  // contain a namespace or key named __proto__ - exactly what the loader stores.
  // The fixture has to be parsed from text: in an object literal `__proto__`
  // sets the prototype instead of adding a property, quoted or not.
  const allMessages: LocaleTranslations = JSON.parse(`{
    "en": {
      "__proto__": { "submit": "Submit" },
      "common": {
        "__proto__": "Proto",
        "toString": "Text",
        "constructor": "Ctor"
      }
    }
  }`);

  test("A namespace named __proto__ resolves", () => {
    const result = pickMessages(
      allMessages,
      { namespace: "__proto__", keys: ["submit"] },
      "en"
    );
    expect(result.translations).toEqual({ "__proto__.submit": "Submit" });
  });

  test("Keys named __proto__, toString and constructor resolve", () => {
    const requirement = {
      namespace: "common",
      keys: ["__proto__", "toString", "constructor"],
    } as const;
    const result = pickMessages(allMessages, requirement, "en");

    expect(result.translations).toEqual({
      "common.__proto__": "Proto",
      "common.toString": "Text",
      "common.constructor": "Ctor",
    });

    const t = createTranslator(result, requirement);
    expect(t("__proto__")).toBe("Proto");
    expect(t("toString")).toBe("Text");
    expect(t("constructor")).toBe("Ctor");
  });

  test("Picking every translation of a locale includes them", () => {
    const result = pickMessages(allMessages, null, "en");

    expect(result.translations).toEqual({
      "__proto__.submit": "Submit",
      "common.__proto__": "Proto",
      "common.toString": "Text",
      "common.constructor": "Ctor",
    });
  });
});
