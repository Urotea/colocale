import type { ValidationResult } from "../types";

/**
 * Display validation results
 */
export function printValidationResult(
  locale: string,
  result: ValidationResult
) {
  console.log(`\n📁 ${locale}`);

  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log("  ✅ No errors");
    return;
  }

  // Display errors
  if (result.errors.length > 0) {
    console.log(`\n  ❌ Errors (${result.errors.length}):`);
    for (const error of result.errors) {
      const localeInfo =
        error.locale && error.referenceLocale
          ? ` [${error.locale} ← ${error.referenceLocale}]`
          : "";
      console.log(`     • [${error.namespace}]${localeInfo} ${error.key}`);
      console.log(`       ${error.message}`);
    }
  }

  // Display warnings
  if (result.warnings.length > 0) {
    console.log(`\n  ⚠️  Warnings (${result.warnings.length}):`);
    for (const warning of result.warnings) {
      console.log(`     • [${warning.namespace}] ${warning.key}`);
      console.log(`       ${warning.message}`);
    }
  }
}

/**
 * Display summary
 */
export function printSummary(hasErrors: boolean, localeCount: number) {
  console.log("\n" + "=".repeat(50));
  if (hasErrors) {
    console.log("❌ Validation failed: Errors found");
  } else {
    console.log(
      `✅ Validation passed: All translation files are valid (${localeCount} locale${
        localeCount !== 1 ? "s" : ""
      })`
    );
  }
}
