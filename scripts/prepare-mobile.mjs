import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const webOutput = path.join(projectRoot, "native", "www");
const webFiles = [
  "app.js",
  "config.js",
  "index.html",
  "leaf.svg",
  "privacy.html",
  "styles.css",
];

await mkdir(path.join(webOutput, "vendor"), { recursive: true });
for (const file of webFiles) {
  await copyFile(path.join(projectRoot, file), path.join(webOutput, file));
}
await copyFile(
  path.join(projectRoot, "vendor", "supabase.js"),
  path.join(webOutput, "vendor", "supabase.js"),
);
await copyFile(
  path.join(projectRoot, "vendor", "LICENSE.supabase-js"),
  path.join(webOutput, "vendor", "LICENSE.supabase-js"),
);
