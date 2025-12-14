import { describe, expect, test } from "bun:test";
import { InvalidPlaceholderError } from "./errors";
import { extractPlaceholders, replacePlaceholders } from "./utils";

describe("extractPlaceholders", () => {
  test("Extract single placeholder", () => {
    const result = extractPlaceholders("Hello {{name}}");
    expect(result).toEqual(["name"]);
  });

  test("Extract multiple placeholders", () => {
    const result = extractPlaceholders("{{user}}さんのカートに{{count}}個");
    expect(result).toEqual(["user", "count"]);
  });

  test("No placeholders", () => {
    const result = extractPlaceholders("Hello world");
    expect(result).toEqual([]);
  });

  test("Duplicate placeholders", () => {
    const result = extractPlaceholders("{{name}} and {{name}} again");
    expect(result).toEqual(["name", "name"]);
  });

  test("Empty string", () => {
    const result = extractPlaceholders("");
    expect(result).toEqual([]);
  });
});

describe("replacePlaceholders", () => {
  test("Replace single placeholder", () => {
    const result = replacePlaceholders("Hello {{name}}", { name: "World" });
    expect(result).toBe("Hello World");
  });

  test("Replace multiple placeholders", () => {
    const result = replacePlaceholders("{{user}}さんのカートに{{count}}個", {
      user: "田中",
      count: 5,
    });
    expect(result).toBe("田中さんのカートに5個");
  });

  test("Throw error when placeholder is missing", () => {
    expect(() => {
      replacePlaceholders("Hello {{name}}", {});
    }).toThrow(InvalidPlaceholderError);

    try {
      replacePlaceholders("Hello {{name}}", {});
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidPlaceholderError);
      expect((e as InvalidPlaceholderError).missingPlaceholders).toEqual([
        "name",
      ]);
      expect((e as InvalidPlaceholderError).template).toBe("Hello {{name}}");
    }
  });

  test("Throw error when multiple placeholders are missing", () => {
    expect(() => {
      replacePlaceholders("{{user}}さんのカートに{{count}}個", {
        user: "田中",
      });
    }).toThrow(InvalidPlaceholderError);

    try {
      replacePlaceholders("{{user}}さんのカートに{{count}}個", {
        user: "田中",
      });
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidPlaceholderError);
      expect((e as InvalidPlaceholderError).missingPlaceholders).toEqual([
        "count",
      ]);
    }
  });

  test("Throw error when all placeholders are missing", () => {
    expect(() => {
      replacePlaceholders("{{user}}さんのカートに{{count}}個", {});
    }).toThrow(InvalidPlaceholderError);

    try {
      replacePlaceholders("{{user}}さんのカートに{{count}}個", {});
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidPlaceholderError);
      expect((e as InvalidPlaceholderError).missingPlaceholders).toEqual([
        "user",
        "count",
      ]);
    }
  });

  test("No placeholders in message", () => {
    const result = replacePlaceholders("Hello world", { name: "unused" });
    expect(result).toBe("Hello world");
  });

  test("Replace duplicate placeholders", () => {
    const result = replacePlaceholders("{{name}} and {{name}} again", {
      name: "Alice",
    });
    expect(result).toBe("Alice and Alice again");
  });

  test("Number to string conversion", () => {
    const result = replacePlaceholders("Count: {{count}}", { count: 42 });
    expect(result).toBe("Count: 42");
  });
});
