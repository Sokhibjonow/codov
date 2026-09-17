// Copies the Monaco editor (the editor used in VS Code) into /public so the site serves it itself,
// without depending on a CDN. Runs after `npm install`.
import { cpSync, existsSync, rmSync } from "node:fs";

const from = "node_modules/monaco-editor/min/vs";
const to = "public/monaco/vs";

if (!existsSync(from)) {
  console.warn("monaco-editor is not installed, skipping copy");
  process.exit(0);
}

rmSync("public/monaco", { recursive: true, force: true });
cpSync(from, to, { recursive: true });
console.log(`Monaco copied to ${to}`);
