# Implementation Summary: Type-Safe `defineRequirement`

## Overview
This PR implements type constraints for the `defineRequirement` function to provide compile-time validation of namespaces and translation keys based on the translation structure, as requested in the issue.

## Changes Made

### 1. Core Type System (src/types.ts)
Added type utilities to extract and validate namespaces and keys:
- **`Namespace<T>`**: Extracts valid namespace names from a translation structure
- **`KeysForNamespace<T, N>`**: Extracts valid keys for a specific namespace
- **`ExtractNestedKeys<T>`**: Handles nested translation keys (1-level nesting by design)
- **`ExtractAllKeys<T>`**: Combines top-level and nested keys

### 2. Function Overloads (src/utils.ts)
Updated `defineRequirement` with two overloads:
1. **Type-safe overload**: `defineRequirement<T, N, K>(namespace: N, keys: K)` - Validates namespace and keys against type `T`
2. **Backward-compatible overload**: `defineRequirement<K>(namespace: string, keys: K)` - Accepts any string (existing behavior)

This ensures full backward compatibility while enabling type safety when desired.

### 3. Enhanced Code Generation (src/cli/codegen.ts)
Extended the `codegen` command to generate helper types:
- **`Namespace`**: Union type of all namespace names (e.g., `"common" | "user"`)
- **`KeysForNamespace<N>`**: Conditional type mapping namespaces to their valid keys
- **Per-namespace key types**: e.g., `CommonKeys`, `UserKeys` for easier usage

### 4. Documentation and Examples
- **TYPE_SAFETY_GUIDE.md**: Comprehensive guide on using type-safe `defineRequirement`
- **src/type-safe-example.ts**: Basic usage examples
- **src/codegen-usage-example.ts**: Examples using generated types
- **src/type-constraints-validation.ts**: Type-level validation tests
- **src/runtime-test.ts**: Runtime behavior verification
- **src/type-error-demos.ts**: Commented examples showing type errors

### 5. Exported Types (src/index.ts)
Added exports for the new type utilities:
- `Namespace`
- `KeysForNamespace`

## Usage Examples

### Without Type Parameter (Backward Compatible)
```typescript
import { defineRequirement } from "colocale";

// Works as before - no type checking
const req = defineRequirement("any_namespace", ["any.key"]);
```

### With Type Parameter (Type-Safe)
```typescript
import { defineRequirement } from "colocale";
import type { TranslationStructure } from "./types/messages";

// TypeScript validates namespace and keys at compile time
const req = defineRequirement<
  TranslationStructure,
  "common",
  ["submit", "cancel"]
>("common", ["submit", "cancel"]);
```

### Type Errors Caught at Compile Time
```typescript
// ❌ Error: "invalid" is not a valid namespace
const invalidNs = defineRequirement<TranslationStructure, "invalid", ["key"]>("invalid", ["key"]);

// ❌ Error: "nonexistent" is not a valid key for "common"
const invalidKey = defineRequirement<TranslationStructure, "common", ["nonexistent"]>("common", ["nonexistent"]);
```

## Benefits Delivered

✅ **Compile-time validation**: Typos in namespace or keys are caught before runtime  
✅ **IDE autocomplete**: Developers get suggestions for valid namespaces and keys  
✅ **Refactoring safety**: Renaming translation keys shows all affected usages  
✅ **Self-documenting**: Type definitions serve as documentation  
✅ **Backward compatible**: Existing code continues to work without changes

## Testing

### Type-Level Tests
- **src/type-constraints-validation.ts**: Validates that type extraction works correctly
- **src/type-error-demos.ts**: Documents expected type errors

### Runtime Tests
- **src/runtime-test.ts**: Verifies runtime behavior matches expectations
- All tests pass ✅

### Security
- **CodeQL scan**: No security issues found ✅

## Migration Path

Existing code works without changes:
```typescript
// Before (still works)
const req = defineRequirement("common", ["submit"]);

// After (opt-in to type safety)
const req = defineRequirement<TranslationStructure, "common", ["submit"]>("common", ["submit"]);
```

To adopt type-safe usage:
1. Run `npx colocale codegen messages types/messages.d.ts` to generate types
2. Import the generated `TranslationStructure` type
3. Add type parameters to `defineRequirement` calls as needed
4. Fix any type errors revealed by the constraints

## Technical Notes

### Design Constraints
- The translation file format supports **up to 1 level of nesting** by design (as defined by `NamespaceTranslations` and `NestedTranslations` types)
- This is intentional and documented in the codebase
- The type utilities correctly handle this 1-level nesting

### Function Overload Resolution
TypeScript will:
1. Try to match the type-safe overload first (when type parameters are provided)
2. Fall back to the backward-compatible overload (when no type parameters are provided)

This ensures optimal type inference while maintaining compatibility.

## Breaking Changes
**None** - This change is fully backward compatible.

## Future Enhancements
- Consider adding a helper factory function to pre-bind the `TranslationStructure` type for more ergonomic usage
- Consider extending type constraints to other functions like `pickMessages` and `createTranslator`
