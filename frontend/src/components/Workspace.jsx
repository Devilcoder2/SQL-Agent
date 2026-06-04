import React, { useState, useEffect, useRef } from 'react';

export default function Workspace({ setView }) {
  // State variables
  const [query, setQuery] = useState("Who are the top 3 support representatives based on total customer sales?");
  const [role, setRole] = useState("general");
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState("results");
  
  // Database Introspection State
  const [tables, setTables] = useState([]);
  const [tableSchemas, setTableSchemas] = useState({}); // { tableName: { columns: [], fkeys: [] } }
  const [expandedTables, setExpandedTables] = useState(new Set());
  
  // Glossary Input State
  const [gTerm, setGTerm] = useState("");
  const [gDef, setGDef] = useState("");
  const [gSql, setGSql] = useState("");
  const [isRegisteringGlossary, setIsRegisteringGlossary] = useState(false);

  // Agent State Output
  const [logs, setLogs] = useState([]);
  const [generatedSql, setGeneratedSql] = useState("");
  const [securityStatus, setSecurityStatus] = useState("Unverified");
  const [queryResults, setQueryResults] = useState(null);
  const [executionError, setExecutionError] = useState(null);
  const [narrativeResponse, setNarrativeResponse] = useState("");

  // Refs and hooks
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const thoughtLogsEndRef = useRef(null);

  // Multiplayer cursor state simulation
  const [remoteCursorPos, setRemoteCursorPos] = useState({ top: '150px', left: '350px' });

  // On mount: fetch tables and run cursor simulation
  useEffect(() => {
    fetchTables();

    // Cursor animation loop
    const points = [
      { top: '120px', left: '340px' },
      { top: '250px', left: '680px' },
      { top: '420px', left: '820px' },
      { top: '140px', left: '550px' },
      { top: '360px', left: '410px' }
    ];
    let pointIdx = 0;
    const interval = setInterval(() => {
      setRemoteCursorPos(points[pointIdx]);
      pointIdx = (pointIdx + 1) % points.length;
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom of agent logs whenever they update
  useEffect(() => {
    if (thoughtLogsEndRef.current) {
      thoughtLogsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Re-plot chart whenever query results change
  useEffect(() => {
    renderChart();
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [queryResults]);

  // --- API Handlers ---
  const fetchTables = async () => {
    try {
      const res = await fetch("/api/v1/tables");
      if (!res.ok) throw new Error("Failed to load tables");
      const data = await res.json();
      setTables(data.tables);
    } catch (err) {
      console.error("Error fetching tables:", err);
    }
  };

  const loadTableColumns = async (tableName) => {
    if (tableSchemas[tableName]) return; // already loaded
    try {
      const res = await fetch(`/api/v1/tables/${tableName}/schema`);
      if (!res.ok) throw new Error("Failed to load schema");
      const data = await res.json();
      setTableSchemas(prev => ({
        ...prev,
        [tableName]: {
          columns: data.columns,
          foreign_keys: data.foreign_keys
        }
      }));
    } catch (err) {
      console.error(`Error loading columns for ${tableName}:`, err);
    }
  };

  const toggleTableExpand = async (tableName) => {
    const nextExpanded = new Set(expandedTables);
    if (nextExpanded.has(tableName)) {
      nextExpanded.delete(tableName);
    } else {
      nextExpanded.add(tableName);
      await loadTableColumns(tableName);
    }
    setExpandedTables(nextExpanded);
  };

  const registerGlossary = async () => {
    if (!gTerm.trim() || !gDef.trim() || !gSql.trim()) {
      alert("Please fill in all glossary fields.");
      return;
    }
    setIsRegisteringGlossary(true);
    try {
      const res = await fetch("/api/v1/glossary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: gTerm, definition: gDef, sql_hint: gSql })
      });
      if (!res.ok) throw new Error("Failed to save glossary term");
      setGTerm("");
      setGDef("");
      setGSql("");
      alert(`Glossary term "${gTerm}" successfully registered.`);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsRegisteringGlossary(false);
    }
  };

  const logMessage = (text, type = "info") => {
    setLogs(prev => [...prev, { text, type }]);
  };

  const handleExecuteQuery = async () => {
    if (!query.trim()) return;

    setIsExecuting(true);
    setLogs([]);
    setGeneratedSql("");
    setQueryResults(null);
    setExecutionError(null);
    setNarrativeResponse("");
    setSecurityStatus("Processing...");
    setActiveTab("results");

    logMessage("Semantic Context: Searching ChromaDB for schema mappings...", "info");

    try {
      // Simulate multi-turn agent latency
      await new Promise(r => setTimeout(r, 600));
      logMessage("Table Selection: Resolved relevant tables based on vector search context.", "success");

      await new Promise(r => setTimeout(r, 650));
      logMessage("SQL Synthesizer: Translating intent to SQLite dialect query using Gemini 3.5...", "info");

      const response = await fetch("/api/v1/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query, role: role })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Agent invocation failed.");
      }

      const data = await response.json();
      setGeneratedSql(data.generated_sql);

      // Handle security blocks
      if (data.execution_error && data.execution_error.includes("Security Exception")) {
        logMessage(`AST Guardrail: Destructive command detected! Intercepting execution.`, "security");
        logMessage(`Security Alert: Execution Blocked. ${data.execution_error}`, "error");
        setSecurityStatus("BLOCKED");
        setExecutionError(data.execution_error);
        return;
      }

      // Handle raw syntax execution errors
      if (data.execution_error) {
        logMessage(`DB Engine: Query returned execution error.`, "error");
        logMessage(`Error Trace: ${data.execution_error}`, "error");
        setSecurityStatus("FAILED");
        setExecutionError(data.execution_error);
        return;
      }

      // Query succeeded
      logMessage("AST Guardrail: Statement approved. Only read-only query structures present.", "success");
      logMessage(`Database Engine: Query completed successfully. Fetching dataset...`, "success");

      setSecurityStatus("VERIFIED SELECT");
      setQueryResults(data.query_results);
      setNarrativeResponse(data.narrative_response);

    } catch (err) {
      logMessage(`System Failure: ${err.message}`, "error");
      setSecurityStatus("SYSTEM ERROR");
      setExecutionError(err.message);
    } finally {
      setIsExecuting(false);
    }
  };

  // --- SQL Syntax Highlighting Engine ---
  const renderHighlightedSQL = (sqlText) => {
    if (!sqlText) return <span className="text-on-surface-variant/50 italic">-- Generated safe SQL statement will be highlighted here --</span>;
    
    let escaped = sqlText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const keywords = [
      "SELECT", "FROM", "WHERE", "JOIN", "ON", "GROUP BY", "ORDER BY", "LIMIT",
      "CASE", "WHEN", "THEN", "ELSE", "END", "AS", "COUNT", "SUM", "MIN", "MAX",
      "AVG", "AND", "OR", "IN", "NOT", "NULL", "DESC", "ASC", "HAVING", "DELETE"
    ];

    escaped = escaped.replace(/('[^']*')/g, '<span class="sql-string">$1</span>');

    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b(${keyword})\\b`, "gi");
      escaped = escaped.replace(regex, '<span class="sql-keyword">$1</span>');
    });

    const functions = ["SUM", "COUNT", "AVG", "MIN", "MAX", "IFNULL", "COALESCE"];
    functions.forEach(func => {
      const regex = new RegExp(`\\b(${func})\\(`, "gi");
      escaped = escaped.replace(regex, '<span class="sql-function">$1</span>(');
    });

    return <span dangerouslySetInnerHTML={{ __html: escaped }} />;
  };

  // --- Dynamic Visual Chart.js Engine ---
  const renderChart = () => {
    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }

    if (!queryResults || queryResults.length === 0 || !chartRef.current) return;

    const firstRow = queryResults[0];
    const keys = Object.keys(firstRow);
    
    let labelKey = null;
    let valueKey = null;

    for (let key of keys) {
      const val = firstRow[key];
      if (typeof val === "string" && !labelKey) {
        labelKey = key;
      } else if (typeof val === "number" && !valueKey) {
        valueKey = key;
      }
    }

    if (!labelKey) labelKey = keys[0];
    if (!valueKey) {
      for (let key of keys) {
        if (key !== labelKey) {
          const parsed = parseFloat(firstRow[key]);
          if (!isNaN(parsed)) {
            valueKey = key;
            break;
          }
        }
      }
    }

    if (!valueKey) return; // No numbers to chart

    const labels = queryResults.map(row => row[labelKey]);
    const values = queryResults.map(row => {
      const v = row[valueKey];
      return typeof v === "number" ? v : parseFloat(v) || 0;
    });

    const ctx = chartRef.current.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, "rgba(37, 99, 235, 0.6)");
    gradient.addColorStop(1, "rgba(78, 222, 163, 0.15)");

    chartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: valueKey,
          data: values,
          backgroundColor: gradient,
          borderColor: "#b4c5ff",
          borderWidth: 1,
          borderRadius: 4,
          hoverBackgroundColor: "rgba(180, 197, 255, 0.8)"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: { color: "#c3c6d7", font: { family: "Inter", size: 10 } }
          }
        },
        scales: {
          x: {
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: { color: "#c3c6d7", font: { family: "Inter", size: 9 } }
          },
          y: {
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: { color: "#c3c6d7", font: { family: "Inter", size: 9 } }
          }
        }
      }
    });
  };

  const handleCopySql = () => {
    if (!generatedSql) return;
    navigator.clipboard.writeText(generatedSql).then(() => {
      alert("SQL query copied to clipboard!");
    });
  };

  return (
    <div className="h-screen flex flex-col bg-[#020617] text-[#dae2fd] overflow-hidden">
      {/* TopNavBar */}
      <nav className="w-full z-50 bg-[#0b1326]/80 backdrop-blur-xl border-b border-white/5 flex justify-between items-center px-margin-desktop h-16 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('landing')} className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#b4c5ff] to-[#4edea3] flex items-center justify-center cursor-pointer border-none">
            <span className="material-symbols-outlined text-[#020617] font-bold text-lg">terminal</span>
          </button>
          <span className="font-headline-md text-headline-md font-bold text-on-surface">Enterprise AI SQL Agent Workspace</span>
        </div>
        <div className="flex items-center gap-lg">
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded bg-[#131b2e] border border-white/5">
            <span class="w-2.5 h-2.5 rounded-full bg-[#4edea3] animate-pulse"></span>
            <span>Active Connection: <code className="text-[#4edea3]">chinook.db</code></span>
          </div>
          <button onClick={() => setView('landing')} className="text-xs font-semibold text-on-surface-variant hover:text-white transition-colors bg-transparent border-none cursor-pointer">
            Exit Workspace
          </button>
        </div>
      </nav>

      <div className="flex flex-row flex-grow overflow-hidden relative">
        {/* Collaboration Cursor Layer */}
        <div id="cursor-layer" className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
          <div 
            id="remote-cursor" 
            className="collab-cursor flex flex-col items-start absolute" 
            style={{ 
              top: remoteCursorPos.top, 
              left: remoteCursorPos.left,
              transition: 'all 0.8s cubic-bezier(0.25, 0.8, 0.25, 1)' 
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4.5 3V19.5L10.5 13.5H19.5L4.5 3Z" fill="#ffb4ab" stroke="white" strokeWidth="1.5"/>
            </svg>
            <div className="bg-[#ffb4ab] text-[#690005] text-[10px] font-bold px-1.5 py-0.5 rounded shadow mt-1 whitespace-nowrap">
              Sarah (Senior Analyst)
            </div>
          </div>
        </div>

        {/* Left Sidebar: Schema Explorer & Glossary */}
        <aside className="w-[290px] bg-[#060e20]/50 border-r border-white/5 flex flex-col p-md space-y-4 shrink-0 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between pb-sm border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-md">schema</span>
              <h3 class="font-label-sm text-label-sm text-primary uppercase tracking-wider">Schema Explorer</h3>
            </div>
            <button onClick={fetchTables} className="text-on-surface-variant hover:text-white transition-colors active:scale-95 bg-transparent border-none">
              <span className="material-symbols-outlined text-sm">sync</span>
            </button>
          </div>

          {/* Table accordion list */}
          <div className="flex-grow space-y-2 overflow-y-auto custom-scrollbar min-h-[200px]">
            {tables.length === 0 ? (
              <div className="text-xs text-on-surface-variant/40 italic text-center py-4">No tables found.</div>
            ) : (
              tables.map(table => {
                const isExpanded = expandedTables.has(table);
                const schema = tableSchemas[table];
                return (
                  <div key={table} className="border border-white/5 bg-[#131b2e]/30 rounded-lg overflow-hidden">
                    <div 
                      onClick={() => toggleTableExpand(table)}
                      className="flex items-center justify-between p-2.5 hover:bg-surface-container-high/50 cursor-pointer duration-150 select-none"
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-secondary">table_chart</span>
                        <span className="text-xs font-semibold text-on-surface">{table}</span>
                      </div>
                      <span 
                        className="material-symbols-outlined text-[16px] text-on-surface-variant/60 transition-transform"
                        style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                      >
                        chevron_right
                      </span>
                    </div>

                    {isExpanded && (
                      <div className="bg-[#060e20] border-t border-white/5 p-2 space-y-1.5 text-[11px] font-mono">
                        {!schema ? (
                          <div className="text-[10px] text-on-surface-variant/50 italic px-2">Loading columns...</div>
                        ) : (
                          schema.columns.map(col => {
                            const isPK = col.primary_key;
                            const fk = schema.foreign_keys.find(f => f.constrained_columns.includes(col.name));
                            return (
                              <div key={col.name} className="flex items-center px-2 py-0.5 hover:bg-white/5 rounded">
                                <span className="text-[#c3c6d7]">{col.name}</span>
                                <span className="text-[9px] text-[#c3c6d7]/40 ml-1.5 font-sans">{col.type}</span>
                                {isPK && <span className="text-[#4edea3] text-[10px] ml-auto font-sans font-semibold">🔑 PK</span>}
                                {fk && <span className="text-[#b4c5ff] text-[10px] ml-auto font-sans font-semibold cursor-help" title={`References ${fk.referred_table}`}>🔗 FK</span>}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Glossary panel */}
          <div className="pt-sm border-t border-white/5 flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-[#d0bcff] text-md">book_2</span>
              <h3 className="font-label-sm text-label-sm text-[#d0bcff] uppercase tracking-wider">Semantic Glossary</h3>
            </div>
            <div className="glass-panel p-md rounded-lg flex flex-col gap-2 bg-[#131b2e]/45">
              <input 
                type="text" 
                placeholder="Term (e.g. sales)" 
                value={gTerm}
                onChange={e => setGTerm(e.target.value)}
                className="w-full bg-[#060e20] border border-white/5 rounded text-xs px-2 py-1.5 focus:border-[#b4c5ff] focus:ring-0 text-white placeholder:text-[#c3c6d7]/40"
              />
              <input 
                type="text" 
                placeholder="Business explanation" 
                value={gDef}
                onChange={e => setGDef(e.target.value)}
                className="w-full bg-[#060e20] border border-white/5 rounded text-xs px-2 py-1.5 focus:border-[#b4c5ff] focus:ring-0 text-white placeholder:text-[#c3c6d7]/40"
              />
              <input 
                type="text" 
                placeholder="SQL Constraint (Invoice.Total)" 
                value={gSql}
                onChange={e => setGSql(e.target.value)}
                className="w-full bg-[#060e20] border border-white/5 rounded text-xs px-2 py-1.5 focus:border-[#b4c5ff] focus:ring-0 text-white placeholder:text-[#c3c6d7]/40"
              />
              <button 
                onClick={registerGlossary}
                disabled={isRegisteringGlossary}
                className="w-full bg-[#b4c5ff]/10 border border-[#b4c5ff]/20 text-[#b4c5ff] py-1.5 rounded text-xs font-bold hover:bg-[#b4c5ff]/25 transition-colors active:scale-95 cursor-pointer"
              >
                {isRegisteringGlossary ? 'Registering...' : 'Register Glossary Term'}
              </button>
            </div>
          </div>
        </aside>

        {/* Main Panel */}
        <main className="flex-grow flex flex-col overflow-hidden px-lg py-md space-y-md">
          
          {/* NLP bar & execute */}
          <section className="w-full shrink-0">
            <div className="flex flex-col md:flex-row gap-sm items-stretch">
              <div className="relative group flex-grow">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[#b4c5ff] to-[#4edea3] rounded-xl blur opacity-15 group-focus-within:opacity-30 transition duration-300"></div>
                <div className="relative glass-panel rounded-xl p-xs flex items-center px-md">
                  <span className="material-symbols-outlined text-[#b4c5ff] text-[24px] mr-3">psychology</span>
                  <input 
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleExecuteQuery()}
                    className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium placeholder:text-[#c3c6d7]/40 py-2.5 text-white" 
                    placeholder="Ask database anything..." 
                    type="text"
                  />
                </div>
              </div>
              
              <div class="flex flex-row gap-sm shrink-0 items-center justify-end">
                <div className="flex items-center gap-1.5 px-3 py-2 bg-[#131b2e] border border-white/5 rounded-xl h-full">
                  <span className="material-symbols-outlined text-xs text-[#c3c6d7]">person</span>
                  <select 
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 text-xs font-semibold py-0 pl-1 pr-6 text-[#dae2fd]"
                  >
                    <option class="bg-[#0b1326] text-white" value="general">Role: General Staff</option>
                    <option class="bg-[#0b1326] text-white" value="analyst">Role: Business Analyst</option>
                    <option class="bg-[#0b1326] text-white" value="admin">Role: Admin Clearance</option>
                  </select>
                </div>
                
                <button 
                  onClick={handleExecuteQuery}
                  disabled={isExecuting}
                  className="bg-gradient-to-r from-[#b4c5ff] to-[#4edea3] text-[#002a78] font-bold px-6 rounded-xl flex items-center gap-2 hover:shadow-[0_0_15px_rgba(180,197,255,0.2)] active:scale-95 transition-all duration-150 h-full cursor-pointer border-none"
                >
                  <span>Execute</span>
                  <span className="material-symbols-outlined text-[16px] font-bold">bolt</span>
                </button>
              </div>
            </div>
          </section>

          {/* Middle Bento Row */}
          <section className="grid grid-cols-12 gap-gutter h-[220px] shrink-0">
            {/* Logs Panel */}
            <div className="col-span-12 lg:col-span-5 glass-panel rounded-xl p-md flex flex-col overflow-hidden h-full">
              <div className="flex items-center justify-between pb-sm border-b border-white/5">
                <h3 className="font-label-sm text-label-sm text-[#4edea3] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">settings_suggest</span>
                  Agent Execution Logs
                </h3>
                {isExecuting && <span className="material-symbols-outlined text-[#4edea3] animate-spin text-sm">sync</span>}
              </div>
              <div className="flex-grow overflow-y-auto space-y-2.5 py-sm custom-scrollbar text-xs">
                {logs.length === 0 ? (
                  <div className="text-[#c3c6d7]/40 italic py-4 text-center">Ready. Submit a question to initiate execution.</div>
                ) : (
                  logs.map((log, idx) => {
                    const iconMap = {
                      "success": 'check',
                      "error": 'close',
                      "security": 'gpp_bad',
                      "info": 'keyboard_double_arrow_right'
                    };
                    const bgMap = {
                      "success": "bg-[#4edea3]/10 border-[#4edea3]/30 text-[#4edea3]",
                      "error": "bg-red-400/10 border-red-400/30 text-red-400",
                      "security": "bg-red-900/20 border-red-900/30 text-red-300",
                      "info": "bg-[#b4c5ff]/10 border-[#b4c5ff]/30 text-[#b4c5ff]"
                    };
                    const iconClass = log.type === "info" ? "animate-pulse" : "";
                    return (
                      <div key={idx} className="flex items-start gap-3">
                        <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center border ${bgMap[log.type]} shrink-0`}>
                          <span className={`material-symbols-outlined text-[14px] ${iconClass}`}>{iconMap[log.type]}</span>
                        </div>
                        <div>
                          <p className="text-on-surface font-semibold">{log.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={thoughtLogsEndRef} />
              </div>
            </div>

            {/* SQL Monaco View */}
            <div className="col-span-12 lg:col-span-7 glass-panel rounded-xl overflow-hidden flex flex-col h-full">
              <div className="bg-surface-container-high px-md py-2 flex justify-between items-center border-b border-white/5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[#c3c6d7]">agent_query_compiled.sql</span>
                  <span 
                    className={`text-[9px] px-1.5 py-[1px] rounded border font-bold uppercase tracking-wider ${
                      securityStatus.includes("VERIFIED") ? "bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/25" :
                      securityStatus.includes("BLOCKED") ? "bg-red-900/20 text-red-400 border-red-900/30" :
                      "bg-[#b4c5ff]/10 text-[#b4c5ff] border-[#b4c5ff]/25"
                    }`}
                  >
                    {securityStatus}
                  </span>
                </div>
                <button onClick={handleCopySql} className="text-[#c3c6d7] hover:text-white transition-colors bg-transparent border-none cursor-pointer">
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                </button>
              </div>
              <div className="flex-grow p-md monaco-editor overflow-auto custom-scrollbar text-xs">
                {renderHighlightedSQL(generatedSql)}
              </div>
            </div>
          </section>

          {/* Bottom Bento Row: Results & Narrative Split Pane */}
          <section className="flex-grow grid grid-cols-12 gap-gutter overflow-hidden min-h-[250px]">
            {/* Results View */}
            <div className="col-span-12 lg:col-span-7 glass-panel rounded-xl overflow-hidden flex flex-col h-full">
              <div className="px-md border-b border-white/5 flex items-center justify-between shrink-0 bg-[#131b2e]/50">
                <div className="flex gap-md">
                  <button 
                    onClick={() => setActiveTab("results")}
                    className={`font-label-sm text-label-sm py-3 px-1 transition-all border-none bg-transparent cursor-pointer ${activeTab === 'results' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-white'}`}
                  >
                    Results Grid
                  </button>
                  <button 
                    onClick={() => setActiveTab("tldr")}
                    className={`font-label-sm text-label-sm py-3 px-1 transition-all border-none bg-transparent cursor-pointer ${activeTab === 'tldr' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-white'}`}
                  >
                    Executive Narrative
                  </button>
                </div>
                <div className="text-[10px] text-[#c3c6d7] font-semibold bg-[#131b2e] border border-white/5 px-2 py-0.5 rounded">
                  {queryResults ? queryResults.length : 0} Rows
                </div>
              </div>

              <div className="flex-grow overflow-auto custom-scrollbar h-full">
                {activeTab === "results" ? (
                  <div className="w-full h-full">
                    {executionError ? (
                      <div className="text-xs text-red-400 italic py-8 text-center font-semibold">
                        Security Shield Active: Database operation blocked.<br/>{executionError}
                      </div>
                    ) : !queryResults ? (
                      <div className="text-xs text-[#c3c6d7]/40 italic py-8 text-center">No data loaded yet.</div>
                    ) : queryResults.length === 0 ? (
                      <div class="text-xs text-[#c3c6d7]/40 italic py-8 text-center">No rows returned.</div>
                    ) : (
                      <div className="overflow-x-auto w-full h-full max-h-full">
                        <table className="w-full text-left font-body-md text-body-md whitespace-nowrap border-collapse">
                          <thead className="bg-[#2d3449]/50 text-xs text-primary uppercase tracking-wider sticky top-0 z-10 border-b border-white/5">
                            <tr>
                              {Object.keys(queryResults[0]).map(k => (
                                <th key={k} className="px-lg py-md">{k}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-xs">
                            {queryResults.map((row, idx) => (
                              <tr key={idx} className={`${idx % 2 === 1 ? 'bg-white/[0.01]' : ''} hover:bg-white/5 transition-colors border-b border-white/5`}>
                                {Object.keys(queryResults[0]).map(k => {
                                  const val = row[k];
                                  const displayVal = val === null ? "NULL" : val;
                                  const isNumeric = typeof val === "number";
                                  
                                  if (displayVal === "[REDACTED]") {
                                    return <td key={k} className="px-lg py-3 text-red-300 font-semibold">[REDACTED]</td>;
                                  }
                                  return (
                                    <td key={k} className={`px-lg py-3 ${isNumeric ? 'text-right font-mono' : ''}`}>
                                      {displayVal}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-md text-sm leading-relaxed overflow-auto h-full">
                    {executionError ? (
                      <div className="text-xs text-red-400 italic py-8 text-center font-semibold">
                        Execution Blocked due to Security Policy Violation.
                      </div>
                    ) : !narrativeResponse ? (
                      <div className="text-xs text-[#c3c6d7]/40 italic py-8 text-center">Summary narrative will compile here once data is retrieved.</div>
                    ) : (
                      <div className="text-on-surface whitespace-pre-wrap font-sans text-xs text-[#dae2fd]">
                        {narrativeResponse}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Visualization Pane */}
            <div className="col-span-12 lg:col-span-5 glass-panel rounded-xl p-md flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between pb-sm border-b border-white/5 shrink-0">
                <h3 className="font-label-sm text-label-sm text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">analytics</span>
                  Dynamic Visualizer
                </h3>
                <div class="flex items-center gap-1 text-[10px] text-on-surface-variant">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3]"></span>
                  Auto Chart
                </div>
              </div>
              <div className="flex-grow relative flex items-center justify-center p-sm overflow-hidden h-full min-h-[160px]">
                <canvas ref={chartRef} id="insight-chart" className="w-full h-full max-h-full"></canvas>
                {!queryResults && (
                  <div className="absolute text-xs text-[#c3c6d7]/40 italic text-center">
                    Charts will plot automatically based on table values.
                  </div>
                )}
              </div>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}
