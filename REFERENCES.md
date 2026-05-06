# REFERENCES.md — outbound-pipeline

## Agent Files

| File | Purpose |
|---|---|
| `framework/agents/archive/ahab_base.yaml` | Ahab system prompt — archived n8n-era version, retained for reference |
| `framework/agents/archive/nemo_base.yaml` | Nemo system prompt — archived n8n-era version, retained for reference |
| `framework/agents/archive/neptune_base.yaml` | Neptune system prompt — archived n8n-era version, retained for reference |
| `framework/agents/stage_contracts.md` | Formal I/O contracts between agents (Ahab→Nemo→Neptune) |
| `framework/prompts/ahab_system.yaml` | Ahab active system prompt placeholder — source: server.js AHAB_SYSTEM |
| `framework/prompts/nemo_system.yaml` | Nemo active system prompt placeholder — source: server.js NEMO_SYSTEM |
| `framework/prompts/neptune_system.yaml` | Neptune active system prompt placeholder — source: server.js NEPTUNE_SYSTEM |

> Active agent behavior lives in `fleet-agents/server.js`. The YAML files above are reference/staging copies only.

## API + Workflow

| File | Purpose |
|---|---|
| `framework/api/agent_platform_call.md` | Agent Platform endpoints, request bodies, response parsing, pre-Ahab dedup |
| `campaigns/{name}/workflow*.json` | n8n workflow per campaign — import via n8n UI |
| `framework/WORKFLOW_BUILDER.md` | Step-by-step guide for building or modifying workflow JSONs |
| `framework/WORKFLOW_USAGE.md` | Bulk enrichment and re-enrich workflow usage guide |

## Prompt Library

| File | Purpose |
|---|---|
| `framework/prompt_library/{campaign}.yaml` | Campaign-specific prompt injections — aims the agents at the right ICP |
| `framework/prompts/` | Active system prompt staging area — edit here before promoting to server.js |

## Schema

| File | Purpose |
|---|---|
| `framework/schema/campaign_template.sql` | Template for creating new campaign output tables in Cloud SQL |

## Setup + Reference

| File | Purpose |
|---|---|
| `framework/setup/new_campaign.md` | Checklist for standing up a new campaign from scratch |
| `framework/RETOOL_SETUP.md` | Retool SQL queries and detail panel binding guide |
| `fleet-agents/CHANGELOG.md` | All server.js fixes, architecture decisions, and known gaps |
| `fleet-agents/RECONSTRUCTION.md` | How to reconstruct server.js from scratch if lost |

## Session State

| File | Purpose |
|---|---|
| `STATE.md` | Live infrastructure status + Pickup Point — read first every session |
| `DECISIONS.md` | Locked architecture decisions — do not re-litigate |
