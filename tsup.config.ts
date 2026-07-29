import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    vite: "src/vite.ts",
    capabilities: "src/capabilities.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  treeshake: true,
  sourcemap: true,
  // Peers + build tools + node builtins are provided by the consuming theme.
  external: [
    "react",
    "react-dom",
    "react-dom/client",
    "react/jsx-runtime",
    "react-router-dom",
    "@tanstack/react-query",
    "axios",
    "@iconify/react",
    "embla-carousel-react",
    "vite",
    "@vitejs/plugin-react",
    "@tailwindcss/vite",
    "laravel-vite-plugin",
  ],
  // The ambient window.appConfig / AppConfig contract (dist/global.d.ts) is
  // copied by the `build` script after tsup, so themes can
  // `/// <reference types="@safqi/storefront-core/global" />`.
});
