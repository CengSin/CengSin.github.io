import { defineConfig } from "vite";

export default defineConfig({
  base: "/assets/app/",
  build: {
    outDir: ".frontend",
    emptyOutDir: true,
    minify: "esbuild",
    cssMinify: true,
    rollupOptions: {
      input: "src/frontend/main.js",
      output: { entryFileNames: "app.js", chunkFileNames: "chunks/[name]-[hash].js", assetFileNames: "[name]-[hash][extname]" },
    },
  },
});
