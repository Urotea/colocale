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
    expect(result).toContain('"message.test"');

    // Should NOT include object keys in the Keys type
    const testKeysMatch = result.match(/type TestKeys = ([^;]+);/);
    expect(testKeysMatch).not.toBeNull();
    if (testKeysMatch) {
      const testKeys = testKeysMatch[1];
      expect(testKeys).not.toContain('"message"');
      expect(testKeys).toContain('"message.test"');
    }
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
    expect(result).toContain('"submit"');
    expect(result).toContain('"cancel"');
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
    expect(result).toContain('"directKey"');
    expect(result).toContain('"anotherDirect"');

    // Should include nested string keys
    expect(result).toContain('"nested.key1"');
    expect(result).toContain('"nested.key2"');

    // Should NOT include object keys
    expect(result).not.toContain('"nested" |');
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
    expect(result).toContain('"itemCount"');

    // Should NOT include keys with plural suffix
    expect(result).not.toContain('"itemCount_one"');
    expect(result).not.toContain('"itemCount_other"');
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
    expect(result).toContain('"cart.itemCount"');

    // Should NOT include object key
    expect(result).not.toContain('"cart" |');

    // Should NOT include keys with plural suffix
    expect(result).not.toContain('"cart.itemCount_one"');
    expect(result).not.toContain('"cart.itemCount_other"');
  });

  test("should not generate namespace interfaces", () => {
    const translations: TranslationFile = {
      user: {
        profile: {
          name: "Name",
          email: "Email",
        },
      },
    };

    const result = generateTypescriptInterface(translations);

    // Should NOT include namespace interfaces (these are no longer generated)
    expect(result).not.toContain("interface UserMessages {");
    expect(result).not.toContain("interface UserProfileMessages {");
    
    // Should include the key types
    expect(result).toContain("type UserKeys =");
    expect(result).toContain('"profile.name"');
    expect(result).toContain('"profile.email"');
  });

  test("should not generate TranslationStructure interface", () => {
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

    // Should NOT include the TranslationStructure interface (no longer needed)
    expect(result).not.toContain("interface TranslationStructure");
    
    // Should include the TranslationRequirement type (which is needed)
    expect(result).toContain("interface TranslationRequirement");
    
    // Should include the defineRequirement function
    expect(result).toContain("function defineRequirement");
    expect(result).toContain("export default defineRequirement;");
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
    expect(result).toContain('"submit"');
    expect(result).toContain('"cancel"');

    // Should include nested keys from user namespace
    expect(result).toContain('"profile.name"');

    // Should NOT include object key from user namespace
    expect(result).not.toContain('"profile" |');
  });
});
