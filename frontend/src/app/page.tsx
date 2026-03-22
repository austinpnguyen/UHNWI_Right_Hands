"use client";
import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ─── Full Agent Hierarchy (mirrors /agents/ folder) ────────────────────
const HIERARCHY = [
  {
    division: 'COMPANY',
    icon: '🏛️',
    agents: [
      { key: 'CEO', label: 'CEO', role: 'Master Plan Synthesizer', icon: '♟️', color: 'blue',   file: 'ceo.md' },
      { key: 'CPO', label: 'CPO', role: 'System Architecture',     icon: '🛠️', color: 'indigo', file: 'cpo.md', parent: 'CEO' },
      { key: 'CFO', label: 'CFO', role: 'Financial Engineering',   icon: '📈', color: 'emerald',file: 'cfo.md', parent: 'CEO' },
      { key: 'CMO', label: 'CMO', role: 'Brand & Market Strategy', icon: '📣', color: 'pink',   file: 'cmo.md', parent: 'CEO' },
      { key: 'COO', label: 'COO', role: 'Operational Logistics',   icon: '⚙️', color: 'orange', file: 'coo.md', parent: 'CEO' },
    ],
  },
  {
    division: 'INNER CIRCLE',
    icon: '🔐',
    agents: [
      { key: 'COS',        label: 'Chief of Staff', role: 'Strategic Execution',  icon: '📋', color: 'violet' },
      { key: 'CIO',        label: 'CIO',            role: 'Tech Infrastructure',   icon: '💻', color: 'blue' },
      { key: 'CISO',       label: 'CISO',           role: 'Security & Privacy',    icon: '🛡️', color: 'slate' },
      { key: 'FIXER',      label: 'The Fixer',      role: 'Crisis Resolution',     icon: '🔧', color: 'amber' },
      { key: 'WHISPERER',  label: 'The Whisperer',  role: 'Intelligence & Recon',  icon: '👁️', color: 'purple' },
    ],
  },
  {
    division: 'MARKET',
    icon: '📡',
    agents: [
      { key: 'MARKET_ANALYST',   label: 'Market Analyst',      role: 'Competitive Intelligence', icon: '🔍', color: 'blue' },
      { key: 'COMPETITOR_SIM',   label: 'Competitor Simulator', role: 'Adversarial Modelling',   icon: '⚔️', color: 'red' },
      { key: 'TARGET_BUYER',     label: 'Target Buyer',         role: 'Buyer Psychology',         icon: '🎯', color: 'emerald' },
      { key: 'UNAWARE_AUDIENCE', label: 'Unaware Audience',     role: 'Cold Market Simulation',   icon: '🌐', color: 'gray' },
    ],
  },
  {
    division: 'SHIELD',
    icon: '⚖️',
    agents: [
      { key: 'AUDITOR', label: 'Auditor', role: 'Financial Compliance',    icon: '📊', color: 'amber' },
      { key: 'CLO',     label: 'CLO',     role: 'Legal Strategy & Risk',   icon: '⚖️', color: 'slate' },
    ],
  },
];

// All agents flattened for stream state initialization
const ALL_AGENT_KEYS = HIERARCHY.flatMap(d => d.agents.map(a => a.key));
const ACTIVE_PIPELINE_KEYS = ['CEO', 'CPO', 'CFO']; // C-Suite pipeline agents

const COLOR_VARIANTS: Record<string, { activeBorder: string; activeBg: string; badge: string; dot: string; cursor: string; icon: string }> = {
  blue:    { activeBorder: 'ring-blue-400 border-blue-300 shadow-[0_0_25px_rgba(96,165,250,0.4)]',    activeBg: 'bg-blue-50/60',    badge: 'bg-blue-100 text-blue-700 ring-blue-200',    dot: 'bg-blue-500',    cursor: 'bg-blue-500',    icon: 'bg-blue-100 text-blue-600' },
  indigo:  { activeBorder: 'ring-indigo-400 border-indigo-300 shadow-[0_0_25px_rgba(129,140,248,0.4)]', activeBg: 'bg-indigo-50/60', badge: 'bg-indigo-100 text-indigo-700 ring-indigo-200', dot: 'bg-indigo-500', cursor: 'bg-indigo-500', icon: 'bg-indigo-100 text-indigo-600' },
  emerald: { activeBorder: 'ring-emerald-400 border-emerald-300 shadow-[0_0_25px_rgba(52,211,153,0.4)]', activeBg: 'bg-emerald-50/60', badge: 'bg-emerald-100 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', cursor: 'bg-emerald-500', icon: 'bg-emerald-100 text-emerald-600' },
  pink:    { activeBorder: 'ring-pink-400 border-pink-300 shadow-[0_0_25px_rgba(244,114,182,0.4)]',    activeBg: 'bg-pink-50/60',    badge: 'bg-pink-100 text-pink-700 ring-pink-200',    dot: 'bg-pink-500',    cursor: 'bg-pink-500',    icon: 'bg-pink-100 text-pink-600' },
  orange:  { activeBorder: 'ring-orange-400 border-orange-300 shadow-[0_0_25px_rgba(251,146,60,0.4)]',  activeBg: 'bg-orange-50/60',  badge: 'bg-orange-100 text-orange-700 ring-orange-200',  dot: 'bg-orange-500',  cursor: 'bg-orange-500',  icon: 'bg-orange-100 text-orange-600' },
  violet:  { activeBorder: 'ring-violet-400 border-violet-300 shadow-[0_0_25px_rgba(167,139,250,0.4)]', activeBg: 'bg-violet-50/60', badge: 'bg-violet-100 text-violet-700 ring-violet-200', dot: 'bg-violet-500', cursor: 'bg-violet-500', icon: 'bg-violet-100 text-violet-600' },
  purple:  { activeBorder: 'ring-purple-400 border-purple-300 shadow-[0_0_25px_rgba(192,132,252,0.4)]', activeBg: 'bg-purple-50/60', badge: 'bg-purple-100 text-purple-700 ring-purple-200', dot: 'bg-purple-500', cursor: 'bg-purple-500', icon: 'bg-purple-100 text-purple-600' },
  slate:   { activeBorder: 'ring-slate-400 border-slate-300 shadow-[0_0_25px_rgba(148,163,184,0.4)]',  activeBg: 'bg-slate-50/60',  badge: 'bg-slate-100 text-slate-700 ring-slate-200',  dot: 'bg-slate-500',  cursor: 'bg-slate-500',  icon: 'bg-slate-100 text-slate-600' },
  amber:   { activeBorder: 'ring-amber-400 border-amber-300 shadow-[0_0_25px_rgba(251,191,36,0.4)]',   activeBg: 'bg-amber-50/60',   badge: 'bg-amber-100 text-amber-700 ring-amber-200',   dot: 'bg-amber-500',   cursor: 'bg-amber-500',   icon: 'bg-amber-100 text-amber-600' },
  red:     { activeBorder: 'ring-red-400 border-red-300 shadow-[0_0_25px_rgba(248,113,113,0.4)]',      activeBg: 'bg-red-50/60',     badge: 'bg-red-100 text-red-700 ring-red-200',      dot: 'bg-red-500',     cursor: 'bg-red-500',     icon: 'bg-red-100 text-red-600' },
  gray:    { activeBorder: 'ring-gray-400 border-gray-300 shadow-[0_0_25px_rgba(156,163,175,0.4)]',    activeBg: 'bg-gray-50/60',    badge: 'bg-gray-100 text-gray-700 ring-gray-200',    dot: 'bg-gray-500',    cursor: 'bg-gray-500',    icon: 'bg-gray-100 text-gray-600' },
};

export default function Home() {
  const [logs, setLogs] = useState<{agent: string, msg: string}[]>([]);
  const [mandates, setMandates] = useState<string[]>([]);
  const [activeMandate, setActiveMandate] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<any>(null);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [agentStreams, setAgentStreams] = useState<Record<string, string>>(Object.fromEntries(ALL_AGENT_KEYS.map(k => [k, ''])));
  const [completedAgents, setCompletedAgents] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const logsRef = useRef<HTMLDivElement>(null);
  const agentRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => { if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight; }, [logs]);
  useEffect(() => {
    const el = activeAgent ? agentRefs.current[activeAgent] : null;
    if (el) el.scrollTop = el.scrollHeight;
  }, [agentStreams, activeAgent]);

  useEffect(() => {
    const s = io('http://localhost:8080');
    setSocket(s);
    s.on('connect', () => { setIsConnected(true); s.emit('get_mandates'); });
    s.on('disconnect', () => setIsConnected(false));
    s.on('mandates_list', (data: string[]) => { setMandates(data); if (data.length > 0) setActiveMandate(data[0]); });
    s.on('agent_log', (data: {agent: string, msg: string}) => setLogs(p => [...p, data]));
    s.on('agent_active', (data: {agent: string | null}) => {
      setActiveAgent(data.agent);
      if (data.agent) setAgentStreams(p => ({ ...p, [data.agent!]: '' }));
    });
    s.on('agent_stream', (data: {agent: string, chunk: string}) =>
      setAgentStreams(p => ({ ...p, [data.agent]: p[data.agent] + data.chunk })));
    s.on('pipeline_complete', (data: {phase: string}) => {
      setLogs(p => [...p, { agent: 'System', msg: `✅ Pipeline [${data.phase.toUpperCase()}] complete.` }]);
      setActiveAgent(null);
      setCompletedAgents(p => new Set([...p, ...ACTIVE_PIPELINE_KEYS]));
    });
    return () => { s.close(); };
  }, []);

  const triggerPipeline = () => {
    if (socket && activeMandate) {
      setCompletedAgents(new Set());
      setAgentStreams(Object.fromEntries(ALL_AGENT_KEYS.map(k => [k, ''])));
      socket.emit('trigger_pipeline', { phase: 'csuite', mandate: activeMandate });
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    const form = new FormData();
    form.append('mandate', e.target.files[0]);
    try {
      const res = await fetch('http://localhost:8080/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (data.filename && socket) { socket.emit('get_mandates'); setActiveMandate(data.filename); setLogs(p => [...p, { agent: 'System', msg: `📄 Mandate uploaded: ${data.filename}` }]); }
    } catch { setLogs(p => [...p, { agent: 'ERROR', msg: 'Upload failed.' }]); }
    setUploading(false);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] font-sans relative overflow-x-hidden">
      {/* Blobs */}
      <div className="fixed top-[-15%] left-[-10%] w-[600px] h-[600px] bg-blue-300 rounded-full mix-blend-multiply filter blur-[130px] opacity-30 animate-blob pointer-events-none z-0"/>
      <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-300 rounded-full mix-blend-multiply filter blur-[120px] opacity-30 animate-blob animation-delay-2000 pointer-events-none z-0"/>
      <div className="fixed bottom-[-20%] left-[25%] w-[700px] h-[700px] bg-pink-200 rounded-full mix-blend-multiply filter blur-[150px] opacity-20 animate-blob animation-delay-4000 pointer-events-none z-0"/>

      <div className="relative z-10 max-w-screen-2xl mx-auto px-4 py-8 flex flex-col gap-6">

        {/* HEADER */}
        <header className="bg-white/75 backdrop-blur-2xl border border-white/50 shadow-sm rounded-3xl px-8 py-5 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-violet-600 to-pink-500">Dynasty OS</h1>
            <p className="text-xs font-semibold text-gray-400 mt-0.5 tracking-widest uppercase">Multi-Agent Orchestration Engine · V6</p>
          </div>
          <div className="flex items-center gap-2 bg-white/90 px-4 py-2 rounded-full border border-gray-100 shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"/>}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}/>
            </span>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{isConnected ? 'Online' : 'Offline'}</span>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

          {/* ── LEFT SIDEBAR: Hierarchy + Controls ── */}
          <div className="xl:col-span-3 flex flex-col gap-5">

            {/* Control Center */}
            <div className="bg-white/75 backdrop-blur-2xl border border-white/50 shadow-sm rounded-3xl p-5 flex flex-col gap-4">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><span>⚡</span>Control Center</h2>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Upload Mandate (.md / .txt)</label>
                <label className={`flex items-center justify-center gap-2 w-full border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-2xl py-3.5 cursor-pointer transition-all ${uploading ? 'opacity-60' : ''}`}>
                  <input type="file" accept=".md,.txt" className="hidden" onChange={handleUpload} disabled={uploading}/>
                  <span className="text-gray-400 text-xs">{uploading ? '⏳ Uploading…' : '📎 Drop or click to upload'}</span>
                </label>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Active Mandate</label>
                <div className="relative">
                  <select value={activeMandate} onChange={e => setActiveMandate(e.target.value)}
                    className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-400 appearance-none shadow-sm font-medium">
                    {mandates.length > 0 ? mandates.map((m, i) => <option key={i}>{m}</option>) : <option>No mandates found</option>}
                  </select>
                  <span className="absolute inset-y-0 right-2 flex items-center text-gray-400 pointer-events-none text-xs">▾</span>
                </div>
              </div>

              <button onClick={triggerPipeline} disabled={!isConnected || activeAgent !== null || !activeMandate}
                className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white rounded-2xl shadow-[0_8px_20px_rgba(99,102,241,0.3)] disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5 font-bold text-xs tracking-wide flex justify-between items-center px-4 group">
                <span>Launch Agent Chain</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>

            {/* Org Hierarchy Tree */}
            <div className="bg-white/75 backdrop-blur-2xl border border-white/50 shadow-sm rounded-3xl p-5">
              <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><span>🏢</span>Org Chart</h2>
              <div className="space-y-5 font-mono text-xs">
                {HIERARCHY.map(div => (
                  <div key={div.division}>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <span>{div.icon}</span> {div.division}
                    </div>
                    <div className="space-y-1 pl-1">
                      {div.agents.map((agent, idx) => {
                        const isActive = activeAgent === agent.key;
                        const isDone = completedAgents.has(agent.key);
                        const isChild = !!agent.parent;
                        const c = COLOR_VARIANTS[agent.color] || COLOR_VARIANTS.gray;
                        return (
                          <div key={agent.key} className={`flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all duration-300 ${isActive ? `${c.activeBg} ring-1 ${c.activeBorder}` : 'hover:bg-gray-50'}`}>
                            <span className="text-gray-300 select-none">{isChild ? '|_ ' : '└ '}</span>
                            <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] flex-shrink-0 ${c.icon}`}>{agent.icon}</span>
                            <span className={`font-bold transition-colors ${isActive ? 'text-gray-900' : isDone ? 'text-emerald-600' : 'text-gray-500'}`}>{agent.label}</span>
                            {isActive && <span className={`ml-auto h-2 w-2 rounded-full animate-pulse ${c.dot}`}/>}
                            {isDone && !isActive && <span className="ml-auto text-emerald-500 text-[10px]">✓</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Activity Log */}
            <div className="bg-white/75 backdrop-blur-2xl border border-white/50 shadow-sm rounded-3xl p-5 flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><span>📡</span>Live Activity</h2>
                <button onClick={() => navigator.clipboard.writeText(logs.map(l => `[${l.agent}] ${l.msg}`).join('\n'))}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-blue-500 hover:border-blue-300 transition-colors shadow-sm">
                  COPY
                </button>
              </div>
              <div ref={logsRef} className="overflow-y-auto bg-gray-50/80 rounded-2xl border border-gray-100 p-3 font-mono text-[11px] space-y-2 shadow-inner max-h-[300px]">
                {logs.map((log, i) => (
                  <div key={i} className={`leading-relaxed ${log.agent === 'ERROR' || log.agent === 'FATAL ERROR' ? 'text-red-500' : 'text-gray-500'}`}>
                    <span className="font-bold text-blue-500">[{log.agent}]</span> {log.msg}
                  </div>
                ))}
                {logs.length === 0 && <div className="text-gray-400 text-center py-6 text-[11px]">Idle. Launch to begin.</div>}
              </div>
            </div>

          </div>

          {/* ── RIGHT: Sequential Agent Output Panels ── */}
          <div className="xl:col-span-9 flex flex-col gap-5">
            {/* Only show active pipeline agents that have been touched */}
            {ACTIVE_PIPELINE_KEYS.map(key => {
              const agentDef = HIERARCHY[0].agents.find(a => a.key === key)!;
              const isActive = activeAgent === key;
              const hasDone = agentStreams[key].length > 0;
              const c = COLOR_VARIANTS[agentDef.color];
              return (
                <div key={key} className={`bg-white/75 backdrop-blur-2xl border rounded-3xl overflow-hidden transition-all duration-500 shadow-sm
                  ${isActive ? `ring-2 scale-[1.003] ${c.activeBorder}` : 'border-white/50 hover:shadow-md'}`}>
                  <div className={`px-6 py-4 flex items-center justify-between border-b border-gray-100 transition-colors duration-500 ${isActive ? c.activeBg : 'bg-white/30'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`${c.icon} p-2.5 rounded-2xl text-xl shadow-sm`}>{agentDef.icon}</div>
                      <div>
                        <h3 className="font-bold text-gray-900 tracking-tight">{agentDef.label}</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{agentDef.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isActive && (
                        <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full ring-1 animate-pulse ${c.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${c.dot}`}/>Thinking
                        </span>
                      )}
                      {hasDone && !isActive && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full ring-1 ring-emerald-200">✓ Done</span>}
                    </div>
                  </div>
                  <div ref={el => { agentRefs.current[key] = el; }}
                    className="overflow-y-auto bg-white/40 px-8 py-6 max-h-[60vh] prose prose-sm max-w-none text-gray-700 markdown-body">
                    {hasDone
                      ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{agentStreams[key]}</ReactMarkdown>
                      : <p className="text-gray-400 italic text-sm">
                          {key === 'CEO' ? 'Launch Agent Chain to begin.' : `Awaiting ${ACTIVE_PIPELINE_KEYS[ACTIVE_PIPELINE_KEYS.indexOf(key)-1]} to complete.`}
                        </p>
                    }
                    {isActive && <span className={`inline-block w-2 h-4 ml-1 align-middle rounded-sm animate-pulse ${c.cursor}`}/>}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
