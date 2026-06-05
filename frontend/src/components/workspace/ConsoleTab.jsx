import React, { useState, useEffect, useRef } from 'react';

const renderMarkdown = (text) => {
  if (!text) return null;

  const lines = text.split('\n');
  const renderedElements = [];
  let currentList = [];

  const flushList = (key) => {
    if (currentList.length > 0) {
      renderedElements.push(
        <ul key={key} className="list-disc pl-5 mb-3 space-y-1.5">
          {currentList}
        </ul>
      );
      currentList = [];
    }
  };

  const parseInlineStyles = (lineText) => {
    const parts = lineText.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} className="text-white font-extrabold">{part}</strong>;
      }
      return part;
    });
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList(`list-${idx}`);
      return;
    }

    const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      flushList(`list-${idx}`);
      const level = headerMatch[1].length;
      const headerText = headerMatch[2];
      const parsedText = parseInlineStyles(headerText);
      const classes = level === 1 ? "text-lg font-bold text-white mb-2" :
                      level === 2 ? "text-base font-bold text-white mb-2" :
                      "text-sm font-bold text-white mb-1.5";
      const Tag = `h${level}`;
      renderedElements.push(React.createElement(Tag, { key: idx, className: classes }, parsedText));
      return;
    }

    const listMatch = trimmed.match(/^[-*+]\s+(.*)$/);
    if (listMatch) {
      const itemText = listMatch[1];
      const parsedText = parseInlineStyles(itemText);
      currentList.push(<li key={`li-${idx}`} className="text-[#c3c6d7] text-xs sm:text-sm leading-relaxed">{parsedText}</li>);
      return;
    }

    flushList(`list-${idx}`);
    const parsedText = parseInlineStyles(trimmed);
    renderedElements.push(<p key={idx} className="mb-2.5 text-[#c3c6d7] text-xs sm:text-sm leading-relaxed">{parsedText}</p>);
  });

  flushList(`list-final`);
  return <div className="space-y-1 text-left">{renderedElements}</div>;
};

export default function ConsoleTab({
  fetch,
  initialQuery,
  initialRole,
  onQuerySuccess,
  generatedSql,
  narrativeResponse
}) {
  const [query, setQuery] = useState(initialQuery);
  const [role, setRole] = useState(initialRole);
  const [isExecuting, setIsExecuting] = useState(false);
  const [logs, setLogs] = useState([]);
  const [securityStatus, setSecurityStatus] = useState("Unverified");
  const [executionError, setExecutionError] = useState(null);
  
  const thoughtLogsEndRef = useRef(null);

  // Scroll logs to bottom
  useEffect(() => {
    if (thoughtLogsEndRef.current) {
      thoughtLogsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const logMessage = (text, type = "info") => {
    setLogs(prev => [...prev, { text, type }]);
  };

  const handleExecuteQuery = async () => {
    if (!query.trim()) return;

    setIsExecuting(true);
    setLogs([]);
    setExecutionError(null);
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

      // Handle security blocks
      if (data.execution_error && data.execution_error.includes("Security Exception")) {
        logMessage(`AST Guardrail: Destination table modified or metadata query blocked!`, "security");
        logMessage(`Security Intercept: ${data.execution_error}`, "error");
        setSecurityStatus("BLOCKED");
        setExecutionError(data.execution_error);
        onQuerySuccess({
          query,
          generatedSql: data.generated_sql,
          queryResults: null,
          narrativeResponse: ""
        });
        return;
      }

      // Handle raw syntax execution errors
      if (data.execution_error) {
        logMessage(`SQLite Engine: SQL returned compile failure traceback.`, "error");
        logMessage(`Traceback details: ${data.execution_error}`, "error");
        setSecurityStatus("FAILED");
        setExecutionError(data.execution_error);
        onQuerySuccess({
          query,
          generatedSql: data.generated_sql,
          queryResults: null,
          narrativeResponse: ""
        });
        return;
      }

      // Query succeeded
      logMessage("AST Guardrail: Statement check passed. Verified safe read-only syntax.", "success");
      logMessage(`Database Gateway: Query completed successfully. Formatting dataset...`, "success");

      setSecurityStatus("VERIFIED SELECT");
      onQuerySuccess({
        query,
        generatedSql: data.generated_sql,
        queryResults: data.query_results,
        narrativeResponse: data.narrative_response || ""
      });

    } catch (err) {
      logMessage(`System Exception: ${err.message}`, "error");
      setSecurityStatus("SYSTEM ERROR");
      setExecutionError(err.message);
      onQuerySuccess({
        query,
        generatedSql: "",
        queryResults: null,
        narrativeResponse: ""
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopySql = () => {
    if (!generatedSql) return;
    navigator.clipboard.writeText(generatedSql).then(() => {
      alert("SQL code copied to clipboard!");
    });
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

  return (
    <div className="h-full w-full grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden text-left">
      
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
                <div key={idx} className="flex gap-3 items-start animate-fade-in text-left">
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
          
          {/* Code Container */}
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
              <div className="font-sans leading-relaxed">
                {renderMarkdown(narrativeResponse)}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
