# WORKFLOW_BUILDER.md — Pull Model Workflow Construction

This is a deterministic instruction set. Follow it mechanically. Do not make architectural decisions. Every campaign workflow is structurally identical — only the campaign-specific variables change.

---

## 1. Pull Model Template

Every workflow is exactly 6 nodes in a linear chain. No branching. No conditionals. No IF nodes.

```
Engine_Ignition → Set_Campaign_Message → Ahab_Fleet_Call → Parse_Session_IDs → Nemo_Fleet_Call → Neptune_Fleet_Call
```

### Node 1 — Engine_Ignition

```json
{
  "id": "node-01-engine-ignition",
  "name": "Engine_Ignition",
  "type": "n8n-nodes-base.scheduleTrigger",
  "typeVersion": 1.2,
  "position": [0, 300],
  "parameters": {
    "rule": {
      "interval": [
        {
          "field": "cronExpression",
          "expression": "{{CRON_EXPRESSION}}"
        }
      ]
    }
  }
}
```

**Variable:** `{{CRON_EXPRESSION}}` — set per campaign. See Section 3.

---

### Node 2 — Set_Campaign_Message

```json
{
  "id": "node-02-set-campaign-message",
  "name": "Set_Campaign_Message",
  "type": "n8n-nodes-base.set",
  "typeVersion": 3.4,
  "position": [220, 300],
  "parameters": {
    "assignments": {
      "assignments": [
        {
          "id": "1",
          "name": "campaign_message",
          "value": "{{CAMPAIGN_MESSAGE}}",
          "type": "string"
        }
      ]
    },
    "options": {}
  }
}
```

**Variable:** `{{CAMPAIGN_MESSAGE}}` — plain string, written for Ahab. See Section 3 for format rules.

---

### Node 3 — Ahab_Fleet_Call

```json
{
  "id": "node-03-ahab-fleet-call",
  "name": "Ahab_Fleet_Call",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [440, 300],
  "parameters": {
    "method": "POST",
    "url": "https://fleet-agents-954265623326.us-central1.run.app/api/ahab",
    "sendBody": true,
    "bodyContentType": "json",
    "bodyParameters": {
      "parameters": [
        {
          "name": "message",
          "value": "={{ $json.campaign_message }}"
        }
      ]
    },
    "options": {}
  }
}
```

**Nothing changes in this node across campaigns.** URL, body field name, and expression are fixed.

---

### Node 4 — Parse_Session_IDs

```json
{
  "id": "node-04-parse-session-ids",
  "name": "Parse_Session_IDs",
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "position": [660, 300],
  "parameters": {
    "jsCode": "const ids = $input.first().json?.session_ids || [];\nreturn ids.map(id => ({ json: { session_id: id } }));"
  }
}
```

**Nothing changes in this node across campaigns.** jsCode is fixed. Do not modify it.

---

### Node 5 — Nemo_Fleet_Call

```json
{
  "id": "node-05-nemo-fleet-call",
  "name": "Nemo_Fleet_Call",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [880, 300],
  "parameters": {
    "method": "POST",
    "url": "https://fleet-agents-954265623326.us-central1.run.app/api/nemo",
    "sendBody": true,
    "bodyContentType": "json",
    "bodyParameters": {
      "parameters": [
        {
          "name": "session_id",
          "value": "={{ $json.session_id }}"
        }
      ]
    },
    "options": {}
  }
}
```

**Nothing changes in this node across campaigns.** URL, body field name, and expression are fixed.

---

### Node 6 — Neptune_Fleet_Call

```json
{
  "id": "node-06-neptune-fleet-call",
  "name": "Neptune_Fleet_Call",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [1100, 300],
  "parameters": {
    "method": "POST",
    "url": "https://fleet-agents-954265623326.us-central1.run.app/api/neptune",
    "sendBody": true,
    "bodyContentType": "json",
    "bodyParameters": {
      "parameters": [
        {
          "name": "session_id",
          "value": "={{ $json.session_id }}"
        }
      ]
    },
    "options": {}
  }
}
```

**Nothing changes in this node across campaigns.** URL, body field name, and expression are fixed.

---

### Connections Block

```json
"connections": {
  "Engine_Ignition": {
    "main": [[{ "node": "Set_Campaign_Message", "type": "main", "index": 0 }]]
  },
  "Set_Campaign_Message": {
    "main": [[{ "node": "Ahab_Fleet_Call", "type": "main", "index": 0 }]]
  },
  "Ahab_Fleet_Call": {
    "main": [[{ "node": "Parse_Session_IDs", "type": "main", "index": 0 }]]
  },
  "Parse_Session_IDs": {
    "main": [[{ "node": "Nemo_Fleet_Call", "type": "main", "index": 0 }]]
  },
  "Nemo_Fleet_Call": {
    "main": [[{ "node": "Neptune_Fleet_Call", "type": "main", "index": 0 }]]
  }
}
```

**Nothing changes in this block across campaigns.**

---

### Top-Level Wrapper

```json
{
  "id": "{{WORKFLOW_ID}}",
  "name": "{{WORKFLOW_NAME}}",
  "nodes": [...],
  "connections": {...},
  "settings": {
    "executionOrder": "v1"
  },
  "staticData": null,
  "pinData": {}
}
```

**Variables:** `{{WORKFLOW_ID}}` and `{{WORKFLOW_NAME}}` — see Section 3.

---

## 2. Step-by-Step Build Instructions

Follow these steps in order. Do not skip steps.

**Step 1 — Determine campaign variables.**
Collect these four values before writing any JSON:
- `WORKFLOW_ID` — kebab-case string, e.g. `GTM-Career-Hunt-V6`
- `WORKFLOW_NAME` — human-readable, e.g. `GTM Career Hunt V6`
- `CRON_EXPRESSION` — standard 5-field cron, e.g. `0 2 * * *`
- `CAMPAIGN_MESSAGE` — plain English string for Ahab (see Section 3 for format)

**Step 2 — Copy the top-level wrapper.**
Start with the wrapper JSON from Section 1. Fill in `WORKFLOW_ID` and `WORKFLOW_NAME`.

**Step 3 — Copy all 6 node blocks.**
Copy each node verbatim from Section 1. Nodes 3–6 require no edits. Edit only:
- Node 1: replace `{{CRON_EXPRESSION}}`
- Node 2: replace `{{CAMPAIGN_MESSAGE}}`

**Step 4 — Copy the connections block.**
Copy verbatim. No edits required.

**Step 5 — Copy the settings, staticData, pinData fields.**
Copy verbatim. No edits required.

**Step 6 — Save the file.**
Save to: `outbound-pipeline/campaigns/{{campaign_slug}}/workflow_v6.json`
where `{{campaign_slug}}` is the lowercase underscore directory name, e.g. `gtm_career_hunt`.

**Step 7 — Run the validation checklist** (Section 5) before importing into n8n.

---

## 3. Variable Substitution Rules

### What changes per campaign

| Variable | Description | Example |
|---|---|---|
| `WORKFLOW_ID` | Top-level id field. Format: `{Domain}-{Channel}-Hunt-V6` | `GTM-Career-Hunt-V6` |
| `WORKFLOW_NAME` | Top-level name field. Human-readable. | `GTM Career Hunt V6` |
| `CRON_EXPRESSION` | Standard 5-field cron. Minute Hour * * * | `0 2 * * *` (2AM daily) |
| `CAMPAIGN_MESSAGE` | Plain string passed to Ahab as the search instruction. | See format below. |

### CAMPAIGN_MESSAGE format

The campaign message is the only creative input in the entire workflow. It must contain:
1. Campaign name (`Campaign: {Name}.`)
2. What to search for (role types, company stage, industry)
3. Tech signals to look for (tool names)
4. Filters (remote only, active listings only, etc.)
5. A closing directive (`Return maximum leads.`)

Template:
```
Campaign: {Campaign Name}. Search for {role types} at {company profile}. Tech signals: {tool1}, {tool2}, {tool3}. {filters}. Return maximum leads.
```

### What never changes

These are fixed across every campaign workflow. Do not modify them:

| Element | Fixed Value |
|---|---|
| Node types and typeVersions | Exactly as shown in Section 1 |
| Node names | `Engine_Ignition`, `Set_Campaign_Message`, `Ahab_Fleet_Call`, `Parse_Session_IDs`, `Nemo_Fleet_Call`, `Neptune_Fleet_Call` |
| Node positions | `[0,300]`, `[220,300]`, `[440,300]`, `[660,300]`, `[880,300]`, `[1100,300]` |
| Ahab URL | `https://fleet-agents-954265623326.us-central1.run.app/api/ahab` |
| Nemo URL | `https://fleet-agents-954265623326.us-central1.run.app/api/nemo` |
| Neptune URL | `https://fleet-agents-954265623326.us-central1.run.app/api/neptune` |
| Ahab body field | `name: "message"`, `value: "={{ $json.campaign_message }}"` |
| Nemo body field | `name: "session_id"`, `value: "={{ $json.session_id }}"` |
| Neptune body field | `name: "session_id"`, `value: "={{ $json.session_id }}"` |
| Parse_Session_IDs jsCode | `const ids = $input.first().json?.session_ids \|\| [];\nreturn ids.map(id => ({ json: { session_id: id } }));` |
| All connections | Exactly as shown in Section 1 |
| settings.executionOrder | `"v1"` |
| staticData | `null` |
| pinData | `{}` |

### What does NOT go in the workflow

These belong in server.js, not in n8n:
- Agent system prompts
- Gemini model selection
- Response schemas
- Postgres table names
- Session ID generation logic
- SHIPWRECKED handling
- Any data transformation beyond splitting session_ids

n8n is a traffic controller. It fires the schedule and passes session_id. Everything else is server-side.

---

## 4. Worked Example — GTM Career Hunt

**Campaign variables:**

| Variable | Value |
|---|---|
| `WORKFLOW_ID` | `GTM-Career-Hunt-V6` |
| `WORKFLOW_NAME` | `GTM Career Hunt V6` |
| `CRON_EXPRESSION` | `0 2 * * *` |
| `CAMPAIGN_MESSAGE` | `Campaign: GTM Career Hunt. Search for remote RevOps, MarOps, GTM Engineering, Marketing Automation roles at Series A/B B2B SaaS companies. Tech signals: n8n, Clay, HubSpot, Zapier, Salesforce. Remote only. Active listings only. Return maximum leads.` |

**Output table in Postgres:** `gtm_career_leads`
*(Table name is set in server.js, not in the workflow.)*

**File saved to:** `outbound-pipeline/campaigns/gtm_career_hunt/workflow_v6.json`

**Complete workflow JSON:**

```json
{
  "id": "GTM-Career-Hunt-V6",
  "name": "GTM Career Hunt V6",
  "nodes": [
    {
      "id": "node-01-engine-ignition",
      "name": "Engine_Ignition",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.2,
      "position": [0, 300],
      "parameters": {
        "rule": {
          "interval": [
            { "field": "cronExpression", "expression": "0 2 * * *" }
          ]
        }
      }
    },
    {
      "id": "node-02-set-campaign-message",
      "name": "Set_Campaign_Message",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [220, 300],
      "parameters": {
        "assignments": {
          "assignments": [
            {
              "id": "1",
              "name": "campaign_message",
              "value": "Campaign: GTM Career Hunt. Search for remote RevOps, MarOps, GTM Engineering, Marketing Automation roles at Series A/B B2B SaaS companies. Tech signals: n8n, Clay, HubSpot, Zapier, Salesforce. Remote only. Active listings only. Return maximum leads.",
              "type": "string"
            }
          ]
        },
        "options": {}
      }
    },
    {
      "id": "node-03-ahab-fleet-call",
      "name": "Ahab_Fleet_Call",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [440, 300],
      "parameters": {
        "method": "POST",
        "url": "https://fleet-agents-954265623326.us-central1.run.app/api/ahab",
        "sendBody": true,
        "bodyContentType": "json",
        "bodyParameters": {
          "parameters": [
            { "name": "message", "value": "={{ $json.campaign_message }}" }
          ]
        },
        "options": {}
      }
    },
    {
      "id": "node-04-parse-session-ids",
      "name": "Parse_Session_IDs",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [660, 300],
      "parameters": {
        "jsCode": "const ids = $input.first().json?.session_ids || [];\nreturn ids.map(id => ({ json: { session_id: id } }));"
      }
    },
    {
      "id": "node-05-nemo-fleet-call",
      "name": "Nemo_Fleet_Call",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [880, 300],
      "parameters": {
        "method": "POST",
        "url": "https://fleet-agents-954265623326.us-central1.run.app/api/nemo",
        "sendBody": true,
        "bodyContentType": "json",
        "bodyParameters": {
          "parameters": [
            { "name": "session_id", "value": "={{ $json.session_id }}" }
          ]
        },
        "options": {}
      }
    },
    {
      "id": "node-06-neptune-fleet-call",
      "name": "Neptune_Fleet_Call",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [1100, 300],
      "parameters": {
        "method": "POST",
        "url": "https://fleet-agents-954265623326.us-central1.run.app/api/neptune",
        "sendBody": true,
        "bodyContentType": "json",
        "bodyParameters": {
          "parameters": [
            { "name": "session_id", "value": "={{ $json.session_id }}" }
          ]
        },
        "options": {}
      }
    }
  ],
  "connections": {
    "Engine_Ignition": {
      "main": [[{ "node": "Set_Campaign_Message", "type": "main", "index": 0 }]]
    },
    "Set_Campaign_Message": {
      "main": [[{ "node": "Ahab_Fleet_Call", "type": "main", "index": 0 }]]
    },
    "Ahab_Fleet_Call": {
      "main": [[{ "node": "Parse_Session_IDs", "type": "main", "index": 0 }]]
    },
    "Parse_Session_IDs": {
      "main": [[{ "node": "Nemo_Fleet_Call", "type": "main", "index": 0 }]]
    },
    "Nemo_Fleet_Call": {
      "main": [[{ "node": "Neptune_Fleet_Call", "type": "main", "index": 0 }]]
    }
  },
  "settings": {
    "executionOrder": "v1"
  },
  "staticData": null,
  "pinData": {}
}
```

---

## 5. Validation Checklist

Run these checks before importing the workflow JSON into n8n. Fix any failure before proceeding.

### Structure checks

- [ ] Top-level has exactly these keys: `id`, `name`, `nodes`, `connections`, `settings`, `staticData`, `pinData`
- [ ] `nodes` array has exactly 6 items
- [ ] Node names are exactly: `Engine_Ignition`, `Set_Campaign_Message`, `Ahab_Fleet_Call`, `Parse_Session_IDs`, `Nemo_Fleet_Call`, `Neptune_Fleet_Call`
- [ ] Node order in array matches chain order: node-01 through node-06
- [ ] `connections` has exactly 5 entries (one per node except the last)
- [ ] No extra keys at the top level (`active`, `createdAt`, `updatedAt`, `tags`, `versionId`, etc.) — strip these before import

### Content checks

- [ ] `Engine_Ignition.parameters.rule.interval[0].expression` is a valid 5-field cron string
- [ ] `Set_Campaign_Message` assignments array has exactly one assignment with `name: "campaign_message"`
- [ ] `Set_Campaign_Message` assignment value is a non-empty plain string (no expressions, no JSON)
- [ ] `Ahab_Fleet_Call` body has exactly one parameter: `name: "message"`, `value: "={{ $json.campaign_message }}"`
- [ ] `Parse_Session_IDs` jsCode is exactly: `const ids = $input.first().json?.session_ids || [];\nreturn ids.map(id => ({ json: { session_id: id } }));`
- [ ] `Nemo_Fleet_Call` body has exactly one parameter: `name: "session_id"`, `value: "={{ $json.session_id }}"`
- [ ] `Neptune_Fleet_Call` body has exactly one parameter: `name: "session_id"`, `value: "={{ $json.session_id }}"`
- [ ] All three fleet-agents URLs point to `https://fleet-agents-954265623326.us-central1.run.app`
- [ ] `settings.executionOrder` is `"v1"`
- [ ] `staticData` is `null`
- [ ] `pinData` is `{}`

### Server-side prerequisite checks (do before importing)

- [ ] The campaign's output table exists in `nocodb_data` with `session_id`, `ahab_payload`, `nemo_payload`, `neptune_payload`, `outreach_bite`, `status` columns
- [ ] `fleet_app` role has SELECT/INSERT/UPDATE on the output table
- [ ] server.js has an endpoint or routing that writes to the correct output table for this campaign
- [ ] fleet-agents Cloud Run service is deployed and reachable (test with `curl -X POST https://fleet-agents-954265623326.us-central1.run.app/api/ahab -H "Content-Type: application/json" -d '{"message":"test"}'`)

### After import into n8n

- [ ] Set the workflow to **Inactive** — do not activate until Cloud Scheduler is configured
- [ ] Verify all 6 nodes are present and connected in the n8n UI canvas
- [ ] Record the n8n workflow ID (shown in the URL after import) in `sovereign_hub.md` Workflows table
- [ ] Add Cloud Scheduler job pointing to the workflow's execute endpoint (see sovereign_hub.md Cloud Scheduler section)
- [ ] Activate only after Cloud Scheduler is confirmed

---

## 6. Template 2 — Bulk Workflow

Use when the lead list is pre-sourced (e.g. imported from a spreadsheet or Clay export). Ahab is skipped. n8n holds the list; fleet-agents seeds the rows and returns session_ids.

### Node chain

```
Engine_Ignition → Set_Bulk_Input → Seed_Fleet_Call → Parse_Session_IDs → Nemo_Fleet_Call → Neptune_Fleet_Call
```

6 nodes. Same count as Template 1. Only nodes 2 and 3 change.

### What changes vs Template 1

| Node | Template 1 | Template 2 |
|---|---|---|
| Node 2 | `Set_Campaign_Message` — plain string for Ahab | `Set_Bulk_Input` — JSON array of company objects |
| Node 3 | `Ahab_Fleet_Call` — POST `/api/ahab` with `message` | `Seed_Fleet_Call` — POST `/api/seed` with `companies` array |
| Nodes 4–6 | Unchanged | Unchanged |

### Prerequisite — new server.js endpoint

Add `/api/seed` to fleet-agents before importing this workflow. The endpoint:
- Accepts `{ companies: [{ company_name, job_url }] }`
- For each entry: derives `session_id`, builds minimal `ahab_payload`, INSERTs into the campaign table
- Applies the same AGGREGATORS filter and `sanitizeDirectUrl` as `/api/ahab`
- Uses the same `ON CONFLICT ... WHERE status = 'Scraped'` guard
- Returns `{ session_ids: [...] }` — same shape as `/api/ahab`

Downstream nodes (Parse_Session_IDs → Nemo → Neptune) are identical because the response contract is identical.

### Node 2 — Set_Bulk_Input

```json
{
  "id": "node-02-set-bulk-input",
  "name": "Set_Bulk_Input",
  "type": "n8n-nodes-base.set",
  "typeVersion": 3.4,
  "position": [220, 300],
  "parameters": {
    "assignments": {
      "assignments": [
        {
          "id": "1",
          "name": "companies",
          "value": "{{COMPANY_LIST_JSON}}",
          "type": "array"
        }
      ]
    },
    "options": {}
  }
}
```

**Variable:** `{{COMPANY_LIST_JSON}}` — a JSON array of objects. Each object must have `company_name` (required) and `job_url` (optional).

```json
[
  { "company_name": "Acme Corp", "job_url": "https://acmecorp.com/careers/revops-lead" },
  { "company_name": "Lattice", "job_url": "https://lattice.com/jobs/gtm-engineer" }
]
```

### Node 3 — Seed_Fleet_Call

```json
{
  "id": "node-03-seed-fleet-call",
  "name": "Seed_Fleet_Call",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [440, 300],
  "parameters": {
    "method": "POST",
    "url": "https://fleet-agents-954265623326.us-central1.run.app/api/seed",
    "sendBody": true,
    "bodyContentType": "json",
    "bodyParameters": {
      "parameters": [
        {
          "name": "companies",
          "value": "={{ $json.companies }}"
        }
      ]
    },
    "options": {}
  }
}
```

### Connections block

```json
"connections": {
  "Engine_Ignition": {
    "main": [[{ "node": "Set_Bulk_Input", "type": "main", "index": 0 }]]
  },
  "Set_Bulk_Input": {
    "main": [[{ "node": "Seed_Fleet_Call", "type": "main", "index": 0 }]]
  },
  "Seed_Fleet_Call": {
    "main": [[{ "node": "Parse_Session_IDs", "type": "main", "index": 0 }]]
  },
  "Parse_Session_IDs": {
    "main": [[{ "node": "Nemo_Fleet_Call", "type": "main", "index": 0 }]]
  },
  "Nemo_Fleet_Call": {
    "main": [[{ "node": "Neptune_Fleet_Call", "type": "main", "index": 0 }]]
  }
}
```

### Validation additions for Template 2

Run the Template 1 checklist, then verify:

- [ ] `Set_Bulk_Input` assignment is type `array`, not `string`
- [ ] Each object in the array has at minimum a non-empty `company_name`
- [ ] `Seed_Fleet_Call` URL ends in `/api/seed` (not `/api/ahab`)
- [ ] `Seed_Fleet_Call` body field name is `companies` (not `message`)
- [ ] `/api/seed` endpoint is deployed to fleet-agents before activating

---

## 7. Template 3 — Re-Enrich Workflow

Use to refresh existing rows where enrichment is incomplete. Reads session_ids from the database via a fleet endpoint, then re-runs the full Nemo → Neptune chain against the existing `ahab_payload`. No new leads are created.

Primary use case: backfilling `contact_name`, `contact_title`, `linkedin_url` on rows that completed before those columns were added.

### Node chain

```
Engine_Ignition → Fetch_Requeue_IDs → Parse_Session_IDs → Nemo_Fleet_Call → Neptune_Fleet_Call
```

5 nodes. No Set node (no input to configure). No Ahab.

### What changes vs Template 1

| Node | Template 1 | Template 3 |
|---|---|---|
| Node 2 | `Set_Campaign_Message` — sets Ahab search prompt | Removed entirely |
| Node 3 | `Ahab_Fleet_Call` — discovers new leads | `Fetch_Requeue_IDs` — queries existing rows at `/api/requeue` |
| Nodes 4–6 | Parse → Nemo → Neptune | Identical — same node bodies, same positions shifted left by one slot |

Node positions shift: `[0,300]`, `[220,300]`, `[440,300]`, `[660,300]`, `[880,300]`.

### Prerequisite — new server.js endpoint

Add `/api/requeue` to fleet-agents before importing this workflow. The endpoint:
- Accepts no body (or optional `{ criteria }` for future extension)
- Queries: `SELECT session_id FROM gtm_career_leads WHERE contact_name IS NULL AND status = 'Finished' LIMIT 50`
- Returns `{ session_ids: [...] }` — same shape as `/api/ahab`
- The LIMIT 50 guard prevents runaway re-enrichment batches on large tables

Nemo's `/api/nemo` handler is unchanged — it already reads `ahab_payload` from the row and re-enriches. Re-Enrich simply re-invokes the same endpoint on existing rows.

### Node 1 — Engine_Ignition

Same as Template 1. Set a weekly or on-demand cron. Example: `0 6 * * 0` (Sundays at 6AM).

### Node 2 — Fetch_Requeue_IDs

Replaces both `Set_Campaign_Message` and `Ahab_Fleet_Call` from Template 1.

```json
{
  "id": "node-02-fetch-requeue-ids",
  "name": "Fetch_Requeue_IDs",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [220, 300],
  "parameters": {
    "method": "POST",
    "url": "https://fleet-agents-954265623326.us-central1.run.app/api/requeue",
    "sendBody": false,
    "options": {}
  }
}
```

No body. The endpoint determines the query criteria internally.

### Node 3 — Parse_Session_IDs

Identical to Template 1. Same jsCode, same position shifted to `[440, 300]`.

### Node 4 — Nemo_Fleet_Call

Identical to Template 1. Position `[660, 300]`.

### Node 5 — Neptune_Fleet_Call

Identical to Template 1. Position `[880, 300]`.

### Connections block

```json
"connections": {
  "Engine_Ignition": {
    "main": [[{ "node": "Fetch_Requeue_IDs", "type": "main", "index": 0 }]]
  },
  "Fetch_Requeue_IDs": {
    "main": [[{ "node": "Parse_Session_IDs", "type": "main", "index": 0 }]]
  },
  "Parse_Session_IDs": {
    "main": [[{ "node": "Nemo_Fleet_Call", "type": "main", "index": 0 }]]
  },
  "Nemo_Fleet_Call": {
    "main": [[{ "node": "Neptune_Fleet_Call", "type": "main", "index": 0 }]]
  }
}
```

### What Re-Enrich does NOT do

- It does not reset status. Nemo's UPDATE uses `status = 'Enriched'`, then Neptune sets `status = 'Finished'`. A `Finished` row that goes through Re-Enrich cycles back to `Finished` at the end — no data loss.
- It does not re-discover companies. Ahab is skipped entirely. Only the Nemo and Neptune synthesis runs again.
- It does not touch `ahab_payload`. Nemo reads `ahab_payload` as-is. If the original scrape was poor, Re-Enrich will not improve it.

### Validation additions for Template 3

Run the Template 1 checklist with these adjustments:

- [ ] `nodes` array has exactly **5** items (not 6)
- [ ] Node names are: `Engine_Ignition`, `Fetch_Requeue_IDs`, `Parse_Session_IDs`, `Nemo_Fleet_Call`, `Neptune_Fleet_Call`
- [ ] `connections` has exactly **4** entries (not 5)
- [ ] `Fetch_Requeue_IDs` URL ends in `/api/requeue`
- [ ] `Fetch_Requeue_IDs` has `sendBody: false`
- [ ] `/api/requeue` endpoint is deployed to fleet-agents before activating
- [ ] Confirm at least one row exists matching `contact_name IS NULL AND status = 'Finished'` before running
