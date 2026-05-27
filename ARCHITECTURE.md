# ARCHITECTURE.md — AI GTM Enrichment Pipeline V1

One-page map of the repo for a reviewer landing cold.

---

## Data Flow

```
Cloud Scheduler → n8n → fleet-agents API (server.js) → Postgres → Retool
```

Cloud Scheduler fires on a campaign schedule. n8n receives the trigger, passes a campaign message string to Ahab, then splits the returned `session_ids` array and routes each ID to Nemo and Neptune in sequence. The fleet-agents Express server (`server.js`) handles all agent logic. Postgres is the shared state layer. Retool provides a read-only UI over the live tables.

n8n never carries lead data between nodes. It passes only a `session_id` string.

---

## The Three-Agent Sequence

```
Ahab (discovery) → Nemo (enrichment) → Neptune (synthesis)
```

**Ahab — The Hunter**
Receives a campaign message string. Runs grounded web searches via Gemini 2.5 Flash. Finds companies matching the campaign's target profile. Filters job board aggregators server-side. Writes one Postgres row per lead with `status='Scraped'`. Returns a `session_ids` array to n8n.

**Nemo — The Intelligence Analyst**
Receives a `session_id`. Reads `ahab_payload` from Postgres. Runs forensic enrichment via Gemini 2.5 Pro with Google Search grounding. Diagnoses the company against the Forensic Dictionary (API Stutter, Scale Friction, Manual Data Debt, Displacement Signal). Writes contact recon, funding signal, friction type, and enrichment payload with `status='Enriched'` — or routes to `fleet_errors` with `status='Shipwrecked'` if the lead is stale or unresolvable.

**Neptune — The Authority Engine**
Receives a `session_id`. Reads `nemo_payload` from Postgres. Synthesizes a Schwartz-style outreach Bite via Gemini 2.5 Pro (no grounding). Writes `outreach_bite` and `status='Finished'`.

---

## The Pull Model

The first design pushed full payloads through n8n nodes. That broke under load: node memory capped batch sizes, any failure lost the payload, nothing was queryable mid-pipeline.

V1 uses a Pull Model. Each agent reads its own input from Postgres using the `session_id` as a key. Each agent writes its output back to Postgres. n8n only ever sees a `session_id` string — never lead data.

`session_id` is deterministic:
```js
'lead_' + company_name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
```

The ON CONFLICT clause protects Enriched and Finished rows from being reset by nightly re-runs.

---

## Where Agent Logic Lives

| Location | What's there |
|---|---|
| `server.js` (root) | All three system prompts inline, all utility functions, all Express routes — the canonical source of truth |
| `system_files/src/agents/` | Ahab, Nemo, Neptune agent modules (modular versions, pre-consolidation) |
| `framework/prompts/` | Standalone YAML versions of the system prompts |
| `framework/agents/archive/` | Early-stage base agent definitions |
| `framework/prompt_library/` | Campaign-specific prompt configs — target profile, filters, excluded companies |

---

## What `system_files/` Contains

```
system_files/
  CHANGELOG.md          ← Forensic record of 18 failure modes
  src/
    agents/             ← Ahab, Nemo, Neptune agent modules
    utils/              ← db.js, parser.py, python.js, gemini.js, prompts.js, parser.js
    workers/            ← shark-worker.js
  infra/docker/         ← Dockerfile.n8n, docker-compose.yml, Cloud Run service YAML
  install/              ← Dockerfile, package.json, deploy.sh
```

The infrastructure layer. Contains the container setup that ran the self-hosted stack on GCP, the database utilities, and the Python parser bridge.

---

## What `framework/` Contains

```
framework/
  prompts/              ← ahab_system.yaml, nemo_system.yaml, neptune_system.yaml
  agents/archive/       ← Base agent YAML definitions
  prompt_library/       ← 6 campaign-specific prompt configs
  api/                  ← Agent Platform API call structure and auth reference
  schema/               ← Campaign table SQL template
```

The prompt and campaign layer. Documents how each campaign targets and configures the agents, and the API call structure for the Agent Platform.

---

## Downstream Handoff

See `CLAY_PLAYBOOK.md` for the design translating V1 stage-contract discipline into a Clay-native operating method.

---

## Failure Mode Record

See `changelog.html` — rendered forensic record of all 18 failure modes resolved during the 45-day stress test. This is the primary V1 portfolio artifact alongside `server.js`.
