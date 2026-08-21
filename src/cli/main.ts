#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { Command } from "commander";
import { validateCrossLocale, validateTranslations } from "../validation";
import { generateTypescriptInterface } from "./codegen";
import { printValidationResult } from "./formatter";
import {
  getFirstLocaleDirectory,
  loadAllLocaleTranslations,
  loadTranslationsFromDirectory,
} from "./loader";

const program = new Command();

program
  .name("colocale")
  .description("CLI tool for i18n translation management")
  .version("0.1.0");

/**
 * Result of validating a single path
 */
interface CheckOutcome {
  hasErrors: boolean;
  checkedLocales: string[];
}

/**
 * Validate one path, which is either a base directory containing locale
 * subdirectories (multi-locale mode) or a single locale directory.
 *
 * @throws {Error} When the path cannot be read, or when it contains no
 * translation files at all - an empty path is never reported as valid.
 */
async function checkPath(path: string): Promise<CheckOutcome> {
  const checkedLocales: string[] = [];
  let hasErrors = false;

  // Multi-locale mode: the path is a base directory of locale subdirectories
  const localeTranslations = await loadAllLocaleTranslations(path);
  const locales = Object.keys(localeTranslations);

  if (locales.length > 0) {
    console.log(`📁 Found ${locales.length} locale(s)\n`);

    // Validate each locale individually
    for (const [locale, translations] of Object.entries(localeTranslations)) {
      const result = validateTranslations(translations);
      checkedLocales.push(locale);
      printValidationResult(locale, result);

      if (!result.valid) {
        hasErrors = true;
      }
    }

    // Perform cross-locale validation
    if (locales.length > 1) {
      console.log("\n" + "=".repeat(50));
      console.log("🌐 Cross-locale consistency check\n");

      const crossLocaleResult = validateCrossLocale(localeTranslations);
      printValidationResult("Cross-locale", crossLocaleResult);

      if (!crossLocaleResult.valid) {
        hasErrors = true;
      }
    } else {
      console.log(
        "\nℹ️  Only one locale was loaded, so the cross-locale consistency check was skipped."
      );
    }

    return { hasErrors, checkedLocales };
  }

  // No locale was loaded. If locale subdirectories holding JSON files do exist,
  // then every one of them failed to load: report it instead of passing silently.
  const localeDir = await getFirstLocaleDirectory(path);
  if (localeDir) {
    throw new Error(
      `Found locale subdirectories in ${path}, but none of them could be loaded. Check the JSON syntax of the translation files (e.g. run check on ${localeDir} directly).`
    );
  }

  // Single-locale mode: the path itself is a locale directory
  const translations = await loadTranslationsFromDirectory(path);
  if (Object.keys(translations).length === 0) {
    throw new Error(
      `No translation files found in ${path}. Expected .json translation files in this directory, or locale subdirectories containing them.`
    );
  }

  const result = validateTranslations(translations);

  // Extract locale name (last part of the path)
  const locale = basename(path) || path;
  checkedLocales.push(locale);

  printValidationResult(locale, result);

  if (!result.valid) {
    hasErrors = true;
  }

  return { hasErrors, checkedLocales };
}

/**
 * Check command - validates translation files
 */
program
  .command("check")
  .description("Validate translation files for consistency and correctness")
  .argument(
    "<paths...>",
    "Path(s) to translation directory or directories to validate"
  )
  .action(async (paths: string[]) => {
    console.log("🔍 Checking translation files...\n");

    let hasErrors = false;
    const checkedLocales: string[] = [];

    // Every path is validated; none is silently ignored
    for (const arg of paths) {
      const path = resolve(arg);

      if (paths.length > 1) {
        console.log(`📂 ${path}`);
      }

      try {
        const outcome = await checkPath(path);
        checkedLocales.push(...outcome.checkedLocales);

        if (outcome.hasErrors) {
          hasErrors = true;
        }
      } catch (error) {
        console.error(
          `❌ ${error instanceof Error ? error.message : String(error)}`
        );
        hasErrors = true;
      }

      if (paths.length > 1) {
        console.log("");
      }
    }

    // Display summary
    console.log("\n" + "=".repeat(50));
    if (hasErrors) {
      console.log("❌ Validation failed: Errors found");
      process.exit(1);
    } else {
      console.log(
        `✅ Validation passed: All translation files are valid (${
          checkedLocales.length
        } locale${checkedLocales.length !== 1 ? "s" : ""})`
      );
      process.exit(0);
    }
  });

/**
 * Codegen command - generates type-safe defineRequirement function
 */
program
  .command("codegen")
  .description(
    "Generate type-safe defineRequirement function from translation files"
  )
  .argument(
    "<path>",
    "Path to translation directory (parent directory containing locale subdirectories)"
  )
  .argument("[output]", "Output file path", "defineRequirement.ts")
  .action(async (translationPath: string, outputPath: string) => {
    const resolvedTranslationPath = resolve(translationPath);
    const resolvedOutputPath = resolve(outputPath);

    console.log("🔧 Generating type-safe defineRequirement function...\n");
    console.log(`📁 Input:  ${resolvedTranslationPath}`);

    try {
      // Try to find a locale subdirectory first
      const localeDir = await getFirstLocaleDirectory(resolvedTranslationPath);

      let translations;

      if (localeDir) {
        // Found locale subdirectories, use the first one
        const localeName = basename(localeDir);
        console.log(
          `📁 Detected locale subdirectories, using locale: ${localeName}`
        );
        translations = await loadTranslationsFromDirectory(localeDir);
      } else {
        // No locale subdirectories found, try to load directly
        translations = await loadTranslationsFromDirectory(
          resolvedTranslationPath
        );
      }

      console.log(`📄 Output: ${resolvedOutputPath}\n`);

      // Generate TypeScript interface
      const interfaceCode = generateTypescriptInterface(translations);

      // Ensure output directory exists
      await mkdir(dirname(resolvedOutputPath), { recursive: true });

      // Write to file
      await writeFile(resolvedOutputPath, interfaceCode, "utf-8");

      console.log("✅ Generated successfully!");
    } catch (error) {
      console.error("❌ Error generating code:", error);
      process.exit(1);
    }
  });

program.parse();
