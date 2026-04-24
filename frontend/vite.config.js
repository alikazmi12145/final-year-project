import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Nuclear option: completely override Vite's env system
const noEnvPlugin = (env) => ({
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
          VITE_API_BASE_URL: "http://localhost:5000/api",
          VITE_API_URL: "http://localhost:5000/api", 
          VITE_NODE_ENV: "${env.VITE_NODE_ENV}",
          VITE_APP_NAME: "Bazm-e-Sukhan",
          VITE_APP_VERSION: "1.0.0",
          VITE_ENABLE_ANALYTICS: "false",
          VITE_ENABLE_CHAT: "true",
          VITE_ENABLE_CONTESTS: "true",
          MODE: "${env.MODE}",
          DEV: ${env.DEV},
          PROD: ${env.PROD},
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

export default defineConfig(({ command, mode }) => {
  const isBuild = command === "build";
  const injectedEnv = {
    VITE_API_BASE_URL: "http://localhost:5000/api",
    VITE_API_URL: "http://localhost:5000/api",
    VITE_NODE_ENV: isBuild ? "production" : "development",
    VITE_APP_NAME: "Bazm-e-Sukhan",
    VITE_APP_VERSION: "1.0.0",
    VITE_ENABLE_ANALYTICS: "false",
    VITE_ENABLE_CHAT: "true",
    VITE_ENABLE_CONTESTS: "true",
    MODE: mode,
    DEV: !isBuild,
    PROD: isBuild,
    SSR: false,
    BASE_URL: "/",
  };

  return {
    plugins: [react(), noEnvPlugin(injectedEnv)],
    define: {
      // Define ALL environment variables directly to completely bypass Vite's env processing
      "import.meta.env": JSON.stringify(injectedEnv),
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(
        injectedEnv.VITE_API_BASE_URL
      ),
      "import.meta.env.VITE_API_URL": JSON.stringify(injectedEnv.VITE_API_URL),
      "import.meta.env.VITE_NODE_ENV": JSON.stringify(injectedEnv.VITE_NODE_ENV),
      "import.meta.env.VITE_APP_NAME": JSON.stringify(injectedEnv.VITE_APP_NAME),
      "import.meta.env.VITE_APP_VERSION": JSON.stringify(injectedEnv.VITE_APP_VERSION),
      "import.meta.env.VITE_ENABLE_ANALYTICS": JSON.stringify(
        injectedEnv.VITE_ENABLE_ANALYTICS
      ),
      "import.meta.env.VITE_ENABLE_CHAT": JSON.stringify(
        injectedEnv.VITE_ENABLE_CHAT
      ),
      "import.meta.env.VITE_ENABLE_CONTESTS": JSON.stringify(
        injectedEnv.VITE_ENABLE_CONTESTS
      ),
      "import.meta.env.MODE": JSON.stringify(injectedEnv.MODE),
      "import.meta.env.DEV": JSON.stringify(injectedEnv.DEV),
      "import.meta.env.PROD": JSON.stringify(injectedEnv.PROD),
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
          target: "http://localhost:5000",
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
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
  };
});
