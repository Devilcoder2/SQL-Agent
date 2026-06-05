import React, { useState, useEffect } from 'react';

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

  // Sync Alerts & Logs in background
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

  return (
    <div className="h-full w-full grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden text-left">
      
      {/* Left Side: Rules list and Create Alarm scheduler (Col span 7) */}
      <div className="glass-card rounded-2xl lg:col-span-7 flex flex-col h-full overflow-hidden border border-white/5 bg-[#0b1326]/20">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01] shrink-0">
          <h3 className="text-xs uppercase tracking-wider font-semibold text-secondary flex items-center gap-2">
            <span className="material-symbols-outlined text-base">alarm_add</span>
            Scheduled SQL Anomaly Triggers
          </h3>
        </div>

        <div className="flex-grow p-6 overflow-y-auto space-y-6 custom-scrollbar h-full bg-[#020617]/25">
          
          {/* Create New Alert Form */}
          <div className="p-5 border border-white/5 bg-[#0b1326]/40 rounded-2xl space-y-4">
            <h4 className="text-xs uppercase tracking-wider font-bold text-white">Create New Alert Rule</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase font-extrabold text-white/30 block mb-1">Rule Name</label>
                <input
                  type="text"
                  value={newAlertName}
                  onChange={e => setNewAlertName(e.target.value)}
                  className="w-full bg-[#020617] border border-white/5 rounded-lg text-xs px-3 py-2 text-white outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="text-[9px] uppercase font-extrabold text-white/30 block mb-1">Interval (seconds)</label>
                <input
                  type="number"
                  value={newAlertInterval}
                  onChange={e => setNewAlertInterval(e.target.value)}
                  className="w-full bg-[#020617] border border-white/5 rounded-lg text-xs px-3 py-2 text-white outline-none focus:border-primary/50"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] uppercase font-extrabold text-white/30 block mb-1">Threshold Condition</label>
              <input
                type="text"
                placeholder="e.g. > 10, < 2"
                value={newAlertCondition}
                onChange={e => setNewAlertCondition(e.target.value)}
                className="w-full bg-[#020617] border border-white/5 rounded-lg text-xs px-3 py-2 text-white outline-none focus:border-primary/50 font-mono"
              />
            </div>

            <div>
              <label className="text-[9px] uppercase font-extrabold text-white/30 block mb-1">SQL Check Statement</label>
              <textarea
                rows={2}
                value={newAlertQuery}
                onChange={e => setNewAlertQuery(e.target.value)}
                className="w-full bg-[#020617] border border-white/5 rounded-lg text-xs px-3 py-2 text-white outline-none focus:border-primary/50 font-mono leading-relaxed resize-none"
              />
            </div>

            <button
              onClick={handleCreateAlert}
              disabled={isRegisteringAlert}
              className="bg-gradient-to-r from-primary to-secondary text-[#020617] font-bold px-5 py-2.5 rounded-xl text-xs hover:shadow-lg hover:shadow-primary/5 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border-none w-full"
            >
              {isRegisteringAlert ? 'Scheduling...' : 'Launch scheduled alert task'}
            </button>
          </div>

          {/* Active Alert Rules list */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-wider font-bold text-[#c3c6d7]">Active Alert Watchers</h4>
            
            {alerts.length === 0 ? (
              <div className="text-xs text-[#c3c6d7]/30 italic py-4 text-center">Loading watchers...</div>
            ) : (
              alerts.map(rule => {
                const isTriggered = rule.status === "Triggered";
                const isError = rule.status === "Error";
                return (
                  <div key={rule.id} className="p-4 border border-white/5 bg-[#0b1326]/20 rounded-xl flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                          isTriggered ? 'bg-red-950/60 text-red-400 border border-red-500/25 animate-pulse' :
                          isError ? 'bg-yellow-950/40 text-yellow-400 border border-yellow-500/25' :
                          'bg-secondary/10 text-secondary border border-secondary/20'
                        }`}>
                          {rule.status}
                        </span>
                        <span className="text-xs font-extrabold text-white">{rule.name}</span>
                      </div>
                      <div className="text-[10px] font-mono text-white/50 truncate max-w-md">
                        {rule.query}
                      </div>
                      {rule.last_checked && (
                        <div className="text-[9px] text-[#c3c6d7]/40 font-mono">
                          Last Checked: {rule.last_checked} | Threshold: {rule.condition}
                        </div>
                      )}
                    </div>

                    {isTriggered && (
                      <button
                        onClick={() => handleResetAlert(rule.id)}
                        className="bg-white/10 hover:bg-white/15 text-white text-[9px] font-bold uppercase tracking-wider py-1 px-3.5 rounded border border-white/15 transition-all cursor-pointer"
                      >
                        Reset Status
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

        </div>
      </div>

      {/* Right Side: Alarm logs terminal & Slack Webhook sandbox (Col span 5) */}
      <div className="lg:col-span-5 flex flex-col gap-6 h-full overflow-hidden">
        
        {/* Log container with tabs */}
        <div className="glass-card rounded-2xl flex-1 flex flex-col overflow-hidden border border-white/5 bg-[#0b1326]/20">
          <div className="px-5 py-3 border-b border-white/5 bg-white/[0.01] flex items-center justify-between shrink-0">
            <div className="flex gap-4">
              <button 
                onClick={() => setLogViewTab("alarms")}
                className={`text-xs uppercase tracking-wider font-semibold border-none bg-transparent cursor-pointer flex items-center gap-2 pb-1 ${
                  logViewTab === "alarms" 
                    ? "text-red-400 border-b-2 border-red-400" 
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                <span className="material-symbols-outlined text-base">crisis_alert</span>
                Alarms ({alertLogs.length})
              </button>
              <button 
                onClick={() => setLogViewTab("audit")}
                className={`text-xs uppercase tracking-wider font-semibold border-none bg-transparent cursor-pointer flex items-center gap-2 pb-1 ${
                  logViewTab === "audit" 
                    ? "text-primary border-b-2 border-primary" 
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                <span className="material-symbols-outlined text-base">policy</span>
                Security Audit ({auditLogs.length})
              </button>
            </div>
          </div>

          <div className="flex-grow p-5 overflow-y-auto space-y-3 custom-scrollbar text-[11px] font-mono text-[#c3c6d7] bg-[#020617]/50 h-full">
            {logViewTab === "alarms" ? (
              alertLogs.length === 0 ? (
                <div className="text-[#c3c6d7]/30 italic py-12 text-center">
                  Zero alarms logged. Watching database anomaly parameters...
                </div>
              ) : (
                alertLogs.map(log => (
                  <div key={log.id} className="p-3 border border-red-500/20 bg-red-950/20 rounded-lg space-y-1 text-left">
                    <div className="flex justify-between items-center text-red-300 font-extrabold">
                      <span>🚨 {log.name}</span>
                      <span className="text-[9px] text-white/40">{log.timestamp}</span>
                    </div>
                    <p className="text-[10px] leading-relaxed text-[#c3c6d7]">
                      {log.message} Value detected: <span className="text-white font-bold">{log.value}</span>
                    </p>
                  </div>
                ))
              )
            ) : (
              auditLogs.length === 0 ? (
                <div className="text-[#c3c6d7]/30 italic py-12 text-center">
                  No audit logs captured yet. Execute chat queries to populate.
                </div>
              ) : (
                auditLogs.map(log => {
                  const isBlocked = log.ast_status === "BLOCKED";
                  const isFailed = log.ast_status === "FAILED";
                  return (
                    <div key={log.id} className={`p-3 border rounded-lg space-y-1.5 text-left ${
                      isBlocked ? 'border-amber-500/20 bg-amber-950/20' :
                      isFailed ? 'border-red-500/20 bg-red-950/20' :
                      'border-[#2563eb]/20 bg-[#2563eb]/5'
                    }`}>
                      <div className="flex justify-between items-center font-extrabold">
                        <span className={
                          isBlocked ? 'text-amber-400' :
                          isFailed ? 'text-red-400' :
                          'text-primary'
                        }>
                          {isBlocked ? '🛡️ AST BLOCKED' : isFailed ? '⚠️ EXECUTION FAILED' : '✅ QUERY PASSED'}
                        </span>
                        <span className="text-[9px] text-white/40">{log.timestamp}</span>
                      </div>
                      <p className="text-[10px] text-white leading-relaxed">
                        <span className="text-[#c3c6d7]/50">Query:</span> "{log.user_query}"
                      </p>
                      {log.generated_sql && (
                        <div className="text-[9px] bg-[#020617] p-2 rounded border border-white/5 overflow-x-auto whitespace-pre font-mono text-[#a5f3fc]">
                          {log.generated_sql}
                        </div>
                      )}
                      {log.error_message && (
                        <div className="text-[9px] text-red-300 italic">
                          Err: {log.error_message}
                        </div>
                      )}
                      <div className="flex justify-between items-center text-[9px] text-white/30 pt-1 border-t border-white/5">
                        <span>Role: <span className="text-white/60">{log.user_role}</span></span>
                        <span>Latency: <span className="text-white/60">{log.latency_ms}ms</span></span>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>

        {/* Slack Webhook Sandbox */}
        <div className="glass-card rounded-2xl h-[280px] flex flex-col overflow-hidden border border-white/5 bg-[#0b1326]/20 shrink-0">
          <div className="px-5 py-3 border-b border-white/5 bg-white/[0.01] shrink-0">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-tertiary flex items-center gap-2">
              <span className="material-symbols-outlined text-base">webhook</span>
              Slack Slash Sandbox
            </h3>
          </div>

          <div className="p-5 flex flex-col justify-between h-full overflow-hidden">
            <div className="space-y-3 w-full">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={slackMockQuery}
                  onChange={e => setSlackMockQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendSlackWebhook()}
                  className="flex-grow bg-[#020617] border border-white/5 rounded-lg text-xs px-3 py-2 text-white outline-none focus:border-primary/50"
                  placeholder="Type Slack chat prompt..."
                />
                <button
                  onClick={handleSendSlackWebhook}
                  disabled={isSlackExecuting}
                  className="bg-gradient-to-r from-primary to-secondary text-[#020617] px-4 rounded-lg text-xs font-bold hover:scale-[1.02] active:scale-95 transition-all cursor-pointer border-none shrink-0"
                >
                  Send
                </button>
              </div>

              {/* Slack response view */}
              <div className="h-[125px] overflow-y-auto bg-[#020617]/70 border border-white/5 rounded-xl p-3.5 custom-scrollbar text-[11px] font-mono text-white/50 leading-relaxed relative text-left">
                {isSlackExecuting ? (
                  <div className="text-center py-6 select-none animate-pulse">Running webhook API...</div>
                ) : !slackBlockResponse ? (
                  <div className="italic text-center py-6 select-none">
                    Type /data-agent command mock queries to fetch blocks JSON.
                  </div>
                ) : (
                  <pre className="text-[#a5b4fc] text-[10px] leading-relaxed select-all">
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
