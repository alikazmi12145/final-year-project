import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    __WS_TOKEN__: JSON.stringify("dev-token"),
    global: "globalThis",
  },
  server: {
    port: 5173,
    host: true,
    hmr: {
      port: 5174,
    },
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
    exclude: ["vite"],
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          ui: ["lucide-react", "@tanstack/react-query"],
          search: ["tesseract.js", "fuse.js", "react-speech-recognition"],
        },
      },
    },
  },
});
