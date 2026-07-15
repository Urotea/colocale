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

    // Check if the first argument is a base directory containing locale subdirectories
    const firstArg = resolve(paths[0]);
    let localeTranslations;

    try {
      localeTranslations = await loadAllLocaleTranslations(firstArg);

      if (Object.keys(localeTranslations).length > 0) {
        // Multi-locale mode: validate each locale and cross-locale consistency
        console.log(
          `📁 Found ${Object.keys(localeTranslations).length} locale(s)\n`
        );

        // Validate each locale individually
        for (const [locale, translations] of Object.entries(
          localeTranslations
        )) {
          const result = validateTranslations(translations);
          checkedLocales.push(locale);
          printValidationResult(locale, result);

          if (!result.valid) {
            hasErrors = true;
          }
        }

        // Perform cross-locale validation
        if (Object.keys(localeTranslations).length > 1) {
          console.log("\n" + "=".repeat(50));
          console.log("🌐 Cross-locale consistency check\n");

          const crossLocaleResult = validateCrossLocale(localeTranslations);
          printValidationResult("Cross-locale", crossLocaleResult);

          if (!crossLocaleResult.valid) {
            hasErrors = true;
          }
        }
      } else {
        throw new Error("No locales found");
      }
    } catch (_error) {
      // Fallback to single-locale mode (original behavior)
      for (const arg of paths) {
        const path = resolve(arg);

        try {
          const translations = await loadTranslationsFromDirectory(path);
          const result = validateTranslations(translations);

          // Extract locale name (last part of the path)
          const locale = path.split("/").pop() || path;
          checkedLocales.push(locale);

          printValidationResult(locale, result);

          if (!result.valid) {
            hasErrors = true;
          }
        } catch (error) {
          console.error(
            `❌ ${error instanceof Error ? error.message : String(error)}`
          );
          process.exit(1);
        }
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
