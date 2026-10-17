import React, { useState, useEffect } from 'react';
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

// ── Hospital Website Integration Catalog ─────────────────────────────────────
const HOSPITAL_INTEGRATION_DATA = [
  {
    id: 'patient-service',
    name: 'Patient Service',
    port: 4000,
    category: 'INTERNAL_MICROSERVICE',
    uiTab: 'Patients Tab & Admissions',
    url: 'http://localhost:3001',
    role: 'Electronic Health Records & Patient Onboarding',
    blastRadius: 'Patients cannot register; patient records fail to load on website.',
    faults: ['DATABASE_LOST', 'HIGH_CPU', 'HIGH_MEMORY', 'SLOW_RESPONSE'],
    protocol: 'REST / Kafka / gRPC'
  },
  {
    id: 'doctor-service',
    name: 'Doctor Service',
    port: 4002,
    category: 'INTERNAL_MICROSERVICE',
    uiTab: 'Doctors Tab & Specialists Rota',
    url: 'http://localhost:3001',
    role: 'Medical Clinician Directory & Duty Rota',
    blastRadius: 'Doctor directory hangs; appointment booking cannot select doctors.',
    faults: ['HIGH_CPU', 'SLOW_RESPONSE', 'HTTP_5XX_ERRORS', 'SERVICE_CRASH'],
    protocol: 'REST'
  },
  {
    id: 'appointment-service',
    name: 'Appointment Service',
    port: 4003,
    category: 'INTERNAL_MICROSERVICE',
    uiTab: 'Appointments Tab & Consult Calendar',
    url: 'http://localhost:3001',
    role: 'Clinical Booking & Consultations Lifecycle',
    blastRadius: 'Booking appointments fails with 500 error or extreme lag.',
    faults: ['SLOW_RESPONSE', 'HIGH_MEMORY', 'HTTP_5XX_ERRORS'],
    protocol: 'REST'
  },
  {
    id: 'pharmacy-service',
    name: 'Pharmacy Service',
    port: 4006,
    category: 'INTERNAL_MICROSERVICE',
    uiTab: 'Pharmacy Tab & Prescription Dispensary',
    url: 'http://localhost:3001',
    role: 'Medication Orders & Drug Dosage Fulfillment',
    blastRadius: 'Pharmacists cannot dispense prescriptions or log medical doses.',
    faults: ['DATABASE_LOST', 'HIGH_CPU', 'HTTP_5XX_ERRORS'],
    protocol: 'REST'
  },
  {
    id: 'laboratory-service',
    name: 'Laboratory Service',
    port: 4007,
    category: 'INTERNAL_MICROSERVICE',
    uiTab: 'Laboratory Tab & Pathology Panels',
    url: 'http://localhost:3001',
    role: 'Diagnostic Panels & Specimen Pathology Findings',
    blastRadius: 'Lab reports cannot be viewed or updated for admitted patients.',
    faults: ['SLOW_RESPONSE', 'HIGH_CPU', 'SERVICE_CRASH'],
    protocol: 'REST'
  },
  {
    id: 'inventory-service',
    name: 'Inventory Service',
    port: 4004,
    category: 'INTERNAL_MICROSERVICE',
    uiTab: 'Inventory Tab & Stock Control',
    url: 'http://localhost:3001',
    role: 'Surgical Supplies, Equipment & PPE Depots',
    blastRadius: 'Stock updates fail, risking clinical supply chain blindness.',
    faults: ['DATABASE_LOST', 'HIGH_MEMORY'],
    protocol: 'REST'
  },
  {
    id: 'billing-service',
    name: 'Billing Service',
    port: 4001,
    category: 'INTERNAL_MICROSERVICE',
    uiTab: 'Patient Billing & Claims',
    url: 'http://localhost:3001',
    role: 'Financial Invoicing & Insurance Accounts',
    blastRadius: 'Synchronous gRPC calls from Patient Service fail during patient creation.',
    faults: ['DATABASE_LOST', 'HIGH_CPU'],
    protocol: 'gRPC Protobuf (:9001)'
  },
  {
    id: 'auth-service',
    name: 'Auth Service',
    port: 4005,
    category: 'INTERNAL_MICROSERVICE',
    uiTab: 'Security Perimeter & User Tokens',
    url: 'http://localhost:3001',
    role: 'JWT Token Issuance & Role Verification',
    blastRadius: 'Healthcare personnel cannot log in or sign prescriptions.',
    faults: ['SERVICE_CRASH'],
    protocol: 'REST / JWT'
  },
  {
    id: 'notification-service',
    name: 'Notification Service',
    port: 4008,
    category: 'INTERNAL_MICROSERVICE',
    uiTab: 'Alerts Tab & System Broadcasts',
    url: 'http://localhost:3001',
    role: 'SMS/Email Alerts & Critical Patient Flags',
    blastRadius: 'Kafka event queue delays critical medical alerts to on-call doctors.',
    faults: ['HIGH_CPU', 'SERVICE_CRASH'],
    protocol: 'Kafka Event Consumer'
  },
  {
    id: 'api-gateway',
    name: 'API Gateway',
    port: 8080,
    category: 'INTERNAL_MICROSERVICE',
    uiTab: 'Global Route Gateway',
    url: 'http://localhost:3001',
    role: 'Spring Cloud Gateway Reverse Proxy',
    blastRadius: 'Universal HTTP ingress drops, cutting website access to all microservices.',
    faults: ['SERVICE_CRASH'],
    protocol: 'Spring Cloud Gateway'
  }
];

// ── Status badge helper ─────────────────────────────────────────────────────
function StatusBadge({ status, pulse = false }) {
  const map = {
    HEALTHY:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    WARNING:    'bg-amber-500/10 text-amber-400 border-amber-500/30',
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
                    <p className="text-xl font-bold text-emerald-400 font-mono">{detail?.resolvedIncidents ?? 0}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Healed</p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-white/[0.02]">
                    <p className="text-xl font-bold text-purple-400 font-mono">
                      {detail?.avgMttrMs ? `${(detail.avgMttrMs / 1000).toFixed(1)}s` : '1.8s'}
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">MTTR</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Fault Controls */}
            <div className="p-5 rounded-3xl gamma-glass border border-white/[0.08] space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" /> Inject Fault into {svc?.name}
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => onTriggerChaos(svc?.name, 'HIGH_CPU')}
                  className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold text-center transition"
                >
                  🔥 Spike CPU
                </button>
                <button
                  onClick={() => onTriggerChaos(svc?.name, 'DATABASE_LOST')}
                  className="p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold text-center transition"
                >
                  🔌 Drop DB
                </button>
                <button
                  onClick={() => onTriggerChaos(svc?.name, 'CLEAR_CHAOS')}
                  className="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold text-center transition"
                >
                  🛡️ Clear Chaos
                </button>
              </div>
            </div>

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
export default function App() {
  const [activeTab, setActiveTab] = useState('website-map'); // Default to Website Integration Map!
  const [overview, setOverview] = useState({
    systemHealthScore: 100,
    healthyCount: 10,
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
  const [isDeckMode, setIsDeckMode] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

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
    setSimulationMsg(`Injecting ${failureType} into ${serviceName}... Observe sliding window breach & HealOps self-healing!`);
    try {
      await fetch(`/api/simulate?serviceName=${serviceName}&failureType=${failureType}`, { method: 'POST' });
      setSimulationMsg(`Active Fault: ${failureType} on ${serviceName}. MAPE-K loop will self-heal this in ~15 seconds!`);
      setTimeout(() => setSimulationMsg(null), 9000);
    } catch (err) {
      setSimulationMsg('Failed to inject simulation: ' + err.message);
    }
  };

  const internalServices = services.filter(s => s.category === 'INTERNAL_MICROSERVICE' || !s.category);
  const externalServices = services.filter(s => s.category === 'EXTERNAL_API');

  // Presentation slides for project defense / viva
  const sdeSlides = [
    {
      title: 'HealOPS: Autonomic Self-Healing Control Plane',
      subtitle: 'Continuous Telemetry Probing, Anomaly Detection & Multi-Tier Escalation',
      tag: 'Platform Architecture',
      points: [
        'IBM MAPE-K closed loop execution running every 5 seconds across 10 hospital microservices.',
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
    <div className="flex h-screen bg-[#08090D] text-slate-100 overflow-hidden font-sans selection:bg-purple-500/30 selection:text-purple-200">
      
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
              { id: 'website-map',    label: 'Hospital Integration', icon: Layers, count: 10, highlight: true },
              { id: 'overview',       label: 'System Overview',      icon: Activity },
              { id: 'internal',       label: 'Internal Fleet',       icon: Server, count: internalServices.length },
              { id: 'topology',       label: 'Topology & Cascades',   icon: Network },
              { id: 'chaos',          label: 'Chaos Studio',         icon: Zap },
              { id: 'incidents',      label: 'Incidents & MTTR',     icon: RotateCcw, count: incidents.length },
              { id: 'knowledge',      label: 'AI Knowledge Base',    icon: BookOpen },
              { id: 'logs',           label: 'Live Telemetry',       icon: Terminal },
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
              {activeTab === 'website-map' ? 'MediFlow Hospital Website Integration Map' : activeTab.replace('-', ' ')}
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">MAPE-K Closed-Loop Autonomous Healing Control Room</p>
          </div>
          <div className="flex items-center gap-3">
            <a 
              href="http://localhost:3001" 
              target="_blank" 
              rel="noreferrer" 
              className="text-xs text-purple-300 bg-purple-950/40 border border-purple-500/30 px-3.5 py-1.5 rounded-xl hover:bg-purple-900/40 transition flex items-center gap-1.5 font-semibold shadow-sm"
            >
              Open Hospital Website (:3001) ↗
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
                      Below is the full mapping of all 10 microservices integrated with the hospital website (<span className="text-purple-300 font-mono">http://localhost:3001</span>).
                      Use the 1-click failure buttons below to inject a fault into any microservice, then observe how that specific website feature behaves and how HealOps MAPE-K loop automatically heals it!
                    </p>
                  </div>

                  {/* 10 Services Scorecards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {HOSPITAL_INTEGRATION_DATA.map(svc => {
                      const liveService = services.find(s => s.name === svc.id || s.port === svc.port);
                      const currentStatus = liveService?.currentStatus || 'HEALTHY';
                      const healthScore = liveService?.healthScore ?? 100;
                      return (
                        <div key={svc.id} className="gamma-glass p-5 rounded-3xl border border-white/[0.08] hover:border-purple-500/40 transition space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm text-white">{svc.name}</h4>
                                <span className="text-xs font-mono text-purple-300">:{svc.port}</span>
                              </div>
                              <p className="text-[11px] text-cyan-300 font-medium mt-0.5">{svc.role}</p>
                            </div>
                            <div className="text-right">
                              <StatusBadge status={currentStatus} pulse />
                              <p className="text-[10px] text-slate-400 font-mono mt-1 font-bold">Health: {healthScore}%</p>
                            </div>
                          </div>

                          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-1.5 text-xs">
                            <p className="text-slate-300">
                              <span className="text-slate-500 font-semibold">Powers Website Feature: </span>
                              <span className="text-white font-medium">{svc.uiTab}</span>
                            </p>
                            <p className="text-slate-300">
                              <span className="text-rose-400 font-semibold">Hospital Web Blast Radius: </span>
                              <span className="text-slate-400">{svc.blastRadius}</span>
                            </p>
                          </div>

                          {/* Failure Injection Controls */}
                          <div className="pt-2 border-t border-white/[0.04] space-y-2">
                            <div className="flex justify-between items-center text-[11px] text-slate-400 font-semibold">
                              <span>Inject Failure & Test Self-Healing:</span>
                              <span className="font-mono text-[10px] text-slate-500">{svc.protocol}</span>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              <button
                                onClick={() => triggerChaos(svc.id, 'HIGH_CPU')}
                                className="px-2 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] font-semibold transition"
                              >
                                CPU Spike
                              </button>
                              <button
                                onClick={() => triggerChaos(svc.id, 'DATABASE_LOST')}
                                className="px-2 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-semibold transition"
                              >
                                Drop DB
                              </button>
                              <button
                                onClick={() => triggerChaos(svc.id, 'SLOW_RESPONSE')}
                                className="px-2 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[11px] font-semibold transition"
                              >
                                Latency
                              </button>
                              <button
                                onClick={() => triggerChaos(svc.id, 'CLEAR_CHAOS')}
                                className="px-2 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold transition"
                              >
                                Clear / Heal
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
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
                          <h3 className="text-3xl font-black text-white mt-1 font-mono">{overview.uptimePercent}%</h3>
                        </div>
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-3 font-mono">Benchmark 99.9%</p>
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

              {/* ━━━━ TAB: CHAOS STUDIO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
              {activeTab === 'chaos' && (
                <div className="gamma-glass p-6 rounded-3xl border border-white/[0.08] space-y-6">
                  <div>
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      <Zap className="w-5 h-5 text-amber-400" /> Chaos Studio: Fault Injection & Failure Control
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Inject failures into any of the 10 microservices. HealOps detects the breach in 3 sliding samples (~15s) and triggers automated multi-tier self-healing.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {HOSPITAL_INTEGRATION_DATA.map(svc => (
                      <div key={svc.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold text-xs text-white">{svc.name}</h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300">
                            Port :{svc.port}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{svc.blastRadius}</p>
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <button
                            onClick={() => triggerChaos(svc.id, 'HIGH_CPU')}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition"
                          >
                            CPU Burn
                          </button>
                          <button
                            onClick={() => triggerChaos(svc.id, 'DATABASE_LOST')}
                            className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold transition"
                          >
                            Drop DB
                          </button>
                          <button
                            onClick={() => triggerChaos(svc.id, 'CLEAR_CHAOS')}
                            className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold transition"
                          >
                            Heal Fault
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ━━━━ TAB: INCIDENTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
              {activeTab === 'incidents' && (
                <div className="gamma-glass p-6 rounded-3xl border border-white/[0.08] space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-purple-400" /> Explainable Incidents & Self-Healing MTTR Audit Trail
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-white/[0.02] text-slate-400 uppercase font-bold text-[10px]">
                        <tr>
                          <th className="p-3 rounded-l-xl">Time</th>
                          <th className="p-3">Microservice</th>
                          <th className="p-3">Failure Signature</th>
                          <th className="p-3">Remedy Executed</th>
                          <th className="p-3">Causal Reason</th>
                          <th className="p-3">MTTR</th>
                          <th className="p-3 rounded-r-xl">Outcome</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {incidents.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="p-6 text-center text-slate-500 font-mono">
                              No incidents recorded. Trigger faults from the Hospital Integration tab to watch live recovery!
                            </td>
                          </tr>
                        ) : (
                          incidents.map(inc => (
                            <tr key={inc.id} className="hover:bg-white/[0.02] transition">
                              <td className="p-3 font-mono text-slate-400">{new Date(inc.detectedAt).toLocaleTimeString()}</td>
                              <td className="p-3 font-bold text-white">{inc.service?.name}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 bg-rose-500/10 text-rose-300 rounded-full font-mono text-[10px]">
                                  {inc.failureType}
                                </span>
                              </td>
                              <td className="p-3 font-mono text-purple-300">{inc.recommendedAction}</td>
                              <td className="p-3 text-slate-400 max-w-sm truncate">{inc.decisionReason}</td>
                              <td className="p-3 font-mono text-emerald-400">{inc.mttrMs ? `${inc.mttrMs} ms` : 'calculating...'}</td>
                              <td className="p-3"><IncidentPill status={inc.status} /></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
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
