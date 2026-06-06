/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';


export default function AlertsTab({ fetch, token, activeDatabaseId }) {
  const [alerts, setAlerts] = useState([]);
  const [alertLogs, setAlertLogs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  
  const [newAlertName, setNewAlertName] = useState("High Customer Counts in Brazil");
  const [newAlertQuery, setNewAlertQuery] = useState("SELECT COUNT(*) FROM Customer WHERE Country = 'Brazil';");
  const [newAlertCondition, setNewAlertCondition] = useState("> 3");
  const [newAlertInterval, setNewAlertInterval] = useState(15);
  const [isRegisteringAlert, setIsRegisteringAlert] = useState(false);

  const [logViewTab, setLogViewTab] = useState("alarms"); // "alarms" | "audit"
  
  const [slackMockQuery, setSlackMockQuery] = useState("Who is the top employee based on sales?");
  const [slackBlockResponse, setSlackBlockResponse] = useState(null);
  const [isSlackExecuting, setIsSlackExecuting] = useState(false);

  // Draggable Splitter state (percentage)
  const [leftWidth, setLeftWidth] = useState(55); 
  const [isResizing, setIsResizing] = useState(false);

  // Sync Alerts & Logs in background
  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/v1/alerts");
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch (err) {
      console.error("Error loading alert rules:", err);
    }
  };

  const fetchAlertLogs = async () => {
    try {
      const res = await fetch("/api/v1/alerts/logs");
      const data = await res.json();
      setAlertLogs(data.logs || []);
    } catch (err) {
      console.error("Error loading triggered logs:", err);
    }
  };

  const fetchAuditLogs = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/v1/audit?limit=30");
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Error loading audit logs:", err);
    }
  };

  useEffect(() => {
    fetchAlerts();
    fetchAlertLogs();
    fetchAuditLogs();
    const interval = setInterval(() => {
      fetchAlerts();
      fetchAlertLogs();
      fetchAuditLogs();
    }, 5000);
    return () => clearInterval(interval);
  }, [token, activeDatabaseId]);

  const handleCreateAlert = async () => {
    if (!newAlertName.trim() || !newAlertQuery.trim() || !newAlertCondition.trim()) {
      alert("Please fill in all fields.");
      return;
    }
    setIsRegisteringAlert(true);
    try {
      const res = await fetch("/api/v1/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAlertName,
          query: newAlertQuery,
          condition: newAlertCondition,
          interval_seconds: parseInt(newAlertInterval) || 15
        })
      });
      if (!res.ok) throw new Error("Failed to create alert rule");
      alert(`Alert check rule "${newAlertName}" successfully scheduled.`);
      fetchAlerts();
    } catch (err) {
      alert("Failed to build alert: " + err.message);
    } finally {
      setIsRegisteringAlert(false);
    }
  };

  const handleResetAlert = async (alertId) => {
    try {
      const res = await fetch(`/api/v1/alerts/${alertId}/reset`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to reset rule state");
      fetchAlerts();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSendSlackWebhook = async () => {
    if (!slackMockQuery.trim()) return;
    setIsSlackExecuting(true);
    setSlackBlockResponse(null);
    try {
      const formData = new URLSearchParams();
      formData.append("text", slackMockQuery);

      const res = await fetch("/api/v1/webhooks/slack", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData
      });
      if (!res.ok) throw new Error("Slack command invocation failed.");
      const data = await res.json();
      setSlackBlockResponse(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSlackExecuting(false);
    }
  };

  const startResize = (e) => {
    e.preventDefault();
    setIsResizing(true);
    const container = e.currentTarget.parentElement;
    const containerWidth = container.getBoundingClientRect().width;
    
    const onMouseMove = (moveEvent) => {
      const containerRect = container.getBoundingClientRect();
      const deltaX = moveEvent.clientX - containerRect.left;
      const percentage = (deltaX / containerWidth) * 100;
      setLeftWidth(Math.max(40, Math.min(75, percentage)));
    };
    
    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className="h-full w-full flex overflow-hidden text-left relative animate-fade-in gap-0">
      
      {/* Left Side: Rules list and Create Alarm scheduler */}
      <div 
        style={{ width: `${leftWidth}%` }}
        className="glass-card rounded-2xl flex flex-col h-full overflow-hidden shrink-0"
      >
        <div className="px-5 py-3.5 border-b border-outline-variant flex items-center justify-between bg-surface-dim/20 shrink-0 select-none">
          <h3 className="text-xs uppercase tracking-wider font-extrabold text-secondary flex items-center gap-2">
            <span className="material-symbols-outlined text-base">alarm_add</span>
            Scheduled SQL Anomaly Triggers
          </h3>
        </div>

        <div className="flex-grow p-5 overflow-y-auto space-y-5.5 custom-scrollbar h-full bg-surface-container-lowest/30">
          
          {/* Create New Alert Form */}
          <div className="p-4.5 border border-outline-variant/60 bg-surface rounded-2xl space-y-4">
            <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider select-none">Create New Alert Rule</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase font-bold text-on-surface-variant block mb-1.5 tracking-wider">Rule Name</label>
                <input
                  type="text"
                  value={newAlertName}
                  onChange={e => setNewAlertName(e.target.value)}
                  className="w-full bg-surface border border-outline/30 rounded-xl text-xs px-3.5 py-2 text-on-surface outline-none focus:border-primary/50 transition-colors placeholder-on-surface-variant/40"
                />
              </div>
              <div>
                <label className="text-[9px] uppercase font-bold text-on-surface-variant block mb-1.5 tracking-wider">Interval (seconds)</label>
                <input
                  type="number"
                  value={newAlertInterval}
                  onChange={e => setNewAlertInterval(e.target.value)}
                  className="w-full bg-surface border border-outline/30 rounded-xl text-xs px-3.5 py-2 text-on-surface outline-none focus:border-primary/50 transition-colors placeholder-on-surface-variant/40"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] uppercase font-bold text-on-surface-variant block mb-1.5 tracking-wider">Threshold Condition</label>
              <input
                type="text"
                placeholder="e.g. > 10, < 2"
                value={newAlertCondition}
                onChange={e => setNewAlertCondition(e.target.value)}
                className="w-full bg-surface border border-outline/30 rounded-xl text-xs px-3.5 py-2 text-on-surface outline-none focus:border-primary/50 transition-colors font-mono placeholder-on-surface-variant/40"
              />
            </div>

            <div>
              <label className="text-[9px] uppercase font-bold text-on-surface-variant block mb-1.5 tracking-wider">SQL Check Statement</label>
              <textarea
                rows={2}
                value={newAlertQuery}
                onChange={e => setNewAlertQuery(e.target.value)}
                className="w-full bg-surface border border-outline/30 rounded-xl text-xs px-3.5 py-2 text-on-surface outline-none focus:border-primary/50 transition-colors font-mono leading-relaxed resize-none placeholder-on-surface-variant/40"
              />
            </div>

            <button
              onClick={handleCreateAlert}
              disabled={isRegisteringAlert}
              className="bg-gradient-to-r from-primary to-secondary text-white font-bold px-5 py-2.5 rounded-xl text-xs hover:shadow-lg hover:shadow-primary/10 transition-all cursor-pointer border-none w-full"
            >
              {isRegisteringAlert ? 'Scheduling...' : 'Launch Scheduled Alert Watcher'}
            </button>
          </div>

          {/* Active Alert Rules list */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider select-none">Active Alert Watchers</h4>
            
            {alerts.length === 0 ? (
              <div className="text-xs text-on-surface-variant/40 italic py-4 text-center">Loading watchers...</div>
            ) : (
              alerts.map(rule => {
                const isTriggered = rule.status === "Triggered";
                const isError = rule.status === "Error";
                return (
                  <div key={rule.id} className="p-4 border border-outline-variant/60 bg-surface rounded-xl flex items-center justify-between gap-4">
                    <div className="space-y-1.5 min-w-0 flex-grow">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[8px] px-2 py-0.5 rounded font-extrabold uppercase border flex items-center gap-1 ${
                          isTriggered ? 'bg-error/10 text-error border-error/20 animate-pulse' :
                          isError ? 'bg-amber-500/10 text-amber-600 border-amber-500/25' :
                          'bg-success/10 text-success border-success/20'
                        }`}>
                          <span className="w-1 h-1 rounded-full bg-current" />
                          {rule.status}
                        </span>
                        <span className="text-xs font-bold text-on-surface truncate">{rule.name}</span>
                      </div>
                      <div className="text-[10px] font-mono text-on-surface-variant truncate max-w-sm">
                        {rule.query}
                      </div>
                      {rule.last_checked && (
                        <div className="text-[9px] text-on-surface-variant/40 font-mono">
                          Last Checked: {rule.last_checked} | Threshold: <span className="text-secondary font-bold">{rule.condition}</span>
                        </div>
                      )}
                    </div>

                    {isTriggered && (
                      <button
                        onClick={() => handleResetAlert(rule.id)}
                        className="bg-surface-dim hover:bg-surface-container text-on-surface text-[9px] font-extrabold uppercase tracking-wider py-1 px-3 rounded border border-outline/30 transition-all cursor-pointer shrink-0"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

        </div>
      </div>

      {/* Draggable vertical divider splitter */}
      <div 
        className={`resizer-handle ${isResizing ? 'is-dragging' : ''}`}
        onMouseDown={startResize}
      />

      {/* Right Side: Alarm logs terminal & Slack Webhook sandbox */}
      <div 
        style={{ width: `${100 - leftWidth}%` }}
        className="flex flex-col gap-5 h-full overflow-hidden ml-1.5"
      >
        {/* Log container with tabs */}
        <div className="glass-card rounded-2xl flex-1 flex flex-col overflow-hidden">
          <div className="px-5 py-2.5 border-b border-outline-variant bg-surface-dim/20 flex items-center justify-between shrink-0 select-none">
            <div className="flex gap-4">
              <button 
                onClick={() => setLogViewTab("alarms")}
                className={`text-xs uppercase tracking-wider font-extrabold border-none bg-transparent cursor-pointer flex items-center gap-1.5 pb-2 pt-1 transition-all ${
                  logViewTab === "alarms" 
                    ? "text-error border-b-2 border-error" 
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                <span className="material-symbols-outlined text-base">crisis_alert</span>
                Alarms ({alertLogs.length})
              </button>
              <button 
                onClick={() => setLogViewTab("audit")}
                className={`text-xs uppercase tracking-wider font-extrabold border-none bg-transparent cursor-pointer flex items-center gap-1.5 pb-2 pt-1 transition-all ${
                  logViewTab === "audit" 
                    ? "text-primary border-b-2 border-primary" 
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                <span className="material-symbols-outlined text-base">policy</span>
                Audit Logs ({auditLogs.length})
              </button>
            </div>
          </div>

          <div className="flex-grow p-4 overflow-y-auto space-y-3 custom-scrollbar text-[11px] font-mono bg-surface-container-lowest/30 h-full">
            {logViewTab === "alarms" ? (
              alertLogs.length === 0 ? (
                <div className="text-on-surface-variant/40 italic py-12 text-center flex flex-col items-center gap-1">
                  <span className="material-symbols-outlined text-3xl opacity-40">crisis_alert</span>
                  <span>Zero alarms logged. Monitoring database parameters...</span>
                </div>
              ) : (
                alertLogs.map(log => (
                  <div key={log.id} className="p-3 border border-error/20 bg-error-container/30 rounded-xl space-y-1 text-left">
                    <div className="flex justify-between items-center text-error font-extrabold">
                      <span>🚨 {log.name}</span>
                      <span className="text-[9px] text-on-surface-variant/40">{log.timestamp}</span>
                    </div>
                    <p className="text-[10px] leading-relaxed text-on-surface-variant">
                      {log.message} Value: <span className="text-error font-bold">{log.value}</span>
                    </p>
                  </div>
                ))
              )
            ) : (
              auditLogs.length === 0 ? (
                <div className="text-on-surface-variant/40 italic py-12 text-center flex flex-col items-center gap-1">
                  <span className="material-symbols-outlined text-3xl opacity-40">policy</span>
                  <span>No audit logs captured. Execute queries to populate.</span>
                </div>
              ) : (
                auditLogs.map(log => {
                  const isBlocked = log.ast_status === "BLOCKED";
                  const isFailed = log.ast_status === "FAILED";
                  return (
                    <div key={log.id} className={`p-3 border rounded-xl space-y-2 text-left ${
                      isBlocked ? 'border-amber-500/20 bg-amber-50/50' :
                      isFailed ? 'border-error/20 bg-red-50/50' :
                      'border-primary/20 bg-green-50/50'
                    }`}>
                      <div className="flex justify-between items-center font-bold">
                        <span className={
                          isBlocked ? 'text-tertiary' :
                          isFailed ? 'text-error' :
                          'text-primary'
                        }>
                          {isBlocked ? '🛡️ AST BLOCKED' : isFailed ? '⚠️ EXECUTION FAILED' : '✅ QUERY PASSED'}
                        </span>
                        <span className="text-[9px] text-on-surface-variant/40">{log.timestamp}</span>
                      </div>
                      <p className="text-[10px] text-on-surface leading-relaxed">
                        <span className="text-on-surface-variant/40">Query:</span> "{log.user_query}"
                      </p>
                      {log.generated_sql && (
                        <div className="text-[9px] bg-surface p-2.5 rounded border border-outline-variant/60 overflow-x-auto whitespace-pre font-mono text-secondary custom-scrollbar">
                          {log.generated_sql}
                        </div>
                      )}
                      {log.error_message && (
                        <div className="text-[9px] text-error italic">
                          Err: {log.error_message}
                        </div>
                      )}
                      <div className="flex justify-between items-center text-[9px] text-on-surface-variant/30 pt-1.5 border-t border-outline-variant/60">
                        <span>Role: <span className="text-on-surface-variant">{log.user_role}</span></span>
                        <span>Latency: <span className="text-on-surface-variant">{log.latency_ms}ms</span></span>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>

        {/* Slack Webhook Sandbox */}
        <div className="glass-card rounded-2xl h-[280px] flex flex-col overflow-hidden shrink-0">
          <div className="px-5 py-3 border-b border-outline-variant bg-surface-dim/20 shrink-0 select-none">
            <h3 className="text-xs uppercase tracking-wider font-extrabold text-tertiary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">webhook</span>
              Slack Slash Sandbox
            </h3>
          </div>

          <div className="p-4.5 flex flex-col justify-between h-full overflow-hidden bg-surface-container-lowest/30">
            <div className="space-y-3.5 w-full flex flex-col h-full justify-between">
              <div className="flex gap-2.5 shrink-0 select-none">
                <div className="flex-grow relative">
                  <div className="relative border border-outline/30 rounded-xl px-3.5 py-1.5 flex items-center bg-surface">
                    <span className="text-[11px] font-mono text-secondary font-bold mr-2 shrink-0">/data-agent</span>
                    <input
                      type="text"
                      value={slackMockQuery}
                      onChange={e => setSlackMockQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendSlackWebhook()}
                      className="w-full bg-transparent border-none text-xs py-1.5 placeholder-on-surface-variant/40 text-on-surface outline-none"
                      placeholder="Type query command (e.g. Sales in Brazil)..."
                    />
                  </div>
                </div>
                <button
                  onClick={handleSendSlackWebhook}
                  disabled={isSlackExecuting}
                  className="bg-gradient-to-r from-primary to-secondary text-white px-4 rounded-xl text-xs font-bold transition-all cursor-pointer border-none shrink-0"
                >
                  Send
                </button>
              </div>

              {/* Slack response view Mock */}
              <div className="flex-grow overflow-y-auto bg-surface border border-outline-variant/60 rounded-xl p-3.5 custom-scrollbar text-[11px] font-mono text-on-surface-variant leading-relaxed relative text-left">
                {isSlackExecuting ? (
                  <div className="text-center py-8 select-none animate-pulse">Invoking webhook slash route...</div>
                ) : !slackBlockResponse ? (
                  <div className="italic text-center py-8 select-none text-on-surface-variant/40">
                    Type a mock slack query to fetch block JSON configurations here.
                  </div>
                ) : (
                  <pre className="text-primary text-[10px] leading-normal select-all">
                    <code>{JSON.stringify(slackBlockResponse, null, 2)}</code>
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
