import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, Stethoscope, Calendar, Receipt, 
  Package, Pill, FlaskConical, Bell, Shield, 
  Activity, CheckCircle2, AlertTriangle, Search, Plus, 
  RefreshCw, TrendingUp, HeartPulse, Clock, Sparkles,
  Zap, ArrowRight, Play, Check, X, ShieldAlert, Cpu,
  Database, HelpCircle, Layers, Presentation, ExternalLink,
  Sliders, ChevronRight, AlertCircle, Info, Filter
} from 'lucide-react';

// ── Microservice Mapping Catalog ─────────────────────────────────────────────
const MICROSERVICES_CATALOG = [
  {
    id: 'patient-service',
    name: 'Patient Service',
    port: 4000,
    role: 'Electronic Health Records & Patient Registry',
    uiSection: 'Patients Tab & Admissions',
    impact: 'Patient registration fails and patient records cannot be retrieved.',
    chaosTypes: ['DATABASE_LOST', 'HIGH_CPU', 'HIGH_MEMORY', 'SLOW_RESPONSE'],
    protocol: 'REST / Kafka / gRPC Client'
  },
  {
    id: 'doctor-service',
    name: 'Doctor Service',
    port: 4002,
    role: 'Clinician Registry, Medical Specialties & Rota',
    uiSection: 'Doctors Tab & Specialist Directory',
    impact: 'Doctor roster becomes unavailable, blocking new appointment bookings.',
    chaosTypes: ['HIGH_CPU', 'SLOW_RESPONSE', 'HTTP_5XX_ERRORS', 'SERVICE_CRASH'],
    protocol: 'REST'
  },
  {
    id: 'appointment-service',
    name: 'Appointment Service',
    port: 4003,
    role: 'Outpatient Scheduling & Consultations',
    uiSection: 'Appointments Tab & Consult Calendar',
    impact: 'Patients cannot book consultations or update appointment status.',
    chaosTypes: ['SLOW_RESPONSE', 'HIGH_MEMORY', 'HTTP_5XX_ERRORS'],
    protocol: 'REST'
  },
  {
    id: 'pharmacy-service',
    name: 'Pharmacy Service',
    port: 4006,
    role: 'Prescriptions, Drug Dosages & Dispensary',
    uiSection: 'Pharmacy Tab & Prescription Dispensing',
    impact: 'Medication dispensing is halted and drug orders cannot be logged.',
    chaosTypes: ['DATABASE_LOST', 'HIGH_CPU', 'HTTP_5XX_ERRORS'],
    protocol: 'REST'
  },
  {
    id: 'laboratory-service',
    name: 'Laboratory Service',
    port: 4007,
    role: 'Pathology Orders & Diagnostic Panels',
    uiSection: 'Laboratory Tab & Diagnostics',
    impact: 'Diagnostic test results and pathology findings cannot be generated.',
    chaosTypes: ['SLOW_RESPONSE', 'HIGH_CPU', 'SERVICE_CRASH'],
    protocol: 'REST'
  },
  {
    id: 'inventory-service',
    name: 'Inventory Service',
    port: 4004,
    role: 'Medical Supplies, Stock & Equipment',
    uiSection: 'Inventory Tab & Stock Adjustments',
    impact: 'Hospital stock cannot be updated, risking shortage blindness.',
    chaosTypes: ['DATABASE_LOST', 'HIGH_MEMORY'],
    protocol: 'REST'
  },
  {
    id: 'billing-service',
    name: 'Billing Service',
    port: 4001,
    role: 'Invoicing & Claims Processing',
    uiSection: 'Patient Billing & Admissions',
    impact: 'Inter-service gRPC claims fail when registering new patients.',
    chaosTypes: ['DATABASE_LOST', 'HIGH_CPU'],
    protocol: 'gRPC Protobuf (:9001)'
  },
  {
    id: 'notification-service',
    name: 'Notification Service',
    port: 4008,
    role: 'Automated SMS, Email & Critical Alerts',
    uiSection: 'Notifications Tab & System Broadcasts',
    impact: 'Clinical alert notifications queue up without being dispatched.',
    chaosTypes: ['HIGH_CPU', 'SERVICE_CRASH'],
    protocol: 'Kafka Event Consumer'
  },
  {
    id: 'auth-service',
    name: 'Auth Service',
    port: 4005,
    role: 'JWT Token Issuance & Role Verification',
    uiSection: 'Security Perimeter & User Tokens',
    impact: 'Clinical staff cannot sign in or validate administrative tokens.',
    chaosTypes: ['SERVICE_CRASH'],
    protocol: 'REST / JWT'
  },
  {
    id: 'api-gateway',
    name: 'API Gateway',
    port: 8080,
    role: 'Unified Reverse Proxy & Rate Limiter',
    uiSection: 'Global Route Gateway',
    impact: 'Entire website traffic is severed if gateway crashes.',
    chaosTypes: ['SERVICE_CRASH'],
    protocol: 'Spring Cloud Gateway'
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState(null);
  const [isDeckMode, setIsDeckMode] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Modals
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [showBookAppointmentModal, setShowBookAppointmentModal] = useState(false);
  const [showFleetGuideModal, setShowFleetGuideModal] = useState(false);
  const [showChaosDrawer, setShowChaosDrawer] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Microservice data states
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [labReports, setLabReports] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [patients, setPatients] = useState([
    { id: '1', name: 'John Doe', email: 'john.doe@example.com', dateOfBirth: '1980-04-12', address: '123 Main St, Springfield', diagnosis: 'Arterial Hypertension' },
    { id: '2', name: 'Jane Smith', email: 'jane.smith@example.com', dateOfBirth: '1986-09-23', address: '456 Elm St, Shelbyville', diagnosis: 'Chronic Migraine' },
    { id: '3', name: 'Leo Vance', email: 'leo.vance@example.com', dateOfBirth: '2015-02-18', address: '789 Oak St, Capital City', diagnosis: 'Pediatric Asthma' }
  ]);

  // HealOps Live Control State
  const [healOpsStatus, setHealOpsStatus] = useState({
    connected: false,
    healthScore: 100,
    activeIncidents: 0,
    failingServices: []
  });

  // Forms
  const [newPatientForm, setNewPatientForm] = useState({
    name: '',
    email: '',
    address: '',
    dateOfBirth: '1990-01-01',
    diagnosis: 'General Health Check'
  });

  const [newAppointmentForm, setNewAppointmentForm] = useState({
    patientName: '',
    doctorName: '',
    appointmentTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    reason: 'Routine Medical Follow-up',
    priority: 'Normal'
  });

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // ── Fetch Fleet Data ────────────────────────────────────────────────────────
  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. Doctors (:4002)
      fetch('/api/doctors')
        .then(r => r.ok ? r.json() : [])
        .then(d => { if (Array.isArray(d) && d.length > 0) setDoctors(d); })
        .catch(() => {});

      // 2. Appointments (:4003)
      fetch('/api/appointments')
        .then(r => r.ok ? r.json() : [])
        .then(d => { if (Array.isArray(d) && d.length > 0) setAppointments(d); })
        .catch(() => {});

      // 3. Inventory (:4004)
      fetch('/api/inventory')
        .then(r => r.ok ? r.json() : [])
        .then(d => { if (Array.isArray(d) && d.length > 0) setInventory(d); })
        .catch(() => {});

      // 4. Pharmacy (:4006)
      fetch('/api/pharmacy')
        .then(r => r.ok ? r.json() : [])
        .then(d => { if (Array.isArray(d) && d.length > 0) setPrescriptions(d); })
        .catch(() => {});

      // 5. Laboratory (:4007)
      fetch('/api/laboratory')
        .then(r => r.ok ? r.json() : [])
        .then(d => { if (Array.isArray(d) && d.length > 0) setLabReports(d); })
        .catch(() => {});

      // 6. Notifications (:4008)
      fetch('/api/notifications')
        .then(r => r.ok ? r.json() : [])
        .then(d => { if (Array.isArray(d) && d.length > 0) setNotifications(d); })
        .catch(() => {});

      // 7. Patients (:4000)
      fetch('/api/patients')
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d && Array.isArray(d) && d.length > 0) setPatients(d); })
        .catch(() => {});

      // 8. HealOps Core Telemetry (:8090 via proxy)
      fetch('/healops/api/overview')
        .then(r => r.ok ? r.json() : null)
        .then(ov => {
          if (ov) {
            setHealOpsStatus(prev => ({
              ...prev,
              connected: true,
              healthScore: ov.systemHealthScore || 100,
              activeIncidents: (ov.warningCount || 0) + (ov.criticalCount || 0)
            }));
          }
        })
        .catch(() => {
          setHealOpsStatus(prev => ({ ...prev, connected: false }));
        });

      // Fetch failing services from HealOps
      fetch('/healops/api/services')
        .then(r => r.ok ? r.json() : null)
        .then(svcs => {
          if (Array.isArray(svcs)) {
            const failing = svcs.filter(s => s.currentStatus === 'CRITICAL' || s.currentStatus === 'WARNING');
            setHealOpsStatus(prev => ({
              ...prev,
              failingServices: failing
            }));
          }
        })
        .catch(() => {});

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 5000);
    return () => clearInterval(interval);
  }, []);

  // ── Actions: Add Patient ────────────────────────────────────────────────────
  const handleAddPatient = async (e) => {
    e.preventDefault();
    if (!newPatientForm.name || !newPatientForm.email) {
      showToast('Please enter both name and email', 'error');
      return;
    }

    const payload = {
      name: newPatientForm.name,
      email: newPatientForm.email,
      address: newPatientForm.address || 'MediFlow General Ward',
      dateOfBirth: newPatientForm.dateOfBirth,
      registeredDate: new Date().toISOString().slice(0, 10)
    };

    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const created = await res.json();
        setPatients(prev => [created, ...prev]);
        showToast(`Patient "${created.name}" registered in Patient Service (:4000)!`);
      } else {
        // Fallback local registration if backend is down / recovering
        const fallback = {
          id: 'P-' + Math.floor(Math.random() * 9000 + 1000),
          ...payload,
          diagnosis: newPatientForm.diagnosis
        };
        setPatients(prev => [fallback, ...prev]);
        showToast(`Registered locally: "${fallback.name}". (Backend is under HealOps monitoring)`);
      }
    } catch (err) {
      const fallback = {
        id: 'P-' + Math.floor(Math.random() * 9000 + 1000),
        ...payload,
        diagnosis: newPatientForm.diagnosis
      };
      setPatients(prev => [fallback, ...prev]);
      showToast(`Added patient locally: "${fallback.name}".`);
    }

    setShowAddPatientModal(false);
    setNewPatientForm({
      name: '',
      email: '',
      address: '',
      dateOfBirth: '1990-01-01',
      diagnosis: 'General Health Check'
    });
  };

  // ── Actions: Book Appointment ───────────────────────────────────────────────
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!newAppointmentForm.patientName || !newAppointmentForm.doctorName) {
      showToast('Please specify patient and doctor names', 'error');
      return;
    }

    const payload = {
      patientId: 1,
      doctorId: 1,
      patientName: newAppointmentForm.patientName,
      doctorName: newAppointmentForm.doctorName,
      appointmentTime: newAppointmentForm.appointmentTime,
      reason: newAppointmentForm.reason,
      status: 'CONFIRMED'
    };

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const created = await res.json();
        setAppointments(prev => [created, ...prev]);
        showToast(`Appointment booked with ${created.doctorName}!`);
      } else {
        const fallback = {
          id: 'APP-' + Math.floor(Math.random() * 9000 + 1000),
          ...payload
        };
        setAppointments(prev => [fallback, ...prev]);
        showToast(`Appointment scheduled locally for ${fallback.patientName}!`);
      }
    } catch (err) {
      const fallback = {
        id: 'APP-' + Math.floor(Math.random() * 9000 + 1000),
        ...payload
      };
      setAppointments(prev => [fallback, ...prev]);
      showToast(`Appointment recorded locally for ${fallback.patientName}!`);
    }

    setShowBookAppointmentModal(false);
  };

  // ── Actions: Dispense Prescription ─────────────────────────────────────────
  const handleDispensePrescription = async (id) => {
    try {
      await fetch(`/api/pharmacy/${id}/dispense`, { method: 'PUT' });
      setPrescriptions(prev => prev.map(p => p.id === id ? { ...p, status: 'DISPENSED' } : p));
      showToast(`Prescription #${id} dispensed successfully!`);
    } catch {
      setPrescriptions(prev => prev.map(p => p.id === id ? { ...p, status: 'DISPENSED' } : p));
      showToast(`Prescription #${id} marked as dispensed.`);
    }
  };

  // ── Actions: Adjust Inventory Stock ────────────────────────────────────────
  const handleAdjustStock = async (id, delta) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    const newQty = Math.max(0, (item.quantity || 0) + delta);
    try {
      await fetch(`/api/inventory/${id}/stock?quantity=${newQty}`, { method: 'PUT' });
      setInventory(prev => prev.map(i => i.id === id ? { ...i, quantity: newQty } : i));
      showToast(`Stock updated for ${item.name}: ${newQty} units`);
    } catch {
      setInventory(prev => prev.map(i => i.id === id ? { ...i, quantity: newQty } : i));
      showToast(`Stock updated for ${item.name}: ${newQty} units`);
    }
  };

  // ── Actions: Trigger Chaos from Hospital Dashboard ─────────────────────────
  const handleTriggerChaos = async (serviceName, failureType) => {
    showToast(`Injecting ${failureType} into ${serviceName}... Observe hospital impact & HealOps self-healing!`, 'warning');
    try {
      const res = await fetch(`/healops/api/simulate?serviceName=${serviceName}&failureType=${failureType}`, { method: 'POST' });
      if (res.ok) {
        showToast(`Active Chaos: ${failureType} on ${serviceName}. HealOps MAPE-K loop will heal this in ~15s!`, 'warning');
      }
    } catch (err) {
      showToast(`Simulation command dispatched to ${serviceName}.`, 'warning');
    }
    fetchAllData();
  };

  // ── AI Prompt / Command Bar Execution ──────────────────────────────────────
  const handleExecuteAiPrompt = (promptText = aiPrompt) => {
    const query = (promptText || '').toLowerCase();
    if (!query) return;

    if (query.includes('add patient') || query.includes('register patient')) {
      setShowAddPatientModal(true);
      setAiResponse(`Opening Patient Registration modal for you.`);
    } else if (query.includes('book') || query.includes('appointment') || query.includes('consult')) {
      setShowBookAppointmentModal(true);
      setAiResponse(`Opening Appointment Booking modal.`);
    } else if (query.includes('doctor') || query.includes('specialist')) {
      setActiveTab('doctors');
      setAiResponse(`Navigated to Medical Specialists Directory (:4002).`);
    } else if (query.includes('pharmacy') || query.includes('med') || query.includes('rx')) {
      setActiveTab('pharmacy');
      setAiResponse(`Navigated to Pharmacy & Prescription Dispensary (:4006).`);
    } else if (query.includes('lab') || query.includes('test') || query.includes('pathology')) {
      setActiveTab('laboratory');
      setAiResponse(`Navigated to Diagnostic Pathology Laboratory (:4007).`);
    } else if (query.includes('inventory') || query.includes('stock')) {
      setActiveTab('inventory');
      setAiResponse(`Navigated to Hospital Inventory & Supplies (:4004).`);
    } else if (query.includes('chaos') || query.includes('failure') || query.includes('fail') || query.includes('simulate')) {
      setShowChaosDrawer(true);
      setAiResponse(`Opened Failure Control & Chaos Injection Dock.`);
    } else if (query.includes('fleet') || query.includes('architecture') || query.includes('microservice')) {
      setShowFleetGuideModal(true);
      setAiResponse(`Opened Microservices Fleet Integration Guide.`);
    } else if (query.includes('deck') || query.includes('present') || query.includes('slide')) {
      setIsDeckMode(true);
      setAiResponse(`Switched to Gamma Slide Deck Presentation Mode!`);
    } else {
      setAiResponse(`MediFlow AI Assistant: Query recognized. Showing related clinical insights across ${patients.length} patients and ${doctors.length} active doctors.`);
    }
    setAiPrompt('');
  };

  // Filtered views
  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.diagnosis && p.diagnosis.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.email && p.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredDoctors = doctors.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.specialty && d.specialty.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (d.department && d.department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredAppointments = appointments.filter(a => 
    a.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.reason && a.reason.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Deck Mode Slides
  const deckSlides = [
    {
      title: 'MediFlow HMS & HealOps Autonomous Platform',
      tag: 'Executive Overview',
      subtitle: 'Self-Healing Healthcare Distributed Microservices Fleet with IBM MAPE-K Autonomics',
      stats: [
        { label: 'Microservices Fleet', val: '10 Nodes' },
        { label: 'Autonomous Loop', val: '5s Polling' },
        { label: 'Average MTTR', val: '< 1.8s' },
        { label: 'Availability', val: '99.9%' }
      ],
      body: 'MediFlow delivers clinical workflows (Patients, Doctors, Appointments, Pharmacy, Pathology) while HealOps continuously monitors, analyzes sliding windows, and self-heals operational anomalies autonomously.'
    },
    {
      title: 'Patient Registry & Consultation Pipeline',
      tag: 'Clinical Core',
      subtitle: 'Powered by patient-service (:4000) and appointment-service (:4003)',
      stats: [
        { label: 'Total Patients', val: patients.length },
        { label: 'Scheduled Consults', val: appointments.length },
        { label: 'Active Specialists', val: doctors.length },
        { label: 'gRPC Interconnect', val: 'Port 9001' }
      ],
      body: 'Demonstrates end-to-end patient onboarding, electronic health records, and scheduling with fault isolation and circuit breakers to guarantee zero clinical downtime.'
    },
    {
      title: 'Pharmacy, Laboratory & Supply Chain Fleet',
      tag: 'Hospital Operations',
      subtitle: 'Integrated Pharmacy (:4006), Laboratory (:4007) and Inventory (:4004)',
      stats: [
        { label: 'Prescriptions', val: prescriptions.length },
        { label: 'Diagnostic Panels', val: labReports.length },
        { label: 'Inventory Items', val: inventory.length },
        { label: 'Event Streaming', val: 'Kafka 9092' }
      ],
      body: 'Prescription dispensing, laboratory specimen tracking, and hospital stock thresholds synchronized across polyglot microservice boundaries.'
    },
    {
      title: 'Chaos Injection & Autonomic Self-Healing',
      tag: 'MAPE-K Engine',
      subtitle: 'Real-Time Fault Detection and Self-Recovery Demonstrator',
      stats: [
        { label: 'Health Score', val: `${healOpsStatus.healthScore}%` },
        { label: 'Sliding Window', val: '3 Breaches' },
        { label: 'Fault Signatures', val: '6 Vectors' },
        { label: 'Remediation', val: 'Autonomous' }
      ],
      body: 'Inject high CPU, memory leaks, database disconnects, or latency spikes. Watch HealOps identify the root cause and execute multi-tier recovery before any hospital outage occurs.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#08090D] text-slate-100 flex flex-col font-sans selection:bg-purple-500/30 selection:text-purple-200 relative overflow-x-hidden">
      
      {/* ── Ambient Radial Glows (Gamma Aesthetic) ─────────────────────────── */}
      <div className="fixed top-[-10%] left-[20%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] right-[10%] w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed top-[40%] right-[25%] w-[400px] h-[400px] bg-emerald-600/5 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* ── Toast Notification ────────────────────────────────────────────── */}
      {toastMessage && (
        <div className={`fixed top-5 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border transition animate-bounce ${
          toastMessage.type === 'error' ? 'bg-rose-950/90 border-rose-500/50 text-rose-200' :
          toastMessage.type === 'warning' ? 'bg-amber-950/90 border-amber-500/50 text-amber-200' :
          'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
        }`}>
          {toastMessage.type === 'error' ? <AlertCircle className="w-5 h-5 text-rose-400" /> :
           toastMessage.type === 'warning' ? <Zap className="w-5 h-5 text-amber-400" /> :
           <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          <span className="text-xs font-semibold">{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Active HealOps Incident Banner ─────────────────────────────────── */}
      {healOpsStatus.failingServices && healOpsStatus.failingServices.length > 0 && (
        <div className="bg-gradient-to-r from-rose-950/90 via-purple-950/90 to-amber-950/90 border-b border-rose-500/30 px-6 py-2.5 flex items-center justify-between text-xs backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <span className="font-bold text-rose-300">HealOps Self-Healing In Progress:</span>
            <span className="text-slate-300">
              {healOpsStatus.failingServices.map(s => `${s.name} (Port ${s.port})`).join(', ')} degraded. Autonomic MAPE-K closed-loop remediation active.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => handleTriggerChaos(healOpsStatus.failingServices[0].name, 'CLEAR_CHAOS')}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full font-semibold text-[11px] text-white transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" /> Quick Reset Fault
            </button>
            <a 
              href="http://localhost:8090" 
              target="_blank" 
              rel="noreferrer"
              className="text-[11px] font-semibold text-purple-300 hover:text-white underline"
            >
              Inspect in HealOps SRE Room ↗
            </a>
          </div>
        </div>
      )}

      {/* ── Header Navigation (Gamma Fluid Nav) ────────────────────────────── */}
      <header className="px-6 py-4 border-b border-white/[0.06] bg-[#08090D]/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center text-white shadow-glow-violet">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base tracking-tight text-white">MediFlow</h1>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  Gamma v2.5
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Hospital Management & Self-Healing Fleet</p>
            </div>
          </div>

          {/* Navigation Pill Switcher */}
          <nav className="hidden lg:flex items-center gap-1 p-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            {[
              { id: 'dashboard',     label: 'Dashboard',     icon: Activity },
              { id: 'patients',      label: 'Patients',      icon: Users, count: patients.length },
              { id: 'doctors',       label: 'Doctors',       icon: Stethoscope, count: doctors.length },
              { id: 'appointments',  label: 'Appointments',  icon: Calendar, count: appointments.length },
              { id: 'pharmacy',      label: 'Pharmacy',      icon: Pill, count: prescriptions.length },
              { id: 'laboratory',    label: 'Laboratory',    icon: FlaskConical, count: labReports.length },
              { id: 'inventory',     label: 'Inventory',     icon: Package, count: inventory.length },
              { id: 'notifications', label: 'Alerts',        icon: Bell, count: notifications.length },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setIsDeckMode(false); }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                    isActive 
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/30' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-black/30 text-white' : 'bg-white/[0.06] text-slate-400'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Header Action Controls */}
          <div className="flex items-center gap-2.5">
            {/* Story / Presentation Deck Button */}
            <button
              onClick={() => setIsDeckMode(!isDeckMode)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                isDeckMode 
                  ? 'bg-purple-600 border-purple-500 text-white shadow-glow-violet' 
                  : 'bg-white/[0.04] border-white/[0.08] text-slate-300 hover:bg-white/[0.08]'
              }`}
              title="Toggle Gamma Presentation Deck"
            >
              <Presentation className="w-3.5 h-3.5 text-purple-400" />
              <span>{isDeckMode ? 'Exit Deck' : 'Present Deck'}</span>
            </button>

            {/* Microservices Fleet Guide */}
            <button
              onClick={() => setShowFleetGuideModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:bg-white/[0.08] transition"
              title="Inspect 10 Microservices Integration"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Fleet Map</span>
            </button>

            {/* Failure Control & Chaos Studio */}
            <button
              onClick={() => setShowChaosDrawer(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition shadow-sm"
              title="Simulate Microservice Failures & Test Recovery"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Failure Control</span>
            </button>

            {/* HealOps Connection Pill */}
            <a 
              href="http://localhost:8090" 
              target="_blank" 
              rel="noreferrer"
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-300 hover:bg-purple-900/40 transition text-xs font-semibold"
            >
              <span className={`w-2 h-2 rounded-full ${healOpsStatus.connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              <span>HealOps :8090 ↗</span>
            </a>
          </div>
        </div>
      </header>

      {/* ── Main Canvas ───────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto w-full px-6 py-6 flex-1 flex flex-col space-y-6">

        {/* ── Gamma-Style AI Command & Prompt Bar ─────────────────────────── */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/30 via-cyan-500/30 to-purple-500/30 rounded-3xl blur-md opacity-60 group-hover:opacity-100 transition duration-700"></div>
          <div className="relative gamma-glass p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl">
            <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <Sparkles className="w-4 h-4 animate-spin-slow" />
              </div>
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleExecuteAiPrompt()}
                placeholder="Ask MediFlow AI or command: 'add patient', 'book appointment', 'test failure on Doctor Service'..."
                className="bg-transparent border-none text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none w-full font-medium"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => handleExecuteAiPrompt()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold shadow-md shadow-purple-600/30 hover:brightness-110 transition flex items-center gap-1.5"
              >
                <span>Generate / Run</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* AI Quick Prompt Suggestion Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] text-slate-500 font-medium shrink-0">Quick Actions:</span>
          {[
            { label: '+ Add Patient', action: () => setShowAddPatientModal(true) },
            { label: '+ Book Appointment', action: () => setShowBookAppointmentModal(true) },
            { label: '⚡ Test Doctor Failure', action: () => handleTriggerChaos('doctor-service', 'HIGH_CPU') },
            { label: '⚡ Test DB Pool Drop', action: () => handleTriggerChaos('patient-service', 'DATABASE_LOST') },
            { label: '🔄 Heal & Reset All', action: () => handleTriggerChaos('doctor-service', 'CLEAR_CHAOS') },
            { label: '🗺️ View 10 Services Map', action: () => setShowFleetGuideModal(true) }
          ].map((pill, idx) => (
            <button
              key={idx}
              onClick={pill.action}
              className="shrink-0 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] hover:border-purple-500/50 hover:bg-purple-500/10 text-slate-300 hover:text-purple-200 transition text-[11px] font-medium"
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* AI Response Toast */}
        {aiResponse && (
          <div className="gamma-glass p-3.5 rounded-2xl border border-purple-500/30 flex items-center justify-between gap-3 text-xs text-purple-200 bg-purple-950/20">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>{aiResponse}</span>
            </div>
            <button onClick={() => setAiResponse(null)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── PRESENTATION / DECK MODE ───────────────────────────────────────── */}
        {isDeckMode ? (
          <div className="gamma-glass rounded-3xl p-8 border border-purple-500/30 shadow-2xl space-y-6 animate-fade-in relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                  Slide {currentSlide + 1} of {deckSlides.length}
                </span>
                <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">
                  {deckSlides[currentSlide].tag}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentSlide === 0}
                  onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-30 text-xs font-medium"
                >
                  Previous
                </button>
                <button
                  disabled={currentSlide === deckSlides.length - 1}
                  onClick={() => setCurrentSlide(prev => Math.min(deckSlides.length - 1, prev + 1))}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 disabled:opacity-30 text-xs font-semibold text-white"
                >
                  Next Slide
                </button>
              </div>
            </div>

            <div className="space-y-4 py-4">
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                {deckSlides[currentSlide].title}
              </h2>
              <p className="text-sm text-purple-300 font-medium">
                {deckSlides[currentSlide].subtitle}
              </p>
              <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
                {deckSlides[currentSlide].body}
              </p>

              {/* Slide Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                {deckSlides[currentSlide].stats.map((s, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">{s.label}</p>
                    <p className="text-2xl font-black text-white mt-1 font-mono">{s.val}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-white/[0.06]">
              <div className="flex gap-2">
                {deckSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-2 rounded-full transition-all ${currentSlide === idx ? 'w-8 bg-purple-500' : 'w-2 bg-white/20'}`}
                  />
                ))}
              </div>
              <button 
                onClick={() => setIsDeckMode(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Exit Presentation Deck ✕
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ── TAB: DASHBOARD OVERVIEW ───────────────────────────────────── */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                
                {/* 4 Gamma Hero Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Card 1: Patients */}
                  <div className="gamma-glass p-5 rounded-3xl border border-white/[0.08] hover:border-purple-500/40 transition group relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patient Registry</span>
                        <h3 className="text-3xl font-black text-white mt-1 font-mono">{patients.length}</h3>
                      </div>
                      <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition">
                        <Users className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/[0.06]">
                      <span className="font-mono text-purple-300">Port :4000</span>
                      <button 
                        onClick={() => setShowAddPatientModal(true)} 
                        className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add
                      </button>
                    </div>
                  </div>

                  {/* Card 2: Doctors */}
                  <div className="gamma-glass p-5 rounded-3xl border border-white/[0.08] hover:border-cyan-500/40 transition group relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Medical Specialists</span>
                        <h3 className="text-3xl font-black text-white mt-1 font-mono">{doctors.length}</h3>
                      </div>
                      <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition">
                        <Stethoscope className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/[0.06]">
                      <span className="font-mono text-cyan-300">Port :4002</span>
                      <span className="text-emerald-400 font-semibold">4 Specializations</span>
                    </div>
                  </div>

                  {/* Card 3: Appointments */}
                  <div className="gamma-glass p-5 rounded-3xl border border-white/[0.08] hover:border-indigo-500/40 transition group relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Consults</span>
                        <h3 className="text-3xl font-black text-white mt-1 font-mono">{appointments.length}</h3>
                      </div>
                      <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition">
                        <Calendar className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/[0.06]">
                      <span className="font-mono text-indigo-300">Port :4003</span>
                      <button 
                        onClick={() => setShowBookAppointmentModal(true)} 
                        className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Book
                      </button>
                    </div>
                  </div>

                  {/* Card 4: HealOps Autonomous Availability */}
                  <div className="gamma-glass p-5 rounded-3xl border border-white/[0.08] hover:border-emerald-500/40 transition group relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">HealOps Health Score</span>
                        <h3 className="text-3xl font-black text-emerald-400 mt-1 font-mono">{healOpsStatus.healthScore}%</h3>
                      </div>
                      <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition">
                        <Shield className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/[0.06]">
                      <span className="font-mono text-emerald-300">MAPE-K Loop :8090</span>
                      <span className="text-emerald-400 font-semibold">10 Nodes Active</span>
                    </div>
                  </div>

                </div>

                {/* ── Two Column Clinical Operations & Diagnostics ──────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Consultations Card */}
                  <div className="gamma-glass p-6 rounded-3xl border border-white/[0.08] space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-white">Upcoming Consultations</h3>
                          <p className="text-[11px] text-slate-400">Appointment Service (:4003)</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowBookAppointmentModal(true)}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Book Consult
                      </button>
                    </div>

                    <div className="divide-y divide-white/[0.04] space-y-2">
                      {appointments.slice(0, 4).map(app => (
                        <div key={app.id} className="pt-3 flex items-center justify-between hover:bg-white/[0.02] p-2 rounded-xl transition">
                          <div>
                            <p className="text-xs font-bold text-white">{app.patientName}</p>
                            <p className="text-[11px] text-slate-400">{app.doctorName} • {app.reason}</p>
                          </div>
                          <div className="text-right">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                              {app.status || 'SCHEDULED'}
                            </span>
                            <p className="text-[10px] text-slate-500 mt-1 font-mono">
                              {new Date(app.appointmentTime).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Laboratory & Diagnostics Card */}
                  <div className="gamma-glass p-6 rounded-3xl border border-white/[0.08] space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                          <FlaskConical className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-white">Pathology Diagnostics</h3>
                          <p className="text-[11px] text-slate-400">Laboratory Service (:4007)</p>
                        </div>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 font-mono font-medium">
                        {labReports.length} Panels
                      </span>
                    </div>

                    <div className="divide-y divide-white/[0.04] space-y-2">
                      {labReports.slice(0, 4).map(lab => (
                        <div key={lab.id} className="pt-3 flex items-center justify-between hover:bg-white/[0.02] p-2 rounded-xl transition">
                          <div>
                            <p className="text-xs font-bold text-white">{lab.patientName} — {lab.testName}</p>
                            <p className="text-[11px] text-slate-400 truncate max-w-xs">{lab.resultSummary}</p>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            {lab.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* ── Live Microservice Integration Status Matrix (Direct Understanding) ── */}
                <div className="gamma-glass p-6 rounded-3xl border border-white/[0.08] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-white flex items-center gap-2">
                        <Layers className="w-4 h-4 text-purple-400" />
                        Integrated Microservices Health & Feature Matrix
                      </h3>
                      <p className="text-xs text-slate-400">
                        Direct connection status of every microservice powering this hospital platform.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowChaosDrawer(true)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/20 transition flex items-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" /> Test Microservice Failure
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                    {MICROSERVICES_CATALOG.slice(0, 6).map(svc => {
                      const isFailing = healOpsStatus.failingServices?.some(f => f.name === svc.id || f.port === svc.port);
                      return (
                        <div key={svc.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-purple-500/30 transition space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-xs text-white">{svc.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono border ${
                              isFailing 
                                ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 animate-pulse' 
                                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            }`}>
                              {isFailing ? 'DEGRADED / HEALING' : 'ONLINE'}
                            </span>
                          </div>
                          <p className="text-[11px] text-purple-300 font-medium">{svc.uiSection}</p>
                          <div className="flex justify-between text-[10px] text-slate-500 pt-1 border-t border-white/[0.04]">
                            <span className="font-mono">Port :{svc.port}</span>
                            <span className="font-mono">{svc.protocol}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

            {/* ── TAB: PATIENTS ────────────────────────────────────────────── */}
            {activeTab === 'patients' && (
              <div className="gamma-glass p-6 rounded-3xl border border-white/[0.08] space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-400" /> Patient Medical Registry
                    </h3>
                    <p className="text-xs text-slate-400">
                      Powered by <span className="font-mono text-purple-300">patient-service (:4000)</span> with gRPC billing interconnect.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search patient, diagnosis..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <button
                      onClick={() => setShowAddPatientModal(true)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold shadow-glow-violet hover:brightness-110 transition flex items-center gap-1.5 shrink-0"
                    >
                      <Plus className="w-4 h-4" /> Add Patient
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-white/[0.02] text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3.5 rounded-l-xl">ID / Token</th>
                        <th className="p-3.5">Full Name</th>
                        <th className="p-3.5">Email Contact</th>
                        <th className="p-3.5">Date of Birth</th>
                        <th className="p-3.5">Address</th>
                        <th className="p-3.5 rounded-r-xl text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {filteredPatients.map(p => (
                        <tr key={p.id} className="hover:bg-white/[0.02] transition">
                          <td className="p-3.5 font-mono text-purple-300">#{String(p.id).slice(0, 8)}</td>
                          <td className="p-3.5 font-bold text-white">{p.name}</td>
                          <td className="p-3.5 text-slate-300 font-mono">{p.email}</td>
                          <td className="p-3.5 text-slate-400">{p.dateOfBirth}</td>
                          <td className="p-3.5 text-slate-400 max-w-xs truncate">{p.address}</td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => {
                                setNewAppointmentForm(prev => ({ ...prev, patientName: p.name }));
                                setShowBookAppointmentModal(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-medium text-[11px] transition"
                            >
                              Book Consult
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── TAB: DOCTORS ─────────────────────────────────────────────── */}
            {activeTab === 'doctors' && (
              <div className="gamma-glass p-6 rounded-3xl border border-white/[0.08] space-y-5">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Stethoscope className="w-5 h-5 text-cyan-400" /> Medical Specialists & Practitioners
                    </h3>
                    <p className="text-xs text-slate-400">
                      Powered by <span className="font-mono text-cyan-300">doctor-service (:4002)</span>
                    </p>
                  </div>
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    {doctors.length} On Duty
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDoctors.map(doc => (
                    <div key={doc.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-cyan-500/30 transition space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-sm text-white">{doc.name}</h4>
                          <p className="text-xs text-cyan-300 font-medium mt-0.5">{doc.specialty}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          {doc.available ? 'AVAILABLE' : 'IN SURGERY'}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-slate-400 pt-2 border-t border-white/[0.04]">
                        <p>Department: <span className="text-slate-200">{doc.department}</span></p>
                        <p>Email: <span className="text-slate-300 font-mono">{doc.email}</span></p>
                        <p>Phone: <span className="text-slate-300 font-mono">{doc.phone}</span></p>
                      </div>
                      <button
                        onClick={() => {
                          setNewAppointmentForm(prev => ({ ...prev, doctorName: doc.name }));
                          setShowBookAppointmentModal(true);
                        }}
                        className="w-full mt-2 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-semibold transition"
                      >
                        Schedule with {doc.name.split(' ')[1] || 'Doctor'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TAB: APPOINTMENTS ────────────────────────────────────────── */}
            {activeTab === 'appointments' && (
              <div className="gamma-glass p-6 rounded-3xl border border-white/[0.08] space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-indigo-400" /> Patient Consultations & Scheduling
                    </h3>
                    <p className="text-xs text-slate-400">
                      Powered by <span className="font-mono text-indigo-300">appointment-service (:4003)</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setShowBookAppointmentModal(true)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold shadow-glow-violet hover:brightness-110 transition flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Book Appointment
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-white/[0.02] text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3.5 rounded-l-xl">Ref ID</th>
                        <th className="p-3.5">Patient</th>
                        <th className="p-3.5">Doctor</th>
                        <th className="p-3.5">Reason</th>
                        <th className="p-3.5">Scheduled Slot</th>
                        <th className="p-3.5 rounded-r-xl">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {filteredAppointments.map(app => (
                        <tr key={app.id} className="hover:bg-white/[0.02] transition">
                          <td className="p-3.5 font-mono text-indigo-300">#{app.id}</td>
                          <td className="p-3.5 font-bold text-white">{app.patientName}</td>
                          <td className="p-3.5 text-cyan-200">{app.doctorName}</td>
                          <td className="p-3.5 text-slate-400">{app.reason}</td>
                          <td className="p-3.5 font-mono text-slate-300">{new Date(app.appointmentTime).toLocaleString()}</td>
                          <td className="p-3.5">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                              {app.status || 'CONFIRMED'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── TAB: PHARMACY ────────────────────────────────────────────── */}
            {activeTab === 'pharmacy' && (
              <div className="gamma-glass p-6 rounded-3xl border border-white/[0.08] space-y-5">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Pill className="w-5 h-5 text-teal-400" /> Prescriptions & Dispensary Management
                    </h3>
                    <p className="text-xs text-slate-400">
                      Powered by <span className="font-mono text-teal-300">pharmacy-service (:4006)</span>
                    </p>
                  </div>
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                    {prescriptions.length} Active Prescriptions
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-white/[0.02] text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3.5 rounded-l-xl">Rx ID</th>
                        <th className="p-3.5">Patient</th>
                        <th className="p-3.5">Medication</th>
                        <th className="p-3.5">Dosage</th>
                        <th className="p-3.5">Frequency</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 rounded-r-xl text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {prescriptions.map(p => (
                        <tr key={p.id} className="hover:bg-white/[0.02] transition">
                          <td className="p-3.5 font-mono text-teal-300">#{p.id}</td>
                          <td className="p-3.5 font-bold text-white">{p.patientName}</td>
                          <td className="p-3.5 text-teal-300 font-semibold">{p.medication}</td>
                          <td className="p-3.5 font-mono">{p.dosage}</td>
                          <td className="p-3.5 text-slate-400">{p.frequency}</td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                              p.status === 'DISPENSED' 
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' 
                                : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            {p.status !== 'DISPENSED' ? (
                              <button
                                onClick={() => handleDispensePrescription(p.id)}
                                className="px-3 py-1 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-xs font-semibold transition"
                              >
                                Dispense Rx
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-500">Completed ✓</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── TAB: LABORATORY ──────────────────────────────────────────── */}
            {activeTab === 'laboratory' && (
              <div className="gamma-glass p-6 rounded-3xl border border-white/[0.08] space-y-5">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <FlaskConical className="w-5 h-5 text-purple-400" /> Diagnostic Pathology & Specimens
                    </h3>
                    <p className="text-xs text-slate-400">
                      Powered by <span className="font-mono text-purple-300">laboratory-service (:4007)</span>
                    </p>
                  </div>
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    {labReports.length} Diagnostics
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {labReports.map(lab => (
                    <div key={lab.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-purple-500/30 transition space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-sm text-white">{lab.testName}</h4>
                          <p className="text-xs text-purple-300 font-medium">Patient: {lab.patientName}</p>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          {lab.status}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-black/40 border border-white/[0.04]">
                        <p className="text-xs text-slate-300 leading-relaxed font-mono">
                          {lab.resultSummary}
                        </p>
                      </div>
                      <p className="text-[10px] text-slate-500">Specimen Requisition #{lab.id}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TAB: INVENTORY ───────────────────────────────────────────── */}
            {activeTab === 'inventory' && (
              <div className="gamma-glass p-6 rounded-3xl border border-white/[0.08] space-y-5">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Package className="w-5 h-5 text-amber-400" /> Medical Supplies & Equipment Stock
                    </h3>
                    <p className="text-xs text-slate-400">
                      Powered by <span className="font-mono text-amber-300">inventory-service (:4004)</span>
                    </p>
                  </div>
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    {inventory.length} SKUs Tracked
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {inventory.map(item => {
                    const isLow = (item.quantity || 0) < 30;
                    return (
                      <div key={item.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-amber-500/30 transition space-y-3">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-sm text-white">{item.name}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono border ${
                            isLow ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 animate-pulse' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                          }`}>
                            {isLow ? 'LOW STOCK' : 'IN STOCK'}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-white font-mono">{item.quantity}</span>
                          <span className="text-xs text-slate-500 font-mono">units remaining</span>
                        </div>
                        <p className="text-[11px] text-slate-400">Category: {item.category || 'Clinical Supply'}</p>
                        <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
                          <button
                            onClick={() => handleAdjustStock(item.id, 10)}
                            className="flex-1 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-slate-200 transition"
                          >
                            +10 Restock
                          </button>
                          <button
                            onClick={() => handleAdjustStock(item.id, -1)}
                            className="px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-slate-200 transition"
                          >
                            -1 Use
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── TAB: NOTIFICATIONS ───────────────────────────────────────── */}
            {activeTab === 'notifications' && (
              <div className="gamma-glass p-6 rounded-3xl border border-white/[0.08] space-y-5">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Bell className="w-5 h-5 text-indigo-400" /> Hospital Alerts & Notification Dispatch
                    </h3>
                    <p className="text-xs text-slate-400">
                      Powered by <span className="font-mono text-indigo-300">notification-service (:4008)</span> via Kafka events
                    </p>
                  </div>
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    Live Stream
                  </span>
                </div>

                <div className="space-y-3">
                  {notifications.map(n => (
                    <div key={n.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                          <Bell className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{n.title || n.message}</p>
                          <p className="text-[11px] text-slate-400 font-mono">Recipient: {n.recipient || 'All Staff'}</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.06] text-slate-300">
                        {n.status || 'SENT'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

      </main>

      {/* ── MODAL: ADD PATIENT ────────────────────────────────────────────── */}
      {showAddPatientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setShowAddPatientModal(false)} />
          <div className="relative gamma-glass p-6 rounded-3xl border border-purple-500/30 max-w-lg w-full space-y-5 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-base text-white">Register New Patient</h3>
              </div>
              <button onClick={() => setShowAddPatientModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddPatient} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eleanor Vance"
                  value={newPatientForm.name}
                  onChange={(e) => setNewPatientForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="eleanor@example.com"
                    value={newPatientForm.email}
                    onChange={(e) => setNewPatientForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={newPatientForm.dateOfBirth}
                    onChange={(e) => setNewPatientForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Primary Diagnosis / Complaint</label>
                <input
                  type="text"
                  placeholder="e.g. Acute Bronchitis"
                  value={newPatientForm.diagnosis}
                  onChange={(e) => setNewPatientForm(prev => ({ ...prev, diagnosis: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Residential Address</label>
                <input
                  type="text"
                  placeholder="742 Evergreen Terrace"
                  value={newPatientForm.address}
                  onChange={(e) => setNewPatientForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddPatientModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold shadow-glow-violet hover:brightness-110"
                >
                  Register Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: BOOK APPOINTMENT ──────────────────────────────────────── */}
      {showBookAppointmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setShowBookAppointmentModal(false)} />
          <div className="relative gamma-glass p-6 rounded-3xl border border-indigo-500/30 max-w-lg w-full space-y-5 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base text-white">Book Medical Consultation</h3>
              </div>
              <button onClick={() => setShowBookAppointmentModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBookAppointment} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Patient Name</label>
                <input
                  type="text"
                  required
                  placeholder="Select or type patient name..."
                  value={newAppointmentForm.patientName}
                  onChange={(e) => setNewAppointmentForm(prev => ({ ...prev, patientName: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Doctor Specialist</label>
                <select
                  required
                  value={newAppointmentForm.doctorName}
                  onChange={(e) => setNewAppointmentForm(prev => ({ ...prev, doctorName: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Choose Specialist (:4002) --</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.name}>
                      {d.name} ({d.specialty})
                    </option>
                  ))}
                  {doctors.length === 0 && (
                    <option value="Dr. Sarah Adams">Dr. Sarah Adams (Cardiology)</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Slot Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={newAppointmentForm.appointmentTime}
                    onChange={(e) => setNewAppointmentForm(prev => ({ ...prev, appointmentTime: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Priority</label>
                  <select
                    value={newAppointmentForm.priority}
                    onChange={(e) => setNewAppointmentForm(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Routine">Routine</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Follow-up">Follow-up</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Consultation Reason</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cardiovascular checkup"
                  value={newAppointmentForm.reason}
                  onChange={(e) => setNewAppointmentForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowBookAppointmentModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold shadow-glow-violet hover:brightness-110"
                >
                  Confirm Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DRAWER: HEALOPS FAILURE CONTROL & CHAOS STUDIO ───────────────── */}
      {showChaosDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowChaosDrawer(false)} />
          <div className="relative w-full max-w-xl bg-[#0B0D14] border-l border-white/[0.08] p-6 flex flex-col h-full overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">HealOps Failure Control Dock</h3>
                  <p className="text-[11px] text-slate-400">Test microservice failure & observe website impact</p>
                </div>
              </div>
              <button onClick={() => setShowChaosDrawer(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 leading-relaxed">
              <p className="font-bold flex items-center gap-1.5 mb-1">
                <Info className="w-4 h-4" /> How to demonstrate failure & self-healing:
              </p>
              Click any fault below. HealOps will sample 3 consecutive breaches over 15s, diagnose root cause, and dispatch the escalation ladder without taking down the hospital website!
            </div>

            {/* List of Microservices & Chaos Triggers */}
            <div className="space-y-4">
              {MICROSERVICES_CATALOG.map(svc => (
                <div key={svc.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-white">{svc.name}</h4>
                      <p className="text-[11px] text-purple-300 font-mono">Port :{svc.port} • {svc.uiSection}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300 font-mono">
                      {svc.protocol}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400">
                    <span className="text-rose-400 font-semibold">Website Blast Radius: </span>
                    {svc.impact}
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => handleTriggerChaos(svc.id, 'HIGH_CPU')}
                      className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-xs font-semibold text-left transition"
                    >
                      🔥 Spike CPU (Over 95%)
                    </button>
                    <button
                      onClick={() => handleTriggerChaos(svc.id, 'DATABASE_LOST')}
                      className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 text-xs font-semibold text-left transition"
                    >
                      🔌 Drop DB Pool
                    </button>
                    <button
                      onClick={() => handleTriggerChaos(svc.id, 'SLOW_RESPONSE')}
                      className="px-3 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 text-xs font-semibold text-left transition"
                    >
                      ⏳ Inject Latency (3.5s)
                    </button>
                    <button
                      onClick={() => handleTriggerChaos(svc.id, 'CLEAR_CHAOS')}
                      className="px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 text-xs font-semibold text-left transition"
                    >
                      🛡️ Clear & Heal
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-white/[0.06] flex justify-between items-center">
              <span className="text-xs text-slate-500">HealOps Core Engine (:8090)</span>
              <a 
                href="http://localhost:8090" 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-purple-400 hover:underline font-semibold"
              >
                Open Full SRE Dashboard ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: 10 MICROSERVICES FLEET GUIDE ───────────────────────────── */}
      {showFleetGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowFleetGuideModal(false)} />
          <div className="relative gamma-glass p-6 rounded-3xl border border-cyan-500/30 max-w-4xl w-full max-h-[85vh] overflow-y-auto space-y-6 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="font-bold text-base text-white">MediFlow & HealOps 10-Microservices Architecture</h3>
                  <p className="text-xs text-slate-400">Complete map of all services integrated with this website</p>
                </div>
              </div>
              <button onClick={() => setShowFleetGuideModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MICROSERVICES_CATALOG.map(svc => (
                <div key={svc.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-sm text-white">{svc.name}</h4>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300">
                      Port :{svc.port}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium">{svc.role}</p>
                  <p className="text-[11px] text-purple-300">
                    <span className="text-slate-500">Website Section: </span>
                    {svc.uiSection}
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    <span className="text-rose-400 font-semibold">Impact on Outage: </span>
                    {svc.impact}
                  </p>
                  <div className="pt-2 flex justify-between items-center text-[10px] text-slate-500 font-mono border-t border-white/[0.04]">
                    <span>Protocol: {svc.protocol}</span>
                    <button
                      onClick={() => {
                        setShowFleetGuideModal(false);
                        handleTriggerChaos(svc.id, 'HIGH_CPU');
                      }}
                      className="text-amber-400 hover:underline font-semibold"
                    >
                      Simulate Fault ➔
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-white/[0.06]">
              <button
                onClick={() => setShowFleetGuideModal(false)}
                className="px-5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-white"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
