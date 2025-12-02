import { describe, test, expect } from "bun:test";
import { validateCrossLocale } from "./validation";
import type { LocaleTranslations } from "./cli/loader";

describe("validateCrossLocale", () => {
  test("should pass when all locales have matching keys", () => {
    const localeTranslations: LocaleTranslations = {
      en: {
        common: {
          submit: "Submit",
          cancel: "Cancel",
        },
      },
      ja: {
        common: {
          submit: "送信",
          cancel: "キャンセル",
        },
      },
    };

    const result = validateCrossLocale(localeTranslations);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("should detect missing keys in target locale", () => {
    const localeTranslations: LocaleTranslations = {
      en: {
        common: {
          submit: "Submit",
          cancel: "Cancel",
        },
      },
      ja: {
        common: {
          submit: "送信",
        },
      },
    };

    const result = validateCrossLocale(localeTranslations);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe("missing-key");
    expect(result.errors[0].key).toBe("cancel");
    expect(result.errors[0].locale).toBe("ja");
    expect(result.errors[0].referenceLocale).toBe("en");
  });

  test("should detect extra keys in target locale", () => {
    const localeTranslations: LocaleTranslations = {
      en: {
        common: {
          submit: "Submit",
        },
      },
      ja: {
        common: {
          submit: "送信",
          cancel: "キャンセル",
        },
      },
    };

    const result = validateCrossLocale(localeTranslations);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe("extra-key");
    expect(result.errors[0].key).toBe("cancel");
    expect(result.errors[0].locale).toBe("ja");
  });

  test("should handle nested keys correctly", () => {
    const localeTranslations: LocaleTranslations = {
      en: {
        user: {
          profile: {
            name: "Name",
            email: "Email",
          },
        },
      },
      ja: {
        user: {
          profile: {
            name: "名前",
          },
        },
      },
    };

    const result = validateCrossLocale(localeTranslations);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].key).toBe("profile.email");
  });

  test("should check multiple namespaces", () => {
    const localeTranslations: LocaleTranslations = {
      en: {
        common: {
          submit: "Submit",
        },
        user: {
          name: "Name",
        },
      },
      ja: {
        common: {
          cancel: "キャンセル",
        },
        user: {
          name: "名前",
        },
      },
    };

    const result = validateCrossLocale(localeTranslations);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
    // en has submit but ja doesn't
    expect(result.errors[0].type).toBe("missing-key");
    expect(result.errors[0].key).toBe("submit");
    // ja has cancel but en doesn't
    expect(result.errors[1].type).toBe("extra-key");
    expect(result.errors[1].key).toBe("cancel");
  });

  test("should return valid for single locale", () => {
    const localeTranslations: LocaleTranslations = {
      en: {
        common: {
          submit: "Submit",
        },
      },
    };

    const result = validateCrossLocale(localeTranslations);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("should handle plural keys", () => {
    const localeTranslations: LocaleTranslations = {
      en: {
        common: {
          itemCount_one: "1 item",
          itemCount_other: "{count} items",
        },
      },
      ja: {
        common: {
          itemCount_one: "1件のアイテム",
        },
      },
    };

    const result = validateCrossLocale(localeTranslations);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].key).toBe("itemCount_other");
  });
});
