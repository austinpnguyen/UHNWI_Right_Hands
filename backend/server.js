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
const INPUT_DIR  = path.join(__dirname, '../00_FOUNDER_INPUT');
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
app.post('/upload', upload.single('mandate'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No valid file (.md or .txt only)' });
    res.json({ filename: req.file.originalname });
});

// ─── WebSocket ────────────────────────────────────────────────────────────────
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });
const together = new Together({ apiKey: process.env.TOGETHER_API_KEY });

// Strip YAML frontmatter so the LLM never sees tool grants like `tools: Read, Glob`
function stripFrontmatter(text) {
    return text.replace(/^---[\s\S]*?---\s*/m, '').trim();
}

// Stream one agent call, filtering <think>...</think> reasoning tokens
async function runAgent({ socket, agentKey, userMessage, outputPath }) {
    const config     = loadConfig();
    const model      = config[agentKey]?.model || DEFAULT_MODEL;
    const promptPath = AGENT_PROMPT_MAP[agentKey];

    if (!promptPath || !fs.existsSync(path.join(__dirname, promptPath))) {
        socket.emit('agent_log', { agent: agentKey, msg: `No prompt file found for ${agentKey}, skipping.` });
        return '';
    }

    const systemPrompt = stripFrontmatter(fs.readFileSync(path.join(__dirname, promptPath), 'utf8'));

    socket.emit('agent_log',    { agent: agentKey, msg: `[${agentKey}] Starting on ${model}...` });
    socket.emit('agent_active', { agent: agentKey, active: true });

    const GUARDRAIL = `IMPORTANT: You do NOT have access to any tools, file systems, or external APIs.
ALL context you need is provided directly in this message.
Do NOT output any <tool_calls>, <function_call>, Glob, Read, or similar blocks.
Generate your full written report NOW using only the text provided below.\n---\n\n`;

    const runner = await together.chat.completions.create({
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user",   content: GUARDRAIL + userMessage }
        ],
        model, temperature: 0.6, max_tokens: 2500, stream: true
    });

    // Filter <think>...</think> reasoning tokens
    let output = "", inThink = false, thinkBuf = "";
    for await (const chunk of runner) {
        const token = chunk.choices[0]?.delta?.content || "";
        if (!token) continue;
        thinkBuf += token;
        let flushed = "", buf = thinkBuf;
        thinkBuf = "";
        while (buf.length > 0) {
            if (!inThink) {
                const oi = buf.indexOf('<think>');
                if (oi === -1) { flushed += buf; buf = ""; }
                else { flushed += buf.slice(0, oi); buf = buf.slice(oi + 7); inThink = true; }
            } else {
                const ci = buf.indexOf('</think>');
                if (ci === -1) { buf = ""; }
                else { buf = buf.slice(ci + 8); inThink = false; }
            }
        }
        if (flushed) { output += flushed; socket.emit('agent_stream', { agent: agentKey, chunk: flushed }); }
    }

    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outputPath, output);

    socket.emit('agent_log',    { agent: agentKey, msg: `[${agentKey}] Complete -> ${path.basename(outputPath)}` });
    socket.emit('agent_active', { agent: agentKey, active: false });
    return output;
}

io.on('connection', (socket) => {
    console.log('[NODE] Client connected');

    socket.on('get_mandates', () => {
        const files = fs.readdirSync(INPUT_DIR).filter(f => /\.(md|txt)$/.test(f));
        socket.emit('mandates_list', files);
    });

    socket.on('trigger_pipeline', async (data) => {
        if (!data.mandate) return;
        const mandateContent = fs.readFileSync(path.join(INPUT_DIR, data.mandate), 'utf8');
        const outDir         = path.join(__dirname, '../company_files/crucible_testing');
        const tag            = `${data.mandate.replace(/\.(md|txt)$/, '')}_${Date.now()}`;

        try {
            // Phase 1: CEO synthesizes the master plan
            const ceoPlan = await runAgent({
                socket, agentKey: 'CEO',
                userMessage: `EXECUTE YOUR ROLE. Synthesize a Master Plan V1 from the Founder's Mandate below.\n\nMANDATE:\n${mandateContent}`,
                outputPath:  path.join(outDir, `master_plan_v1_${tag}.md`)
            });

            socket.emit('agent_log', { agent: 'System', msg: 'CEO complete. Dispatching C-Suite in parallel...' });

            // Phase 2: CPO, CFO, CMO, COO run concurrently
            const sharedCtx = `MANDATE:\n${mandateContent}\n\nCEO MASTER PLAN:\n${ceoPlan}`;
            await Promise.all([
                runAgent({ socket, agentKey: 'CPO', userMessage: `EXECUTE YOUR ROLE. Design the full product architecture.\n\n${sharedCtx}`, outputPath: path.join(outDir, `architecture_${tag}.md`) }),
                runAgent({ socket, agentKey: 'CFO', userMessage: `EXECUTE YOUR ROLE. Produce a brutal financial constraint model.\n\n${sharedCtx}`, outputPath: path.join(outDir, `financial_model_${tag}.md`) }),
                runAgent({ socket, agentKey: 'CMO', userMessage: `EXECUTE YOUR ROLE. Design the complete go-to-market and brand strategy.\n\n${sharedCtx}`, outputPath: path.join(outDir, `gtm_strategy_${tag}.md`) }),
                runAgent({ socket, agentKey: 'COO', userMessage: `EXECUTE YOUR ROLE. Map out the full operational execution framework.\n\n${sharedCtx}`, outputPath: path.join(outDir, `ops_framework_${tag}.md`) }),
            ]);

            socket.emit('agent_log',        { agent: 'System', msg: `Pipeline [${data.phase.toUpperCase()}] complete. All C-Suite reports filed.` });
            socket.emit('pipeline_complete', { phase: data.phase });
        } catch (err) {
            console.error('[NODE] Pipeline error:', err.message);
            socket.emit('agent_log',        { agent: 'FATAL ERROR', msg: err.message });
            socket.emit('pipeline_complete', { phase: 'error' });
        }
    });

    socket.on('disconnect', () => console.log('[NODE] Client disconnected'));
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`\n[SYSTEM] Dynasty OS Backend running on :${PORT}`));
