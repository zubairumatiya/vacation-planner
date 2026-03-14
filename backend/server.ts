import app from "./app.js";
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.PORT;

const keyPath = path.resolve(__dirname, "../../certs/localhost-key.pem");
const certPath = path.resolve(__dirname, "../../certs/localhost.pem");

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  const options = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
  https.createServer(options, app).listen(port, () => {
    console.log(`HTTPS backend running on port: ${port}`);
  });
} else {
  app.listen(port, () => {
    console.log(`HTTP backend running on port: ${port}`);
  });
}
