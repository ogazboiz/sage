import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Proxies keep API keys out of the bundle and centralise base URLs.
// Inject keys server-side via Vite's proxy configureServer hook.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), tailwindcss()],
    define: {
      global: "globalThis",
      "process.env": {},
    },
    server: {
      proxy: {
        "/api/lifi-earn": {
          target: "https://earn.li.fi",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/lifi-earn/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              if (env.LIFI_API_KEY) {
                proxyReq.setHeader("x-lifi-api-key", env.LIFI_API_KEY);
              }
            });
          },
        },
        "/api/lifi-composer": {
          target: "https://li.quest",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/lifi-composer/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              if (env.LIFI_API_KEY) {
                proxyReq.setHeader("x-lifi-api-key", env.LIFI_API_KEY);
              }
            });
          },
        },
        "/api/gemini": {
          target: "https://generativelanguage.googleapis.com",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/gemini/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq, req) => {
              if (env.GEMINI_API_KEY) {
                const url = new URL(
                  proxyReq.path ?? "/",
                  "https://generativelanguage.googleapis.com",
                );
                url.searchParams.set("key", env.GEMINI_API_KEY);
                proxyReq.path = `${url.pathname}${url.search}`;
                void req;
              }
            });
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": "/src",
        // Node built-in shims for browser. Trailing slash forces npm-package
        // resolution over the deprecated Node spec.
        events: "events/",
        stream: "stream-browserify",
        util: "util/",
        crypto: "crypto-browserify",
      },
    },
    optimizeDeps: {
      include: [
        "buffer",
        "process",
        "events",
        "stream-browserify",
        "util",
        "crypto-browserify",
      ],
    },
  };
});
