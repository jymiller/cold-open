import { readFileSync } from "node:fs";

function key() {
  if (process.env.AKASHML_API_KEY) return process.env.AKASHML_API_KEY;
  try {
    const t = readFileSync(new URL("../.env", import.meta.url), "utf8");
    const m = t.match(/AKASHML_API_KEY\s*=\s*(.+)/);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  } catch {
    /* none */
  }
  return null;
}

const k = key();
if (!k) {
  console.log("Set AKASHML_API_KEY in .env first (copy .env.example).");
  process.exit(1);
}

const r = await fetch("https://api.akashml.com/v1/models", {
  headers: { authorization: `Bearer ${k}` },
});
const j = await r.json();
const ids = (j.data || j.models || []).map((m) => m.id || m.name).filter(Boolean);
console.log(ids.length ? ids.join("\n") : JSON.stringify(j).slice(0, 800));
