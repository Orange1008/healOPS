import { useEffect, useState } from 'react';
import { Activity, ArrowRight, ArrowUpRight, CheckCircle2, ChevronRight, Command, HeartPulse, Play, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import './landing-page.css';

const initialSummary = { systemHealthScore: null, healthyCount: 0, warningCount: 0, criticalCount: 0, services: [], incidents: [] };

export default function LandingPage() {
  const [summary, setSummary] = useState(initialSummary);
  const [connected, setConnected] = useState(false);
  const mediflowUrl = `${window.location.protocol}//${window.location.hostname}:3001/`;

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const [overviewResponse, servicesResponse, incidentsResponse] = await Promise.all([
          fetch('/api/overview'), fetch('/api/services'), fetch('/api/incidents')
        ]);
        if (!overviewResponse.ok || !servicesResponse.ok || !incidentsResponse.ok) throw new Error('HealOps Core is not ready');
        const [overview, services, incidents] = await Promise.all([
          overviewResponse.json(), servicesResponse.json(), incidentsResponse.json()
        ]);
        if (active) {
          setSummary({ ...overview, services, incidents });
          setConnected(true);
        }
      } catch {
        if (active) setConnected(false);
      }
    };
    refresh();
    const timer = window.setInterval(refresh, 8000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const serviceCount = summary.services.length;
  const activeIncident = summary.incidents.find(incident => incident.status === 'IN_PROGRESS' || incident.status === 'UNRESOLVED');
  const latestIncident = activeIncident || summary.incidents[0];
  const fleetLabel = connected
    ? `${summary.healthyCount} of ${serviceCount} services healthy`
    : 'Connecting to HealOps Core…';
  const statusLabel = activeIncident ? 'Incident in progress' : connected ? 'Monitoring active' : 'Waiting for live status';
  const healthLabel = summary.systemHealthScore == null ? '—' : `${summary.systemHealthScore}%`;

  return (
    <div className="landing-page">
      <div className="landing-orb landing-orb-one" aria-hidden="true" />
      <div className="landing-orb landing-orb-two" aria-hidden="true" />

      <header className="landing-nav">
        <a className="landing-brand" href="/" aria-label="HealOps and MediFlow home">
          <span className="landing-brand-mark"><Sparkles size={22} /></span>
          <span><strong>HealOps</strong><small>• MediFlow</small></span>
        </a>
        <nav className="landing-nav-links" aria-label="Page sections">
          <a href="#platform">Hospital Platform</a>
          <a href="#architecture">Architecture</a>
          <a href="#sentinel">Autonomous Sentinel</a>
          <a href="#docs">About</a>
        </nav>
        <a className="landing-open" href="/dashboard"><span className="live-dot" />Open HealOps</a>
      </header>

      <main className="landing-main">
        <section className="landing-hero" id="platform">
          <div className="landing-stars" aria-hidden="true">
            {Array.from({ length: 12 }, (_, index) => <i key={index} className={`landing-star star-${index + 1}`} />)}
          </div>
          <div className="landing-kicker"><span>Monitor</span><b /> <span>Detect</span><b /> <span>Recover</span><b /> <span>Protect</span></div>
          <h1>Autonomous Self-Healing<br className="desktop-break" /> Healthcare Platform</h1>
          <p>Experience an AI-powered distributed healthcare ecosystem that automatically detects service failures, tracks incidents, and coordinates recovery across MediFlow.</p>
          <div className="landing-actions">
            <a className="landing-button landing-button-primary" href={mediflowUrl}><Play size={15} fill="currentColor" />Launch MediFlow</a>
            <a className="landing-button landing-button-light" href="/dashboard">Command Center Console<ChevronRight size={16} /></a>
          </div>
        </section>

        <section className="showcase-frame" id="architecture" aria-label="Live HealOps platform preview">
          <div className="showcase-window">
            <div className="showcase-topbar">
              <div className="showcase-brand">
                <span className="sentinel-avatar"><HeartPulse size={18} /><i /></span>
                <span><strong>HealOps Service Monitor</strong><small>MediFlow hospital platform • Local environment</small></span>
              </div>
              <div className="showcase-quicklinks">
                <a href="/dashboard">Service Fleet</a><a href="/dashboard">Incident History</a><a href="/dashboard">Recovery Center</a>
                <span className="cluster-pill"><i className={connected ? 'live-dot' : 'idle-dot'} />{connected ? 'Live status' : 'Connecting'}</span>
              </div>
            </div>

            <div className="showcase-canvas">
              <div className="landscape-back" /><div className="landscape-mid" /><div className="landscape-hill" /><div className="flower-field" />
              <div className="showcase-content">
                <article className="incident-preview">
                  <div className="preview-overline"><span><Activity size={13} />All monitored services</span><small>{latestIncident?.id ? `Incident #${latestIncident.id}` : connected ? 'No active incident' : 'Live status'}</small></div>
                  <h2>{activeIncident ? 'HealOps is coordinating service recovery' : 'One command center for service health & recovery'}</h2>
                  <div className={`preview-status ${activeIncident ? 'is-recovering' : connected ? 'is-healthy' : 'is-waiting'}`}>
                    <span className="status-light" />
                    <div><strong>{statusLabel}</strong><p>{activeIncident ? `${activeIncident.service?.name || 'A monitored service'} · ${activeIncident.failureType || activeIncident.issueDescription || 'Recovery in progress'}` : connected ? 'Live service health and incident history are provided by HealOps Core.' : 'Live monitoring details will appear when HealOps Core is available.'}</p></div>
                  </div>
                  <div className="preview-details">
                    <div className="preview-facts">
                      <div><strong>{fleetLabel}</strong><small>Current monitored fleet</small></div>
                      <div><strong>{latestIncident?.service?.name || 'No active incident'}</strong><small>{activeIncident ? 'Service under recovery' : 'Most recent incident service'}</small></div>
                      <div><strong>{latestIncident?.detectedAt ? new Date(latestIncident.detectedAt).toLocaleString() : connected ? 'No recent incident' : 'Awaiting connection'}</strong><small>{activeIncident ? 'Incident detected' : 'Incident history'}</small></div>
                    </div>
                    <div className="preview-metrics">
                      <div><span>System health</span><strong>{healthLabel}</strong></div>
                      <div><span>Services healthy</span><strong>{connected ? `${summary.healthyCount} / ${serviceCount}` : '—'}</strong></div>
                      <div><span>Active incidents</span><strong>{connected ? summary.incidents.filter(incident => incident.status === 'IN_PROGRESS' || incident.status === 'UNRESOLVED').length : '—'}</strong></div>
                      <div className="integrity"><span>HealOps connection</span><strong>{connected ? 'Connected' : 'Waiting'}</strong></div>
                    </div>
                  </div>
                  <a className="preview-dashboard-link" href="/dashboard"><span className="live-dot" />Open HealOps Dashboard<ArrowUpRight size={15} /></a>
                  <p className="preview-note"><ShieldCheck size={13} /> Status and incident details shown here come from the running HealOps service.</p>
                </article>

                <div className="sentinel-scene" id="sentinel">
                  <div className="floating-stat availability"><span className="stat-dot" /><div><small>Cluster availability</small><strong>{healthLabel} system health</strong></div></div>
                  <div className="floating-stat recovery"><span className="stat-icon"><Zap size={18} fill="currentColor" /></span><div><small>Automatic recovery</small><strong>View live recovery history</strong></div></div>
                  <div className="sentinel-robot" aria-label="Illustration of the HealOps sentinel">
                    <div className="robot-halo" /><div className="antennae"><i /><i /></div>
                    <div className="robot-head"><div className="robot-eyes"><i /><i /></div><div className="robot-console"><span>HEAL-OPS</span><b /><span>{serviceCount || '—'} SERVICES</span></div></div>
                    <div className="robot-legs"><i /><i /></div><div className="robot-shadow" />
                  </div>
                  <a className="sentinel-sync" href="/dashboard"><span className="blue-dot" />{connected ? `${serviceCount} monitored services` : 'Open live service fleet'}<ArrowRight size={14} /></a>
                </div>
              </div>
            </div>

            <div className="showcase-footer">
              <span><i className="live-dot" />HealOps Core {connected ? 'connected' : 'connection pending'}</span>
              <span><i className={summary.healthyCount ? 'live-dot' : 'idle-dot'} />{connected ? `${summary.healthyCount} healthy services` : 'Service health loading'}</span>
              <span><i className="live-dot" />MediFlow integration</span>
              <strong>System Health: {healthLabel}</strong>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer" id="docs">
        <p>HealOps monitors and coordinates recovery for the MediFlow service fleet.</p>
        <div><span>LIVE SERVICE HEALTH</span><span>INCIDENT HISTORY</span><span>POLICY-DRIVEN RECOVERY</span><span>DOCKER COMPOSE</span></div>
      </footer>
    </div>
  );
}
