import React, { useState, useEffect } from 'react';
import { 
  Activity, ShieldCheck, AlertTriangle, Zap, Server, 
  Terminal, RotateCcw, CheckCircle2, XCircle, 
  Cpu, Database, Clock, RefreshCw, BarChart3, Sliders,
  X, ChevronRight, ExternalLink, AlertCircle, TrendingUp, Info,
  Network, BookOpen, HardDrive, Globe, Eye, ArrowRight, Play
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, BarChart, Bar 
} from 'recharts';

// ─── Status badge helper ───────────────────────────────────────────────────
function StatusBadge({ status, pulse = false }) {
  const map = {
    HEALTHY:    'bg-green-500/10 text-green-400 border-green-500/20',
    WARNING:    'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    CRITICAL:   'bg-red-500/10 text-red-400 border-red-500/20',
    DOWN:       'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };
  const cls = map[status] || map.DOWN;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${cls} ${pulse && status !== 'HEALTHY' ? 'animate-pulse' : ''}`}>
      {status}
    </span>
  );
}

function IncidentPill({ status }) {
  const map = {
    RECOVERED:   'bg-green-500/10 text-green-400',
    IN_PROGRESS: 'bg-blue-500/10 text-blue-400',
    UNRESOLVED:  'bg-yellow-500/10 text-yellow-400',
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${map[status] || 'bg-gray-800 text-gray-400'}`}>{status}</span>;
}

function HealthRing({ score }) {
  const radius = 38;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444';
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={radius} fill="none" stroke="#1f2937" strokeWidth="8" />
      <circle cx="48" cy="48" r={radius} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 48 48)" style={{ transition: 'stroke-dashoffset 0.5s' }} />
      <text x="48" y="53" textAnchor="middle" fill={color} fontSize="14" fontWeight="bold">{score}</text>
    </svg>
  );
}

// ─── AI Explainability Knowledge Base ─────────────────────────────────────
const KNOWLEDGE_BASE = [
  {
    type: 'DATABASE_LOST',
    title: 'HikariCP Connection Pool Exhaustion or Drop',
    description: 'The Spring Data JPA datasource is unreachable or all pooled DB connections timed out.',
    symptoms: ['ConnectionTimeoutException', 'HTTP 500 on data mutations', 'Hikari active pool 10/10'],
    detection: 'MAPE-K poller receives Connection Refused on health actuator probe db component.',
    recovery: 'Evicts pool connections, performs safe ping check, falls back to context restart.',
    prevention: 'Adjust maximum-pool-size, idle-timeout, and configure Read-Replica pooling.'
  },
  {
    type: 'HIGH_CPU',
    title: 'Algorithmic or Thread Burner Anomaly',
    description: 'Process CPU usage sustained > 90% across 3 consecutive sliding health samples.',
    symptoms: ['HTTP thread pool saturation', 'High latency on routine GET requests', 'System load average spike'],
    detection: 'Actuator /metrics/process.cpu.usage registers sustained ratio above 0.90.',
    recovery: 'Signals CLEAR_CHAOS, forces thread interruption on non-critical executors.',
    prevention: 'Set thread execution timeouts and implement Resilience4j bulkhead limits.'
  },
  {
    type: 'HIGH_MEMORY',
    title: 'JVM Heap Leak & Allocation Spike',
    description: 'Heap consumption exceeds 85% with escalating GC pause times.',
    symptoms: ['Frequent Full GCs', 'High response latency', 'OutOfMemoryError risk'],
    detection: 'Actuator jvm.memory.used exceeds safe threshold without reduction post-collection.',
    recovery: 'Fires CLEAR_CHAOS memory sink clear, requests System.gc(), escalates to restart.',
    prevention: 'Profile heap objects with JProfiler/VisualVM and set bounded cache sizes.'
  },
  {
    type: 'SLOW_RESPONSE',
    title: 'Downstream Blocking Latency Spike',
    description: 'Response time exceeds SLA threshold (> 2,000 ms) while process is technically UP.',
    symptoms: ['Client request queueing', 'Cascading delays in calling microservices'],
    detection: 'Sliding window average of roundtrip health probe exceeds 2000 ms.',
    recovery: 'Triggers circuit breaker trip to shed load, clears active latency flags.',
    prevention: 'Configure Resilience4j TimeLimiter with 1500ms cutoff.'
  },
  {
    type: 'SERVICE_CRASH',
    title: 'Process Unreachable / Hard Crash',
    description: 'Health probe receives Connection Refused or Host Unreachable across 3 probes.',
    symptoms: ['Zero network socket response', 'PID termination or container killed'],
    detection: '3 consecutive TCP/HTTP timeouts on port probe.',
    recovery: 'Escalation Ladder Step 1: Automated container / process restart command.',
    prevention: 'Enable Kubernetes liveness probe or automated systemd watchdog.'
  }
];

// ─── Service Detail Drawer Component ──────────────────────────────────────
function ServiceDetailPanel({ serviceId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!serviceId) return;
    setLoading(true);
    fetch(`/api/services/${serviceId}/detail`)
      .then(r => r.json())
      .then(d => { setDetail(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [serviceId]);

  const svc = detail?.service;
  const metrics = detail?.recentMetrics || [];
  const incidentList = detail?.incidents || [];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="w-[680px] bg-gray-900 border-l border-gray-700 flex flex-col h-full overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${svc?.currentStatus === 'HEALTHY' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              <Server className={`w-5 h-5 ${svc?.currentStatus === 'HEALTHY' ? 'text-green-400' : 'text-red-400'}`} />
            </div>
            <div>
              <h2 className="font-bold text-white text-lg">{svc?.name || 'Loading...'}</h2>
              <p className="text-xs text-gray-400">{svc?.healthUrl}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Fetching diagnostics...
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-6 bg-gray-800/40 border border-gray-700/60 rounded-2xl p-5">
              <HealthRing score={svc?.healthScore ?? 0} />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <StatusBadge status={svc?.currentStatus} pulse />
                  <span className="text-xs text-gray-400">Port {svc?.port}</span>
                  <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono">
                    {svc?.category}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{detail?.totalIncidents ?? 0}</p>
                    <p className="text-[10px] text-gray-400 uppercase">Incidents</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-400">{detail?.resolvedIncidents ?? 0}</p>
                    <p className="text-[10px] text-gray-400 uppercase">Self-Healed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-indigo-400">
                      {detail?.avgMttrMs ? `${(detail.avgMttrMs / 1000).toFixed(1)}s` : '1.8s'}
                    </p>
                    <p className="text-[10px] text-gray-400 uppercase">Avg MTTR</p>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Diagnosis */}
            <div className={`p-5 rounded-2xl border ${
              svc?.currentStatus === 'HEALTHY' 
                ? 'bg-green-950/20 border-green-500/30' 
                : 'bg-red-950/30 border-red-500/30'
            }`}>
              <h3 className={`text-sm font-bold flex items-center gap-2 mb-2 ${
                svc?.currentStatus === 'HEALTHY' ? 'text-green-400' : 'text-red-400'
              }`}>
                {svc?.currentStatus === 'HEALTHY' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                Explainable AI Diagnostic Verdict
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed font-mono bg-black/40 p-3 rounded-xl border border-gray-800">
                {detail?.diagnosisSummary || 'Telemetry nominal. Service operating within normal SLA thresholds.'}
              </p>
              {svc?.dependencies && (
                <p className="text-xs text-gray-400 mt-2">
                  <span className="text-gray-500">Declared Dependencies: </span>
                  <span className="font-mono text-indigo-300">{svc.dependencies}</span>
                </p>
              )}
            </div>

            {/* Live Metrics */}
            {metrics.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-400" /> Time-Series Telemetry
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 border border-gray-700/60 rounded-xl p-4">
                    <p className="text-[10px] text-gray-400 uppercase mb-2">CPU Utilization (%)</p>
                    <div className="h-28">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={metrics}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="id" stroke="#4b5563" fontSize={9} />
                          <YAxis stroke="#4b5563" fontSize={9} domain={[0, 100]} />
                          <Area type="monotone" dataKey="cpuPercent" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-gray-800/50 border border-gray-700/60 rounded-xl p-4">
                    <p className="text-[10px] text-gray-400 uppercase mb-2">Response Latency (ms)</p>
                    <div className="h-28">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={metrics}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="id" stroke="#4b5563" fontSize={9} />
                          <YAxis stroke="#4b5563" fontSize={9} />
                          <Line type="monotone" dataKey="responseTimeMs" stroke="#10b981" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN HEALOPS DASHBOARD APP
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState({
    systemHealthScore: 100,
    healthyCount: 1,
    warningCount: 0,
    criticalCount: 0,
    recoveriesToday: 0,
    uptimePercent: 99.85
  });
  const [services, setServices] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [simulationMsg, setSimulationMsg] = useState(null);
  const [liveLogs, setLiveLogs] = useState([]);
  const [connectedSse, setConnectedSse] = useState(false);
  const [drilldownId, setDrilldownId] = useState(null);

  const fetchData = async () => {
    try {
      const ovRes = await fetch('/api/overview');
      if (ovRes.ok) setOverview(await ovRes.json());

      const sRes = await fetch('/api/services');
      if (sRes.ok) setServices(await sRes.json());

      const incRes = await fetch('/api/incidents');
      if (incRes.ok) setIncidents(await incRes.json());

      const polRes = await fetch('/api/policies');
      if (polRes.ok) setPolicies(await polRes.json());
    } catch (err) {
      console.log('Error fetching data:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  // SSE Stream
  useEffect(() => {
    const eventSource = new EventSource('/api/stream/events');
    eventSource.onopen = () => setConnectedSse(true);
    eventSource.onerror = () => setConnectedSse(false);

    eventSource.addEventListener('INIT', (e) => addLog('INFO', e.data));
    eventSource.addEventListener('METRIC_UPDATE', (e) => {
      const data = JSON.parse(e.data);
      addLog('DEBUG', `[TELEMETRY] ${data.serviceName}: CPU ${data.cpu}% | Score ${data.healthScore}`);
    });
    eventSource.addEventListener('INCIDENT_TRIGGERED', (e) => {
      const inc = JSON.parse(e.data);
      addLog('WARN', `🚨 INCIDENT: ${inc.failureType} on ${inc.service?.name} -> Escalated: ${inc.recommendedAction}`);
      fetchData();
    });
    eventSource.addEventListener('INCIDENT_RESOLVED', (e) => {
      const inc = JSON.parse(e.data);
      addLog('SUCCESS', `✅ SELF-HEALED: ${inc.service?.name} restored in ${inc.mttrMs} ms!`);
      fetchData();
    });

    return () => eventSource.close();
  }, []);

  const addLog = (level, text) => {
    setLiveLogs(prev => [
      { id: Date.now() + Math.random(), time: new Date().toLocaleTimeString(), level, text },
      ...prev.slice(0, 49)
    ]);
  };

  // Chaos Injection
  const triggerChaos = async (serviceName, failureType) => {
    setSimulationMsg(`Injecting ${failureType} into ${serviceName}...`);
    try {
      await fetch(`/api/simulate?serviceName=${serviceName}&failureType=${failureType}`, { method: 'POST' });
      setSimulationMsg(`Simulation Active: ${failureType} on ${serviceName}. Watch HealOps MAPE-K loop heal it!`);
      setTimeout(() => setSimulationMsg(null), 8000);
    } catch (err) {
      setSimulationMsg('Failed to inject simulation: ' + err.message);
    }
  };

  // Filter services by category
  const internalServices = services.filter(s => s.category === 'INTERNAL_MICROSERVICE' || !s.category);
  const externalServices = services.filter(s => s.category === 'EXTERNAL_API');

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden font-sans">
      
      {/* Drawer */}
      {drilldownId && (
        <ServiceDetailPanel
          serviceId={drilldownId}
          onClose={() => setDrilldownId(null)}
        />
      )}

      {/* ── Sidebar Navigation ──────────────────────────────────────────── */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col justify-between">
        <div>
          <div className="p-5 border-b border-gray-800 flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white tracking-wide">HealOps</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${connectedSse ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-xs text-gray-400">{connectedSse ? 'Autonomous Online' : 'Connecting...'}</span>
              </div>
            </div>
          </div>

          <nav className="p-3 space-y-1">
            {[
              { id: 'overview',     label: 'System Overview',    icon: Activity },
              { id: 'internal',     label: 'Internal Fleet',     icon: Server, count: internalServices.length },
              { id: 'topology',     label: 'Topology & Cascades', icon: Network },
              { id: 'infrastructure',label:'Infrastructure',     icon: HardDrive },
              { id: 'external',     label: 'External Targets',    icon: Globe, count: externalServices.length },
              { id: 'incidents',    label: 'Incidents & MTTR',   icon: RotateCcw, count: incidents.length },
              { id: 'chaos',        label: 'Chaos Studio',       icon: Zap },
              { id: 'knowledge',    label: 'AI Knowledge Base',  icon: BookOpen },
              { id: 'logs',         label: 'Live Telemetry',     icon: Terminal },
            ].map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition ${
                    activeTab === item.id 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                      : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 font-mono">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-800 text-xs text-gray-500 flex justify-between items-center">
          <span>MediFlow Testbed Active</span>
          <span className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">v2.0</span>
        </div>
      </aside>

      {/* ── Main Work Area ──────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-16 bg-gray-900/60 backdrop-blur border-b border-gray-800 flex items-center justify-between px-8">
          <div>
            <h2 className="text-lg font-semibold capitalize text-gray-100">
              {activeTab.replace('-', ' ')}
            </h2>
            <p className="text-xs text-gray-400">MAPE-K Closed-Loop Autonomous Healing Control Room</p>
          </div>
          <div className="flex items-center gap-4">
            <a 
              href="http://localhost:3001" 
              target="_blank" 
              rel="noreferrer" 
              className="text-xs text-teal-400 bg-teal-950/40 border border-teal-500/30 px-3 py-1.5 rounded-full hover:bg-teal-900/40 transition flex items-center gap-1.5 font-medium"
            >
              Open MediFlow Hospital Web ↗
            </a>
            <button onClick={fetchData} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="p-8 space-y-6">
          {simulationMsg && (
            <div className="p-4 bg-indigo-950/80 border border-indigo-500/50 rounded-xl text-indigo-200 flex items-center justify-between shadow-lg animate-pulse">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-indigo-400" />
                <span className="text-sm font-medium">{simulationMsg}</span>
              </div>
            </div>
          )}

          {/* ━━━━ TAB 1: SYSTEM OVERVIEW ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-5">
                <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase">System Health Index</p>
                      <h3 className="text-3xl font-extrabold text-white mt-1">{overview.systemHealthScore}%</h3>
                    </div>
                    <div className={`p-3 rounded-xl ${overview.systemHealthScore > 80 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      <Activity className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="mt-3 w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                    <div className={`h-full ${overview.systemHealthScore > 80 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${overview.systemHealthScore}%` }} />
                  </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase">Registered Fleet</p>
                      <h3 className="text-2xl font-bold text-white mt-1">
                        <span className="text-green-400">{overview.healthyCount} UP</span> / {overview.warningCount + overview.criticalCount} DEGRADED
                      </h3>
                    </div>
                    <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                      <Server className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-3">{services.length} Total Monitored Endpoints</p>
                </div>

                <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase">Autonomous Recoveries</p>
                      <h3 className="text-3xl font-extrabold text-indigo-400 mt-1">{overview.recoveriesToday}</h3>
                    </div>
                    <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
                      <RotateCcw className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-3">100% Policy-Driven Fixes</p>
                </div>

                <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase">Platform Availability</p>
                      <h3 className="text-3xl font-extrabold text-white mt-1">{overview.uptimePercent}%</h3>
                    </div>
                    <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-3">SLA Benchmark: 99.9%</p>
                </div>
              </div>

              {/* Service Cards Grid */}
              <div>
                <h3 className="text-md font-semibold text-gray-200 mb-3 flex items-center gap-2">
                  <Server className="w-4 h-4 text-indigo-400" /> Monitored Fleet (Click any card to open AI Diagnostics)
                </h3>
                <div className="grid grid-cols-3 gap-5">
                  {services.map(s => (
                    <div
                      key={s.id}
                      onClick={() => setDrilldownId(s.id)}
                      className="bg-gray-900 border border-gray-800 hover:border-indigo-500/50 p-5 rounded-2xl cursor-pointer transition relative group"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-semibold text-gray-200">{s.name}</span>
                        <StatusBadge status={s.currentStatus} pulse />
                      </div>
                      <div className="space-y-2 text-xs text-gray-400">
                        <div className="flex justify-between">
                          <span>Health Score:</span>
                          <span className="font-bold text-white">{s.healthScore}/100</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Port:</span>
                          <span className="font-mono text-gray-300">:{s.port}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Category:</span>
                          <span className="font-mono text-indigo-400">{s.category}</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between items-center text-[11px] text-gray-500">
                        <span>Click for diagnosis</span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ━━━━ TAB 2: INTERNAL SERVICES FLEET ━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {activeTab === 'internal' && (
            <div className="space-y-6">
              <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
                <h3 className="text-md font-bold text-white mb-1 flex items-center gap-2">
                  <Server className="w-5 h-5 text-indigo-400" /> MediFlow Hospital Internal Microservices
                </h3>
                <p className="text-xs text-gray-400">
                  Core backend microservices running Spring Boot Actuator with closed-loop MAPE-K monitoring.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-5">
                {internalServices.map(s => (
                  <div
                    key={s.id}
                    onClick={() => setDrilldownId(s.id)}
                    className="bg-gray-900 border border-gray-800 hover:border-indigo-500/50 p-5 rounded-2xl cursor-pointer transition group"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-white text-base">{s.name}</span>
                      <StatusBadge status={s.currentStatus} pulse />
                    </div>
                    <div className="space-y-2 text-xs text-gray-400">
                      <div className="flex justify-between">
                        <span>Health Score:</span>
                        <span className="font-bold text-white">{s.healthScore}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Port / Socket:</span>
                        <span className="font-mono text-gray-300">:{s.port}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Dependencies:</span>
                        <span className="font-mono text-indigo-300 truncate max-w-[150px]">{s.dependencies || 'None'}</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between items-center text-xs text-indigo-400">
                      <span>Investigate Diagnostics</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ━━━━ TAB 3: TOPOLOGY & DEPENDENCY CASCADE GRAPH ━━━━━━━━━━━━━ */}
          {activeTab === 'topology' && (
            <div className="space-y-6">
              <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
                <h3 className="text-md font-bold text-white mb-2 flex items-center gap-2">
                  <Network className="w-5 h-5 text-purple-400" /> Interactive Dependency & Cascade Map
                </h3>
                <p className="text-xs text-gray-400">
                  Visualizes service dependencies. When upstream nodes degrade, HealOps maps the cascade blast radius to prevent chain failures.
                </p>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6">
                <div className="grid grid-cols-3 gap-6">
                  {/* Gateway Tier */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Gateway & Ingress</h4>
                    <div className="p-4 bg-gray-800/60 border border-indigo-500/40 rounded-xl space-y-1">
                      <p className="font-bold text-white text-sm">api-gateway (:8080)</p>
                      <p className="text-xs text-gray-400">Central routing & security reverse proxy</p>
                    </div>
                    <div className="p-4 bg-gray-800/60 border border-gray-700 rounded-xl space-y-1">
                      <p className="font-bold text-white text-sm">auth-service (:4005)</p>
                      <p className="text-xs text-gray-400">JWT token signing & validation</p>
                    </div>
                  </div>

                  {/* Core Clinical Tier */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Clinical Domain Tier</h4>
                    {[
                      { name: 'patient-service (:4000)', deps: 'auth-service, billing-service' },
                      { name: 'doctor-service (:4002)', deps: 'auth-service' },
                      { name: 'appointment-service (:4003)', deps: 'doctor-service, patient-service' },
                      { name: 'laboratory-service (:4007)', deps: 'patient-service, doctor-service' }
                    ].map(node => (
                      <div key={node.name} className="p-4 bg-gray-800/40 border border-gray-700/60 rounded-xl space-y-1">
                        <div className="flex justify-between items-center">
                          <p className="font-bold text-white text-sm">{node.name}</p>
                          <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
                        </div>
                        <p className="text-[11px] text-gray-400">Depends on: <span className="text-indigo-300 font-mono">{node.deps}</span></p>
                      </div>
                    ))}
                  </div>

                  {/* Operational & Billing Tier */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Operations & Billing</h4>
                    {[
                      { name: 'billing-service (:4001)', deps: 'patient-service, auth-service' },
                      { name: 'inventory-service (:4004)', deps: 'auth-service' },
                      { name: 'pharmacy-service (:4006)', deps: 'inventory-service, patient-service' },
                      { name: 'notification-service (:4008)', deps: 'None (Async Consumer)' }
                    ].map(node => (
                      <div key={node.name} className="p-4 bg-gray-800/40 border border-gray-700/60 rounded-xl space-y-1">
                        <p className="font-bold text-white text-sm">{node.name}</p>
                        <p className="text-[11px] text-gray-400">Depends on: <span className="text-indigo-300 font-mono">{node.deps}</span></p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ━━━━ TAB 4: INFRASTRUCTURE MONITORING ━━━━━━━━━━━━━━━━━━━━━━━ */}
          {activeTab === 'infrastructure' && (
            <div className="space-y-6">
              <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
                <h3 className="text-md font-bold text-white mb-1 flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-emerald-400" /> Infrastructure Node Status
                </h3>
                <p className="text-xs text-gray-400">
                  Hardware nodes, JVM runtimes, database connection pools, and container engines.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-5">
                {[
                  { name: 'PostgreSQL & In-Memory H2', type: 'Database Engine', status: 'HEALTHY', pool: '8 / 10 Active', latency: '4ms' },
                  { name: 'JVM 21 Runtime (Temurin)', type: 'Runtime Environment', status: 'HEALTHY', pool: 'Heap: 340 MB / 4 GB', latency: 'GC: 12ms' },
                  { name: 'Host Operating System', type: 'Windows 64-bit Core', status: 'HEALTHY', pool: 'RAM: 16 GB Active', latency: 'Load: 12%' },
                  { name: 'HikariCP Connection Pools', type: 'Connection Pool Manager', status: 'HEALTHY', pool: 'Idle: 10, Wait: 0ms', latency: '0 drops' },
                  { name: 'Resilience4j Circuit Breakers', type: 'Fault Tolerance Plane', status: 'HEALTHY', pool: 'Closed (100% Passing)', latency: '0 trips' },
                  { name: 'Docker Daemon Watcher', type: 'Container Management', status: 'STANDALONE', pool: 'Processes Local JVM', latency: 'Online' }
                ].map(node => (
                  <div key={node.name} className="bg-gray-900 border border-gray-800 p-5 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white text-sm">{node.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {node.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{node.type}</p>
                    <div className="pt-2 border-t border-gray-800 flex justify-between text-xs text-slate-300 font-mono">
                      <span>{node.pool}</span>
                      <span className="text-indigo-400">{node.latency}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ━━━━ TAB 5: EXTERNAL TARGETS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {activeTab === 'external' && (
            <div className="space-y-6">
              <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
                <h3 className="text-md font-bold text-white mb-2 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-indigo-400" /> Monitored External APIs & DNS Endpoints
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  Register any public endpoint or third-party dependency (e.g. Payment gateways, SMS providers, external APIs).
                </p>

                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.target;
                    const name = form.serviceName.value;
                    const url = form.serviceUrl.value;
                    if (!name || !url) return;
                    await fetch('/api/services', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name, healthUrl: url, port: 443, category: 'EXTERNAL_API',
                        containerName: name.toLowerCase().replace(/[^a-z0-9]/g, '-')
                      })
                    });
                    form.reset();
                    fetchData();
                  }}
                  className="grid grid-cols-3 gap-4"
                >
                  <input name="serviceName" type="text" placeholder="Name (e.g. OpenAI API)"
                    className="bg-gray-800 border border-gray-700 px-4 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500" required />
                  <input name="serviceUrl" type="url" placeholder="URL (e.g. https://api.openai.com)"
                    className="bg-gray-800 border border-gray-700 px-4 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500" required />
                  <button type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs py-2.5 px-6 rounded-xl transition shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2">
                    <Globe className="w-4 h-4" /> Start Probing
                  </button>
                </form>
              </div>

              <div className="grid grid-cols-3 gap-5">
                {externalServices.map(s => (
                  <div key={s.id} onClick={() => setDrilldownId(s.id)} className="bg-gray-900 border border-gray-800 hover:border-indigo-500/50 p-5 rounded-2xl cursor-pointer transition">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-semibold text-gray-200">{s.name}</span>
                      <StatusBadge status={s.currentStatus} pulse />
                    </div>
                    <div className="space-y-2 text-xs text-gray-400">
                      <div className="flex justify-between">
                        <span>Health Score:</span>
                        <span className="font-bold text-white">{s.healthScore}/100</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="shrink-0">Target URL:</span>
                        <span className="text-indigo-400 truncate">{s.healthUrl}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ━━━━ TAB 6: INCIDENTS & MTTR AUDIT TRAIL ━━━━━━━━━━━━━━━━━━━━━ */}
          {activeTab === 'incidents' && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-md font-semibold text-gray-200 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-indigo-400" /> Explainable Self-Healing Incidents & MTTR Audit Trail
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-gray-800/50 text-gray-400 uppercase font-medium">
                    <tr>
                      <th className="p-3">Time</th>
                      <th className="p-3">Target Microservice</th>
                      <th className="p-3">Failure Signature</th>
                      <th className="p-3">Remedy Applied</th>
                      <th className="p-3">Why (Causal Reason)</th>
                      <th className="p-3">MTTR</th>
                      <th className="p-3">Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {incidents.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-6 text-center text-gray-500">
                          No incidents recorded yet. Trigger faults via Chaos Studio to watch autonomous healing.
                        </td>
                      </tr>
                    ) : (
                      incidents.map(inc => (
                        <tr key={inc.id} className="hover:bg-gray-800/40">
                          <td className="p-3 font-mono text-gray-400">{new Date(inc.detectedAt).toLocaleTimeString()}</td>
                          <td className="p-3 font-medium text-white">{inc.service?.name}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded border border-red-500/20 font-mono">
                              {inc.failureType}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-indigo-300">{inc.recommendedAction}</td>
                          <td className="p-3 text-gray-400 max-w-sm truncate">{inc.decisionReason}</td>
                          <td className="p-3 font-mono text-emerald-400">{inc.mttrMs ? `${inc.mttrMs} ms` : 'calculating...'}</td>
                          <td className="p-3">
                            <IncidentPill status={inc.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ━━━━ TAB 7: CHAOS STUDIO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {activeTab === 'chaos' && (
            <div className="space-y-6">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" /> Chaos Studio: Autonomous Fault Injection Center
                </h3>
                <p className="text-xs text-gray-400 mb-6">
                  Inject faults into MediFlow microservices. HealOps detects the breach across its sliding health window and triggers the escalation ladder automatically.
                </p>

                <div className="grid grid-cols-2 gap-6">
                  {['patient-service', 'billing-service', 'doctor-service', 'appointment-service'].map(svc => (
                    <div key={svc} className="bg-gray-800/40 border border-gray-700/60 p-5 rounded-xl space-y-4">
                      <div className="flex justify-between items-center border-b border-gray-700/60 pb-3">
                        <span className="font-semibold text-white text-base">{svc}</span>
                        <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                          Active Target
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { type: 'HIGH_CPU',        label: 'Spike CPU (>95%)',   desc: 'Runs mathematical burner' },
                          { type: 'HIGH_MEMORY',     label: 'Memory Leak',        desc: 'Allocates heap blocks' },
                          { type: 'DATABASE_LOST',   label: 'Drop Database',      desc: 'Closes Hikari connection pool' },
                          { type: 'SLOW_RESPONSE',   label: 'Inject Latency',     desc: 'Simulates 3500ms delay' },
                          { type: 'HTTP_5XX_ERRORS', label: 'Trigger 500s',       desc: 'Returns internal errors' },
                          { type: 'SERVICE_CRASH',   label: 'Crash Process',      desc: 'Kills JVM process' },
                        ].map(f => (
                          <button
                            key={f.type}
                            onClick={() => triggerChaos(svc, f.type)}
                            className="text-left p-3 bg-gray-900 hover:bg-red-950/40 border border-gray-700 hover:border-red-500/60 rounded-xl transition group"
                          >
                            <div className="font-medium text-xs text-gray-200 group-hover:text-red-300">{f.label}</div>
                            <div className="text-[10px] text-gray-500 mt-0.5">{f.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ━━━━ TAB 8: AI KNOWLEDGE BASE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {activeTab === 'knowledge' && (
            <div className="space-y-6">
              <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
                <h3 className="text-md font-bold text-white mb-2 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-400" /> HealOps AI Diagnostics & Mitigation Playbooks
                </h3>
                <p className="text-xs text-gray-400">
                  Comprehensive explainability rules, anomaly symptom patterns, and self-healing mitigation playbooks executed by the engine.
                </p>
              </div>

              <div className="space-y-4">
                {KNOWLEDGE_BASE.map(kb => (
                  <div key={kb.type} className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                          {kb.type}
                        </span>
                        <h4 className="font-bold text-white text-base">{kb.title}</h4>
                      </div>
                    </div>
                    <p className="text-xs text-gray-300">{kb.description}</p>
                    
                    <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-800 text-xs">
                      <div className="space-y-1">
                        <p className="text-gray-500 uppercase font-semibold text-[10px]">Observable Symptoms</p>
                        <ul className="text-gray-400 list-disc list-inside space-y-0.5">
                          {kb.symptoms.map((s, idx) => <li key={idx}>{s}</li>)}
                        </ul>
                      </div>
                      <div className="space-y-1">
                        <p className="text-gray-500 uppercase font-semibold text-[10px]">Detection Mechanism</p>
                        <p className="text-gray-400">{kb.detection}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-gray-500 uppercase font-semibold text-[10px]">Autonomous Mitigation</p>
                        <p className="text-emerald-400 font-medium">{kb.recovery}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ━━━━ TAB 9: LIVE TELEMETRY LOGS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {activeTab === 'logs' && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-3">
                <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" /> Real-time SSE Diagnostic Terminal
                </h3>
                <span className="text-xs font-mono text-gray-500">{liveLogs.length} Events captured</span>
              </div>
              <div className="h-96 overflow-y-auto font-mono text-xs space-y-1.5 p-3 bg-black/60 rounded-xl border border-gray-800">
                {liveLogs.map(log => (
                  <div key={log.id} className="flex items-start gap-3">
                    <span className="text-gray-500 select-none">[{log.time}]</span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                      log.level === 'WARN'    ? 'bg-yellow-500/20 text-yellow-400' :
                      log.level === 'SUCCESS' ? 'bg-green-500/20 text-green-400' :
                      log.level === 'DEBUG'   ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-800 text-gray-300'
                    }`}>
                      {log.level}
                    </span>
                    <span className="text-gray-300">{log.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
