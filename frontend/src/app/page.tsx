"use client";
import { useEffect, useState, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ─── Together AI chat models (chat category only, with pricing & use case) ────
const TOGETHER_MODELS = [
  { id: 'ServiceNow-AI/Apriel-1.6-15b-Thinker',             label: 'Apriel 1.6 15B Thinker',             author: 'ServiceNow',   price: 'Free 🎉', cat: '🧠 Planning / Reasoning',    catIcon: '🧠' },
  { id: 'ServiceNow-AI/Apriel-1.5-15b-Thinker',             label: 'Apriel 1.5 15B Thinker',             author: 'ServiceNow',   price: 'Free 🎉', cat: '🧠 Planning / Reasoning',    catIcon: '🧠' },
  { id: 'LFM2-24B-A2B',                                     label: 'LFM2 24B A2B',                       author: 'Together',     price: '$0.03/$0.12', cat: '⚡ Fast / General',       catIcon: '⚡' },
  { id: 'google/gemma-3n-e4b-it',                           label: 'Gemma 3N E4B',                       author: 'Google',       price: '$0.02/$0.04', cat: '⚡ Fast / General',       catIcon: '⚡' },
  { id: 'mistralai/Mistral-Small-24B-Instruct-2501',         label: 'Mistral Small 24B',                  author: 'Mistral',      price: '$0.10/$0.30', cat: '⚡ Fast / General',       catIcon: '⚡' },
  { id: 'meta-llama/Meta-Llama-3-8B-Instruct-Lite',         label: 'Llama 3 8B Lite',                    author: 'Meta',         price: '$0.10',       cat: '⚡ Fast / General',       catIcon: '⚡' },
  { id: 'Qwen/Qwen2.5-7B-Instruct-Turbo',                   label: 'Qwen2.5 7B Turbo',                   author: 'Qwen',         price: '$0.30',       cat: '⚡ Fast / General',       catIcon: '⚡' },
  { id: 'Qwen/Qwen3-9B',                                    label: 'Qwen3.5 9B',                         author: 'Qwen',         price: '$0.10/$0.15', cat: '⚡ Fast / General',       catIcon: '⚡' },
  { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1',             label: 'Mixtral 8x7B Instruct',              author: 'Mistral',      price: '$0.60',       cat: '⚡ Fast / General',       catIcon: '⚡' },
  { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',          label: 'Llama 3.3 70B Turbo',                author: 'Meta',         price: '$0.88',       cat: '🦾 Heavy Compute',       catIcon: '🦾' },
  { id: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8','label': 'Llama 4 Maverick 17B',             author: 'Meta',         price: '$0.27/$0.85', cat: '🦾 Heavy Compute',       catIcon: '🦾' },
  { id: 'deepseek-ai/DeepSeek-V3',                          label: 'DeepSeek V3.1',                      author: 'DeepSeek',     price: '$0.60/$1.70', cat: '💻 Code / Logic',         catIcon: '💻' },
  { id: 'deepseek-ai/deepseek-r1',                          label: 'DeepSeek R1 0528',                   author: 'DeepSeek',     price: '$3.00/$7.00', cat: '🧠 Planning / Reasoning',    catIcon: '🧠' },
  { id: 'Qwen/Qwen3-235B-A22B-Instruct-FP8',                label: 'Qwen3 235B Instruct FP8',            author: 'Qwen',         price: '$0.20/$0.60', cat: '🦾 Heavy Compute',       catIcon: '🦾' },
  { id: 'Qwen/Qwen3-235B-A22B-fp8-thinker',                 label: 'Qwen3 235B Thinking FP8',            author: 'Qwen',         price: '$0.65/$3.00', cat: '🧠 Planning / Reasoning',    catIcon: '🧠' },
  { id: 'Qwen/Qwen3.5-72B',                                 label: 'Qwen3.5 72B (397B MoE)',             author: 'Qwen',         price: '$0.60/$3.60', cat: '🦾 Heavy Compute',       catIcon: '🦾' },
  { id: 'Cogito/cogito-v2-671B',                            label: 'Cogito v2.1 671B',                   author: 'DeepCogito',   price: '$1.25',       cat: '🦾 Heavy Compute',       catIcon: '🦾' },
  { id: 'openai/gpt-4o-mini',                               label: 'OpenAI GPT OSS 20B',                 author: 'OpenAI',       price: '$0.05/$0.20', cat: '⚡ Fast / General',       catIcon: '⚡' },
];

// ─── All 16 agents ──────────────────────────────────────────────────────────
export const INITIAL_AGENTS = [
  { key:'CEO',         label:'CEO',              role:'Master Plan',          icon:'♟️', color:'blue',    div:'company',      x:825,  y:40,   desc: "Reads instructions, formulates the Master Plan, delegates to C-Suite, and finally condenses all outputs into the Final Executive Report." },
  
  // C-SUITE ROW
  { key:'CPO',         label:'CPO',              role:'Architecture',         icon:'🛠️', color:'indigo',  div:'company',      x:100,  y:180,  desc: "Designs the core product architecture and operational logistics based on the CEO's Master Plan." },
  { key:'CFO',         label:'CFO',              role:'Financials',           icon:'📈', color:'emerald', div:'company',      x:500,  y:180,  desc: "Creates the brutal financial constraint model and pricing matrices to ensure high gross margins." },
  { key:'CMO',         label:'CMO',              role:'Brand Strategy',       icon:'📣', color:'pink',    div:'company',      x:950, y:180,  desc: "Formulates the Go-To-Market and elite brand strategy tailored for target demographics." },
  { key:'COO',         label:'COO',              role:'Operations',           icon:'⚙️', color:'orange',  div:'company',      x:1550, y:180,  desc: "Maps out the full operational execution framework to deliver the promised services." },
  
  // BRANCH: CPO
  { key:'CIO',         label:'CIO',              role:'Tech Infrastructure',  icon:'💻', color:'blue',    div:'inner_circle', x:100,  y:340,  desc: "Defines the technical infrastructure and software stack required by the CPO's architecture." },
  
  // BRANCH: CFO
  { key:'AUDITOR',     label:'Auditor',          role:'Financial Compliance', icon:'📊', color:'amber',   div:'shield',       x:400,  y:340,  desc: "Aggressively stress-tests the CFO's financial model to identify fraudulent or optimistic assumptions." },
  { key:'CLO',         label:'CLO',              role:'Legal Strategy',       icon:'⚖️', color:'slate',   div:'shield',       x:600,  y:340,  desc: "Reviews the business model and financials for fatal legal and compliance risks." },
  
  // BRANCH: CMO
  { key:'MKT_ANALYST', label:'Market Analyst',   role:'Competitive Intel',    icon:'🔍', color:'blue',    div:'market',       x:850, y:340,  desc: "Analyzes the GTM Strategy against market realities to determine viability." },
  { key:'COMPETITOR',  label:'Competitor Sim',   role:'Adversarial Model',    icon:'⚔️', color:'red',     div:'market',       x:1050, y:340,  desc: "Simulates a ruthless competitor attempting to destroy the CMO's GTM Strategy." },
  { key:'TARGET_BUYER',label:'Target Buyer',     role:'Buyer Psychology',     icon:'🎯', color:'emerald', div:'market',       x:850, y:480,  desc: "Acts as the target demographic, evaluating the CMO's strategy for maximum appeal." },
  { key:'UNAWARE',     label:'Unaware Audience', role:'Cold Market Sim',      icon:'🌐', color:'gray',    div:'market',       x:1050, y:480,  desc: "Evaluates branding from the perspective of a cold, completely unaware layperson." },
  
  // BRANCH: COO
  { key:'COS',         label:'Chief of Staff',   role:'Exec Coordination',    icon:'📋', color:'violet',  div:'inner_circle', x:1450, y:340,  desc: "Translates the COO's framework into a tight executive coordination schedule." },
  { key:'CISO',        label:'CISO',             role:'Security & Privacy',   icon:'🛡️', color:'slate',   div:'inner_circle', x:1650, y:340,  desc: "Identifies security vulnerabilities and privacy loopholes in the operational layout." },
  { key:'FIXER',       label:'The Fixer',        role:'Crisis Resolution',    icon:'🔧', color:'amber',   div:'inner_circle', x:1450, y:480,  desc: "Identifies operational crisis points and formulates brutal resolutions to save the company." },
  { key:'WHISPERER',   label:'The Whisperer',    role:'Intelligence & Recon', icon:'👁️', color:'purple',  div:'inner_circle', x:1650, y:480,  desc: "Reviews the operational framework for intelligence vulnerabilities and operational security." },
];

export const INITIAL_EDGES = [
  { from:'CEO',to:'CPO'},{ from:'CEO',to:'CFO'},{ from:'CEO',to:'CMO'},{ from:'CEO',to:'COO'},
  { from:'CPO',to:'CIO'},{ from:'CFO',to:'AUDITOR'},{ from:'CFO',to:'CLO'},
  { from:'CMO',to:'MKT_ANALYST'},{ from:'CMO',to:'COMPETITOR'},{ from:'CMO',to:'TARGET_BUYER'},{ from:'CMO',to:'UNAWARE'},
  { from:'COO',to:'COS'},{ from:'COO',to:'CISO'},{ from:'COO',to:'FIXER'},{ from:'COO',to:'WHISPERER'},
];

const NODE_W=190, NODE_H=85, CANVAS_W=1900, CANVAS_H=640;

const C: Record<string,any> = {
  blue:    { ring:'ring-blue-400',    glow:'shadow-[0_0_20px_rgba(96,165,250,0.5)]',    dot:'bg-blue-500',    badge:'bg-blue-100 text-blue-700',     h:'from-blue-50',    ic:'bg-blue-100 text-blue-600',    edge:'#60A5FA' },
  indigo:  { ring:'ring-indigo-400',  glow:'shadow-[0_0_20px_rgba(129,140,248,0.5)]',   dot:'bg-indigo-500',  badge:'bg-indigo-100 text-indigo-700',  h:'from-indigo-50',  ic:'bg-indigo-100 text-indigo-600', edge:'#818CF8' },
  emerald: { ring:'ring-emerald-400', glow:'shadow-[0_0_20px_rgba(52,211,153,0.5)]',    dot:'bg-emerald-500', badge:'bg-emerald-100 text-emerald-700', h:'from-emerald-50', ic:'bg-emerald-100 text-emerald-600',edge:'#34D399' },
  pink:    { ring:'ring-pink-400',    glow:'shadow-[0_0_20px_rgba(244,114,182,0.5)]',   dot:'bg-pink-500',    badge:'bg-pink-100 text-pink-700',     h:'from-pink-50',    ic:'bg-pink-100 text-pink-600',    edge:'#F472B6' },
  orange:  { ring:'ring-orange-400',  glow:'shadow-[0_0_20px_rgba(251,146,60,0.5)]',    dot:'bg-orange-500',  badge:'bg-orange-100 text-orange-700',  h:'from-orange-50',  ic:'bg-orange-100 text-orange-600', edge:'#FB923C' },
  violet:  { ring:'ring-violet-400',  glow:'shadow-[0_0_20px_rgba(167,139,250,0.5)]',   dot:'bg-violet-500',  badge:'bg-violet-100 text-violet-700',  h:'from-violet-50',  ic:'bg-violet-100 text-violet-600', edge:'#A78BFA' },
  purple:  { ring:'ring-purple-400',  glow:'shadow-[0_0_20px_rgba(192,132,252,0.5)]',   dot:'bg-purple-500',  badge:'bg-purple-100 text-purple-700',  h:'from-purple-50',  ic:'bg-purple-100 text-purple-600', edge:'#C084FC' },
  slate:   { ring:'ring-slate-400',   glow:'shadow-[0_0_20px_rgba(148,163,184,0.5)]',   dot:'bg-slate-500',   badge:'bg-slate-100 text-slate-700',    h:'from-slate-50',   ic:'bg-slate-100 text-slate-600',   edge:'#94A3B8' },
  amber:   { ring:'ring-amber-400',   glow:'shadow-[0_0_20px_rgba(251,191,36,0.5)]',    dot:'bg-amber-500',   badge:'bg-amber-100 text-amber-700',    h:'from-amber-50',   ic:'bg-amber-100 text-amber-600',   edge:'#FBBF24' },
  red:     { ring:'ring-red-400',     glow:'shadow-[0_0_20px_rgba(248,113,113,0.5)]',   dot:'bg-red-500',     badge:'bg-red-100 text-red-700',       h:'from-red-50',     ic:'bg-red-100 text-red-600',      edge:'#F87171' },
  gray:    { ring:'ring-gray-400',    glow:'shadow-[0_0_20px_rgba(156,163,175,0.5)]',   dot:'bg-gray-500',    badge:'bg-gray-100 text-gray-700',     h:'from-gray-50',    ic:'bg-gray-100 text-gray-600',    edge:'#9CA3AF' },
};

const ALL_COLORS = Object.keys(C);

// ─── Agent Config Modal ──────────────────────────────────────────────────────
function AgentModal({ agent, edges, onClose, onUpdateAgent, agentStream, agentLogs, activeAgents, completedAgents }: any) {
  const [tab, setTab]           = useState<'info'|'output'|'logs'>('info');
  const [configMode, setConfigMode] = useState<'model'|'prompt'|null>(null);
  const [selectedModel, setSelectedModel] = useState('');
  const [promptContent, setPromptContent] = useState('');
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saveMsg, setSaveMsg]   = useState('');
  const outputRef = useRef<HTMLDivElement>(null);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ label: agent.label, role: agent.role });

  const c = C[agent.color] || C.gray;
  const isActive = activeAgents.has(agent.key);
  const isDone   = completedAgents.has(agent.key);

  const receivesFrom = edges.filter((e:any) => e.to === agent.key).map((e:any) => e.from);
  const outputsTo    = edges.filter((e:any) => e.from === agent.key).map((e:any) => e.to);

  // Load config when modal opens
  useEffect(() => {
    fetch('http://localhost:1110/agent-config')
      .then(r=>r.json())
      .then(cfg => setSelectedModel(cfg[agent.key]?.model || 'ServiceNow-AI/Apriel-1.6-15b-Thinker'))
      .catch(()=>{});
  }, [agent.key]);

  // Load prompt when configMode switches to prompt
  useEffect(() => {
    if (configMode !== 'prompt' || promptContent) return;
    setLoadingPrompt(true);
    fetch(`http://localhost:1110/agent-prompt/${agent.key}`)
      .then(r=>r.json())
      .then(d => setPromptContent(d.content || ''))
      .catch(()=>setPromptContent('⚠️ Could not reach backend.\n\nMake sure the Node server is running:\n  cd backend && node server.js'))
      .finally(()=>setLoadingPrompt(false));
  }, [configMode, agent.key]);

  // Auto-scroll output
  useEffect(() => {
    if (tab === 'output' && outputRef.current && !configMode) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [agentStream, tab, configMode]);

  const saveConfig = async () => {
    setSaving(true);
    await fetch(`http://localhost:1110/agent-config/${agent.key}`, {
      method: 'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model: selectedModel })
    });
    setSaving(false); setSaveMsg('Model saved ✓');
    setTimeout(()=>setSaveMsg(''), 2000);
  };

  const savePrompt = async () => {
    setSaving(true);
    await fetch(`http://localhost:1110/agent-prompt/${agent.key}`, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ content: promptContent })
    });
    setSaving(false); setSaveMsg('Prompt saved ✓');
    setTimeout(()=>setSaveMsg(''), 2000);
  };

  const TABS = [
    { id:'info',    label:'ℹ️ Info' },
    { id:'output',  label:'📄 Output' },
    { id:'logs',    label:'📡 Logs'   },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"/>

      {/* Modal */}
      <div className="relative bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-white/60 overflow-hidden"
        onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div className={`px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-b ${c.h} to-transparent`}>
          <div className="flex items-center gap-3">
            <span className={`text-2xl w-10 h-10 flex items-center justify-center rounded-2xl shadow-sm ${c.ic}`}>{agent.icon}</span>
            <div>
              <h2 className="font-bold text-gray-900 text-lg">{agent.label}</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{agent.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isActive && <span className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full animate-pulse ${c.badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`}/> Thinking
            </span>}
            {isDone && !isActive && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full ring-1 ring-emerald-200">✓ Done</span>}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">✕</button>
          </div>
        </div>

        {/* Tabs (Hide when in configMode) */}
        {!configMode && (
          <div className="flex border-b border-gray-100 px-6 bg-white/60">
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id as any)}
                className={`px-4 py-3 text-xs font-bold transition-all border-b-2 -mb-px ${tab===t.id ? `border-blue-500 text-blue-600` : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-6 relative">

          {/* ── Settings Header (Only in configMode) ── */}
          {configMode && (
            <div className="mb-4 flex gap-2 border-b border-gray-100 pb-4">
              <button onClick={()=>setConfigMode('model')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${configMode==='model'?'bg-blue-50 text-blue-600 ring-1 ring-blue-200':'text-gray-500 hover:bg-gray-50'}`}>⚙️ Switch Model</button>
              <button onClick={()=>setConfigMode('prompt')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${configMode==='prompt'?'bg-blue-50 text-blue-600 ring-1 ring-blue-200':'text-gray-500 hover:bg-gray-50'}`}>📝 Edit Prompt</button>
            </div>
          )}

          {/* ── Main Tab: Info ── */}
          {!configMode && tab==='info' && (
            <div className="flex flex-col gap-6">
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Agent Identity</h3>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm ${c.ic}`}>
                      {agent.icon}
                    </div>
                    <div className="flex-1">
                      {isEditingProfile ? (
                        <div className="space-y-2 mb-3">
                          <input type="text" value={profileForm.label} onChange={e=>setProfileForm(p=>({...p, label:e.target.value}))} className="w-full text-lg font-bold bg-white border border-gray-200 rounded-lg px-3 py-1 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Agent Name" />
                          <input type="text" value={profileForm.role} onChange={e=>setProfileForm(p=>({...p, role:e.target.value}))} className="w-full text-sm font-bold bg-white border border-gray-200 rounded-lg px-3 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Agent Role" />
                          <div className="flex gap-2 mt-2">
                            <button onClick={()=>{
                              onUpdateAgent(agent.key, profileForm);
                              setIsEditingProfile(false);
                            }} className="text-[10px] font-bold bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700">Save Profile</button>
                            <button onClick={()=>{
                              setProfileForm({ label: agent.label, role: agent.role });
                              setIsEditingProfile(false);
                            }} className="text-[10px] font-bold bg-gray-100 text-gray-600 px-3 py-1.5 rounded-md hover:bg-gray-200">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="group relative">
                          <h4 className="font-bold text-gray-900 text-lg mb-0.5 flex items-center gap-2">
                            {agent.label}
                            <button onClick={()=>setIsEditingProfile(true)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-500 transition-opacity">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                          </h4>
                          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">ID: <strong className="text-gray-900">{agent.key}</strong> • {agent.role}</p>
                          <p className="text-sm text-gray-500 mt-2 leading-relaxed">{agent.desc || `This agent belongs to the ${agent.div.replace('_',' ')} division. It receives inputs from upstream agents and generates specialized strategic reports.`}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pipeline I/O Context */}
                <div className="mt-5 grid grid-cols-2 gap-4 border-t border-gray-200/60 pt-5">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">📥 Receives Input From</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {receivesFrom.length > 0 
                        ? receivesFrom.map((k: string) => <span key={k} className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-lg shadow-sm">{k}</span>) 
                        : <span className="text-xs font-medium text-gray-500 bg-white border border-gray-200 px-2.5 py-1 rounded-lg">Founder (Instruction)</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">📤 Passes Output To</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {outputsTo.length > 0 
                        ? outputsTo.map((k: string) => <span key={k} className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg shadow-sm">{k}</span>) 
                        : <span className="text-xs font-medium text-gray-500 bg-white border border-gray-200 px-2.5 py-1 rounded-lg">None (Final Output)</span>}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100/50">
                <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-3">Live Status</h3>
                {isActive ? (
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"/><span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"/></span>
                    <span className="text-sm font-semibold text-blue-800">Agent is currently computing...</span>
                  </div>
                ) : isDone ? (
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-emerald-500"/>
                    <span className="text-sm font-semibold text-emerald-800">Task completed successfully. Check the Output tab.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-gray-300"/>
                    <span className="text-sm font-medium text-gray-500">Idle. Waiting for pipeline launch.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Main Tab: Output ── */}
          {!configMode && tab==='output' && (
            <div>
              {agentStream
                ? <div ref={outputRef} className="prose prose-sm max-w-none text-gray-700 markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{agentStream}</ReactMarkdown>
                    {isActive && <span className={`inline-block w-2 h-4 ml-1 align-middle rounded-sm animate-pulse ${c.dot}`}/>}
                  </div>
                : <div className="h-40 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl mb-3 opacity-20">{agent.icon}</span>
                    <p className="text-gray-400 italic text-sm">No output yet.</p>
                  </div>
              }
            </div>
          )}

          {/* ── Main Tab: Logs ── */}
          {!configMode && tab==='logs' && (
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 font-mono text-[11px] space-y-1.5 max-h-[50vh] overflow-y-auto shadow-inner">
              {agentLogs.length > 0
                ? agentLogs.map((l: any, i: number)=>(
                    <div key={i} className={`leading-relaxed ${/error/i.test(l.agent)?'text-red-500':'text-gray-500'}`}>
                      <span className="font-bold text-blue-500">[{l.agent}]</span> {l.msg}
                    </div>
                  ))
                : <div className="text-gray-400 text-center py-4">No logs for this agent yet.</div>
              }
            </div>
          )}

          {/* ── Config: Model Selection ── */}
          {configMode==='model' && (
            <div className="flex flex-col gap-4">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden">Select Model</label>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {TOGETHER_MODELS.map(m=>(
                  <label key={m.id}
                    className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${selectedModel===m.id ? `border-blue-300 bg-blue-50/60 ring-1 ring-blue-300` : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                    <input type="radio" name="model" value={m.id} checked={selectedModel===m.id}
                      onChange={()=>setSelectedModel(m.id)} className="hidden"/>
                    <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selectedModel===m.id?'border-blue-500':'border-gray-300'}`}>
                      {selectedModel===m.id && <span className="w-2 h-2 rounded-full bg-blue-500"/>}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-gray-900 truncate">{m.label}</span>
                        <span className="text-[10px] font-medium bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded flex items-center gap-1"><span title={m.cat}>{m.catIcon}</span> {m.cat}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{m.author}</div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0 ${m.price.includes('Free')?'bg-emerald-100 text-emerald-700':'bg-gray-100 text-gray-500'}`}>
                      {m.price}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ── Config: Prompt Editor ── */}
          {configMode==='prompt' && (
            <div className="flex flex-col gap-3 h-full">
              {loadingPrompt
                ? <div className="text-sm text-gray-400">Loading…</div>
                : <textarea value={promptContent} onChange={e=>setPromptContent(e.target.value)}
                    className="flex-1 w-full min-h-[400px] bg-gray-50 border border-gray-200 rounded-2xl p-4 font-mono text-xs text-gray-700 outline-none focus:ring-2 focus:ring-blue-300 resize-y leading-relaxed"
                    spellCheck={false}/>
              }
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-white/60">
          <div className="flex items-center gap-3">
            {!configMode ? (
              <button onClick={()=>setConfigMode('model')} title="Configure Agent Options"
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-white hover:shadow-sm transition-all focus:ring-2 focus:ring-blue-200">
                ⚙️
              </button>
            ) : (
              <button onClick={()=>setConfigMode(null)} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600">← Back to Info</button>
            )}
            <div className="text-xs font-semibold text-emerald-600 ml-2">{saveMsg}</div>
          </div>
          
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 transition-colors">Close</button>
            {configMode==='model' && (
              <button onClick={saveConfig} disabled={saving}
                className="px-5 py-2 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50 hover:-translate-y-0.5 transition-all">
                {saving ? 'Saving…' : 'Save Model'}
              </button>
            )}
            {configMode==='prompt' && (
              <button onClick={savePrompt} disabled={saving||loadingPrompt}
                className="px-5 py-2 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50 hover:-translate-y-0.5 transition-all">
                {saving ? 'Saving…' : 'Save Prompt'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Instruction Editor Modal ────────────────────────────────────────────────────
const INSTRUCTION_TEMPLATES = {
  t1: { 
    title: "Elite Biohacking Clinic", 
    content: "INSTRUCTION: We are launching a $100M Hyper-Luxury Biohacking & Longevity Clinic in Geneva targeting UHNWI clients (net worth >$50M). The facility offers radical life extension, personalized genomics, and blood-washing therapies. The CEO must devise a master plan for acquisition of high-profile clientele without marketing. CPO must design the medical and lifestyle architecture. CFO must model a $500k/year membership tier. CMO must secure absolute privacy and exclusivity. COO must architect the operational logistics for transporting biological materials globally." 
  },
  t2: { 
    title: "Generational Wealth Fund", 
    content: "INSTRUCTION: We are creating a hyper-exclusive Generational Wealth & Dynasty Management Fund. Minimum buy-in is $1B. The goal is asset protection across multiple jurisdictions, geopolitical hedging, and aggressive tax arbitrage. CEO: Outline the 100-year dynasty plan. CFO: Model the legal tax evasion (arbitrage) structures and geopolitical risk parity portfolio. CLO: Review the Cayman/Swiss sanctuary laws. CMO: Design the discreet onboarding process for royal families and tech billionaires." 
  },
  t3: { 
    title: "Billionaire Private Club", 
    content: "INSTRUCTION: Developing a subterranean Private Club and Doomsday Bunker in New Zealand for the top 0.001%. It functions as an ultra-luxury resort during peacetime and an impenetrable fortress during societal collapse. CEO: Define the ultimate survival-luxury paradigm. CPO: Architect the sovereign infrastructure (power, water, hydroponics) blending with 5-star aesthetics. COO: Map out the 24/7 private security and aviation logistics. CMO: Sell the concept stealthily via whisper networks." 
  },
  t4: { 
    title: "UHNWI Concierge Service", 
    content: "INSTRUCTION: Launching a 'God-Mode' Concierge Service. We acquire anything, anytime, anywhere for the world's elite—from restricted art pieces to private island buyouts. CEO: Set the framework for unlimited operational capability. COO: Architect the 'Fixer' network spanning 50 countries with zero points of failure. CFO: Model infinite-spend credit underwriting. CMO: Position the brand as the invisible hand of the elite." 
  },
  t5: { 
    title: "Space Tourism Syndicate", 
    content: "INSTRUCTION: Forming a syndicate to monopolize ultra-luxury Low Earth Orbit (LEO) tourism and lunar land speculation. CEO: Mastermind the transition of luxury from Earth to Orbit. CPO: Design the zero-gravity ultra-luxury orbital habitats. CFO: Structure the massive capital expenditures and sovereign wealth funding. CLO: Navigate the unregulated void of space law and ownership. CMO: Target the ego of the world's wealthiest individuals to be the first orbital landowners." 
  }
};

function InstructionModal({ activeInstruction, onClose, onSaved }: any) {
  const [tab, setTab] = useState<'t1'|'t2'|'t3'|'t4'|'t5'|'custom'>(activeInstruction ? 'custom' : 't1');
  const [content, setContent] = useState('');
  const [filename, setFilename] = useState(activeInstruction || 'draft_instruction.md');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (tab === 'custom' && activeInstruction && !loaded) {
      fetch(`http://localhost:1110/instruction/${activeInstruction}`)
        .then(r=>r.json()).then(d=>{ if(d.content) setContent(d.content); setLoaded(true); }).catch(()=>{});
    } else if (tab !== 'custom') {
      setContent(INSTRUCTION_TEMPLATES[tab].content);
      setFilename(`template_${tab}.md`);
    }
  }, [tab, activeInstruction, loaded]);

  const handleSave = async () => {
    if (!filename.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('http://localhost:1110/save-instruction', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, content })
      });
      const d = await res.json();
      if (d.filename) {
        onSaved(d.filename);
        onClose();
      }
    } catch {}
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-md"/>
      <div className="relative bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col border border-white/60 overflow-hidden" onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Instruction Editor</h2>
            <p className="text-xs text-gray-500 font-medium">Draft or select a instruction to drive the CEO</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 transition-colors text-gray-500 hover:text-gray-900">✕</button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Left Sidebar: Templates */}
          <div className="w-56 bg-gray-50/50 border-r border-gray-100 p-4 flex flex-col gap-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-2">Templates</p>
            {(Object.keys(INSTRUCTION_TEMPLATES) as Array<keyof typeof INSTRUCTION_TEMPLATES>).map(k => (
              <button key={k} onClick={()=>{setTab(k); setLoaded(false);}}
                className={`text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${tab===k?'bg-white shadow-sm text-blue-600 border border-blue-100':'text-gray-600 hover:bg-gray-100 border border-transparent'}`}>
                {INSTRUCTION_TEMPLATES[k].title}
              </button>
            ))}
            <div className="w-full h-px bg-gray-200 my-2"/>
            <button onClick={()=>setTab('custom')}
              className={`text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${tab==='custom'?'bg-white shadow-sm text-indigo-600 border border-indigo-100':'text-gray-600 hover:bg-gray-100 border border-transparent'}`}>
              ✏️ Write your own
            </button>
          </div>

          {/* Right Area: Editor */}
          <div className="flex-1 flex flex-col p-6 bg-white min-w-0">
            <div className="flex items-center gap-3 mb-4">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Instruction Name:</label>
              <input type="text" value={filename} onChange={e=>setFilename(e.target.value)} 
                className="flex-1 max-w-sm px-3 py-1.5 text-sm font-mono bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 ring-blue-500/20 focus:border-blue-400 text-gray-800"
                placeholder="project_name.md" />
            </div>
            <textarea value={content} onChange={e=>setContent(e.target.value)}
              className="flex-1 w-full bg-gray-50 rounded-2xl border border-gray-200 p-4 font-mono text-sm text-gray-800 leading-relaxed outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none shadow-inner"
              placeholder="Write your instruction here..." />

            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
              <button onClick={onClose} className="px-5 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all">Cancel</button>
              <button onClick={handleSave} disabled={saving||!content.trim()}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition-all disabled:opacity-50">
                {saving ? 'Saving...' : '💾 Save & Select Instruction'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Final Report Modal ────────────────────────────────────────────────────────
function FinalReportModal({ report, onClose }: { report: {fileName:string, content:string}, onClose: ()=>void }) {
  const handleDownload = () => {
    const blob = new Blob([report.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = report.fileName;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" style={{backgroundColor:'var(--bg-black, rgba(0,0,0,0.6))', backdropFilter:'blur(8px)'}}>
      <div className="bg-white w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-3">
            <span className="text-2xl w-10 h-10 flex items-center justify-center rounded-2xl shadow-sm bg-emerald-100 text-emerald-600">👑</span>
            <div>
              <h2 className="font-bold text-gray-900 text-lg">Final Executive Report</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{report.fileName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleDownload} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-colors">
              ⬇️ Download PDF/MD
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 transition-colors text-gray-500 hover:text-gray-900">✕</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-10 bg-[#FAF9F6]">
          <div className="max-w-3xl mx-auto bg-white p-12 rounded-xl shadow-sm border border-gray-100 prose prose-sm max-w-none text-gray-800 markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [agents, setAgents] = useState<any[]>(INITIAL_AGENTS);
  const [edges, setEdges] = useState<any[]>(INITIAL_EDGES);

  const agentMap = Object.fromEntries(agents.map(a=>[a.key,a]));
  const ALL_KEYS = agents.map(a=>a.key);
  
  const [expandedDivs, setExpandedDivs] = useState<Record<string,boolean>>({ company: true, inner_circle: true, shield: true, market: true });
  const [removeCandidate, setRemoveCandidate] = useState<any>(null);
  const [addModalDiv, setAddModalDiv] = useState<string|null>(null);
  const [newAgentForm, setNewAgentForm] = useState({ key:'', label:'', role:'', icon:'🤖', color:'gray' });

  const handleUpdateAgent = (key: string, updates: any) => {
    setAgents(prev => prev.map(a => a.key === key ? { ...a, ...updates } : a));
  };

  const handleHireEmployee = () => {
    if(!newAgentForm.key || !newAgentForm.label) return;
    const newAgent = { ...newAgentForm, div: addModalDiv, x: 825, y: Math.random()*200+300, desc: "Newly hired." };
    setAgents(p => [...p, newAgent]);
    setPositions(p => ({...p, [newAgent.key]: {x: newAgent.x, y: newAgent.y}}));
    setAddModalDiv(null);
    setNewAgentForm({ key:'', label:'', role:'', icon:'🤖', color:'gray' });
  };

  const handleFireEmployee = () => {
    if(!removeCandidate) return;
    setAgents(p => p.filter(a => a.key !== removeCandidate.key));
    setEdges(p => p.filter(e => e.from !== removeCandidate.key && e.to !== removeCandidate.key));
    setRemoveCandidate(null);
  };

  const [socket, setSocket] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const [instructions, setInstructions] = useState<string[]>([]);
  const [activeInstruction, setActiveInstruction] = useState('');
  
  const [pipelineState, setPipelineState] = useState<'idle'|'running'|'done'|'stopped'>('idle');
  const [pipelinePhase, setPipelinePhase] = useState<{phase:number, total:number, label:string}|null>(null);
  const [activeAgents, setActiveAgents]   = useState<Set<string>>(new Set());
  const [completedAgents, setCompletedAgents] = useState<Set<string>>(new Set());
  const [agentStreams, setAgentStreams]   = useState<Record<string,string>>({});
  
  const [logs, setLogs] = useState<{agent:string, msg:string}[]>([]);
  const [uploading, setUploading] = useState(false);
  const [reportCount, setReportCount] = useState(0);

  const [modalAgent, setModalAgent] = useState<string|null>(null);
  const [instructionModalOpen, setInstructionModalOpen] = useState(false);
  const [finalReport, setFinalReport] = useState<{fileName:string, content:string}|null>(null);
  const [finalReportModalOpen, setFinalReportModalOpen] = useState(false);
  const [dismissedTip, setDismissedTip] = useState<string|null>(null);
  
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  
  // Draggable nodes state
  const [positions, setPositions] = useState<Record<string, {x:number, y:number}>>(
    Object.fromEntries(INITIAL_AGENTS.map(a => [a.key, { x: a.x, y: a.y }]))
  );
  const [draggingNode, setDraggingNode] = useState<string|null>(null);
  const [dragOffset, setDragOffset] = useState({x:0, y:0});
  const dragOrigin = useRef({x:0, y:0});

  const logsRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{ if(logsRef.current) logsRef.current.scrollTop=logsRef.current.scrollHeight; },[logs]);

  useEffect(()=>{
    const s = io('http://localhost:1110');
    setSocket(s);
    s.on('connect',    ()=>{ setIsConnected(true); s.emit('get_instructions'); });
    s.on('disconnect', ()=>setIsConnected(false));
    s.on('instructions_list',(data:string[])=>{ setInstructions(data); if(data.length>0) setActiveInstruction(data[0]); });
    s.on('agent_log',  (d:{agent:string,msg:string})=>setLogs(p=>[...p,d]));
    s.on('pipeline_phase',(d:any)=>{ setPipelinePhase(d); setPipelineState('running'); });
    s.on('agent_active',(d:{agent:string,active:boolean})=>{
      setActiveAgents(prev=>{
        const next=new Set(prev);
        if(d.active){ setAgentStreams(p=>({...p,[d.agent]:''})); next.add(d.agent); }
        else{ next.delete(d.agent); setCompletedAgents(p=>new Set([...p,d.agent])); }
        return next;
      });
    });
    s.on('agent_stream',(d:{agent:string,chunk:string})=>
      setAgentStreams(p=>({...p,[d.agent]:p[d.agent]+d.chunk})));
    s.on('pipeline_complete',(d:any)=>{
      setActiveAgents(new Set());
      setReportCount(d.reportCount||0);
      setPipelineState(d.phase==='error'?'idle':d.phase==='stopped'?'stopped':'done');
      if (d.finalReportContent) {
        setFinalReport({ fileName: d.finalReport, content: d.finalReportContent });
      }
    });
    return ()=>{ s.close(); };
  },[]);

  const launchPipeline = () => {
    if(!socket || !activeInstruction) return; // Re-added socket check for safety
    setFinalReport(null);
    setCompletedAgents(new Set()); setActiveAgents(new Set());
    setAgentStreams(Object.fromEntries(ALL_KEYS.map((k: string)=>[k,'']))); setLogs([]);
    setPipelinePhase(null); setPipelineState('running'); setReportCount(0);
    socket.emit('trigger_pipeline',{instruction:activeInstruction, activeAgentKeys: agents.map(a=>a.key)});
  };

  const stopPipeline = ()=>{
    if(!socket) return;
    socket.emit('stop_pipeline');
    setPipelineState('stopped');
  };

  const handleUpload = async(e:React.ChangeEvent<HTMLInputElement>)=>{
    if(!e.target.files?.length) return;
    setUploading(true);
    const form=new FormData(); form.append('instruction',e.target.files[0]);
    try{
      const res=await fetch('http://localhost:1110/upload',{method:'POST',body:form});
      const d=await res.json();
      if(d.filename&&socket){ socket.emit('get_instructions'); setActiveInstruction(d.filename); }
    }catch{}
    setUploading(false); e.target.value='';
  };

  const bezier = (fromKey: string, toKey: string) => {
    const from = positions[fromKey], to = positions[toKey];
    if (!from || !to) return '';
    const x1=from.x+NODE_W/2, y1=from.y+NODE_H;
    const x2=to.x+NODE_W/2,   y2=to.y - 8;
    const cy=(y1+y2)/2;
    return `M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`;
  };

  // Node drag handlers
  const handlePointerDown = (e: React.PointerEvent, key: string) => {
    if (e.target instanceof Element && e.target.closest('button')) return; // Ignore if clicking a button
    setDraggingNode(key);
    dragOrigin.current = { x: e.clientX, y: e.clientY };
    const p = positions[key];
    setDragOffset({ x: e.clientX - p.x, y: e.clientY - p.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingNode) return;
    setPositions(prev => ({
      ...prev,
      [draggingNode]: {
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      }
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingNode) {
      setDraggingNode(null);
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const modalDef = modalAgent ? agentMap[modalAgent] : null;
  const agentLogs = modalAgent ? logs.filter(l=>l.agent===modalAgent) : [];

  let contextualTip = null;
  if (!activeInstruction) {
    contextualTip = "Select or write a new Instruction to begin building the Master Plan.";
  } else if (pipelineState === 'idle') {
    contextualTip = "Click the 'Launch' button in the top bar to run the system. The CEO will read your instruction and orchestrate the C-Suite.";
  } else if (pipelineState === 'running') {
    contextualTip = "The pipeline is live. Watch the Live Activity sidebar on the right to monitor the agents.";
  } else if (pipelineState === 'done' && finalReport) {
    contextualTip = "Execution complete! Click 'View Final Report' in the top bar to read the CEO's definitive verdict.";
  }
  const showTip = contextualTip && dismissedTip !== contextualTip;

  return (
    <div className="min-h-screen bg-[#f5f5f7] font-sans overflow-hidden">
      {modalDef && (
        <AgentModal agent={modalDef} onClose={()=>setModalAgent(null)}
          edges={edges}
          onUpdateAgent={handleUpdateAgent}
          agentStream={agentStreams[modalDef.key] || ''}
          agentLogs={agentLogs}
          activeAgents={activeAgents}
          completedAgents={completedAgents}
        />
      )}

      {/* ── Hire Executive Modal ── */}
      {addModalDiv && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200" onPointerDown={e=>e.stopPropagation()}>
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 max-w-sm w-full animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-gray-900 mb-1">Hire New Executive</h3>
            <p className="text-xs text-gray-500 mb-6">Assigning to division: <span className="font-bold text-indigo-600 uppercase">{addModalDiv.replace('_', ' ')}</span></p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Agent Key (ID)</label>
                <input type="text" value={newAgentForm.key} onChange={e=>setNewAgentForm(p=>({...p, key:e.target.value}))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. CTO" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Full Label / Name</label>
                <input type="text" value={newAgentForm.label} onChange={e=>setNewAgentForm(p=>({...p, label:e.target.value}))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Chief Tech Officer" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Role / Focus</label>
                  <input type="text" value={newAgentForm.role} onChange={e=>setNewAgentForm(p=>({...p, role:e.target.value}))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Server Scaling" />
                </div>
                <div className="w-16">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Icon</label>
                  <input type="text" value={newAgentForm.icon} onChange={e=>setNewAgentForm(p=>({...p, icon:e.target.value}))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-2.5 text-center text-lg font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={()=>setAddModalDiv(null)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl text-xs transition-colors">Cancel</button>
              <button onClick={handleHireEmployee} disabled={!newAgentForm.key || !newAgentForm.label} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-lg disabled:opacity-50">Hire Employee</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Terminate Employee Modal ── */}
      {removeCandidate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-red-900/30 backdrop-blur-sm animate-in fade-in duration-200" onPointerDown={e=>e.stopPropagation()}>
          <div className="bg-white rounded-3xl shadow-2xl border border-red-100 p-8 max-w-sm w-full animate-in zoom-in-95 duration-200 text-center">
            <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4 ${C[removeCandidate.color]?.ic || C.gray.ic}`}>
              {removeCandidate.icon}
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Terminate {removeCandidate.label}?</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-8">
              Are you sure you want to fire <span className="font-bold text-gray-800">{removeCandidate.key}</span> from the <span className="uppercase font-bold text-gray-800">{removeCandidate.div.replace('_', ' ')}</span> division? This will instantly sever all intelligence links and remove them from the canvas.
            </p>
            
            <div className="flex gap-3">
              <button onClick={()=>setRemoveCandidate(null)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl text-xs transition-colors">Cancel</button>
              <button onClick={handleFireEmployee} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-xs transition-colors shadow-lg shadow-red-500/30">Yes, Fire Them</button>
            </div>
          </div>
        </div>
      )}

      {instructionModalOpen && (
        <InstructionModal 
          activeInstruction={activeInstruction} 
          onClose={()=>setInstructionModalOpen(false)}
          onSaved={(fname: string) => {
            if (socket) { socket.emit('get_instructions'); setTimeout(()=>setActiveInstruction(fname), 300); }
          }} 
        />
      )}

      {finalReportModalOpen && finalReport && (
        <FinalReportModal report={finalReport} onClose={()=>setFinalReportModalOpen(false)} />
      )}

      {/* Blobs */}
      <div className="fixed top-[-15%] left-[-10%]  w-[600px] h-[600px] bg-blue-200  rounded-full mix-blend-multiply filter blur-[130px] opacity-40 animate-blob pointer-events-none z-0"/>
      <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-200 rounded-full mix-blend-multiply filter blur-[120px] opacity-35 animate-blob animation-delay-2000 pointer-events-none z-0"/>
      <div className="fixed bottom-[-10%] left-[25%] w-[600px] h-[600px] bg-pink-100  rounded-full mix-blend-multiply filter blur-[150px] opacity-25 animate-blob animation-delay-4000 pointer-events-none z-0"/>

      {/* ── Top Navigation Bar ── */}
      <nav className="fixed top-0 left-0 right-0 h-16 border-b border-gray-200 bg-white/90 backdrop-blur-md z-50 shadow-sm px-6 flex items-center justify-between">
         {/* Brand */}
         <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 shadow-inner flex items-center justify-center text-white font-bold text-lg">U</div>
            <h1 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 tracking-tight hidden sm:block">UHNWI+ idea checker</h1>
            <div className="flex items-center gap-1.5 bg-white/90 px-2 py-1 rounded-md border border-gray-100 shadow-sm ml-2 sm:ml-4">
                <span className="relative flex h-1.5 w-1.5">
                  {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"/>}
                  <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isConnected?'bg-green-500':'bg-red-400'}`}/>
                </span>
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest hidden xl:block">{isConnected?'Live':'Offline'}</span>
            </div>
         </div>

         {/* Controls */}
         <div className="flex items-center gap-4">
             {/* Phase Progress */}
             <div className="mr-4 hidden xl:block">
               {pipelineState==='idle' && <p className="text-xs text-gray-400 font-medium">Ready — select an instruction and launch.</p>}
               {pipelineState==='running' && pipelinePhase && (
                 <div className="flex items-center gap-3">
                   <span className="text-xs font-semibold text-gray-600">{pipelinePhase.label}</span>
                   <div className="flex items-center gap-1">
                     {Array.from({length:pipelinePhase.total},(_,i)=>(
                       <div key={i} className={`h-1.5 w-6 rounded-full transition-all ${i<pipelinePhase.phase ? 'bg-blue-500' : i===pipelinePhase.phase-1 ? 'bg-blue-400 animate-pulse' : 'bg-gray-200'}`}/>
                     ))}
                   </div>
                 </div>
               )}
               {pipelineState==='done' && <span className="text-emerald-500 font-bold text-xs flex items-center gap-2">✓ {reportCount} reports filed</span>}
             </div>

             <div className="w-px h-6 bg-gray-200 flex-shrink-0 hidden xl:block"/>

             <button onClick={()=>setInstructionModalOpen(true)}
               className="px-4 py-2 bg-gray-50 border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold transition-all shadow-sm">
               ✏️ Type Instruction
             </button>

             <div className="flex items-center gap-2 flex-shrink-0">
               <div className="relative">
                 <select value={activeInstruction} onChange={e=>setActiveInstruction(e.target.value)}
                   className="bg-white border border-gray-200 text-gray-700 rounded-xl pl-3 pr-7 py-2 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-300 appearance-none shadow-sm max-w-[160px] truncate">
                   {instructions.length>0?instructions.map((m,i)=><option key={i}>{m}</option>):<option>No instructions</option>}
                 </select>
                 <span className="absolute inset-y-0 right-2 flex items-center text-gray-400 pointer-events-none text-[10px]">▾</span>
               </div>
               <label className={`cursor-pointer px-3 py-2 rounded-xl border border-gray-200 text-[11px] font-bold text-gray-500 hover:border-blue-300 transition-colors bg-white shadow-sm ${uploading?'opacity-50':''}`}>
                 <input type="file" accept=".md,.txt" className="hidden" onChange={handleUpload} disabled={uploading}/>
                 {uploading?'⏳':'📎'}
               </label>
             </div>

             {pipelineState==='running' && (
               <button onClick={stopPipeline} className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 rounded-xl text-xs font-bold shadow-sm">⛔ Stop</button>
             )}
             
             <button onClick={launchPipeline} disabled={!isConnected||pipelineState==='running'||!activeInstruction}
               className="px-6 py-2 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 text-white rounded-xl shadow-md disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold flex items-center gap-2 transition-all">
               {pipelineState==='running' ? <span className="animate-spin">⟳</span> : '▶'}
               {pipelineState==='done'||pipelineState==='stopped' ? 'Run Again' : 'Launch'}
             </button>

             {finalReport && pipelineState==='done' && (
               <button onClick={()=>setFinalReportModalOpen(true)} className="px-5 py-2 bg-emerald-50 border border-emerald-200 hover:border-emerald-300 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in slide-in-from-right-4 relative group">
                 <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"/></span>
                 📄 View Final Report
               </button>
             )}
         </div>
      </nav>

      {/* ── Left Toggle Button (Slim) ── */}
      <button onClick={()=>setIsLeftPanelOpen(!isLeftPanelOpen)} 
        className={`fixed top-1/2 -translate-y-1/2 z-[45] flex items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] bg-white/60 hover:bg-white backdrop-blur-xl border border-gray-200 shadow-sm touch-none rounded-r-xl border-l-0 isolate overflow-hidden group ${isLeftPanelOpen ? 'left-72 w-5 h-20' : 'left-0 w-3 hover:w-5 h-24'}`}>
        <div className={`w-0.5 h-8 bg-gray-400 rounded-full transition-all group-hover:bg-blue-400 ${isLeftPanelOpen ? 'bg-blue-300' : ''}`} />
      </button>

      {/* ── Left Sidebar (Company Hierarchy) ── */}
      <aside className={`fixed top-16 left-0 bottom-0 w-72 bg-white/90 backdrop-blur-2xl border-r border-white/60 shadow-2xl flex flex-col z-40 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isLeftPanelOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-14 border-b border-gray-100 flex items-center px-5 bg-gray-50/50">
          <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            🏛️ Hierarchy
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
          {['company', 'inner_circle', 'shield', 'market'].map(divKey => {
            const divAgents = agents.filter(a => a.div === divKey);
            const divNames = { company:'C-Suite', inner_circle:'Inner Circle', shield:'The Shield', market:'The Market' };
            const isExpanded = expandedDivs[divKey];
            return (
              <div key={divKey}>
                <div className="flex items-center justify-between group cursor-pointer mb-1 border-b border-gray-100 pb-1" onClick={() => setExpandedDivs(p => ({...p, [divKey]: !p[divKey]}))}>
                   <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{divNames[divKey as keyof typeof divNames]}</h3>
                   <div className="flex items-center gap-1">
                     <button onClick={(e) => { e.stopPropagation(); setAddModalDiv(divKey); }} className="text-gray-400 hover:text-blue-500 hover:bg-white rounded px-2 text-lg leading-none transition-colors">+</button>
                     <span className="text-gray-300 text-[10px] w-4 text-center">{isExpanded ? '▼' : '▶'}</span>
                   </div>
                </div>
                {isExpanded && (
                  <div className="mt-2 ml-2 border-l border-gray-200 pl-3 space-y-1">
                    {divAgents.length === 0 && <span className="text-[10px] text-gray-400 italic">No personnel.</span>}
                    {divAgents.map(a => {
                      const isActive = activeAgents.has(a.key);
                      const isDone = completedAgents.has(a.key);
                      return (
                        <div key={a.key} className="relative group flex items-center p-1.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer" onClick={()=>setModalAgent(a.key)}>
                          <div className="absolute -left-3 top-1/2 w-3 border-t border-gray-200" />
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] ${C[a.color]?.ic||C.gray.ic} mr-2`}>{a.icon}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-900 flex items-center gap-1">
                              {a.key} 
                              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"/>}
                              {isDone && !isActive && <span className="text-emerald-500 text-[9px]">✓</span>}
                            </p>
                            <p className="text-[9px] text-gray-400 truncate mt-0.5">{a.role}</p>
                          </div>
                          <button onClick={(e)=>{ e.stopPropagation(); setRemoveCandidate(a); }} className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 hover:bg-red-50 px-2 py-0.5 rounded text-[10px] transition-all font-bold ml-1">
                            FIRE
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── Right Sidebar (Live Activity Logs) ── */}
      <aside className={`fixed top-16 right-0 bottom-0 w-80 bg-white/90 backdrop-blur-2xl border-l border-white/60 shadow-2xl flex flex-col z-40 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isRightPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-14 border-b border-gray-100 flex items-center justify-between px-5 bg-gray-50/50">
          <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            Live Activity
          </h2>
          <button onClick={()=>navigator.clipboard.writeText(logs.map(l=>`[${l.agent}] ${l.msg}`).join('\n'))}
            className="text-[9px] font-bold px-2 py-1 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-blue-500 hover:border-blue-300 transition-colors shadow-sm">
            COPY
          </button>
        </div>
        <div ref={logsRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar font-mono text-[11px] space-y-2">
          {logs.map((l,i)=>(
            <div key={i} className={`leading-relaxed pb-2 border-b border-gray-50 ${/error/i.test(l.agent)?'text-red-500':'text-gray-500'}`}>
              <span className="font-bold text-blue-500">[{l.agent}]</span> {l.msg}
            </div>
          ))}
          {logs.length===0 && <div className="text-gray-400 text-center py-6 text-[11px] italic">No active logs.</div>}
        </div>
      </aside>

      {/* ── Main Canvas ── */}
      <main className="fixed top-16 bottom-0 overflow-auto bg-transparent relative custom-scrollbar p-10 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ left: isLeftPanelOpen ? 288 : 0, right: isRightPanelOpen ? 320 : 0 }}
            onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
        <div className="relative mx-auto my-10" style={{width:CANVAS_W, minHeight:CANVAS_H}}>
          <svg width={CANVAS_W} height={CANVAS_H} className="absolute top-0 left-0 pointer-events-none z-10 overflow-visible">
            <defs>
              <marker id="arrow-default" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#E5E7EB" />
              </marker>
              {Object.entries(C).map(([colorName, cVals]) => (
                <marker key={`arrow-${colorName}`} id={`arrow-${colorName}`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={cVals.edge} />
                </marker>
              ))}
            </defs>
            <style>{`@keyframes dash{to{stroke-dashoffset:-24}}`}</style>
            {edges.map((e, idx)=>{
              const to=agentMap[e.to];
              if(!to) return null;
              const ec=C[to.color] || C.gray;
              const isActive=activeAgents.has(e.to), isDone=completedAgents.has(e.to);
              const isHighlighted = isActive || isDone;
              return <path key={`${e.from}-${e.to}-${idx}`} d={bezier(e.from, e.to)} fill="none"
                stroke={isHighlighted ? ec.edge : '#E5E7EB'}
                strokeWidth={isActive ? 2.5 : 1.5} strokeLinecap="round"
                strokeDasharray={isActive ? "8 4" : undefined}
                markerEnd={`url(#arrow-${isHighlighted ? to.color : 'default'})`}
                style={isActive ? {animation:'dash 0.6s linear infinite'} : {}}/>;
            })}
          </svg>

          <div className="relative z-20" style={{width:CANVAS_W,height:CANVAS_H}}>
            {agents.map(agent=>{
              const ac=C[agent.color] || C.gray;
              const isActive=activeAgents.has(agent.key), isDone=completedAgents.has(agent.key);
              const pos = positions[agent.key];
              if (!pos) return null;
              return (
                <div key={agent.key}
                  onPointerDown={(e) => handlePointerDown(e, agent.key)}
                  onClick={(e)=> {
                    const dist = Math.hypot(e.clientX - dragOrigin.current.x, e.clientY - dragOrigin.current.y);
                    if (dist < 5) setModalAgent(agent.key);
                  }}
                  title="Drag to move, click to configure"
                  className={`absolute cursor-pointer rounded-2xl border bg-white/90 backdrop-blur-sm transition-shadow duration-300 select-none group
                    ${isActive?`ring-2 ${ac.ring} ${ac.glow} border-transparent z-30`:''}
                    ${!isActive?'border-gray-200 hover:border-gray-300 hover:shadow-md':''}
                    shadow-sm
                    ${draggingNode === agent.key ? 'opacity-80 scale-105 z-50 cursor-grabbing' : 'cursor-grab scale-100'}
                  `}
                  style={{left:pos.x, top:pos.y, width:NODE_W, height:NODE_H, transitionProperty: 'box-shadow, transform'}}>
                  <div className={`flex items-center justify-between px-3 pt-2.5 pb-1.5 rounded-t-2xl bg-gradient-to-b ${ac.h} to-transparent pointer-events-none`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm w-6 h-6 flex items-center justify-center rounded-xl ${ac.ic}`}>{agent.icon}</span>
                      <span className="font-bold text-gray-900 text-xs">{agent.label}</span>
                    </div>
                    {isActive && <span className={`h-2 w-2 rounded-full animate-pulse ${ac.dot}`}/>}
                    {isDone && !isActive && <span className="text-emerald-500 text-[10px] font-bold">✓</span>}
                  </div>
                  <div className="px-3 pb-2.5 pointer-events-none">
                    <p className="text-[10px] text-gray-400 font-semibold truncate">{agent.role}</p>
                    {isActive && <div className="mt-1 h-0.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full w-3/5 rounded-full ${ac.dot} opacity-70 animate-pulse`}/>
                    </div>}
                    {isDone && !isActive && <p className="text-[10px] text-emerald-500 font-bold mt-0.5">Done · click to read</p>}
                    {!isActive && !isDone && <p className="text-[10px] text-gray-300 mt-0.5 group-hover:text-gray-400 transition-colors">Drag or click</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* ── Contextual Tips System ── */}
      {showTip && (
         <div className="fixed bottom-8 left-8 z-50 bg-white border border-gray-200 shadow-xl rounded-2xl p-4 flex items-start gap-4 max-w-sm animate-in fade-in slide-in-from-bottom-4">
             <span className="text-2xl drop-shadow-sm">💡</span>
             <div className="flex-1 mt-0.5">
                 <h4 className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1.5">System Tip</h4>
                 <p className="text-xs text-gray-600 leading-relaxed font-medium">{contextualTip}</p>
             </div>
             <button onClick={()=>setDismissedTip(contextualTip)} className="text-gray-400 hover:text-gray-900 transition-colors w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100">✕</button>
         </div>
      )}
    </div>
  );
}
