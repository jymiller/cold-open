import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { loadEnv } from "./src/env.js";
import { run, attest } from "./src/kernel.js";

// Hosts the cockpit. Runs locally and lights-out on an Akash lease.
//   GET  /            → the cockpit UI
//   GET  /api/run     → runs the loop to the attestation point, returns events
//   POST /api/attest  → the human attests; the denied action runs as operator

const PORT = process.env.PORT || 8080;
const env = loadEnv();
let session = null; // single-user demo state

const cockpit = () => readFileSync(new URL("./public/cockpit.html", import.meta.url), "utf8");
const json = (res, obj) => {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify(obj));
};

createServer(async (req, res) => {
  try {
    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "text/plain" });
      return res.end("ok");
    }
    if (req.url === "/" || req.url === "/index.html") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(cockpit());
    }
    if (req.url === "/api/run") {
      const events = [];
      const r = await run(env, (e) => events.push(e));
      session = r.pending ? { state: r.state, pending: r.pending, cycle: r.cycle } : null;
      return json(res, { events, pending: !!r.pending });
    }
    if (req.url === "/api/attest" && req.method === "POST") {
      if (!session) return json(res, { events: [], error: "nothing is awaiting attestation" });
      const events = [];
      await attest(env, session, (e) => events.push(e));
      session = null;
      return json(res, { events, done: true });
    }
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  } catch (err) {
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: String(err.message || err) }));
  }
}).listen(PORT, () => console.log(`cold-open cockpit → http://localhost:${PORT}`));
