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
  // FOUNDER (you)
  { key:'FOUNDER', label:'Founder', role:'Visionary & Commander', icon:'👑', color:'gold', div:'company', x:825, y:-120, isFounder:true, desc: "The visionary behind the organization. All orders flow from here down to the CEO and the entire chain of command." },

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
  { from:'FOUNDER', to:'CEO' },
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
  gray:    { ring:'ring-gray-400',    glow:'shadow-[0_0_20px_rgba(156,163,175,0.5)]',   dot:'bg-gray-500',   badge:'bg-gray-100 text-gray-700',     h:'from-gray-50',    ic:'bg-gray-100 text-gray-600',    edge:'#9CA3AF' },
  gold:    { ring:'ring-yellow-400',  glow:'shadow-[0_0_28px_rgba(234,179,8,0.65)]',    dot:'bg-yellow-500', badge:'bg-yellow-100 text-yellow-800', h:'from-yellow-50',  ic:'bg-yellow-100 text-yellow-700', edge:'#EAB308' },
};

const ALL_COLORS = Object.keys(C);

// ─── Agent Config Modal ──────────────────────────────────────────────────────
function AgentModal({ agent, edges, onClose, onUpdateAgent, agentStream, agentLogs, activeAgents, completedAgents }: any) {
  const [tab, setTab]           = useState<'info'|'output'|'logs'>('info');
  const [configMode, setConfigMode] = useState<'model'|'prompt'|null>(null);
  const [selectedModel, setSelectedModel] = useState('');
  const [promptContent, setPromptContent] = useState('');
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [humanInput, setHumanInput]     = useState('');
  const [saving, setSaving]     = useState(false);
  const [saveMsg, setSaveMsg]   = useState('');
  const outputRef = useRef<HTMLDivElement>(null);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ 
    key: agent.key, label: agent.label, role: agent.role, email: agent.email || '', phone: agent.phone || '', isHuman: agent.isHuman || false,
    triggerType: agent.triggerType || 'event',
    timezone: agent.timezone || 'America/Los_Angeles',
    operatingHours: agent.operatingHours || '24/7'
  });

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
      <div className="relative bg-gradient-to-br from-white/80 to-white/30 backdrop-blur-3xl rounded-3xl shadow-[0_10px_60px_-15px_rgba(0,0,0,0.3)] w-full max-w-3xl max-h-[90vh] flex flex-col border border-white/60 overflow-hidden"
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
                        <div className="space-y-4 mb-3">
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 mb-1 block">Agent Name</label>
                            <input type="text" value={profileForm.label} onChange={e=>setProfileForm(p=>({...p, label:e.target.value}))} className="w-full text-sm font-bold bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans" placeholder="Agent Name" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 mb-1 block">System ID</label>
                            <input type="text" value={profileForm.key} onChange={e=>setProfileForm(p=>({...p, key:e.target.value}))} className="w-full text-xs font-mono font-bold bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="System ID (e.g. BADGE-1234)" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 mb-1 block">Primary Role</label>
                            <input type="text" value={profileForm.role} onChange={e=>setProfileForm(p=>({...p, role:e.target.value}))} className="w-full text-sm font-bold bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Agent Role" />
                          </div>
                          <div className="flex gap-4">
                            <div className="flex-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 mb-1 block">Email (Optional)</label>
                              <input type="email" value={profileForm.email||''} onChange={e=>setProfileForm(p=>({...p, email:e.target.value}))} className="w-full text-sm font-medium bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Email Address" />
                            </div>
                            <div className="flex-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 mb-1 block">Phone (Optional)</label>
                              <input type="text" value={profileForm.phone||''} onChange={e=>setProfileForm(p=>({...p, phone:e.target.value}))} className="w-full text-sm font-medium bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Phone Number" />
                            </div>
                          </div>
                          <div className="flex items-center gap-3 pt-2">
                            <label className="text-[11px] font-bold text-gray-700 flex items-center gap-2 cursor-pointer select-none">
                              <input type="checkbox" checked={profileForm.isHuman||false} onChange={e=>setProfileForm(p=>({...p, isHuman:e.target.checked}))} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                              This is a Human Executive
                            </label>
                          </div>
                          
                          {/* CRON / TRIGGER FIELDS */}
                          {!profileForm.isHuman && (
                            <div className="space-y-3 pt-3 mt-1 border-t border-gray-200/60 bg-gray-50/50 -mx-3 px-3 pb-2 rounded-xl">
                              <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5"><span className="text-blue-500 text-sm">⚡</span> Execution Strategy</h5>
                              <div className="flex gap-4">
                                <label className="text-[11px] font-bold text-gray-700 flex items-center gap-2 cursor-pointer transition-colors hover:text-blue-600">
                                   <input type="radio" checked={profileForm.triggerType !== 'cron'} onChange={()=>setProfileForm(p=>({...p, triggerType:'event'}))} className="form-radio text-blue-600 focus:ring-blue-500" />
                                   Event-Driven (Pipeline)
                                </label>
                                <label className="text-[11px] font-bold text-gray-700 flex items-center gap-2 cursor-pointer transition-colors hover:text-amber-600">
                                   <input type="radio" checked={profileForm.triggerType === 'cron'} onChange={()=>setProfileForm(p=>({...p, triggerType:'cron'}))} className="form-radio text-amber-500 focus:ring-amber-500" />
                                   Scheduled (Cron)
                                </label>
                              </div>
                              {profileForm.triggerType === 'cron' && (
                                <div className="grid grid-cols-2 gap-3 mt-2 animate-in slide-in-from-top-2 fade-in duration-200">
                                  <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 mb-1 block">Timezone</label>
                                    <select value={profileForm.timezone} onChange={e=>setProfileForm(p=>({...p, timezone:e.target.value}))} className="w-full text-xs font-bold bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all">
                                       <option value="UTC">UTC (Universal)</option>
                                       <option value="America/New_York">Eastern Time (ET)</option>
                                       <option value="America/Chicago">Central Time (CT)</option>
                                       <option value="America/Los_Angeles">Pacific Time (PT)</option>
                                       <option value="Europe/London">London (GMT)</option>
                                       <option value="Asia/Tokyo">Tokyo (JST)</option>
                                       <option value="Asia/Ho_Chi_Minh">Ho Chi Minh (ICT)</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 mb-1 block">Operating Hours</label>
                                    <input type="text" value={profileForm.operatingHours} onChange={e=>setProfileForm(p=>({...p, operatingHours:e.target.value}))} className="w-full text-xs font-bold font-mono bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all" placeholder="e.g. 0 9 * * 1-5" />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex gap-2 mt-4 pt-2 border-t border-gray-100">
                            <button onClick={()=>{
                              onUpdateAgent(agent.key, profileForm);
                              setIsEditingProfile(false);
                            }} className="flex-1 text-[11px] font-bold bg-blue-600 text-white px-3 py-2.5 rounded-xl hover:bg-blue-700 shadow-sm transition-all text-center">Save Profile Details</button>
                            <button onClick={()=>{
                              setProfileForm({ 
                                key: agent.key, label: agent.label, role: agent.role, email: agent.email||'', phone: agent.phone||'', isHuman: agent.isHuman||false,
                                triggerType: agent.triggerType || 'event', timezone: agent.timezone || 'America/Los_Angeles', operatingHours: agent.operatingHours || '24/7'
                              });
                              setIsEditingProfile(false);
                            }} className="flex-1 text-[11px] font-bold bg-gray-100 text-gray-600 px-3 py-2.5 rounded-xl hover:bg-gray-200 shadow-sm transition-all text-center">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="group relative">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h4 className="font-bold text-gray-900 text-lg mb-0.5">{agent.label}</h4>
                              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">ID: <strong className="text-gray-900">{agent.key}</strong> • {agent.role}</p>
                            </div>
                            <button onClick={()=>setIsEditingProfile(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors shadow-sm">
                              <span>✎</span> Edit Profile
                            </button>
                          </div>
                          {(agent.email || agent.phone) && (
                            <p className="text-[11px] font-medium text-gray-500 mt-2 flex items-center gap-3">
                              {agent.email && <span>📧 {agent.email}</span>}
                              {agent.phone && <span>📱 {agent.phone}</span>}
                            </p>
                          )}
                          <div className="mt-3 mb-2 flex flex-wrap items-center gap-2">
                            <p className="text-[11px] font-bold text-gray-500 tracking-widest leading-relaxed px-2 py-1 bg-gray-100/50 rounded inline-block border border-gray-200/50">
                              {agent.isHuman ? '👥 HUMAN EXECUTIVE' : '🤖 AI EXECUTIVE'}
                            </p>
                            {!agent.isHuman && agent.triggerType === 'cron' && (
                              <p className="text-[10px] font-bold text-amber-600 tracking-widest leading-relaxed px-2 py-1 bg-amber-50 rounded inline-block border border-amber-200/50 shadow-sm">
                                🕒 CRON: {agent.operatingHours || '24/7'} ({agent.timezone || 'PT'})
                              </p>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-2 leading-relaxed">{agent.desc || `This agent belongs to the ${agent.div.replace('_',' ')} division. It receives inputs from upstream agents and generates specialized strategic reports.`}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {agent.isHuman && isActive && (
                  <div className="mt-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 shadow-inner">
                    <h4 className="text-xs font-black text-emerald-700 uppercase tracking-widest mb-1.5 flex items-center gap-2"><span className="animate-pulse w-2 h-2 bg-emerald-500 rounded-full" /> Human Webhook Required</h4>
                    <p className="text-xs text-emerald-800/80 mb-4 font-medium">This node is completely paused. The Founder must simulate the external human response below, which will fire the \`/webhook/human/${agent.key}\` HTTP endpoint to unblock the pipeline.</p>
                    <textarea value={humanInput} onChange={e=>setHumanInput(e.target.value)} rows={3} className="w-full text-xs p-3 rounded-xl border border-emerald-200 outline-none focus:ring-2 focus:ring-emerald-400 mb-3 bg-white/70 shadow-sm font-mono text-gray-800" placeholder="Type human executive final output..." />
                    <button onClick={async ()=>{
                        setSaving(true);
                        await fetch(`http://localhost:1110/webhook/human/${agent.key}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({response:humanInput}) });
                        setSaving(false); setHumanInput('');
                    }} disabled={saving||!humanInput.trim()} className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 hover:-translate-y-0.5">Submit Webhook Response</button>
                  </div>
                )}

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
      <div className="relative bg-gradient-to-br from-white/80 to-white/30 backdrop-blur-3xl rounded-3xl shadow-[0_10px_60px_-15px_rgba(0,0,0,0.3)] w-full max-w-5xl h-[85vh] flex flex-col border border-white/60 overflow-hidden" onClick={e=>e.stopPropagation()}>
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/30 backdrop-blur-md">
      <div className="bg-gradient-to-br from-white/90 to-white/50 backdrop-blur-3xl w-full max-w-5xl h-[90vh] rounded-3xl shadow-[0_10px_60px_-15px_rgba(0,0,0,0.3)] border border-white/60 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-white/50 flex items-center justify-between bg-emerald-50/50">
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

const DEFAULT_DIVISIONS = [
  { id: 'company', name: 'C-Suite' },
  { id: 'inner_circle', name: 'Inner Circle' },
  { id: 'shield', name: 'The Shield' },
  { id: 'market', name: 'The Market' }
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [companies, setCompanies] = useState<Record<string, any>>({
    'default': { name: 'Alpha Startup', agents: INITIAL_AGENTS, divisions: DEFAULT_DIVISIONS }
  });
  const [activeCompanyId, setActiveCompanyId] = useState<string>('default');

  const activeCompany = companies[activeCompanyId] || companies['default'] || { name: 'Alpha Startup', agents: INITIAL_AGENTS, divisions: DEFAULT_DIVISIONS };
  const agents = activeCompany.agents || INITIAL_AGENTS;
  const divisions = activeCompany.divisions || DEFAULT_DIVISIONS;
  const [edges, setEdges] = useState<any[]>(INITIAL_EDGES);

  // Camera State (Synchronous Ref + Async State for Render)
  const cameraRef = useRef({ x: 0, y: 0, z: 1 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({x: 0, y: 0});
  
  const flushCamera = () => {
    setZoom(cameraRef.current.z);
    setPan({ x: cameraRef.current.x, y: cameraRef.current.y });
  };
  const [toolMode, setToolMode] = useState<'move'|'pan'>('move');
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  // Sidebar Tabs & Chat Minimization
  const [activeSidebarTab, setActiveSidebarTab] = useState<'org'|'docs'>('org');
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const chatDragRef = useRef({ isDragging: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0 });
  const [chatPos, setChatPos] = useState({ x: 0, y: 0 }); // Will center on mount
  const [isChatFocused, setIsChatFocused] = useState(false);
  const [contextMenu, setContextMenu] = useState<{x:number,y:number}|null>(null);
  const [appView, setAppView] = useState<'canvas'|'calendar'>('canvas');
  const [calView, setCalView] = useState<'day'|'week'|'bimonth'>('week');
  const [calDate, setCalDate] = useState(() => new Date());
  
  useEffect(() => {
    setChatPos({ x: window.innerWidth / 2 - 32, y: window.innerHeight - 100 });
    const dismiss = () => setContextMenu(null);
    window.addEventListener('click', dismiss);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setContextMenu(null); });
    return () => window.removeEventListener('click', dismiss);
  }, []);

  // Hierarchy logic
  const getAgentLevel = (key: string) => {
    let level = 0;
    let curr = key;
    for(let i=0; i<20; i++) {
       const edge = edges.find((e:any) => e.to === curr);
       if(!edge) break;
       level++;
       curr = edge.from;
    }
    return level;
  };
  const getManagerName = (key: string) => {
    const edge = edges.find((e:any) => e.to === key);
    if(!edge) return null;
    return agents.find((a:any) => a.key === edge.from)?.label;
  };

  const [editingDiv, setEditingDiv] = useState<string|null>(null);
  const [divEditName, setDivEditName] = useState('');
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [dismissedTips, setDismissedTips] = useState<Set<string>>(new Set());
  const [isTipCollapsed, setIsTipCollapsed] = useState(false);

  // Hydration fix
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const saveSystemState = async (newComps: Record<string,any>, newActiveId: string) => {
    try { await fetch('http://localhost:1110/system-state', { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ activeCompanyId: newActiveId, companies: newComps }) }); } catch(err){}
  };

  const updateActiveCompany = (newAgents: any[], newDivs: any[]) => {
    const newComps = { ...companies, [activeCompanyId]: { ...activeCompany, agents: newAgents, divisions: newDivs } };
    setCompanies(newComps);
    saveSystemState(newComps, activeCompanyId);
    return newComps;
  };

  const handleAddCompany = () => {
    const name = window.prompt("Enter Name for new Startup:", "New Startup");
    if(!name) return;
    const newId = `comp_${Date.now()}`;
    const newComps = { ...companies, [newId]: { name, agents: INITIAL_AGENTS, divisions: DEFAULT_DIVISIONS } };
    setCompanies(newComps);
    setActiveCompanyId(newId);
    setPositions(Object.fromEntries(INITIAL_AGENTS.map((a:any) => [a.key, {x: a.x, y: a.y}])));
    saveSystemState(newComps, newId);
  };

  const handleSwitchCompany = (compId: string) => {
    setActiveCompanyId(compId);
    const c = companies[compId] || companies['default'];
    setPositions(Object.fromEntries((c.agents||[]).map((a:any) => [a.key, {x: a.x, y: a.y}])));
    saveSystemState(companies, compId);
    setTimeout(() => fitView(c.agents || []), 50);
  };

  const agentMap = Object.fromEntries(agents.map((a:any)=>[a.key,a]));
  const ALL_KEYS = agents.map((a:any)=>a.key);
  
  const [expandedDivs, setExpandedDivs] = useState<Record<string,boolean>>({ company: true, inner_circle: true, shield: true, market: true });
  const [removeCandidate, setRemoveCandidate] = useState<any>(null);
  const [addModalDiv, setAddModalDiv] = useState<string|null>(null);
  const [newAgentForm, setNewAgentForm] = useState({ label:'', role:'', icon:'🤖', color:'gray', isHuman: false });

  const handleUpdateAgent = (oldKey: string, updates: any) => {
    let newAgents = [...agents];
    if (updates.key && updates.key !== oldKey) {
       newAgents = newAgents.map(a => a.key === oldKey ? { ...a, ...updates } : a);
       setPositions(p => { const np = {...p}; np[updates.key] = np[oldKey]; delete np[oldKey]; return np; });
       setEdges(e => e.map(edge => ({ from: edge.from === oldKey ? updates.key : edge.from, to: edge.to === oldKey ? updates.key : edge.to })));
       setModalAgent(updates.key);
    } else {
       newAgents = newAgents.map(a => a.key === oldKey ? { ...a, ...updates } : a);
    }
    updateActiveCompany(newAgents, divisions);
  };

  const handleHireEmployee = () => {
    if(!newAgentForm.label) return;
    const assignedKey = `BADGE-${Math.floor(Math.random()*90000+10000)}`;
    const newAgent = { ...newAgentForm, key: assignedKey, div: addModalDiv, x: 825, y: Math.random()*200+300, desc: newAgentForm.isHuman ? "Human Executive (Requires Webhook)" : "Newly hired AI Executive." };
    const newAgents = [...agents, newAgent];
    setPositions(p => ({...p, [newAgent.key]: {x: newAgent.x, y: newAgent.y}}));
    setAddModalDiv(null);
    setNewAgentForm({ label:'', role:'', icon: '🤖', color:'gray', isHuman: false });
    updateActiveCompany(newAgents, divisions);
  };

  const handleFireEmployee = () => {
    if(!removeCandidate) return;
    const newAgents = agents.filter((a:any) => a.key !== removeCandidate.key);
    setEdges(p => p.filter(e => e.from !== removeCandidate.key && e.to !== removeCandidate.key));
    setRemoveCandidate(null);
    updateActiveCompany(newAgents, divisions);
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

  // Auto-expand tips conditionally when pipeline execution state changes
  useEffect(() => {
    setIsTipCollapsed(false); // Un-collapse to show newly triggered tips
    setCurrentTipIndex(0); // Reset to show the most relevant active tip
  }, [pipelineState, isConnected]);
  
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
  const [isHierarchyOpen, setIsHierarchyOpen] = useState(true);
  const [isDocsOpen, setIsDocsOpen] = useState(true);
  
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
    fetch('http://localhost:1110/system-state').then(r=>r.json()).then(data => {
      if (data.companies && data.activeCompanyId) {
        setCompanies(data.companies);
        setActiveCompanyId(data.activeCompanyId);
        const active = data.companies[data.activeCompanyId];
        if (active && active.agents && active.agents.length > 0) {
          setPositions(Object.fromEntries(active.agents.map((a:any) => [a.key, {x: a.x, y: a.y}])));
          setTimeout(() => fitView(active.agents), 50);
        }
      }
    }).catch(()=>{});

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

  const handleHumanWebhook = (agentKey: string, message: string) => {
    if (!socket) return;
    socket.emit('human_webhook', { agentKey, message });
  };

  const launchPipeline = () => {
    if(!socket || !activeInstruction) return; // Re-added socket check for safety
    setFinalReport(null);
    setCompletedAgents(new Set()); setActiveAgents(new Set());
    setAgentStreams(Object.fromEntries(ALL_KEYS.map((k: string)=>[k,'']))); setLogs([]);
    setPipelinePhase(null);    setPipelineState('running');
    setReportCount(0);
    socket.emit('trigger_pipeline',{instruction:activeInstruction, activeAgentKeys: agents.map((a:any)=>a.key), agents});
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

  const isPanningCanvas = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        setIsSpaceDown(true);
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+' || e.key === '-')) {
        e.preventDefault();
        setZoom(z => Math.max(0.1, Math.min(3, e.key === '-' ? z - 0.1 : z + 0.1)));
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpaceDown(false);
    };
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, []);

  function fitView(agentsToFit: any[] = agents) {
    if (agentsToFit.length === 0) { 
      cameraRef.current = { x: 0, y: 0, z: 1 };
      flushCamera();
      return; 
    }
    const minX = Math.min(...agentsToFit.map((a:any) => a.x));
    const maxX = Math.max(...agentsToFit.map((a:any) => a.x));
    const minY = Math.min(...agentsToFit.map((a:any) => a.y));
    const maxY = Math.max(...agentsToFit.map((a:any) => a.y));
    const contentW = maxX - minX + NODE_W;
    const contentH = maxY - minY + NODE_H;
    const availW = window.innerWidth - (isLeftPanelOpen ? 288 : 0) - (isRightPanelOpen ? 320 : 0);
    const availH = window.innerHeight - 64; 
    const scaleX = (availW - 100) / contentW; 
    const scaleY = (availH - 100) / contentH;
    const newZoom = Math.max(0.1, Math.min(1, Math.min(scaleX, scaleY)));
    
    cameraRef.current = {
       x: (availW / 2) - ((minX + contentW/2) * newZoom),
       y: (availH / 2) - ((minY + contentH/2) * newZoom),
       z: newZoom
    };
    flushCamera();
  };

  const handleCanvasWheel = (e: React.WheelEvent) => {
    // If holding shift, allow horizontal trackpad pan
    if (e.shiftKey) {
      cameraRef.current.x -= e.deltaX;
      cameraRef.current.y -= e.deltaY;
      flushCamera();
      return;
    }

    e.preventDefault();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const c = cameraRef.current;
    const zoomMultiplier = Math.exp(e.deltaY * -0.002);
    const newZ = Math.max(0.1, Math.min(3, c.z * zoomMultiplier));
    
    c.x = mouseX - (mouseX - c.x) * (newZ / c.z);
    c.y = mouseY - (mouseY - c.y) * (newZ / c.z);
    c.z = newZ;

    flushCamera();
  };

  const handlePointerDownCanvas = (e: React.PointerEvent) => {
    if (e.target instanceof Element && e.target.closest('button')) return;
    if (toolMode === 'pan' || isSpaceDown || e.button === 1 || e.button === 2) {
      isPanningCanvas.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragOrigin.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerDownNode = (e: React.PointerEvent, key: string) => {
    if (e.target instanceof Element && e.target.closest('button')) return;
    if (toolMode === 'pan' || isSpaceDown) return; 
    e.stopPropagation();
    setDraggingNode(key);
    dragOrigin.current = { x: e.clientX, y: e.clientY };
    const p = positions[key];
    setDragOffset({ x: p.x, y: p.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanningCanvas.current) {
      const dx = e.clientX - dragOrigin.current.x;
      const dy = e.clientY - dragOrigin.current.y;
      dragOrigin.current = { x: e.clientX, y: e.clientY };
      cameraRef.current.x += dx;
      cameraRef.current.y += dy;
      flushCamera();
      return;
    }
    if (draggingNode) {
      const dx = (e.clientX - dragOrigin.current.x) / zoom;
      const dy = (e.clientY - dragOrigin.current.y) / zoom;
      setPositions(prev => ({ ...prev, [draggingNode]: { x: dragOffset.x + dx, y: dragOffset.y + dy } }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanningCanvas.current) {
      isPanningCanvas.current = false;
      e.currentTarget.releasePointerCapture(e.pointerId);
      return;
    }
    if (draggingNode) {
      setDraggingNode(null);
      e.currentTarget.releasePointerCapture(e.pointerId);
      setTimeout(() => {
         setPositions(currentPos => {
           const p = currentPos[draggingNode];
           if(p) {
              const newAgents = agents.map((a:any) => a.key === draggingNode ? { ...a, x: p.x, y: p.y } : a);
              updateActiveCompany(newAgents, divisions);
           }
           return currentPos;
         });
      }, 0);
    }
  };

  const modalDef = modalAgent ? agentMap[modalAgent] : null;
  const agentLogs = modalAgent ? logs.filter(l=>l.agent===modalAgent) : [];

  // ── Tips & Status Logic ──
  const defaultTips = [
    "Select or write a new Instruction to begin building the Master Plan.",
    "Click the 'Launch' button to run the system. The CEO will orchestrate the C-Suite.",
    "The 3D Hierarchy allows you to group agents into logical divisions.",
    "Use the tools at the bottom to pan, zoom, and Fit the canvas to your screen.",
    "You can @mention specific agents like @CPO directly in your instruction prompt."
  ];

  let rawTips = [...defaultTips];

  if (!isConnected) {
    rawTips = ["SYSTEM OFFLINE: Run `python3 run.py start` in your terminal to boot the backend."];
  } else {
    // Dynamic context tips get priority
    if (pipelineState === 'running') rawTips.unshift("The pipeline is live. Watch the Live Activity sidebar on the right to monitor the agents.");
    else if (pipelineState === 'done' && finalReport) rawTips.unshift("Execution complete! Click 'View Final Report' in the top bar to read the CEO's definitive verdict.");
  }

  const displayTips = rawTips.filter(t => !dismissedTips.has(t));
  const showTipBox = displayTips.length > 0;
  const activeTip = displayTips.length > 0 ? displayTips[currentTipIndex % displayTips.length] : "";

  if (!mounted) return null; // Avoid all hydration mismatches by forcing client-only render

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
          onHumanWebhook={handleHumanWebhook}
        />
      )}

      {/* ── Hire Executive Modal ── */}
      {addModalDiv && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200" onPointerDown={e=>e.stopPropagation()}>
          <div className="bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-3xl rounded-3xl shadow-[0_10px_50px_-15px_rgba(0,0,0,0.4)] border border-white/60 p-8 max-w-sm w-full animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-4 text-gray-900 border-b border-white/50 pb-3">Hire New Executive ({addModalDiv})</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  checked={newAgentForm.isHuman} onChange={e=>setNewAgentForm(p=>({...p, isHuman: e.target.checked, icon: e.target.checked ? '👤' : '🤖'}))} />
                <span className="text-sm font-bold text-gray-700">This is a Human Executive (Requires Webhook)</span>
              </label>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                <input type="text" value={newAgentForm.label} onChange={e=>setNewAgentForm(p=>({...p, label:e.target.value}))} className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 font-bold" placeholder="e.g. Austin Nguyen" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Assigned Role</label>
                <input type="text" value={newAgentForm.role} onChange={e=>setNewAgentForm(p=>({...p, role:e.target.value}))} className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-800" placeholder="e.g. Oversees Engineering" />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={()=>setAddModalDiv(null)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl text-xs transition-colors">Cancel</button>
              <button onClick={handleHireEmployee} disabled={!newAgentForm.label} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-lg disabled:opacity-50">Hire Employee</button>
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
      <nav className="fixed top-0 left-0 right-0 h-16 border-b border-white/40 bg-gradient-to-b from-white/60 to-white/30 backdrop-blur-2xl z-50 shadow-sm px-6 flex items-center justify-between">
         {/* Brand & Multi-Company Switcher */}
         <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 shadow-inner flex items-center justify-center text-white font-bold text-lg">U</div>
            <div className="flex items-center gap-2">
               <select value={activeCompanyId} onChange={e => {
                   if(e.target.value === '__NEW__') { handleAddCompany(); }
                   else { handleSwitchCompany(e.target.value); }
               }} className="text-lg font-black bg-transparent text-gray-900 hover:text-indigo-600 cursor-pointer outline-none hidden sm:block appearance-none pr-4">
                  {Object.entries(companies).map(([id, comp]: any) => (
                      <option key={id} value={id}>{comp.name}</option>
                  ))}
                  <option disabled>──────────</option>
                  <option value="__NEW__" className="font-bold text-indigo-600">+ Create New Startup</option>
               </select>
            </div>
         </div>

         {/* View Switcher: Canvas / Calendar */}
         <div className="flex items-center gap-0.5 bg-gray-100/70 rounded-xl p-1 border border-gray-200/50">
           <button onClick={() => setAppView('canvas')}
             className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${appView === 'canvas' ? 'bg-white shadow text-gray-800 border border-gray-200/60' : 'text-gray-500 hover:text-gray-700'}`}>
             🌐 Org Tree
           </button>
           <button onClick={() => setAppView('calendar')}
             className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${appView === 'calendar' ? 'bg-white shadow text-gray-800 border border-gray-200/60' : 'text-gray-500 hover:text-gray-700'}`}>
             📅 Calendar
           </button>
         </div>

         {/* Controls */}
         <div className="flex items-center gap-4">
             {/* Phase Progress */}
             {/* Status & Tips Widget (Moved to Header) */}
             <div className="mr-0 hidden xl:flex items-center bg-white/50 backdrop-blur-md rounded-2xl border border-white/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] overflow-hidden h-10 transition-all">
                {/* Permanent Live/Offline Status Toggle */}
                <div onClick={() => showTipBox && setIsTipCollapsed(!isTipCollapsed)} className={`flex items-center gap-2 px-4 h-full transition-colors select-none ${showTipBox ? 'cursor-pointer hover:bg-black/5' : ''} ${isConnected?'bg-green-50/50':'bg-red-50/50'}`}>
                    <span className="relative flex h-2 w-2">
                      {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"/>}
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected?'bg-green-500':'bg-red-500'}`}/>
                    </span>
                    <h4 className={`text-[10px] font-black uppercase tracking-widest ${isConnected?'text-green-600':'text-red-500'}`}>
                      {isConnected?'System Live':'Offline'}
                    </h4>
                    {showTipBox && (
                       <span className={`text-gray-400 text-[9px] transition-transform ml-1 ${isTipCollapsed ? 'scale-x-125' : 'scale-x-[-1.25]'}`}>▶</span>
                    )}
                </div>
                
                {/* Collapsible/Cycleable Tips */}
                {showTipBox && !isTipCollapsed && (
                  <div className="flex items-center gap-3 px-3 h-full border-l border-white/40 animate-in fade-in slide-in-from-right-4">
                      <span className="text-sm drop-shadow-sm">{isConnected ? '💡' : '⚠️'}</span>
                      <p className="text-[11px] text-gray-600 font-medium max-w-[280px] break-words line-clamp-2" title={activeTip}>
                        {activeTip}
                      </p>
                      
                      <div className="flex items-center gap-1 ml-1 bg-white/60 rounded-full px-1 py-0.5 shadow-inner">
                          <button onClick={() => setCurrentTipIndex(p => (p - 1 + displayTips.length) % displayTips.length)} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white text-gray-400 hover:text-gray-900 transition-all text-[15px] font-black leading-none pb-0.5" title="Previous Tip">‹</button>
                          <span className="text-[9px] font-bold text-gray-400 w-4 text-center">{(currentTipIndex % displayTips.length) + 1}/{displayTips.length}</span>
                          <button onClick={() => setCurrentTipIndex(p => p + 1)} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white text-gray-400 hover:text-gray-900 transition-all text-[15px] font-black leading-none pb-0.5" title="Next Tip">›</button>
                          <div className="w-px h-3 bg-gray-300 mx-1"></div>
                          <button onClick={() => {
                            setDismissedTips(prev => new Set(prev).add(activeTip));
                            setCurrentTipIndex(p => Math.max(0, p - 1));
                          }} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white text-gray-400 hover:text-red-500 transition-all text-xs font-bold" title="Dismiss Tip">✕</button>
                      </div>
                  </div>
                )}
             </div>

             {/* Phase Progress when pipeline running */}
             {pipelineState==='running' && pipelinePhase && (
               <div className="flex items-center gap-3 mr-4 ml-4">
                 <span className="text-xs font-semibold text-gray-600">{pipelinePhase.label}</span>
                 <div className="flex items-center gap-1">
                   {Array.from({length:pipelinePhase.total},(_,i)=>(
                     <div key={i} className={`h-1.5 w-6 rounded-full transition-all ${i<pipelinePhase.phase ? 'bg-blue-500' : i===pipelinePhase.phase-1 ? 'bg-blue-400 animate-pulse' : 'bg-gray-200'}`}/>
                   ))}
                 </div>
               </div>
             )}
             {pipelineState==='done' && <span className="text-emerald-500 font-bold text-xs flex items-center gap-2 mr-4 ml-4">✓ {reportCount} reports filed</span>}

             {/* Top bar controls removed as they are now in the bottom chat bar */}

             {pipelineState==='running' && (
               <button onClick={stopPipeline} className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 rounded-xl text-xs font-bold shadow-sm">⛔ Stop</button>
             )}



             {finalReport && pipelineState==='done' && (
               <button onClick={()=>setFinalReportModalOpen(true)} className="px-5 py-2 bg-emerald-50 border border-emerald-200 hover:border-emerald-300 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in slide-in-from-right-4 relative group">
                 <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"/></span>
                 📄 View Final Report
               </button>
             )}
         </div>
      </nav>

      {/* ── Left Sidebar Folder Tab Handles ── */}
      <div className={`fixed z-[46] flex flex-col items-stretch transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] top-1/2 -translate-y-1/2 ${isLeftPanelOpen ? 'left-72' : 'left-0'}`}>
        {/* ORG MAP Tab (Blue) */}
        <button 
          onClick={() => { setActiveSidebarTab('org'); setIsLeftPanelOpen(true); }}
          className={`flex items-center justify-center gap-1.5 pr-3 pl-2 py-5 rounded-r-2xl border border-l-0 font-black text-[8px] uppercase tracking-[0.2em] transition-all duration-300 shadow-[3px_0_16px_-4px_rgba(0,0,0,0.12)] ${
            activeSidebarTab === 'org' && isLeftPanelOpen
              ? 'bg-blue-500 text-white border-blue-400 shadow-[3px_0_20px_-4px_rgba(59,130,246,0.4)]'
              : 'bg-white/80 backdrop-blur-2xl text-blue-500 border-white/60 hover:bg-blue-50'
          }`}
          style={{writingMode:'vertical-rl', textOrientation:'mixed', transform: 'rotate(180deg)'}}
        >
          🏛️ Org Map
        </button>
        <div className="h-1" />
        {/* DOCS Tab (Amber) */}
        <button 
          onClick={() => { setActiveSidebarTab('docs'); setIsLeftPanelOpen(true); }}
          className={`flex items-center justify-center gap-1.5 pr-3 pl-2 py-5 rounded-r-2xl border border-l-0 font-black text-[8px] uppercase tracking-[0.2em] transition-all duration-300 shadow-[3px_0_16px_-4px_rgba(0,0,0,0.12)] ${
            activeSidebarTab === 'docs' && isLeftPanelOpen
              ? 'bg-amber-500 text-white border-amber-400 shadow-[3px_0_20px_-4px_rgba(245,158,11,0.4)]'
              : 'bg-white/80 backdrop-blur-2xl text-amber-600 border-white/60 hover:bg-amber-50'
          }`}
          style={{writingMode:'vertical-rl', textOrientation:'mixed', transform: 'rotate(180deg)'}}
        >
          📁 Docs
        </button>
        {/* Collapse arrow — only when open */}
        {isLeftPanelOpen && (
          <button onClick={() => setIsLeftPanelOpen(false)}
            className="mt-1 flex items-center justify-center w-full py-2 rounded-r-2xl bg-gray-100/60 border border-l-0 border-gray-200/50 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-[10px]"
          >‹</button>
        )}
      </div>

      {/* ── Left Sidebar (Company Hierarchy & Docs) ── */}
      <aside className={`fixed top-16 left-0 bottom-0 w-72 bg-gradient-to-br from-white/70 to-white/20 backdrop-blur-3xl border-r border-white/50 shadow-2xl flex flex-col z-40 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isLeftPanelOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-end px-2 pt-3 border-b border-gray-300/50 bg-white/20 gap-1.5 h-14">
          <button onClick={() => setActiveSidebarTab('org')} className={`flex-1 rounded-t-xl py-2 px-1 text-[9px] font-black tracking-widest uppercase transition-all flex items-center justify-center gap-1.5 border border-B-0 border-b-0 ${activeSidebarTab === 'org' ? 'bg-white/80 shadow-md border-gray-300/50 text-blue-600 scale-105 origin-bottom relative z-10' : 'bg-gray-100/40 border-transparent text-gray-500 hover:bg-white/40'}`}>
            🏛️ Org Map
          </button>
          <button onClick={() => setActiveSidebarTab('docs')} className={`flex-1 rounded-t-xl py-2 px-1 text-[9px] font-black tracking-widest uppercase transition-all flex items-center justify-center gap-1.5 border border-b-0 ${activeSidebarTab === 'docs' ? 'bg-[#FCFBF8] shadow-md border-amber-200 text-amber-700 scale-105 origin-bottom relative z-10' : 'bg-gray-100/40 border-transparent text-gray-500 hover:bg-white/40'}`}>
            📁 Docs
          </button>
        </div>
        <div className={`flex-1 overflow-y-auto p-4 custom-scrollbar transition-colors duration-500 ${activeSidebarTab === 'docs' ? 'bg-[#FCFBF8]/90' : 'bg-transparent'}`}>
           
           {/* Section 1: HIERARCHY */}
           {activeSidebarTab === 'org' && (
             <div className="mb-6 animate-in slide-in-from-left-4 fade-in duration-300">
                <div className="space-y-4 pl-1">
                  {divisions.map((div:any) => {
                    const divKey = div.id;
                    const divAgents = agents.filter((a:any) => a.div === divKey);
                    const isExpanded = expandedDivs[divKey];
                    return (
                      <div key={divKey}>
                        <div className="flex items-center justify-between group cursor-pointer mb-1 border-b border-gray-100 pb-1" onClick={() => !editingDiv && setExpandedDivs(p => ({...p, [divKey]: !p[divKey]}))}>
                          {editingDiv === divKey ? (
                            <input type="text" autoFocus value={divEditName} 
                              onClick={e=>e.stopPropagation()}
                              onChange={e=>setDivEditName(e.target.value)}
                              onBlur={()=>{
                                if(divEditName.trim() && divEditName !== div.name) {
                                  const newDivs = divisions.map((d:any)=>d.id===divKey?{...d,name:divEditName}:d);
                                  updateActiveCompany(agents, newDivs);
                                }
                                setEditingDiv(null);
                              }}
                              onKeyDown={e=>{ if(e.key==='Enter') e.currentTarget.blur(); if(e.key==='Escape') setEditingDiv(null); }}
                              className="text-[9px] font-bold uppercase tracking-widest bg-white/60 border border-gray-300 rounded px-1.5 py-0.5 outline-none text-gray-900 w-32 shadow-inner" />
                          ) : (
                            <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 hover:text-gray-600 transition-colors">
                              {div.name}
                              <button onClick={e=>{e.stopPropagation(); setEditingDiv(divKey); setDivEditName(div.name);}} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-500 transition-opacity">✎</button>
                            </h3>
                          )}
                           <div className="flex items-center gap-1">
                             <button onClick={(e) => { e.stopPropagation(); setAddModalDiv(divKey); }} className="text-gray-400 hover:text-blue-500 hover:bg-white/50 rounded px-2 text-lg leading-none transition-colors">+</button>
                             <span className="text-gray-300 text-[10px] w-4 text-center">{isExpanded ? '▼' : '▶'}</span>
                           </div>
                        </div>
                        {isExpanded && (
                          <div className="mt-2 ml-2 border-l border-gray-200 pl-3 space-y-1">
                            {divAgents.length === 0 && <span className="text-[10px] text-gray-400 italic">No personnel.</span>}
                            {divAgents.map((a:any) => {
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
             </div>
           )}

           {/* Section 2: COMPANY DOCS */}
           {activeSidebarTab === 'docs' && (
             <div className="animate-in slide-in-from-right-4 fade-in duration-300">
                <p className="text-[10px] text-amber-700/70 font-bold uppercase tracking-widest mb-4">Central Repository</p>
                <div className="space-y-2 pl-1">
                   <div className="flex items-center gap-2 cursor-pointer hover:bg-white/80 p-2.5 rounded-lg text-gray-600 transition-colors shadow-sm border border-transparent hover:border-amber-200">
                     <span className="text-amber-500 text-lg drop-shadow-sm">📁</span>
                     <span className="text-xs font-bold text-amber-900">Operating Procedures</span>
                   </div>
                   <div className="flex items-center gap-2 cursor-pointer hover:bg-white/80 p-2.5 rounded-lg text-gray-600 transition-colors shadow-sm border border-transparent hover:border-amber-200">
                     <span className="text-amber-500 text-lg drop-shadow-sm">📁</span>
                     <span className="text-xs font-bold text-amber-900">Agent Action Playbooks</span>
                   </div>
                   <div className="flex items-center gap-2 cursor-pointer hover:bg-white/80 p-2.5 rounded-lg text-gray-600 transition-colors shadow-sm border border-transparent hover:border-amber-200" onClick={()=>setFinalReportModalOpen(true)}>
                     <span className="text-blue-500 text-lg drop-shadow-sm">📄</span>
                     <span className="text-xs font-bold text-gray-800">Final Executive Reports</span>
                   </div>
                </div>
             </div>
           )}

        </div>
      </aside>

      {/* ── Right Toggle Button (Frosted Pill) ── */}
      <button onClick={()=>setIsRightPanelOpen(!isRightPanelOpen)}
        className={`fixed top-1/2 -translate-y-1/2 z-[45] flex flex-col items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] bg-gradient-to-bl from-white/80 to-white/40 backdrop-blur-3xl border border-white/60 shadow-[-4px_0_24px_-8px_rgba(0,0,0,0.15)] hover:shadow-[-8px_0_30px_-8px_rgba(0,0,0,0.25)] touch-none rounded-l-3xl isolate overflow-hidden group ${isRightPanelOpen ? 'right-80 w-8 h-24 border-r-0' : 'right-0 w-12 hover:w-16 h-36 border-r-0 hover:bg-white/80'}`}>
        <span className="text-xl mb-1 text-gray-500 group-hover:text-blue-500 transition-colors duration-500">{isRightPanelOpen ? '›' : '📡'}</span>
        {!isRightPanelOpen && <span className="text-[10px] font-black text-gray-400 group-hover:text-blue-500 uppercase tracking-[0.2em] mt-1 transition-colors duration-500" style={{writingMode:'vertical-rl',textOrientation:'mixed',transform:'rotate(180deg)'}}>LIVE LOGS</span>}
      </button>

      {/* ── Right Sidebar (Live Activity Logs) ── */}
      <aside className={`fixed top-16 right-0 bottom-0 w-80 bg-gradient-to-bl from-white/70 to-white/20 backdrop-blur-3xl border-l border-white/50 shadow-2xl flex flex-col z-40 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isRightPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
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
      {appView === 'canvas' && (
      <main className={`fixed top-16 bottom-0 overflow-hidden bg-transparent transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isSpaceDown||toolMode==='pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
            style={{ left: isLeftPanelOpen ? 288 : 0, right: isRightPanelOpen ? 320 : 0 }}
            onPointerDown={handlePointerDownCanvas} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} onWheel={handleCanvasWheel}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY }); }}>
        
        {mounted && <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0', width: CANVAS_W, height: CANVAS_H, position: 'absolute', top: 0, left: 0 }} className="">
            {/* Architectural Grid Background */}
            <div className="absolute inset-0 pointer-events-none z-0" 
                 style={{
                   backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.02) 1px, transparent 1px)',
                   backgroundSize: '24px 24px',
                   backgroundPosition: 'center center'
                 }} 
            />
          <svg width={CANVAS_W} height={CANVAS_H} className="absolute top-0 left-0 pointer-events-none z-10 overflow-visible">
            <defs>
              <marker id="arrow-default" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#D1D5DB" />
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
            {agents.map((agent:any)=>{
              const ac=C[agent.color] || C.gray;
              const isActive=activeAgents.has(agent.key), isDone=completedAgents.has(agent.key);
              const pos = positions[agent.key];
              if (!pos) return null;
              return (
                <div key={agent.key}
                  onPointerDown={(e) => handlePointerDownNode(e, agent.key)}
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
        </div>}
      </main>
      )} {/* end canvas view */}

      {/* ── Calendar View ── */}
      {appView === 'calendar' && (
        <div className="fixed top-16 bottom-0 overflow-auto bg-[#fafafa] transition-all duration-700" style={{ left: isLeftPanelOpen ? 288 : 0, right: isRightPanelOpen ? 320 : 0 }}>
          {/* Calendar Header */}
          <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => { const d = new Date(calDate); if (calView==='day') d.setDate(d.getDate()-1); else if (calView==='week') d.setDate(d.getDate()-7); else d.setMonth(d.getMonth()-2); setCalDate(d); }} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">‹</button>
              <h2 className="text-base font-bold text-gray-900 min-w-56 text-center">
                {calView === 'day' && calDate.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'})}
                {calView === 'week' && (()=>{const s=new Date(calDate);s.setDate(s.getDate()-s.getDay());const e=new Date(s);e.setDate(e.getDate()+6);return `${s.toLocaleDateString(undefined,{month:'short',day:'numeric'})} – ${e.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}`;})()}
                {calView === 'bimonth' && (()=>{const m2=new Date(calDate);m2.setMonth(m2.getMonth()+1);return `${calDate.toLocaleDateString(undefined,{month:'long',year:'numeric'})} – ${m2.toLocaleDateString(undefined,{month:'long',year:'numeric'})}`;})()}
              </h2>
              <button onClick={() => { const d = new Date(calDate); if (calView==='day') d.setDate(d.getDate()+1); else if (calView==='week') d.setDate(d.getDate()+7); else d.setMonth(d.getMonth()+2); setCalDate(d); }} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">›</button>
              <button onClick={() => setCalDate(new Date())} className="px-3 py-1.5 rounded-xl border border-gray-200 text-[11px] font-bold text-gray-600 hover:bg-gray-50">Today</button>
            </div>
            <div className="flex items-center gap-0.5 bg-gray-100/70 rounded-xl p-1 border border-gray-200/50">
              {(['day','week','bimonth'] as const).map(v => (
                <button key={v} onClick={() => setCalView(v)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${calView===v?'bg-white shadow text-gray-800 border border-gray-200/60':'text-gray-500 hover:text-gray-700'}`}>
                  {v==='day'?'Day':v==='week'?'Week':'2 Months'}
                </button>
              ))}
            </div>
          </div>

          {/* ── Day View ── */}
          {calView === 'day' && (
            <div className="p-6">
              <div className="grid border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                {Array.from({length:24},(_,h) => (
                  <div key={h} className="flex min-h-[52px] border-b border-gray-100 last:border-0 hover:bg-gray-50/50 group">
                    <div className="w-16 shrink-0 px-3 py-2 text-[10px] font-bold text-gray-400 border-r border-gray-100">{h===0?'12 AM':h<12?`${h} AM`:h===12?'12 PM':`${h-12} PM`}</div>
                    <div className="flex-1 px-3 py-1.5 flex flex-wrap gap-1.5 items-start">
                      {agents.filter((a:any)=>{
                        if(a.triggerType!=='cron'||!a.operatingHours) return false;
                        const p=a.operatingHours.split(' ');
                        if(p.length>=2){const ch=parseInt(p[1]);return !isNaN(ch)&&ch===h;}
                        return false;
                      }).map((a:any)=>{
                        const ac=C[a.color]||C.gray;
                        return <span key={a.key} className={`text-[10px] font-bold px-2 py-1 rounded-lg ${ac.ic}`}>{a.icon} {a.label}</span>;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Week View ── */}
          {calView === 'week' && (()=>{
            const s=new Date(calDate);s.setDate(s.getDate()-s.getDay());
            const days=Array.from({length:7},(_,i)=>{const d=new Date(s);d.setDate(d.getDate()+i);return d;});
            const today=new Date();
            return(
              <div className="p-6">
                <div className="grid grid-cols-7 border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                  {days.map((day,di)=>{
                    const isToday=day.toDateString()===today.toDateString();
                    return(
                      <div key={di} className={`border-r border-gray-100 last:border-r-0 flex flex-col min-h-[480px] ${isToday?'bg-blue-50/30':''}`}>
                        <div className={`px-3 py-3 border-b border-gray-100 text-center ${isToday?'bg-blue-500':'bg-gray-50'}`}>
                          <p className={`text-[10px] font-bold uppercase tracking-widest ${isToday?'text-blue-100':'text-gray-400'}`}>{day.toLocaleDateString(undefined,{weekday:'short'})}</p>
                          <p className={`text-lg font-black ${isToday?'text-white':'text-gray-800'}`}>{day.getDate()}</p>
                        </div>
                        <div className="p-2 flex flex-col gap-1.5">
                          {agents.filter((a:any)=>{
                            if(a.triggerType!=='cron'||!a.operatingHours) return false;
                            const p=a.operatingHours.split(' ');
                            if(p.length>=5){const dw=p[4];if(dw==='*')return true;return dw.split('-').flatMap((x:string)=>isNaN(parseInt(x))?[]:[parseInt(x)]).includes(day.getDay());}
                            return true;
                          }).map((a:any)=>{
                            const ac=C[a.color]||C.gray;
                            return(<div key={a.key} className={`text-[10px] font-bold px-2 py-1.5 rounded-xl ${ac.ic} flex items-center gap-1.5 cursor-pointer hover:opacity-80`} onClick={()=>setModalAgent(a.key)}><span>{a.icon}</span><span className="truncate">{a.label}</span></div>);
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ── 2-Month View ── */}
          {calView === 'bimonth' && (
            <div className="p-6 grid grid-cols-2 gap-6">
              {[0,1].map(mo=>{
                const mDate=new Date(calDate.getFullYear(),calDate.getMonth()+mo,1);
                const dim=new Date(mDate.getFullYear(),mDate.getMonth()+1,0).getDate();
                const firstDow=mDate.getDay();
                const today=new Date();
                const cronAgents=agents.filter((a:any)=>a.triggerType==='cron');
                return(
                  <div key={mo} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-500 to-blue-600 px-5 py-4">
                      <h3 className="text-white font-black text-sm">{mDate.toLocaleDateString(undefined,{month:'long',year:'numeric'})}</h3>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-7 mb-2">{['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=>(<div key={d} className="text-center text-[9px] font-black text-gray-400 uppercase py-1">{d}</div>))}</div>
                      <div className="grid grid-cols-7 gap-y-1">
                        {Array.from({length:firstDow},(_,i)=><div key={`e${i}`}/>)}
                        {Array.from({length:dim},(_,i)=>{
                          const date=i+1;
                          const dayObj=new Date(mDate.getFullYear(),mDate.getMonth(),date);
                          const isToday=dayObj.toDateString()===today.toDateString();
                          const dotA=cronAgents.filter((a:any)=>{
                            if(!a.operatingHours)return true;
                            const p=a.operatingHours.split(' ');
                            if(p.length>=5){const dw=p[4];if(dw==='*')return true;return dw.split('-').flatMap((x:string)=>isNaN(parseInt(x))?[]:[parseInt(x)]).includes(dayObj.getDay());}
                            return true;
                          });
                          return(
                            <div key={date} className={`aspect-square flex flex-col items-center justify-center rounded-xl cursor-pointer hover:bg-gray-50 transition-all ${isToday?'bg-blue-500 hover:bg-blue-600':'text-gray-700'}`}>
                              <span className={`text-[11px] font-bold ${isToday?'text-white':''}`}>{date}</span>
                              {dotA.length>0&&<div className="flex gap-0.5 mt-0.5">{dotA.slice(0,3).map((a:any)=>{const ac=C[a.color]||C.gray;return<div key={a.key} className={`w-1 h-1 rounded-full ${ac.dot}`}/>;})} {dotA.length>3&&<div className="w-1 h-1 rounded-full bg-gray-400"/>}</div>}
                            </div>);
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )} {/* end calendar view */}

      {/* ── Chat Toolbar & Command Center ── */}
      <div 
        className={isChatMinimized 
          ? `fixed z-[60] flex items-center justify-center cursor-move touch-none drop-shadow-2xl hover:scale-105 transition-transform duration-200` 
          : `fixed bottom-6 left-[21rem] right-[21rem] z-[60] flex flex-col items-center pointer-events-none transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isLeftPanelOpen ? 'ml-6' : '-ml-20'} ${isRightPanelOpen ? 'mr-12' : '-mr-24'}`}
        style={isChatMinimized ? { left: chatPos.x, top: chatPos.y } : {}}
        onPointerDown={(e) => {
          if (!isChatMinimized) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          chatDragRef.current = { isDragging: true, startX: e.clientX, startY: e.clientY, offsetX: chatPos.x, offsetY: chatPos.y };
        }}
        onPointerMove={(e) => {
          if (!chatDragRef.current.isDragging) return;
          const dx = e.clientX - chatDragRef.current.startX;
          const dy = e.clientY - chatDragRef.current.startY;
          setChatPos({ x: chatDragRef.current.offsetX + dx, y: chatDragRef.current.offsetY + dy });
        }}
        onPointerUp={(e) => {
          if (!isChatMinimized) return;
          chatDragRef.current.isDragging = false;
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
      >
        {isChatMinimized ? (
          <button 
             onPointerDown={(e) => e.stopPropagation()}
             onDoubleClick={() => setIsChatMinimized(false)}
             className="relative flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-white/75 backdrop-blur-2xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_0_0_1px_rgba(255,255,255,0.5)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.18),0_0_30px_rgba(99,102,241,0.15)] hover:scale-105 active:scale-95 transition-all duration-200 group"
             title="Double-click to open Command Center"
          >
             {/* Subtle glow ring */}
             <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-400/0 to-violet-400/0 group-hover:from-indigo-400/10 group-hover:to-violet-400/10 transition-all duration-300" />
             <span className="text-base">⌘</span>
             <div className="flex flex-col items-start">
               <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest leading-none">Command</span>
               <span className="text-[9px] font-medium text-gray-400 leading-none mt-0.5">double-click</span>
             </div>
             {/* Animated glow dot */}
             <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.8)] animate-pulse ml-1" />
          </button>
        ) : (
          <>
            {/* Floating Tool Controls (Fit/Zoom) */}
            {showControls ? (
              <div className="pointer-events-auto flex items-center gap-1 mb-3 px-3 py-1.5 bg-gradient-to-t from-white/90 to-white/60 backdrop-blur-md border border-white/60 shadow-sm rounded-full opacity-50 hover:opacity-100 transition-opacity">
                 <button onClick={()=>setToolMode('move')} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${toolMode==='move'&&!isSpaceDown ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-white hover:text-gray-900'}`} title="Select (Arrow Tool)">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                 </button>
                 <button onClick={()=>setToolMode('pan')} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${toolMode==='pan'||isSpaceDown ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-white hover:text-gray-900'}`} title="Pan (Hold Space)">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" /></svg>
                 </button>
                 <div className="w-px h-4 bg-gray-300/50 mx-1"></div>
                 <button onClick={()=>{cameraRef.current={x:0, y:0, z:1}; flushCamera();}} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-white hover:text-gray-900 transition-all font-bold" title="Reset View (Scale 100%)">⌂</button>
                 <button onClick={()=>{cameraRef.current.z = Math.max(0.1, cameraRef.current.z-0.1); flushCamera();}} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-white hover:text-gray-900 transition-all font-bold text-lg" title="Zoom Out (Cmd -)">−</button>
                 <div className="w-10 flex items-center justify-center text-[9px] font-bold text-gray-400 select-none">{Math.round(zoom * 100)}%</div>
                 <button onClick={()=>{cameraRef.current.z = Math.min(3, cameraRef.current.z+0.1); flushCamera();}} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-white hover:text-gray-900 transition-all font-bold text-lg" title="Zoom In (Cmd +)">+</button>
                 <div className="w-px h-4 bg-gray-300/50 mx-1"></div>
                 <button onClick={()=>fitView()} className="px-2 h-8 rounded-full flex items-center justify-center text-[9px] font-bold text-gray-500 hover:bg-white hover:text-gray-900 transition-all uppercase tracking-widest" title="Fit Entire Org to Screen">Fit</button>
                 
                 {/* Hide Controls Button */}
                 <button onClick={()=>setShowControls(false)} className="ml-1 px-2 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all" title="Hide Canvas Controls">✕</button>
              </div>
            ) : (
              <div className="pointer-events-auto flex items-center gap-1 mb-3 px-2 py-1 bg-white/50 backdrop-blur-md border border-white/60 shadow-sm rounded-full opacity-30 hover:opacity-100 transition-opacity cursor-pointer group" onClick={()=>setShowControls(true)}>
                 <span className="text-[10px] text-gray-500 group-hover:text-blue-500 font-bold px-2">Show Canvas Tools</span>
              </div>
            )}

            {/* Chat Input Area */}
            <div className="pointer-events-auto w-full max-w-4xl bg-white/80 backdrop-blur-xl border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] rounded-[24px] p-2 flex flex-col gap-2 relative group">
              
              {/* Floating Minimize Button */}
              <button onClick={() => { setIsChatMinimized(true); setChatPos({ x: window.innerWidth/2 - 32, y: window.innerHeight - 100 }); }} 
                      className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:border-indigo-300 transition-all opacity-0 group-hover:opacity-100" 
                      title="Minimize to Command Center icon">
                 <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
              </button>

              <div className="flex items-end gap-2 px-2 mt-1">
                <div className="bg-gray-100/50 hover:bg-gray-100 rounded-xl px-3 py-1.5 flex items-center gap-2 cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                   <span className="text-gray-400 text-sm">🤖</span>
                   <select className="bg-transparent text-xs font-bold text-gray-700 outline-none cursor-pointer appearance-none pr-4 mix-blend-multiply">
                     <optgroup label="Fast / General">
                       <option>LFM2 24B A2B</option>
                       <option>Llama 3 8B Lite</option>
                       <option>OpenAI GPT OSS 20B</option>
                     </optgroup>
                     <optgroup label="Planning / Reasoning">
                       <option>Apriel 1.6 15B Thinker</option>
                       <option>DeepSeek R1 0528</option>
                     </optgroup>
                     <optgroup label="Heavy Compute">
                       <option>Llama 3.3 70B Turbo</option>
                       <option>Qwen3.5 72B (397B MoE)</option>
                     </optgroup>
                   </select>
                   <span className="text-[8px] text-gray-400 -ml-2 pointer-events-none">▼</span>
                </div>
                
                <div className="flex-1"></div>

                <button onClick={()=>setInstructionModalOpen(true)} className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors shrink-0">
                   📄 Browse Templates...
                </button>
              </div>

              <div className="relative flex items-end gap-2 px-2 pb-1">
                <div className="relative flex-1 bg-white border border-gray-200 rounded-2xl shadow-inner focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300 transition-all overflow-hidden flex items-end">
                   <label className={`shrink-0 h-12 w-12 flex items-center justify-center cursor-pointer text-gray-400 hover:text-blue-500 transition-colors ${uploading?'opacity-50':''}`} title="Attach File">
                     <input type="file" accept=".md,.txt" className="hidden" onChange={handleUpload} disabled={uploading}/>
                     {uploading ? <span className="animate-spin text-sm">⏳</span> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>}
                   </label>
                   <textarea 
                      value={activeInstruction}
                      onChange={(e)=>setActiveInstruction(e.target.value)}
                      onFocus={()=>setIsChatFocused(true)}
                      onBlur={()=>setIsChatFocused(false)}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                          e.preventDefault();
                          if (isConnected && pipelineState !== 'running' && activeInstruction) launchPipeline();
                        }
                      }}
                      className="flex-1 max-h-48 py-3.5 pr-4 bg-transparent outline-none resize-none text-sm text-gray-800 placeholder-gray-400 font-medium custom-scrollbar relative z-10"
                      placeholder="Tell the CEO what you want to build... (Cmd + Enter to send)"
                      rows={2}
                   />
                </div>
                <button onClick={launchPipeline} disabled={!isConnected||pipelineState==='running'||!activeInstruction.trim()}
                  className="shrink-0 h-12 w-12 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md disabled:opacity-50 flex items-center justify-center transition-all group">
                  {pipelineState==='running' ? <span className="animate-spin text-lg">⟳</span> : <svg className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Apple Intelligence / Siri Fullscreen Edge Glow */}
      <div className={`siri-intelligence-screen-edge ${isChatFocused || pipelineState === 'running' ? 'siri-intelligence-active' : ''}`} />

      {/* Right-click Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-[200] animate-in fade-in slide-in-from-bottom-2 duration-150"
          style={{ left: Math.min(contextMenu.x, window.innerWidth - 230), top: Math.min(contextMenu.y, window.innerHeight - 340) }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-56 bg-white/80 backdrop-blur-3xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.18),0_0_0_1px_rgba(255,255,255,0.6)] border border-white/70 p-1.5 flex flex-col gap-0.5">
            {/* Header */}
            <div className="px-3 py-2 mb-0.5">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.18em]">Canvas Options</p>
            </div>

            {/* Toggle Mode */}
            <button onClick={() => { setToolMode(toolMode === 'move' ? 'pan' : 'move'); setContextMenu(null); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-gray-50 transition-colors group w-full">
              <span className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 group-hover:bg-blue-100 transition-colors text-sm">
                {toolMode === 'move' ? '✋' : '↖️'}
              </span>
              <div className="flex-1">
                <p className="text-[12px] font-bold text-gray-800">{toolMode === 'move' ? 'Switch to Pan Mode' : 'Switch to Select Mode'}</p>
                <p className="text-[9px] text-gray-400 font-medium">or hold Space</p>
              </div>
              <kbd className="text-[8px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">H</kbd>
            </button>

            <div className="h-px bg-gray-100 mx-3 my-0.5" />

            {/* Hire Employee */}
            <button onClick={() => { setAddModalDiv(divisions[0]?.id); setContextMenu(null); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-gray-50 transition-colors group w-full">
              <span className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-100 transition-colors text-sm">👤</span>
              <div className="flex-1">
                <p className="text-[12px] font-bold text-gray-800">Hire Employee</p>
                <p className="text-[9px] text-gray-400 font-medium">Add agent to org</p>
              </div>
            </button>

            {/* Reset View */}
            <button onClick={() => { cameraRef.current={x:0,y:0,z:1}; flushCamera(); setContextMenu(null); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-gray-50 transition-colors group w-full">
              <span className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 group-hover:bg-gray-100 transition-colors text-base">⌂</span>
              <div className="flex-1">
                <p className="text-[12px] font-bold text-gray-800">Reset View</p>
                <p className="text-[9px] text-gray-400 font-medium">Back to 100%</p>
              </div>
            </button>

            {/* Fit View */}
            <button onClick={() => { fitView(); setContextMenu(null); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-gray-50 transition-colors group w-full">
              <span className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-100 transition-colors text-sm">🏠</span>
              <div className="flex-1">
                <p className="text-[12px] font-bold text-gray-800">Fit to Screen</p>
                <p className="text-[9px] text-gray-400 font-medium">Show all agents</p>
              </div>
            </button>

            <div className="h-px bg-gray-100 mx-3 my-0.5" />

            {/* Zoom In */}
            <button onClick={() => { cameraRef.current.z = Math.min(3, cameraRef.current.z + 0.25); flushCamera(); setContextMenu(null); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-gray-50 transition-colors group w-full">
              <span className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500 group-hover:bg-amber-100 transition-colors font-bold text-lg leading-none">+</span>
              <div className="flex-1">
                <p className="text-[12px] font-bold text-gray-800">Zoom In</p>
                <p className="text-[9px] text-gray-400 font-medium">Currently {Math.round(zoom * 100)}%</p>
              </div>
              <kbd className="text-[8px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">⌘+</kbd>
            </button>

            {/* Zoom Out */}
            <button onClick={() => { cameraRef.current.z = Math.max(0.1, cameraRef.current.z - 0.25); flushCamera(); setContextMenu(null); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-gray-50 transition-colors group w-full">
              <span className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500 group-hover:bg-amber-100 transition-colors font-bold text-lg leading-none">−</span>
              <div className="flex-1">
                <p className="text-[12px] font-bold text-gray-800">Zoom Out</p>
              </div>
              <kbd className="text-[8px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">⌘-</kbd>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
