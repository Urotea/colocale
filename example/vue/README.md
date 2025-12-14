# Colocale Vue Example

A simple Vue application demonstrating how to use colocale for internationalization.

## Features

- Vue 3 with TypeScript
- Vue Router for routing
- Colocale for i18n
- Support for Japanese (ja) and English (en) locales

## Installation

> **Note**: This example uses `"colocale": "file:../.."` in package.json to reference the parent colocale library. If you're copying this example to your own project, replace it with `"colocale": "latest"` or the desired version.

```bash
bun install && bun run codegen
```

## Development

```bash
bun run dev
```

Visit http://localhost:5173/ (will redirect to /en/top)

## Usage

- Navigate to `/en/top` for English
- Navigate to `/ja/top` for Japanese
- Enter text in the input field to see the greeting message change

## Project Structure

```
src/
  ├── main.ts            # Application entry point
  ├── App.vue            # Root component
  ├── env.d.ts           # TypeScript environment declarations
  ├── translations.ts    # Translation requirements
  └── pages/
      └── TopPage.vue    # Main page component
messages/
  ├── en/
  │   └── common.json    # English translations
  └── ja/
      └── common.json    # Japanese translations
```
