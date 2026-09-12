import { defineConfig, transformWithOxc } from "vite";
import react from "@vitejs/plugin-react";

const jsxInJavaScript = () => ({
  name: "bigstar:jsx-in-javascript",
  enforce: "pre",
  async transform(code, id) {
    const file = id.split("?")[0];
    if (!/[\\/]src[\\/].*\.js$/.test(file)) return null;
    return transformWithOxc(code, file, {
      lang: "jsx",
      jsx: { runtime: "automatic" },
    });
  },
});

export default defineConfig({
  envPrefix: ["VITE_", "REACT_APP_"],
  plugins: [jsxInJavaScript(), react()],
  build: {
    outDir: "build",
    target: "es2015",
  },
  server: {
    port: 3000,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
  optimizeDeps: {
    rolldownOptions: {
      moduleTypes: {
        ".js": "jsx",
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/setupTests.js"],
    sequence: { hooks: "list" },
  },
});
