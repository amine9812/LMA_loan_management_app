import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  root: path.join(__dirname, "src/renderer"),
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../../packages/shared/src"),
      "@core": path.resolve(__dirname, "../../packages/core/src")
    }
  },
  build: {
    outDir: path.join(__dirname, "dist/renderer"),
    emptyOutDir: true
  },
  server: {
    port: 5190,
    strictPort: true
  }
});
