import React, { useState, useEffect, useRef } from 'react';

export default function Workspace({ setView }) {
  // Navigation State: 'console' | 'studio' | 'schema' | 'warroom'
  const [workspaceTab, setWorkspaceTab] = useState("console");

  // State variables
  const [query, setQuery] = useState("Who are the top 3 support representatives based on total customer sales?");
  const [role, setRole] = useState("general");
  const [isExecuting, setIsExecuting] = useState(false);
  
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

  // Search Results Table Filter
  const [studioSearch, setStudioSearch] = useState("");

  // Whiteboard Draggable Cards State
  const [pinnedCards, setPinnedCards] = useState({
    queryCard: { x: 40, y: 40 },
    chartCard: { x: 80, y: 220 },
    narrativeCard: { x: 580, y: 50 },
    stickyCard: { x: 640, y: 310 }
  });

  // Refs and hooks
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const thoughtLogsEndRef = useRef(null);
  const wsRef = useRef(null);

  // Multiplayer cursor state simulation for War Room
  const [cursors, setCursors] = useState([
    { id: 1, name: "Sarah (Data Analyst)", x: 220, y: 150, color: "#ff9e80" },
    { id: 2, name: "Mark (VP Product)", x: 620, y: 310, color: "#80ffff" }
  ]);

  // On mount: fetch tables and initialize cursor path cycles
  useEffect(() => {
    fetchTables();

    // Cursor movement timeline
    const interval = setInterval(() => {
      setCursors(prev => prev.map(c => {
        // Only animate local mockup cursors (IDs 1 & 2)
        if (c.id !== 1 && c.id !== 2) return c;
        const angle = Date.now() * 0.001 * (c.id === 1 ? 1 : -0.8);
        const radius = c.id === 1 ? 80 : 120;
        const centerX = c.id === 1 ? 300 : 700;
        const centerY = c.id === 1 ? 200 : 250;
        return {
          ...c,
          x: Math.round(centerX + Math.cos(angle) * radius),
          y: Math.round(centerY + Math.sin(angle) * radius * 0.5)
        };
      }));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Handle WebSockets for real-time War Room cursor/card sync
  useEffect(() => {
    if (workspaceTab !== 'warroom') return;

    // Connects to the FastAPI WS server (resolves Vite dev server port mapping)
    const host = window.location.host.replace('5173', '8000');
    const ws = new WebSocket(`ws://${host}/ws/warroom/1`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'cursor') {
          setCursors(prev => {
            const exists = prev.some(c => c.id === data.id);
            if (exists) {
              return prev.map(c => c.id === data.id ? { ...c, x: data.x, y: data.y } : c);
            } else {
              return [...prev, data];
            }
          });
        } else if (data.type === 'card_move') {
          setPinnedCards(prev => ({
            ...prev,
            [data.cardId]: { x: data.x, y: data.y }
          }));
        }
      } catch (err) {
        console.error("Error parsing WS packet:", err);
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [workspaceTab]);

  // Scroll logs to bottom
  useEffect(() => {
    if (thoughtLogsEndRef.current) {
      thoughtLogsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Re-plot chart when results or tab changes
  useEffect(() => {
    if (workspaceTab === "studio" && queryResults) {
      const timer = setTimeout(() => {
        renderChart();
      }, 80);
      return () => clearTimeout(timer);
    }
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [queryResults, workspaceTab]);

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
    setSecurityStatus("Checking AST...");

    logMessage("Semantic Context: Searching vector index for keyword resolutions...", "info");

    try {
      await new Promise(r => setTimeout(r, 400));
      logMessage("Schema Introspection: Isolating relevant tables for query generation...", "success");

      await new Promise(r => setTimeout(r, 400));
      logMessage("SQL Compiler: Translating prompt with Gemini engine...", "info");

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
        logMessage(`AST Guardrail: Destination table modified or metadata query blocked!`, "security");
        logMessage(`Security Intercept: ${data.execution_error}`, "error");
        setSecurityStatus("BLOCKED");
        setExecutionError(data.execution_error);
        return;
      }

      // Handle raw syntax execution errors
      if (data.execution_error) {
        logMessage(`SQLite Engine: SQL returned compile failure traceback.`, "error");
        logMessage(`Traceback details: ${data.execution_error}`, "error");
        setSecurityStatus("FAILED");
        setExecutionError(data.execution_error);
        return;
      }

      // Query succeeded
      logMessage("AST Guardrail: Statement check passed. Verified safe read-only syntax.", "success");
      logMessage(`Database Gateway: Query completed successfully. Formatting dataset...`, "success");

      setSecurityStatus("VERIFIED SELECT");
      setQueryResults(data.query_results);
      setNarrativeResponse(data.narrative_response);

    } catch (err) {
      logMessage(`System Exception: ${err.message}`, "error");
      setSecurityStatus("SYSTEM ERROR");
      setExecutionError(err.message);
    } finally {
      setIsExecuting(false);
    }
  };

  // --- SQL Syntax Highlighting Engine ---
  const renderHighlightedSQL = (sqlText) => {
    if (!sqlText) return <span className="text-on-surface-variant/40 italic">-- Compiled query statements will be displayed here --</span>;
    
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

  // --- Chart.js Rendering Engine ---
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

    if (!valueKey) return; // No numerical fields to plot

    const labels = queryResults.map(row => row[labelKey]);
    const values = queryResults.map(row => {
      const v = row[valueKey];
      return typeof v === "number" ? v : parseFloat(v) || 0;
    });

    const ctx = chartRef.current.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, "rgba(180, 197, 255, 0.4)");
    gradient.addColorStop(1, "rgba(78, 222, 163, 0.05)");

    chartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: valueKey,
          data: values,
          backgroundColor: gradient,
          borderColor: "#b4c5ff",
          borderWidth: 1.5,
          borderRadius: 6,
          hoverBackgroundColor: "rgba(180, 197, 255, 0.7)"
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
            grid: { color: "rgba(255, 255, 255, 0.03)" },
            ticks: { color: "#c3c6d7", font: { family: "Inter", size: 9 } }
          },
          y: {
            grid: { color: "rgba(255, 255, 255, 0.03)" },
            ticks: { color: "#c3c6d7", font: { family: "Inter", size: 9 } }
          }
        }
      }
    });
  };

  const handleCopySql = () => {
    if (!generatedSql) return;
    navigator.clipboard.writeText(generatedSql).then(() => {
      alert("SQL code copied to clipboard!");
    });
  };

  // --- Document Exporters ---
  const handleExportExcel = async () => {
    if (!queryResults) return;
    try {
      const res = await fetch("/api/v1/export/excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results: queryResults })
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `excel_report_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      alert("Excel export failed: " + err.message);
    }
  };

  const handleExportPDF = async () => {
    if (!queryResults) return;
    try {
      const res = await fetch("/api/v1/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query,
          narrative: narrativeResponse || "No summary brief compiled.",
          results: queryResults
        })
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics_brief_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      alert("PDF export failed: " + err.message);
    }
  };

  const handleExportPPTX = async () => {
    try {
      const res = await fetch("/api/v1/export/pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query,
          narrative: narrativeResponse || "No summary brief compiled.",
          sql: generatedSql || "-- No SQL statement compiled."
        })
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `slide_presentation_${Date.now()}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      alert("PowerPoint export failed: " + err.message);
    }
  };

  const handleDownloadCSV = () => {
    if (!queryResults || queryResults.length === 0) return;
    const headers = Object.keys(queryResults[0]).join(",");
    const rows = queryResults.map(row => 
      Object.values(row).map(val => {
        const text = String(val === null ? 'NULL' : val);
        return text.includes(',') ? `"${text}"` : text;
      }).join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sql_agent_result_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter studio dataset based on query results
  const filteredResults = queryResults?.filter(row => 
    Object.values(row).some(val => 
      String(val).toLowerCase().includes(studioSearch.toLowerCase())
    )
  ) || [];

  // WebSocket cursor update trigger
  const handleMouseMove = (e) => {
    if (workspaceTab !== 'warroom' || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    
    wsRef.current.send(JSON.stringify({
      type: 'cursor',
      id: 99, // Current client ID
      name: `You (${role.toUpperCase()})`,
      x: x,
      y: y,
      color: '#4edea3'
    }));
  };

  // Card movement drag transmitter
  const handleCardDrag = (cardId, deltaX, deltaY) => {
    setPinnedCards(prev => {
      const newX = Math.max(0, prev[cardId].x + deltaX);
      const newY = Math.max(0, prev[cardId].y + deltaY);
      
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'card_move',
          cardId: cardId,
          x: newX,
          y: newY
        }));
      }
      return {
        ...prev,
        [cardId]: { x: newX, y: newY }
      };
    });
  };

  const handleStartDrag = (e, cardId) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = pinnedCards[cardId].x;
    const initialY = pinnedCards[cardId].y;

    const handleMouseDrag = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      handleCardDrag(cardId, deltaX, deltaY);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseDrag);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseDrag);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="h-screen w-screen flex bg-[#020617] text-[#dae2fd] overflow-hidden select-none font-sans">
      
      {/* 1. Left Slim Navigation Sidebar */}
      <aside className="w-20 bg-[#0b1326]/60 border-r border-white/5 flex flex-col justify-between items-center py-6 shrink-0 z-20">
        <div className="flex flex-col items-center gap-6 w-full">
          {/* Brand Logo CTA */}
          <button 
            onClick={() => setView('landing')} 
            className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary to-secondary flex items-center justify-center cursor-pointer shadow-lg shadow-primary/15 border-none hover:scale-105 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[#020617] font-extrabold text-xl">terminal</span>
          </button>
          
          {/* Tab Navigation List */}
          <div className="flex flex-col gap-3 w-full px-2 mt-4">
            <button
              onClick={() => setWorkspaceTab('console')}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl cursor-pointer border-none transition-all duration-200 group ${
                workspaceTab === 'console'
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-md shadow-primary/5'
                  : 'text-on-surface-variant hover:bg-white/5 hover:text-white'
              }`}
              title="AI Agent Console"
            >
              <span className="material-symbols-outlined text-[22px]">forum</span>
              <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Console</span>
            </button>

            <button
              onClick={() => setWorkspaceTab('studio')}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl cursor-pointer border-none transition-all duration-200 group ${
                workspaceTab === 'studio'
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-md shadow-primary/5'
                  : 'text-on-surface-variant hover:bg-white/5 hover:text-white'
              }`}
              title="Data Studio"
            >
              <span className="material-symbols-outlined text-[22px]">analytics</span>
              <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Studio</span>
            </button>

            <button
              onClick={() => setWorkspaceTab('schema')}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl cursor-pointer border-none transition-all duration-200 group ${
                workspaceTab === 'schema'
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-md shadow-primary/5'
                  : 'text-on-surface-variant hover:bg-white/5 hover:text-white'
              }`}
              title="Schema Explorer"
            >
              <span className="material-symbols-outlined text-[22px]">schema</span>
              <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Schema</span>
            </button>

            <button
              onClick={() => setWorkspaceTab('warroom')}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl cursor-pointer border-none transition-all duration-200 group ${
                workspaceTab === 'warroom'
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-md shadow-primary/5'
                  : 'text-on-surface-variant hover:bg-white/5 hover:text-white'
              }`}
              title="War Room Canvas"
            >
              <span className="material-symbols-outlined text-[22px]">group</span>
              <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">War Room</span>
            </button>
          </div>
        </div>

        {/* Exit Icon */}
        <button
          onClick={() => setView('landing')}
          className="p-3 text-on-surface-variant hover:text-red-400 transition-colors cursor-pointer bg-transparent border-none"
          title="Exit Workspace"
        >
          <span className="material-symbols-outlined text-[22px]">logout</span>
        </button>
      </aside>

      {/* 2. Main Workspace Layout */}
      <div className="flex-grow flex flex-col overflow-hidden relative">
        
        {/* Workspace Top Header Bar */}
        <header className="w-full h-16 bg-[#0b1326]/40 border-b border-white/5 flex justify-between items-center px-6 shrink-0 z-10">
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold uppercase tracking-wider text-white">
              {workspaceTab === 'console' && '💬 Agent Chat Console'}
              {workspaceTab === 'studio' && '📊 Data Studio Visuals'}
              {workspaceTab === 'schema' && '🗄️ Database Introspection'}
              {workspaceTab === 'warroom' && '🤝 Collaborative War Room'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#131b2e] border border-white/5 select-none">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
              <span>sqlite: <code className="text-secondary font-mono">chinook.db</code></span>
            </div>
          </div>
        </header>

        {/* Workspace Active Views Render Window */}
        <div className="flex-grow p-6 overflow-hidden bg-[#020617]">
          
          {/* VIEW A: Agent Console tab */}
          {workspaceTab === 'console' && (
            <div className="h-full w-full grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
              
              {/* Left Pane: Scrolling agent thought logs */}
              <div className="glass-card rounded-2xl flex flex-col h-full overflow-hidden border border-white/5 bg-[#0b1326]/20">
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-secondary flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">psychology</span>
                    LangGraph Thought Stream
                  </h3>
                  {isExecuting && <span className="material-symbols-outlined text-secondary animate-spin text-sm">sync</span>}
                </div>
                
                {/* Scrolling Logs list */}
                <div className="flex-grow p-5 overflow-y-auto space-y-4 custom-scrollbar text-xs">
                  {logs.length === 0 ? (
                    <div className="text-on-surface-variant/40 italic py-16 text-center select-none">
                      Ready. Submit a question in the prompt bar below to activate the agent.
                    </div>
                  ) : (
                    logs.map((log, idx) => {
                      const bgMap = {
                        success: "bg-secondary/15 border-secondary/20 text-secondary",
                        error: "bg-red-950/40 border-red-500/20 text-red-400",
                        security: "bg-red-950/60 border-red-500/25 text-red-300",
                        info: "bg-primary/10 border-primary/20 text-primary"
                      };
                      const iconMap = {
                        success: "check_circle",
                        error: "cancel",
                        security: "gpp_bad",
                        info: "arrow_right_alt"
                      };
                      return (
                        <div key={idx} className="flex gap-3 items-start animate-fade-in">
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${bgMap[log.type]}`}>
                            <span className="material-symbols-outlined text-[12px]">{iconMap[log.type]}</span>
                          </div>
                          <div className="flex-1 text-on-surface text-[13px] leading-relaxed font-medium">
                            {log.text}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={thoughtLogsEndRef} />
                </div>

                {/* Query Input Bar Block */}
                <div className="p-4 border-t border-white/5 bg-white/[0.01] space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-grow relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-xl blur opacity-10 group-focus-within:opacity-20 transition" />
                      <div className="relative border border-white/10 rounded-xl px-4 py-1.5 flex items-center bg-[#020617] focus-within:border-primary/50 transition">
                        <span className="material-symbols-outlined text-primary/60 text-[20px] mr-2">search</span>
                        <input
                          type="text"
                          value={query}
                          onChange={e => setQuery(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleExecuteQuery()}
                          className="w-full bg-transparent border-none focus:ring-0 text-sm py-2 placeholder-white/20 text-white outline-none"
                          placeholder="Search schemas dynamically using natural language..."
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      {/* Role selection dropdown */}
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#131b2e] border border-white/5 rounded-xl">
                        <span className="material-symbols-outlined text-xs text-[#c3c6d7]">person</span>
                        <select
                          value={role}
                          onChange={e => setRole(e.target.value)}
                          className="bg-transparent border-none focus:ring-0 text-[11px] font-bold uppercase tracking-wider outline-none text-[#dae2fd] cursor-pointer"
                        >
                          <option className="bg-[#0b1326] text-white" value="general">Role: General</option>
                          <option className="bg-[#0b1326] text-white" value="analyst">Role: Analyst</option>
                          <option className="bg-[#0b1326] text-white" value="admin">Role: Admin</option>
                        </select>
                      </div>

                      {/* Execute Button */}
                      <button
                        onClick={handleExecuteQuery}
                        disabled={isExecuting}
                        className="bg-gradient-to-r from-primary to-secondary text-[#020617] font-bold px-5 rounded-xl flex items-center gap-2 hover:shadow-[0_0_15px_rgba(180,197,255,0.25)] hover:scale-[1.02] active:scale-95 transition-all duration-200 cursor-pointer border-none"
                      >
                        <span>Execute</span>
                        <span className="material-symbols-outlined text-[16px] font-extrabold">bolt</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Pane: Compiled SQL code & Executive Narrative */}
              <div className="h-full w-full flex flex-col gap-6 overflow-hidden">
                
                {/* Compiled SQL Block */}
                <div className="glass-card rounded-2xl flex-1 flex flex-col overflow-hidden border border-white/5 bg-[#0b1326]/20">
                  <div className="px-5 py-3 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-[#c3c6d7]">compiled_safe_query.sql</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${
                        securityStatus.includes("VERIFIED") ? "bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/20" :
                        securityStatus.includes("BLOCKED") ? "bg-red-950/40 text-red-400 border-red-500/20 animate-pulse" :
                        "bg-primary/10 text-primary border-primary/20"
                      }`}>
                        {securityStatus}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button onClick={handleExportPPTX} className="text-[#c3c6d7] hover:text-white transition-colors bg-transparent border-none cursor-pointer" title="Export PPTX Presentation">
                        <span className="material-symbols-outlined text-base">present_to_all</span>
                      </button>
                      <button onClick={handleCopySql} className="text-[#c3c6d7] hover:text-white transition-colors bg-transparent border-none cursor-pointer" title="Copy SQL Code">
                        <span className="material-symbols-outlined text-base">content_copy</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Monaco Editor code container */}
                  <div className="flex-grow p-5 monaco-editor overflow-auto custom-scrollbar text-xs font-mono text-[#eeefff] whitespace-pre-wrap">
                    {renderHighlightedSQL(generatedSql)}
                  </div>
                </div>

                {/* Executive Narrative Block */}
                <div className="glass-card rounded-2xl h-[200px] flex flex-col overflow-hidden border border-white/5 bg-[#0b1326]/20 shrink-0">
                  <div className="px-5 py-3 border-b border-white/5 bg-white/[0.01]">
                    <h3 className="text-xs uppercase tracking-wider font-semibold text-tertiary flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">subject</span>
                      Executive Narrative (TL;DR)
                    </h3>
                  </div>
                  <div className="flex-grow p-5 overflow-y-auto custom-scrollbar text-xs sm:text-sm leading-relaxed text-[#c3c6d7]">
                    {executionError ? (
                      <div className="text-red-400 italic font-semibold text-center py-6">
                        Query blocked or syntax error returned. Review compiler trace logs.
                      </div>
                    ) : !narrativeResponse ? (
                      <div className="text-on-surface-variant/40 italic text-center py-6 select-none">
                        Run a successful query to view the narrative report.
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap font-sans text-white leading-relaxed">
                        {narrativeResponse}
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* VIEW B: Data Studio View */}
          {workspaceTab === 'studio' && (
            <div className="h-full w-full grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
              
              {/* Left/Center Column: Results Data Grid */}
              <div className="glass-card rounded-2xl lg:col-span-2 flex flex-col h-full overflow-hidden border border-white/5 bg-[#0b1326]/20">
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01] shrink-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xs uppercase tracking-wider font-semibold text-primary flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">table_chart</span>
                      Tabular Results Grid
                    </h3>
                    <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] px-2 py-0.5 rounded font-bold">
                      {filteredResults.length} Rows
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Search box to filter results table */}
                    <input
                      type="text"
                      placeholder="Filter grid rows..."
                      value={studioSearch}
                      onChange={e => setStudioSearch(e.target.value)}
                      className="bg-[#020617] border border-white/5 text-xs px-2.5 py-1 rounded-lg text-white focus:outline-none placeholder-white/20 outline-none w-32 sm:w-40"
                    />

                    {/* Exporter Buttons */}
                    <button
                      onClick={handleExportExcel}
                      disabled={!queryResults}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">grid_on</span>
                      Excel
                    </button>

                    <button
                      onClick={handleExportPDF}
                      disabled={!queryResults}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#4edea3]/20 bg-[#4edea3]/5 text-[#4edea3] hover:bg-[#4edea3]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                      PDF Report
                    </button>

                    <button
                      onClick={handleDownloadCSV}
                      disabled={!queryResults || queryResults.length === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">download</span>
                      CSV
                    </button>
                  </div>
                </div>

                <div className="flex-grow overflow-auto custom-scrollbar bg-[#020617]/50 h-full relative">
                  {executionError ? (
                    <div className="text-xs text-red-400 italic py-16 text-center font-semibold">
                      Security Policy: Table request aborted due to validation failure.
                    </div>
                  ) : !queryResults ? (
                    <div className="text-xs text-[#c3c6d7]/40 italic py-16 text-center select-none">
                      No dataset loaded. Run a query in the Agent Console to preview results.
                    </div>
                  ) : filteredResults.length === 0 ? (
                    <div className="text-xs text-[#c3c6d7]/40 italic py-16 text-center select-none">
                      No records match the current filter.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-[#131b2e]/60 text-primary uppercase tracking-wider font-bold sticky top-0 z-10 border-b border-white/5">
                        <tr>
                          {Object.keys(queryResults[0]).map(k => (
                            <th key={k} className="px-4 py-3">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-[#eeefff] font-mono">
                        {filteredResults.map((row, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.02] transition-colors border-b border-white/5">
                            {Object.keys(queryResults[0]).map(k => {
                              const val = row[k];
                              const isRedacted = val === "[REDACTED]";
                              return (
                                <td key={k} className={`px-4 py-3 ${isRedacted ? 'text-red-400 font-bold' : ''}`}>
                                  {val === null ? 'NULL' : String(val)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Right Column: Visualizer Chart Canvas */}
              <div className="glass-card rounded-2xl flex flex-col h-full overflow-hidden border border-white/5 bg-[#0b1326]/20">
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01] shrink-0">
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-secondary flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">analytics</span>
                    Dynamic Visualizer
                  </h3>
                  <span className="bg-secondary/15 text-secondary border border-secondary/20 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                    Bar Chart
                  </span>
                </div>
                
                <div className="flex-grow p-6 flex items-center justify-center relative overflow-hidden h-full">
                  <canvas ref={chartRef} id="studio-chart" className="w-full h-full max-h-full"></canvas>
                  {!queryResults && (
                    <div className="absolute text-xs text-[#c3c6d7]/40 italic text-center select-none">
                      Charts plot automatically when numerical keys are found.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* VIEW C: Schema & Glossary View */}
          {workspaceTab === 'schema' && (
            <div className="h-full w-full grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
              
              {/* Left Side: Introspection schema explorer list (Col span 8) */}
              <div className="glass-card rounded-2xl lg:col-span-8 flex flex-col h-full overflow-hidden border border-white/5 bg-[#0b1326]/20">
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01] shrink-0">
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-[#b4c5ff] flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">table_rows</span>
                    SQLite Database Schema Explorer
                  </h3>
                  <button onClick={fetchTables} className="text-[#c3c6d7] hover:text-white transition-colors cursor-pointer bg-transparent border-none">
                    <span className="material-symbols-outlined text-sm">sync</span>
                  </button>
                </div>

                <div className="flex-grow p-6 overflow-y-auto space-y-3 custom-scrollbar h-full bg-[#020617]/25">
                  {tables.length === 0 ? (
                    <div className="text-xs text-on-surface-variant/40 italic py-16 text-center select-none">
                      Connecting and introspection...
                    </div>
                  ) : (
                    tables.map(table => {
                      const isExpanded = expandedTables.has(table);
                      const schema = tableSchemas[table];
                      return (
                        <div key={table} className="border border-white/5 bg-[#0b1326]/40 rounded-xl overflow-hidden">
                          <div 
                            onClick={() => toggleTableExpand(table)}
                            className="flex items-center justify-between p-3.5 hover:bg-white/[0.02] cursor-pointer duration-150 select-none"
                          >
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-[#4edea3] text-[18px]">table_chart</span>
                              <span className="text-xs sm:text-sm font-semibold text-white">{table}</span>
                            </div>
                            <span 
                              className="material-symbols-outlined text-sm text-[#c3c6d7] transition-transform"
                              style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                            >
                              chevron_right
                            </span>
                          </div>

                          {isExpanded && (
                            <div className="bg-[#020617] border-t border-white/5 p-3 space-y-1.5 text-xs font-mono text-[#c3c6d7] divide-y divide-white/[0.02]">
                              {!schema ? (
                                <div className="text-[10px] italic text-[#c3c6d7]/40 px-2 py-1">Loading columns...</div>
                              ) : (
                                schema.columns.map(col => {
                                  const isPK = col.primary_key;
                                  const fk = schema.foreign_keys.find(f => f.constrained_columns.includes(col.name));
                                  return (
                                    <div key={col.name} className="flex items-center px-3 py-2 hover:bg-white/5 rounded transition-all">
                                      <span className="text-white font-medium">{col.name}</span>
                                      <span className="text-[10px] text-white/30 ml-2 font-sans">{col.type}</span>
                                      {isPK && <span className="text-secondary text-[10px] ml-auto font-sans font-bold border border-secondary/20 bg-secondary/5 px-1.5 py-0.5 rounded">🔑 PK</span>}
                                      {fk && <span className="text-primary text-[10px] ml-auto font-sans font-bold border border-primary/20 bg-primary/5 px-1.5 py-0.5 rounded cursor-help" title={`References ${fk.referred_table}`}>🔗 FK</span>}
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
              </div>

              {/* Right Side: Semantic glossary forms (Col span 4) */}
              <div className="glass-card rounded-2xl lg:col-span-4 flex flex-col h-full overflow-hidden border border-white/5 bg-[#0b1326]/20">
                <div className="px-5 py-4 border-b border-white/5 bg-white/[0.01] shrink-0">
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-tertiary flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">book_2</span>
                    Map Vector Glossary
                  </h3>
                </div>

                <div className="p-6 space-y-4">
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Associate fuzzy corporate vocabulary synonyms to exact database columns to assist AI parsing logic (e.g. mapping "sales" to `Invoice.Total`).
                  </p>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-white/40 block mb-1">Synonym Term</label>
                      <input 
                        type="text" 
                        placeholder="e.g. quarterly sales" 
                        value={gTerm}
                        onChange={e => setGTerm(e.target.value)}
                        className="w-full bg-[#020617] border border-white/5 rounded-lg text-xs px-3 py-2 text-white outline-none focus:border-primary/50"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-white/40 block mb-1">Business Definition</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Total price paid on customer invoices" 
                        value={gDef}
                        onChange={e => setGDef(e.target.value)}
                        className="w-full bg-[#020617] border border-white/5 rounded-lg text-xs px-3 py-2 text-white outline-none focus:border-primary/50"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-white/40 block mb-1">SQLite Target Column Hint</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Invoice.Total" 
                        value={gSql}
                        onChange={e => setGSql(e.target.value)}
                        className="w-full bg-[#020617] border border-white/5 rounded-lg text-xs px-3 py-2 text-white outline-none focus:border-primary/50"
                      />
                    </div>

                    <button 
                      onClick={registerGlossary}
                      disabled={isRegisteringGlossary}
                      className="w-full mt-2 bg-gradient-to-r from-primary to-secondary text-[#020617] py-2.5 rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-primary/5 transition-all active:scale-[0.98] border-none cursor-pointer"
                    >
                      {isRegisteringGlossary ? 'Registering...' : 'Register Glossary Term'}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* VIEW D: Collaborative War Room Tab */}
          {workspaceTab === 'warroom' && (
            <div className="h-full w-full flex flex-col overflow-hidden relative rounded-2xl border border-white/5 bg-[#0b1326]/10">
              
              {/* Whiteboard dotted viewport */}
              <div 
                className="flex-grow relative dotted-grid overflow-hidden flex items-center justify-center p-6"
                onMouseMove={handleMouseMove}
              >
                
                {/* Visual grid watermark title */}
                <div className="absolute top-4 left-6 text-left select-none pointer-events-none">
                  <h4 className="text-xs uppercase tracking-widest font-extrabold text-white/30">Shared Board Workspace</h4>
                  <p className="text-[10px] text-white/20 mt-1">Multiplayer cursor coordination active (WebSocket loop simulation)</p>
                </div>

                {/* Multiplayer cursor representations */}
                {cursors.map(c => (
                  <div 
                    key={c.id} 
                    className="absolute pointer-events-none transition-all duration-100 flex gap-1 z-30 select-none"
                    style={{ left: `${c.x}px`, top: `${c.y}px` }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4.5 3V19.5L10.5 13.5H19.5L4.5 3Z" fill={c.color} stroke="white" strokeWidth="1.5"/>
                    </svg>
                    <div 
                      className="text-[8px] font-bold px-1.5 py-0.5 rounded shadow mt-3 whitespace-nowrap text-[#020617]"
                      style={{ backgroundColor: c.color }}
                    >
                      {c.name}
                    </div>
                  </div>
                ))}

                {/* Floating canvas cards representing workspace widgets */}
                <div className="relative w-full h-full max-w-5xl max-h-[500px]">
                  
                  {/* Card A: Compiled Statement card */}
                  <div 
                    className="absolute w-72 p-4 bg-[#0b1326]/85 border border-white/10 rounded-2xl shadow-xl select-none z-10 cursor-move"
                    style={{ left: `${pinnedCards.queryCard.x}px`, top: `${pinnedCards.queryCard.y}px` }}
                    onMouseDown={(e) => handleStartDrag(e, 'queryCard')}
                  >
                    <div className="flex justify-between items-center pb-2 border-b border-white/5 mb-3 text-[10px] uppercase font-bold text-primary">
                      <span>Query Statement</span>
                      <span className="w-2 h-2 rounded-full bg-secondary" />
                    </div>
                    <code className="text-[9px] font-mono text-[#c3c6d7] block leading-relaxed whitespace-pre-wrap">
                      SELECT EmployeeId, FirstName FROM Employee WHERE Title = 'Sales Manager';
                    </code>
                  </div>

                  {/* Card B: static mini-chart visualizer card */}
                  <div 
                    className="absolute w-80 p-4 bg-[#0b1326]/85 border border-[#4edea3]/20 rounded-2xl shadow-xl select-none z-10 cursor-move"
                    style={{ left: `${pinnedCards.chartCard.x}px`, top: `${pinnedCards.chartCard.y}px` }}
                    onMouseDown={(e) => handleStartDrag(e, 'chartCard')}
                  >
                    <div className="flex justify-between items-center pb-2 border-b border-white/5 mb-3 text-[10px] uppercase font-bold text-secondary">
                      <span>Sales Summary Chart</span>
                      <span className="text-[8px] border border-[#4edea3]/30 px-1 rounded">2026</span>
                    </div>
                    <div className="h-24 bg-[#020617] border border-white/5 rounded-lg flex items-end justify-between p-3 gap-2">
                      <div className="w-4 bg-primary/20 h-[30%] rounded-sm" />
                      <div className="w-4 bg-primary/40 h-[60%] rounded-sm" />
                      <div className="w-4 bg-gradient-to-t from-primary to-secondary h-[85%] rounded-sm" />
                      <div className="w-4 bg-primary/50 h-[45%] rounded-sm" />
                    </div>
                  </div>

                  {/* Card C: TLDR narrative brief card */}
                  <div 
                    className="absolute w-80 p-4 bg-[#0b1326]/85 border border-white/10 rounded-2xl shadow-xl select-none z-10 cursor-move"
                    style={{ left: `${pinnedCards.narrativeCard.x}px`, top: `${pinnedCards.narrativeCard.y}px` }}
                    onMouseDown={(e) => handleStartDrag(e, 'narrativeCard')}
                  >
                    <div className="flex justify-between items-center pb-2 border-b border-white/5 mb-3 text-[10px] uppercase font-bold text-tertiary">
                      <span>Executive Brief Card</span>
                      <span className="material-symbols-outlined text-[12px]">subject</span>
                    </div>
                    <p className="text-[10px] text-[#c3c6d7] leading-relaxed">
                      • Customer volume in South America rose by 14% year-over-year.<br/>
                      • Brazil invoices accounts for 63% of the continent sales.<br/>
                      • Top support rep is resolved to Margaret Park.
                    </p>
                  </div>

                  {/* Card D: Collaborative Yellow Sticky Note */}
                  <div 
                    className="absolute w-60 p-4 bg-amber-400/90 text-[#302100] rounded-xl shadow-2xl rotate-2 select-none z-10 hover:rotate-0 transition-transform cursor-move"
                    style={{ left: `${pinnedCards.stickyCard.x}px`, top: `${pinnedCards.stickyCard.y}px` }}
                    onMouseDown={(e) => handleStartDrag(e, 'stickyCard')}
                  >
                    <div className="text-[9px] uppercase font-extrabold opacity-60 tracking-wider mb-2">Team Note</div>
                    <p className="text-[11px] leading-relaxed font-bold font-sans">
                      "I verified the Brazil invoice counts with Sarah. The corrected query is compiled and ready to be exported to the client. Let's get feedback!"
                    </p>
                    <div className="mt-3 text-[8px] font-bold text-right opacity-60">- Mark</div>
                  </div>

                </div>

              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
