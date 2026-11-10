import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    server: {
      port: Number(process.env.VITE_DEV_PORT || env.VITE_DEV_PORT) || 5173,
      proxy: {
        "/api": {
          target: `http://localhost:${process.env.PORT || env.PORT || 8787}`,
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: "jsdom",
      include: ["src/**/*.test.{js,jsx}", "server/**/*.test.js", "shared/**/*.test.js"],
    },
  };
});
