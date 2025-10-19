import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Nuclear option: completely override Vite's env system
const noEnvPlugin = () => ({
  name: "no-env-plugin",
  configureServer(server) {
    // Block ONLY specific env.mjs requests, not all requests
    server.middlewares.use((req, res, next) => {
      if (
        req.url &&
        (req.url.endsWith("env.mjs") || req.url.includes("/client/env.mjs"))
      ) {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/javascript");
        res.end("export default {};");
        return;
      }
      next();
    });
  },
  transformIndexHtml(html) {
    // Inject environment variables directly into HTML to bypass client env loading
    const envScript = `
      <script type="module">
        // Override import.meta.env before any other modules load
        const env = {
          VITE_API_BASE_URL: "http://localhost:5001/api",
          VITE_API_URL: "http://localhost:5001/api", 
          VITE_NODE_ENV: "development",
          VITE_APP_NAME: "Bazm-e-Sukhan",
          VITE_APP_VERSION: "1.0.0",
          VITE_ENABLE_ANALYTICS: "false",
          VITE_ENABLE_CHAT: "true",
          VITE_ENABLE_CONTESTS: "true",
          MODE: "development",
          DEV: true,
          PROD: false,
          SSR: false,
          BASE_URL: "/"
        };
        
        // Override the global import.meta.env
        if (typeof window !== 'undefined') {
          window.__VITE_ENV__ = env;
        }
      </script>
    `;
    return html.replace("<head>", `<head>${envScript}`);
  },
  generateBundle(options, bundle) {
    // Remove any env-related files from bundle
    Object.keys(bundle).forEach((fileName) => {
      if (
        fileName.includes("env.mjs") ||
        fileName.includes("env.js") ||
        fileName.includes("client/env")
      ) {
        delete bundle[fileName];
      }
    });
  },
});

export default defineConfig({
  plugins: [react(), noEnvPlugin()],
  define: {
    // Define ALL environment variables directly to completely bypass Vite's env processing
    "import.meta.env": JSON.stringify({
      VITE_API_BASE_URL: "http://localhost:5001/api",
      VITE_API_URL: "http://localhost:5001/api",
      VITE_NODE_ENV: "development",
      VITE_APP_NAME: "Bazm-e-Sukhan",
      VITE_APP_VERSION: "1.0.0",
      VITE_ENABLE_ANALYTICS: "false",
      VITE_ENABLE_CHAT: "true",
      VITE_ENABLE_CONTESTS: "true",
      MODE: "development",
      DEV: true,
      PROD: false,
      SSR: false,
      BASE_URL: "/",
    }),
    "import.meta.env.VITE_API_BASE_URL": JSON.stringify(
      "http://localhost:5001/api"
    ),
    "import.meta.env.VITE_API_URL": JSON.stringify("http://localhost:5001/api"),
    "import.meta.env.VITE_NODE_ENV": JSON.stringify("development"),
    "import.meta.env.VITE_APP_NAME": JSON.stringify("Bazm-e-Sukhan"),
    "import.meta.env.VITE_APP_VERSION": JSON.stringify("1.0.0"),
    "import.meta.env.VITE_ENABLE_ANALYTICS": JSON.stringify("false"),
    "import.meta.env.VITE_ENABLE_CHAT": JSON.stringify("true"),
    "import.meta.env.VITE_ENABLE_CONTESTS": JSON.stringify("true"),
    "import.meta.env.MODE": JSON.stringify("development"),
    "import.meta.env.DEV": JSON.stringify(true),
    "import.meta.env.PROD": JSON.stringify(false),
    __WS_TOKEN__: JSON.stringify("dev-token"),
    global: "globalThis",
  },
  server: {
    port: 5173,
    host: true,
    hmr: {
      port: 5174,
    },
    strictPort: true,
    force: true,
    proxy: {
      "/api": {
        target: "http://localhost:5001",
        changeOrigin: true,
      },
    },
  },
  // Completely disable ALL env file processing
  envDir: false,
  envPrefix: [],
  experimental: {
    hmrPartialAccept: false,
  },
  // Override client options to disable env loading
  client: {
    overlay: {
      warnings: false,
      errors: true,
    },
  },
  optimizeDeps: {
    force: true,
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react-dom/client",
      "react-router-dom",
      "@tanstack/react-query",
      "react-hot-toast",
      "regenerator-runtime/runtime",
    ],
    exclude: [],
    disabled: false,
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});
