"use client";
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export default function Home() {
  const [logs, setLogs] = useState<{agent: string, msg: string}[]>([]);
  const [mandates, setMandates] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    // Connect to Node.js Backend Orchestrator
    const newSocket = io('http://localhost:8080');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('get_mandates');
    });

    newSocket.on('disconnect', () => setIsConnected(false));

    newSocket.on('mandates_list', (data) => {
      setMandates(data);
    });

    newSocket.on('agent_log', (data) => {
      setLogs((prev) => [...prev, data]);
    });

    newSocket.on('pipeline_complete', (data) => {
      setLogs((prev) => [...prev, { agent: 'System', msg: `--- Phase [${data.phase.toUpperCase()}] Complete ---` }]);
    });

    return () => { newSocket.close(); };
  }, []);

  const triggerPipeline = (phase: string) => {
    if (socket) socket.emit('trigger_pipeline', { phase });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E0E0E0] p-8 font-mono flex flex-col items-center">
      <div className="w-full max-w-6xl border border-[#D4AF37] p-6 shadow-2xl rounded-sm bg-[#121212]">
        
        <header className="border-b border-[#D4AF37] pb-4 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl font-bold text-[#D4AF37] tracking-widest uppercase">👑 Dynasty OS : Command Center</h1>
              <p className="text-sm text-gray-500 mt-1">V2 Event-Broker Architecture [NODE.JS / REACT]</p>
            </div>
            <div className="flex items-center space-x-2 mt-4 md:mt-0 bg-[#1A1A1A] p-2 rounded border border-gray-800">
                <span className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                <span className="text-xs font-bold text-gray-400">{isConnected ? 'SOCKET: CONNECTED' : 'SOCKET: DISCONNECTED'}</span>
            </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-gray-800 pr-0 md:pr-4 pb-4 md:pb-0">
            <h2 className="text-lg text-[#D4AF37] font-bold mb-4 uppercase inline-block border-b-2 border-gray-800">Execute Phase</h2>
            
            <div className="mb-6">
                <label className="text-xs text-gray-400 block mb-2 font-bold uppercase">Active Mandate</label>
                <select className="w-full bg-[#1A1A1A] border border-gray-700 p-2 text-sm outline-none focus:border-[#D4AF37] text-gray-300">
                    {mandates.length > 0 ? mandates.map((m, i) => <option key={i}>{m}</option>) : <option>No Mandates Found</option>}
                </select>
            </div>

            <div className="space-y-4">
              <button 
                onClick={() => triggerPipeline('csuite')} 
                disabled={!isConnected}
                className="w-full p-4 border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#0A0A0A] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-bold uppercase text-left flex justify-between items-center group">
                <span>1. Awaken C-Suite</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
              
              <button 
                onClick={() => triggerPipeline('market')} 
                disabled={!isConnected}
                className="w-full p-4 border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#0A0A0A] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-bold uppercase text-left flex justify-between items-center group">
                <span>2. The Crucible</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
              
              <button 
                disabled={true}
                className="w-full p-4 border border-gray-700 text-gray-500 cursor-not-allowed transition-all text-sm font-bold uppercase text-left flex justify-between items-center">
                <span>3. Shield Audit (Locked)</span>
                <span>🔒</span>
              </button>
            </div>
          </div>
          
          <div className="md:col-span-3 bg-[#0A0A0A] border border-gray-800 p-6 h-[600px] overflow-y-auto font-mono relative">
            <div className="absolute top-2 right-4 text-xs text-gray-700 font-bold tracking-widest">LIVE EVENT BUS //</div>
            
            {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2">
                    <span className="text-4xl animate-bounce">⚡</span>
                    <span className="text-sm">System idling. Waiting for Founder execution directive...</span>
                </div>
            ) : (
                <div className="space-y-3 mt-4">
                    {logs.map((log, idx) => (
                        <div key={idx} className="text-sm leading-relaxed border-l-2 border-[#D4AF37] pl-3 py-1 bg-[#121212] bg-opacity-50">
                            <span className="text-[#D4AF37] font-bold">[{log.agent}]</span> <span className="text-gray-300">{log.msg}</span>
                        </div>
                    ))}
                </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
