import js from "@eslint/js";
import prettier from "eslint-plugin-prettier";
import configPrettier from "eslint-config-prettier";

export default [
  js.configs.recommended,
  {
    plugins: {
      prettier,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        argv: "readonly",
        $: "readonly",
        chalk: "readonly",
        question: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        fetch: "readonly",
      },
    },
    rules: {
      "prettier/prettier": "error",
      "no-unused-vars": "warn",
      "no-console": "off", // We will allow console for now, but will migrate to a logger
    },
  },
  configPrettier,
];
