import { describe, expect, test } from "bun:test";
import {
  type Messages,
  createTranslator,
  defineRequirement,
} from "./index";

// Test translation messages
const testMessages: Messages = {
  "site.list.itemsCount": "{{count}} items found",
  "site.header.title": "Welcome",
  "site.footer.copyright": "© 2023",
};

describe("Type constraint preservation", () => {
  test("defineRequirement should preserve literal types", () => {
    const headerItemTranslations = defineRequirement("site", [
      "list.itemsCount",
    ] as const);
    const t = createTranslator(testMessages, headerItemTranslations);

    // Valid key should work
    expect(t("list.itemsCount", { count: 5 })).toBe("5 items found");

    // This should be a type error for invalid key
    // @ts-expect-error - Should be a type error for invalid key
    expect(t("invalid.key")).toBe("invalid.key");
  });

  test("Multiple keys should all be typed correctly", () => {
    const translations = defineRequirement("site", [
      "list.itemsCount",
      "header.title",
    ] as const);
    const t = createTranslator(testMessages, translations);

    expect(t("list.itemsCount", { count: 3 })).toBe("3 items found");
    expect(t("header.title")).toBe("Welcome");

    // This should be a type error because footer.copyright is not in the requirement
    // @ts-expect-error - Should be a type error for invalid key
    expect(t("footer.copyright")).toBe("© 2023");
  });

  test("Type constraint works with const assertion", () => {
    // Using const assertion to preserve literal types
    const keys = ["list.itemsCount", "header.title"] as const;
    const translations = defineRequirement("site", keys);
    const t = createTranslator(testMessages, translations);

    // Valid keys should work
    expect(t("list.itemsCount", { count: 10 })).toBe("10 items found");
    expect(t("header.title")).toBe("Welcome");

    // Invalid key should be a type error because it's not in the requirement
    // @ts-expect-error - Should be a type error for invalid key
    expect(t("footer.copyright")).toBe("© 2023");
  });

  test("Type constraint allows only defined keys in auto-complete", () => {
    const translations = defineRequirement("site", [
      "list.itemsCount",
      "header.title",
    ] as const);
    const t = createTranslator(testMessages, translations);

    // The TypeScript compiler should only allow these two keys:
    // - "list.itemsCount"
    // - "header.title"
    // Any other key should cause a type error

    // Valid usage
    expect(t("list.itemsCount", { count: 1 })).toBe("1 items found");
    expect(t("header.title")).toBe("Welcome");
  });
});
