const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { 
        origin: "*", 
        methods: ["GET", "POST"] 
    }
});

// Event Broker Monolith Logic
io.on('connection', (socket) => {
    console.log('[NODE 👑] Client connected to UHNWI+ Event Bus');
    
    // Simulate reading mandates from the root directory
    socket.on('get_mandates', () => {
        const rootDir = path.join(__dirname, '../00_FOUNDER_INPUT');
        if (fs.existsSync(rootDir)) {
            const files = fs.readdirSync(rootDir).filter(f => f.endsWith('.md'));
            socket.emit('mandates_list', files);
        } else {
            socket.emit('mandates_list', []);
        }
    });
    
    // Listen for Web UI pressing "Execute"
    socket.on('trigger_pipeline', (data) => {
        console.log(`[NODE 👑] Pipeline Triggered: ${data.phase}`);
        
        // Simulating Event-Driven Microservice Agent Logic
        if (data.phase === 'csuite') {
            socket.emit('agent_log', { agent: 'System', msg: 'Waking up CEO, CPO, CMO, CFO...' });
            
            setTimeout(() => {
                socket.emit('agent_log', { agent: 'CEO', msg: 'Reading Mandate from 00_FOUNDER_INPUT. Assigning tasks.' });
            }, 1000);
            
            setTimeout(() => {
                socket.emit('agent_log', { agent: 'CPO', msg: 'Mapping operational logistics and UX loops.' });
            }, 2000);
            
             setTimeout(() => {
                socket.emit('agent_log', { agent: 'CFO', msg: 'Enforcing 90% gross margins. Approving retainer structure.' });
            }, 3000);

            setTimeout(() => {
                socket.emit('agent_log', { agent: 'COO', msg: 'Master Plan V1 synthesized via Node Event Loop.' });
                socket.emit('pipeline_complete', { phase: 'csuite' });
            }, 4500);
        }
        
        else if (data.phase === 'market') {
             socket.emit('agent_log', { agent: 'System', msg: 'Deploying Market Crucible via WebSockets...' });
             setTimeout(() => { socket.emit('agent_log', { agent: 'Target Buyer', msg: 'Analyzing Master Plan. Pricing rejected logic simulating...' }); }, 1500);
             setTimeout(() => { socket.emit('agent_log', { agent: 'Competitor', msg: 'Cloning strategy. Synthesizing counter-attack.' }); }, 3000);
             setTimeout(() => { socket.emit('pipeline_complete', { phase: 'market' }); }, 4000);
        }
    });

    socket.on('disconnect', () => {
         console.log('[NODE 👑] Client disconnected');
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`[🚀] Dynasty OS Backend running asynchronously on port ${PORT}`);
});
