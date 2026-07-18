# Cold Open — Runbook

Operational guide for running, deploying, and troubleshooting the harness + cockpit.

---

## 1. What this is

A self-directing hackathon-prep harness. It runs one loop — **plan → act → observe → self-correct** — and every action is a syscall that passes a policy gate *before* it runs. It runs to the `submit_entry` **DENY**, then waits for a human to attest. `node server.js` hosts the **cockpit** (the demo UI); `node index.js` runs the same loop in the terminal.

---

## 2. Architecture at a glance

| Piece | File | Role |
|---|---|---|
| Loop | `src/kernel.js` | plan→act→observe→self-correct; runs to the DENY, then `attest()` re-runs as operator |
| Gate | `src/gate.js` + `src/policy.js` | Pomerium-model default-deny allowlist; writes every decision to `audit.jsonl` |
| Cognition | `src/akashml.js` | AkashML inference (live with a key; offline fallback) |
| Tools/corpus | `src/tools.js` | the corpus + the NW-1 covenant worked example |
| MCP surface | `src/metaview.js` | Metaview MCP client (live with a key; offline fallback) |
| Capability buy | `src/zero.js` | Zero.xyz seam (simulated) |
| Env loader | `src/env.js` | merges real env + `.env` (real env wins) |
| Server | `server.js` + `public/cockpit.html` | cockpit UI + `/api/run`, `/api/attest` |
| Deploy | `deploy.yaml` / `cold-open.sdl` | Akash SDL: `node:22` clones the repo and runs `server.js` |

**Two run modes**, chosen automatically by which keys are present:
- **Offline** (no keys) — deterministic script; always demoable. This is the default.
- **Live** (keys present) — AkashML and/or Metaview make real calls.

**HTTP endpoints** (`server.js`):
- `GET /` → the cockpit UI
- `GET /health` → `ok`
- `GET /api/run` → runs the loop to the attestation point, returns events
- `POST /api/attest` → human attests; the denied action runs as `operator`

---

## 3. Run it locally

```bash
node server.js     # cockpit at http://localhost:8080
node index.js      # same loop, in the terminal
```
Offline out of the box — no keys or network needed.

---

## 4. The two environments (the mental model)

The app runs in **two independent places**. Config does **not** cross between them.

| | Local (`node server.js`) | Akash lease (the ingress URL) |
|---|---|---|
| Where it runs | your Mac | a provider container (`node:22`) |
| How it gets the code | the working directory | `git clone` of `main` at container start |
| How it gets keys/config | **`.env` file** (gitignored) | **SDL `env:` block** |
| Sees your local `.env`? | yes | **no** — `.env` is gitignored, never cloned |
| Key exposure | stays on your machine | visible to the provider |

Consequence: putting a key in local `.env` has **zero effect** on the lease, and vice-versa.

---

## 5. Restart / refresh — the core operation

"Restart" = stop the process and start it again so it re-reads config (and, on Akash, re-clones the code).

**Local:**
1. Click the terminal running the server.
2. `Ctrl+C` to stop.
3. `node server.js` again (↑ then Enter).
4. Refresh http://localhost:8080.

Do this after **any `.env` change**.

**Akash lease:**
- There is no "refresh" button. To pick up new env **or new code**, you **Update the deployment**: Console → the deployment → **Update** tab → paste the SDL → **Update Deployment**. The container restarts, re-clones `main`, and starts fresh (~60–90s).
- **Pushing to `main` alone does NOT update the running lease** — you must Update the deployment to trigger a re-clone.

---

## 6. Environment variables & keys

Copy `.env.example` → `.env` and fill what you have. Any blank key → that tool runs offline.

| Var | Purpose | Notes |
|---|---|---|
| `AKASHML_API_KEY` | AkashML inference | **must start with `akml-`**; from akashml.com |
| `AKASHML_MODEL` | model id | run `npm run models` to list; paste one verbatim |
| `METAVIEW_API_KEY` | Metaview MCP | from `my.metaview.app/settings/mcp` |
| `METAVIEW_MCP_URL` | Metaview endpoint | defaults to `https://mcp.metaview.ai/mcp` |
| `POMERIUM_URL` | real Pomerium proxy | blank = in-process policy (same rules) |
| `ZERO_ENABLED` | enable Zero buy | blank = simulated |

> **Akash key gotcha:** there are two different Akash services. An **Akash Console** key (`ac.sk.production…`, used at `console-api.akash.network`) manages *deployments* and will **not** work for **AkashML** inference (`api.akashml.com`), which needs an `akml-` key. `npm run models` failing with *"keys should start with akml-"* means wrong key type, not a bug.

---

## 7. Going live (offline → live)

**Local live** (safest — key stays on your machine):
1. Put `AKASHML_API_KEY=akml-…` and `AKASHML_MODEL=…` in `.env`.
2. Restart local server (§5). Top bar flips `offline` → `live: AkashML`.

**Akash lease live** (judges see live cognition; key is exposed to the provider):
1. Add to the SDL `env:` block:
   ```yaml
       env:
         - PORT=8080
         - AKASHML_API_KEY=akml-your-key
         - AKASHML_MODEL=deepseek-ai/DeepSeek-V4-Flash
   ```
2. Update the deployment (§8).
3. **Rotate the key after judging** — anything in `env:` is visible to the provider.

---

## 8. Deploy / update on Akash

- **SDL:** `cold-open.sdl` (or `deploy.yaml`). Uses `node:22` + a `git clone … && node server.js` command; exposes `8080` as `80` globally.
- **Console is paste-only** — there is no file upload; paste the SDL text into the editor.
- **New deploy:** Console → Deploy → paste SDL → approve deposit → accept cheapest bid → approve lease → open the lease URI.
- **Update existing:** deployment → **Update** tab → paste SDL → **Update Deployment**.
- **Resource lock:** you **cannot change CPU/memory/storage on an in-place update** — it errors with *"Storage resources mismatch."* Match the lease's existing resources, or close and redeploy.
  - Note: `deploy.yaml` requests **1Gi** storage (fine for a fresh deploy); `cold-open.sdl` is set to **512Mi** to match the current lease created from the Hello-world template.

---

## 9. Verify

```bash
URL=http://pdqc0fvptl85tbevfnq47lgpr4.ingress.hurricane.akash.pub   # or http://localhost:8080

curl -sS "$URL/health"                       # → ok
curl -sS "$URL/" | grep -o '<title>[^<]*</title>'   # → COLD OPEN — cockpit
curl -sS "$URL/api/run" | head -c 200         # runs the loop, returns events JSON (pending:true at the DENY)
```
In the cockpit: **RUN LOOP** → 6 cycles → `submit_entry` DENY 403 → **ATTEST & SUBMIT** → cycle 7 runs as operator → green receipt.

---

## 10. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `EADDRINUSE` on `node server.js` | Port 8080 taken. Find it: `lsof -iTCP:8080 -sTCP:LISTEN`; kill the PID, or run with `PORT=8081 node server.js`. |
| `npm run models` → "keys should start with akml-" | Wrong key type — that's an Akash **Console** key, not an **AkashML** key. Get an `akml-` key from akashml.com. |
| Cockpit shows `offline` when you expect `live` | Key/model missing or unreadable in the active env. Local: check `.env` + restart. Lease: check the SDL `env:` + Update. |
| Akash Update → "Storage resources mismatch" | You changed resources on an in-place update. Match the existing lease specs (§8) or redeploy. |
| Lease serves "Hello from Akash" | The lease is running a template, not this app. Update the SDL to this app's SDL (§8). |
| Pushed to `main` but lease unchanged | Expected — the lease pins the code from deploy/update time. Update the deployment to re-clone (§5). |
| Metaview shows offline | No `METAVIEW_API_KEY`. Add one (§6) or leave it — it falls back to the corpus. |

---

## 11. What's actually live vs. seam

Keep claims honest — this reflects the code, not aspiration.

| Tool | Status |
|---|---|
| **Akash (deploy)** | **Live** — runs on a real lease |
| **Akash (AkashML cognition)** | Live **only with an `akml-` key**; offline otherwise |
| **Pomerium** | Model enforced in-process (`gate.js`/`policy.js`); real proxy is a seam (`POMERIUM_URL`) |
| **Metaview** | Real MCP client, but **offline without a key** |
| **Zero.xyz** | **Simulated stub** — no real call yet |

Gate policy (`policy.js`): default-deny allowlist. Agent may `read_/check_/get_/draft/acquire_/build_/…`; `submit_/publish_/attest_/send_/delete_` are **denied to the agent** and allowed only under the `operator` identity (a human's attestation). Every decision is logged to `audit.jsonl`.

---

## 12. References

- **Repo:** https://github.com/jymiller/cold-open
- **Live on Akash:** http://pdqc0fvptl85tbevfnq47lgpr4.ingress.hurricane.akash.pub (dseq `1784329129526`)
- **Devpost:** https://devpost.com/software/cold-open-a-harness-walks-into-a-hackathon-and-submits
- **Demo video:** https://www.youtube.com/watch?v=RyuWErIZMGw
- **Enid (product):** https://enidpa.com · deck at https://enidpa.com/deck
- **AkashML:** https://akashml.com (inference keys) — distinct from https://console.akash.network (deployments)
