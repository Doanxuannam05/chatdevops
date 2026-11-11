import React, { useState } from 'react';
import { Activity, AlertTriangle, ShieldCheck, Zap, Terminal } from 'lucide-react';

interface PodStatusBarProps {
  isConnected: boolean;
  connectedPod: string;
  latency: number;
}

export const PodStatusBar: React.FC<PodStatusBarProps> = ({
  isConnected,
  connectedPod,
  latency,
}) => {
  const [simulationStatus, setSimulationStatus] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulate = async (type: string) => {
    setIsSimulating(true);
    setSimulationStatus(`Triggering ${type}...`);
    try {
      const res = await fetch(`/api/simulate-error?type=${type}`);
      const data = await res.json();
      setSimulationStatus(
        res.status === 200
          ? `✓ ${data.message || 'Success'}`
          : `⚠ Code ${res.status}: ${data.error || 'Simulated Error'}`
      );
    } catch (err: any) {
      setSimulationStatus(`⚠ Request triggered (Check Grafana / Prometheus)`);
    } finally {
      setIsSimulating(false);
      setTimeout(() => setSimulationStatus(null), 4000);
    }
  };

  return (
    <header className="w-full bg-white border-b border-chat-border px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs z-20 animate-fade-in">
      {/* Brand & Pod Identification */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2.5">
          {/* Friendly chat icon */}
          <div className="w-9 h-9 rounded-xl bg-chat-accent-soft flex items-center justify-center text-chat-accent transition-transform duration-300 hover:scale-110">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center space-x-2 font-semibold text-chat-text">
              <span className="text-sm">Phòng Chat</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-chat-accent-soft text-chat-accent font-medium">
                Multi-Pod
              </span>
            </div>
            <div className="text-[11px] text-chat-muted flex items-center space-x-1.5">
              <span>Socket.io + Redis Pub/Sub</span>
              <span className="text-chat-border">•</span>
              <span className="text-chat-accent font-medium flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-chat-success animate-pulse-gentle' : 'bg-chat-danger'}`}></span>
                {connectedPod}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Connection & SRE Telemetry Stats */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Connection status badge */}
        <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-300 ${
          isConnected
            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
            : 'bg-red-50 text-red-500 border border-red-200'
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-chat-success' : 'bg-chat-danger'
          }`} />
          <span>{isConnected ? 'Đang kết nối' : 'Mất kết nối'}</span>
        </div>

        {/* Latency */}
        <div className="hidden sm:flex items-center space-x-1 px-2.5 py-1 rounded-full bg-chat-sidebar border border-chat-border text-chat-muted text-[11px]">
          <Activity className="w-3.5 h-3.5 text-chat-accent" />
          <span>{latency > 0 ? `${latency}ms` : '< 5ms'}</span>
        </div>

        {/* SRE Action Buttons */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => handleSimulate('500')}
            disabled={isSimulating}
            title="Kích hoạt lỗi HTTP 500 để demo Alertmanager"
            className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 transition-all duration-200 flex items-center space-x-1 hover-lift"
          >
            <AlertTriangle className="w-3 h-3" />
            <span className="hidden md:inline">500</span>
          </button>

          <button
            onClick={() => handleSimulate('cpu')}
            disabled={isSimulating}
            title="Spike CPU để kích hoạt HPA"
            className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 transition-all duration-200 flex items-center space-x-1 hover-lift"
          >
            <Zap className="w-3 h-3" />
            <span className="hidden md:inline">CPU</span>
          </button>

          <a
            href="/metrics"
            target="_blank"
            rel="noreferrer"
            className="px-2 py-1 rounded-lg bg-chat-sidebar hover:bg-chat-hover text-chat-muted border border-chat-border transition-all duration-200 flex items-center space-x-1 hover-lift"
            title="Prometheus Metrics"
          >
            <Terminal className="w-3 h-3 text-chat-accent" />
            <span className="hidden lg:inline">/metrics</span>
          </a>

          <a
            href="/health"
            target="_blank"
            rel="noreferrer"
            className="px-2 py-1 rounded-lg bg-chat-sidebar hover:bg-chat-hover text-chat-muted border border-chat-border transition-all duration-200 flex items-center space-x-1 hover-lift"
            title="Health Check"
          >
            <ShieldCheck className="w-3 h-3 text-chat-success" />
            <span className="hidden lg:inline">/health</span>
          </a>
        </div>
      </div>

      {/* Simulation Toast Notification */}
      {simulationStatus && (
        <div className="w-full mt-1.5 py-1.5 px-3 rounded-lg bg-chat-accent-soft border border-indigo-200 text-chat-accent text-[11px] flex items-center justify-between animate-fade-in-up">
          <span className="font-medium">{simulationStatus}</span>
          <span className="text-chat-muted text-[10px]">Đang gửi tới Grafana / Alertmanager...</span>
        </div>
      )}
    </header>
  );
};
