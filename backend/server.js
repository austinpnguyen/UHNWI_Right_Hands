require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const Together = require('together-ai');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// Initialize Together AI only if the API key is present
const together = process.env.TOGETHER_API_KEY ? new Together({ apiKey: process.env.TOGETHER_API_KEY }) : null;

io.on('connection', (socket) => {
    console.log('[NODE 👑] Client connected to UHNWI+ Event Bus');
    
    // Serve mandates for the frontend UI
    socket.on('get_mandates', () => {
        const rootDir = path.join(__dirname, '../00_FOUNDER_INPUT');
        if (fs.existsSync(rootDir)) {
            const files = fs.readdirSync(rootDir).filter(f => f.endsWith('.md'));
            socket.emit('mandates_list', files);
        } else {
            socket.emit('mandates_list', []);
        }
    });
    
    // Core Execution Pipeline trigger
    socket.on('trigger_pipeline', async (data) => {
        console.log(`[NODE 👑] Pipeline Triggered: ${data.phase} for Mandate: ${data.mandate}`);
        
        if (data.phase === 'csuite') {
            socket.emit('agent_log', { agent: 'System', msg: 'Waking up CEO. Connecting to Together AI Engine...' });
            
            // Security Checks
            if (!together) {
                socket.emit('agent_log', { agent: 'ERROR', msg: 'TOGETHER_API_KEY is missing! Please configure backend/.env file.' });
                return socket.emit('pipeline_complete', { phase: 'error' });
            }
            if (!data.mandate) {
                socket.emit('agent_log', { agent: 'ERROR', msg: 'No mandate selected by Founder!' });
                return socket.emit('pipeline_complete', { phase: 'error' });
            }

            try {
                // 1. Read the exact Mandate selected
                const mandatePath = path.join(__dirname, '../00_FOUNDER_INPUT', data.mandate);
                const mandateContent = fs.readFileSync(mandatePath, 'utf8');
                
                // 2. Prime the Agent Persona
                const ceoPromptPath = path.join(__dirname, '../agents/company/ceo.md');
                const ceoPrompt = fs.readFileSync(ceoPromptPath, 'utf8');

                socket.emit('agent_log', { agent: 'CEO', msg: `Reading Mandate [${data.mandate}]. Sending strategic directives to Meta-Llama-3.1-8B...` });

                // 3. API Execution (Streaming Mode)
                socket.emit('agent_active', { agent: 'CEO' });
                
                const runner = await together.chat.completions.create({
                    messages: [
                        { "role": "system", "content": ceoPrompt },
                        { "role": "user", "content": `EXECUTE YOUR ROLE. Read the following Mandate and synthesize a comprehensive Master Plan V1. MANDATE:\n\n${mandateContent}` }
                    ],
                    model: "meta-llama/Meta-Llama-3.1-8B-Instruct", 
                    temperature: 0.7,
                    max_tokens: 2500,
                    stream: true
                });

                let plan = "";
                for await (const chunk of runner) {
                    const token = chunk.choices[0]?.delta?.content || "";
                    plan += token;
                    socket.emit('agent_stream', { agent: 'CEO', chunk: token });
                }
                
                // 4. File Output & Handoff
                const outDir = path.join(__dirname, '../company_files/crucible_testing');
                if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
                
                const timestamp = Date.now();
                const cleanName = data.mandate.replace('.md', '');
                const fileName = `master_plan_v1_${cleanName}_${timestamp}.md`;
                const outPath = path.join(outDir, fileName);
                fs.writeFileSync(outPath, plan);
                
                socket.emit('agent_log', { agent: 'System', msg: `CEO Master Plan synthesized and filed at /crucible_testing/${fileName}` });
                socket.emit('agent_active', { agent: null });
                socket.emit('pipeline_complete', { phase: 'csuite' });
                
            } catch (error) {
                console.error(error);
                socket.emit('agent_log', { agent: 'FATAL ERROR', msg: error.message });
                socket.emit('pipeline_complete', { phase: 'error' });
            }
        }
        else if (data.phase === 'market') {
             socket.emit('agent_log', { agent: 'System', msg: 'Market Crucible Event called. Currently awaiting full API scaling.' });
             socket.emit('pipeline_complete', { phase: 'market' });
        }
    });

    socket.on('disconnect', () => { console.log('[NODE 👑] Client disconnected'); });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`[🚀] Dynasty OS Backend running asynchronously on port ${PORT}`);
});
