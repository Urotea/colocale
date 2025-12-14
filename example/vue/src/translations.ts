import defineRequirement from "../defineRequirement";

// Define translation requirements for common namespace
export const commonTranslations = defineRequirement("common", [
  "greeting",
] as const);
