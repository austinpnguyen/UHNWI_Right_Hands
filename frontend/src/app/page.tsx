"use client";
import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

export default function Home() {
  const [logs, setLogs] = useState<{agent: string, msg: string}[]>([]);
  const [mandates, setMandates] = useState<string[]>([]);
  const [activeMandate, setActiveMandate] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<any>(null);
  
  // V3 Visual Map State
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [agentStreams, setAgentStreams] = useState<Record<string, string>>({
    'CEO': '', 'CPO': '', 'CFO': '', 'CMO': ''
  });
  
  const ceoRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the CEO stream box
  useEffect(() => {
    if (ceoRef.current) {
        ceoRef.current.scrollTop = ceoRef.current.scrollHeight;
    }
  }, [agentStreams['CEO']]);

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

    newSocket.on('agent_log', (data) => {
      setLogs((prev) => [...prev, data]);
    });

    // Real-time LLM Streaming
    newSocket.on('agent_active', (data) => {
      setActiveAgent(data.agent);
      if (data.agent) {
          // Clear previous stream when agent wakes up
          setAgentStreams((prev) => ({ ...prev, [data.agent]: '' }));
      }
    });

    newSocket.on('agent_stream', (data) => {
      setAgentStreams((prev) => ({
          ...prev,
          [data.agent]: prev[data.agent] + data.chunk
      }));
    });

    newSocket.on('pipeline_complete', (data) => {
      setLogs((prev) => [...prev, { agent: 'System', msg: `--- Phase [${data.phase.toUpperCase()}] Complete ---` }]);
      setActiveAgent(null);
    });

    return () => { newSocket.close(); };
  }, []);

  const triggerPipeline = (phase: string) => {
    if (socket) socket.emit('trigger_pipeline', { phase, mandate: activeMandate });
  };

  const getBorderColor = (agentName: string) => {
      return activeAgent === agentName ? 'border-[#EAB308] shadow-[0_0_15px_rgba(234,179,8,0.5)]' : 'border-gray-800';
  };

  const getTextColor = (agentName: string) => {
      return activeAgent === agentName ? 'text-[#EAB308]' : 'text-gray-500';
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#E0E0E0] p-4 md:p-8 font-mono flex flex-col items-center">
      <div className="w-full max-w-7xl border border-[#D4AF37] p-6 shadow-2xl rounded-sm bg-[#0A0A0A]">
        
        <header className="border-b border-[#D4AF37] pb-4 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl font-bold text-[#D4AF37] tracking-widest uppercase">👑 Dynasty OS : Command Center</h1>
              <p className="text-sm text-gray-400 mt-1">Multi-Agent Visual Sandbox [V3 Streaming]</p>
            </div>
            <div className="flex items-center space-x-2 mt-4 md:mt-0 bg-[#000000] p-2 rounded border border-gray-800">
                <span className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                <span className="text-xs font-bold text-gray-400">{isConnected ? 'SOCKET: CONNECTED' : 'SOCKET: DISCONNECTED'}</span>
            </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: CONTROLS */}
          <div className="lg:col-span-3 border-r border-gray-800 pr-4">
            <h2 className="text-lg text-[#D4AF37] font-bold mb-4 uppercase inline-block border-b border-gray-800">Execution Block</h2>
            
            <div className="mb-6">
                <label className="text-xs text-gray-500 block mb-2 font-bold uppercase">Active Mandate</label>
                <select value={activeMandate} onChange={(e) => setActiveMandate(e.target.value)} className="w-full bg-[#111] border border-gray-700 p-2 text-sm outline-none focus:border-[#D4AF37] text-gray-300">
                    {mandates.length > 0 ? mandates.map((m, i) => <option key={i} value={m}>{m}</option>) : <option value="">No Mandates Found</option>}
                </select>
            </div>

            <div className="space-y-4">
              <button 
                onClick={() => triggerPipeline('csuite')} 
                disabled={!isConnected || activeAgent !== null}
                className="w-full p-4 border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#000] disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-bold uppercase text-left flex justify-between items-center group bg-[#111]">
                <span>1. Awaken CEO Sandbox</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>
            
            {/* SYSTEM LOGS */}
            <div className="mt-8 border-t border-gray-800 pt-4">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xs text-gray-500 font-bold uppercase">System Logs</h3>
                    <button 
                        onClick={() => {
                            navigator.clipboard.writeText(logs.map(l => `[${l.agent}] ${l.msg}`).join('\n'));
                            alert("System Logs copied sequentially to clipboard!");
                        }}
                        className="text-[10px] bg-[#1A1A1A] border border-gray-700 hover:border-[#D4AF37] hover:text-[#D4AF37] px-2 py-1 transition-colors text-gray-400 rounded-sm">
                        📋 COPY LOGS
                    </button>
                </div>
                <div className="h-64 overflow-y-auto bg-[#000] border border-gray-800 p-3 text-xs space-y-2">
                    {logs.map((log, idx) => (
                        <div key={idx} className={`${log.agent === 'ERROR' || log.agent === 'FATAL ERROR' ? 'text-red-500' : 'text-gray-400'}`}>
                            <span className="text-[#D4AF37]">[{log.agent}]</span> {log.msg}
                        </div>
                    ))}
                    {logs.length === 0 && <div className="text-gray-700 text-center mt-10 animate-pulse">Awaiting Input...</div>}
                </div>
            </div>
          </div>
          
          {/* RIGHT: VISUAL NODE MAP */}
          <div className="lg:col-span-9 bg-[#000] border border-gray-900 p-6 relative">
            <div className="absolute top-2 right-4 text-xs text-gray-700 font-bold tracking-widest uppercase">Live Agent Architecture</div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full mt-4">
                
                {/* CEO NODE */}
                <div className={`md:col-span-2 border-2 bg-[#0A0A0A] p-4 flex flex-col transition-all duration-300 ${getBorderColor('CEO')}`}>
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-800">
                        <div className="flex items-center space-x-3">
                            <span className="text-2xl">♟️</span>
                            <div>
                                <h3 className={`font-bold tracking-wider ${getTextColor('CEO')}`}>THE CEO</h3>
                                <p className="text-[10px] text-gray-500 uppercase">Master Plan Synthesizer</p>
                            </div>
                        </div>
                        {activeAgent === 'CEO' && (
                            <div className="flex items-center space-x-2 bg-[#EAB308] bg-opacity-10 px-3 py-1 rounded">
                                <span className="h-2 w-2 rounded-full bg-[#EAB308] animate-bounce"></span>
                                <span className="text-xs font-bold text-[#EAB308]">THINKING (70B)</span>
                            </div>
                        )}
                    </div>
                    {/* Live Streaming Box */}
                    <div ref={ceoRef} className="flex-1 bg-[#000] border border-gray-800 p-4 text-sm text-gray-300 font-sans overflow-y-auto whitespace-pre-wrap h-64 md:h-80 leading-relaxed shadow-inner">
                        {agentStreams['CEO'] || <span className="text-gray-700 italic">Idle. Awaiting Mandate Execution...</span>}
                        {activeAgent === 'CEO' && <span className="inline-block w-2 relative top-1 h-4 bg-[#EAB308] animate-pulse ml-1"></span>}
                    </div>
                </div>
                
                {/* FUTURE NODES: CPO, CFO, CMO */}
                <div className={`border border-gray-800 bg-[#0A0A0A] p-4 opacity-50 transition-all ${getBorderColor('CPO')}`}>
                    <div className="flex items-center space-x-3 mb-2">
                        <span className="text-xl">⚙️</span>
                        <h3 className={`font-bold ${getTextColor('CPO')}`}>THE CPO</h3>
                    </div>
                    <div className="text-xs text-gray-600 bg-[#000] p-2 h-20">Awaiting CEO logic handoff...</div>
                </div>

                <div className={`border border-gray-800 bg-[#0A0A0A] p-4 opacity-50 transition-all ${getBorderColor('CFO')}`}>
                    <div className="flex items-center space-x-3 mb-2">
                        <span className="text-xl">⚖️</span>
                        <h3 className={`font-bold ${getTextColor('CFO')}`}>THE CFO</h3>
                    </div>
                    <div className="text-xs text-gray-600 bg-[#000] p-2 h-20">Awaiting financial constraints...</div>
                </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
