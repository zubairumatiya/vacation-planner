import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const keyPath = path.resolve(__dirname, "../backend/certs/localhost-key.pem");
const certPath = path.resolve(__dirname, "../backend/certs/localhost.pem");
const hasLocalCerts = fs.existsSync(keyPath) && fs.existsSync(certPath);
import { type PluginOption } from "vite";
import { visualizer } from "rollup-plugin-visualizer";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      react(),
      tailwindcss(),
      env.ANALYZE === "true" && visualizer({ open: true }),
    ].filter(Boolean) as PluginOption[],
    server: {
      ...(hasLocalCerts && {
        https: {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
        },
      }),
      port: Number(process.env.PORT || "5173"),
    },
  };
});
