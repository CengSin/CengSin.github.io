import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  base: "/assets/app/",
  plugins: [tailwindcss()],
  build: {
    outDir: ".frontend",
    emptyOutDir: true,
    minify: "esbuild",
    cssMinify: true,
    rollupOptions: {
      onwarn(warning, handler) { if (warning.code !== "MODULE_LEVEL_DIRECTIVE") handler(warning); },
      input: "src/frontend/main.jsx",
      output: { entryFileNames: "app.js", chunkFileNames: "chunks/[name]-[hash].js", assetFileNames: "[name]-[hash][extname]" },
    },
  },
});
