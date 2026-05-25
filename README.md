# AI GTM Enrichment Pipeline

An AI GTM enrichment system that turns public market signals into governed, CRM-ready payloads through staged agents, structured QA, and clean handoff contracts.

The architecture focuses on the operational layer where AI strategy becomes useful GTM execution: source discovery, diagnostic enrichment, model-output governance, failure visibility, and final payload design for Clay, HubSpot, or downstream revenue workflows.

## Core Thesis

Generic enrichment answers are cheap. Durable enrichment requires stage contracts.

This system demonstrates that enrichment quality improves when the workflow becomes a shared context surface. Each stage writes a small, durable payload that later stages can inherit instead of restarting from raw web context.

```text
Clay columns are not just lookups.
They can be memory-bearing handoffs.
```

The server architecture used Postgres for that shared context surface. A Clay-native version can use the table itself.

## What The System Demonstrates

The pipeline used Google Cloud, n8n, Postgres, and Gemini as a runtime stack to validate the design patterns behind reliable AI-assisted enrichment:

- Lead workflows need stage contracts, not one giant prompt.
- Workflow tools should pass stable identifiers instead of heavy AI payloads.
- Grounded search is useful for discovery when strict filters protect against job-board noise.
- AI output needs contracts, fallback behavior, parser recovery, and failure visibility.
- Later enrichments are more useful when they inherit structured judgment from earlier stages.
- The final value is a trustworthy GTM payload that can move into Clay, HubSpot, or a sequencing tool with clean state.

## System Overview

The pipeline has three core stages:

```text
Discovery -> Diagnostic Enrichment -> Final Payload
```

The infrastructure around those stages:

```text
Cloud Scheduler -> n8n -> fleet-agents API -> Postgres -> Retool
```

n8n acts as traffic control. It triggers the workflow and passes stable identifiers. The server and database handle enrichment state, model output, parser recovery, and inspection.

## Core Architecture Decision: Pull Model

The first version pushed full payloads through n8n. That design created brittle handoffs because every node carried too much context: source URLs, company notes, research strings, model logs, contacts, health signals, and partial output fields. Payloads grew, expressions broke, and downstream model calls received polluted context.

The system moved to a pull model:

```text
Discovery writes payload to Postgres
n8n passes session_id
Enrichment reads by session_id and writes structured payload
n8n passes session_id
Final render reads by session_id and writes final output
```

This reduced handoffs to a stable key and made every stage independently inspectable.

## Discovery: Search Filtering

The discovery stage finds companies with active GTM, RevOps, MarOps, automation, or AI workflow signals.

Key behaviors:

- Used Gemini with Google Search grounding to reach live web evidence.
- Searched from role and campaign instructions rather than a static lead list.
- Used job-posting search patterns to reach company career pages and relevant openings.
- Filtered job-board aggregators such as Indeed, LinkedIn Jobs, Glassdoor, Jobgether, Jobsora, and ZipRecruiter.
- Generated deterministic `session_id` values from company names.
- Wrote one row per company to Postgres with `status = 'Scraped'`.

Grounded search plus strict company filtering turns noisy public hiring surfaces into structured GTM inputs.

Relevant files:

- `system_files/src/agents/ahab.js`
- `agent_framework/prompts/ahab_system.yaml`
- `n8n_pipelines/WORKFLOW_BUILDER.md`

## Diagnostic Enrichment

The enrichment stage reads a stored discovery payload and produces a structured enrichment object. The work is diagnostic, not generic enrichment: the system classifies operational friction into reusable categories.

| Friction type | Meaning |
|---------------|---------|
| `API Stutter` | Tools exist but do not communicate cleanly |
| `Scale Friction` | Growth is outpacing operational infrastructure |
| `Manual Data Debt` | Humans are doing work that should be automated |
| `Displacement Signal` | A company is paying for a tool or role that points to a better system-level fix |

It also handles disqualification. If a funding or growth signal is stale, the row can be marked `Shipwrecked` instead of being pushed forward as a false positive.

Relevant files:

- `system_files/src/agents/nemo.js`
- `agent_framework/prompts/nemo_system.yaml`
- `system_files/src/utils/parser.js`
- `system_files/src/utils/parser.py`

## Parser Layer

The parser layer is the practical bridge between n8n, model output, and server code.

`parser.py` normalizes n8n payloads into a smaller shape the server can reliably process:

```json
{
  "session_id": "lead_example_company",
  "company_name": "Example Company",
  "email": null,
  "friction_type": "API Stutter"
}
```

`parser.js` handles runtime cleanup:

- Strips citation markers such as `[1]` and `[2, 3]`.
- Rejects Vertex AI grounding redirect URLs.
- Extracts valid JSON from markdown-wrapped model output.
- Locates friction and funding signals across inconsistent model output paths.
- Normalizes contact payloads without corrupting JSONB.

The parser layer exposes the real production gap between "the model produced something" and "the workflow can safely use it."

## Final Payload Synthesis

The final render stage reads the enriched record and produces the handoff payload.

The useful pattern is that a final render stage should receive a narrow, validated brief rather than the full research context. This stage validates whether funding, friction type, contact context, and service intent are enough to produce specific human-facing language and a CRM-ready next-step payload.

Relevant files:

- `system_files/src/agents/neptune.js`
- `agent_framework/prompts/neptune_system.yaml`
- `agent_framework/agents/stage_contracts.md`

## Stage Contracts

The stage-contract document is the spine of the project. It defines what each stage must receive, what it must produce, and what the next stage can assume.

Agent workflows fail when every step receives "everything." Stage contracts force each stage to expose only the fields downstream work needs.

Key contract ideas:

- Discovery can be skipped if a pre-sourced list satisfies the enrichment minimum input.
- Enrichment must produce a structured `Enriched_Lead`.
- The final render stage should not receive raw discovery output.
- A deterministic handoff layer can strip full enrichment into a minimal brief.

Relevant file:

- `agent_framework/agents/stage_contracts.md`

## n8n's Role

n8n is deliberately not the intelligence layer.

Its job:

- Trigger the workflow.
- Send the campaign message or seed list.
- Parse returned `session_id` values.
- Call the next stages with only `session_id`.

Its non-job:

- Carry full lead payloads.
- Transform model outputs.
- Hold business logic.
- Decide enrichment strategy.

That division keeps orchestration separate from enrichment intelligence. If n8n can be reduced to handoffs, Clay columns can become the handoffs.

Relevant files:

- `n8n_pipelines/WORKFLOW_BUILDER.md`
- `n8n_pipelines/WORKFLOW_USAGE.md`

## Failure Modes Resolved

The system is useful because failures were documented and designed around.

Important fixes included:

- Aggregator companies being mistaken for target accounts.
- Vertex AI redirect URLs being stored instead of real company domains.
- Model citations polluting string fields.
- Contact JSON being stored incorrectly inside JSONB.
- Enriched rows being reset to `Scraped` on reruns.
- Stale leads briefly appearing alive.
- Model truncation creating empty final output.
- Stage failures being invisible without `fleet_errors`.

Relevant file:

- `system_files/CHANGELOG.md`

## Clay-Native Translation

The server stack validated the contracts. Clay is the natural operating surface for a GTM team that wants the same logic inside a table.

The Clay-native design uses:

- Clay tables with stable identifiers.
- One job per AI column.
- Waterfall enrichment with cost gates.
- Forensic signal columns.
- A compact handoff column.
- A final payload/render column.
- HubSpot-ready export fields and QA gates.

That design is documented in:

- `CLAY_PLAYBOOK.md`

## Reviewer Path

If you are reviewing this project for a GTM Engineering, RevOps, MarOps, Marketing Automation, or AI Workflow Strategy role, read in this order:

1. `README.md` -- architecture story and why it matters.
2. `agent_framework/agents/stage_contracts.md` -- input/output contracts.
3. `system_files/src/utils/parser.py` -- n8n-to-server normalization.
4. `system_files/src/utils/parser.js` -- cleanup and extraction layer.
5. `system_files/src/agents/ahab.js` -- grounded discovery and aggregator filtering.
6. `system_files/src/agents/nemo.js` -- diagnostic enrichment stage.
7. `system_files/src/agents/neptune.js` -- final synthesis stage.
8. `CLAY_PLAYBOOK.md` -- Clay-native translation.

## Role Fit

This project is relevant to:

- GTM Engineering
- RevOps and Marketing Operations
- AI Workflow Architecture
- Automation Strategy
- CRM Operations
- Clay builder / enrichment systems roles
- Data-driven growth operations

The code exists to prove systems thinking in the operating layer: clean handoffs, CRM-ready payloads, enrichment discipline, context control, model-output QA, and failure visibility.
