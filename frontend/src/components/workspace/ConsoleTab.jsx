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
  narrativeResponse,
  activeDatabaseId,
  setWorkspaceTab
}) {
  const [query, setQuery] = useState(initialQuery);
  const [role, setRole] = useState(initialRole);
  const [isExecuting, setIsExecuting] = useState(false);
  const [logs, setLogs] = useState([]);
  const [securityStatus, setSecurityStatus] = useState("Unverified");
  const [executionError, setExecutionError] = useState(null);

  // Multi-chat states
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeMessageId, setActiveMessageId] = useState(null);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(true);

  const thoughtLogsEndRef = useRef(null);
  const chatEndRef = useRef(null);

  // Scroll thought logs to bottom during run
  useEffect(() => {
    if (thoughtLogsEndRef.current) {
      thoughtLogsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Scroll chat messages to bottom on list change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isExecuting]);

  // Load chat sessions when database context changes
  useEffect(() => {
    if (activeDatabaseId) {
      setSessions([]);
      setMessages([]);
      setActiveSessionId(null);
      setActiveMessageId(null);
      fetchSessions(activeDatabaseId);
    }
  }, [activeDatabaseId]);

  const fetchSessions = async (dbId = activeDatabaseId) => {
    try {
      const res = await fetch("/api/v1/chats");
      if (res.ok) {
        const data = await res.json();
        const chatList = data.chats || [];
        setSessions(chatList);
        
        if (chatList.length > 0) {
          // Fallback to pick first session if not set or not in current list
          setActiveSessionId(prev => {
            const found = chatList.find(s => s.id === prev);
            const nextId = found ? prev : chatList[0].id;
            fetchMessages(nextId);
            return nextId;
          });
        } else {
          await createSession(dbId);
        }
      }
    } catch (err) {
      console.error("Error loading chat sessions:", err);
    }
  };

  const createSession = async (dbId = activeDatabaseId) => {
    try {
      const res = await fetch("/api/v1/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Chat" })
      });
      if (res.ok) {
        const newSession = await res.json();
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        setMessages([]);
        setActiveMessageId(null);
        
        // Reset parent workspace variables
        onQuerySuccess({
          query: "",
          generatedSql: "",
          queryResults: null,
          narrativeResponse: ""
        });
        setSecurityStatus("Unverified");
        setExecutionError(null);
      }
    } catch (err) {
      console.error("Failed to create chat session:", err);
    }
  };

  const deleteSession = async (sessionId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this chat session?")) return;
    try {
      const res = await fetch(`/api/v1/chats/${sessionId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        const updatedList = sessions.filter(s => s.id !== sessionId);
        setSessions(updatedList);
        
        if (activeSessionId === sessionId) {
          if (updatedList.length > 0) {
            setActiveSessionId(updatedList[0].id);
            await fetchMessages(updatedList[0].id);
          } else {
            await createSession();
          }
        }
      }
    } catch (err) {
      console.error("Failed to delete chat session:", err);
    }
  };

  const fetchMessages = async (sessionId) => {
    try {
      const res = await fetch(`/api/v1/chats/${sessionId}/messages`);
      if (res.ok) {
        const data = await res.json();
        const chatMsgs = data.messages || [];
        setMessages(chatMsgs);
        
        if (chatMsgs.length > 0) {
          const lastMsg = chatMsgs[chatMsgs.length - 1];
          setActiveMessageId(lastMsg.id);
          
          onQuerySuccess({
            query: lastMsg.user_query,
            generatedSql: lastMsg.generated_sql,
            queryResults: lastMsg.query_results,
            narrativeResponse: lastMsg.narrative_response
          });
          
          if (lastMsg.execution_error) {
            if (lastMsg.execution_error.includes("Security Exception")) {
              setSecurityStatus("BLOCKED");
            } else {
              setSecurityStatus("FAILED");
            }
            setExecutionError(lastMsg.execution_error);
          } else {
            setSecurityStatus(lastMsg.generated_sql ? "VERIFIED SELECT" : "Unverified");
            setExecutionError(null);
          }
        } else {
          setActiveMessageId(null);
          onQuerySuccess({
            query: "",
            generatedSql: "",
            queryResults: null,
            narrativeResponse: ""
          });
          setSecurityStatus("Unverified");
          setExecutionError(null);
        }
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  const selectMessage = (msg) => {
    setActiveMessageId(msg.id);
    onQuerySuccess({
      query: msg.user_query,
      generatedSql: msg.generated_sql,
      queryResults: msg.query_results,
      narrativeResponse: msg.narrative_response
    });
    
    if (msg.execution_error) {
      if (msg.execution_error.includes("Security Exception")) {
        setSecurityStatus("BLOCKED");
      } else {
        setSecurityStatus("FAILED");
      }
      setExecutionError(msg.execution_error);
    } else {
      setSecurityStatus(msg.generated_sql ? "VERIFIED SELECT" : "Unverified");
      setExecutionError(null);
    }
  };

  const executeQueryDirectly = async (promptText) => {
    if (!promptText.trim()) return;

    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      alert("No active chat session. Please create a chat session first.");
      return;
    }

    setIsExecuting(true);
    setLogs([]);
    setExecutionError(null);
    setSecurityStatus("Checking AST...");

    // Add temporary visual placeholders
    const tempUserMsg = {
      id: `temp-u-${Date.now()}`,
      user_query: promptText,
      generated_sql: null,
      query_results: [],
      execution_error: null,
      narrative_response: null
    };
    
    const tempAssistantMsg = {
      id: `temp-a-${Date.now()}`,
      user_query: promptText,
      generated_sql: null,
      query_results: [],
      execution_error: null,
      narrative_response: null,
      loading: true
    };
    
    setMessages(prev => [...prev, tempUserMsg, tempAssistantMsg]);

    const logMessage = (text, type = "info") => {
      setLogs(prev => [...prev, { text, type }]);
    };

    logMessage("Semantic Context: Searching vector index for keyword resolutions...", "info");

    try {
      await new Promise(r => setTimeout(r, 400));
      logMessage("Schema Introspection: Isolating relevant tables for query generation...", "success");

      await new Promise(r => setTimeout(r, 400));
      logMessage("SQL Compiler: Translating prompt with Gemini engine...", "info");

      const response = await fetch("/api/v1/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: promptText, role: role, session_id: currentSessionId })
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
      } else if (data.execution_error) {
        logMessage(`SQLite Engine: SQL returned compile failure traceback.`, "error");
        logMessage(`Traceback details: ${data.execution_error}`, "error");
        setSecurityStatus("FAILED");
        setExecutionError(data.execution_error);
      } else {
        logMessage("AST Guardrail: Statement check passed. Verified safe read-only syntax.", "success");
        logMessage(`Database Gateway: Query completed successfully. Formatting dataset...`, "success");
        setSecurityStatus("VERIFIED SELECT");
      }

      // Reload database sessions and messages to swap temp objects with DB rows
      await fetchSessions(activeDatabaseId);
      await fetchMessages(currentSessionId);
      setQuery("");

    } catch (err) {
      logMessage(`System Exception: ${err.message}`, "error");
      setSecurityStatus("SYSTEM ERROR");
      setExecutionError(err.message);
      await fetchMessages(currentSessionId);
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
          query: initialQuery,
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
    <div className="h-full w-full flex overflow-hidden text-left gap-6 animate-fade-in">
      
      {/* 1. Left Chat Sidebar Panel */}
      {chatSidebarOpen && (
        <div className="w-[240px] flex flex-col h-full bg-[#0b1326]/40 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden shrink-0">
          <button
            onClick={() => createSession()}
            className="mx-4 mt-4 mb-2 bg-gradient-to-r from-primary to-secondary text-[#020617] font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(180,197,255,0.25)] hover:scale-[1.02] active:scale-95 transition-all duration-200 cursor-pointer border-none text-xs uppercase tracking-wider shrink-0"
          >
            <span className="material-symbols-outlined text-sm font-extrabold">add</span>
            New Chat
          </button>
          
          <div className="flex-grow overflow-y-auto px-4 py-2 space-y-2 custom-scrollbar">
            {sessions.length === 0 ? (
              <div className="text-[11px] text-[#c3c6d7]/35 italic text-center py-8">
                No chats recorded
              </div>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => {
                    setActiveSessionId(s.id);
                    fetchMessages(s.id);
                  }}
                  className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all duration-200 ${
                    activeSessionId === s.id
                      ? "bg-primary/10 border-primary/20 text-white"
                      : "bg-transparent border-transparent text-[#c3c6d7] hover:bg-white/[0.02] hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden w-full">
                    <span className="material-symbols-outlined text-sm shrink-0">chat_bubble</span>
                    <span className="text-xs font-semibold truncate leading-tight select-none">{s.title || "New Chat"}</span>
                  </div>
                  <button
                    onClick={(e) => deleteSession(s.id, e)}
                    className="text-[#c3c6d7] hover:text-red-400 p-0.5 rounded transition-colors bg-transparent border-none cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
                    title="Delete Chat"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 2. Middle Conversational Pane */}
      <div className="flex-grow flex flex-col h-full overflow-hidden bg-[#0b1326]/20 border border-white/5 rounded-2xl">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01] shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setChatSidebarOpen(!chatSidebarOpen)}
              className="text-[#c3c6d7] hover:text-white transition-colors bg-transparent border-none cursor-pointer flex items-center p-1 rounded hover:bg-white/5"
              title={chatSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <span className="material-symbols-outlined text-xl">
                {chatSidebarOpen ? "menu_open" : "menu"}
              </span>
            </button>
            <h3 className="text-xs uppercase tracking-wider font-semibold text-secondary flex items-center gap-2">
              <span className="material-symbols-outlined text-base">chat</span>
              {sessions.find(s => s.id === activeSessionId)?.title || "Active Session"}
            </h3>
          </div>
          {isExecuting && <span className="material-symbols-outlined text-secondary animate-spin text-sm">sync</span>}
        </div>

        {/* Scrollable messages container */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 custom-scrollbar flex flex-col">
          {messages.length === 0 && !isExecuting ? (
            <div className="flex flex-col items-center justify-center py-12 text-center max-w-sm mx-auto space-y-6 flex-grow">
              <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(180,197,255,0.1)] animate-bounce">
                <span className="material-symbols-outlined text-3xl">dns</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
                  Database: {activeDatabaseId === "default" ? "Chinook Default" : `Connection #${activeDatabaseId}`}
                </h4>
                <p className="text-xs text-[#c3c6d7] leading-relaxed">
                  Start asking analytical questions about your tables. The AI compiler will translate them to safe SQL.
                </p>
              </div>
              <div className="w-full space-y-2 text-left">
                <span className="text-[10px] uppercase font-bold text-[#c3c6d7]/50 tracking-wider">Suggested Prompts</span>
                <div
                  onClick={() => executeQueryDirectly("Who are the top 3 support representatives based on total customer sales?")}
                  className="p-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 rounded-xl cursor-pointer text-xs transition-all text-[#c3c6d7] hover:text-white"
                >
                  Who are the top 3 support representatives based on customer sales?
                </div>
                <div
                  onClick={() => executeQueryDirectly("Which country has the highest invoice totals?")}
                  className="p-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 rounded-xl cursor-pointer text-xs transition-all text-[#c3c6d7] hover:text-white"
                >
                  Which country has the highest invoice totals?
                </div>
                <div
                  onClick={() => executeQueryDirectly("Get a count of tracks in each genre.")}
                  className="p-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 rounded-xl cursor-pointer text-xs transition-all text-[#c3c6d7] hover:text-white"
                >
                  Get a count of tracks in each genre.
                </div>
              </div>
            </div>
          ) : (
            messages.map((m, idx) => {
              if (m.loading) {
                return (
                  <div key={m.id || idx} className="flex flex-col gap-2 max-w-[85%] self-start animate-pulse mb-4">
                    <div className="text-[10px] text-[#c3c6d7]/50 uppercase font-bold tracking-wider flex items-center gap-1.5 pl-1">
                      <span className="material-symbols-outlined text-[12px] animate-spin">sync</span>
                      LangGraph Thought Stream
                    </div>
                    <div className="glass-card border border-white/5 bg-[#0b1326]/40 p-4 rounded-2xl flex flex-col gap-2 max-h-[220px] overflow-y-auto custom-scrollbar">
                      {logs.map((log, lIdx) => {
                        const iconMap = {
                          success: "check_circle",
                          error: "cancel",
                          security: "gpp_bad",
                          info: "arrow_right_alt"
                        };
                        const colorMap = {
                          success: "text-secondary",
                          error: "text-red-400",
                          security: "text-red-300",
                          info: "text-primary"
                        };
                        return (
                          <div key={lIdx} className="flex gap-2 items-start text-[11px] leading-relaxed">
                            <span className={`material-symbols-outlined text-[12px] shrink-0 mt-0.5 ${colorMap[log.type]}`}>
                              {iconMap[log.type]}
                            </span>
                            <span className="text-[#c3c6d7]">{log.text}</span>
                          </div>
                        );
                      })}
                      <div ref={thoughtLogsEndRef} />
                    </div>
                  </div>
                );
              }

              return (
                <div key={m.id} className="flex flex-col gap-3">
                  
                  {/* User Bubble */}
                  <div className="flex justify-end w-full">
                    <div className="bg-[#131b2e] border border-white/5 text-[#dae2fd] text-xs sm:text-sm px-4 py-2.5 rounded-2xl max-w-[80%] rounded-tr-none text-left shadow-sm">
                      {m.user_query}
                    </div>
                  </div>

                  {/* Assistant Response Card */}
                  <div
                    onClick={() => selectMessage(m)}
                    className={`group cursor-pointer p-4 rounded-2xl border transition-all duration-200 max-w-[85%] self-start text-left flex flex-col gap-2.5 ${
                      activeMessageId === m.id
                        ? "bg-[#0b1326]/50 border-primary/30 shadow-[0_0_20px_rgba(180,197,255,0.08)]"
                        : "bg-[#0b1326]/10 border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-on-surface-variant/40 uppercase font-bold tracking-wider select-none">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[13px] text-tertiary">psychology</span>
                        AI Insights
                      </span>
                      {m.execution_error ? (
                        <span className="text-red-400 font-extrabold flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[11px]">gpp_bad</span>
                          Blocked/Failed
                        </span>
                      ) : (
                        <span className="text-secondary font-extrabold flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[11px]">check_circle</span>
                          Verified Query
                        </span>
                      )}
                    </div>

                    <div className="text-xs sm:text-sm text-[#c3c6d7] leading-relaxed">
                      {m.execution_error ? (
                        <div className="text-red-400 font-medium italic">
                          {m.execution_error.includes("Security Exception")
                            ? "AST Guardrail intercepted statement. Restricted write operations or catalog lookup detected."
                            : "Query failed execution on database gateway. Check compiler traceback details."}
                        </div>
                      ) : (
                        renderMarkdown(m.narrative_response)
                      )}
                    </div>

                    {m.generated_sql && !m.execution_error && (
                      <div className="mt-1 flex items-center justify-between pt-2 border-t border-white/5 select-none gap-4">
                        <span className="text-[10px] font-mono text-white/30 truncate flex-1">
                          {m.generated_sql.trim().split('\n')[0]}...
                        </span>
                        
                        <div className="flex gap-2.5 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(m.generated_sql);
                              alert("SQL copied to clipboard!");
                            }}
                            className="text-[10px] font-semibold text-primary hover:text-white transition-colors bg-transparent border-none cursor-pointer flex items-center gap-0.5"
                          >
                            <span className="material-symbols-outlined text-xs">content_copy</span>
                            Copy SQL
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              selectMessage(m);
                              setWorkspaceTab("studio");
                            }}
                            className="text-[10px] font-semibold text-secondary hover:text-white transition-colors bg-transparent border-none cursor-pointer flex items-center gap-0.5"
                          >
                            <span className="material-symbols-outlined text-xs">open_in_new</span>
                            Open Studio
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Query Input Bar Block */}
        <div className="p-4 border-t border-white/5 bg-white/[0.01] space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-grow relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-xl blur opacity-10 group-focus-within:opacity-20 transition" />
              <div className="relative border border-white/10 rounded-xl px-4 py-1.5 flex items-center bg-[#020617] focus-within:border-primary/50 transition">
                <span className="material-symbols-outlined text-primary/60 text-[20px] mr-2">search</span>
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && executeQueryDirectly(query)}
                  className="w-full bg-transparent border-none focus:ring-0 text-sm py-2 placeholder-white/20 text-white outline-none"
                  placeholder="Search schemas dynamically using natural language..."
                />
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              {/* Execute Button */}
              <button
                onClick={() => executeQueryDirectly(query)}
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

      {/* 3. Right Pane: Detail Inspector */}
      <div className="h-full w-[360px] xl:w-[450px] lg:flex flex-col gap-6 overflow-hidden hidden shrink-0">
        
        {/* Compiled SQL Block */}
        <div className="glass-card rounded-2xl flex-grow flex flex-col overflow-hidden border border-white/5 bg-[#0b1326]/20">
          <div className="px-5 py-3 border-b border-white/5 flex justify-between items-center bg-white/[0.01] shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[#c3c6d7]">compiled_safe_query.sql</span>
              <span className={`text-[9px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider shrink-0 ${
                securityStatus.includes("VERIFIED") ? "bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/20" :
                securityStatus.includes("BLOCKED") ? "bg-red-950/40 text-red-400 border-red-500/20 animate-pulse" :
                securityStatus.includes("FAILED") ? "bg-red-950/40 text-red-400 border-red-500/20" :
                "bg-primary/10 text-primary border-primary/20"
              }`}>
                {securityStatus}
              </span>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
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
