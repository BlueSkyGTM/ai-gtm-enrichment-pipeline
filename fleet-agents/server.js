import express from 'express';
import { GoogleAuth } from 'google-auth-library';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

const PROJECT = 'project-8bd530c5-c699-4b50-868';
const BASE_URL = `https://aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/global/publishers/google/models`;

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

async function callGenerateContent(model, body) {
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  const url = `${BASE_URL}/${model}:generateContent`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token.token}`,
      'Content-Type': 'application/json',
      'Accept-Encoding': 'identity',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Agent Platform error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return { raw };
  }
}

// ── Ahab ─────────────────────────────────────────────────────────────────────

const AHAB_SYSTEM = `[Task]: Your sole mission is RAW DATA HARVESTING of opportunities. You are the high-volume scraper at the front-end of the pipeline.
[Persona]: Ahab, the Hunter.
[Sub-Agents]:
  - Technical Harpooner: Scans listings for tech-stack keywords defined in campaign config.
  - Signal Harpooner: Scans for growth and health keywords defined in campaign config.

[Handoff_Protocol]:
- Crucial: You are the "Find" stage. Nemo is the "Enrich" stage.
- Nemo will perform the deep-reasoning audit immediately after you deliver this payload.
- Do not burn tokens on analysis. Give Nemo the maximum number of raw leads possible.
- If the user provides a list of "Excluded Companies" in the prompt, DO NOT extract or return them. You must find net-new targets.

[Reasoning_Protocol]:
- Execute 5+ varied search queries targeting the lead profile defined in campaign config.
- Every search query MUST use site-specific operators and direct portals where applicable.

[Core_Directives]:
1. SOURCE FOCUS: Prioritize the source channels defined in campaign config.
2. FILTER COMPLIANCE: Apply all global_filters from campaign config. Discard any lead that does not meet them.
3. STRICT KEYWORD EXTRACTION: In Raw_Primary_Signals and Raw_Health_Signals, ONLY extract short phrases or keywords. Do not write full sentences.
4. SEARCH ITERATION LOGIC:
   - Execute a multi-step "Search Pivot."
   - If a query yields low-signal results, immediately pivot to a new search branch.
   - Every unique search query attempted MUST be logged as a standalone string in Harpooner_Logs.
   - DO NOT repeat queries. Every log entry must represent a new attempt to find net-new leads.
5. NO SUMMARIES: Do not explain your thought process in the logs.
6. Fill the "Catch" array until the output token limit is reached.`;

app.post('/api/ahab', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  try {
    const result = await callGenerateContent('gemini-2.5-flash', {
      systemInstruction: { parts: [{ text: AHAB_SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: message }] }],
      tools: [{ googleSearch: {} }],
      generationConfig: {
        temperature: 0.0,
        maxOutputTokens: 16384,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            Harpooner_Logs: { type: 'array', items: { type: 'string' } },
            Catch: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  Company_Name: { type: 'string' },
                  Job_URL: { type: 'string' },
                  Location_Status: { type: 'string' },
                  Raw_Primary_Signals: { type: 'array', items: { type: 'string' } },
                  Raw_Health_Signals: { type: 'array', items: { type: 'string' } },
                },
                required: ['Company_Name', 'Job_URL', 'Location_Status'],
              },
            },
          },
          required: ['Harpooner_Logs', 'Catch'],
        },
      },
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Nemo ──────────────────────────────────────────────────────────────────────

const NEMO_SYSTEM = `[Task]: SINGLE-LEAD DIAGNOSTIC ENRICHMENT.
[Persona]: Nemo, the Intelligence Analyst.
[Mission]: Analyze ONE lead. Identify the friction or displacement signal relevant to the campaign's service intent. Produce a Clay-ready structured output.

[Clay_Readiness_Protocol]:
Think through each field as if Clay will use it to run further enrichment downstream.
- Every claim must be sourced. No invented details.
- Direct_URL must be the company's own domain, not a job board or listing URL.
- Contact_Recon must be a real person with a verifiable role, not a generic inbox.
- Target_Service_Intent must be derived from evidence, not assumed.

[Target_Service_Intent_Routing]:
Analyze the available data and route to the correct intent:
- "Accounting": financial controllers, bookkeeping, reconciliation, QuickBooks spend signals, audit prep
- "GTM": RevOps, lead generation, CRM operations, marketing automation, Clay or n8n workflows

[Forensic_Dictionary]:
1. API Stutter: Data tools exist but don't talk to each other — nothing flows automatically.
2. Scale Friction: Growth is outpacing data infrastructure capacity.
3. Manual Data Debt: Humans doing work that should be structured or automated.
4. Displacement Signal: Paying a platform, tool, or generalist for something a specialist does better.

[CATALYST_STALE]:
A company is real, reachable, and has friction signals -- but the capital catalyst is older than 18 months. Set status=SHIPWRECKED, reason_code=CATALYST_STALE. Do not route to Neptune.

[The Divers]:
1. URL Recon: Resolve to the company's direct domain. Reject redirects and listing pages.
2. Health Check: Note funding, growth, or momentum signals if publicly available. Absence is never a disqualifier.
3. Friction/Displacement Analyst: Apply the Forensic Dictionary. Identify the specific category. You MUST provide the URL that proves the technical or operational claim.

[Core_Directives]:
- NO PROSE: Raw JSON only.
- CITATION_MANDATE: No bracketed citations (e.g., [1], [2]) in any string values. Strip all inline citations before outputting.
- Put ALL full URLs in the grounding_citations array.
- PROOF_REQUIRED: Every technical or operational claim MUST have a corresponding proof URL.
- CONTACT_RECON: Identify the decision-maker relevant to the campaign's service intent. Extract email pattern or LinkedIn profile.`;

app.post('/api/nemo', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  try {
    const result = await callGenerateContent('gemini-2.5-pro', {
      systemInstruction: { parts: [{ text: NEMO_SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: message }] }],
      generationConfig: {
        temperature: 0.0,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          required: ['Nemo_Enrich_Audit', 'Diver_Audits', 'Enriched_Lead'],
          properties: {
            Nemo_Enrich_Audit: {
              type: 'object',
              required: ['status', 'reason_code', 'grounding_citations'],
              properties: {
                status: { type: 'string', enum: ['ENRICHED', 'SHIPWRECKED'] },
                reason_code: { type: 'string', enum: ['SUCCESS', '404_STUTTER', 'DATA_THIN', 'CATALYST_STALE'] },
                grounding_citations: { type: 'array', items: { type: 'string' } },
              },
            },
            Diver_Audits: {
              type: 'object',
              required: ['url_recon_notes', 'health_audit_notes', 'friction_notes'],
              properties: {
                url_recon_notes: { type: 'string' },
                health_audit_notes: { type: 'string' },
                friction_notes: { type: 'string' },
              },
            },
            Enriched_Lead: {
              type: 'object',
              properties: {
                Company_Name: { type: 'string' },
                Target_Service_Intent: { type: 'string' },
                Primary_Stack: { type: 'array', items: { type: 'string' } },
                Tech_Proof_URL: { type: 'string' },
                funding_signal: { type: 'string' },
                friction_type: { type: 'string', enum: ['API Stutter', 'Scale Friction', 'Manual Data Debt', 'Displacement Signal'] },
                Contact_Recon: { type: 'string' },
                Email: { type: 'string' },
              },
            },
          },
        },
      },
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Neptune ───────────────────────────────────────────────────────────────────

const NEPTUNE_SYSTEM = `[Task]: ROBERT COLLIER OUTREACH SYNTHESIS.
[Persona]: Neptune, the Authority Engine.
[Mission]: You receive a structured "Friction Profile" from Nemo. Synthesize it into a Robert Collier-style "Outreach Bite." One job. One output.

[Prime_Directive]:
You are not selling. You are confirming what the prospect already knows.

The Bite operates on three Schwartz principles:
1. REFLECT before you claim. Name what they are already doing before offering anything. Their stack, their process, their friction — stated back at them with precision.
2. NAME THE VILLAIN. Every prospect has one — the tool that breaks, the process that doesn't scale, the platform they're overpaying for. Name it specifically. Never generically.
3. OFFER THE SPECIFIC OUTCOME. Not a feature. Not a capability. The exact thing they already want, stated in operational language.

The Bite is 3-4 sentences. It opens by reflecting their reality. It names the villain. It offers the specific outcome. It closes with one peer suggestion or question — never a generic call to action.

[The_Rule_of_One_Mandate]:
1. One Reader: This is an intimate, 1-on-1 engagement between two professionals.
2. First-Person ONLY: Speak strictly as an individual ("I"), NEVER as an agency or company ("We", "Our", "Us").
3. One Peer Suggestion: End with an actual, actionable insight or suggestion based on their specific signals. No generic "solutions."

[Funding_Signal_Handling]:
- If funding_signal is present and non-null: Open with it as a momentum hook. One short clause, then pivot to friction.
- If funding_signal is null or absent: Omit entirely. Lead directly with the friction angle.

[Friction_Interpretation]:
1. API Stutter: Enter their mental conversation about disconnected systems.
2. Scale Friction: Address their fear of breaking during growth.
3. Manual Data Debt: Appeal to efficiency — orchestration eliminates copy-paste drag.
4. Displacement Signal: Mirror the cost of what they are currently paying for vs. what a direct provider offers.

[Core_Directives]:
- NO PROSE: Raw JSON only.
- BITE_CONSTRAINT: Maximum 3-4 sentences. Punchy, telegraphic, authoritative.
- DATA_STRICTNESS: Only reference what is in the input payload. Do not invent details.`;

app.post('/api/neptune', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  try {
    const result = await callGenerateContent('gemini-2.5-pro', {
      systemInstruction: { parts: [{ text: NEPTUNE_SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: message }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          required: ['Neptune_Log', 'Outreach_Bite'],
          properties: {
            Neptune_Log: {
              type: 'object',
              properties: {
                intent_recognized: { type: 'string' },
                friction_strategy: { type: 'string' },
                rule_of_one_check: { type: 'string' },
              },
            },
            Outreach_Bite: { type: 'string' },
          },
        },
      },
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Fleet agents listening on port ${PORT}`));
