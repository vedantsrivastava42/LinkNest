import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname),
  resolve: {
    alias: {
      // Map the @/ alias used in shared code to the project root
      "@": resolve(__dirname, ".."),
    },
  },
  base: '',
  build: {
    modulePreload: false,
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup/index.html"),
        options: resolve(__dirname, "options/index.html"),
        background: resolve(__dirname, "background/service-worker.js"),
        content: resolve(__dirname, "content/content-script.js"),
      },
      output: {
        entryFileNames: (chunk) => {
          // Keep background and content scripts at expected paths
          if (chunk.name === "background") return "background/service-worker.js";
          if (chunk.name === "content") return "content/content-script.js";
          return "[name]/[name]-[hash].js";
        },
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  // Extension env vars use VITE_ prefix
  envPrefix: "VITE_",
});
