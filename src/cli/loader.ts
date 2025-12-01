import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { TranslationFile } from "../types";

/**
 * Load all JSON files from a directory and merge into one TranslationFile
 */
export async function loadTranslationsFromDirectory(
  dir: string
): Promise<TranslationFile> {
  const translations: TranslationFile = {};

  try {
    const files = await readdir(dir);

    for (const file of files) {
      if (file.endsWith(".json")) {
        const namespace = file.replace(".json", "");
        const filePath = join(dir, file);
        const content = await readFile(filePath, "utf-8");

        try {
          translations[namespace] = JSON.parse(content);
        } catch (error) {
          console.error(`❌ JSON parse error: ${filePath}`);
          if (error instanceof Error) {
            console.error(`   ${error.message}`);
          }
          process.exit(1);
        }
      }
    }
  } catch (error) {
    console.error(`❌ Failed to read directory: ${dir}`);
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }

  return translations;
}
