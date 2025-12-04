import { describe, expect, test } from "bun:test";
import { generateTypescriptInterface } from "./codegen";
import type { TranslationFile } from "../types";

describe("generateTypescriptInterface", () => {
  test("should exclude object keys from TranslationKeys", () => {
    const translations: TranslationFile = {
      test: {
        message: {
          test: "message",
        },
      },
    };

    const result = generateTypescriptInterface(translations);

    // Should include nested string keys
    expect(result).toContain('"test.message.test"');

    // Should NOT include object keys
    expect(result).not.toContain('"test.message"');
  });

  test("should include direct string keys", () => {
    const translations: TranslationFile = {
      common: {
        submit: "Submit",
        cancel: "Cancel",
      },
    };

    const result = generateTypescriptInterface(translations);

    // Should include direct string keys
    expect(result).toContain('"common.submit"');
    expect(result).toContain('"common.cancel"');
  });

  test("should handle mix of direct and nested keys", () => {
    const translations: TranslationFile = {
      test: {
        directKey: "direct value",
        nested: {
          key1: "nested value 1",
          key2: "nested value 2",
        },
        anotherDirect: "another direct value",
      },
    };

    const result = generateTypescriptInterface(translations);

    // Should include direct string keys
    expect(result).toContain('"test.directKey"');
    expect(result).toContain('"test.anotherDirect"');

    // Should include nested string keys
    expect(result).toContain('"test.nested.key1"');
    expect(result).toContain('"test.nested.key2"');

    // Should NOT include object keys
    expect(result).not.toContain('"test.nested"');
  });

  test("should exclude object keys from namespace-specific keys", () => {
    const translations: TranslationFile = {
      user: {
        profile: {
          name: "Name",
          email: "Email",
        },
      },
    };

    const result = generateTypescriptInterface(translations);

    // Check that UserKeys only includes nested string keys
    const userKeysMatch = result.match(/type UserKeys = ([^;]+);/);
    expect(userKeysMatch).not.toBeNull();

    if (userKeysMatch) {
      const userKeys = userKeysMatch[1];

      // Should include nested string keys
      expect(userKeys).toContain('"profile.name"');
      expect(userKeys).toContain('"profile.email"');

      // Should NOT include object key
      expect(userKeys).not.toContain('"profile"');
    }
  });

  test("should handle plural keys correctly", () => {
    const translations: TranslationFile = {
      common: {
        itemCount_one: "1 item",
        itemCount_other: "{{count}} items",
      },
    };

    const result = generateTypescriptInterface(translations);

    // Should include base key without plural suffix
    expect(result).toContain('"common.itemCount"');

    // Should NOT include keys with plural suffix
    expect(result).not.toContain('"common.itemCount_one"');
    expect(result).not.toContain('"common.itemCount_other"');
  });

  test("should handle nested keys with plural suffixes", () => {
    const translations: TranslationFile = {
      shop: {
        cart: {
          itemCount_one: "1 item in cart",
          itemCount_other: "{{count}} items in cart",
        },
      },
    };

    const result = generateTypescriptInterface(translations);

    // Should include base nested key without plural suffix
    expect(result).toContain('"shop.cart.itemCount"');

    // Should NOT include object key
    expect(result).not.toContain('"shop.cart"');

    // Should NOT include keys with plural suffix
    expect(result).not.toContain('"shop.cart.itemCount_one"');
    expect(result).not.toContain('"shop.cart.itemCount_other"');
  });

  test("should generate correct interface structure", () => {
    const translations: TranslationFile = {
      user: {
        profile: {
          name: "Name",
          email: "Email",
        },
      },
    };

    const result = generateTypescriptInterface(translations);

    // Interface structure should still include nested objects
    expect(result).toContain('interface UserMessages {');
    expect(result).toContain('"profile": UserProfileMessages;');
    expect(result).toContain('interface UserProfileMessages {');
    expect(result).toContain('"name": string;');
    expect(result).toContain('"email": string;');
  });

  test("should handle multiple namespaces correctly", () => {
    const translations: TranslationFile = {
      common: {
        submit: "Submit",
        cancel: "Cancel",
      },
      user: {
        profile: {
          name: "Name",
        },
      },
    };

    const result = generateTypescriptInterface(translations);

    // Should include direct keys from common namespace
    expect(result).toContain('"common.submit"');
    expect(result).toContain('"common.cancel"');

    // Should include nested keys from user namespace
    expect(result).toContain('"user.profile.name"');

    // Should NOT include object key from user namespace
    expect(result).not.toContain('"user.profile"');
  });

  test("should not generate KeysForNamespace type", () => {
    const translations: TranslationFile = {
      common: {
        submit: "Submit",
        cancel: "Cancel",
      },
      user: {
        profile: {
          name: "Name",
        },
      },
    };

    const result = generateTypescriptInterface(translations);

    // Should NOT generate KeysForNamespace type
    expect(result).not.toContain("type KeysForNamespace");

    // Should still generate namespace-specific key types
    expect(result).toContain("type CommonKeys");
    expect(result).toContain("type UserKeys");
  });
});
