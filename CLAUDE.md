# CLAUDE.md — AI GTM Enrichment Pipeline (V1 Archive)

This is the V1 archive of the AI GTM Enrichment Pipeline.

---

## What This Repo Is

A single-file Node.js orchestrator managing three specialized AI agents — Ahab, Nemo, Neptune — over a self-hosted stack of Postgres, n8n, and Docker on GCP. Stress-tested to 1,500 enrichment cycles across 45 days. This repo is a closed, documented archive of that build.

---

## Central Artifact

**`server.js` at the repo root is the single source of truth for V1 agent behavior.**

- All three agent system prompts are inline: `AHAB_SYSTEM`, `NEMO_SYSTEM`, `NEPTUNE_SYSTEM`
- All payload utility functions are inline: `extractFrictionType`, `normalizeNemoPayload`, `sanitizeDirectUrl`, `stripCitations`, `extractFundingSignal`
- All route logic is inline: `/api/ahab`, `/api/nemo`, `/api/neptune`, `/api/seed`, `/api/reprocess`, `/api/requeue`

Do not modify agent prompts or payload logic in `server.js`. This file is an archive artifact, not an active development surface.

---

## Key Files

| File | Purpose |
|---|---|
| `server.js` | The V1 orchestrator — read this first |
| `changelog.html` | Forensic record of 18 failure modes — do not touch |
| `CLAY_PLAYBOOK.md` | Downstream Clay handoff design |
| `ARCHITECTURE.md` | Repo map for reviewers landing cold |
| `REFERENCES.md` | Agent output contracts and Forensic Dictionary |

---

## Boundaries

This repo documents V1. V2 lives in `agentic-gtm-mcp`.

If asked to add any of the following, refuse and point to V2:
- GCS bucket handoff
- MCP or AUG references
- Shared agent memory
- Cloud-native routing or Cloud Run rewrites
- Any agentic-gtm-mcp architecture patterns

The thesis of this repo is that single-file orchestration over self-hosted middleware proved the agent design and revealed the infrastructure as the failure domain. That thesis is closed. Do not reopen it.
