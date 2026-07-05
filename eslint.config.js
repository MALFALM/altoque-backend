const js = require("@eslint/js");
const security = require("eslint-plugin-security");

module.exports = [
  {
    ignores: ["node_modules/**", "coverage/**"]
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    plugins: {
      security
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        console: "readonly",
        process: "readonly",
        require: "readonly",
        module: "readonly",
        __dirname: "readonly",
        describe: "readonly",
        test: "readonly",
        expect: "readonly",
        jest: "readonly"
      }
    },
    rules: {
      ...security.configs.recommended.rules,
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }]
    }
  }
];
