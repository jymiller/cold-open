import { readFileSync } from "node:fs";
import { run } from "./src/kernel.js";

// tiny zero-dependency .env loader — real env wins, .env fills the gaps
function loadEnv() {
  const env = { ...process.env };
  try {
    const txt = readFileSync(new URL("./.env", import.meta.url), "utf8");
    for (const raw of txt.split("\n")) {
      const m = raw.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* no .env — offline mode */
  }
  return env;
}

run(loadEnv()).catch((e) => {
  console.error(e);
  process.exit(1);
});
