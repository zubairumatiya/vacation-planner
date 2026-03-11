import { defineConfig } from "vite";
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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    ...(hasLocalCerts && {
      https: {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      },
    }),
    port: Number(process.env.PORT || "5173"),
  },
});
