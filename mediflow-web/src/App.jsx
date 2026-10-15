import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, Stethoscope, Calendar, Receipt, 
  Package, Pill, FlaskConical, Bell, Shield, 
  Activity, CheckCircle2, AlertTriangle, Search, Plus, 
  RefreshCw, TrendingUp, HeartPulse, Clock, Sparkles
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  // Microservice data states
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [labReports, setLabReports] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [patients, setPatients] = useState([
    { id: 1, name: 'John Doe', age: 45, gender: 'Male', contactNumber: '+1-555-0182', diagnosis: 'Arterial Hypertension' },
    { id: 2, name: 'Jane Smith', age: 38, gender: 'Female', contactNumber: '+1-555-0183', diagnosis: 'Chronic Migraine' },
    { id: 3, name: 'Leo Vance', age: 8, gender: 'Male', contactNumber: '+1-555-0184', diagnosis: 'Pediatric Asthma' }
  ]);

  // Load microservice data
  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. Doctors (:4002)
      fetch('/api/doctors')
        .then(r => r.ok ? r.json() : [])
        .then(d => setDoctors(d))
        .catch(() => {});

      // 2. Appointments (:4003)
      fetch('/api/appointments')
        .then(r => r.ok ? r.json() : [])
        .then(d => setAppointments(d))
        .catch(() => {});

      // 3. Inventory (:4004)
      fetch('/api/inventory')
        .then(r => r.ok ? r.json() : [])
        .then(d => setInventory(d))
        .catch(() => {});

      // 4. Pharmacy (:4006)
      fetch('/api/pharmacy')
        .then(r => r.ok ? r.json() : [])
        .then(d => setPrescriptions(d))
        .catch(() => {});

      // 5. Laboratory (:4007)
      fetch('/api/laboratory')
        .then(r => r.ok ? r.json() : [])
        .then(d => setLabReports(d))
        .catch(() => {});

      // 6. Notifications (:4008)
      fetch('/api/notifications')
        .then(r => r.ok ? r.json() : [])
        .then(d => setNotifications(d))
        .catch(() => {});

      // 7. Patients (:4000)
      fetch('/api/patients')
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d && Array.isArray(d)) setPatients(d); })
        .catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* ── MediFlow Sidebar ────────────────────────────────────────────── */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between">
        <div>
          {/* Brand header */}
          <div className="p-5 border-b border-slate-800 flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-teal-500 to-emerald-400 rounded-xl text-white shadow-lg shadow-teal-500/20">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg text-white tracking-wide">MediFlow</h1>
              <p className="text-[11px] text-teal-400 font-semibold tracking-wider uppercase">Hospital Management</p>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="p-3 space-y-1">
            {[
              { id: 'dashboard',    label: 'Dashboard',     icon: Activity },
              { id: 'patients',     label: 'Patients',      icon: Users, count: patients.length },
              { id: 'doctors',      label: 'Doctors',       icon: Stethoscope, count: doctors.length },
              { id: 'appointments', label: 'Appointments',  icon: Calendar, count: appointments.length },
              { id: 'pharmacy',     label: 'Pharmacy',      icon: Pill, count: prescriptions.length },
              { id: 'laboratory',   label: 'Laboratory',    icon: FlaskConical, count: labReports.length },
              { id: 'inventory',    label: 'Inventory',     icon: Package, count: inventory.length },
              { id: 'notifications',label: 'Notifications', icon: Bell, count: notifications.length },
            ].map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                    activeTab === item.id 
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30' 
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* HealOps Monitored Badge */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span className="text-xs font-semibold text-slate-300">Protected by HealOps</span>
            </div>
            <a 
              href="http://localhost:8090" 
              target="_blank" 
              rel="noreferrer"
              className="text-[10px] text-teal-400 hover:underline uppercase tracking-wider font-semibold"
            >
              Control Room ↗
            </a>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Autonomous Self-Healing Active</p>
        </div>
      </aside>

      {/* ── Main Work Area ──────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Top Navbar */}
        <header className="h-16 bg-slate-900/70 backdrop-blur border-b border-slate-800 flex items-center justify-between px-8">
          <div>
            <h2 className="text-lg font-bold capitalize text-white">
              {activeTab} Management
            </h2>
            <p className="text-xs text-slate-400">MediFlow Integrated Healthcare Platform</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={fetchAllData}
              disabled={loading}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
              title="Refresh Records"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-400' : ''}`} />
            </button>
            <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-1.5 rounded-full border border-slate-700/60 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-slate-300 font-medium">Hospital Gateway Active (:8080)</span>
            </div>
          </div>
        </header>

        {/* ── Content View ──────────────────────────────────────────────── */}
        <div className="p-8 space-y-6">

          {/* TAB: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stat Widgets */}
              <div className="grid grid-cols-4 gap-5">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">Active Patients</p>
                      <h3 className="text-3xl font-extrabold text-white mt-1">{patients.length}</h3>
                    </div>
                    <div className="p-3 bg-teal-500/10 text-teal-400 rounded-xl">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">Registered in Patient Service (:4000)</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">Doctors on Duty</p>
                      <h3 className="text-3xl font-extrabold text-white mt-1">{doctors.length}</h3>
                    </div>
                    <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                      <Stethoscope className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">Across 4 Medical Departments</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">Upcoming Consults</p>
                      <h3 className="text-3xl font-extrabold text-white mt-1">{appointments.length}</h3>
                    </div>
                    <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
                      <Calendar className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">Scheduled via Appointment Service</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">Lab Tests Active</p>
                      <h3 className="text-3xl font-extrabold text-white mt-1">{labReports.length}</h3>
                    </div>
                    <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                      <FlaskConical className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">Pathology Diagnostics Laboratory</p>
                </div>
              </div>

              {/* Live Medical Operations Grid */}
              <div className="grid grid-cols-2 gap-6">
                {/* Upcoming Appointments Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                    <Calendar className="w-4 h-4 text-teal-400" /> Upcoming Patient Consultations
                  </h3>
                  <div className="divide-y divide-slate-800">
                    {appointments.map(a => (
                      <div key={a.id} className="py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">{a.patientName}</p>
                          <p className="text-xs text-slate-400">{a.doctorName} • {a.reason}</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                          {a.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Critical Lab & Diagnostics */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                    <FlaskConical className="w-4 h-4 text-purple-400" /> Latest Pathology & Lab Reports
                  </h3>
                  <div className="divide-y divide-slate-800">
                    {labReports.map(l => (
                      <div key={l.id} className="py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">{l.patientName} — {l.testName}</p>
                          <p className="text-xs text-slate-400 truncate max-w-sm">{l.resultSummary}</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {l.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PATIENTS */}
          {activeTab === 'patients' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-teal-400" /> Patient Medical Registry (:4000)
                </h3>
              </div>
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/60 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Full Name</th>
                    <th className="p-3">Age / Gender</th>
                    <th className="p-3">Contact</th>
                    <th className="p-3">Primary Diagnosis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {patients.map(p => (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono text-slate-400">#{p.id}</td>
                      <td className="p-3 font-semibold text-white">{p.name}</td>
                      <td className="p-3">{p.age} yrs • {p.gender}</td>
                      <td className="p-3 font-mono text-slate-300">{p.contactNumber || 'N/A'}</td>
                      <td className="p-3 text-teal-300 font-medium">{p.diagnosis || 'General Admission'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: DOCTORS */}
          {activeTab === 'doctors' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-blue-400" /> Medical Specialists & Practitioners (:4002)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {doctors.map(d => (
                  <div key={d.id} className="bg-slate-800/40 border border-slate-700/60 p-4 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-white text-base">{d.name}</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {d.available ? 'ON DUTY' : 'OFF DUTY'}
                      </span>
                    </div>
                    <p className="text-xs text-teal-400 font-medium">{d.specialty} — {d.department}</p>
                    <div className="flex justify-between text-xs text-slate-400 pt-2 border-t border-slate-700/50">
                      <span>{d.email}</span>
                      <span className="font-mono">{d.phone}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: APPOINTMENTS */}
          {activeTab === 'appointments' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" /> Patient Scheduling & Appointments (:4003)
              </h3>
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/60 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="p-3">Appointment ID</th>
                    <th className="p-3">Patient</th>
                    <th className="p-3">Doctor</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Scheduled Time</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {appointments.map(a => (
                    <tr key={a.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono text-slate-400">#{a.id}</td>
                      <td className="p-3 font-semibold text-white">{a.patientName}</td>
                      <td className="p-3 text-slate-200">{a.doctorName}</td>
                      <td className="p-3 text-slate-400">{a.reason}</td>
                      <td className="p-3 font-mono text-slate-300">{new Date(a.appointmentTime).toLocaleString()}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: PHARMACY */}
          {activeTab === 'pharmacy' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Pill className="w-5 h-5 text-teal-400" /> Prescriptions & Dispensary Management (:4006)
              </h3>
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/60 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="p-3">Rx ID</th>
                    <th className="p-3">Patient</th>
                    <th className="p-3">Medication</th>
                    <th className="p-3">Dosage</th>
                    <th className="p-3">Frequency</th>
                    <th className="p-3">Dispensary Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {prescriptions.map(p => (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono text-slate-400">#{p.id}</td>
                      <td className="p-3 font-semibold text-white">{p.patientName}</td>
                      <td className="p-3 text-teal-300 font-semibold">{p.medication}</td>
                      <td className="p-3 font-mono">{p.dosage}</td>
                      <td className="p-3 text-slate-400">{p.frequency}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: LABORATORY */}
          {activeTab === 'laboratory' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-purple-400" /> Diagnostic Pathology & Laboratory (:4007)
              </h3>
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/60 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="p-3">Test ID</th>
                    <th className="p-3">Patient</th>
                    <th className="p-3">Diagnostic Panel</th>
                    <th className="p-3">Clinical Findings</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {labReports.map(l => (
                    <tr key={l.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono text-slate-400">#{l.id}</td>
                      <td className="p-3 font-semibold text-white">{l.patientName}</td>
                      <td className="p-3 text-purple-300 font-medium">{l.testName}</td>
                      <td className="p-3 text-slate-300 max-w-md">{l.resultSummary}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: INVENTORY */}
          {activeTab === 'inventory' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400" /> Medical Supplies & Equipment Inventory (:4004)
              </h3>
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/60 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="p-3">Item Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Current Stock</th>
                    <th className="p-3">Threshold</th>
                    <th className="p-3">Unit Price</th>
                    <th className="p-3">Stock Health</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {inventory.map(i => (
                    <tr key={i.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-semibold text-white">{i.itemName}</td>
                      <td className="p-3 text-slate-400">{i.category}</td>
                      <td className="p-3 font-mono font-bold text-white">{i.quantity} {i.unit}s</td>
                      <td className="p-3 font-mono text-slate-400">{i.minimumThreshold} {i.unit}s</td>
                      <td className="p-3 font-mono">${i.unitPrice?.toFixed(2)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          i.quantity > i.minimumThreshold 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {i.quantity > i.minimumThreshold ? 'OPTIMAL' : 'LOW STOCK'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-400" /> Automated Patient Alerts & Dispatches (:4008)
              </h3>
              <div className="space-y-3">
                {notifications.map(n => (
                  <div key={n.id} className="bg-slate-800/40 border border-slate-700/60 p-4 rounded-xl flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                          {n.channel}
                        </span>
                        <h4 className="font-bold text-white text-sm">{n.subject}</h4>
                      </div>
                      <p className="text-xs text-slate-300">{n.messageBody}</p>
                      <p className="text-[10px] text-slate-500 font-mono">Recipient: {n.recipient}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {n.status}
                    </span>
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
