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

// --- File Upload ---
const INPUT_DIR = path.join(__dirname, '../00_FOUNDER_INPUT');
if (!fs.existsSync(INPUT_DIR)) fs.mkdirSync(INPUT_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, INPUT_DIR),
    filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, ['.md', '.txt'].includes(ext));
    }
});

app.post('/upload', upload.single('mandate'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No valid file provided (.md or .txt only)' });
    res.json({ filename: req.file.originalname });
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const together = new Together({ apiKey: process.env.TOGETHER_API_KEY });
const COMPANY_MODEL = "ServiceNow-AI/Apriel-1.6-15b-Thinker";

// --- Helper: stream a single agent's LLM call and write the result file ---
async function runAgent({ socket, agentKey, systemPromptPath, userMessage, outputPath }) {
    const systemPrompt = fs.readFileSync(systemPromptPath, 'utf8');

    socket.emit('agent_log', { agent: agentKey, msg: `[${agentKey}] Starting via ${COMPANY_MODEL}...` });
    socket.emit('agent_active', { agent: agentKey, active: true });

    const runner = await together.chat.completions.create({
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user",   content: userMessage }
        ],
        model: COMPANY_MODEL,
        temperature: 0.6,
        max_tokens: 2500,
        stream: true
    });

    let output = "";
    for await (const chunk of runner) {
        const token = chunk.choices[0]?.delta?.content || "";
        output += token;
        socket.emit('agent_stream', { agent: agentKey, chunk: token });
    }

    // Write result file
    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outputPath, output);

    socket.emit('agent_log',   { agent: agentKey, msg: `[${agentKey}] Complete -> ${path.basename(outputPath)}` });
    socket.emit('agent_active', { agent: agentKey, active: false });

    return output;
}

// --- Socket Event Bus ---
io.on('connection', (socket) => {
    console.log('[NODE] Client connected to UHNWI+ Event Bus');

    socket.on('get_mandates', () => {
        const files = fs.readdirSync(INPUT_DIR).filter(f => /\.(md|txt)$/.test(f));
        socket.emit('mandates_list', files);
    });

    socket.on('trigger_pipeline', async (data) => {
        if (!data.mandate) return;
        console.log(`[NODE] Pipeline triggered: ${data.phase} / ${data.mandate}`);

        const mandatePath     = path.join(INPUT_DIR, data.mandate);
        const outDir          = path.join(__dirname, '../company_files/crucible_testing');
        const cleanName       = data.mandate.replace(/\.(md|txt)$/, '');
        const ts              = Date.now();

        try {
            // ------------------------------------------------------------------
            // PHASE 1: CEO — synthesizes the master plan (all other agents wait)
            // ------------------------------------------------------------------
            const ceoPlan = await runAgent({
                socket,
                agentKey: 'CEO',
                systemPromptPath: path.join(__dirname, '../agents/company/ceo.md'),
                userMessage: `EXECUTE YOUR ROLE. Synthesize a Master Plan V1 from the Founder's Mandate below.\n\nMANDATE:\n${fs.readFileSync(mandatePath, 'utf8')}`,
                outputPath: path.join(outDir, `master_plan_v1_${cleanName}_${ts}.md`)
            });

            socket.emit('agent_log', { agent: 'System', msg: 'CEO complete. Dispatching C-Suite in parallel...' });

            // ------------------------------------------------------------------
            // PHASE 2: CPO + CFO + CMO + COO run concurrently with Promise.all.
            // Each agent receives the mandate AND the CEO master plan.
            // ------------------------------------------------------------------
            const mandateContent = fs.readFileSync(mandatePath, 'utf8');
            const sharedContext  = `MANDATE:\n${mandateContent}\n\nCEO MASTER PLAN:\n${ceoPlan}`;

            await Promise.all([

                runAgent({
                    socket,
                    agentKey: 'CPO',
                    systemPromptPath: path.join(__dirname, '../agents/company/cpo.md'),
                    userMessage: `EXECUTE YOUR ROLE. Design the full product architecture based on the context below.\n\n${sharedContext}`,
                    outputPath: path.join(outDir, `architecture_${cleanName}_${ts}.md`)
                }),

                runAgent({
                    socket,
                    agentKey: 'CFO',
                    systemPromptPath: path.join(__dirname, '../agents/company/cfo.md'),
                    userMessage: `EXECUTE YOUR ROLE. Produce a brutal financial constraint model and path to profitability.\n\n${sharedContext}`,
                    outputPath: path.join(outDir, `financial_model_${cleanName}_${ts}.md`)
                }),

                runAgent({
                    socket,
                    agentKey: 'CMO',
                    systemPromptPath: path.join(__dirname, '../agents/company/cmo.md'),
                    userMessage: `EXECUTE YOUR ROLE. Design the complete go-to-market and brand strategy.\n\n${sharedContext}`,
                    outputPath: path.join(outDir, `gtm_strategy_${cleanName}_${ts}.md`)
                }),

                runAgent({
                    socket,
                    agentKey: 'COO',
                    systemPromptPath: path.join(__dirname, '../agents/company/coo.md'),
                    userMessage: `EXECUTE YOUR ROLE. Map out the full operational execution framework.\n\n${sharedContext}`,
                    outputPath: path.join(outDir, `ops_framework_${cleanName}_${ts}.md`)
                }),

            ]);

            socket.emit('agent_log',        { agent: 'System', msg: `Pipeline [${data.phase.toUpperCase()}] complete. All C-Suite reports filed.` });
            socket.emit('pipeline_complete', { phase: data.phase });

        } catch (err) {
            console.error('[NODE] Pipeline error:', err.message);
            socket.emit('agent_log',  { agent: 'FATAL ERROR', msg: err.message });
            socket.emit('pipeline_complete', { phase: 'error' });
        }
    });

    socket.on('disconnect', () => {
        console.log('[NODE] Client disconnected');
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`\n[SYSTEM] Dynasty OS Backend running on port ${PORT}`);
});
