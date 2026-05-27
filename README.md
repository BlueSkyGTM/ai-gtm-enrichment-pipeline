# AI GTM Enrichment Pipeline — V1

A single-file Node.js orchestrator managing three specialized AI agents over a self-hosted stack of Postgres, n8n, and Docker on GCP. Stress-tested to 1,500 enrichment cycles across 45 days. Resolved 18 documented failure modes. Produced 500+ enriched leads across six campaigns.

---

## What This Pipeline Does

The pipeline converts a campaign message string into a CRM-ready enriched lead record through three sequential agent stages:

```
Discovery → Diagnostic Enrichment → Outreach Synthesis → Clay Handoff
```

**Ahab** (The Hunter) finds companies. Given a campaign target profile, Ahab runs grounded web searches against job boards, LinkedIn, and company signals. It filters aggregators, deduplicates by company name, and writes one Postgres row per lead with `status='Scraped'`.

**Nemo** (The Intelligence Analyst) enriches companies forensically. Nemo reads Ahab's payload, performs a second round of grounded research, and diagnoses the company against a four-archetype friction framework: API Stutter, Scale Friction, Manual Data Debt, or Displacement Signal. It writes contact recon, funding signals, and a structured enrichment payload with `status='Enriched'` — or routes failures to `fleet_errors` with `status='Shipwrecked'`.

**Neptune** (The Authority Engine) synthesizes the outreach message. Neptune reads Nemo's payload and produces a Robert Collier-style outreach Bite — grounded in the specific friction pattern observed, written from the voice of a researcher who spent 200 hours studying GTM failure patterns, never from an advisor or consultant. Output is a `status='Finished'` row with `outreach_bite` ready for Clay or a sequencing tool.

---

## The Single-File Orchestrator

`server.js` at the repo root is the central artifact of V1.

All three agent system prompts (`AHAB_SYSTEM`, `NEMO_SYSTEM`, `NEPTUNE_SYSTEM`), all payload utility functions (`extractFrictionType`, `normalizeNemoPayload`, `sanitizeDirectUrl`, `stripCitations`, `extractFundingSignal`), and all route logic (`/api/ahab`, `/api/nemo`, `/api/neptune`, `/api/seed`, `/api/reprocess`, `/api/requeue`) live in one file by design.

This was a deliberate V1 architectural choice. Keeping everything in one file made every failure mode immediately visible and addressable — there was no abstraction layer to hide the breakage. It also made the limitations of the design undeniable. When a single file is handling prompt logic, database writes, error routing, and API calls for three agents simultaneously, the ceiling of that approach becomes clear quickly. That ceiling is what motivated V2.

---

## The Agents

| Agent | Persona | Model | Grounding | Role |
|---|---|---|---|---|
| Ahab | The Hunter | Gemini 2.5 Flash | Google Search | High-volume discovery — scrapes, filters aggregators, seeds Postgres |
| Nemo | The Intelligence Analyst | Gemini 2.5 Pro | Google Search | Single-lead forensic enrichment — friction diagnosis, contact recon, SHIPWRECKED routing |
| Neptune | The Authority Engine | Gemini 2.5 Pro | None | Outreach synthesis — converts friction profile into a Schwartz-style Bite |

Each agent has a dedicated system prompt defined inline in `server.js` (`AHAB_SYSTEM`, `NEMO_SYSTEM`, `NEPTUNE_SYSTEM`). The prompts encode persona, output contract, failure behavior, and voice constraints — everything that determines how the agent reasons, not just what it returns.

**Further documentation:**

| Document | What it contains |
|---|---|
| `server.js` | All three agent prompts inline — the canonical source of truth for agent behavior |
| `framework/prompts/` | Standalone YAML versions of each system prompt |
| `framework/agents/archive/` | Base agent definitions — early-stage persona and directive drafts |
| `framework/prompt_library/` | Campaign-specific prompt configs — how each campaign targets and filters |
| `framework/api/agent_platform_call.md` | Agent Platform API call structure — request format, auth, grounding config per agent |
| `ARCHITECTURE.md` | Repo map — data flow, pull model, where each agent lives |
| `REFERENCES.md` | Agent output contracts and Forensic Dictionary definitions |
| `system_files/CHANGELOG.md` | 18 failure modes — what broke in each agent, why, and exactly what was changed |

---

## Architecture

### The Pull Model

The first iteration pushed full payloads through n8n nodes. That design broke under load: node memory limits capped batch sizes, any failure lost the payload entirely, and nothing was queryable mid-pipeline.

The V1 architecture is a Pull Model. n8n acts as a scheduler and traffic controller only. It passes a single `session_id` string between nodes — never lead data. Each agent reads its own input from Postgres and writes its output back to Postgres. The database is the shared context surface.

```
Cloud Scheduler → n8n → [session_id] → Ahab → Postgres
                          [session_id] → Nemo  → Postgres
                          [session_id] → Neptune → Postgres → Clay
```

This means:
- Failures are recoverable — re-run any agent with the same `session_id`
- Every stage is independently queryable in Retool
- Batch size is limited only by Ahab's token ceiling, not n8n memory
- The `/api/reprocess` endpoint can re-run Neptune on any lead independently

### Single-File Orchestrator

All agent logic — prompts, response schemas, Postgres queries, error handling, parser recovery, and routing — lives in a single file: `server.js`. No abstraction layers, no shared modules between agents, no framework. Each agent is a self-contained Express route. This was the design choice that made the failure modes visible and addressable.

### Stack

| Component | Detail |
|---|---|
| Orchestrator | `server.js` — Express, hosted on Cloud Run (`fleet-agents`) |
| Database | Postgres 15 (`nocodb_data`), Cloud SQL, private IP via Direct VPC Egress |
| Scheduler | Cloud Scheduler → n8n (Cloud Run) → `fleet-agents` HTTP |
| AI Models | Gemini 2.5 Flash (Ahab), Gemini 2.5 Pro (Nemo, Neptune) via Agent Platform |
| Visibility | Retool — read-only UI over Postgres |
| Containerization | Docker — n8n and app containers defined in `system_files/infra/docker/` |

### session_id

Generated server-side by Ahab on INSERT:

```js
const session_id = 'lead_' + company_name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
```

Deterministic by company name. The ON CONFLICT clause protects Enriched and Finished rows from being reset by nightly re-runs — the DO UPDATE clause only fires when `status = 'Scraped'`.

---

## Campaigns

Six campaigns ran across 45 days:

| Campaign | Output Table | Schedule |
|---|---|---|
| GTM Career Hunt | `gtm_career_leads` | Daily 2AM |
| GTM Upwork Hunt | `gtm_upwork_leads` | Daily 6AM |
| Accountant Career Hunt | `accountant_career_leads` | Daily 4AM |
| Accountant Bulk Enrichment | `accountant_bulk_leads` | Weekly Mon 3AM |
| Accountant Upwork Hunt | `accountant_upwork_leads` | Daily 7AM |
| Researcher Career Hunt | `researcher_career_leads` | Daily 2:30AM |

---

## Stress Test Results

- **1,500 enrichment cycles** across 45 days
- **18 documented failure modes** — all resolved (see `system_files/CHANGELOG.md` and `changelog.html`)
- **500+ leads** enriched and staged for Clay handoff
- **6 campaigns** running concurrently on separate schedules

Failure modes spanned: null payload routing, JSONB serialization bugs, ON CONFLICT logic errors, prompt output drift, schema gaps, dead code in session_id handlers, race conditions between status writes, and invisible failure paths in Nemo and Neptune catch blocks.

Every failure mode is documented forensically in `system_files/CHANGELOG.md`: what broke, why it broke, and exactly what was changed to fix it. This is the primary portfolio artifact from V1.

---

## What V1 Discovered

**Clay is the superior native enrichment layer downstream.**

The V1 stack validated the design patterns that make AI enrichment reliable: stage contracts, pull-model state management, typed output schemas, parser recovery, and failure visibility. But the infrastructure cost of maintaining those patterns over a self-hosted stack — Cloud Run, Cloud SQL, VPC, n8n, Retool, Docker — is high. Every architectural decision that looked like flexibility was actually a maintenance surface.

Clay implements the same stage-contract discipline natively, inside a workbook, without the infrastructure. A Clay table column is a memory-bearing handoff. The same pattern that required a Postgres row + session_id in V1 becomes a Clay enrichment column in V2.

**Single-file orchestration over open-source middleware is an unsustainable execution environment.**

`server.js` being a single file made the failure modes visible and fixed them faster than a modular architecture would have. But n8n's internal state, Cloud Run cold starts, VPC connector instability, and the coordination overhead between six independent systems created a fragile execution layer. The architecture proved the thesis. It did not prove it could scale without breaking.

---

## Repository Structure

```
server.js                          ← Single-file orchestrator (all three agent prompts inline)
system_files/
  CHANGELOG.md                     ← 18 failure modes — forensic record
  src/
    agents/                        ← Ahab, Nemo, Neptune agent modules
    utils/                         ← db.js, parser.py, python.js, gemini.js, prompts.js
    workers/                       ← shark-worker.js
  infra/docker/                    ← Dockerfile.n8n, docker-compose.yml, service YAML
  install/                         ← Dockerfile, package.json, deploy.sh
framework/
  prompts/                         ← Current system prompts (ahab, nemo, neptune)
  agents/archive/                  ← Base agent YAML definitions
  prompt_library/                  ← Campaign-specific prompt configs
  api/                             ← Agent Platform API call structure
  schema/                          ← Campaign table SQL template
CLAUDE.md                          ← AI orientation file — boundaries, key files, V2 pointer
ARCHITECTURE.md                    ← Repo map for reviewers landing cold
REFERENCES.md                      ← Agent output contracts and Forensic Dictionary
CLAY_PLAYBOOK.md                   ← Downstream Clay handoff design
changelog.html                     ← Rendered architecture log (portfolio artifact)
index.html                         ← Pipeline overview (portfolio artifact)
```

---

## What Came Next

This pipeline stress-tested the agent logic and identified the limits of self-hosted orchestration. The infrastructure — Postgres, n8n, Docker — was the failure domain, not the agents. The V2 rebuild, agentic-gtm-mcp, eliminates that environment entirely and routes enrichment through Cloud-native tooling, MCP delivery, and shared agent memory. View V2 →
