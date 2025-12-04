import { readFile, readdir, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import type { TranslationFile, LocaleTranslations } from "../types";

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
    } catch (error) {
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
      } catch (error) {
        // Skip directories that can't be read as translation directories
        continue;
      }
    }
  }

  return localeTranslations;
}

/**
 * Get the first locale directory from a base directory
 * A locale directory is one that contains JSON translation files.
 * Returns the first valid locale directory found (order depends on filesystem).
 * 
 * @param basePath - Base directory that may contain locale subdirectories
 * @returns Path to the first locale directory found, or null if none found
 */
export async function getFirstLocaleDirectory(
  basePath: string
): Promise<string | null> {
  let entries: string[];
  try {
    entries = await readdir(basePath);
  } catch (error) {
    return null;
  }

  for (const entry of entries) {
    const entryPath = join(basePath, entry);

    let stats;
    try {
      stats = await stat(entryPath);
    } catch (error) {
      continue;
    }

    // Only process directories
    if (stats.isDirectory()) {
      // Check if directory contains JSON files (translation files)
      try {
        const files = await readdir(entryPath);
        const hasJsonFiles = files.some(file => file.endsWith('.json'));
        if (hasJsonFiles) {
          return entryPath;
        }
      } catch (error) {
        // Skip directories that can't be read
        continue;
      }
    }
  }

  return null;
}
