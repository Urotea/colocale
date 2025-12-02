import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { TranslationFile } from "../types";

/**
 * Load all JSON files from a directory and merge into one TranslationFile
 * @throws {Error} When directory cannot be read or JSON parsing fails
 */
export async function loadTranslationsFromDirectory(
  dir: string
): Promise<TranslationFile> {
  const translations: TranslationFile = {};

  let files: string[];
  try {
    files = await readdir(dir);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read directory: ${dir} - ${message}`);
  }

  for (const file of files) {
    if (file.endsWith(".json")) {
      const namespace = file.replace(".json", "");
      const filePath = join(dir, file);

      let content: string;
      try {
        content = await readFile(filePath, "utf-8");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to read file: ${filePath} - ${message}`);
      }

      try {
        translations[namespace] = JSON.parse(content);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`JSON parse error in ${filePath}: ${message}`);
      }
    }
  }

  return translations;
}

/**
 * Type for locale-indexed translation files
 * Structure: { locale: { namespace: translations } }
 */
export type LocaleTranslations = Record<string, TranslationFile>;

/**
 * Load translations from multiple locale directories
 * Expected structure: basePath/[locale]/[namespace].json
 *
 * @param basePath - Base directory containing locale subdirectories
 * @returns Object with locale as key and TranslationFile as value
 * @throws {Error} When base directory cannot be read
 */
export async function loadAllLocaleTranslations(
  basePath: string
): Promise<LocaleTranslations> {
  const localeTranslations: LocaleTranslations = {};

  let entries: string[];
  try {
    entries = await readdir(basePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read base directory: ${basePath} - ${message}`);
  }

  for (const entry of entries) {
    const entryPath = join(basePath, entry);

    let stats;
    try {
      stats = await stat(entryPath);
    } catch {
      // Skip entries that can't be accessed
      continue;
    }

    // Only process directories
    if (stats.isDirectory()) {
      const locale = entry;
      try {
        const translations = await loadTranslationsFromDirectory(entryPath);
        // Only add if there are any translations
        if (Object.keys(translations).length > 0) {
          localeTranslations[locale] = translations;
        }
      } catch {
        // Skip directories that can't be read as translation directories
        continue;
      }
    }
  }

  return localeTranslations;
}
