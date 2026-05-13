# Clay Playbook: Agentic Clay Columns

This playbook translates the Reverse Engineering Clay experiment into a Clay-native operating method.

The server-era project proved the pattern with Cloud Run, n8n, Postgres, and Gemini. The Clay-native version should not rebuild that infrastructure. It should use Clay's table, enrichment, waterfall, formula, and AI-column primitives to preserve the same stage-contract discipline inside a workbook.

## Status

This is an MVP design, not a proven Clay implementation.

| Area | Confidence | Why |
|------|------------|-----|
| One job per AI column | High | Matches Clay AI-column best practice |
| Forensic signal columns | High | Clear bounded outputs: `strong` or null |
| Forensic summary column | Medium-high | Feasible if input columns are narrow and consistent |
| Awareness-stage column | Medium | Feasible, but must be tested for stability |
| Final payload/message column | Medium | Feasible if fed a compact brief, not raw row context |
| Cross-table querying | Low for v1 | Useful idea, but risky without proving Clay workspace support and cost behavior |
| Fully automated outbound | Out of scope | Clay prepares payloads; HubSpot or a sequencing tool activates them |

## Principle

Clay is the operating surface. HubSpot is the CRM/lifecycle surface. Sequencing tools handle outbound activation when needed.

Clay should not be framed as "the outbound tool." In this design, Clay produces enriched, validated, export-ready GTM payloads.

## The Column Memory Model

This model treats Clay columns as context-bearing stages.

Each Clay column does one job, writes a small output, and passes that output to later columns. The table becomes the shared context surface.

```text
input identifiers
  -> firmographic / contact enrichment
  -> forensic signal columns
  -> forensic summary
  -> awareness stage
  -> final payload
  -> HubSpot / export QA
```

The design borrows the stage-contract idea from the server project:

| Server-era role | Clay-native equivalent |
|-----------------|------------------------|
| Discovery stage | Input/source strategy and company/job-posting discovery |
| Diagnostic enrichment stage | Forensic Claygent columns |
| Handoff layer | Formula/contract columns that reduce context |
| Final render stage | Final payload column |
| Postgres status | Clay row status and QA columns |
| Retool review | Clay views and HubSpot lists |

## Minimum Viable Table

Follow Clay table-architecture rules: stable identifiers first, enrichment second, AI columns later, export columns far right.

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `domain` | Text | Input/enriched | Preferred company identifier |
| `linkedin_company_url` | Text | Input/enriched | Secondary identifier |
| `company_name` | Text | Input/enriched | Do not use alone for dedupe |
| `job_url` | Text | Input | Source evidence |
| `job_title` | Text | Input | Role signal |
| `job_description` | Text | Scraped/pasted | Main forensic source |
| `company_headcount` | Number | Enrichment | ICP/cost gate |
| `company_industry` | Text | Enrichment | ICP/cost gate |
| `company_tech_stack` | List | Enrichment | HubSpot, Salesforce, Clay, n8n, etc. |
| `funding_signal` | Text/null | Enrichment | Only use if recent and relevant |
| `icp_filter_pass` | Boolean | Formula | Gate expensive enrichment and AI |
| `campaign_focus` | Text | Static campaign value | Example: RevOps / MarOps workflow automation |
| `operator_fit` | Text | Static campaign value | Why this operator can address the pain |

## Forensic Signal Layer

Run these only when `icp_filter_pass = TRUE` and `job_description` is not empty.

Each column returns exactly:

```text
strong
```

or blank/null.

No paragraph. No explanation. No weak.

| Column | Detects |
|--------|---------|
| `ai_api_stutter_signal` | Disconnected GTM systems, sync problems, integration debt |
| `ai_scale_friction_signal` | Growth outpacing workflow or data infrastructure |
| `ai_manual_data_debt_signal` | Humans doing repetitive ops/reporting/routing work |
| `ai_displacement_signal` | Hiring/tool spend suggests a system-level alternative |

Prompt shape for each:

```text
ROLE: You are a GTM operations analyst.

CONTEXT:
Company: {{company_name}}
Job title: {{job_title}}
Job description: {{job_description}}
Campaign focus: {{campaign_focus}}

TASK:
Decide whether this job description contains a strong signal of [FRICTION TYPE].

FORMAT:
Return exactly one of:
strong

or return nothing.

RULES:
- Use only language from the job description.
- Do not infer from company name alone.
- If the signal is weak, return nothing.
- Do not explain.
```

## Forensic Summary

Column: `ai_forensic_summary`

Runs only if at least one forensic signal column is `strong`.

Reads:

- `ai_api_stutter_signal`
- `ai_scale_friction_signal`
- `ai_manual_data_debt_signal`
- `ai_displacement_signal`
- `funding_signal`
- `job_title`
- `job_description`

Output: two to three sentences maximum.

Purpose: collapse raw row evidence into the smallest useful brief for downstream columns.

Fallback: blank/null if all forensic signal columns are empty.

## Awareness Stage

Column: `ai_awareness_stage`

Reads only:

- `ai_forensic_summary`

Valid outputs:

- `Unaware`
- `Problem Aware`
- `Solution Aware`
- `Product Aware`
- `Most Aware`
- `0`

Use `0` when the row is too thin to classify. Do not stop the row. Downstream columns should default sparse rows to `Problem Aware`.

Feasibility note: this is plausible, but must be tested on 25-50 rows. Awareness classification is more subjective than signal detection.

## Final Payload Column

Column: `ai_final_payload`

This is the only AI column allowed to write user-facing message text.

Reads:

- `contact_first_name`
- `company_name`
- `ai_forensic_summary`
- `ai_awareness_stage`
- `funding_signal`
- `operator_fit`

Does not read:

- raw forensic columns
- full job description
- every enrichment field

Reason: Reverse Engineering Clay showed that wide context causes drift. The final render column should receive a compact brief, not the entire row.

Output:

- under 110 words
- first person singular
- no meeting ask
- no "we"
- no fake client/adviser language
- no taxonomy labels in the message

## HubSpot Output Layer

HubSpot should appear explicitly in the workflow because it is the CRM/lifecycle destination for RevOps and MarOps.

Export columns:

| Export column | HubSpot field |
|---------------|---------------|
| `export_email` | Email |
| `export_first_name` | First Name |
| `export_last_name` | Last Name |
| `export_company_name` | Company Name |
| `export_domain` | Website URL |
| `export_job_title` | Job Title |
| `export_friction_type` | Custom property |
| `export_forensic_summary` | Custom property |
| `export_ai_final_payload` | Custom property |
| `export_lifecycle_stage` | Lifecycle Stage or list membership input |

Pre-export QA:

- `verified_email` is populated.
- `is_valid_email = TRUE`.
- `is_role_based_email = FALSE`.
- `contact_first_name` is clean.
- `icp_filter_pass = TRUE`.
- `ai_forensic_summary` is not empty.
- `ai_final_payload` is not empty.

## Waterfall and Cost Control

Use conditional enrichment before AI.

Recommended sequence:

1. Start with `domain` or `linkedin_company_url`.
2. Enrich low-cost firmographics.
3. Compute `icp_filter_pass`.
4. Run email/contact waterfalls only on ICP rows.
5. Run forensic AI columns only on ICP rows with a usable job description.
6. Run the final payload column only after summary and awareness are present.

Do not run AI columns on every imported row. Reverse Engineering Clay was about context discipline; the Clay version should also be about credit discipline.

## Feasibility Evaluation

### What is ready for a fast test

- One Clay table.
- 25-50 rows.
- Manual or imported job descriptions.
- Four forensic signal columns.
- One forensic summary column.
- One final payload column.
- HubSpot export fields.

### What should wait

- Cross-table querying.
- Multi-table final payload assembly.
- Fully automated campaign launch.
- Large row counts.
- Complex prompt library abstraction.

These may become useful, but they are not needed to validate the method.

## Test Plan

Run an evaluation on 25 rows before scaling.

Score each row across five dimensions:

| Dimension | Pass condition |
|-----------|----------------|
| Signal accuracy | Strong/null decision matches job description evidence |
| Summary quality | Summary uses row evidence and stays under three sentences |
| Awareness stability | Stage is one of the valid outputs |
| Payload usefulness | Message uses the prospect's pain language and avoids generic claims |
| Export readiness | Required HubSpot/export fields are populated |

Fail the test if:

- More than 20% of forensic columns return explanations instead of `strong`/blank.
- Final payload reads like generic cold email.
- Funding is mentioned when stale or null.
- HubSpot export fields are incomplete.

## What This Is Not

- Not a finished Clay template.
- Not a prompt library yet.
- Not a sequencing system.
- Not a claim that Clay itself sends outbound.
- Not a replacement for HubSpot.

It is a practical next step: turn the reverse-engineered stage-contract lessons into a Clay workbook that can be tested quickly, audited row by row, and exported cleanly into HubSpot or another destination.
