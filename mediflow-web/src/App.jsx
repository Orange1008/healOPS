import React, { useState, useEffect, useRef } from 'react';
import {
  Building2, Users, Stethoscope, Calendar, Receipt,
  Package, Pill, FlaskConical, Bell, Shield,
  Activity, CheckCircle2, AlertTriangle, Search, Plus,
  RefreshCw, TrendingUp, HeartPulse, Clock, Sparkles,
  Zap, ArrowRight, Play, Check, X, ShieldAlert, Cpu,
  Database, HelpCircle, Layers, Presentation, ExternalLink,
  Sliders, ChevronRight, AlertCircle, Info, Filter
} from 'lucide-react';

export default function App() {
  const healOpsPort = import.meta.env.DEV ? 3000 : 8091;
  const healOpsUrl = import.meta.env.VITE_HEALOPS_URL || `${window.location.protocol}//${window.location.hostname}:${healOpsPort}`;
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [authToken, setAuthToken] = useState(() => sessionStorage.getItem('mediflow.authToken') || '');
  const authTokenRef = useRef(authToken);
  const [loginEmail, setLoginEmail] = useState('testuser@test.com');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginPending, setLoginPending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState(null);

  // Modals
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [showBookAppointmentModal, setShowBookAppointmentModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Microservice data states
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [labReports, setLabReports] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [patients, setPatients] = useState([]);

  // Read-only hospital protection status.
  const [healOpsStatus, setHealOpsStatus] = useState({
    connected: false,
    healthScore: 100,
    activeIncidents: 0,
    monitoredServices: 0,
    lastRecovery: 'No recovery recorded',
    services: [],
    incidents: [],
    operationalEvents: []
  });
  const [activeFault, setActiveFault] = useState(null);
  const [healOpsLive, setHealOpsLive] = useState(false);

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

  // Refresh each hospital workflow independently so one unavailable service does not hide the others.
  const [unavailableServices, setUnavailableServices] = useState({});
  const outageStartedAt = useRef({});
  const previousUnavailable = useRef({});
  const refreshInFlight = useRef(false);
  const patientRefreshInFlight = useRef(false);
  const loadPatients = async (token) => {
    if (!token) return;
    try {
      const response = await fetch('/api/patients', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.status === 401) {
        if (authTokenRef.current === token) {
          authTokenRef.current = '';
          sessionStorage.removeItem('mediflow.authToken');
          setAuthToken('');
          setUnavailableServices(current => {
            if (!current.patients) return current;
            const next = { ...current }; delete next.patients; return next;
          });
        }
        setLoginError('Your patient records session has expired. Please sign in again.');
        throw new Error('Patient authorization was rejected.');
      }
      if (!response.ok) throw new Error(`Patient Service returned HTTP ${response.status}.`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Patient Service returned an invalid response.');
      if (authTokenRef.current === token) {
        setPatients(data);
        setUnavailableServices(current => {
          if (!current.patients) return current;
          const next = { ...current }; delete next.patients; return next;
        });
      }
    } catch (error) {
      if (authTokenRef.current === token) {
        setUnavailableServices(current => ({ ...current, patients: true }));
      }
      throw error;
    }
  };
  const fetchAllData = async () => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    try {
      const endpoints = [
        ['doctors', '/api/doctors', setDoctors], ['appointments', '/api/appointments', setAppointments]
      ];
      const patientToken = authTokenRef.current;
      if (patientToken && !patientRefreshInFlight.current) {
        patientRefreshInFlight.current = true;
        loadPatients(patientToken).catch(() => {}).finally(() => {
          patientRefreshInFlight.current = false;
        });
      }
      await Promise.all(endpoints.map(async ([key, url, update]) => {
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
          if (!response.ok) {
            throw new Error('Unavailable');
          }
          const data = await response.json();
          if (!Array.isArray(data)) throw new Error('Unavailable');
          update(data);
          setUnavailableServices(current => {
            if (!current[key]) return current;
            const next = { ...current }; delete next[key]; return next;
          });
        } catch { setUnavailableServices(current => ({ ...current, [key]: true })); }
      }));
      const healOpsTimeout = AbortSignal.timeout(5000);
      const [overviewResponse, servicesResponse, incidentResponse, historyResponse] = await Promise.all([
        fetch('/healops/api/overview', { signal: healOpsTimeout }),
        fetch('/healops/api/services', { signal: healOpsTimeout }),
        fetch('/healops/api/incidents', { signal: healOpsTimeout }),
        fetch('/healops/api/audit-events', { signal: healOpsTimeout })
      ]);
      if (!overviewResponse.ok || !servicesResponse.ok || !incidentResponse.ok || !historyResponse.ok) throw new Error('Unavailable');
      const [ov, services, incidents, operationalEvents] = await Promise.all([
        overviewResponse.json(), servicesResponse.json(), incidentResponse.json(), historyResponse.json()
      ]);
      const patientService = services.find(service => service.name === 'patient-service');
      if (patientService?.currentStatus === 'HEALTHY') {
        setUnavailableServices(current => {
          if (!current.patients) return current;
          const next = { ...current };
          delete next.patients;
          return next;
        });
      }
      const recovered = incidents.find(incident => incident.status === 'RECOVERED');
      const recoverySeconds = recovered?.mttrMs == null ? null : Math.max(0.1, recovered.mttrMs / 1000).toFixed(1);
      const lastRecovery = recovered
        ? `${recovered.service?.name || 'Service'} recovered in ${recoverySeconds}s`
        : 'No recovery recorded';
      const activeCount = services.filter(service => ['WARNING', 'RECOVERING', 'CRITICAL', 'DOWN'].includes(service.currentStatus)).length;
      setHealOpsStatus({
        connected: true,
        healthScore: ov.systemHealthScore ?? 100,
        activeIncidents: Math.max(activeCount, (ov.warningCount || 0) + (ov.criticalCount || 0)),
        monitoredServices: ov.totalServices ?? services.length,
        lastRecovery,
        services,
        incidents,
        operationalEvents
      });
    } catch { setHealOpsStatus(prev => ({ ...prev, connected: false })); }
    finally { refreshInFlight.current = false; }
  };

  useEffect(() => {
    let stopped = false;
    let timer;
    const refresh = async () => {
      await fetchAllData();
      if (!stopped) timer = setTimeout(refresh, 5000);
    };
    refresh();
    return () => { stopped = true; clearTimeout(timer); };
  }, []);

  useEffect(() => {
    const stream = new EventSource('/healops/api/stream/events');
    stream.onopen = () => setHealOpsLive(true);
    stream.onerror = () => setHealOpsLive(false);
    const updateService = (serviceName, update) => setHealOpsStatus(current => ({
      ...current,
      services: current.services.map(service => service.name === serviceName ? { ...service, ...update } : service)
    }));
    const updateIncident = incident => setHealOpsStatus(current => ({
      ...current,
      incidents: [incident, ...current.incidents.filter(item => item.id !== incident.id)]
    }));

    stream.addEventListener('FAULT_INJECTED', event => {
      const fault = JSON.parse(event.data);
      setActiveFault({ serviceName: fault.serviceName, failureType: fault.failureType, detectedAt: fault.detectedAt });
      updateService(fault.serviceName, { currentStatus: 'WARNING', healthScore: 65 });
    });
    stream.addEventListener('INCIDENT_TRIGGERED', event => {
      const incident = JSON.parse(event.data);
      updateIncident(incident);
      updateService(incident.service?.name, { currentStatus: 'CRITICAL', healthScore: 15 });
      setActiveFault(current => current || {
        serviceName: incident.service?.name,
        failureType: incident.failureType,
        detectedAt: incident.detectedAt
      });
    });
    stream.addEventListener('INCIDENT_RESOLVED', event => {
      const incident = JSON.parse(event.data);
      updateIncident(incident);
      updateService(incident.service?.name, { currentStatus: 'HEALTHY', healthScore: 95 });
      setActiveFault(current => current?.serviceName === incident.service?.name ? null : current);
      fetchAllData();
    });
    stream.addEventListener('METRIC_UPDATE', event => {
      const metric = JSON.parse(event.data);
      updateService(metric.serviceName, { currentStatus: metric.status, healthScore: metric.healthScore });
    });
    stream.addEventListener('FAULT_CLEARED', event => {
      const cleared = JSON.parse(event.data);
      setActiveFault(current => current?.serviceName === cleared.serviceName ? null : current);
    });
    return () => stream.close();
  }, []);

  useEffect(() => {
    const now = Date.now();
    Object.keys(unavailableServices).forEach(service => {
      if (!previousUnavailable.current[service]) outageStartedAt.current[service] = now;
    });
    Object.keys(previousUnavailable.current).forEach(service => {
      if (!unavailableServices[service]) {
        const elapsedSeconds = Math.max(1, Math.round((now - (outageStartedAt.current[service] || now)) / 1000));
        const serviceLabels = { patients: 'Patient records', doctors: 'Doctor directory', appointments: 'Appointments', pharmacy: 'Pharmacy', inventory: 'Inventory', laboratory: 'Laboratory', notifications: 'Notifications' };
        showToast(`Recovered by HealOps · ${serviceLabels[service] || service} restored in ${elapsedSeconds} seconds.`);
        delete outageStartedAt.current[service];
      }
    });
    previousUnavailable.current = unavailableServices;
  }, [unavailableServices]);

  // ── Actions: Add Patient ────────────────────────────────────────────────────
  const requestAddPatient = () => {
    if (!authTokenRef.current) {
      setActiveTab('patients');
      return;
    }
    setShowAddPatientModal(true);
  };

  const handlePatientLogin = async (e) => {
    e.preventDefault();
    if (loginPending) return;
    setLoginPending(true);
    setLoginError('');
    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      if (response.status === 401 || response.status === 403) throw new Error('Email or password was not accepted.');
      if (!response.ok) throw new Error(`Auth Service returned HTTP ${response.status}.`);
      const body = await response.json();
      if (!body.token) throw new Error('The Auth Service returned no token.');
      authTokenRef.current = body.token;
      sessionStorage.setItem('mediflow.authToken', body.token);
      setAuthToken(body.token);
      setUnavailableServices(current => {
        const next = { ...current };
        delete next.patients;
        return next;
      });
      await loadPatients(body.token);
    } catch (error) {
      setLoginError(error.message || 'Auth Service is temporarily unavailable.');
    } finally {
      setLoginPending(false);
    }
  };

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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authTokenRef.current}` },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const created = await res.json();
        setPatients(prev => [created, ...prev]);
        showToast(`Patient "${created.name}" registered successfully.`);
      } else {
        showToast('Patient service is temporarily unavailable. Please retry in a moment.', 'error');
        return;
      }
    } catch {
      showToast('Patient service is temporarily unavailable. Please retry in a moment.', 'error');
      return;
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
    if (unavailableServices.doctors || unavailableServices.appointments) {
      showToast(unavailableServices.doctors
        ? 'Doctor Service is temporarily unavailable. HealOps is attempting recovery; please wait before booking.'
        : 'Appointments are temporarily unavailable. HealOps is attempting recovery; please wait before booking.', 'warning');
      return;
    }
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
        showToast('Appointment service is temporarily unavailable. Please retry in a moment.', 'error');
        return;
      }
    } catch {
      showToast('Appointment service is temporarily unavailable. Please retry in a moment.', 'error');
      return;
    }

    setShowBookAppointmentModal(false);
  };

  // ── Actions: Dispense Prescription ─────────────────────────────────────────
  const handleDispensePrescription = async (id) => {
    try {
      const response = await fetch(`/api/pharmacy/${id}/dispense`, { method: 'PUT' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setPrescriptions(prev => prev.map(p => p.id === id ? { ...p, status: 'DISPENSED' } : p));
      showToast(`Prescription #${id} dispensed successfully!`);
    } catch {
      showToast('Pharmacy service is temporarily unavailable. Please retry in a moment.', 'error');
    }
  };

  // ── Actions: Adjust Inventory Stock ────────────────────────────────────────
  const handleAdjustStock = async (id, delta) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    const newQty = Math.max(0, (item.quantity || 0) + delta);
    try {
      const response = await fetch(`/api/inventory/${id}/stock?quantity=${newQty}`, { method: 'PUT' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setInventory(prev => prev.map(i => i.id === id ? { ...i, quantity: newQty } : i));
      showToast(`Stock updated for ${item.name}: ${newQty} units`);
    } catch {
      showToast('Inventory service is temporarily unavailable. Please retry in a moment.', 'error');
    }
  };

  // ── AI Prompt / Command Bar Execution ──────────────────────────────────────
  const handleExecuteAiPrompt = (promptText = aiPrompt) => {
    const query = (promptText || '').toLowerCase();
    if (!query) return;

    if (query.includes('add patient') || query.includes('register patient')) {
      requestAddPatient();
      setAiResponse(`Opening Patient Registration modal for you.`);
    } else if (query.includes('book') || query.includes('appointment') || query.includes('consult')) {
      setShowBookAppointmentModal(true);
      setAiResponse(`Opening Appointment Booking modal.`);
    } else if (query.includes('doctor') || query.includes('specialist')) {
      setActiveTab('doctors');
      setAiResponse('Navigated to the Medical Specialists Directory.');
    } else if (query.includes('pharmacy') || query.includes('med') || query.includes('rx') || query.includes('lab') || query.includes('test') || query.includes('pathology') || query.includes('inventory') || query.includes('stock') || query.includes('notification')) {
      setAiResponse('That workflow is not enabled in this MediFlow demo stack. Patients, doctors, and appointments are available.');
    } else if (query.includes('chaos') || query.includes('failure') || query.includes('fail') || query.includes('simulate') || query.includes('fleet') || query.includes('architecture') || query.includes('microservice')) {
      setAiResponse('I can help with patient records, appointments, prescriptions, lab results, and supplies.');
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

  const monitoredHospitalServices = healOpsStatus.services.filter(service =>
    service.category === 'INTERNAL_MICROSERVICE'
  );
  // An unresolved historical incident must not override a live healthy probe.
  // Only show an incident as active while its service is currently degraded.
  const activeHealOpsIncident = healOpsStatus.incidents.find(incident => {
    if (!['IN_PROGRESS', 'UNRESOLVED'].includes(incident.status)) return false;
    const liveService = monitoredHospitalServices.find(service => service.name === incident.service?.name);
    return liveService && ['WARNING', 'RECOVERING', 'CRITICAL', 'DOWN'].includes(liveService.currentStatus);
  });
  const flaggedHospitalService = monitoredHospitalServices.find(service =>
    ['WARNING', 'RECOVERING', 'CRITICAL', 'DOWN'].includes(service.currentStatus)
  );
  const liveActiveFault = activeFault && monitoredHospitalServices.some(service =>
    service.name === activeFault.serviceName && ['WARNING', 'RECOVERING', 'CRITICAL', 'DOWN'].includes(service.currentStatus)
  ) ? activeFault : null;
  const recoveryServiceName = activeHealOpsIncident?.service?.name
    || liveActiveFault?.serviceName
    || flaggedHospitalService?.name;
  const recoveryIsActive = Boolean(activeHealOpsIncident || (recoveryServiceName
    && ['RECOVERING', 'CRITICAL'].includes(monitoredHospitalServices.find(service => service.name === recoveryServiceName)?.currentStatus)));
  const recoveryProgress = recoveryIsActive ? 72 : recoveryServiceName ? 32 : 100;
  const recoveryEta = recoveryIsActive
    ? `${Math.max(1, Math.ceil((activeHealOpsIncident?.estimatedMttrMs || 1200) / 1000))} sec`
    : recoveryServiceName ? 'Detecting' : '—';
  const latestRecoveredIncident = healOpsStatus.incidents.find(incident => incident.status === 'RECOVERED');
  const serviceLabels = {
    'patient-service': 'Patients',
    'clinical-service': 'Clinical · Doctors, Appointments, Lab, Pharmacy, Inventory',
    'auth-service': 'Authentication',
    'api-gateway': 'API Gateway'
  };
  const affectedMediFlowPage = recoveryServiceName === 'patient-service'
    ? 'Patient records'
    : recoveryServiceName === 'clinical-service'
      ? 'Doctors, appointments, lab, pharmacy and inventory'
      : recoveryServiceName ? serviceLabels[recoveryServiceName] || recoveryServiceName : null;

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
              <p className="text-[11px] text-slate-400 font-medium">Hospital Management System</p>
            </div>
          </div>

          {/* Navigation Pill Switcher */}
          <nav className="hidden lg:flex items-center gap-1 p-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            {[
              { id: 'dashboard',     label: 'Dashboard',     icon: Activity },
              { id: 'patients',      label: 'Patients',      icon: Users, count: patients.length },
              { id: 'doctors',       label: 'Doctors',       icon: Stethoscope, count: doctors.length },
              { id: 'appointments',  label: 'Appointments',  icon: Calendar, count: appointments.length },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
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
                placeholder="Ask MediFlow AI or command: 'add patient', 'book appointment', 'find a specialist'..."
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
            { label: '+ Add Patient', action: requestAddPatient },
            { label: '+ Book Appointment', action: () => setShowBookAppointmentModal(true) },
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

        {(() => {
          const serviceByTab = { patients: 'patients', doctors: 'doctors', appointments: 'appointments' };
          const service = serviceByTab[activeTab];
          const dependencyUnavailable = activeTab === 'appointments' && unavailableServices.doctors;
          if (!service || (!unavailableServices[service] && !dependencyUnavailable)) return null;
          const serviceName = dependencyUnavailable ? 'Doctor Service' : `${service[0].toUpperCase()}${service.slice(1)} Service`;
          return <div role="status" className="gamma-glass p-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 text-sm text-amber-100"><strong>{serviceName} temporarily unavailable.</strong> HealOps is automatically attempting recovery. Please wait…</div>;
        })()}
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

        <>
            {/* ── TAB: DASHBOARD OVERVIEW ───────────────────────────────────── */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">

                {/* Hospital overview stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

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
                      <span className="text-purple-300">Patient records</span>
                      <button
                        onClick={requestAddPatient}
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
                      <span className="text-cyan-300">Care team</span>
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
                      <span className="text-indigo-300">Consultations</span>
                      <button
                        onClick={() => setShowBookAppointmentModal(true)}
                        className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Book
                      </button>
                    </div>
                  </div>

                </div>

                {/* Always-visible live hospital operations status from HealOps. */}
                <section className="gamma-glass p-5 sm:p-6 rounded-3xl border border-emerald-500/20" aria-live="polite">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-3 rounded-2xl ${recoveryServiceName ? 'bg-amber-500/10 text-amber-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Protected by HealOps</p>
                        <h3 className="text-lg sm:text-xl font-black text-white mt-0.5">Hospital Operations Center</h3>
                        <p className="text-xs text-slate-400 mt-1">
                          {recoveryIsActive ? `Recovering ${serviceLabels[recoveryServiceName] || recoveryServiceName}`
                            : recoveryServiceName ? `Failure detected in ${serviceLabels[recoveryServiceName] || recoveryServiceName}`
                              : healOpsStatus.connected ? 'All monitored hospital services are operational' : 'Connecting to HealOps…'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-right mr-1">
                        <p className="text-[9px] uppercase tracking-wider text-slate-500">Overall health</p>
                        <strong className={`text-sm ${recoveryServiceName ? 'text-amber-300' : 'text-emerald-300'}`}>{healOpsStatus.healthScore}%</strong>
                      </div>
                      <div className="text-right mr-1">
                        <p className="text-[9px] uppercase tracking-wider text-slate-500">Active incidents</p>
                        <strong className="text-sm text-white">{healOpsStatus.activeIncidents}</strong>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${recoveryServiceName ? 'bg-amber-500/10 text-amber-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
                        <span className={`w-2 h-2 rounded-full ${recoveryServiceName ? 'bg-amber-300 animate-pulse' : 'bg-emerald-300'}`} />
                        {recoveryIsActive ? 'Recovering' : recoveryServiceName ? 'Fault detected' : healOpsStatus.connected ? 'Healthy' : 'Connecting'}
                      </span>
                      <a href={healOpsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300 hover:text-emerald-200">
                        Open HealOps <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-5 mt-5">
                    <div className="rounded-2xl bg-white/[0.025] border border-white/[0.06] p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-slate-200">Services</h4>
                        <span className="text-[10px] text-slate-500">Live{healOpsLive ? ' · connected' : ' · reconnecting'}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {monitoredHospitalServices.map(service => {
                          const isAffected = service.name === recoveryServiceName;
                          const isDown = ['CRITICAL', 'DOWN'].includes(service.currentStatus);
                          const isWarning = ['WARNING', 'RECOVERING'].includes(service.currentStatus);
                          const badge = isAffected && recoveryIsActive ? 'Recovering'
                            : isAffected ? 'Fault detected'
                              : isDown ? 'Unavailable' : isWarning ? 'Degraded' : 'Healthy';
                          return (
                            <div key={service.id || service.name} className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 border ${isAffected ? 'border-amber-500/25 bg-amber-500/[0.05]' : 'border-white/[0.05] bg-slate-950/30'}`}>
                              <span className="text-[11px] font-medium text-slate-200 truncate">{serviceLabels[service.name] || service.name}</span>
                              <span className={`shrink-0 inline-flex items-center gap-1.5 text-[10px] font-semibold ${isDown || isWarning || isAffected ? 'text-amber-300' : 'text-emerald-300'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isDown || isWarning || isAffected ? 'bg-amber-300 animate-pulse' : 'bg-emerald-300'}`} />{badge}
                              </span>
                            </div>
                          );
                        })}
                        {!monitoredHospitalServices.length && <p className="text-xs text-slate-500">{healOpsStatus.connected ? 'Loading service status…' : 'HealOps status is unavailable.'}</p>}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white/[0.025] border border-white/[0.06] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-xs font-bold text-slate-200">Automatic Recovery</h4>
                          <p className="text-[10px] text-slate-500 mt-1">
                            {liveActiveFault?.failureType || activeHealOpsIncident?.failureType || (recoveryServiceName ? 'Checking service health' : 'Ready for the next incident')}
                          </p>
                        </div>
                        <div className="text-right">
                          <strong className="text-xl font-black text-white">{recoveryProgress}%</strong>
                          <p className="text-[10px] text-slate-500">{recoveryServiceName ? `ETA ${recoveryEta}` : 'No active recovery'}</p>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-slate-800 overflow-hidden mt-3">
                        <div className={`h-full rounded-full transition-all duration-700 ${recoveryServiceName ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${recoveryProgress}%` }} />
                      </div>
                      {recoveryServiceName && <p className="text-[10px] text-amber-200 mt-3">{affectedMediFlowPage} {unavailableServices.patients || unavailableServices.doctors || unavailableServices.appointments ? 'is temporarily unavailable while HealOps recovers it.' : 'is being monitored while HealOps applies recovery.'}</p>}
                      <div className="flex items-start justify-between gap-3 border-t border-white/[0.06] mt-3 pt-3 text-[10px]">
                        <span className="text-slate-500">Last recovery</span>
                        <span className="text-right text-slate-200 font-medium">{latestRecoveredIncident ? healOpsStatus.lastRecovery : 'No recovery recorded'}</span>
                      </div>
                      <div className="border-t border-white/[0.06] mt-3 pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] uppercase tracking-wide text-slate-500">Recent incident history</span>
                          <a href={healOpsUrl} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-300 hover:text-emerald-200">Full history</a>
                        </div>
                        <div className="space-y-1.5">
                          {healOpsStatus.incidents.slice(0, 3).map(incident => (
                            <div key={incident.id} className="flex items-center justify-between gap-2 text-[10px]">
                              <span className="truncate text-slate-300">{serviceLabels[incident.service?.name] || incident.service?.name || 'Service'} · {incident.failureType}</span>
                              <span className="shrink-0 text-slate-500">{incident.status === 'RECOVERED' ? 'Recovered' : incident.status}</span>
                            </div>
                          ))}
                          {!healOpsStatus.incidents.length && <p className="text-[10px] text-slate-500">No incidents have been recorded.</p>}
                        </div>
                      </div>
                      <div className="border-t border-white/[0.06] mt-3 pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] uppercase tracking-wide text-slate-500">Recent operations</span>
                          <a href={healOpsUrl} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-300 hover:text-emerald-200">Full activity</a>
                        </div>
                        <div className="space-y-1.5">
                          {healOpsStatus.operationalEvents.slice(0, 3).map(event => (
                            <div key={event.id} className="flex items-center justify-between gap-2 text-[10px]">
                              <span className="truncate text-slate-300">{event.serviceName || 'HealOps'} · {event.eventType.replaceAll('_', ' ')}</span>
                              <span className="shrink-0 text-slate-500">{new Date(event.createdAt).toLocaleTimeString()}</span>
                            </div>
                          ))}
                          {!healOpsStatus.operationalEvents.length && <p className="text-[10px] text-slate-500">No operator activity recorded yet.</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* ── Clinical Operations ─────────────────────────────────── */}
                <div className="grid grid-cols-1 gap-6">

                  {/* Consultations Card */}
                  <div className="gamma-glass p-6 rounded-3xl border border-white/[0.08] space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-white">Upcoming Consultations</h3>
                          <p className="text-[11px] text-slate-400">Appointment schedule</p>
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

                </div>

              </div>
            )}

            {/* ── TAB: PATIENTS ────────────────────────────────────────────── */}
            {activeTab === 'patients' && (
              <div className="gamma-glass p-6 rounded-3xl border border-white/[0.08] space-y-5">
                {!authToken ? (
                  <div className="max-w-xl mx-auto py-8 space-y-5">
                    <div>
                      <h3 className="text-lg font-bold text-white">Sign in to Patient Records</h3>
                      <p className="text-sm text-slate-400 mt-1">Patient data is protected. Sign in through the Auth Service to view or register records.</p>
                    </div>
                    <form onSubmit={handlePatientLogin} className="space-y-4">
                      <label className="block text-xs text-slate-300">
                        Email
                        <input type="email" required autoComplete="username" value={loginEmail} onChange={event => setLoginEmail(event.target.value)} className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-purple-500" />
                      </label>
                      <label className="block text-xs text-slate-300">
                        Password
                        <input type="password" required autoComplete="current-password" value={loginPassword} onChange={event => setLoginPassword(event.target.value)} className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-purple-500" />
                      </label>
                      {loginError && <p role="alert" className="text-sm text-rose-300">{loginError}</p>}
                      <button type="submit" disabled={loginPending} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold disabled:opacity-60">{loginPending ? 'Signing in…' : 'Sign in'}</button>
                    </form>
                  </div>
                ) : (
                <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-400" /> Patient Medical Registry
                    </h3>
                    <p className="text-xs text-slate-400">
                      Patient records and registration details
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
                        onClick={requestAddPatient}
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
                </>
                )}
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
                      Care team directory
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
                      Appointment schedule
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
                      Prescription dispensary
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
                      Diagnostic laboratory
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
                      Hospital supplies
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
                      Staff notifications
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
                  <option value="">-- Choose a specialist --</option>
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
                  disabled={unavailableServices.doctors || unavailableServices.appointments}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold shadow-glow-violet hover:brightness-110"
                >
                  {unavailableServices.doctors ? 'Doctor Service unavailable' : unavailableServices.appointments ? 'Appointments unavailable' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}
