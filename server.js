import { createServer } from "node:http";
import { spawn } from "node:child_process";

// Serves the harness so it can run lights-out on an Akash lease. Each GET runs
// the loop fresh and returns the trace. /health is a plain liveness check.

const PORT = process.env.PORT || 8080;
const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");
const esc = (s) => s.replace(/[<&]/g, (c) => ({ "<": "&lt;", "&": "&amp;" })[c]);

createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "text/plain" });
    return res.end("ok");
  }

  const child = spawn("node", ["index.js"], { cwd: process.cwd() });
  let out = "";
  child.stdout.on("data", (d) => (out += d));
  child.stderr.on("data", (d) => (out += d));
  child.on("close", () => {
    const body = `<!doctype html><meta charset="utf-8">
<title>Cold Open — live on Akash</title>
<style>
  body{background:#101413;color:#e8edea;font:14px/1.55 ui-monospace,Menlo,Consolas,monospace;margin:0;padding:30px}
  h1{font:600 22px/1 ui-serif,"Iowan Old Style",Georgia,serif;color:#e9a542;margin:0 0 5px}
  .s{color:#78857f;margin-bottom:22px}
  pre{white-space:pre-wrap;word-break:break-word}
  .b{color:#5fa88c}
</style>
<h1>Cold Open</h1>
<div class="s">a hackathon-prep harness &middot; running lights-out on Akash &middot; ${new Date().toISOString()}</div>
<pre>${esc(stripAnsi(out))}</pre>
<div class="s">refresh to run the loop again</div>`;
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(body);
  });
}).listen(PORT, () => console.log(`cold-open server listening on :${PORT}`));
