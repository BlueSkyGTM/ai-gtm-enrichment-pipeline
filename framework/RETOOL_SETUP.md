# RETOOL_SETUP.md — Retool Configuration Reference for PAFA

All content in this file authored by GPT-4o-mini via proxy.

---

## 1. SQL Queries — All Campaign Tables

> Authored by GPT-4o-mini (chatcmpl-DcLdPp6ePV6Tz27bS77Am1sd9b3Oq)

Paste each query into the Retool query editor for the corresponding app. Select the `nocodb_data` resource for all queries.

```sql
-- GTM Career Hunt
SELECT session_id, company_name, job_title, contact_name, contact_title,
linkedin_url, job_url, direct_url, friction_type, funding_signal, email,
outreach_bite, status, created_at
FROM gtm_career_leads
WHERE status != 'Exported'
ORDER BY created_at DESC
```

```sql
-- GTM Bulk Enrichment
SELECT session_id, company_name, job_title, contact_name, contact_title,
linkedin_url, job_url, direct_url, friction_type, funding_signal, email,
outreach_bite, status, created_at
FROM gtm_engineer_leads
WHERE status != 'Exported'
ORDER BY created_at DESC
```

```sql
-- GTM Upwork Hunt
SELECT session_id, company_name, job_title, contact_name, contact_title,
linkedin_url, job_url, direct_url, friction_type, funding_signal, email,
outreach_bite, status, created_at
FROM gtm_upwork_leads
WHERE status != 'Exported'
ORDER BY created_at DESC
```

```sql
-- Accountant Career Hunt
SELECT session_id, company_name, job_title, contact_name, contact_title,
linkedin_url, job_url, direct_url, friction_type, funding_signal, email,
outreach_bite, status, created_at
FROM accountant_career_leads
WHERE status != 'Exported'
ORDER BY created_at DESC
```

```sql
-- Accountant Bulk Enrichment
SELECT session_id, company_name, job_title, contact_name, contact_title,
linkedin_url, job_url, direct_url, friction_type, funding_signal, email,
outreach_bite, status, created_at
FROM accountant_bulk_leads
WHERE status != 'Exported'
ORDER BY created_at DESC
```

```sql
-- Accountant Upwork Hunt
SELECT session_id, company_name, job_title, contact_name, contact_title,
linkedin_url, job_url, direct_url, friction_type, funding_signal, email,
outreach_bite, status, created_at
FROM accountant_upwork_leads
WHERE status != 'Exported'
ORDER BY created_at DESC
```

```sql
-- Researcher Career Hunt
SELECT session_id, company_name, job_title, contact_name, contact_title,
linkedin_url, job_url, direct_url, friction_type, funding_signal, email,
outreach_bite, status, created_at
FROM researcher_career_leads
WHERE status != 'Exported'
ORDER BY created_at DESC
```

```sql
-- Fleet Errors
SELECT * FROM fleet_errors ORDER BY occurred_at DESC
```

```sql
-- Fleet Memory
SELECT * FROM fleet_memory ORDER BY created_at DESC
```

---

## 2. Detail Panel Setup — Full Scrollable outreach_bite

> Authored by GPT-4o-mini (chatcmpl-DcLdRaBTpfdwSMJEiuLYUdoGdDT8r)

# Retool Setup Guide: Right-Side Detail Panel for Lead Details

This guide will walk you through configuring a right-side detail panel in Retool that displays full details of a selected lead from a table component named `table1`.

## Step 1: Add a Container Component

1. **Drag and Drop Container**:
   - From the component library, drag a **Container** component onto your Retool canvas.
   
2. **Resize the Container**:
   - Click on the **Container** to select it.
   - In the **Property Panel** on the right, set the **Width** to `35%` to create a right-side detail panel.

## Step 2: Add Text Components for Each Field

You will now add a **Text** component for each field except for `outreach_bite`, which will use a **Multiline Text Input** component.

### For Each Field (company_name, job_title, contact_name, contact_title, email, linkedin_url, job_url, friction_type, funding_signal)

1. **Add a Text Component**:
   - Drag a **Text** component from the component library into the **Container** you created.

2. **Set the Text Component Binding**:
   - Click on the text component to select it.
   - In the **Property Panel**, set the **Text** to the appropriate binding using the following syntax:
     - `Company Name`: `{{ table1.selectedRow.data.company_name }}`
     - `Job Title`: `{{ table1.selectedRow.data.job_title }}`
     - `Contact Name`: `{{ table1.selectedRow.data.contact_name }}`
     - `Contact Title`: `{{ table1.selectedRow.data.contact_title }}`
     - `Email`: `{{ table1.selectedRow.data.email }}`
     - `LinkedIn URL`: `{{ table1.selectedRow.data.linkedin_url }}`
     - `Job URL`: `{{ table1.selectedRow.data.job_url }}`
     - `Friction Type`: `{{ table1.selectedRow.data.friction_type }}`
     - `Funding Signal`: `{{ table1.selectedRow.data.funding_signal }}`

## Step 3: Add a Multiline Text Input Component for Outreach Bite

1. **Drag and Drop Multiline Text Input**:
   - Drag a **Multiline Text Input** component from the component library into the **Container**.

2. **Set the Binding for Outreach Bite**:
   - In the **Property Panel**, set the **Default Value** to:
     - `{{ table1.selectedRow.data.outreach_bite }}`

3. **Set It to Read-Only**:
   - Still in the **Property Panel**, toggle on the **Read-Only** option. This allows the input to scroll rather than truncate the text, preventing users from editing it.

## Summary of Bindings

| Field | Component | Binding |
|---|---|---|
| Company Name | Text | `{{ table1.selectedRow.data.company_name }}` |
| Job Title | Text | `{{ table1.selectedRow.data.job_title }}` |
| Contact Name | Text | `{{ table1.selectedRow.data.contact_name }}` |
| Contact Title | Text | `{{ table1.selectedRow.data.contact_title }}` |
| Email | Text | `{{ table1.selectedRow.data.email }}` |
| LinkedIn URL | Text | `{{ table1.selectedRow.data.linkedin_url }}` |
| Job URL | Text | `{{ table1.selectedRow.data.job_url }}` |
| Friction Type | Text | `{{ table1.selectedRow.data.friction_type }}` |
| Funding Signal | Text | `{{ table1.selectedRow.data.funding_signal }}` |
| Outreach Bite | **Multiline Text Input, read-only** | `{{ table1.selectedRow.data.outreach_bite }}` |
