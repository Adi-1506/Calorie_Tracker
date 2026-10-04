import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Security item 15: never render raw HTML; sanitize with DOMPurify if it is ever needed.
      "react/no-danger": "error",
      // Security items 3 and 13: no service-role client or raw SQL in browser code.
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='rpc'][arguments.0.type='TemplateLiteral']",
          message: "Pass a fixed function name to rpc(); never build SQL or function names from strings.",
        },
      ],
    },
  },
  {
    files: ["src/components/**", "src/app/**/*-form.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/lib/supabase/admin", "@/lib/env.server"], message: "Server-only module; don't import it in UI code." },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
