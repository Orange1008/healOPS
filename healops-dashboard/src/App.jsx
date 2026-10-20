import React, { useState, useEffect, useRef } from 'react';
import LandingPage from './LandingPage.jsx';
import { 
  Activity, ShieldCheck, AlertTriangle, Zap, Server, 
  Terminal, RotateCcw, CheckCircle2, XCircle, 
  Cpu, Database, Clock, RefreshCw, BarChart3, Sliders,
  X, ChevronRight, ExternalLink, AlertCircle, TrendingUp, Info,
  Network, BookOpen, HardDrive, Globe, Eye, ArrowRight, Play,
  Layers, Presentation, Sparkles, Filter, Check
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, BarChart, Bar 
} from 'recharts';

// ── Status badge helper ─────────────────────────────────────────────────────
function StatusBadge({ status, pulse = false }) {
  const map = {
    HEALTHY:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    WARNING:    'bg-amber-500/10 text-amber-400 border-amber-500/30',
    RECOVERING: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    CRITICAL:   'bg-rose-500/10 text-rose-400 border-rose-500/30',
    DOWN:       'bg-gray-500/10 text-gray-400 border-gray-500/30',
  };
  const cls = map[status] || map.DOWN;
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono border ${cls} ${pulse && status !== 'HEALTHY' ? 'animate-pulse' : ''}`}>
      {status}
    </span>
  );
}

function IncidentPill({ status }) {
  const map = {
    RECOVERED:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    IN_PROGRESS: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    UNRESOLVED:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
    INFO:        'bg-sky-500/10 text-sky-200 border-sky-400/30',
    MONITOR_ONLY:'bg-cyan-500/10 text-cyan-200 border-cyan-400/30',
    CRITICAL:    'bg-rose-500/10 text-rose-200 border-rose-400/30',
    WARNING:     'bg-amber-500/10 text-amber-200 border-amber-400/30',
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono border ${map[status] || 'bg-gray-800 text-gray-400 border-gray-700'}`}>{status}</span>;
}

function HealthRing({ score }) {
  const radius = 38;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#f43f5e';
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={radius} fill="none" stroke="#1f2430" strokeWidth="8" />
      <circle cx="48" cy="48" r={radius} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 48 48)" style={{ transition: 'stroke-dashoffset 0.5s' }} />
      <text x="48" y="53" textAnchor="middle" fill={color} fontSize="14" fontWeight="bold" fontFamily="monospace">{score}%</text>
    </svg>
  );
}

// ── AI Explainability Knowledge Base ─────────────────────────────────────────
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

const FAULT_LABELS = {
  HIGH_CPU: 'CPU spike', HIGH_MEMORY: 'Memory pressure', DATABASE_LOST: 'Database unavailable',
  SLOW_RESPONSE: 'Slow responses', HTTP_5XX_ERRORS: 'HTTP 5xx errors', SERVICE_CRASH: 'Service crash',
  CONTAINER_STOPPED: 'Container stopped', NETWORK_TIMEOUT: 'Network timeout'
};
const supportedFaults = service => (service?.supportedFaults || '').split(',').map(value => value.trim()).filter(Boolean);
const humanize = value => (value || 'Unknown').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
const recoveryActionLabel = (action, serviceName) => {
  const service = humanize(serviceName);
  switch (action) {
    case 'CLEAR_CHAOS': return `Clear simulated fault on ${service}`;
    case 'RECONNECT_DB_POOL': return `Reconnect database for ${service}`;
    case 'RESTART_SERVICE': return `Restart ${service}`;
    case 'RESTART_CONTAINER': return `Restart ${service} container`;
    case 'ALERT_ADMIN':
    case 'NOTIFY_ADMIN': return 'Escalate to an operator';
    default: return humanize(action);
  }
};
const durationLabel = milliseconds => milliseconds == null
  ? 'Operator action required'
  : milliseconds >= 1000
    ? `${(milliseconds / 1000).toFixed(milliseconds % 1000 === 0 ? 0 : 1)} sec`
    : `${milliseconds} ms`;

function RecoveryRecommendationCard({ incident }) {
  if (!incident) return (
    <section className="rounded-2xl border border-purple-400/20 bg-purple-500/[0.06] p-5">
      <div className="flex items-center gap-2 text-sm font-bold text-white"><Sparkles className="h-4 w-4 text-purple-300" />Recovery Recommendation Engine</div>
      <p className="mt-2 text-xs text-slate-400">No incident recommendation yet. When HealOps detects or receives a fault, its enabled recovery policy and rationale will appear here.</p>
    </section>
  );

  const monitorOnly = incident.service?.category === 'EXTERNAL_API' || incident.recommendedAction === 'MONITOR_ONLY';

  return (
    <section className="rounded-2xl border border-purple-400/25 bg-gradient-to-br from-purple-500/[0.10] to-indigo-500/[0.06] p-5 shadow-lg shadow-purple-950/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-white"><Sparkles className="h-4 w-4 text-purple-300" />Recovery Recommendation Engine</div>
          <p className="mt-1 text-xs text-slate-400">Rule-based decision from the detected failure and enabled recovery policy.</p>
        </div>
        <IncidentPill status={incident.status} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Incident</p>
          <p className="mt-1 text-sm font-semibold text-white">{FAULT_LABELS[incident.failureType] || humanize(incident.failureType)} · {incident.service?.name || 'Service'}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">{incident.issueDescription || humanize(incident.failureType)}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{monitorOnly ? 'Monitoring disposition' : 'Selected recovery policy'}</p>
          <p className="mt-1 text-sm font-semibold text-cyan-200">{monitorOnly ? 'Monitor Only · No Automatic Recovery' : recoveryActionLabel(incident.recommendedAction, incident.service?.name)}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">{incident.decisionReason || 'Policy rationale is not available for this historical incident.'}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3 md:col-span-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-slate-400">{monitorOnly ? 'Availability' : 'Estimated recovery time'}</span>
          <span className="font-mono text-sm font-bold text-emerald-300">{monitorOnly ? 'Waiting for endpoint to become healthy' : durationLabel(incident.estimatedMttrMs)}</span>
        </div>
      </div>
    </section>
  );
}

// ── Service Detail Drawer Component ──────────────────────────────────────────
function ServiceDetailPanel({ serviceId, onClose, onTriggerChaos }) {
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
      <div className="flex-1 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="w-[680px] bg-[#0B0D14] border-l border-white/[0.08] flex flex-col h-full overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] sticky top-0 bg-[#0B0D14]/90 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${svc?.currentStatus === 'HEALTHY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-white text-base">{svc?.name || 'Loading...'}</h2>
              <p className="text-xs text-slate-400 font-mono">{svc?.healthUrl}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/[0.06] rounded-xl text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mr-2 text-purple-400" /> Fetching real-time diagnostics...
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-6 gamma-glass rounded-3xl p-5 border border-white/[0.08]">
              <HealthRing score={svc?.healthScore ?? 0} />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <StatusBadge status={svc?.currentStatus} pulse />
                  <span className="text-xs text-slate-400 font-mono">Port :{svc?.port}</span>
                  <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-mono">
                    {svc?.category}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <div className="text-center p-2 rounded-xl bg-white/[0.02]">
                    <p className="text-xl font-bold text-white font-mono">{detail?.totalIncidents ?? 0}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Incidents</p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-white/[0.02]">
                    <p className="text-xl font-bold text-emerald-400 font-mono">{svc?.category === 'EXTERNAL_API' ? (svc?.currentStatus === 'HEALTHY' ? 'Available' : '—') : (detail?.resolvedIncidents ?? 0)}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">{svc?.category === 'EXTERNAL_API' ? 'Availability' : 'Healed'}</p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-white/[0.02]">
                    <p className="text-xl font-bold text-purple-400 font-mono">
                      {svc?.category === 'EXTERNAL_API' ? (svc?.lastResponseTimeMs == null ? '—' : `${svc.lastResponseTimeMs}ms`) : (detail?.avgMttrMs ? `${(detail.avgMttrMs / 1000).toFixed(1)}s` : '1.8s')}
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">MTTR</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Managed-service fault controls; external sites are monitor-only. */}
            {svc?.category === 'EXTERNAL_API' ? (
              <div className="p-5 rounded-3xl gamma-glass border border-cyan-400/30 space-y-2"><h4 className="text-xs font-bold text-cyan-700 uppercase tracking-wider">External Website · Monitor Only</h4><p className="text-xs text-slate-700">No Automatic Recovery. HealOps continues health checks and waits for the endpoint to become healthy.</p></div>
            ) : <div className="p-5 rounded-3xl gamma-glass border border-white/[0.08] space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" /> Inject Fault into {svc?.name}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {supportedFaults(svc).map(fault => <button key={fault} onClick={() => onTriggerChaos(svc.name, fault)} className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold text-center transition">{FAULT_LABELS[fault] || fault}</button>)}
                {svc?.chaosUrl && <button onClick={() => onTriggerChaos(svc.name, 'CLEAR_CHAOS')} className="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold text-center transition">Clear injected fault</button>}
                {!supportedFaults(svc).length && <p className="col-span-2 text-xs text-slate-500">No fault injection controls are implemented for this service.</p>}
              </div>
            </div>}

            {/* AI Diagnosis */}
            <div className={`p-5 rounded-3xl border ${
              svc?.currentStatus === 'HEALTHY' 
                ? 'bg-emerald-950/20 border-emerald-500/30' 
                : 'bg-rose-950/30 border-rose-500/30'
            }`}>
              <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 mb-2 ${
                svc?.currentStatus === 'HEALTHY' ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {svc?.currentStatus === 'HEALTHY' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                Explainable AI Diagnostic Verdict
              </h3>
              <p className="text-xs text-slate-200 leading-relaxed font-mono bg-black/40 p-3.5 rounded-2xl border border-white/[0.04]">
                {detail?.diagnosisSummary || 'Telemetry nominal. Service operating within normal SLA thresholds.'}
              </p>
              {svc?.dependencies && (
                <p className="text-xs text-slate-400 mt-2">
                  <span className="text-slate-500">Declared Dependencies: </span>
                  <span className="font-mono text-purple-300">{svc.dependencies}</span>
                </p>
              )}
            </div>

            {/* Live Metrics */}
            {metrics.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-400" /> Time-Series Telemetry
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="gamma-glass rounded-2xl p-4 border border-white/[0.08]">
                    <p className="text-[10px] text-slate-400 uppercase mb-2 font-bold">CPU Utilization (%)</p>
                    <div className="h-28">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={metrics}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2a2e3d" />
                          <XAxis dataKey="id" stroke="#64748b" fontSize={9} />
                          <YAxis stroke="#64748b" fontSize={9} domain={[0, 100]} />
                          <Area type="monotone" dataKey="cpuPercent" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="gamma-glass rounded-2xl p-4 border border-white/[0.08]">
                    <p className="text-[10px] text-slate-400 uppercase mb-2 font-bold">Latency (ms)</p>
                    <div className="h-28">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={metrics}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2a2e3d" />
                          <XAxis dataKey="id" stroke="#64748b" fontSize={9} />
                          <YAxis stroke="#64748b" fontSize={9} />
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

// ═════════════════════════════════════════════════════════════════════════════
//  MAIN HEALOPS SRE DASHBOARD APP
// ═════════════════════════════════════════════════════════════════════════════
function HealOpsDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState({
    systemHealthScore: 100,
    healthyCount: 0,
    warningCount: 0,
    criticalCount: 0,
    recoveriesToday: 0,
    uptimePercent: null
  });
  const [services, setServices] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [recoveryActions, setRecoveryActions] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [simulationMsg, setSimulationMsg] = useState(null);
  const [liveLogs, setLiveLogs] = useState([]);
  const [connectedSse, setConnectedSse] = useState(false);
  const [drilldownId, setDrilldownId] = useState(null);
  const [isDeckMode, setIsDeckMode] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [externalForm, setExternalForm] = useState({ name: '', url: '' });
  const [externalError, setExternalError] = useState('');
  const [externalBusy, setExternalBusy] = useState(false);
  const refreshInFlight = useRef(false);
  const recommendationIncident = incidents.find(incident =>
    ['IN_PROGRESS', 'UNRESOLVED'].includes(incident.status) && incident.recommendedAction
  ) || incidents.find(incident => incident.recommendedAction) || null;

  const fetchData = async () => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    try {
      const resources = [
        ['/api/overview', setOverview], ['/api/services', setServices],
        ['/api/incidents', setIncidents], ['/api/recovery-actions', setRecoveryActions],
        ['/api/audit-events', setAuditEvents], ['/api/policies', setPolicies]
      ];
      await Promise.all(resources.map(async ([url, update]) => {
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          update(await response.json());
        } catch (error) {
          console.debug(`HealOps resource ${url} is temporarily unavailable`, error);
        }
      }));
    } catch (err) {
      console.log('Error fetching data:', err);
    } finally { refreshInFlight.current = false; }
  };

  useEffect(() => {
    let stopped = false;
    let timer;
    const refresh = async () => {
      await fetchData();
      if (!stopped) timer = setTimeout(refresh, 5000);
    };
    refresh();
    return () => { stopped = true; clearTimeout(timer); };
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
    eventSource.addEventListener('FAULT_INJECTED', (e) => {
      const fault = JSON.parse(e.data);
      setServices(current => current.map(service => service.name === fault.serviceName
        ? { ...service, currentStatus: 'WARNING', healthScore: 65 }
        : service));
      addLog('WARN', `⚠️ FAULT INJECTED: ${fault.failureType} on ${fault.serviceName}`);
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
    setSimulationMsg(failureType === 'CLEAR_CHAOS'
      ? `Clearing injected faults from ${serviceName}...`
      : `Injecting ${failureType} into ${serviceName}... Observe the incident and recovery in MediFlow.`);
    try {
      const response = await fetch(`/api/simulate?serviceName=${encodeURIComponent(serviceName)}&failureType=${encodeURIComponent(failureType)}`, { method: 'POST' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
      if (result.error) throw new Error(result.error);
      setSimulationMsg(failureType === 'CLEAR_CHAOS'
        ? `Faults cleared for ${serviceName}. MediFlow will restore as soon as the service check passes.`
        : `Active Fault: ${failureType} on ${serviceName}. HealOps is detecting and recovering it; MediFlow shows the affected service status.`);
      setTimeout(() => setSimulationMsg(null), 9000);
    } catch (err) {
      setSimulationMsg('Failed to inject simulation: ' + err.message);
    }
  };

  const internalServices = services.filter(s => s.category === 'INTERNAL_MICROSERVICE' || !s.category);
  const externalServices = services.filter(s => s.category === 'EXTERNAL_API');

  const addExternalService = async (event) => {
    event.preventDefault();
    setExternalError('');
    setExternalBusy(true);
    try {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: externalForm.name.trim(),
          category: 'EXTERNAL_API',
          healthUrl: externalForm.url.trim(),
          port: Number(new URL(externalForm.url).port) || (new URL(externalForm.url).protocol === 'https:' ? 443 : 80),
          supportedRemedies: 'NOTIFY_ADMIN',
          enabled: true
        })
      });
      if (!response.ok) throw new Error(`Could not register website (HTTP ${response.status})`);
      setExternalForm({ name: '', url: '' });
      await fetchData();
      addLog('INFO', `External website added: ${externalForm.name.trim()}`);
    } catch (error) {
      setExternalError(error.message || 'Could not add this website. Check the name and URL.');
    } finally {
      setExternalBusy(false);
    }
  };

  const removeExternalService = async (service) => {
    if (!window.confirm(`Stop monitoring ${service.name}?`)) return;
    try {
      const response = await fetch(`/api/services/${service.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await fetchData();
    } catch (error) {
      setExternalError(`Could not remove ${service.name}: ${error.message}`);
    }
  };

  const updatePolicy = async (policyId, changes) => {
    const policy = policies.find(item => item.id === policyId);
    if (!policy) return;
    const updated = { ...policy, ...changes };
    setPolicies(current => current.map(item => item.id === policyId ? updated : item));
    try {
      const response = await fetch(`/api/policies/${policyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      addLog('INFO', `Recovery policy updated: ${updated.failureType} → ${updated.action}`);
    } catch (error) {
      setPolicies(current => current.map(item => item.id === policyId ? policy : item));
      setSimulationMsg(`Policy update failed. ${error.message || 'HealOps Core is unavailable.'}`);
      setTimeout(() => setSimulationMsg(null), 6000);
    }
  };

  // Presentation slides for project defense / viva
  const sdeSlides = [
    {
      title: 'HealOPS: Autonomic Self-Healing Control Plane',
      subtitle: 'Continuous Telemetry Probing, Anomaly Detection & Multi-Tier Escalation',
      tag: 'Platform Architecture',
      points: [
        'HealOps monitors the services registered in its persistent service registry.',
        'Sliding-window evaluation requiring 3 consecutive breaches to prevent false positives and flapping.',
        'Zero-polling Server-Sent Events (SSE) streaming live metrics and incident resolution to the browser.',
        'Automatic root-cause classification (DATABASE_LOST, HIGH_CPU, MEMORY_LEAK, SLOW_RESPONSE, 500s).'
      ]
    },
    {
      title: 'Hospital Website & Microservices Integration',
      subtitle: 'Every hospital web feature is isolated into an independent microservice',
      tag: 'Service Isolation',
      points: [
        'Patient Service (:4000) handles admissions and triggers gRPC billing account creation.',
        'Doctor Service (:4002) and Appointment Service (:4003) manage scheduling with Resilience4j circuit breakers.',
        'Pharmacy (:4006) and Laboratory (:4007) manage prescriptions and diagnostic specimens.',
        'Spring Cloud API Gateway (:8080) unifies ingress and prevents cascading blast radius.'
      ]
    },
    {
      title: 'Multi-Tier Escalation & Remediation Ladder',
      subtitle: 'Guaranteed recovery without human SRE intervention',
      tag: 'Autonomous Policies',
      points: [
        'Tier 1: Immediate Fault Clearance & In-Memory Reset (CLEAR_CHAOS).',
        'Tier 2: HikariCP Connection Pool Reconnect & JVM Garbage Collection sweep.',
        'Tier 3: Graceful Spring ApplicationContext Restart / Container Restart.',
        'Tier 4: Automated On-Call Alert Escalation with explainable root-cause diagnosis.'
      ]
    }
  ];

  return (
    <div className="healops-theme flex h-screen bg-[#08090D] text-slate-100 overflow-hidden font-sans selection:bg-purple-500/30 selection:text-purple-200">
      
      {/* ── Ambient Radial Glows ────────────────────────────────────────── */}
      <div className="fixed top-[-10%] left-[20%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] right-[10%] w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Drawer */}
      {drilldownId && (
        <ServiceDetailPanel
          serviceId={drilldownId}
          onClose={() => setDrilldownId(null)}
          onTriggerChaos={triggerChaos}
        />
      )}

      {/* ── Sidebar Navigation ──────────────────────────────────────────── */}
      <aside className="w-64 bg-[#0B0D14]/90 backdrop-blur-xl border-r border-white/[0.08] flex flex-col justify-between">
        <div>
          <div className="p-5 border-b border-white/[0.06] flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-2xl text-white shadow-glow-violet">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base text-white tracking-tight">HealOps</h1>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">
                  MAPE-K
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${connectedSse ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                <span className="text-[11px] text-slate-400 font-mono">{connectedSse ? 'SSE Stream Active' : 'Connecting...'}</span>
              </div>
            </div>
          </div>

          <nav className="p-3 space-y-1">
            {[
              { id: 'website-map',    label: 'Service Integration', icon: Layers, count: 10 },
              { id: 'overview',       label: 'Overview',              icon: Activity },
              { id: 'internal',       label: 'Fleet',                 icon: Server, count: internalServices.length },
              { id: 'external',       label: 'External Targets',      icon: Globe, count: externalServices.length },
              { id: 'topology',       label: 'Topology & Cascades',   icon: Network },
              { id: 'chaos',          label: 'Chaos Studio',         icon: Zap },
              { id: 'incidents',      label: 'Incidents',             icon: RotateCcw, count: incidents.length },
              { id: 'recoveries',     label: 'Recovery Center',       icon: CheckCircle2 },
              { id: 'policies',       label: 'Policy Manager',        icon: Sliders, count: policies.length },
              { id: 'knowledge',      label: 'AI Assistant & Knowledge', icon: BookOpen },
              { id: 'logs',           label: 'Telemetry',              icon: Terminal },
            ].map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setIsDeckMode(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-semibold transition ${
                    isActive 
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-glow-violet' 
                      : item.highlight 
                        ? 'text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20'
                        : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && item.count > 0 && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                      isActive ? 'bg-black/30 text-white' : 'bg-white/[0.06] text-slate-300'
                    }`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-white/[0.06] text-xs text-slate-500 flex justify-between items-center">
          <span className="font-mono">Port :8090 Core</span>
          <button
            onClick={() => setIsDeckMode(!isDeckMode)}
            className="px-2 py-1 bg-white/[0.06] hover:bg-white/[0.1] rounded-lg text-slate-300 text-[11px] font-semibold transition flex items-center gap-1"
          >
            <Presentation className="w-3.5 h-3.5 text-purple-400" /> Deck
          </button>
        </div>
      </aside>

      {/* ── Main Work Area ──────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-16 bg-[#08090D]/80 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-8 sticky top-0 z-20">
          <div>
            <h2 className="text-base font-extrabold capitalize text-white flex items-center gap-2">
              {activeTab === 'website-map' ? 'Service Integration' : activeTab.replace('-', ' ')}
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">Autonomous reliability operations for distributed services</p>
          </div>
          <div className="flex items-center gap-3">
            <a 
              href={`${window.location.protocol}//${window.location.hostname}:3001`}
              target="_blank" 
              rel="noreferrer" 
              className="text-xs text-purple-300 bg-purple-950/40 border border-purple-500/30 px-3.5 py-1.5 rounded-xl hover:bg-purple-900/40 transition flex items-center gap-1.5 font-semibold shadow-sm"
            >
              Open MediFlow ↗
            </a>
            <button onClick={fetchData} className="p-2 hover:bg-white/[0.06] rounded-xl text-slate-400 hover:text-white transition">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="p-8 space-y-6 flex-1">
          {simulationMsg && (
            <div className="p-4 gamma-glass border border-purple-500/50 rounded-2xl text-purple-200 flex items-center justify-between shadow-2xl animate-pulse">
              <div className="flex items-center gap-3 text-xs">
                <Zap className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="font-semibold">{simulationMsg}</span>
              </div>
            </div>
          )}

          {/* ━━━━ PRESENTATION DECK MODE (FOR PROJECT DEFENSE) ━━━━━━━━━━━━━━ */}
          {isDeckMode ? (
            <div className="gamma-glass rounded-3xl p-8 border border-purple-500/30 shadow-2xl space-y-6">
              <div className="flex justify-between items-center border-b border-white/[0.06] pb-3">
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-purple-500/20 text-purple-300">
                  Slide {currentSlide + 1} of {sdeSlides.length} • {sdeSlides[currentSlide].tag}
                </span>
                <div className="flex gap-2">
                  <button 
                    disabled={currentSlide === 0}
                    onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
                    className="px-3 py-1 rounded-xl bg-white/[0.06] text-xs font-semibold disabled:opacity-30"
                  >
                    Previous
                  </button>
                  <button 
                    disabled={currentSlide === sdeSlides.length - 1}
                    onClick={() => setCurrentSlide(prev => Math.min(sdeSlides.length - 1, prev + 1))}
                    className="px-3 py-1 rounded-xl bg-purple-600 text-white text-xs font-semibold disabled:opacity-30"
                  >
                    Next
                  </button>
                </div>
              </div>

              <div className="space-y-4 py-2">
                <h3 className="text-2xl font-black text-white">{sdeSlides[currentSlide].title}</h3>
                <p className="text-xs text-purple-300 font-semibold">{sdeSlides[currentSlide].subtitle}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                  {sdeSlides[currentSlide].points.map((pt, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-200 leading-relaxed flex items-start gap-3">
                      <div className="p-1 rounded bg-purple-500/20 text-purple-400 mt-0.5">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* ━━━━ TAB: HOSPITAL INTEGRATION & WEBSITE MATRIX (PRIMARY) ━━━━━ */}
              {activeTab === 'website-map' && (
                <div className="space-y-6">
                  {/* Explainer Banner */}
                  <div className="gamma-glass p-6 rounded-3xl border border-white/[0.08] space-y-2">
                    <div className="flex items-center gap-2.5">
                      <Layers className="w-5 h-5 text-purple-400" />
                      <h3 className="font-extrabold text-base text-white">
                        Complete MediFlow Hospital Website & Microservices Integration Architecture
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-4xl">
                      Monitor registered services. Fault controls appear only when that service exposes the matching chaos endpoint; incidents and recovery history are retained by HealOps.
                    </p>
                  </div>

                  {/* 10 Services Scorecards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {internalServices.map(svc => {
                      const currentStatus = svc.currentStatus || 'HEALTHY';
                      const healthScore = svc.healthScore ?? 100;
                      return (
                        <div key={svc.id} className="gamma-glass p-5 rounded-3xl border border-white/[0.08] hover:border-purple-500/40 transition space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm text-white">{svc.name}</h4>
                                <span className="text-xs font-mono text-purple-300">:{svc.port}</span>
                              </div>
                              <p className="text-[11px] text-cyan-300 font-medium mt-0.5">{svc.category || 'Registered service'}</p>
                            </div>
                            <div className="text-right">
                              <StatusBadge status={currentStatus} pulse />
                              <p className="text-[10px] text-slate-400 font-mono mt-1 font-bold">Health: {healthScore}%</p>
                            </div>
                          </div>

                          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-1.5 text-xs">
                            <p className="text-slate-300">
                              <span className="text-slate-500 font-semibold">Powers Website Feature: </span>
                              <span className="text-white font-medium">{svc.healthUrl}</span>
                            </p>
                            <p className="text-slate-300">
                              <span className="text-rose-400 font-semibold">Hospital Web Blast Radius: </span>
                              <span className="text-slate-400">{supportedFaults(svc).length ? `Fault controls: ${supportedFaults(svc).map(fault => FAULT_LABELS[fault] || fault).join(', ')}` : 'Monitoring only; no fault injection endpoint is configured.'}</span>
                            </p>
                          </div>


                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ━━━━ TAB: EXTERNAL WEBSITE MONITORING ━━━━━━━━━━━━━━━━━━━━━ */}
              {activeTab === 'external' && (
                <div className="space-y-6">
                  <div className="gamma-glass p-6 rounded-3xl border border-white/[0.08] space-y-2">
                    <div className="flex items-center gap-2.5">
                      <Globe className="w-5 h-5 text-cyan-400" />
                      <h3 className="font-extrabold text-base text-white">External Website Health Checks</h3>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Monitor public websites and APIs alongside the MediFlow services. HealOps checks each target every five seconds and records its status and response time.
                    </p>
                  </div>

                  <form onSubmit={addExternalService} className="gamma-glass p-5 rounded-3xl border border-white/[0.08] grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-3 items-end">
                    <label className="text-xs text-slate-400 space-y-1.5">
                      <span>Website name</span>
                      <input required maxLength={120} value={externalForm.name} onChange={event => setExternalForm(prev => ({ ...prev, name: event.target.value }))} placeholder="Company website" className="w-full bg-slate-950 border border-white/10 px-3 py-2.5 rounded-xl text-white focus:outline-none focus:border-purple-500" />
                    </label>
                    <label className="text-xs text-slate-400 space-y-1.5">
                      <span>Health check URL</span>
                      <input required type="url" value={externalForm.url} onChange={event => setExternalForm(prev => ({ ...prev, url: event.target.value }))} placeholder="https://example.com/health" className="w-full bg-slate-950 border border-white/10 px-3 py-2.5 rounded-xl text-white focus:outline-none focus:border-purple-500" />
                    </label>
                    <button disabled={externalBusy} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition flex items-center justify-center gap-2">
                      <Globe className="w-4 h-4" /> {externalBusy ? 'Adding…' : 'Start Monitoring'}
                    </button>
                    {externalError && <p role="alert" className="md:col-span-3 text-xs text-rose-300">{externalError}</p>}
                  </form>

                  {externalServices.length === 0 ? (
                    <div className="gamma-glass p-8 rounded-3xl border border-white/[0.08] text-center"><p className="text-sm font-semibold text-slate-200">No External Websites Added</p><p className="mt-1 text-xs text-slate-400">Add a public URL above to begin health monitoring.</p></div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {externalServices.map(service => (
                        <article key={service.id} className="gamma-glass p-5 rounded-3xl border border-white/[0.08] space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-white truncate">{service.name}</h4>
                              <a href={service.healthUrl} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-cyan-300 hover:underline truncate">{service.healthUrl}</a>
                              <span className="mt-2 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200">Monitor Only · External</span>
                            </div>
                            <StatusBadge status={service.currentStatus} pulse />
                          </div>
                          <div className="grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-3 text-xs">
                            <span className="text-slate-400">Health Score <strong className="text-slate-100">{service.healthScore}%</strong></span>
                            <span className="text-slate-400">Latency <strong className="text-slate-100">{service.lastResponseTimeMs == null ? '—' : `${service.lastResponseTimeMs} ms`}</strong></span>
                            <span className="text-slate-400">Availability <strong className="text-slate-100">{service.currentStatus === 'HEALTHY' ? 'Available' : service.currentStatus === 'WARNING' ? 'Degraded' : 'Unreachable'}</strong></span>
                            <span className="text-slate-400">Last Checked <strong className="text-slate-100">{service.lastPolledAt ? new Date(service.lastPolledAt).toLocaleTimeString() : 'Waiting for first check'}</strong></span>
                          </div>
                          <div className="flex items-center justify-between"><span className="text-[11px] font-semibold text-cyan-700">No Automatic Recovery</span><button onClick={() => removeExternalService(service)} className="text-[11px] font-semibold text-rose-700 hover:text-rose-800">Stop monitoring</button></div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'internal' && (
                <section className="gamma-glass p-6 rounded-3xl border border-white/[0.08] space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2"><Server className="w-4 h-4 text-purple-400" />Monitored Fleet</h3>
                    <p className="mt-1 text-xs text-slate-400">Managed services and external monitor-only targets, with live health and service relationships.</p>
                  </div>
                  {!services.length ? (
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center"><p className="font-semibold text-slate-200">No Services Available</p><p className="mt-1 text-xs text-slate-400">Registered services and external targets will appear here.</p></div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-white/[0.04] text-slate-600 uppercase font-bold text-[10px]"><tr><th className="p-3">Service</th><th className="p-3">Type</th><th className="p-3">Health</th><th className="p-3">Status</th><th className="p-3">Running State</th><th className="p-3">Relationships</th><th className="p-3">Endpoint</th></tr></thead>
                        <tbody className="divide-y divide-white/[0.08]">{services.map(service => <tr key={service.id} className="hover:bg-white/[0.04] cursor-pointer" onClick={() => setDrilldownId(service.id)}><td className="p-3 font-semibold text-slate-900">{service.name}</td><td className="p-3">{service.category === 'EXTERNAL_API' ? 'External Target · Monitor Only' : 'Managed Service'}</td><td className="p-3 font-mono font-bold">{service.healthScore}%</td><td className="p-3"><StatusBadge status={service.currentStatus} /></td><td className="p-3">{service.category === 'EXTERNAL_API' ? (service.currentStatus === 'HEALTHY' ? 'Available' : 'Unreachable') : (service.currentStatus === 'HEALTHY' ? 'Running' : service.currentStatus)}</td><td className="p-3">{service.dependencies || 'No dependencies listed'}</td><td className="p-3 max-w-64 truncate text-cyan-700">{service.healthUrl}</td></tr>)}</tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}

              {/* ━━━━ TAB: SYSTEM OVERVIEW ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="gamma-glass p-5 rounded-3xl border border-white/[0.08]">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Health Index</p>
                          <h3 className="text-3xl font-black text-white mt-1 font-mono">{overview.systemHealthScore}%</h3>
                        </div>
                        <div className={`p-3 rounded-2xl ${overview.systemHealthScore > 80 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          <Activity className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="mt-4 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full ${overview.systemHealthScore > 80 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${overview.systemHealthScore}%` }} />
                      </div>
                    </div>

                    <div className="gamma-glass p-5 rounded-3xl border border-white/[0.08]">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hospital Fleet</p>
                          <h3 className="text-2xl font-black text-white mt-1 font-mono">
                            <span className="text-emerald-400">{overview.healthyCount} UP</span> / {overview.warningCount + overview.criticalCount} DEGRADED
                          </h3>
                        </div>
                        <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-2xl">
                          <Server className="w-5 h-5" />
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-3 font-mono">10 Microservices Active</p>
                    </div>

                    <div className="gamma-glass p-5 rounded-3xl border border-white/[0.08]">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Self-Heal Recoveries</p>
                          <h3 className="text-3xl font-black text-purple-400 mt-1 font-mono">{overview.recoveriesToday}</h3>
                        </div>
                        <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl">
                          <RotateCcw className="w-5 h-5" />
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-3 font-mono">100% Policy-Driven</p>
                    </div>

                    <div className="gamma-glass p-5 rounded-3xl border border-white/[0.08]">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SLA Availability</p>
                          <h3 className="text-3xl font-black text-white mt-1 font-mono">{overview.uptimePercent == null ? '—' : `${overview.uptimePercent}%`}</h3>
                        </div>
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-3 font-mono">Availability history is not configured</p>
                    </div>
                  </div>

                  {/* Fleet Grid */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Server className="w-4 h-4 text-purple-400" /> Monitored Fleet (Click to investigate diagnostics)
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      {services.map(s => (
                        <div
                          key={s.id}
                          onClick={() => setDrilldownId(s.id)}
                          className="gamma-glass border border-white/[0.08] hover:border-purple-500/50 p-5 rounded-3xl cursor-pointer transition group"
                        >
                          <div className="flex justify-between items-center mb-3">
                            <span className="font-bold text-white text-xs">{s.name}</span>
                            <StatusBadge status={s.currentStatus} pulse />
                          </div>
                          <div className="space-y-1.5 text-xs text-slate-400 font-mono">
                            <div className="flex justify-between">
                              <span>Health Score:</span>
                              <span className="font-bold text-white">{s.healthScore}/100</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Port:</span>
                              <span className="text-purple-300">:{s.port}</span>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-white/[0.04] flex justify-between items-center text-[11px] text-purple-400 font-semibold">
                            <span>Deep Diagnostics</span>
                            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'topology' && (
                <section className="gamma-glass p-6 rounded-3xl border border-white/[0.08] space-y-5">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2"><Network className="w-4 h-4 text-cyan-400" />Service dependency topology</h3>
                    <p className="text-xs text-slate-400 mt-1">Live health from the monitored fleet. Downstream nodes are highlighted when an upstream dependency is unhealthy.</p>
                  </div>
                  <div className="flex flex-col md:flex-row gap-3 items-center">
                    {[['API Gateway', 'gateway'], ['Patient Service', 'patient'], ['Billing Service', 'billing'], ['Kafka', 'kafka'], ['Notification Service', 'notification']].map(([label, key], index, nodes) => {
                      const live = services.find(item => `${item.name} ${item.id}`.toLowerCase().includes(key));
                      const recovering = live?.currentStatus === 'RECOVERING';
                      const unhealthy = live && !recovering && !['HEALTHY', 'UP', 'RECOVERED'].includes((live.currentStatus || '').toUpperCase());
                      const upstreamFailed = nodes.slice(0, index).some(([, upstreamKey]) => {
                        const dependency = services.find(item => `${item.name} ${item.id}`.toLowerCase().includes(upstreamKey));
                        return dependency && !['HEALTHY', 'UP', 'RECOVERED'].includes((dependency.currentStatus || '').toUpperCase());
                      });
                      const nodeColor = unhealthy ? 'border-rose-500/60 bg-rose-500/10 text-rose-200' : recovering ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-100' : upstreamFailed ? 'border-amber-500/50 bg-amber-500/10 text-amber-100' : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-100';
                      return <React.Fragment key={key}><article className={`w-full md:flex-1 rounded-2xl border p-4 text-center ${nodeColor}`}><div className="flex justify-center mb-2"><Server className="w-5 h-5" /></div><h4 className="text-xs font-bold">{label}</h4><p className="mt-1 text-[10px] opacity-70">{live?.currentStatus || 'Awaiting telemetry'}</p></article>{index < nodes.length - 1 && <div className="rotate-90 md:rotate-0 flex justify-center text-slate-500" aria-hidden="true">→</div>}</React.Fragment>;
                    })}
                  </div>
                  <div className="flex flex-wrap gap-4 text-[11px] text-slate-400"><span><i className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-2" />Healthy</span><span><i className="inline-block w-2 h-2 rounded-full bg-rose-400 mr-2" />Affected service</span><span><i className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-2" />Downstream dependency impact</span></div>
                </section>
              )}

              {/* ━━━━ TAB: CHAOS STUDIO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
              {activeTab === 'chaos' && (
                <div className="gamma-glass p-6 rounded-3xl border border-white/[0.08] space-y-6">
                  <div>
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      <Zap className="w-5 h-5 text-amber-400" /> Chaos Studio: Fault Injection & Failure Control
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Inject failures into any of the 4 core hospital services. HealOps detects the breach in 3 sliding samples (~15s) and triggers automated multi-tier self-healing.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {internalServices.map(svc => (
                      <div key={svc.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold text-xs text-white">{svc.name}</h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300">
                            Port :{svc.port}
                          </span>
                        </div>
                          <p className="text-[11px] text-slate-400 truncate">{svc.chaosUrl ? 'Fault injection available' : 'Monitoring only'}</p>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {supportedFaults(svc).map(fault => <button key={fault} onClick={() => triggerChaos(svc.name, fault)} className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition">{FAULT_LABELS[fault] || fault}</button>)}
                          {svc.chaosUrl && <button onClick={() => triggerChaos(svc.name, 'CLEAR_CHAOS')} className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold transition">Clear fault</button>}
                          {!supportedFaults(svc).length && <p className="col-span-2 text-xs text-slate-500">No supported injection controls.</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ━━━━ TAB: INCIDENTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
              {activeTab === 'incidents' && (
                <div className="gamma-glass p-6 rounded-3xl border border-white/[0.08] space-y-4">
                  <RecoveryRecommendationCard incident={recommendationIncident} />
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-purple-400" /> Explainable Incidents & Self-Healing MTTR Audit Trail
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-white/[0.02] text-slate-400 uppercase font-bold text-[10px]">
                        <tr>
                          <th className="p-3 rounded-l-xl">Incident ID</th>
                          <th className="p-3">Severity</th>
                          <th className="p-3">Affected Service</th>
                          <th className="p-3">Root Cause</th>
                          <th className="p-3">Started</th>
                          <th className="p-3">Recovered</th>
                          <th className="p-3">MTTR</th>
                          <th className="p-3 rounded-r-xl">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {incidents.length === 0 ? (
                          <tr>
                            <td colSpan="8" className="p-6 text-center text-slate-500 font-mono">
                              No incidents recorded. Fault experiments and recovery events will appear here.
                            </td>
                          </tr>
                        ) : (
                          incidents.map(inc => (
                            <tr key={inc.id} onClick={() => inc.service?.id && setDrilldownId(inc.service.id)} className="hover:bg-white/[0.02] transition cursor-pointer">
                              <td className="p-3 font-mono text-slate-400">INC-{inc.id}</td>
                              <td className="p-3"><span className={`px-2 py-0.5 rounded-full font-mono text-[10px] ${inc.severity === 'CRITICAL' ? 'bg-rose-500/10 text-rose-300' : 'bg-amber-500/10 text-amber-300'}`}>{inc.severity || 'WARNING'}</span></td>
                              <td className="p-3 font-bold text-white">{inc.service?.name}</td>
                              <td className="p-3 text-slate-400 max-w-sm truncate">{inc.decisionReason || inc.issueDescription || inc.failureType}</td>
                              <td className="p-3 font-mono text-slate-400">{new Date(inc.detectedAt).toLocaleString()}</td>
                              <td className="p-3 font-mono text-slate-400">{inc.resolvedAt ? new Date(inc.resolvedAt).toLocaleString() : 'In progress'}</td>
                              <td className="p-3 font-mono text-emerald-400">{inc.mttrMs ? `${inc.mttrMs} ms` : '—'}</td>
                              <td className="p-3"><IncidentPill status={inc.status} /></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="pt-4">
                    <h4 className="text-xs font-bold text-white mb-3">Operator Activity History</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="text-slate-400 uppercase font-bold text-[10px] border-b border-white/[0.08]"><tr><th className="p-3">Time</th><th className="p-3">Event</th><th className="p-3">Service</th><th className="p-3">Details</th></tr></thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {auditEvents.map(event => <tr key={event.id}><td className="p-3 whitespace-nowrap text-slate-400">{new Date(event.createdAt).toLocaleString()}</td><td className="p-3 font-semibold text-purple-300">{event.eventType.replaceAll('_', ' ')}</td><td className="p-3 text-white">{event.serviceName || '—'}</td><td className="p-3 text-slate-400">{event.description}</td></tr>)}
                          {!auditEvents.length && <tr><td colSpan="4" className="p-5 text-center text-slate-500">Registrations and fault-control actions will be recorded here.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'recoveries' && (
                <div className="gamma-glass p-6 rounded-3xl border border-white/[0.08] space-y-4">
                  <RecoveryRecommendationCard incident={recommendationIncident} />
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" />Recovery Center</h3>
                    <p className="text-xs text-slate-400 mt-1">Completed and active recovery actions recorded by HealOps.</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="text-slate-400 uppercase font-bold text-[10px] border-b border-white/[0.08]"><tr><th className="p-3">Recovery ID</th><th className="p-3">Service</th><th className="p-3">Action</th><th className="p-3">Duration</th><th className="p-3">Mode</th><th className="p-3">Outcome</th><th className="p-3">Timestamp</th></tr></thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {recoveryActions.map(action => (
                          <tr key={action.id} className="hover:bg-white/[0.02]"><td className="p-3 font-mono">ACT-{action.id}</td><td className="p-3 font-semibold text-white">{action.incident?.service?.name || 'Service'}</td><td className="p-3 text-purple-300">{action.actionName}</td><td className="p-3 font-mono">{action.incident?.mttrMs ? `${action.incident.mttrMs} ms` : '—'}</td><td className="p-3">Automatic · Step {action.stepNumber}</td><td className="p-3"><IncidentPill status={action.result || action.incident?.status || 'IN_PROGRESS'} /></td><td className="p-3 text-slate-400">{action.endedAt ? new Date(action.endedAt).toLocaleString() : new Date(action.startedAt).toLocaleString()}</td></tr>
                        ))}
                        {recoveryActions.length === 0 && <tr><td colSpan="7" className="p-6 text-center text-slate-500">Recovery actions will appear here when HealOps responds to an incident.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'policies' && (
                <div className="gamma-glass p-6 rounded-3xl border border-white/[0.08] space-y-5">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2"><Sliders className="w-4 h-4 text-purple-400" />Recovery Policy Manager</h3>
                    <p className="text-xs text-slate-400 mt-1">Configure the automated response ladder, retry limit, cooldown, and policy state for each detected failure type.</p>
                  </div>
                  {policies.length === 0 ? (
                    <p className="p-6 text-center text-sm text-slate-400">No recovery policies are available from HealOps Core.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="text-slate-400 uppercase font-bold text-[10px] border-b border-white/[0.08]">
                          <tr><th className="p-3">Failure Type</th><th className="p-3">Step</th><th className="p-3">Recovery Action</th><th className="p-3">Retries</th><th className="p-3">Cooldown</th><th className="p-3">Enabled</th></tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {policies.map(policy => (
                            <tr key={policy.id}>
                              <td className="p-3 font-mono text-rose-300">{policy.failureType}</td>
                              <td className="p-3">{policy.stepNumber}</td>
                              <td className="p-3"><select aria-label={`${policy.failureType} recovery action`} value={policy.action} onChange={event => setPolicies(current => current.map(item => item.id === policy.id ? { ...item, action: event.target.value } : item))} onBlur={event => updatePolicy(policy.id, { action: event.target.value })} className="max-w-56 rounded-lg bg-slate-950 border border-white/10 px-2 py-1 text-purple-200"><option value={policy.action}>{policy.action}</option>{['CLEAR_CHAOS', 'RECONNECT_DB_POOL', 'RESTART_SERVICE', 'RESTART_CONTAINER', 'ALERT_ADMIN'].filter(action => action !== policy.action).map(action => <option key={action} value={action}>{action}</option>)}</select></td>
                              <td className="p-3"><input aria-label={`${policy.failureType} retries`} type="number" min="0" max="10" value={policy.maxRetries} onChange={event => setPolicies(current => current.map(item => item.id === policy.id ? { ...item, maxRetries: Number(event.target.value) } : item))} onBlur={event => updatePolicy(policy.id, { maxRetries: Number(event.target.value) })} className="w-16 rounded-lg bg-slate-950 border border-white/10 px-2 py-1 text-white" /></td>
                              <td className="p-3"><label className="flex items-center gap-1.5"><input aria-label={`${policy.failureType} cooldown seconds`} type="number" min="0" max="3600" value={policy.cooldownSeconds} onChange={event => setPolicies(current => current.map(item => item.id === policy.id ? { ...item, cooldownSeconds: Number(event.target.value) } : item))} onBlur={event => updatePolicy(policy.id, { cooldownSeconds: Number(event.target.value) })} className="w-20 rounded-lg bg-slate-950 border border-white/10 px-2 py-1 text-white" /><span className="text-slate-500">sec</span></label></td>
                              <td className="p-3"><button onClick={() => updatePolicy(policy.id, { enabled: !policy.enabled })} className={`rounded-full px-3 py-1 text-[10px] font-bold ${policy.enabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>{policy.enabled ? 'Enabled' : 'Paused'}</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ━━━━ TAB: AI KNOWLEDGE BASE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
              {activeTab === 'knowledge' && (
                <div className="gamma-glass p-6 rounded-3xl border border-white/[0.08] space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-400" /> Explainable Root-Cause Knowledge Base
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {KNOWLEDGE_BASE.map(kb => (
                      <div key={kb.type} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                          {kb.type}
                        </span>
                        <h4 className="font-bold text-sm text-white">{kb.title}</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">{kb.description}</p>
                        <div className="pt-2 text-xs text-slate-300 space-y-1">
                          <p><span className="text-slate-500">Detection:</span> {kb.detection}</p>
                          <p><span className="text-emerald-400">Recovery:</span> {kb.recovery}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ━━━━ TAB: LIVE TELEMETRY LOGS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
              {activeTab === 'logs' && (
                <div className="gamma-glass p-6 rounded-3xl border border-white/[0.08] space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan-400" /> Zero-Polling SSE Event Stream
                  </h3>
                  <div className="bg-black/60 p-4 rounded-2xl border border-white/[0.04] font-mono text-xs space-y-1.5 max-h-[500px] overflow-y-auto">
                    {liveLogs.map(l => (
                      <div key={l.id} className="flex gap-3">
                        <span className="text-slate-500">[{l.time}]</span>
                        <span className={
                          l.level === 'WARN' ? 'text-rose-400 font-bold' :
                          l.level === 'SUCCESS' ? 'text-emerald-400 font-bold' :
                          l.level === 'DEBUG' ? 'text-cyan-400' : 'text-slate-300'
                        }>
                          {l.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </main>

    </div>
  );
}

export default function App() {
  const isDashboard = window.location.pathname === '/dashboard' || window.location.pathname.startsWith('/dashboard/');
  return isDashboard ? <HealOpsDashboard /> : <LandingPage />;
}
