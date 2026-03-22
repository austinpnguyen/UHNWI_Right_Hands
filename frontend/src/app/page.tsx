"use client";
import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const AGENT_CONFIG = [
  { key: 'CEO', label: 'The CEO', icon: '♟️', role: 'Master Plan Synthesizer', color: 'blue' },
  { key: 'CPO', label: 'The CPO', icon: '🛠️', role: 'System Architecture', color: 'purple' },
  { key: 'CFO', label: 'The CFO', icon: '📈', role: 'Financial Engineering', color: 'emerald' },
];

const COLOR_MAP: Record<string, { ring: string; badge: string; bg: string; dot: string; cursor: string; icon: string }> = {
  blue:    { ring: 'ring-blue-400 shadow-[0_0_30px_rgba(96,165,250,0.35)] border-blue-300',   badge: 'bg-blue-100 text-blue-600 ring-blue-300',   bg: 'bg-blue-50/60',   dot: 'bg-blue-500',    cursor: 'bg-blue-500',   icon: 'bg-blue-100' },
  purple:  { ring: 'ring-purple-400 shadow-[0_0_30px_rgba(167,139,250,0.35)] border-purple-300', badge: 'bg-purple-100 text-purple-600 ring-purple-300', bg: 'bg-purple-50/60', dot: 'bg-purple-500',  cursor: 'bg-purple-500', icon: 'bg-purple-100' },
  emerald: { ring: 'ring-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.35)] border-emerald-300', badge: 'bg-emerald-100 text-emerald-600 ring-emerald-300', bg: 'bg-emerald-50/60', dot: 'bg-emerald-500', cursor: 'bg-emerald-500', icon: 'bg-emerald-100' },
};

export default function Home() {
  const [logs, setLogs] = useState<{agent: string, msg: string}[]>([]);
  const [mandates, setMandates] = useState<string[]>([]);
  const [activeMandate, setActiveMandate] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<any>(null);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [agentStreams, setAgentStreams] = useState<Record<string, string>>({ CEO: '', CPO: '', CFO: '' });
  const [uploading, setUploading] = useState(false);
  const logsRef = useRef<HTMLDivElement>(null);
  const agentRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => { if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight; }, [logs]);
  useEffect(() => {
    Object.keys(agentRefs.current).forEach(k => {
      const el = agentRefs.current[k];
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, [agentStreams]);

  const refreshMandates = (sock: any) => sock.emit('get_mandates');

  useEffect(() => {
    const newSocket = io('http://localhost:8080');
    setSocket(newSocket);
    newSocket.on('connect', () => { setIsConnected(true); refreshMandates(newSocket); });
    newSocket.on('disconnect', () => setIsConnected(false));
    newSocket.on('mandates_list', (data: string[]) => {
      setMandates(data);
      if (data.length > 0) setActiveMandate(data[0]);
    });
    newSocket.on('agent_log', (data: {agent: string, msg: string}) => setLogs(p => [...p, data]));
    newSocket.on('agent_active', (data: {agent: string | null}) => {
      setActiveAgent(data.agent);
      if (data.agent) setAgentStreams(p => ({ ...p, [data.agent!]: '' }));
    });
    newSocket.on('agent_stream', (data: {agent: string, chunk: string}) => {
      setAgentStreams(p => ({ ...p, [data.agent]: p[data.agent] + data.chunk }));
    });
    newSocket.on('pipeline_complete', (data: {phase: string}) => {
      setLogs(p => [...p, { agent: 'System', msg: `✅ Pipeline [${data.phase.toUpperCase()}] complete.` }]);
      setActiveAgent(null);
    });
    return () => { newSocket.close(); };
  }, []);

  const triggerPipeline = () => {
    if (socket && activeMandate) socket.emit('trigger_pipeline', { phase: 'csuite', mandate: activeMandate });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    const form = new FormData();
    form.append('mandate', e.target.files[0]);
    try {
      const res = await fetch('http://localhost:8080/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (data.filename) {
        setLogs(p => [...p, { agent: 'System', msg: `📄 Mandate uploaded: ${data.filename}` }]);
        if (socket) refreshMandates(socket);
        setActiveMandate(data.filename);
      }
    } catch { setLogs(p => [...p, { agent: 'ERROR', msg: 'Upload failed. Is the backend running?' }]); }
    setUploading(false);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] font-sans relative overflow-x-hidden">
      {/* Gradient blobs */}
      <div className="fixed top-[-15%] left-[-10%] w-[600px] h-[600px] bg-blue-300 rounded-full mix-blend-multiply filter blur-[130px] opacity-35 animate-blob pointer-events-none z-0"/>
      <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-300 rounded-full mix-blend-multiply filter blur-[120px] opacity-35 animate-blob animation-delay-2000 pointer-events-none z-0"/>
      <div className="fixed bottom-[-20%] left-[20%] w-[700px] h-[700px] bg-pink-200 rounded-full mix-blend-multiply filter blur-[150px] opacity-25 animate-blob animation-delay-4000 pointer-events-none z-0"/>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 flex flex-col gap-6">

        {/* HEADER */}
        <header className="bg-white/75 backdrop-blur-2xl border border-white/50 shadow-sm rounded-3xl px-8 py-5 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-violet-600 to-pink-500">Dynasty OS</h1>
            <p className="text-xs font-semibold text-gray-400 mt-0.5 tracking-widest uppercase">Multi-Agent Orchestration Engine · V5</p>
          </div>
          <div className="flex items-center gap-2 bg-white/90 px-4 py-2 rounded-full border border-gray-100 shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"/>}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}/>
            </span>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{isConnected ? 'Online' : 'Offline'}</span>
          </div>
        </header>

        {/* TOP STRIP: Control + Live Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* CONTROL CENTER */}
          <div className="lg:col-span-4 bg-white/75 backdrop-blur-2xl border border-white/50 shadow-sm rounded-3xl p-6 flex flex-col gap-5">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest flex items-center gap-2"><span>⚡</span>Control Center</h2>

            {/* Upload */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Upload Mandate (.md / .txt)</label>
              <label className={`flex items-center justify-center gap-2 w-full border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-2xl py-4 cursor-pointer transition-all ${uploading ? 'opacity-60' : ''}`}>
                <input type="file" accept=".md,.txt" className="hidden" onChange={handleUpload} disabled={uploading}/>
                <span className="text-gray-400 text-sm">{uploading ? '⏳ Uploading…' : '📎 Drop or click to upload'}</span>
              </label>
            </div>

            {/* Select mandate */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Active Mandate</label>
              <div className="relative">
                <select value={activeMandate} onChange={e => setActiveMandate(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400 appearance-none shadow-sm font-medium transition-all">
                  {mandates.length > 0 ? mandates.map((m, i) => <option key={i}>{m}</option>) : <option>No mandates found</option>}
                </select>
                <span className="absolute inset-y-0 right-3 flex items-center text-gray-400 pointer-events-none">▾</span>
              </div>
            </div>

            {/* Launch */}
            <button onClick={triggerPipeline} disabled={!isConnected || activeAgent !== null || !activeMandate}
              className="mt-auto w-full py-4 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white rounded-2xl shadow-[0_8px_20px_rgba(99,102,241,0.35)] disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5 font-bold tracking-wide text-sm flex justify-between items-center px-5 group">
              <span>Launch Agent Chain</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>

          {/* LIVE ACTIVITY LOGS */}
          <div className="lg:col-span-8 bg-white/75 backdrop-blur-2xl border border-white/50 shadow-sm rounded-3xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest flex items-center gap-2"><span>📡</span>Live Activity</h2>
              <button onClick={() => navigator.clipboard.writeText(logs.map(l => `[${l.agent}] ${l.msg}`).join('\n'))}
                className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-blue-500 hover:border-blue-400 transition-colors shadow-sm">
                COPY LOGS
              </button>
            </div>
            <div ref={logsRef} className="flex-1 overflow-y-auto bg-gray-50/80 rounded-2xl border border-gray-100 p-4 font-mono text-xs space-y-2 shadow-inner min-h-[200px] max-h-[260px]">
              {logs.map((log, i) => (
                <div key={i} className={`leading-relaxed ${log.agent === 'ERROR' || log.agent === 'FATAL ERROR' ? 'text-red-500' : 'text-gray-500'}`}>
                  <span className="font-bold text-blue-500">[{log.agent}]</span> {log.msg}
                </div>
              ))}
              {logs.length === 0 && <div className="text-gray-400 text-center py-8">System idle. Upload or select a mandate and launch.</div>}
            </div>
          </div>
        </div>

        {/* SEQUENTIAL AGENT PANELS */}
        <div className="flex flex-col gap-6">
          {AGENT_CONFIG.map(({ key, label, icon, role, color }) => {
            const c = COLOR_MAP[color];
            const isActive = activeAgent === key;
            const hasDone = agentStreams[key].length > 0;
            return (
              <div key={key} className={`bg-white/75 backdrop-blur-2xl border rounded-3xl overflow-hidden transition-all duration-500 shadow-sm
                ${isActive ? `ring-2 scale-[1.005] ${c.ring}` : 'border-white/50 hover:shadow-md'}`}>
                {/* Agent header */}
                <div className={`px-6 py-4 flex items-center justify-between border-b border-gray-100 transition-colors duration-500 ${isActive ? c.bg : 'bg-white/30'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`${c.icon} p-2.5 rounded-2xl text-xl shadow-sm`}>{icon}</div>
                    <div>
                      <h3 className="font-bold text-gray-900 tracking-tight">{label}</h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{role}</p>
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
                {/* Markdown Output */}
                <div ref={(el) => { agentRefs.current[key] = el; }}
                  className="overflow-y-auto bg-white/40 px-8 py-6 max-h-[500px] prose prose-sm max-w-none text-gray-700 markdown-body">
                  {hasDone
                    ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{agentStreams[key]}</ReactMarkdown>
                    : <p className="text-gray-400 italic text-sm">{isActive ? 'Receiving data...' : (key === 'CEO' ? 'Launch Agent Chain to begin.' : `Waiting for ${AGENT_CONFIG[AGENT_CONFIG.findIndex(a=>a.key===key)-1]?.label} to finish.`)}</p>}
                  {isActive && <span className={`inline-block w-2 h-4 ml-1 align-middle rounded-sm animate-pulse ${c.cursor}`}/>}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
