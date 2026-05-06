# SUBAGENT_SKILL.md — GPT-4o-mini Proxy Routing

Claude tokens are reserved for reasoning, architecture, and judgment. Everything repetitive, templated, or formulaic routes to the proxy.

---

## 1. Proxy Configuration

```
URL:    https://openai-proxy-production-94e0.up.railway.app/v1/chat/completions
Auth:   X-Proxy-Auth: <value from Raymond>
Model:  gpt-4o-mini
```

**Example curl call:**

```bash
curl -s -X POST "https://openai-proxy-production-94e0.up.railway.app/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "X-Proxy-Auth: YOUR_TOKEN_HERE" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      { "role": "system", "content": "You are a precise technical writer." },
      { "role": "user", "content": "YOUR TASK HERE" }
    ],
    "max_tokens": 2000
  }'
```

---

## 2. Task Routing Rules

### Route to GPT-4o-mini proxy

| Task | Reason |
|---|---|
| Writing SQL queries from a schema | Mechanical — schema in, query out |
| Generating n8n node configs from WORKFLOW_BUILDER.md | Template substitution only |
| Formatting CSV data for Clay import | Pure transformation |
| Writing CHANGELOG entries | Structured formatting from diff |
| Updating STATE.md or DECISIONS.md | Templated state writes |
| Any repetitive formatting or templating task | No judgment required |

### Route to Claude (native)

| Task | Reason |
|---|---|
| Architecture decisions | Requires understanding PAFA design intent |
| Prompt engineering on AHAB/NEMO/NEPTUNE | Requires judgment about model behavior |
| Debugging complex production failures | Requires reading stack traces and inferring root cause |
| Interpreting fleet_errors patterns | Requires cross-referencing code and history |
| Anything requiring judgment about PAFA design | Non-negotiable — proxy cannot reason about tradeoffs |

**Rule of thumb:** If the task can be described as "fill in this template" or "transform this data," it goes to the proxy. If the task requires deciding *what* to do rather than *how* to format it, it stays with Claude.

---

## 3. How to Call the Proxy

Claude Code uses this pattern for every proxy request:

```javascript
async function callProxy(systemPrompt, userPrompt, maxTokens = 1500) {
  const response = await fetch(
    'https://openai-proxy-production-94e0.up.railway.app/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Proxy-Auth': PROXY_AUTH_TOKEN,  // provided by Raymond at session start
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: maxTokens,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Proxy error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Proxy returned empty response');
  return text;
}
```

**In Claude Code practice (Bash tool):**

```bash
curl -s -X POST "https://openai-proxy-production-94e0.up.railway.app/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "X-Proxy-Auth: $PROXY_TOKEN" \
  -d "{
    \"model\": \"gpt-4o-mini\",
    \"messages\": [
      { \"role\": \"system\", \"content\": \"$SYSTEM_PROMPT\" },
      { \"role\": \"user\", \"content\": \"$USER_PROMPT\" }
    ],
    \"max_tokens\": 1500
  }" | python3 -c "import sys,json; print(json.load(sys.stdin)['choices'][0]['message']['content'])"
```

**Error handling:** If the proxy returns non-200, log the status and fall back to Claude with a note: `[proxy unavailable — authored natively]`.

---

## 4. Busywork Task Library

Pre-written proxy prompts for the most common PAFA tasks. Copy the system + user pair directly into the proxy call pattern from Section 3.

---

### 4a. Write a Retool SQL query

**System:** `You write precise PostgreSQL SELECT queries. Return only the SQL — no explanation, no markdown.`

**User:**
```
Write a SELECT query for the table {{TABLE_NAME}} in PostgreSQL database nocodb_data.
Columns to include: session_id, company_name, status, email, friction_type, funding_signal,
contact_name, contact_title, linkedin_url, job_title, job_url, direct_url,
outreach_bite, created_at.
Filter: WHERE status != 'Scraped'
Order: created_at DESC
Limit: 200
```

---

### 4b. Generate a CHANGELOG entry

**System:** `You write terse technical CHANGELOG entries in the style of the existing entries. Match the format exactly: bold number + title, then one paragraph of what was broken and what was changed. No bullet points.`

**User:**
```
Write a CHANGELOG entry for the following changes to outbound-pipeline/fleet-agents/server.js.
Number it {{NEXT_NUMBER}}.

Changes made:
{{DIFF_OR_DESCRIPTION}}

Follow this format exactly:
**{{N}}. {{Short title}}**
{{One paragraph: what was broken or missing, what was added or changed.}}
```

---

### 4c. Format CSV for Clay import

**System:** `You format raw data as clean CSV. Return only the CSV — no explanation, no markdown fences.`

**User:**
```
Format the following data as a CSV for import into Clay.
Required columns: Company Name, Website, Contact Name, Contact Title, Email, LinkedIn URL, Outreach Bite
Source data:
{{RAW_DATA}}
```

---

### 4d. Generate n8n node config from WORKFLOW_BUILDER.md

**System:** `You generate n8n workflow JSON from a template. Return only valid JSON — no explanation, no markdown fences.`

**User:**
```
Using the Pull Model template from WORKFLOW_BUILDER.md, generate a complete n8n workflow JSON for the following campaign:

WORKFLOW_ID: {{WORKFLOW_ID}}
WORKFLOW_NAME: {{WORKFLOW_NAME}}
CRON_EXPRESSION: {{CRON_EXPRESSION}}
CAMPAIGN_MESSAGE: {{CAMPAIGN_MESSAGE}}

The template structure is:
Engine_Ignition → Set_Campaign_Message → Ahab_Fleet_Call → Parse_Session_IDs → Nemo_Fleet_Call → Neptune_Fleet_Call

Fleet-agents base URL: https://fleet-agents-954265623326.us-central1.run.app
Node positions: [0,300], [220,300], [440,300], [660,300], [880,300], [1100,300]
Parse_Session_IDs jsCode: "const ids = $input.first().json?.session_ids || [];\nreturn ids.map(id => ({ json: { session_id: id } }));"
settings.executionOrder: "v1", staticData: null, pinData: {}
```

---

### 4e. Write or update STATE.md

**System:** `You update a STATE.md file for a software project. Write in the terse imperative style of an engineering state document. Return only the updated file content.`

**User:**
```
Update the STATE.md for outbound-pipeline. Current content:
{{CURRENT_STATE_MD}}

Changes to reflect:
- {{CHANGE_1}}
- {{CHANGE_2}}

Keep all sections. Update only what changed. Do not add new sections.
```

---

## 5. Orchestration Pattern

How Claude Code conducts a full PAFA session using proxy routing.

```
SESSION START
│
├── Claude reads CONTEXT.md, STATE.md, CHANGELOG.md
│   (native — requires understanding current state)
│
├── Claude plans the task list and routes each task
│   (native — requires judgment)
│
├── For each task:
│   │
│   ├── IF proxy task (template, format, SQL, config):
│   │   ├── Claude writes the prompt using Task Library (Section 4)
│   │   ├── Claude fires Bash curl → proxy
│   │   ├── Claude parses response and writes to repo file
│   │   └── Claude confirms: "Written to [file] via proxy"
│   │
│   └── IF native task (architecture, prompt engineering, debug):
│       ├── Claude reasons and acts directly
│       └── Claude confirms: "Applied natively"
│
└── SESSION END
    ├── Claude fires proxy: "Write CHANGELOG entry for these changes: [diff]"
    ├── Claude appends proxy output to CHANGELOG.md
    └── Claude updates STATE.md via proxy with session summary
```

**Token discipline:** Claude reads all context at session start (unavoidable). After that, every write task that fits a proxy template goes to GPT-4o-mini. Claude's tokens go to the hard parts only.

---

## 6. Retool Setup Guide

> **Authored by GPT-4o-mini via proxy** (model: gpt-4o-mini-2024-07-18, completion id: chatcmpl-DcLP39mBbzabJkEXeqCVJHcNAJGiR)

# Retool Setup Guide for PAFA Pipeline

Welcome to your Retool setup guide! This guide will help you connect to a Postgres database and create a table that displays data from your campaign tables. Follow these steps carefully to set up the PAFA pipeline.

### Step 1: Sign Up for Retool
1. Go to the [Retool website](https://retool.com).
2. Click on **Sign Up**.
3. Fill out the required information to create your account, then click **Create Account**.

### Step 2: Create a New Application
1. Once logged in, click on the **Create New** button on your dashboard.
2. Select **New App** from the dropdown.

### Step 3: Connect Retool to Your Database
1. In your new app, click on the **Resources** tab on the left sidebar.
2. Click on **Create New** to add a new resource.
3. Choose **Postgres** from the list of database options.
4. Fill in the connection details:
   - **Host**: `10.5.1.3`
   - **Port**: `5432`
   - **Database**: `nocodb_data`
   - **Username**: `fleet_app`
   - **Password**: (enter your password)
5. Click on **Test Connection** to ensure everything is working.
6. Once connected, click **Save**.

### Step 4: Create a Table Component with a SELECT Query
1. In the app editor, find the **Query** section on the right.
2. Click on **New** to create a new query.
3. Set the query type to **SQL Query** and select your newly created Postgres resource.
4. In the query editor, input the following SQL command to get data from one of your tables (replace `gtm_career_leads` with the appropriate table as needed):
   ```sql
   SELECT session_id, company_name, status, outreach_bite, nemo_payload, contact_recon, email, friction_type, funding_signal, contact_name, contact_title, linkedin_url, job_title, job_url, direct_url, created_at FROM gtm_career_leads;
   ```
5. Click on **Run** to test the query.
6. If successful, click on **Save Query** and name it (e.g., `Fetch Gtm Career Leads`).

### Step 5: Map Columns in the Table UI
1. Drag and drop a **Table** component from the component sidebar onto your canvas.
2. Click on the Table you just added.
3. In the right panel, select the query you saved earlier from the dropdown menu under **Data**.
4. Configure the columns in the Table settings:
   - Ensure the core columns (session_id, company_name, etc.) are displayed.
   - You can choose which columns to show by selecting or deselecting them.

### Step 6: Set Up a Detail Panel
1. Add a **Detail Panel** component just below your table.
2. This panel will show specific details when you select a row in the table.
3. Bind the Detail Panel's fields to show the `outreach_bite`, `nemo_payload`, and `contact_recon` fields from the selected row.
   - To do this, use the following format when setting up the fields: `{{ tableName.selectedRow.outreach_bite }}`, replacing `tableName` with the actual name of your table component.

### Step 7: Add a Mark Exported Button
1. Drag a **Button** component onto your canvas.
2. Label the button as **Mark Exported**.
3. In the right panel, go to the **Action** section, and select **Run a Query** when clicked.
4. Create a new query for marking a record as exported:
   ```sql
   UPDATE gtm_career_leads SET reviewed = true WHERE session_id = {{ tableName.selectedRow.session_id }};
   ```
5. Link the Button's action to this query.
6. Ensure the button refreshes the table after the update by adding a refresh action.

### Step 8: Duplicate the Setup for All Campaign Tables
1. Repeat steps 4 to 7 for each of the other campaign tables:
   - `gtm_upwork_leads`
   - `accountant_career_leads`
   - `accountant_bulk_leads`
   - `accountant_upwork_leads`
   - `researcher_career_leads`
2. Adjust the SQL queries accordingly for each table name in your queries and any specifics for the buttons.

### Step 9: Test Your Application
1. Navigate back to the top of your app.
2. Use the preview mode to interact with your table and detail panel.
3. Make sure you can select a row, view the details, and mark records as exported.

### Conclusion
You have now completed the setup for your PAFA pipeline in Retool! You can further customize and enhance your app as needed. If you have any questions, feel free to refer to Retool's documentation or contact their support team. Happy building!

---

## 7. Shortcut Trigger

Raymond uses two phrases to route tasks to the proxy instead of Claude:

| Trigger phrase | Effect |
|---|---|
| `run this on GPT` | Route the following task to proxy |
| `proxy task:` | Route the following task to proxy |

**When Claude Code sees either phrase:**

1. Respond immediately: `Routing to GPT-4o-mini via proxy`
2. Do not apply any Claude reasoning to the task content
3. Fire the proxy using the Section 3 curl pattern with the task as the user message
4. Paste the proxy response directly into the relevant file or return it verbatim
5. Confirm: `Done — proxy output written to [file]` or `Done — output below`

**Claude Code never paraphrases, filters, or improves proxy output on a routed task.** The output is the output. If it needs revision, Raymond re-runs it or asks Claude to reason about it natively.

**If the proxy is unavailable** (non-200 response): respond `Proxy unavailable (status {{N}}). Author natively instead? y/n` and wait for confirmation before proceeding.
