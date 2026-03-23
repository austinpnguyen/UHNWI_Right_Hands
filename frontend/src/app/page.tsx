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
const AGENTS = [
  { key:'CEO',         label:'CEO',              role:'Master Plan',          icon:'♟️', color:'blue',    div:'company',      x:550,  y:40  },
  { key:'CPO',         label:'CPO',              role:'Architecture',         icon:'🛠️', color:'indigo',  div:'company',      x:100,  y:180 },
  { key:'CFO',         label:'CFO',              role:'Financials',           icon:'📈', color:'emerald', div:'company',      x:400,  y:180 },
  { key:'CMO',         label:'CMO',              role:'Brand Strategy',       icon:'📣', color:'pink',    div:'company',      x:700,  y:180 },
  { key:'COO',         label:'COO',              role:'Operations',           icon:'⚙️', color:'orange',  div:'company',      x:1000, y:180 },
  { key:'CIO',         label:'CIO',              role:'Tech Infrastructure',  icon:'💻', color:'blue',    div:'inner_circle', x:100,  y:340 },
  { key:'AUDITOR',     label:'Auditor',          role:'Financial Compliance', icon:'📊', color:'amber',   div:'shield',       x:300,  y:340 },
  { key:'CLO',         label:'CLO',              role:'Legal Strategy',       icon:'⚖️', color:'slate',   div:'shield',       x:500,  y:340 },
  { key:'MKT_ANALYST', label:'Market Analyst',   role:'Competitive Intel',    icon:'🔍', color:'blue',    div:'market',       x:600,  y:340 },
  { key:'COMPETITOR',  label:'Competitor Sim',   role:'Adversarial Model',    icon:'⚔️', color:'red',     div:'market',       x:800,  y:340 },
  { key:'COS',         label:'Chief of Staff',   role:'Exec Coordination',    icon:'📋', color:'violet',  div:'inner_circle', x:900,  y:340 },
  { key:'CISO',        label:'CISO',             role:'Security & Privacy',   icon:'🛡️', color:'slate',   div:'inner_circle', x:1100, y:340 },
  { key:'TARGET_BUYER',label:'Target Buyer',     role:'Buyer Psychology',     icon:'🎯', color:'emerald', div:'market',       x:600,  y:480 },
  { key:'UNAWARE',     label:'Unaware Audience', role:'Cold Market Sim',      icon:'🌐', color:'gray',    div:'market',       x:800,  y:480 },
  { key:'FIXER',       label:'The Fixer',        role:'Crisis Resolution',    icon:'🔧', color:'amber',   div:'inner_circle', x:900,  y:480 },
  { key:'WHISPERER',   label:'The Whisperer',    role:'Intelligence & Recon', icon:'👁️', color:'purple',  div:'inner_circle', x:1100, y:480 },
];

const EDGES = [
  { from:'CEO',to:'CPO'},{ from:'CEO',to:'CFO'},{ from:'CEO',to:'CMO'},{ from:'CEO',to:'COO'},
  { from:'CPO',to:'CIO'},{ from:'CFO',to:'AUDITOR'},{ from:'CFO',to:'CLO'},
  { from:'CMO',to:'MKT_ANALYST'},{ from:'CMO',to:'COMPETITOR'},{ from:'CMO',to:'TARGET_BUYER'},{ from:'CMO',to:'UNAWARE'},
  { from:'COO',to:'COS'},{ from:'COO',to:'CISO'},{ from:'COO',to:'FIXER'},{ from:'COO',to:'WHISPERER'},
];

const NODE_W=190, NODE_H=85, CANVAS_W=1320, CANVAS_H=640;

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

const ALL_KEYS = AGENTS.map(a=>a.key);
const agentMap = Object.fromEntries(AGENTS.map(a=>[a.key,a]));

// ─── Agent Config Modal ──────────────────────────────────────────────────────
function AgentModal({ agent, onClose, agentStream, agentLogs, activeAgents, completedAgents }: any) {
  const [tab, setTab]           = useState<'info'|'output'|'logs'>('info');
  const [configMode, setConfigMode] = useState<'model'|'prompt'|null>(null);
  const [selectedModel, setSelectedModel] = useState('');
  const [promptContent, setPromptContent] = useState('');
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saveMsg, setSaveMsg]   = useState('');
  const outputRef = useRef<HTMLDivElement>(null);

  const c = C[agent.color];
  const isActive = activeAgents.has(agent.key);
  const isDone   = completedAgents.has(agent.key);

  // Load config and prompt when modal opens
  useEffect(() => {
    fetch('http://localhost:8080/agent-config')
      .then(r=>r.json())
      .then(cfg => setSelectedModel(cfg[agent.key]?.model || 'ServiceNow-AI/Apriel-1.6-15b-Thinker'))
      .catch(()=>{});
  }, [agent.key]);

  // Load prompt when configMode switches to prompt
  useEffect(() => {
    if (configMode !== 'prompt' || promptContent) return;
    setLoadingPrompt(true);
    fetch(`http://localhost:8080/agent-prompt/${agent.key}`)
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
    await fetch(`http://localhost:8080/agent-config/${agent.key}`, {
      method: 'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model: selectedModel })
    });
    setSaving(false); setSaveMsg('Model saved ✓');
    setTimeout(()=>setSaveMsg(''), 2000);
  };

  const savePrompt = async () => {
    setSaving(true);
    await fetch(`http://localhost:8080/agent-prompt/${agent.key}`, {
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
                <div className="flex items-start gap-4">
                  <span className={`text-4xl w-16 h-16 flex items-center justify-center rounded-2xl shadow-sm ${c.ic} shrink-0`}>{agent.icon}</span>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg mb-1">{agent.label}</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">Assigned Role: <strong className="text-gray-900">{agent.role}</strong>.</p>
                    <p className="text-sm text-gray-500 mt-2 leading-relaxed">This agent belongs to the <strong className="capitalize text-gray-800">{agent.div.replace('_',' ')}</strong> division. It receives inputs from upstream agents and generates specialized strategic reports.</p>
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [logs, setLogs]             = useState<{agent:string,msg:string}[]>([]);
  const [mandates, setMandates]     = useState<string[]>([]);
  const [activeMandate, setActiveMandate] = useState('');
  const [isConnected, setIsConnected]     = useState(false);
  const [socket, setSocket]               = useState<any>(null);
  const [activeAgents, setActiveAgents]   = useState<Set<string>>(new Set());
  const [completedAgents, setCompletedAgents] = useState<Set<string>>(new Set());
  const [agentStreams, setAgentStreams]   = useState<Record<string,string>>(Object.fromEntries(ALL_KEYS.map(k=>[k,''])));
  const [modalAgent, setModalAgent]       = useState<string|null>(null);
  const [uploading, setUploading]         = useState(false);
  const [pipelinePhase, setPipelinePhase] = useState<{phase:number,total:number,label:string}|null>(null);
  const [reportCount, setReportCount]     = useState(0);
  const [pipelineState, setPipelineState] = useState<'idle'|'running'|'done'|'stopped'>('idle');
  
  // Draggable nodes state
  const [positions, setPositions] = useState<Record<string, {x:number, y:number}>>(
    Object.fromEntries(AGENTS.map(a => [a.key, { x: a.x, y: a.y }]))
  );
  const [draggingNode, setDraggingNode] = useState<string|null>(null);
  const [dragOffset, setDragOffset] = useState({x:0, y:0});

  const logsRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{ if(logsRef.current) logsRef.current.scrollTop=logsRef.current.scrollHeight; },[logs]);

  useEffect(()=>{
    const s = io('http://localhost:8080');
    setSocket(s);
    s.on('connect',    ()=>{ setIsConnected(true); s.emit('get_mandates'); });
    s.on('disconnect', ()=>setIsConnected(false));
    s.on('mandates_list',(data:string[])=>{ setMandates(data); if(data.length>0) setActiveMandate(data[0]); });
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
      setPipelineState(d.phase==='stopped'?'stopped':'done');
    });
    return ()=>{ s.close(); };
  },[]);

  const launchPipeline = ()=>{
    if(!socket||!activeMandate) return;
    setCompletedAgents(new Set()); setActiveAgents(new Set());
    setAgentStreams(Object.fromEntries(ALL_KEYS.map(k=>[k,'']))); setLogs([]);
    setPipelinePhase(null); setPipelineState('running'); setReportCount(0);
    socket.emit('trigger_pipeline',{phase:'csuite',mandate:activeMandate});
  };

  const stopPipeline = ()=>{
    if(!socket) return;
    socket.emit('stop_pipeline');
    setPipelineState('stopped');
  };

  const handleUpload = async(e:React.ChangeEvent<HTMLInputElement>)=>{
    if(!e.target.files?.length) return;
    setUploading(true);
    const form=new FormData(); form.append('mandate',e.target.files[0]);
    try{
      const res=await fetch('http://localhost:8080/upload',{method:'POST',body:form});
      const d=await res.json();
      if(d.filename&&socket){ socket.emit('get_mandates'); setActiveMandate(d.filename); }
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
    // Calculate offset relative to node top-left
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    // We adjust for scroll inside the canvas wrapper later or map against standard clientX
    // A simpler approach: Just store the mouse pos minus current state pos
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
  const agentLogs = modalAgent ? logs.filter(l=>l.agent===modalAgent||l.agent==='System') : [];

  return (
    <div className="min-h-screen bg-[#f5f5f7] font-sans relative overflow-x-hidden">
      {modalDef && (
        <AgentModal agent={modalDef} onClose={()=>setModalAgent(null)}
          agentStream={agentStreams[modalDef.key]}
          agentLogs={agentLogs}
          activeAgents={activeAgents}
          completedAgents={completedAgents}
        />
      )}

      {/* Blobs */}
      <div className="fixed top-[-15%] left-[-10%]  w-[600px] h-[600px] bg-blue-200  rounded-full mix-blend-multiply filter blur-[130px] opacity-40 animate-blob pointer-events-none z-0"/>
      <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-200 rounded-full mix-blend-multiply filter blur-[120px] opacity-35 animate-blob animation-delay-2000 pointer-events-none z-0"/>
      <div className="fixed bottom-[-10%] left-[25%] w-[600px] h-[600px] bg-pink-100  rounded-full mix-blend-multiply filter blur-[150px] opacity-25 animate-blob animation-delay-4000 pointer-events-none z-0"/>

      <div className="relative z-10 max-w-screen-2xl mx-auto px-6 py-8 flex flex-col gap-6">

        {/* ── Command Bar ── */}
        <header className="bg-white/85 backdrop-blur-2xl border border-white/60 shadow-sm rounded-3xl px-6 py-4">
          <div className="flex items-center gap-4 flex-wrap">

            {/* Brand */}
            <div className="flex-shrink-0">
              <h1 className="text-lg font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-violet-500 to-pink-500 leading-none">Dynasty OS</h1>
              <p className="text-[9px] font-bold text-gray-400 tracking-widest uppercase mt-0.5">V11 · 16 agents</p>
            </div>

            <div className="w-px h-8 bg-gray-200 flex-shrink-0 hidden xl:block"/>

            {/* Mandate Selector + Upload */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="relative">
                <select value={activeMandate} onChange={e=>setActiveMandate(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-gray-700 rounded-xl pl-3 pr-7 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-300 appearance-none font-medium max-w-[220px] truncate">
                  {mandates.length>0?mandates.map((m,i)=><option key={i}>{m}</option>):<option>No mandates</option>}
                </select>
                <span className="absolute inset-y-0 right-2 flex items-center text-gray-400 pointer-events-none text-xs">▾</span>
              </div>
              <label className={`cursor-pointer px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-500 hover:border-blue-300 hover:text-blue-500 transition-colors bg-white font-medium ${uploading?'opacity-50':''}`}>
                <input type="file" accept=".md,.txt" className="hidden" onChange={handleUpload} disabled={uploading}/>
                {uploading?'⏳':'📎 Upload'}
              </label>
            </div>

            <div className="w-px h-8 bg-gray-200 flex-shrink-0 hidden xl:block"/>

            {/* Phase Progress */}
            <div className="flex-1 min-w-0">
              {pipelineState==='idle' && (
                <p className="text-xs text-gray-400 font-medium">Ready — select a mandate and launch.</p>
              )}
              {pipelineState==='running' && pipelinePhase && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    {Array.from({length:pipelinePhase.total},(_,i)=>(
                      <div key={i} className={`h-1.5 w-12 rounded-full transition-all ${
                        i<pipelinePhase.phase ? 'bg-blue-500' : i===pipelinePhase.phase-1 ? 'bg-blue-400 animate-pulse' : 'bg-gray-200'
                      }`}/>
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-gray-600 truncate">{pipelinePhase.label}</span>
                  {/* Active agent pills */}
                  <div className="flex gap-1 flex-wrap">
                    {[...activeAgents].map(k=>{
                      const a=agentMap[k]; const ac=C[a?.color||'blue'];
                      return <span key={k} className={`text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse ${ac.badge}`}>{k}</span>;
                    })}
                  </div>
                </div>
              )}
              {pipelineState==='done' && (
                <div className="flex items-center gap-2">
                  <span className="text-emerald-500 font-bold text-sm">✓</span>
                  <span className="text-xs font-semibold text-gray-600">{reportCount} reports filed · {completedAgents.size} agents complete</span>
                  <span className="text-[10px] text-gray-400">· Click any node to read output</span>
                </div>
              )}
              {pipelineState==='stopped' && (
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 font-bold text-sm">⛔</span>
                  <span className="text-xs font-semibold text-amber-600">Pipeline stopped · {completedAgents.size} agents completed before stop</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {pipelineState==='running' && (
                <button onClick={stopPipeline}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 rounded-xl text-xs font-bold transition-all">
                  ⛔ Stop
                </button>
              )}
              <button onClick={launchPipeline}
                disabled={!isConnected||pipelineState==='running'||!activeMandate}
                className="px-5 py-2 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white rounded-xl shadow-[0_4px_12px_rgba(99,102,241,0.3)] disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5 font-bold text-xs flex items-center gap-2">
                {pipelineState==='running' ? <span className="animate-spin">⟳</span> : '▶'}
                {pipelineState==='done'||pipelineState==='stopped' ? 'Run Again' : 'Launch'}
              </button>
              {/* Connection dot */}
              <div className="flex items-center gap-1.5 bg-white/90 px-3 py-2 rounded-xl border border-gray-100 shadow-sm">
                <span className="relative flex h-1.5 w-1.5">
                  {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"/>}
                  <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isConnected?'bg-green-500':'bg-red-400'}`}/>
                </span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest hidden xl:block">{isConnected?'Live':'Offline'}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

          {/* Sidebar */}
          <div className="xl:col-span-3 flex flex-col gap-5">

            <div className="bg-white/80 backdrop-blur-2xl border border-white/60 shadow-sm rounded-3xl p-5 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">📡 Live Activity</h2>
                <button onClick={()=>navigator.clipboard.writeText(logs.map(l=>`[${l.agent}] ${l.msg}`).join('\n'))}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-blue-500 hover:border-blue-300 transition-colors shadow-sm">
                  COPY
                </button>
              </div>
              <div ref={logsRef} className="overflow-y-auto bg-gray-50 rounded-2xl border border-gray-100 p-3 font-mono text-[11px] space-y-1.5 shadow-inner max-h-[300px]">
                {logs.map((l,i)=>(
                  <div key={i} className={`leading-relaxed ${/error/i.test(l.agent)?'text-red-500':'text-gray-500'}`}>
                    <span className="font-bold text-blue-500">[{l.agent}]</span> {l.msg}
                  </div>
                ))}
                {logs.length===0&&<div className="text-gray-400 text-center py-4 text-[11px]">Idle.</div>}
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-2xl border border-white/60 shadow-sm rounded-3xl p-5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">💡 Tip</p>
              <p className="text-xs text-gray-500 leading-relaxed">Click any agent node to edit its model, system prompt, view output, and logs.</p>
            </div>
          </div>

          {/* Canvas */}
          <div className="xl:col-span-9">
            <div className="bg-white/80 backdrop-blur-2xl border border-white/60 shadow-sm rounded-3xl overflow-hidden relative">
              <div className="absolute inset-0 opacity-25" style={{backgroundImage:'radial-gradient(circle, #d1d5db 1px, transparent 1px)',backgroundSize:'28px 28px'}}/>

              <div className="relative overflow-auto p-6" style={{minHeight:CANVAS_H+48}}
                   onPointerMove={handlePointerMove}
                   onPointerUp={handlePointerUp}
                   onPointerLeave={handlePointerUp}>
                <svg width={CANVAS_W} height={CANVAS_H} className="absolute top-6 left-6 pointer-events-none z-10 overflow-visible">
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
                  {EDGES.map(e=>{
                    const to=agentMap[e.to];
                    const ec=C[to.color];
                    const isActive=activeAgents.has(e.to), isDone=completedAgents.has(e.to);
                    const isHighlighted = isActive || isDone;
                    return <path key={`${e.from}-${e.to}`} d={bezier(e.from, e.to)} fill="none"
                      stroke={isHighlighted ? ec.edge : '#E5E7EB'}
                      strokeWidth={isActive ? 2.5 : 1.5} strokeLinecap="round"
                      strokeDasharray={isActive ? "8 4" : undefined}
                      markerEnd={`url(#arrow-${isHighlighted ? to.color : 'default'})`}
                      style={isActive ? {animation:'dash 0.6s linear infinite'} : {}}/>;
                  })}
                </svg>

                <div className="relative z-20" style={{width:CANVAS_W,height:CANVAS_H}}>
                  {AGENTS.map(agent=>{
                    const ac=C[agent.color];
                    const isActive=activeAgents.has(agent.key), isDone=completedAgents.has(agent.key);
                    const pos = positions[agent.key];
                    if (!pos) return null;
                    return (
                      <div key={agent.key}
                        onPointerDown={(e) => handlePointerDown(e, agent.key)}
                        onClick={()=> {
                          // Only open modal if we didn't drag
                          if (!draggingNode) setModalAgent(agent.key);
                        }}
                        title="Drag to move, click to configure"
                        className={`absolute cursor-pointer rounded-2xl border bg-white transition-shadow duration-300 select-none group
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
