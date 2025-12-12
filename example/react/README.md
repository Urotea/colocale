# Colocale React Example

A simple React application demonstrating how to use colocale for internationalization.

## Features

- React 18 with TypeScript
- React Router for routing
- Colocale for i18n
- Support for Japanese (ja) and English (en) locales

## Installation

> **Note**: This example uses `"colocale": "file:../.."` in package.json to reference the parent colocale library. If you're copying this example to your own project, replace it with `"colocale": "^0.1.1"` (or the latest version).

```bash
npm install
```

## Development

```bash
npm run dev
```

Visit http://localhost:5173/ (will redirect to /en/top)

## Usage

- Navigate to `/en/top` for English
- Navigate to `/ja/top` for Japanese
- Enter text in the input field to see the greeting message change

## Project Structure

```
src/
  ├── main.tsx           # Application entry point
  ├── App.tsx            # Root component with routing
  ├── translations.ts    # Translation requirements
  └── pages/
      └── TopPage.tsx    # Main page component
messages/
  ├── en/
  │   └── common.json    # English translations
  └── ja/
      └── common.json    # Japanese translations
```
