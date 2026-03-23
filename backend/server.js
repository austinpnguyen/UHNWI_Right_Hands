require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Together = require('together-ai');

const app = express();
app.use(cors());
app.use(express.json());

// ─── Directories ────────────────────────────────────────────────────────────
const INPUT_DIR  = path.join(__dirname, '../00_FOUNDER_INSTRUCTION');
const CONFIG_PATH = path.join(__dirname, 'agent_config.json');
if (!fs.existsSync(INPUT_DIR)) fs.mkdirSync(INPUT_DIR, { recursive: true });

// ─── Agent prompt file map (relative to backend/) ────────────────────────────
const AGENT_PROMPT_MAP = {
    CEO:        '../agents/company/ceo.md',
    CPO:        '../agents/company/cpo.md',
    CFO:        '../agents/company/cfo.md',
    CMO:        '../agents/company/cmo.md',
    COO:        '../agents/company/coo.md',
    COS:        '../agents/inner_circle/cos.md',
    CIO:        '../agents/inner_circle/cio.md',
    CISO:       '../agents/inner_circle/ciso.md',
    FIXER:      '../agents/inner_circle/fixer.md',
    WHISPERER:  '../agents/inner_circle/whisperer.md',
    MKT_ANALYST:'../agents/market/market_analyst.md',
    COMPETITOR: '../agents/market/competitor_simulator.md',
    TARGET_BUYER:'../agents/market/target_buyer.md',
    UNAWARE:    '../agents/market/unaware_audience.md',
    AUDITOR:    '../agents/shield/auditor.md',
    CLO:        '../agents/shield/clo.md',
};

const DEFAULT_MODEL = "ServiceNow-AI/Apriel-1.6-15b-Thinker";

// ─── Agent config: persist per-agent model selection ────────────────────────
function loadConfig() {
    if (!fs.existsSync(CONFIG_PATH)) {
        const defaults = Object.fromEntries(
            Object.keys(AGENT_PROMPT_MAP).map(k => [k, { model: DEFAULT_MODEL }])
        );
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaults, null, 2));
        return defaults;
    }
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function saveConfig(config) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// ─── REST: Agent config ───────────────────────────────────────────────────────
app.get('/agent-config', (req, res) => {
    res.json(loadConfig());
});

app.put('/agent-config/:key', (req, res) => {
    const { key } = req.params;
    const { model } = req.body;
    if (!model) return res.status(400).json({ error: 'model is required' });
    const config = loadConfig();
    config[key] = { ...config[key], model };
    saveConfig(config);
    res.json({ ok: true, key, model });
});

// ─── REST: Agent prompts ──────────────────────────────────────────────────────
app.get('/agent-prompt/:key', (req, res) => {
    const promptPath = AGENT_PROMPT_MAP[req.params.key];
    if (!promptPath) return res.status(404).json({ error: 'Agent not found' });
    const full = path.join(__dirname, promptPath);
    if (!fs.existsSync(full)) return res.status(404).json({ error: 'Prompt file not found' });
    res.json({ content: fs.readFileSync(full, 'utf8') });
});

app.put('/agent-prompt/:key', (req, res) => {
    const promptPath = AGENT_PROMPT_MAP[req.params.key];
    if (!promptPath) return res.status(404).json({ error: 'Agent not found' });
    const { content } = req.body;
    if (typeof content !== 'string') return res.status(400).json({ error: 'content is required' });
    fs.writeFileSync(path.join(__dirname, promptPath), content, 'utf8');
    res.json({ ok: true });
});

// ─── REST: File upload ────────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, INPUT_DIR),
    filename:    (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage, fileFilter: (req, file, cb) => {
    cb(null, ['.md', '.txt'].includes(path.extname(file.originalname).toLowerCase()));
}});
app.post('/upload', upload.single('instruction'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No valid file (.md or .txt only)' });
    res.json({ filename: req.file.originalname });
});

app.get('/instruction/:filename', (req, res) => {
    const full = path.join(INPUT_DIR, req.params.filename);
    if (!fs.existsSync(full)) return res.status(404).json({ error: 'Not found' });
    res.json({ content: fs.readFileSync(full, 'utf8') });
});

app.post('/save-instruction', (req, res) => {
    const { filename, content } = req.body;
    if (!filename || typeof content !== 'string') return res.status(400).json({ error: 'Missing data' });
    const safeName = filename.replace(/[^a-z0-9_.-]/gi, '_');
    const finalName = safeName.endsWith('.md') ? safeName : safeName + '.md';
    fs.writeFileSync(path.join(INPUT_DIR, finalName), content, 'utf8');
    res.json({ filename: finalName });
});

// ─── WebSocket ────────────────────────────────────────────────────────────────
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });
const together = new Together({ apiKey: process.env.TOGETHER_API_KEY });

// Strip YAML frontmatter so the LLM never sees tool grants like `tools: Read, Glob`
function stripFrontmatter(text) {
    return text.replace(/^---[\s\S]*?---\s*/m, '').trim();
}

// Stream one agent — filters <think> tokens and respects socket.cancelled flag
async function runAgent({ socket, agentKey, userMessage, outputPath }) {
    const config     = loadConfig();
    const model      = config[agentKey]?.model || DEFAULT_MODEL;
    const promptPath = AGENT_PROMPT_MAP[agentKey];

    if (!promptPath || !fs.existsSync(path.join(__dirname, promptPath))) {
        socket.emit('agent_log', { agent: agentKey, msg: `No prompt file for ${agentKey}, skipping.` });
        return '';
    }
    if (socket.cancelled) throw new Error('STOPPED');

    const systemPrompt = stripFrontmatter(fs.readFileSync(path.join(__dirname, promptPath), 'utf8'));
    socket.emit('agent_log',    { agent: agentKey, msg: `[${agentKey}] Starting on ${model}...` });
    socket.emit('agent_active', { agent: agentKey, active: true });
    const GUARDRAIL = `IMPORTANT: The user requires you to wrap ALL your internal monologues, reasoning, thoughts, and planning explicitly inside <think>...</think> tags. Only your final, beautifully formatted markdown executive report should be placed outside these tags.\n---\n\n`;
    const runner = await together.chat.completions.create({
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user",   content: GUARDRAIL + userMessage }
        ],
        model, temperature: 0.6, max_tokens: 2500, stream: true
    });

    let output = "", inThink = false, thinkBuf = "";
    for await (const chunk of runner) {
        if (socket.cancelled) {
            socket.emit('agent_log',    { agent: agentKey, msg: `[${agentKey}] Stopped by Founder.` });
            socket.emit('agent_active', { agent: agentKey, active: false });
            throw new Error('STOPPED');
        }
        const token = chunk.choices[0]?.delta?.content || "";
        if (!token) continue;
        thinkBuf += token;
        let flushed = "", buf = thinkBuf; thinkBuf = "";
        while (thinkBuf.length > 0) {
            if (!inThink) {
                const oi = thinkBuf.indexOf('<think>');
                if (oi !== -1) {
                    flushed += thinkBuf.slice(0, oi);
                    thinkBuf = thinkBuf.slice(oi + 7);
                    inThink = true;
                } else {
                    const safeLen = Math.max(0, thinkBuf.length - 6);
                    flushed += thinkBuf.slice(0, safeLen);
                    thinkBuf = thinkBuf.slice(safeLen);
                    break;
                }
            } else {
                const ci = thinkBuf.indexOf('</think>');
                if (ci !== -1) {
                    thinkBuf = thinkBuf.slice(ci + 8);
                    inThink = false;
                } else {
                    const safeLen = Math.max(0, thinkBuf.length - 7);
                    thinkBuf = thinkBuf.slice(safeLen);
                    break;
                }
            }
        }
        if (flushed) { output += flushed; socket.emit('agent_stream', { agent: agentKey, chunk: flushed }); }
    }

    if (!inThink && thinkBuf.length > 0) {
        output += thinkBuf;
        socket.emit('agent_stream', { agent: agentKey, chunk: thinkBuf });
    }

    if (output) {
        const outDir = path.dirname(outputPath);
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(outputPath, output);
    }
    socket.emit('agent_log',    { agent: agentKey, msg: `[${agentKey}] Complete -> ${path.basename(outputPath)}` });
    socket.emit('agent_active', { agent: agentKey, active: false });
    return output;
}

io.on('connection', (socket) => {
    console.log('[NODE] Client connected');
    socket.cancelled = false;

    socket.on('get_instructions', () => {
        const files = fs.readdirSync(INPUT_DIR).filter(f => /\.(md|txt)$/.test(f));
        socket.emit('instructions_list', files);
    });

    // Founder can halt the pipeline at any point mid-stream
    socket.on('stop_pipeline', () => {
        socket.cancelled = true;
        socket.emit('agent_log', { agent: 'System', msg: '⛔ Pipeline stopped by Founder.' });
    });

    socket.on('trigger_pipeline', async (data) => {
        if (!data.instruction) return;
        socket.cancelled = false;
        const instructionContent = fs.readFileSync(path.join(INPUT_DIR, data.instruction), 'utf8');
        const outDir = path.join(__dirname, '../company_files/thoughts', data.instruction.replace(/\.(md|txt)$/, ''));
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const hrTag = `${yyyy}${mm}${dd}_${hh}`;

        socket.emit('pipeline_phase', { phase: 1, total: 3, label: 'Phase 1 — CEO: Master Plan' });

        try {
            const ceoPlan = await runAgent({
                socket, agentKey: 'CEO',
                userMessage: `EXECUTE YOUR ROLE. Synthesize a Master Plan V1 from the Founder's Instruction below.\n\nINSTRUCTION:\n${instructionContent}`,
                outputPath: path.join(outDir, `CEO_${hrTag}.md`)
            });

            socket.emit('agent_log',    { agent: 'System', msg: 'CEO complete. Dispatching C-Suite (Phase 2) in parallel...' });
            socket.emit('pipeline_phase', { phase: 2, total: 3, label: 'Phase 2 — C-Suite: Strategy Formulation' });

            const sharedCtx = `INSTRUCTION:\n${instructionContent}\n\nCEO MASTER PLAN:\n${ceoPlan}`;
            const [cpoArch, cfoFin, cmoGtm, cooOps] = await Promise.all([
                runAgent({ socket, agentKey: 'CPO', userMessage: `EXECUTE YOUR ROLE. Design the full product architecture.\n\n${sharedCtx}`, outputPath: path.join(outDir, `CPO_${hrTag}.md`) }),
                runAgent({ socket, agentKey: 'CFO', userMessage: `EXECUTE YOUR ROLE. Produce a brutal financial constraint model.\n\n${sharedCtx}`, outputPath: path.join(outDir, `CFO_${hrTag}.md`) }),
                runAgent({ socket, agentKey: 'CMO', userMessage: `EXECUTE YOUR ROLE. Design the complete go-to-market and brand strategy.\n\n${sharedCtx}`, outputPath: path.join(outDir, `CMO_${hrTag}.md`) }),
                runAgent({ socket, agentKey: 'COO', userMessage: `EXECUTE YOUR ROLE. Map out the full operational execution framework.\n\n${sharedCtx}`, outputPath: path.join(outDir, `COO_${hrTag}.md`) }),
            ]);

            socket.emit('agent_log',    { agent: 'System', msg: 'C-Suite complete. Dispatching specialized divisions (Phase 3)...' });
            socket.emit('pipeline_phase', { phase: 3, total: 4, label: 'Phase 3 — Specialized Divisions: Execution & Validation' });

            // Phase 3: Specialized execution branches based on C-Suite outputs
            const phase3Outputs = await Promise.all([
                // CPO Branch
                runAgent({ socket, agentKey: 'CIO',          userMessage: `EXECUTE YOUR ROLE. Review the CPO Architecture and define the Tech Infrastructure.\n\nCPO ARCHITECTURE:\n${cpoArch}`, outputPath: path.join(outDir, `CIO_${hrTag}.md`) }),
                
                // CFO Branch
                runAgent({ socket, agentKey: 'AUDITOR',      userMessage: `EXECUTE YOUR ROLE. Validate and aggressively stress-test the CFO's Financial Model.\n\nCFO FINANCIAL MODEL:\n${cfoFin}`, outputPath: path.join(outDir, `AUDITOR_${hrTag}.md`) }),
                runAgent({ socket, agentKey: 'CLO',          userMessage: `EXECUTE YOUR ROLE. Review the CFO Financials for legal and compliance risks.\n\nCFO FINANCIAL MODEL:\n${cfoFin}`, outputPath: path.join(outDir, `CLO_${hrTag}.md`) }),
                
                // CMO Branch
                runAgent({ socket, agentKey: 'MKT_ANALYST',  userMessage: `EXECUTE YOUR ROLE. Analyze the CMO's GTM Strategy for market viability.\n\nCMO GTM STRATEGY:\n${cmoGtm}`, outputPath: path.join(outDir, `MKT_ANALYST_${hrTag}.md`) }),
                runAgent({ socket, agentKey: 'COMPETITOR',   userMessage: `EXECUTE YOUR ROLE. Act as the Competitor Simulator to destroy the CMO's GTM Strategy.\n\nCMO GTM STRATEGY:\n${cmoGtm}`, outputPath: path.join(outDir, `COMPETITOR_${hrTag}.md`) }),
                runAgent({ socket, agentKey: 'TARGET_BUYER', userMessage: `EXECUTE YOUR ROLE. Act as the Target Buyer evaluating the CMO's GTM Strategy.\n\nCMO GTM STRATEGY:\n${cmoGtm}`, outputPath: path.join(outDir, `TARGET_BUYER_${hrTag}.md`) }),
                runAgent({ socket, agentKey: 'UNAWARE',      userMessage: `EXECUTE YOUR ROLE. Evaluate the CMO's GTM Strategy from the perspective of an unaware layperson.\n\nCMO GTM STRATEGY:\n${cmoGtm}`, outputPath: path.join(outDir, `UNAWARE_${hrTag}.md`) }),
                
                // COO Branch
                runAgent({ socket, agentKey: 'COS',          userMessage: `EXECUTE YOUR ROLE. Review the COO's Ops Framework and output an executive coordination schedule.\n\nCOO OPS FRAMEWORK:\n${cooOps}`, outputPath: path.join(outDir, `COS_${hrTag}.md`) }),
                runAgent({ socket, agentKey: 'CISO',         userMessage: `EXECUTE YOUR ROLE. Review the COO's Ops Framework for security vulnerabilities.\n\nCOO OPS FRAMEWORK:\n${cooOps}`, outputPath: path.join(outDir, `CISO_${hrTag}.md`) }),
                runAgent({ socket, agentKey: 'FIXER',        userMessage: `EXECUTE YOUR ROLE. Identify crisis points in the COO's Ops Framework and plan resolutions.\n\nCOO OPS FRAMEWORK:\n${cooOps}`, outputPath: path.join(outDir, `FIXER_${hrTag}.md`) }),
                runAgent({ socket, agentKey: 'WHISPERER',    userMessage: `EXECUTE YOUR ROLE. Review the COO's Ops Framework for intelligence vulnerabilities.\n\nCOO OPS FRAMEWORK:\n${cooOps}`, outputPath: path.join(outDir, `WHISPERER_${hrTag}.md`) }),
            ]);

            socket.emit('agent_log', { agent: 'System', msg: 'Phase 3 complete. CEO is synthesizing Final Report (Phase 4)...' });
            socket.emit('pipeline_phase', { phase: 4, total: 4, label: 'Phase 4 — CEO: Final Synthesis' });

            const truncate = (str, len = 2000) => str && str.length > len ? str.slice(0, len) + "\n\n...[TRUNCATED FOR BREVITY]" : (str || "");

            const finalReportCtx = `
INSTRUCTION:\n${truncate(instructionContent, 3000)}

CEO MASTER PLAN V1:\n${truncate(ceoPlan, 3000)}

--- C-SUITE TEST OUTPUTS ---
CPO Architecture: ${truncate(cpoArch, 2000)}
CFO Financials: ${truncate(cfoFin, 2000)}
CMO GTM: ${truncate(cmoGtm, 2000)}
COO Ops: ${truncate(cooOps, 2000)}

--- PHASE 3 DIVISIONAL AUDIT FEEDBACK ---
CIO: ${truncate(phase3Outputs[0], 2000)}
Auditor: ${truncate(phase3Outputs[1], 2000)}
CLO: ${truncate(phase3Outputs[2], 2000)}
Mkt Analyst: ${truncate(phase3Outputs[3], 2000)}
Competitor: ${truncate(phase3Outputs[4], 2000)}
Target Buyer: ${truncate(phase3Outputs[5], 2000)}
Unaware: ${truncate(phase3Outputs[6], 2000)}
COS: ${truncate(phase3Outputs[7], 2000)}
CISO: ${truncate(phase3Outputs[8], 2000)}
Fixer: ${truncate(phase3Outputs[9], 2000)}
Whisperer: ${truncate(phase3Outputs[10], 2000)}
`;

            const finalReportFileName = `CEO_FINAL_REPORT_${hrTag}.md`;
            const ceoFinal = await runAgent({
                socket, agentKey: 'CEO', 
                userMessage: `EXECUTE YOUR ROLE: ALL Divisons have weighed in on your Master Plan V1. Below is the brutal feedback from the Market and the Shield.

Synthesize all of this into a FINAL Executive Report for the Founder. Acknowledge the flaws found by the Auditors/Competitors and state the required pivots or explicitly state that the Founder should kill the project. Do NOT write V1 again.

This report MUST BE HIGHLY DESCRIPTIVE, structured with professional severity. Include:
1. EXECUTIVE SUMMARY: The brutal truth on whether to Pivot, Persevere, or Kill.
2. DIVISIONAL VULNERABILITIES: Summarize the most critical attacks from the Shield and Market divisions.
3. STRATEGIC PIVOTS: Lay out the exact paradigm shift required in Architecture (CPO), Financials (CFO), and Brand (CMO) to survive.

Do not just give a brief summary. Write a comprehensive, multi-section advisory report. Use Markdown.

${finalReportCtx}`,
                outputPath: path.join(outDir, finalReportFileName)
            });

            socket.emit('agent_log',        { agent: 'System', msg: 'Pipeline [FULL DYNASTY] complete. 17 reports filed.' });
            socket.emit('pipeline_complete', { phase: 'csuite', reportCount: 17, finalReport: finalReportFileName, finalReportContent: ceoFinal });
        } catch (err) {
            if (err.message === 'STOPPED') {
                socket.emit('pipeline_complete', { phase: 'stopped', reportCount: 0 });
            } else {
                console.error('[NODE] Pipeline error:', err);
                socket.emit('agent_log',        { agent: 'FATAL ERROR', msg: err.message });
                socket.emit('pipeline_complete', { phase: 'error', reportCount: 0 });
            }
        }
    });

    socket.on('disconnect', () => console.log('[NODE] Client disconnected'));
});

const PORT = process.env.PORT || 1110;
server.listen(PORT, () => console.log(`\n[SYSTEM] Dynasty OS Backend running on :${PORT}`));

