import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [".next/*", "node_modules/*"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Max 550 lines per file rule
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    rules: {
      "max-lines": [
        "warn",
        {
          max: 550,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
  // Exclude generated types, test files, and data files from max-lines rule
  {
    files: [
      "**/types/supabase.ts",
      "**/types/database.generated.ts",
      "**/supabase/database.types.ts",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/__tests__/**/*",
      "**/data/info-pages.ts",
    ],
    rules: {
      "max-lines": "off",
    },
  },
];

export default eslintConfig;
