"use client";
import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// All 16 agents positioned on the canvas
// Layout: Company (top), Inner Circle (mid-left), Market (mid-right), Shield (bottom)
const AGENTS = [
  // --- COMPANY ---
  { key: 'CEO',       label: 'CEO',              role: 'Master Plan',          icon: '♟️', color: 'blue',    div: 'company',      x: 460,  y: 30  },
  { key: 'CPO',       label: 'CPO',              role: 'Architecture',         icon: '🛠️', color: 'indigo',  div: 'company',      x: 60,   y: 170 },
  { key: 'CFO',       label: 'CFO',              role: 'Financials',           icon: '📈', color: 'emerald', div: 'company',      x: 280,  y: 170 },
  { key: 'CMO',       label: 'CMO',              role: 'Brand Strategy',       icon: '📣', color: 'pink',    div: 'company',      x: 500,  y: 170 },
  { key: 'COO',       label: 'COO',              role: 'Operations',           icon: '⚙️', color: 'orange',  div: 'company',      x: 720,  y: 170 },
  // --- INNER CIRCLE ---
  { key: 'COS',       label: 'Chief of Staff',   role: 'Exec Coordination',    icon: '📋', color: 'violet',  div: 'inner_circle', x: 60,   y: 350 },
  { key: 'CIO',       label: 'CIO',              role: 'Tech Infrastructure',  icon: '💻', color: 'blue',    div: 'inner_circle', x: 260,  y: 350 },
  { key: 'CISO',      label: 'CISO',             role: 'Security & Privacy',   icon: '🛡️', color: 'slate',   div: 'inner_circle', x: 460,  y: 350 },
  { key: 'FIXER',     label: 'The Fixer',        role: 'Crisis Resolution',    icon: '🔧', color: 'amber',   div: 'inner_circle', x: 660,  y: 350 },
  { key: 'WHISPERER', label: 'The Whisperer',    role: 'Intelligence & Recon', icon: '👁️', color: 'purple',  div: 'inner_circle', x: 860,  y: 350 },
  // --- MARKET ---
  { key: 'MKT_ANALYST',  label: 'Market Analyst',      role: 'Competitive Intel',   icon: '🔍', color: 'blue',    div: 'market', x: 60,   y: 530 },
  { key: 'COMPETITOR',   label: 'Competitor Sim',      role: 'Adversarial Model',   icon: '⚔️', color: 'red',     div: 'market', x: 260,  y: 530 },
  { key: 'TARGET_BUYER', label: 'Target Buyer',        role: 'Buyer Psychology',    icon: '🎯', color: 'emerald', div: 'market', x: 460,  y: 530 },
  { key: 'UNAWARE',      label: 'Unaware Audience',    role: 'Cold Market Sim',     icon: '🌐', color: 'gray',    div: 'market', x: 660,  y: 530 },
  // --- SHIELD ---
  { key: 'AUDITOR', label: 'Auditor', role: 'Financial Compliance', icon: '📊', color: 'amber', div: 'shield', x: 260, y: 710 },
  { key: 'CLO',     label: 'CLO',     role: 'Legal Strategy',       icon: '⚖️', color: 'slate', div: 'shield', x: 460, y: 710 },
];

// Edges flowing down through the hierarchy
const EDGES = [
  // CEO → C-Suite
  { from: 'CEO', to: 'CPO' }, { from: 'CEO', to: 'CFO' },
  { from: 'CEO', to: 'CMO' }, { from: 'CEO', to: 'COO' },
  // C-Suite → Inner Circle
  { from: 'CPO', to: 'CIO' }, { from: 'CFO', to: 'AUDITOR' }, { from: 'CFO', to: 'CLO' },
  { from: 'CMO', to: 'MKT_ANALYST' }, { from: 'CMO', to: 'COMPETITOR' }, { from: 'CMO', to: 'TARGET_BUYER' }, { from: 'CMO', to: 'UNAWARE' },
  { from: 'COO', to: 'COS' }, { from: 'COO', to: 'CISO' }, { from: 'COO', to: 'FIXER' }, { from: 'COO', to: 'WHISPERER' },
];

const NODE_W = 190;
const NODE_H = 85;
const CANVAS_W = 1100;
const CANVAS_H = 840;

const DIV_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  company:      { label: 'COMPANY',      icon: '🏛️', color: 'text-blue-400' },
  inner_circle: { label: 'INNER CIRCLE', icon: '🔐', color: 'text-violet-400' },
  market:       { label: 'MARKET',       icon: '📡', color: 'text-pink-400' },
  shield:       { label: 'SHIELD',       icon: '⚖️', color: 'text-amber-400' },
};

const COLORS: Record<string, { ring: string; glow: string; dot: string; badge: string; header: string; icon: string; edge: string }> = {
  blue:    { ring:'ring-blue-400',    glow:'shadow-[0_0_20px_rgba(96,165,250,0.5)]',    dot:'bg-blue-500',    badge:'bg-blue-100 text-blue-700',     header:'from-blue-50',    icon:'bg-blue-100 text-blue-600',    edge:'#60A5FA' },
  indigo:  { ring:'ring-indigo-400',  glow:'shadow-[0_0_20px_rgba(129,140,248,0.5)]',   dot:'bg-indigo-500',  badge:'bg-indigo-100 text-indigo-700',  header:'from-indigo-50',  icon:'bg-indigo-100 text-indigo-600', edge:'#818CF8' },
  emerald: { ring:'ring-emerald-400', glow:'shadow-[0_0_20px_rgba(52,211,153,0.5)]',    dot:'bg-emerald-500', badge:'bg-emerald-100 text-emerald-700', header:'from-emerald-50', icon:'bg-emerald-100 text-emerald-600',edge:'#34D399' },
  pink:    { ring:'ring-pink-400',    glow:'shadow-[0_0_20px_rgba(244,114,182,0.5)]',   dot:'bg-pink-500',    badge:'bg-pink-100 text-pink-700',     header:'from-pink-50',    icon:'bg-pink-100 text-pink-600',    edge:'#F472B6' },
  orange:  { ring:'ring-orange-400',  glow:'shadow-[0_0_20px_rgba(251,146,60,0.5)]',    dot:'bg-orange-500',  badge:'bg-orange-100 text-orange-700',  header:'from-orange-50',  icon:'bg-orange-100 text-orange-600', edge:'#FB923C' },
  violet:  { ring:'ring-violet-400',  glow:'shadow-[0_0_20px_rgba(167,139,250,0.5)]',   dot:'bg-violet-500',  badge:'bg-violet-100 text-violet-700',  header:'from-violet-50',  icon:'bg-violet-100 text-violet-600', edge:'#A78BFA' },
  purple:  { ring:'ring-purple-400',  glow:'shadow-[0_0_20px_rgba(192,132,252,0.5)]',   dot:'bg-purple-500',  badge:'bg-purple-100 text-purple-700',  header:'from-purple-50',  icon:'bg-purple-100 text-purple-600', edge:'#C084FC' },
  slate:   { ring:'ring-slate-400',   glow:'shadow-[0_0_20px_rgba(148,163,184,0.5)]',   dot:'bg-slate-500',   badge:'bg-slate-100 text-slate-700',    header:'from-slate-50',   icon:'bg-slate-100 text-slate-600',   edge:'#94A3B8' },
  amber:   { ring:'ring-amber-400',   glow:'shadow-[0_0_20px_rgba(251,191,36,0.5)]',    dot:'bg-amber-500',   badge:'bg-amber-100 text-amber-700',    header:'from-amber-50',   icon:'bg-amber-100 text-amber-600',   edge:'#FBBF24' },
  red:     { ring:'ring-red-400',     glow:'shadow-[0_0_20px_rgba(248,113,113,0.5)]',   dot:'bg-red-500',     badge:'bg-red-100 text-red-700',       header:'from-red-50',     icon:'bg-red-100 text-red-600',      edge:'#F87171' },
  gray:    { ring:'ring-gray-400',    glow:'shadow-[0_0_20px_rgba(156,163,175,0.5)]',   dot:'bg-gray-500',    badge:'bg-gray-100 text-gray-700',     header:'from-gray-50',    icon:'bg-gray-100 text-gray-600',    edge:'#9CA3AF' },
};

const ALL_KEYS  = AGENTS.map(a => a.key);
const agentMap  = Object.fromEntries(AGENTS.map(a => [a.key, a]));

export default function Home() {
  const [logs, setLogs]             = useState<{agent:string,msg:string}[]>([]);
  const [mandates, setMandates]     = useState<string[]>([]);
  const [activeMandate, setActiveMandate] = useState('');
  const [isConnected, setIsConnected]     = useState(false);
  const [socket, setSocket]               = useState<any>(null);
  const [activeAgents, setActiveAgents]   = useState<Set<string>>(new Set());
  const [completedAgents, setCompletedAgents] = useState<Set<string>>(new Set());
  const [agentStreams, setAgentStreams]    = useState<Record<string,string>>(Object.fromEntries(ALL_KEYS.map(k=>[k,''])));
  const [selectedAgent, setSelectedAgent] = useState<string|null>(null);
  const [uploading, setUploading]         = useState(false);
  const logsRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{ if(logsRef.current) logsRef.current.scrollTop=logsRef.current.scrollHeight; },[logs]);

  useEffect(()=>{
    const s = io('http://localhost:8080');
    setSocket(s);
    s.on('connect',    ()=>{ setIsConnected(true); s.emit('get_mandates'); });
    s.on('disconnect', ()=>setIsConnected(false));
    s.on('mandates_list',(data:string[])=>{ setMandates(data); if(data.length>0) setActiveMandate(data[0]); });
    s.on('agent_log',  (d:{agent:string,msg:string})=>setLogs(p=>[...p,d]));
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
    s.on('pipeline_complete',(d:{phase:string})=>{
      setLogs(p=>[...p,{agent:'System',msg:`Pipeline [${d.phase.toUpperCase()}] complete.`}]);
      setActiveAgents(new Set());
    });
    return ()=>{ s.close(); };
  },[]);

  const launchPipeline = ()=>{
    if(!socket||!activeMandate) return;
    setCompletedAgents(new Set());
    setActiveAgents(new Set());
    setAgentStreams(Object.fromEntries(ALL_KEYS.map(k=>[k,''])));
    setSelectedAgent(null);
    setLogs([]);
    socket.emit('trigger_pipeline',{phase:'csuite',mandate:activeMandate});
  };

  const handleUpload = async(e:React.ChangeEvent<HTMLInputElement>)=>{
    if(!e.target.files?.length) return;
    setUploading(true);
    const form=new FormData(); form.append('mandate',e.target.files[0]);
    try{
      const res=await fetch('http://localhost:8080/upload',{method:'POST',body:form});
      const d=await res.json();
      if(d.filename&&socket){ socket.emit('get_mandates'); setActiveMandate(d.filename); setLogs(p=>[...p,{agent:'System',msg:`Uploaded: ${d.filename}`}]); }
    }catch{ setLogs(p=>[...p,{agent:'ERROR',msg:'Upload failed.'}]); }
    setUploading(false); e.target.value='';
  };

  // Bezier from bottom-center of `from` to top-center of `to`
  const bezierPath = (from: typeof AGENTS[0], to: typeof AGENTS[0]) => {
    const x1 = from.x + NODE_W / 2, y1 = from.y + NODE_H;
    const x2 = to.x   + NODE_W / 2, y2 = to.y;
    const cy  = (y1 + y2) / 2;
    return `M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`;
  };

  const selectedDef = selectedAgent ? agentMap[selectedAgent] : null;

  return (
    <div className="min-h-screen bg-[#f5f5f7] font-sans relative overflow-x-hidden">
      {/* Ambient blobs */}
      <div className="fixed top-[-15%] left-[-10%]  w-[600px] h-[600px] bg-blue-200  rounded-full mix-blend-multiply filter blur-[130px] opacity-40 animate-blob pointer-events-none z-0"/>
      <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-200 rounded-full mix-blend-multiply filter blur-[120px] opacity-35 animate-blob animation-delay-2000 pointer-events-none z-0"/>
      <div className="fixed bottom-[-10%] left-[25%] w-[600px] h-[600px] bg-pink-100  rounded-full mix-blend-multiply filter blur-[150px] opacity-25 animate-blob animation-delay-4000 pointer-events-none z-0"/>

      <div className="relative z-10 max-w-screen-2xl mx-auto px-6 py-8 flex flex-col gap-6">

        {/* Header */}
        <header className="bg-white/80 backdrop-blur-2xl border border-white/60 shadow-sm rounded-3xl px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-violet-500 to-pink-500">Dynasty OS</h1>
            <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mt-0.5">Execution Canvas · V9 · 16 agents</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/90 px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
              <span className="relative flex h-2 w-2">
                {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"/>}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected?'bg-green-500':'bg-red-400'}`}/>
              </span>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{isConnected?'Live':'Offline'}</span>
            </div>
            {activeAgents.size>0 && (
              <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"/>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{activeAgents.size} running</span>
              </div>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

          {/* Left Sidebar */}
          <div className="xl:col-span-3 flex flex-col gap-5">

            <div className="bg-white/80 backdrop-blur-2xl border border-white/60 shadow-sm rounded-3xl p-5 flex flex-col gap-4">
              <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">⚡ Control Center</h2>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Upload Mandate</label>
                <label className={`flex items-center justify-center gap-2 w-full border-2 border-dashed border-gray-200 hover:border-blue-300 rounded-2xl py-3.5 cursor-pointer transition-all text-xs text-gray-400 ${uploading?'opacity-60':''}`}>
                  <input type="file" accept=".md,.txt" className="hidden" onChange={handleUpload} disabled={uploading}/>
                  {uploading?'⏳ Uploading…':'📎 Drop or click to upload'}
                </label>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Active Mandate</label>
                <div className="relative">
                  <select value={activeMandate} onChange={e=>setActiveMandate(e.target.value)}
                    className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-300 appearance-none shadow-sm font-medium">
                    {mandates.length>0?mandates.map((m,i)=><option key={i}>{m}</option>):<option>No mandates found</option>}
                  </select>
                  <span className="absolute inset-y-0 right-2 flex items-center text-gray-400 pointer-events-none">▾</span>
                </div>
              </div>

              <button onClick={launchPipeline}
                disabled={!isConnected||activeAgents.size>0||!activeMandate}
                className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white rounded-2xl shadow-[0_8px_20px_rgba(99,102,241,0.25)] disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5 font-bold text-xs tracking-wide flex justify-between items-center px-4 group">
                <span>{activeAgents.size>0?`${activeAgents.size} agents running…`:'Launch Agent Chain'}</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>

            {/* Log panel */}
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

            {/* Division legend */}
            <div className="bg-white/80 backdrop-blur-2xl border border-white/60 shadow-sm rounded-3xl p-5">
              <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">🏢 Divisions</h2>
              <div className="space-y-2">
                {Object.entries(DIV_LABELS).map(([key, d])=>(
                  <div key={key} className="flex items-center gap-2">
                    <span>{d.icon}</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${d.color}`}>{d.label}</span>
                    <span className="text-[10px] text-gray-400 ml-auto">
                      {AGENTS.filter(a=>a.div===key).length} agents
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Canvas + Output */}
          <div className="xl:col-span-9 flex flex-col gap-5">

            {/* Canvas */}
            <div className="bg-white/80 backdrop-blur-2xl border border-white/60 shadow-sm rounded-3xl overflow-hidden relative">
              <div className="absolute inset-0 opacity-25" style={{backgroundImage:'radial-gradient(circle, #d1d5db 1px, transparent 1px)',backgroundSize:'28px 28px'}}/>

              {/* Division row labels */}
              <div className="absolute top-0 left-0 w-full pointer-events-none z-20">
                {[
                  { label:'🏛️ COMPANY',      top: 28,  color:'#3B82F6' },
                  { label:'🔐 INNER CIRCLE',  top: 205, color:'#7C3AED' },
                  { label:'📡 MARKET',         top: 385, color:'#EC4899' },
                  { label:'⚖️ SHIELD',         top: 566, color:'#D97706' },
                ].map(row=>(
                  <div key={row.label} className="absolute left-3 text-[9px] font-black uppercase tracking-widest opacity-40"
                    style={{top:row.top, color:row.color}}>{row.label}</div>
                ))}
              </div>

              <div className="relative overflow-auto p-6" style={{minHeight: CANVAS_H + 48}}>
                <svg width={CANVAS_W} height={CANVAS_H} className="absolute top-6 left-6 pointer-events-none z-10">
                  <style>{`@keyframes dash{to{stroke-dashoffset:-24}}`}</style>
                  {EDGES.map(edge=>{
                    const from = agentMap[edge.from], to = agentMap[edge.to];
                    const c = COLORS[to.color];
                    const isActive = activeAgents.has(edge.to);
                    const isDone   = completedAgents.has(edge.to);
                    return (
                      <path key={`${edge.from}-${edge.to}`}
                        d={bezierPath(from, to)}
                        fill="none"
                        stroke={isActive||isDone ? c.edge : '#E5E7EB'}
                        strokeWidth={isActive ? 2.5 : 1.5}
                        strokeDasharray={isActive ? "8 4" : undefined}
                        strokeLinecap="round"
                        style={isActive ? {animation:'dash 0.6s linear infinite'} : {}}
                      />
                    );
                  })}
                </svg>

                {/* Node cards */}
                <div className="relative z-20" style={{width:CANVAS_W, height:CANVAS_H}}>
                  {AGENTS.map(agent=>{
                    const c          = COLORS[agent.color];
                    const isActive   = activeAgents.has(agent.key);
                    const isDone     = completedAgents.has(agent.key);
                    const isSelected = selectedAgent === agent.key;
                    const hasOutput  = agentStreams[agent.key].length > 0;
                    return (
                      <div key={agent.key}
                        onClick={()=>setSelectedAgent(isSelected?null:agent.key)}
                        className={`absolute cursor-pointer rounded-2xl border bg-white transition-all duration-300 select-none
                          ${isActive   ? `ring-2 ${c.ring} ${c.glow} border-transparent scale-105 z-30` : ''}
                          ${isSelected && !isActive ? `ring-2 ${c.ring} border-transparent z-30` : ''}
                          ${!isActive  ? 'border-gray-200 hover:border-gray-300 hover:shadow-md' : ''}
                          shadow-sm
                        `}
                        style={{left:agent.x, top:agent.y, width:NODE_W, height:NODE_H}}>
                        <div className={`flex items-center justify-between px-3 pt-2.5 pb-1.5 rounded-t-2xl bg-gradient-to-b ${c.header} to-transparent`}>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm w-6 h-6 flex items-center justify-center rounded-xl ${c.icon}`}>{agent.icon}</span>
                            <span className="font-bold text-gray-900 text-xs">{agent.label}</span>
                          </div>
                          {isActive  && <span className={`h-2 w-2 rounded-full animate-pulse ${c.dot}`}/>}
                          {isDone && !isActive && <span className="text-emerald-500 text-[10px] font-bold">✓</span>}
                        </div>
                        <div className="px-3 pb-2.5">
                          <p className="text-[10px] text-gray-400 font-semibold truncate">{agent.role}</p>
                          {isActive && (
                            <div className="mt-1 h-0.5 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full w-3/5 rounded-full ${c.dot} opacity-70 animate-pulse`}/>
                            </div>
                          )}
                          {isDone && !isActive && <p className="text-[10px] text-emerald-500 font-bold mt-0.5">Done · click to read</p>}
                          {!isActive && !isDone && <p className="text-[10px] text-gray-300 mt-0.5">Idle</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Output panel — appears when a node is clicked */}
            {selectedDef && (
              <div className={`bg-white/80 backdrop-blur-2xl border border-white/60 shadow-sm rounded-3xl overflow-hidden transition-all
                ${activeAgents.has(selectedDef.key) ? `ring-2 ${COLORS[selectedDef.color].ring}` : ''}`}>
                <div className={`px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-b ${COLORS[selectedDef.color].header} to-transparent`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-xl w-9 h-9 flex items-center justify-center rounded-2xl shadow-sm ${COLORS[selectedDef.color].icon}`}>{selectedDef.icon}</span>
                    <div>
                      <h3 className="font-bold text-gray-900">{selectedDef.label}</h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{selectedDef.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeAgents.has(selectedDef.key) && (
                      <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase px-3 py-1.5 rounded-full animate-pulse ${COLORS[selectedDef.color].badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${COLORS[selectedDef.color].dot}`}/>Thinking
                      </span>
                    )}
                    <button onClick={()=>setSelectedAgent(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
                  </div>
                </div>
                <div className="overflow-y-auto px-8 py-6 max-h-[65vh] prose prose-sm max-w-none text-gray-700 markdown-body bg-white/40">
                  {agentStreams[selectedDef.key]
                    ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{agentStreams[selectedDef.key]}</ReactMarkdown>
                    : <p className="text-gray-400 italic text-sm">This agent has not run in the current pipeline. Launch Agent Chain to activate the C-Suite pipeline.</p>
                  }
                  {activeAgents.has(selectedDef.key) && (
                    <span className={`inline-block w-2 h-4 ml-1 align-middle rounded-sm animate-pulse ${COLORS[selectedDef.color].dot}`}/>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
