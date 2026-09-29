// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // Deno runtime (Supabase Edge Functions) -- different globals, different
    // module resolution (npm: specifiers) than this app's own Node/RN code.
    ignores: ["dist/*", "supabase/functions/**"],
  }
]);
