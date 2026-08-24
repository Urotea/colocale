import { afterEach, describe, expect, test } from "bun:test";
import type { ValidationError, ValidationResult } from "../types";
import { printSummary, printValidationResult } from "./formatter";

const originalLog = console.log;

/** Run fn while capturing everything written to console.log */
function capture(fn: () => void): string {
  const lines: string[] = [];
  console.log = (...args: unknown[]) => {
    lines.push(args.map(String).join(" "));
  };

  try {
    fn();
  } finally {
    console.log = originalLog;
  }

  return lines.join("\n");
}

function result(
  errors: ValidationError[] = [],
  warnings: ValidationError[] = []
): ValidationResult {
  return { valid: errors.length === 0, errors, warnings };
}

afterEach(() => {
  console.log = originalLog;
});

describe("printValidationResult", () => {
  test("Reports a clean result", () => {
    const output = capture(() => {
      printValidationResult("ja", result());
    });

    expect(output).toContain("📁 ja");
    expect(output).toContain("✅ No errors");
  });

  test("Reports each error with its namespace, key and message", () => {
    const output = capture(() => {
      printValidationResult(
        "en",
        result([
          {
            type: "invalid-key-name",
            namespace: "common",
            key: "bad key!",
            message: 'Invalid key name: "bad key!"',
          },
        ])
      );
    });

    expect(output).toContain("❌ Errors (1):");
    expect(output).toContain("[common] bad key!");
    expect(output).toContain('Invalid key name: "bad key!"');
    expect(output).not.toContain("✅ No errors");
  });

  test("Shows the locale and reference locale for cross-locale errors", () => {
    const output = capture(() => {
      printValidationResult(
        "Cross-locale",
        result([
          {
            type: "missing-key",
            namespace: "common",
            key: "cancel",
            locale: "ja",
            referenceLocale: "en",
            message: 'Key "cancel" exists in "en" but missing in "ja"',
          },
        ])
      );
    });

    expect(output).toContain("[common] [ja ← en] cancel");
  });

  test("Reports warnings separately from errors", () => {
    const output = capture(() => {
      printValidationResult(
        "en",
        result(
          [],
          [
            {
              type: "extra-key",
              namespace: "user",
              key: "unused",
              message: "Unused key",
            },
          ]
        )
      );
    });

    expect(output).toContain("Warnings (1):");
    expect(output).toContain("[user] unused");
    expect(output).not.toContain("✅ No errors");
  });
});

describe("printSummary", () => {
  test("Reports failure", () => {
    expect(capture(() => printSummary(true, 2))).toContain(
      "❌ Validation failed"
    );
  });

  test("Uses the singular form for one locale", () => {
    expect(capture(() => printSummary(false, 1))).toContain("(1 locale)");
  });

  test("Uses the plural form for several locales", () => {
    expect(capture(() => printSummary(false, 3))).toContain("(3 locales)");
  });
});
