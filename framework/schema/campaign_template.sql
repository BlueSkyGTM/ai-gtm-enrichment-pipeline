-- Fleet Framework: Campaign Table Template
-- Replace {{campaign_output_table}} with your actual table name before running.
-- This template reflects the current Pull Model architecture (server.js source of truth).

-- ==========================================
-- OUTPUT TABLE (enriched leads)
-- ==========================================

CREATE TABLE IF NOT EXISTS {{campaign_output_table}} (
    id                    SERIAL PRIMARY KEY,
    session_id            TEXT NOT NULL,
    company_name          TEXT NOT NULL,
    status                TEXT NOT NULL DEFAULT 'Scraped',
    ahab_payload          JSONB,
    nemo_payload          JSONB,
    neptune_payload       JSONB,
    outreach_bite         TEXT,
    friction_type         TEXT,
    funding_signal        TEXT,
    contact_recon         JSONB,
    email                 TEXT,
    direct_url            TEXT,
    target_service_intent TEXT,
    url_recon_notes       TEXT,
    health_audit_notes    TEXT,
    friction_notes        TEXT,
    created_at            TIMESTAMP DEFAULT NOW(),
    UNIQUE (session_id, company_name)
);

-- ==========================================
-- STAGING TABLE (optional — bulk input campaigns only)
-- Use this if your campaign ingests a pre-sourced list instead of running live discovery.
-- Ahab-driven campaigns do not need this table.
-- ==========================================

CREATE TABLE IF NOT EXISTS {{campaign_staging_table}} (
    id           SERIAL PRIMARY KEY,
    company_name TEXT UNIQUE NOT NULL,
    processed    BOOLEAN DEFAULT FALSE,
    imported_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_{{campaign_staging_table}}_processed
    ON {{campaign_staging_table}}(processed);

-- ==========================================
-- SHARED INFRASTRUCTURE (run once per database — skip if already exists)
-- ==========================================

-- Error log and diagnostic ledger
-- session_id: the lead's session_id at time of failure (null for Ahab failures)
-- reason_code: AHAB_FAILURE | NEMO_FAILURE | NEPTUNE_FAILURE | CATALYST_STALE
-- company_name: populated where known at time of failure
CREATE TABLE IF NOT EXISTS fleet_errors (
    id            SERIAL PRIMARY KEY,
    session_id    TEXT,
    reason_code   TEXT,
    company_name  TEXT,
    error_message TEXT,
    occurred_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fleet_errors_session ON fleet_errors(session_id);
CREATE INDEX IF NOT EXISTS idx_fleet_errors_reason  ON fleet_errors(reason_code);

-- ==========================================
-- ALTER TABLE — Diver columns (run once if adding to existing table)
-- These columns are written by Nemo after the OUTPUT CONTRACT was introduced.
-- Skip if the table was created fresh from this template.
-- ==========================================

-- ALTER TABLE {{campaign_output_table}} ADD COLUMN IF NOT EXISTS url_recon_notes   TEXT;
-- ALTER TABLE {{campaign_output_table}} ADD COLUMN IF NOT EXISTS health_audit_notes TEXT;
-- ALTER TABLE {{campaign_output_table}} ADD COLUMN IF NOT EXISTS friction_notes     TEXT;
