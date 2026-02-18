import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    https: {
      key: fs.readFileSync(
        path.resolve(__dirname, "../backend/certs/localhost-key.pem"),
      ),
      cert: fs.readFileSync(
        path.resolve(__dirname, "../backend/certs/localhost.pem"),
      ),
    },
    port: Number(process.env.PORT || "5173"),
  },
});
