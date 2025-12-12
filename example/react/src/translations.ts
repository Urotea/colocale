import type { TranslationRequirement } from 'colocale'

// Define translation requirements for common namespace
export const commonTranslations: TranslationRequirement<readonly ["greeting"]> = {
  namespace: "common",
  keys: ["greeting"]
}
