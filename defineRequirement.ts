/**
 * Auto-generated translation types
 * DO NOT EDIT MANUALLY
 */

import { createDefineRequirement } from 'colocale';

interface CommonMessages {
  "submit": string;
  "cancel": string;
  "itemCount": string;
}

interface UserMessages {
  "profile": UserProfileMessages;
}

interface UserProfileMessages {
  "name": string;
  "email": string;
}

interface TranslationStructure {
  "common": CommonMessages;
  "user": UserMessages;
}

/**
 * Union type of all translation keys
 */
type TranslationKeys =
  | "common.submit"
  | "common.cancel"
  | "common.itemCount"
  | "user.profile"
  | "user.profile.name"
  | "user.profile.email"
;

/**
 * Internal helper types for translation structure
 */

/**
 * Union type of all valid namespace names
 */
type Namespace = "common" | "user";

/**
 * Valid keys for the 'common' namespace
 */
type CommonKeys = "submit" | "cancel" | "itemCount";

/**
 * Valid keys for the 'user' namespace
 */
type UserKeys = "profile" | "profile.name" | "profile.email";

/**
 * Get valid keys for a specific namespace
 * @template N - The namespace name
 */
type KeysForNamespace<N extends Namespace> =
  N extends "common" ? CommonKeys :
  N extends "user" ? UserKeys :
  never;

/**
 * Type-safe defineRequirement function for this translation structure
 * 
 * @example
 * ```typescript
 * import defineRequirement from './defineRequirement';
 * 
 * // Full type inference and validation
 * const req = defineRequirement("common", ["submit", "cancel"]);
 * ```
 */
const defineRequirement = createDefineRequirement<TranslationStructure>();

/**
 * @public
 */
export default defineRequirement;
