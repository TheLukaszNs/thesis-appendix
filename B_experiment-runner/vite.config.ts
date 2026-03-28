import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname, "src/grade/ui"),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/grade/ui"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist/grade-ui"),
    emptyOutDir: true,
  },
  server: {
    port: 5199,
    strictPort: true,
    hmr: {
      port: 5199,
    },
  },
});
