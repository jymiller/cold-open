# Akash — deployment notes & what we learned

Practical notes for running Cold Open on Akash, grounded in what actually happened deploying this repo. For general operation see [RUNBOOK.md](RUNBOOK.md).

## Two different Akash services — don't mix the keys

This is the single biggest source of confusion. "Akash" is two separate products with two separate credentials:

| | Akash Console (deployments) | AkashML (inference) |
|---|---|---|
| What it does | create/manage deployments (the lease) | call open-source LLMs (the agent's cognition) |
| Dashboard | console.akash.network | akashml.com |
| API base | `console-api.akash.network` | `api.akashml.com` |
| Auth header | `x-api-key: ac.sk.production…` | `Authorization: Bearer akml-…` |
| Key prefix | `ac.sk.` | **`akml-`** |

A **Console key is not an inference key.** Using an `ac.sk…` key against AkashML returns `401 "Invalid token format. API keys should start with 'akml-'."` — that's the wrong-service error, not a bug. `src/akashml.js` posts to `api.akashml.com/v1/chat/completions`; `npm run models` lists ids from `api.akashml.com/v1/models`. Both need an `akml-` key.

## How Cold Open deploys (no Docker build)

The SDL (`deploy.yaml` / `cold-open.sdl`) uses `image: node:22` with a command that clones the public repo and runs the server:

```yaml
command:
  - sh
  - -c
  - "git clone --depth 1 https://github.com/jymiller/cold-open /app && cd /app && node server.js"
```

- No image to build or push — the provider pulls `node:22`, clones, and starts. **Cold start ~60–90s.**
- Exposes container `8080` as public `80`, globally.
- **Keys reach the container only via the SDL `env:` block** (which the provider can read). The local `.env` is gitignored, so it is never cloned into the container — which is why the lease runs the **offline fallback**. No key currently lives in the deployed container; the SDL `env:` is just `PORT=8080`.

## Gotchas that bit us

- **Console is paste-only.** There is no SDL file upload anywhere — paste the YAML text into the editor (new deploy or the Update tab).
- **The onboarding funnel can deploy a template.** We accidentally stood up the "Hello world" / "Hello from Akash" Next.js template. Always verify the lease URI serves *your* app (`curl <uri>/health`).
- **In-place Update can't change resources.** Editing the SDL on an existing lease errors with `"Storage resources mismatch"` if CPU/memory/storage differ from what the lease was bid at. Match the lease's specs, or close and redeploy. (Our lease was created at `512Mi` from the template, so `cold-open.sdl` uses `512Mi`; `deploy.yaml` uses `1Gi` for a fresh deploy.)
- **Pushing to `main` does not update a running lease.** The lease pins the code from deploy/update time. To ship new code: push, then **Update the deployment** to force a re-clone.
- **`AKASHML_MODEL` inline comments aren't stripped.** The `.env` loader (`src/env.js`) keeps everything after `=`, so a trailing `# comment` becomes part of the model id → `404`. Put only the id on the line.

## Cost

- A **grant / trial credit** (~$1) funds a small lease — roughly ~12 days at `0.5 cpu / 512Mi`.
- **Auto top-up** can pull from your wallet to keep a lease funded — check that toggle if you don't want ongoing spend.
- **Close a deployment** (Console → Deployments → the deployment → ⋯ → Close) to stop spend and return remaining escrow. It signs a wallet transaction, so it's a manual step.

## The Akash Skill — automate all of the above

[akash-network/akash-skill](https://akash.network/docs/getting-started/ai-agents/) is an open-source skill bundle that turns a coding agent (Claude Code, Codex, OpenCode) into an Akash deployment agent. From natural language it writes and validates SDL, picks the deploy method (Console API / CLI / TypeScript or Go SDK), creates the deployment, accepts bids, sends the manifest, and pulls logs/events — authenticating with a Console API key. It would have automated nearly all of the manual console work above.

Install in a standalone Claude Code CLI:

```
/plugin marketplace add akash-network/akash-skill
/plugin install akash-network@akash-network
```

(The `/plugin` command is not available inside the Claude Agent SDK/harness — use a regular `claude` terminal, Codex, or OpenCode.)

## This deployment

- **Repo:** https://github.com/jymiller/cold-open
- **Lease:** `dseq 1784329129526`, provider `provider.hurricane.akash.pub`, `0.5 cpu / 512Mi`
- **URL:** http://pdqc0fvptl85tbevfnq47lgpr4.ingress.hurricane.akash.pub
