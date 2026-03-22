"use client";
import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

export default function Home() {
  const [logs, setLogs] = useState<{agent: string, msg: string}[]>([]);
  const [mandates, setMandates] = useState<string[]>([]);
  const [activeMandate, setActiveMandate] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<any>(null);
  
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [agentStreams, setAgentStreams] = useState<Record<string, string>>({
    'CEO': '', 'CPO': '', 'CFO': ''
  });
  
  const ceoRef = useRef<HTMLDivElement>(null);
  const cpoRef = useRef<HTMLDivElement>(null);
  const cfoRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (ceoRef.current) ceoRef.current.scrollTop = ceoRef.current.scrollHeight; }, [agentStreams['CEO']]);
  useEffect(() => { if (cpoRef.current) cpoRef.current.scrollTop = cpoRef.current.scrollHeight; }, [agentStreams['CPO']]);
  useEffect(() => { if (cfoRef.current) cfoRef.current.scrollTop = cfoRef.current.scrollHeight; }, [agentStreams['CFO']]);

  useEffect(() => {
    const newSocket = io('http://localhost:8080');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('get_mandates');
    });

    newSocket.on('disconnect', () => setIsConnected(false));

    newSocket.on('mandates_list', (data) => {
      setMandates(data);
      if (data.length > 0) setActiveMandate(data[0]);
    });

    newSocket.on('agent_log', (data) => setLogs((prev) => [...prev, data]));

    newSocket.on('agent_active', (data) => {
      setActiveAgent(data.agent);
      if (data.agent) setAgentStreams((prev) => ({ ...prev, [data.agent]: '' }));
    });

    newSocket.on('agent_stream', (data) => {
      setAgentStreams((prev) => ({ ...prev, [data.agent]: prev[data.agent] + data.chunk }));
    });

    newSocket.on('pipeline_complete', (data) => {
      setLogs((prev) => [...prev, { agent: 'System', msg: `--- Pipeline [${data.phase.toUpperCase()}] Halted ---` }]);
      setActiveAgent(null);
    });

    return () => { newSocket.close(); };
  }, []);

  const triggerPipeline = (phase: string) => {
    if (socket) socket.emit('trigger_pipeline', { phase, mandate: activeMandate });
  };

  const getNodeClass = (agentName: string) => {
      const isActive = activeAgent === agentName;
      return `flex flex-col overflow-hidden transition-all duration-500 rounded-3xl border bg-white/60 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.04)] 
             ${isActive ? 'ring-2 ring-blue-400 shadow-[0_0_30px_rgba(96,165,250,0.4)] border-blue-400 scale-[1.02]' : 'border-white/50 hover:border-gray-200 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]'}`;
  };

  const getHeaderClass = (agentName: string) => {
      const isActive = activeAgent === agentName;
      return `p-4 border-b border-gray-100 transition-colors duration-500 flex justify-between items-center ${isActive ? 'bg-blue-50/50' : 'bg-white/30'}`;
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#1d1d1f] font-sans relative overflow-hidden flex flex-col items-center p-4 md:p-8">
      {/* Apple-style Gradient Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob"></div>
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-[40rem] h-[40rem] bg-pink-300 rounded-full mix-blend-multiply filter blur-[120px] opacity-30 animate-blob animation-delay-4000"></div>

      <div className="w-full max-w-7xl relative z-10 flex flex-col space-y-6">
        
        {/* HEADER */}
        <header className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg rounded-[2rem] p-6 flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500">Dynasty OS</h1>
              <p className="text-sm font-medium text-gray-500 mt-1">Multi-Agent Orchestration Engine [V4 Beta]</p>
            </div>
            <div className="flex justify-center items-center space-x-3 mt-4 md:mt-0 bg-white/80 backdrop-blur shadow-sm px-4 py-2 rounded-full border border-gray-100">
                <span className={`relative flex h-3 w-3`}>
                  {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                </span>
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">{isConnected ? 'System Online' : 'Disconnected'}</span>
            </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: CONTROLS & LOGS */}
          <div className="lg:col-span-4 flex flex-col space-y-6">
            <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg rounded-[2rem] p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center"><span className="mr-2">⚡</span> Control Center</h2>
                
                <div className="mb-6">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Active Mandate</label>
                    <div className="relative">
                        <select value={activeMandate} onChange={(e) => setActiveMandate(e.target.value)} className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400 appearance-none shadow-sm transition-all font-medium">
                            {mandates.length > 0 ? mandates.map((m, i) => <option key={i} value={m}>{m}</option>) : <option value="">No Mandates Found</option>}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400">▼</div>
                    </div>
                </div>

                <button 
                  onClick={() => triggerPipeline('csuite')} 
                  disabled={!isConnected || activeAgent !== null}
                  className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-2xl shadow-[0_10px_20px_rgba(59,130,246,0.3)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-1 font-bold tracking-wide flex justify-between items-center group">
                  <span>Launch Agent Chain</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
            </div>
            
            {/* SYSTEM LOGS */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg rounded-[2rem] p-6 flex-1 max-h-[800px] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Live Activity</h3>
                     <button 
                        onClick={() => {
                            navigator.clipboard.writeText(logs.map(l => `[${l.agent}] ${l.msg}`).join('\n'));
                        }}
                        className="text-[10px] bg-white border border-gray-200 hover:border-blue-400 hover:text-blue-500 px-3 py-1.5 transition-colors text-gray-500 font-bold rounded-full shadow-sm">
                        COPY LOGS
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto bg-gray-50/80 rounded-2xl border border-gray-100 p-4 text-[11px] md:text-xs font-mono space-y-3 shadow-inner">
                    {logs.map((log, idx) => (
                        <div key={idx} className={`${log.agent === 'ERROR' ? 'text-red-500 bg-red-50 p-2 rounded' : 'text-gray-600'} leading-relaxed`}>
                            <span className="font-bold text-blue-600">[{log.agent}]</span> {log.msg}
                        </div>
                    ))}
                    {logs.length === 0 && <div className="text-gray-400 text-center mt-10">System idling quietly.</div>}
                </div>
            </div>
          </div>
          
          {/* RIGHT: VISUAL NODE MAP */}
          <div className="lg:col-span-8 flex flex-col space-y-6 h-full">
             
             {/* CEO NODE */}
             <div className={getNodeClass('CEO')}>
                 <div className={getHeaderClass('CEO')}>
                     <div className="flex items-center space-x-3">
                         <div className="bg-blue-100 p-2.5 rounded-xl text-xl shadow-sm">♟️</div>
                         <div>
                             <h3 className="font-bold text-gray-900 tracking-tight text-lg">The CEO</h3>
                             <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Master Plan Synthesizer</p>
                         </div>
                     </div>
                     {activeAgent === 'CEO' && <span className="bg-blue-100 text-blue-600 text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-full ring-1 ring-blue-300 animate-pulse shadow-sm">Thinking</span>}
                 </div>
                 <div ref={ceoRef} className="p-6 h-64 overflow-y-auto text-[13px] md:text-sm text-gray-700 font-mono leading-relaxed bg-white/40">
                    {agentStreams['CEO'] || <span className="text-gray-400">Waiting for activation...</span>}
                    {activeAgent === 'CEO' && <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse align-middle rounded-sm"></span>}
                 </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* CPO NODE */}
                <div className={getNodeClass('CPO')}>
                     <div className={getHeaderClass('CPO')}>
                         <div className="flex items-center space-x-3">
                             <div className="bg-purple-100 p-2.5 rounded-xl text-xl shadow-sm">🛠️</div>
                             <div>
                                 <h3 className="font-bold text-gray-900 tracking-tight text-lg">The CPO</h3>
                                 <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">System Architecture</p>
                             </div>
                         </div>
                         {activeAgent === 'CPO' && <span className="bg-purple-100 text-purple-600 text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-full ring-1 ring-purple-300 animate-pulse shadow-sm">Thinking</span>}
                     </div>
                     <div ref={cpoRef} className="p-6 h-72 overflow-y-auto text-[13px] md:text-sm text-gray-700 font-mono leading-relaxed bg-white/40">
                        {agentStreams['CPO'] || <span className="text-gray-400">Awaiting document handoff...</span>}
                        {activeAgent === 'CPO' && <span className="inline-block w-2 h-4 bg-purple-500 ml-1 animate-pulse align-middle rounded-sm"></span>}
                     </div>
                 </div>

                 {/* CFO NODE */}
                 <div className={getNodeClass('CFO')}>
                     <div className={getHeaderClass('CFO')}>
                         <div className="flex items-center space-x-3">
                             <div className="bg-emerald-100 p-2.5 rounded-xl text-xl shadow-sm">📈</div>
                             <div>
                                 <h3 className="font-bold text-gray-900 tracking-tight text-lg">The CFO</h3>
                                 <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Financial Engineering</p>
                             </div>
                         </div>
                         {activeAgent === 'CFO' && <span className="bg-emerald-100 text-emerald-600 text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-full ring-1 ring-emerald-300 animate-pulse shadow-sm">Thinking</span>}
                     </div>
                     <div ref={cfoRef} className="p-6 h-72 overflow-y-auto text-[13px] md:text-sm text-gray-700 font-mono leading-relaxed bg-white/40">
                        {agentStreams['CFO'] || <span className="text-gray-400">Awaiting architectural specs...</span>}
                        {activeAgent === 'CFO' && <span className="inline-block w-2 h-4 bg-emerald-500 ml-1 animate-pulse align-middle rounded-sm"></span>}
                     </div>
                 </div>
             </div>
             
          </div>

        </div>
      </div>
    </div>
  );
}
