/**
 * brain/db.js
 * Core SQLite database module for the Dynasty OS agent brain.
 *
 * Multi-company scope: every significant table has a company_id column.
 * Each company (client) has its own:
 *   - Agent roster       (who works there, their roles, model, reporting line)
 *   - Workflow           (pipeline phase order — can differ per business type)
 *   - SOPs               (standard operating procedures, sourced from uploaded docs)
 *   - Memory             (agent-level knowledge accumulated over time)
 *   - Execution logs     (every pipeline run, every step)
 *   - Communications     (emails, messages, webhooks sent by agents)
 *   - RAG documents      (chunked & embedded uploaded files)
 *
 * Workflow templates are company-agnostic and can be cloned into any company
 * (e.g. "startup", "lash_salon", "restaurant", "real_estate").
 */

const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');
const crypto   = require('crypto');

// ─── DB file lives in /brain/ at project root ──────────────────────────────
const BRAIN_DIR = path.join(__dirname, '../../../brain');
if (!fs.existsSync(BRAIN_DIR)) fs.mkdirSync(BRAIN_DIR, { recursive: true });

const DB_PATH = path.join(BRAIN_DIR, 'agent_brain.db');
const db      = new Database(DB_PATH);

// WAL mode = better concurrent read/write; foreign keys enforced
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ────────────────────────────────────────────────────────────────
db.exec(`

  -- ── COMPANIES ───────────────────────────────────────────────────────────
  -- Mirrors the "companies" map in system_state.json.
  CREATE TABLE IF NOT EXISTS companies (
    id             TEXT PRIMARY KEY,          -- slug key, e.g. 'acme-inc', 'lash-studio-hcm'
    name           TEXT NOT NULL,
    industry       TEXT,                      -- 'startup' | 'lash_salon' | 'restaurant' | …
    template_id    TEXT,                      -- which workflow_template was used to seed this company
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- ── WORKFLOW TEMPLATES ───────────────────────────────────────────────────
  -- Reusable pipeline blueprints (e.g. "startup", "lash_salon").
  -- When a new company is created, clone the matching template's agents + phases.
  CREATE TABLE IF NOT EXISTS workflow_templates (
    id          TEXT PRIMARY KEY,             -- e.g. 'startup', 'lash_salon'
    name        TEXT NOT NULL,
    description TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Agents belonging to a workflow template (blueprint)
  CREATE TABLE IF NOT EXISTS template_agents (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id   TEXT NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
    agent_key     TEXT NOT NULL,              -- e.g. 'CEO', 'RECEPTIONIST', 'LASH_ARTIST'
    display_name  TEXT,
    role          TEXT,                       -- short description of responsibility
    default_model TEXT,
    is_human      INTEGER DEFAULT 0,          -- 1 = human slot (webhook-based)
    UNIQUE(template_id, agent_key)
  );

  -- Pipeline phases for a workflow template (execution order)
  CREATE TABLE IF NOT EXISTS template_phases (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id  TEXT NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
    phase_number INTEGER NOT NULL,
    label        TEXT NOT NULL,               -- display label, e.g. 'Phase 1 — CEO: Master Plan'
    agent_keys   TEXT NOT NULL,               -- JSON array of agent keys in this phase
    run_parallel INTEGER DEFAULT 1,           -- 1 = run agents in this phase concurrently
    UNIQUE(template_id, phase_number)
  );

  -- ── COMPANY AGENTS ───────────────────────────────────────────────────────
  -- The actual agent roster for each company.
  -- Seeded from a template but can be customized per company.
  CREATE TABLE IF NOT EXISTS company_agents (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id    TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    agent_key     TEXT NOT NULL,
    display_name  TEXT,
    role          TEXT,
    model         TEXT,
    is_human      INTEGER DEFAULT 0,
    reports_to    TEXT,                       -- agent_key of direct superior (NULL = top level)
    system_prompt TEXT,                       -- raw markdown text of the instruction prompt
    active        INTEGER DEFAULT 1,          -- 0 = terminated/inactive
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, agent_key)
  );
  CREATE INDEX IF NOT EXISTS idx_co_agents ON company_agents(company_id);

  -- ── COMPANY WORKFLOWS ────────────────────────────────────────────────────
  -- The pipeline phase order for each company (can differ from template if customized).
  CREATE TABLE IF NOT EXISTS company_phases (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id   TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    phase_number INTEGER NOT NULL,
    label        TEXT NOT NULL,
    agent_keys   TEXT NOT NULL,               -- JSON array
    run_parallel INTEGER DEFAULT 1,
    UNIQUE(company_id, phase_number)
  );

  -- ── SOPs ─────────────────────────────────────────────────────────────────
  -- Standard Operating Procedures per company/agent.
  -- Source text is also ingested into RAG for context injection.
  CREATE TABLE IF NOT EXISTS sops (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id  TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    agent_key   TEXT,                         -- NULL = company-wide SOP
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    version     INTEGER DEFAULT 1,
    active      INTEGER DEFAULT 1,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_sops_company ON sops(company_id, agent_key);

  -- ── AGENT MEMORY ─────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS agent_memory (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id  TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    agent_key   TEXT NOT NULL,
    memory_type TEXT DEFAULT 'long_term',     -- 'short_term' | 'long_term' | 'episodic'
    content     TEXT NOT NULL,
    importance  REAL DEFAULT 0.5,             -- 0.0–1.0
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at  DATETIME                      -- NULL = permanent
  );
  CREATE INDEX IF NOT EXISTS idx_memory ON agent_memory(company_id, agent_key);

  -- ── EXECUTION LOGS ───────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS execution_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id  TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    run_id      TEXT NOT NULL,                -- UUID per pipeline trigger
    agent_key   TEXT,
    phase       INTEGER,
    event_type  TEXT NOT NULL,               -- 'start' | 'complete' | 'error' | 'skipped' | 'stopped'
    payload     TEXT,                        -- JSON
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_logs_run  ON execution_logs(run_id);
  CREATE INDEX IF NOT EXISTS idx_logs_co   ON execution_logs(company_id, created_at);

  -- ── GENERATED REPORTS ────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS generated_reports (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id  TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    run_id      TEXT NOT NULL,
    agent_key   TEXT NOT NULL,
    phase       INTEGER,
    content     TEXT NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_reports_run ON generated_reports(run_id);
  CREATE INDEX IF NOT EXISTS idx_reports_co  ON generated_reports(company_id);

  -- ── COMMUNICATIONS ───────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS communications (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id  TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    run_id      TEXT,
    channel     TEXT NOT NULL,               -- 'email' | 'slack' | 'webhook' | 'sms'
    sender      TEXT,
    recipient   TEXT,
    subject     TEXT,
    body        TEXT,
    status      TEXT DEFAULT 'pending',      -- 'pending' | 'sent' | 'failed'
    error_msg   TEXT,
    metadata    TEXT,                        -- JSON
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_comms_co ON communications(company_id, created_at);

  -- ── RAG DOCUMENTS ────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS rag_documents (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id      TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    filename        TEXT NOT NULL,
    original_lang   TEXT DEFAULT 'en',
    original_text   TEXT,
    translated_text TEXT,                    -- English version for LLM context injection
    chunk_index     INTEGER DEFAULT 0,
    embedding_model TEXT,
    embedding_json  TEXT,                    -- JSON float array (future: swap to sqlite-vec BLOB)
    source_hash     TEXT NOT NULL,           -- SHA-256 dedup key
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, source_hash)
  );
  CREATE INDEX IF NOT EXISTS idx_rag_co   ON rag_documents(company_id);
  CREATE INDEX IF NOT EXISTS idx_rag_file ON rag_documents(company_id, filename);

  -- Full-text search over RAG docs
  CREATE VIRTUAL TABLE IF NOT EXISTS rag_fts USING fts5(
    translated_text,
    original_text,
    filename,
    content='rag_documents',
    content_rowid='id'
  );
`);

// ─── Seed built-in workflow templates ──────────────────────────────────────
const seedTemplates = db.transaction(() => {
    // ── Template: startup ────────────────────────────────────────────────
    db.prepare(`INSERT OR IGNORE INTO workflow_templates (id, name, description) VALUES (?, ?, ?)`)
        .run('startup', 'Tech Startup', 'Standard C-Suite pipeline: CEO → C-Suite → Divisions → Final Report');

    const startupAgents = [
        ['CEO', 'Chief Executive Officer', 'Synthesizes Master Plan and Final Report', 0],
        ['CPO', 'Chief Product Officer', 'Designs product architecture', 0],
        ['CFO', 'Chief Financial Officer', 'Financial constraint modeling', 0],
        ['CMO', 'Chief Marketing Officer', 'Go-to-market strategy', 0],
        ['COO', 'Chief Operating Officer', 'Operational execution framework', 0],
        ['CIO', 'Chief Information Officer', 'Tech infrastructure review', 0],
        ['CISO', 'Chief Information Security Officer', 'Security vulnerability review', 0],
        ['COS', 'Chief of Staff', 'Executive coordination schedule', 0],
        ['CLO', 'Chief Legal Officer', 'Legal and compliance review', 0],
        ['AUDITOR', 'Financial Auditor', 'Stress-tests CFO financial model', 0],
        ['MKT_ANALYST', 'Market Analyst', 'GTM viability analysis', 0],
        ['COMPETITOR', 'Competitor Simulator', 'Attacks CMO GTM strategy', 0],
        ['TARGET_BUYER', 'Target Buyer', 'Buyer perspective on GTM', 0],
        ['UNAWARE', 'Unaware Audience', 'Layperson GTM perspective', 0],
        ['FIXER', 'Crisis Fixer', 'Crisis resolution planning', 0],
        ['WHISPERER', 'Intelligence Whisperer', 'Intelligence vulnerability review', 0],
    ];
    const insertAgent = db.prepare(`INSERT OR IGNORE INTO template_agents (template_id, agent_key, display_name, role, is_human) VALUES (?, ?, ?, ?, ?)`);
    for (const [key, name, role, isHuman] of startupAgents) {
        insertAgent.run('startup', key, name, role, isHuman);
    }

    const startupPhases = [
        [1, 'Phase 1 — CEO: Master Plan', JSON.stringify(['CEO']), 0],
        [2, 'Phase 2 — C-Suite: Strategy', JSON.stringify(['CPO', 'CFO', 'CMO', 'COO']), 1],
        [3, 'Phase 3 — Divisions: Audit', JSON.stringify(['CIO', 'AUDITOR', 'CLO', 'MKT_ANALYST', 'COMPETITOR', 'TARGET_BUYER', 'UNAWARE', 'COS', 'CISO', 'FIXER', 'WHISPERER']), 1],
        [4, 'Phase 4 — CEO: Final Report', JSON.stringify(['CEO']), 0],
    ];
    const insertPhase = db.prepare(`INSERT OR IGNORE INTO template_phases (template_id, phase_number, label, agent_keys, run_parallel) VALUES (?, ?, ?, ?, ?)`);
    for (const [num, label, keys, parallel] of startupPhases) {
        insertPhase.run('startup', num, label, keys, parallel);
    }

    // ── Template: lash_salon ─────────────────────────────────────────────
    db.prepare(`INSERT OR IGNORE INTO workflow_templates (id, name, description) VALUES (?, ?, ?)`)
        .run('lash_salon', 'Lash & Beauty Salon', 'Salon operations pipeline: Owner → Service Manager → Staff → Client Experience Audit');

    const lashAgents = [
        ['OWNER', 'Salon Owner', 'Sets vision, approves strategy and budget', 1],
        ['SERVICE_MANAGER', 'Service Manager', 'Oversees service quality and staff scheduling', 0],
        ['LASH_ARTIST_LEAD', 'Lead Lash Artist', 'Defines service techniques, trains junior staff', 0],
        ['RECEPTIONIST', 'Receptionist AI', 'Handles bookings, follow-ups, customer communications', 0],
        ['INVENTORY_MGR', 'Inventory Manager', 'Tracks supplies, orders, COGS', 0],
        ['MARKETING_EXEC', 'Marketing Executive', 'Social media, promotions, loyalty programs', 0],
        ['CLIENT_AUDITOR', 'Client Experience Auditor', 'Simulates client journey, spots friction', 0],
        ['FINANCIAL_CTRL', 'Financial Controller', 'Revenue, expenses, cash flow review', 0],
    ];
    for (const [key, name, role, isHuman] of lashAgents) {
        insertAgent.run('lash_salon', key, name, role, isHuman);
    }

    const lashPhases = [
        [1, 'Phase 1 — Owner: Direction',      JSON.stringify(['OWNER']),           0],
        [2, 'Phase 2 — Management: Planning',   JSON.stringify(['SERVICE_MANAGER', 'FINANCIAL_CTRL', 'MARKETING_EXEC']), 1],
        [3, 'Phase 3 — Staff: Execution Plan',  JSON.stringify(['LASH_ARTIST_LEAD', 'RECEPTIONIST', 'INVENTORY_MGR']), 1],
        [4, 'Phase 4 — Audit: Client Review',   JSON.stringify(['CLIENT_AUDITOR']), 0],
    ];
    for (const [num, label, keys, parallel] of lashPhases) {
        insertPhase.run('lash_salon', num, label, keys, parallel);
    }
});

seedTemplates();

// ─── Helper: generate a UUID-like run ID ───────────────────────────────────
function generateRunId() {
    return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPANIES
// ══════════════════════════════════════════════════════════════════════════════

function upsertCompany(id, name, industry = null, templateId = null) {
    db.prepare(`
        INSERT INTO companies (id, name, industry, template_id)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET name = excluded.name
    `).run(id, name, industry, templateId);
}

/**
 * Sync all companies from the system_state JSON into the DB.
 * @param {Object} companies - The companies map from system_state.json
 */
function syncCompanies(companies) {
    if (!companies) return;
    const upsert = db.prepare(`
        INSERT INTO companies (id, name) VALUES (?, ?)
        ON CONFLICT(id) DO UPDATE SET name = excluded.name
    `);
    const sync = db.transaction((map) => {
        for (const [id, data] of Object.entries(map)) {
            upsert.run(id, data.name || id);
        }
    });
    sync(companies);
}

// ══════════════════════════════════════════════════════════════════════════════
// WORKFLOW TEMPLATES
// ══════════════════════════════════════════════════════════════════════════════

function listTemplates() {
    return db.prepare(`SELECT * FROM workflow_templates ORDER BY name`).all();
}

function getTemplate(templateId) {
    const template = db.prepare(`SELECT * FROM workflow_templates WHERE id = ?`).get(templateId);
    if (!template) return null;
    template.agents = db.prepare(`SELECT * FROM template_agents WHERE template_id = ? ORDER BY id`).all(templateId);
    template.phases = db.prepare(`SELECT * FROM template_phases WHERE template_id = ? ORDER BY phase_number`).all(templateId);
    return template;
}

/**
 * Clone a workflow template's agents + phases into a company.
 * Safe to call multiple times (INSERT OR IGNORE).
 */
function applyTemplateToCompany(companyId, templateId, defaultModel = null) {
    const template = getTemplate(templateId);
    if (!template) throw new Error(`Template "${templateId}" not found`);

    const insertAgent = db.prepare(`
        INSERT OR IGNORE INTO company_agents (company_id, agent_key, display_name, role, model, is_human)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertPhase = db.prepare(`
        INSERT OR IGNORE INTO company_phases (company_id, phase_number, label, agent_keys, run_parallel)
        VALUES (?, ?, ?, ?, ?)
    `);

    const apply = db.transaction(() => {
        for (const a of template.agents) {
            insertAgent.run(companyId, a.agent_key, a.display_name, a.role, defaultModel || a.default_model || null, a.is_human, a.system_prompt || null);
        }
        for (const p of template.phases) {
            insertPhase.run(companyId, p.phase_number, p.label, p.agent_keys, p.run_parallel);
        }
        // Record which template seeded this company
        db.prepare(`UPDATE companies SET template_id = ?, industry = ? WHERE id = ?`).run(templateId, templateId, companyId);
    });
    apply();
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPANY AGENTS
// ══════════════════════════════════════════════════════════════════════════════

function getCompanyAgents(companyId) {
    return db.prepare(`SELECT * FROM company_agents WHERE company_id = ? ORDER BY id`).all(companyId);
}

function upsertCompanyAgent({ companyId, agentKey, displayName = null, role = null, model = null, isHuman = 0, reportsTo = null, systemPrompt = null, active = 1 }) {
    db.prepare(`
        INSERT INTO company_agents (company_id, agent_key, display_name, role, model, is_human, reports_to, system_prompt, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(company_id, agent_key) DO UPDATE SET
            display_name = excluded.display_name,
            role         = excluded.role,
            model        = COALESCE(excluded.model, model),
            is_human     = excluded.is_human,
            reports_to   = excluded.reports_to,
            system_prompt= excluded.system_prompt,
            active       = excluded.active
    `).run(companyId, agentKey, displayName, role, model, isHuman ? 1 : 0, reportsTo, systemPrompt, active ? 1 : 0);
}

function getCompanyAgent(companyId, agentKey) {
    return db.prepare(`SELECT * FROM company_agents WHERE company_id = ? AND agent_key = ?`).get(companyId, agentKey);
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPANY PHASES (WORKFLOW)
// ══════════════════════════════════════════════════════════════════════════════

function getCompanyPhases(companyId) {
    const rows = db.prepare(`SELECT * FROM company_phases WHERE company_id = ? ORDER BY phase_number`).all(companyId);
    return rows.map(r => ({ ...r, agent_keys: JSON.parse(r.agent_keys) }));
}

function upsertCompanyPhase({ companyId, phaseNumber, label, agentKeys, runParallel = 1 }) {
    db.prepare(`
        INSERT INTO company_phases (company_id, phase_number, label, agent_keys, run_parallel)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(company_id, phase_number) DO UPDATE SET
            label        = excluded.label,
            agent_keys   = excluded.agent_keys,
            run_parallel = excluded.run_parallel
    `).run(companyId, phaseNumber, label, JSON.stringify(agentKeys), runParallel ? 1 : 0);
}

// ══════════════════════════════════════════════════════════════════════════════
// SOPs
// ══════════════════════════════════════════════════════════════════════════════

function addSOP({ companyId, agentKey = null, title, content }) {
    return db.prepare(`
        INSERT INTO sops (company_id, agent_key, title, content) VALUES (?, ?, ?, ?)
    `).run(companyId, agentKey, title, content).lastInsertRowid;
}

function getSOPs(companyId, agentKey = null) {
    if (agentKey) {
        return db.prepare(`SELECT * FROM sops WHERE company_id = ? AND (agent_key = ? OR agent_key IS NULL) AND active = 1`).all(companyId, agentKey);
    }
    return db.prepare(`SELECT * FROM sops WHERE company_id = ? AND active = 1`).all(companyId);
}

// ══════════════════════════════════════════════════════════════════════════════
// AGENT MEMORY
// ══════════════════════════════════════════════════════════════════════════════

function addMemory({ companyId, agentKey, memoryType = 'long_term', content, importance = 0.5, expiresAt = null }) {
    return db.prepare(`
        INSERT INTO agent_memory (company_id, agent_key, memory_type, content, importance, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(companyId, agentKey, memoryType, content, importance, expiresAt).lastInsertRowid;
}

function getMemories({ companyId, agentKey, memoryType = null, limit = 20 }) {
    const extra = memoryType ? 'AND memory_type = ?' : '';
    const params = memoryType ? [companyId, agentKey, memoryType, limit] : [companyId, agentKey, limit];
    return db.prepare(`
        SELECT * FROM agent_memory
        WHERE company_id = ? AND agent_key = ?
          AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
          ${extra}
        ORDER BY importance DESC, created_at DESC
        LIMIT ?
    `).all(...params);
}

// ══════════════════════════════════════════════════════════════════════════════
// EXECUTION LOGS
// ══════════════════════════════════════════════════════════════════════════════

function logEvent({ companyId, runId, agentKey = null, phase = null, eventType, payload = null }) {
    db.prepare(`
        INSERT INTO execution_logs (company_id, run_id, agent_key, phase, event_type, payload)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(companyId, runId, agentKey, phase, eventType, payload ? JSON.stringify(payload) : null);
}

function getRunLogs(runId) {
    return db.prepare(`SELECT * FROM execution_logs WHERE run_id = ? ORDER BY created_at ASC`).all(runId);
}

function getRecentRuns(companyId, limit = 10) {
    return db.prepare(`
        SELECT run_id,
               MIN(created_at) AS started_at,
               MAX(created_at) AS last_event_at,
               COUNT(*)        AS event_count,
               MAX(CASE WHEN event_type = 'error' THEN 1 ELSE 0 END) AS had_error
        FROM execution_logs
        WHERE company_id = ?
        GROUP BY run_id
        ORDER BY started_at DESC
        LIMIT ?
    `).all(companyId, limit);
}

// ══════════════════════════════════════════════════════════════════════════════
// GENERATED REPORTS
// ══════════════════════════════════════════════════════════════════════════════

function saveReport({ companyId, runId, agentKey, phase = null, content }) {
    return db.prepare(`
        INSERT INTO generated_reports (company_id, run_id, agent_key, phase, content)
        VALUES (?, ?, ?, ?, ?)
    `).run(companyId, runId, agentKey, phase, content).lastInsertRowid;
}

function getReportsByCompany(companyId, limit = 50) {
    // Return metadata (excluding huge content blobs) for list views
    return db.prepare(`
        SELECT id, run_id, agent_key, phase, created_at
        FROM generated_reports
        WHERE company_id = ?
        ORDER BY created_at DESC
        LIMIT ?
    `).all(companyId, limit);
}

function getReportContent(reportId, companyId) {
    // Return specific report verifying company_id check for security
    return db.prepare(`
        SELECT * FROM generated_reports
        WHERE id = ? AND company_id = ?
    `).get(reportId, companyId);
}

// ══════════════════════════════════════════════════════════════════════════════
// COMMUNICATIONS
// ══════════════════════════════════════════════════════════════════════════════

function logCommunication({ companyId, runId = null, channel, sender = null, recipient = null, subject = null, body = null, status = 'pending', metadata = null }) {
    return db.prepare(`
        INSERT INTO communications (company_id, run_id, channel, sender, recipient, subject, body, status, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(companyId, runId, channel, sender, recipient, subject, body, status, metadata ? JSON.stringify(metadata) : null).lastInsertRowid;
}

function updateCommunicationStatus(id, status, errorMsg = null) {
    db.prepare(`UPDATE communications SET status = ?, error_msg = ? WHERE id = ?`).run(status, errorMsg, id);
}

function getCommunications(companyId, { channel = null, status = null, limit = 50 } = {}) {
    let where = 'WHERE company_id = ?';
    const params = [companyId];
    if (channel) { where += ' AND channel = ?'; params.push(channel); }
    if (status)  { where += ' AND status = ?';  params.push(status); }
    params.push(limit);
    return db.prepare(`SELECT * FROM communications ${where} ORDER BY created_at DESC LIMIT ?`).all(...params);
}

// ══════════════════════════════════════════════════════════════════════════════
// RAG DOCUMENTS
// ══════════════════════════════════════════════════════════════════════════════

function ragChunkExists(companyId, sourceHash) {
    return !!db.prepare(`SELECT 1 FROM rag_documents WHERE company_id = ? AND source_hash = ?`).get(companyId, sourceHash);
}

function insertRagChunk({ companyId, filename, originalLang = 'en', originalText, translatedText = null, chunkIndex = 0, embeddingModel = null, embeddingJson = null }) {
    const sourceHash = crypto.createHash('sha256')
        .update(`${companyId}:${filename}:${chunkIndex}:${originalText}`)
        .digest('hex');

    if (ragChunkExists(companyId, sourceHash)) return null;

    const result = db.prepare(`
        INSERT INTO rag_documents (company_id, filename, original_lang, original_text, translated_text, chunk_index, embedding_model, embedding_json, source_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(companyId, filename, originalLang, originalText, translatedText, chunkIndex,
           embeddingModel, embeddingJson ? JSON.stringify(embeddingJson) : null, sourceHash);

    if (result.lastInsertRowid) {
        db.prepare(`INSERT INTO rag_fts(rowid, translated_text, original_text, filename) VALUES (?, ?, ?, ?)`)
            .run(result.lastInsertRowid, translatedText || '', originalText || '', filename);
    }

    return result.lastInsertRowid;
}

function searchRag(companyId, query, limit = 5) {
    return db.prepare(`
        SELECT r.id, r.filename, r.chunk_index, r.translated_text, r.original_text, r.created_at, rank AS score
        FROM rag_fts f
        JOIN rag_documents r ON r.id = f.rowid
        WHERE r.company_id = ? AND rag_fts MATCH ?
        ORDER BY score
        LIMIT ?
    `).all(companyId, query, limit);
}

function getRagByFilename(companyId, filename) {
    return db.prepare(`SELECT * FROM rag_documents WHERE company_id = ? AND filename = ? ORDER BY chunk_index`).all(companyId, filename);
}

function deleteRagByFilename(companyId, filename) {
    const rows = db.prepare(`SELECT id FROM rag_documents WHERE company_id = ? AND filename = ?`).all(companyId, filename);
    if (!rows.length) return;
    const ids = rows.map(r => r.id);
    db.prepare(`DELETE FROM rag_fts WHERE rowid IN (${ids.map(() => '?').join(',')})`).run(...ids);
    db.prepare(`DELETE FROM rag_documents WHERE company_id = ? AND filename = ?`).run(companyId, filename);
}

// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ══════════════════════════════════════════════════════════════════════════════

function getCompanyStats(companyId) {
    return {
        totalRuns:     db.prepare(`SELECT COUNT(DISTINCT run_id) AS n FROM execution_logs WHERE company_id = ?`).get(companyId)?.n ?? 0,
        totalAgents:   db.prepare(`SELECT COUNT(*) AS n FROM company_agents WHERE company_id = ? AND active = 1`).get(companyId)?.n ?? 0,
        totalMemories: db.prepare(`SELECT COUNT(*) AS n FROM agent_memory WHERE company_id = ?`).get(companyId)?.n ?? 0,
        totalComms:    db.prepare(`SELECT COUNT(*) AS n FROM communications WHERE company_id = ?`).get(companyId)?.n ?? 0,
        totalRagDocs:  db.prepare(`SELECT COUNT(DISTINCT filename) AS n FROM rag_documents WHERE company_id = ?`).get(companyId)?.n ?? 0,
        totalSOPs:     db.prepare(`SELECT COUNT(*) AS n FROM sops WHERE company_id = ? AND active = 1`).get(companyId)?.n ?? 0,
    };
}

// ─── Exports ───────────────────────────────────────────────────────────────
module.exports = {
    db,
    generateRunId,

    // Companies
    upsertCompany,
    syncCompanies,

    // Templates
    listTemplates,
    getTemplate,
    applyTemplateToCompany,

    // Company Agents
    getCompanyAgents,
    getCompanyAgent,
    upsertCompanyAgent,

    // Company Phases (Workflow)
    getCompanyPhases,
    upsertCompanyPhase,

    // SOPs
    addSOP,
    getSOPs,

    // Agent Memory
    addMemory,
    getMemories,

    // Execution Logs
    logEvent,
    getRunLogs,
    getRecentRuns,

    // Generated Reports
    saveReport,
    getReportsByCompany,
    getReportContent,

    // Communications
    logCommunication,
    updateCommunicationStatus,
    getCommunications,

    // RAG
    ragChunkExists,
    insertRagChunk,
    searchRag,
    getRagByFilename,
    deleteRagByFilename,

    // Analytics
    getCompanyStats,

    db
};
