import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "react/no-danger": "off",
      "react/no-unescaped-entities": "off",
    },
  },
  {
    ignores: [".next/**", ".source/**", "out/**", "build/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
