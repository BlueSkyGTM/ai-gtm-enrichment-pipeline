# REFERENCES.md — AI GTM Enrichment Pipeline V1

Reference document for the agent contracts, output shapes, and core framework definitions.

**The full prompt text and all function code live in `server.js`. This document is a map, not a duplicate.**

---

## Agent System Prompts

All three system prompts are defined inline at the top of `server.js` as string constants:

| Constant | Agent | Location in server.js |
|---|---|---|
| `AHAB_SYSTEM` | Ahab — The Hunter | Defined before `/api/ahab` route |
| `NEMO_SYSTEM` | Nemo — The Intelligence Analyst | Defined before `/api/nemo` route |
| `NEPTUNE_SYSTEM` | Neptune — The Authority Engine | Defined before Neptune core function |

Read the prompts in `server.js` directly. Do not treat this document as the source of truth for prompt text.

---

## Payload Utility Functions

All utility functions are defined inline in `server.js` before the route definitions:

| Function | Purpose |
|---|---|
| `extractFrictionType(payload)` | Walks multiple payload paths to find the friction archetype string. Returns one of the four Forensic Dictionary terms or null. |
| `extractFundingSignal(payload)` | Priority-ordered path search for funding signal. Falls back to regex match against `health_audit_notes` prose. |
| `normalizeNemoPayload(payload)` | Extracts email, contact_recon object, and friction_type from Nemo's output regardless of key casing or nesting variation. |
| `sanitizeDirectUrl(url)` | Strips Vertex AI grounding redirect URLs. Returns null if the URL is a grounding artifact rather than a real company domain. |
| `stripCitations(val)` | Removes citation reference markers (e.g. `[1]`, `[2,3]`) from string values before writing to Postgres. |

---

## The Forensic Dictionary

Four archetypes Nemo diagnoses. Neptune mirrors the identified archetype in the outreach Bite.

**API Stutter**
Data tools exist but do not talk to each other. The company is buying integrations or middleware to patch gaps between systems that were never designed to connect.

**Scale Friction**
Growth is outpacing data infrastructure capacity. Processes that worked at one headcount or revenue level are visibly breaking at the current one.

**Manual Data Debt**
Humans are doing work that should be automated. The signal is usually a job posting for a role that is essentially a data wrangler, ops coordinator, or reporting analyst.

**Displacement Signal**
The company is paying a platform or generalist tool for something a specialist solution does better and cheaper. The signal is overspend on a tool that is underused for their specific use case.

---

## Agent Output Contracts

### Ahab — What it receives / what it must return

**Receives:** A campaign message string containing target profile, source channels, and filters.

**Must return:**
```json
{
  "Harpooner_Logs": ["search query string"],
  "Catch": [
    {
      "Company_Name": "string",
      "Job_URL": "string",
      "Location_Status": "string",
      "Raw_Primary_Signals": ["string"],
      "Raw_Health_Signals": ["string"]
    }
  ]
}
```

Server-side: filters aggregators, generates `session_id`, inserts to Postgres, returns `session_ids` array to n8n.

---

### Nemo — What it receives / what it must return

**Receives:** A `session_id`. Reads `ahab_payload` from Postgres.

**Must return:**
```json
{
  "Enriched_Lead": {
    "Company_Name": "string",
    "Direct_URL": "string",
    "Target_Service_Intent": "GTM | Accounting",
    "Forensic_Friction_Type": "API Stutter | Scale Friction | Manual Data Debt | Displacement Signal",
    "funding_signal": "string | null",
    "Job_Title": "string",
    "Contact_Recon": {
      "name": "string",
      "title": "string",
      "email": "string | null",
      "linkedin": "string | null"
    },
    "The_Divers": {
      "url_recon_notes": "string",
      "health_audit_notes": "string",
      "friction_notes": "string"
    }
  },
  "Nemo_Enrich_Audit": {
    "status": "ACTIVE | SHIPWRECKED",
    "reason_code": "string | null"
  }
}
```

Note: Nemo uses Google Search grounding. `responseSchema` is incompatible with grounding — the output contract is enforced via the in-prompt OUTPUT CONTRACT skeleton only.

---

### Neptune — What it receives / what it must return

**Receives:** A `session_id`. Reads `nemo_payload` from Postgres.

**Must return** (schema-enforced via `responseSchema`):
```json
{
  "Neptune_Log": {
    "intent_recognized": "string",
    "friction_strategy": "string",
    "rule_of_one_check": "string"
  },
  "Outreach_Bite": "string",
  "funding_signal": "string | null"
}
```

The `Outreach_Bite` is 3–4 sentences maximum. Opens by reflecting the prospect's reality. Names the specific failing tool or process. Offers the exact outcome they already want. Closes with one peer suggestion — never a generic call to action.
