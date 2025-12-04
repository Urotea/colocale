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
};

describe("Type constraint preservation", () => {
  test("defineRequirement should preserve literal types", () => {
    const headerItemTranslations = defineRequirement("site", [
      "list.itemsCount",
    ]);
    const t = createTranslator(testMessages, headerItemTranslations);

    // Valid key should work
    expect(t("list.itemsCount", { count: 5 })).toBe("5 items found");

    // This should ideally be a type error but currently isn't
    // @ts-expect-error - Should be a type error for invalid key
    expect(t("invalid.key")).toBe("invalid.key");
  });

  test("Multiple keys should all be typed correctly", () => {
    const translations = defineRequirement("site", [
      "list.itemsCount",
      "header.title",
    ]);
    const t = createTranslator(testMessages, translations);

    expect(t("list.itemsCount", { count: 3 })).toBe("3 items found");
    expect(t("header.title")).toBe("Welcome");

    // This should be a type error
    // @ts-expect-error - Should be a type error for invalid key
    expect(t("nonexistent.key")).toBe("nonexistent.key");
  });
});
