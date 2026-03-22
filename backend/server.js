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
const upload = multer({ storage, fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, ['.md', '.txt'].includes(ext));
}});

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

io.on('connection', (socket) => {
    console.log('[NODE 👑] Client connected to UHNWI+ Event Bus');

    socket.on('get_mandates', () => {
        const inputDir = path.join(__dirname, '../00_FOUNDER_INPUT');
        if (!fs.existsSync(inputDir)) fs.mkdirSync(inputDir, { recursive: true });
        
        const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.md'));
        socket.emit('mandates_list', files);
    });

    socket.on('trigger_pipeline', async (data) => {
        console.log(`[NODE 👑] Pipeline Triggered: ${data.phase}`);
        if (!data.mandate) return;

        try {
            if (data.phase === 'csuite') {
                const mandatePath = path.join(__dirname, '../00_FOUNDER_INPUT', data.mandate);
                const mandateContent = fs.readFileSync(mandatePath, 'utf8');

                const outDir = path.join(__dirname, '../company_files/crucible_testing');
                if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
                const cleanName = data.mandate.replace('.md', '');
                const timestamp = Date.now();

                // ---------------------------------------------------------
                // 1. CEO PHASE : MASTER PLAN
                // ---------------------------------------------------------
                const ceoPrompt = fs.readFileSync(path.join(__dirname, '../agents/company/ceo.md'), 'utf8');
                socket.emit('agent_log', { agent: 'CEO', msg: `Reading Mandate [${data.mandate}]. Synthesizing Master Plan via ${COMPANY_MODEL}...` });
                socket.emit('agent_active', { agent: 'CEO' });
                
                const ceoRunner = await together.chat.completions.create({
                    messages: [
                        { "role": "system", "content": ceoPrompt },
                        { "role": "user", "content": `EXECUTE YOUR ROLE. Read the following Mandate and synthesize a comprehensive Master Plan V1. MANDATE:\n\n${mandateContent}` }
                    ],
                    model: COMPANY_MODEL, temperature: 0.7, max_tokens: 2500, stream: true
                });

                let ceoPlan = "";
                for await (const chunk of ceoRunner) {
                    const token = chunk.choices[0]?.delta?.content || "";
                    ceoPlan += token;
                    socket.emit('agent_stream', { agent: 'CEO', chunk: token });
                }
                
                const ceoOutPath = path.join(outDir, `master_plan_v1_${cleanName}_${timestamp}.md`);
                fs.writeFileSync(ceoOutPath, ceoPlan);
                socket.emit('agent_log', { agent: 'System', msg: `CEO Master Plan synthesized -> ${ceoOutPath}` });

                // ---------------------------------------------------------
                // 2. CPO PHASE : ARCHITECTURE 
                // ---------------------------------------------------------
                const cpoPrompt = fs.readFileSync(path.join(__dirname, '../agents/company/cpo.md'), 'utf8');
                socket.emit('agent_log', { agent: 'CPO', msg: `Received CEO Master Plan. Engineering System Architecture...` });
                socket.emit('agent_active', { agent: 'CPO' });

                const cpoRunner = await together.chat.completions.create({
                    messages: [
                        { "role": "system", "content": cpoPrompt },
                        { "role": "user", "content": `EXECUTE YOUR ROLE. Based on the Founder's Mandate and the CEO's Master Plan, design the complete product architecture.\n\nMANDATE:\n${mandateContent}\n\nCEO MASTER PLAN:\n${ceoPlan}` }
                    ],
                    model: COMPANY_MODEL, temperature: 0.5, max_tokens: 2500, stream: true
                });

                let cpoPlan = "";
                for await (const chunk of cpoRunner) {
                    const token = chunk.choices[0]?.delta?.content || "";
                    cpoPlan += token;
                    socket.emit('agent_stream', { agent: 'CPO', chunk: token });
                }

                const cpoOutPath = path.join(outDir, `architecture_plan_${cleanName}_${timestamp}.md`);
                fs.writeFileSync(cpoOutPath, cpoPlan);
                socket.emit('agent_log', { agent: 'System', msg: `CPO Architecture defined -> ${cpoOutPath}` });

                // ---------------------------------------------------------
                // 3. CFO PHASE : FINANCIALS
                // ---------------------------------------------------------
                const cfoPrompt = fs.readFileSync(path.join(__dirname, '../agents/company/cfo.md'), 'utf8');
                socket.emit('agent_log', { agent: 'CFO', msg: `Received CPO Architecture. Modeling Fiscal Constraints...` });
                socket.emit('agent_active', { agent: 'CFO' });

                const cfoRunner = await together.chat.completions.create({
                    messages: [
                        { "role": "system", "content": cfoPrompt },
                        { "role": "user", "content": `EXECUTE YOUR ROLE. Analyze the mandate, master plan, and architecture. Produce a brutal financial constraint model and path to profitability.\n\nARCHITECTURE:\n${cpoPlan}\n\nCEO MASTER PLAN:\n${ceoPlan}` }
                    ],
                    model: COMPANY_MODEL, temperature: 0.3, max_tokens: 2500, stream: true
                });

                let cfoPlan = "";
                for await (const chunk of cfoRunner) {
                    const token = chunk.choices[0]?.delta?.content || "";
                    cfoPlan += token;
                    socket.emit('agent_stream', { agent: 'CFO', chunk: token });
                }

                const cfoOutPath = path.join(outDir, `financial_model_${cleanName}_${timestamp}.md`);
                fs.writeFileSync(cfoOutPath, cfoPlan);
                socket.emit('agent_log', { agent: 'System', msg: `CFO Financials mapped -> ${cfoOutPath}` });

                // ---------------------------------------------------------
                // COMPLETION
                // ---------------------------------------------------------
                socket.emit('agent_active', { agent: null });
                socket.emit('pipeline_complete', { phase: 'csuite' });
                
            }
        } catch (error) {
            console.error(error);
            socket.emit('agent_active', { agent: null });
            socket.emit('agent_log', { agent: 'FATAL ERROR', msg: error.message });
        }
    });

    socket.on('disconnect', () => {
        console.log('[NODE 👑] Client disconnected');
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`\n[🚀] Dynasty OS Backend running asynchronously on port ${PORT}`);
});
