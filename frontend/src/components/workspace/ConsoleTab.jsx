/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from 'react';


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
      const classes = level === 1 ? "text-base font-bold text-white mb-2" :
                      level === 2 ? "text-sm font-bold text-white mb-2" :
                      "text-xs font-bold text-white mb-1.5";
      const DynamicTag = `h${level}`;
      renderedElements.push(<DynamicTag key={idx} className={classes}>{parsedText}</DynamicTag>);
      return;
    }

    const listMatch = trimmed.match(/^[-*+]\s+(.*)$/);
    if (listMatch) {
      const itemText = listMatch[1];
      const parsedText = parseInlineStyles(itemText);
      currentList.push(<li key={`li-${idx}`} className="text-on-surface-variant text-xs sm:text-sm leading-relaxed">{parsedText}</li>);
      return;
    }

    flushList(`list-${idx}`);
    const parsedText = parseInlineStyles(trimmed);
    renderedElements.push(<p key={idx} className="mb-2 text-on-surface-variant text-xs sm:text-sm leading-relaxed">{parsedText}</p>);
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
  const [role] = useState(initialRole);
  const [isExecuting, setIsExecuting] = useState(false);
  const [logs, setLogs] = useState([]);
  const [securityStatus, setSecurityStatus] = useState("Unverified");
  // eslint-disable-next-line no-unused-vars
  const [executionError, setExecutionError] = useState(null);

  // Multi-chat states
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeMessageId, setActiveMessageId] = useState(null);
  
  // Draggable Layout States
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);

  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorWidth, setInspectorWidth] = useState(380);
  const [isResizingInspector, setIsResizingInspector] = useState(false);

  // Accordion state for thought logs
  const [thoughtLogsExpanded, setThoughtLogsExpanded] = useState(true);

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

  async function fetchMessages(sessionId) {
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
  }

  async function createSession() {
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
  }

  async function fetchSessions() {
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
          await createSession();
        }
      }
    } catch (err) {
      console.error("Error loading chat sessions:", err);
    }
  }

  async function deleteSession(sessionId, e) {
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
  }

  // Load chat sessions when database context changes
  useEffect(() => {
    if (activeDatabaseId) {
      setSessions([]);
      setMessages([]);
      setActiveSessionId(null);
      setActiveMessageId(null);
      fetchSessions();
    }
  }, [activeDatabaseId]);

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
    setThoughtLogsExpanded(true); // Open thoughts panel when compiling query

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
      await new Promise(r => setTimeout(r, 450));
      logMessage("Schema Introspection: Isolating relevant tables for query generation...", "success");

      await new Promise(r => setTimeout(r, 450));
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
    if (!sqlText) {
      return (
        <div className="text-on-surface-variant/30 italic flex flex-col items-center justify-center h-full select-none gap-2 text-center py-20">
          <span className="material-symbols-outlined text-3xl opacity-40">terminal</span>
          <span>Compiled query statements will be displayed here</span>
        </div>
      );
    }
    
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

    const lines = escaped.split('\n');
    return (
      <div className="font-mono text-[11px] sm:text-xs leading-relaxed select-text flex flex-col h-full bg-[#05070c] py-2 px-1">
        {lines.map((line, idx) => (
          <div key={idx} className="flex hover:bg-white/[0.02] py-0.5 px-1 rounded transition-colors group">
            <span className="w-8 text-on-surface-variant/20 select-none text-right pr-3 font-semibold font-mono text-[10px] sm:text-xs border-r border-white/5 mr-3">
              {idx + 1}
            </span>
            <span className="flex-grow whitespace-pre-wrap text-[#e2e8f0]" dangerouslySetInnerHTML={{ __html: line || " " }} />
          </div>
        ))}
      </div>
    );
  };

  // Draggable Mouse Handlers
  const startResizeSidebar = (e) => {
    e.preventDefault();
    setIsResizingSidebar(true);
    const startX = e.clientX;
    const startW = sidebarWidth;
    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      setSidebarWidth(Math.max(160, Math.min(380, startW + deltaX)));
    };
    const onMouseUp = () => {
      setIsResizingSidebar(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const startResizeInspector = (e) => {
    e.preventDefault();
    setIsResizingInspector(true);
    const startX = e.clientX;
    const startW = inspectorWidth;
    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      setInspectorWidth(Math.max(280, Math.min(650, startW - deltaX)));
    };
    const onMouseUp = () => {
      setIsResizingInspector(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className="h-full w-full flex overflow-hidden text-left gap-0 animate-fade-in relative">
      
      {/* 1. Left Chat Sidebar Panel */}
      {chatSidebarOpen && (
        <div 
          style={{ width: `${sidebarWidth}px` }}
          className="flex flex-col h-full bg-surface border border-outline-variant rounded-2xl overflow-hidden shrink-0 relative"
        >
          <button
            onClick={() => createSession()}
            className="mx-3.5 mt-3.5 mb-2 bg-primary text-on-primary font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 hover:scale-[1.01] active:scale-95 transition-all duration-200 cursor-pointer border-none text-[11px] uppercase tracking-wider shrink-0"
          >
            <span className="material-symbols-outlined text-sm font-extrabold">add</span>
            New Chat
          </button>
          
          <div className="flex-grow overflow-y-auto px-3 py-2 space-y-1.5 custom-scrollbar">
            {sessions.length === 0 ? (
              <div className="text-[10px] text-on-surface-variant/30 italic text-center py-8">
                No chats recorded
              </div>
            ) : (
              sessions.map((s) => {
                const isActive = activeSessionId === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setActiveSessionId(s.id);
                      fetchMessages(s.id);
                    }}
                    className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer border transition-all duration-200 ${
                      isActive
                        ? "bg-primary/10 border-primary/25 text-on-surface font-semibold"
                        : "bg-transparent border-transparent text-on-surface-variant hover:bg-surface-dim hover:text-on-surface"
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden w-full">
                      <span className={`material-symbols-outlined text-xs shrink-0 ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>
                        chat_bubble
                      </span>
                      <span className="text-xs font-semibold truncate leading-tight select-none">{s.title || "New Chat"}</span>
                    </div>
                    <button
                      onClick={(e) => deleteSession(s.id, e)}
                      className="text-on-surface-variant hover:text-red-600 p-0.5 rounded transition-colors bg-transparent border-none cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
                      title="Delete Chat"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Draggable splitter (Left) */}
      {chatSidebarOpen && (
        <div 
          className={`resizer-handle ${isResizingSidebar ? 'is-dragging' : ''}`}
          onMouseDown={startResizeSidebar}
        />
      )}

      {/* 2. Middle Conversational Pane */}
      <div className="flex-grow flex flex-col h-full overflow-hidden bg-surface border border-outline-variant rounded-2xl mx-1.5">
        <div className="px-5 py-3 border-b border-outline-variant flex items-center justify-between bg-surface-dim shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setChatSidebarOpen(!chatSidebarOpen)}
              className="text-on-surface-variant hover:text-on-surface transition-colors bg-transparent border-none cursor-pointer flex items-center p-1 rounded hover:bg-surface-dim"
              title={chatSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <span className="material-symbols-outlined text-xl">
                {chatSidebarOpen ? "left_panel_close" : "left_panel_open"}
              </span>
            </button>
            <h3 className="text-[11px] uppercase tracking-wider font-extrabold text-secondary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">forum</span>
              {sessions.find(s => s.id === activeSessionId)?.title || "Active Session"}
            </h3>
          </div>
          
          <div className="flex items-center gap-3">
            {isExecuting && <span className="material-symbols-outlined text-secondary animate-spin text-sm">sync</span>}
            <button
              onClick={() => setInspectorOpen(!inspectorOpen)}
              className="text-on-surface-variant hover:text-on-surface transition-colors bg-transparent border-none cursor-pointer flex items-center p-1 rounded hover:bg-surface-dim"
              title={inspectorOpen ? "Hide Inspector Pane" : "Show Inspector Pane"}
            >
              <span className="material-symbols-outlined text-xl">
                {inspectorOpen ? "right_panel_close" : "right_panel_open"}
              </span>
            </button>
          </div>
        </div>

        {/* Scrollable messages container */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 custom-scrollbar flex flex-col">
          {messages.length === 0 && !isExecuting ? (
            <div className="flex flex-col items-center justify-center py-10 text-center max-w-sm mx-auto space-y-5 flex-grow animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
                <span className="material-symbols-outlined text-2xl">dns</span>
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-on-surface uppercase tracking-wider mb-1">
                  Database: {activeDatabaseId === "default" ? "Chinook Default" : `Connection #${activeDatabaseId}`}
                </h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Start querying tables using natural language. The AI compiler will translate questions to safe, read-only SQL statements.
                </p>
              </div>
              <div className="w-full space-y-2 text-left">
                <span className="text-[9px] uppercase font-bold text-on-surface-variant/40 tracking-wider">Suggested Prompts</span>
                <div
                  onClick={() => executeQueryDirectly("Who are the top 3 support representatives based on total customer sales?")}
                  className="p-3 bg-surface-dim hover:bg-surface-container border border-outline-variant hover:border-outline rounded-xl cursor-pointer text-xs transition-all text-on-surface-variant hover:text-on-surface"
                >
                  Who are the top 3 support representatives based on customer sales?
                </div>
                <div
                  onClick={() => executeQueryDirectly("Which country has the highest invoice totals?")}
                  className="p-3 bg-surface-dim hover:bg-surface-container border border-outline-variant hover:border-outline rounded-xl cursor-pointer text-xs transition-all text-on-surface-variant hover:text-on-surface"
                >
                  Which country has the highest invoice totals?
                </div>
                <div
                  onClick={() => executeQueryDirectly("Get a count of tracks in each genre.")}
                  className="p-3 bg-surface-dim hover:bg-surface-container border border-outline-variant hover:border-outline rounded-xl cursor-pointer text-xs transition-all text-on-surface-variant hover:text-on-surface"
                >
                  Get a count of tracks in each genre.
                </div>
              </div>
            </div>
          ) : (
            messages.map((m, idx) => {
              if (m.loading) {
                return (
                  <div key={m.id || idx} className="flex flex-col gap-2.5 max-w-[90%] self-start mb-4">
                    <div className="flex items-center justify-between w-full">
                      <div className="text-[10px] text-primary uppercase font-bold tracking-wider flex items-center gap-1.5 pl-1 animate-pulse">
                        <span className="material-symbols-outlined text-[12px] animate-spin">sync</span>
                        LangGraph Thought Stream
                      </div>
                      <button 
                        onClick={() => setThoughtLogsExpanded(!thoughtLogsExpanded)} 
                        className="text-[9px] text-on-surface-variant/40 hover:text-on-surface/60 bg-transparent border-none cursor-pointer flex items-center gap-0.5"
                      >
                        {thoughtLogsExpanded ? "Hide logs" : "Expand logs"}
                        <span className="material-symbols-outlined text-xs">
                          {thoughtLogsExpanded ? "expand_less" : "expand_more"}
                        </span>
                      </button>
                    </div>
                    {thoughtLogsExpanded && (
                      <div className="glass-card border border-outline-variant bg-surface-dim p-4 rounded-2xl flex flex-col gap-2 max-h-[220px] overflow-y-auto custom-scrollbar shadow-inner text-left w-full min-w-[280px] sm:min-w-[450px]">
                        {logs.map((log, lIdx) => {
                          const iconMap = {
                            success: "check_circle",
                            error: "cancel",
                            security: "gpp_bad",
                            info: "subdirectory_arrow_right"
                          };
                          const colorMap = {
                            success: "text-success",
                            error: "text-error",
                            security: "text-amber-600",
                            info: "text-primary"
                          };
                          return (
                            <div key={lIdx} className="flex gap-2 items-start text-[11px] leading-relaxed">
                              <span className={`material-symbols-outlined text-[13px] shrink-0 mt-0.5 ${colorMap[log.type]}`}>
                                {iconMap[log.type]}
                              </span>
                              <span className="text-on-surface-variant font-mono">{log.text}</span>
                            </div>
                          );
                        })}
                        <div ref={thoughtLogsEndRef} />
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div key={m.id} className="flex flex-col gap-3">
                  
                  {/* User Bubble */}
                  <div className="flex justify-end w-full">
                    <div className="bg-primary/10 border border-primary/20 text-on-surface text-xs sm:text-sm px-4 py-2.5 rounded-2xl max-w-[80%] rounded-tr-none text-left shadow-sm">
                      {m.user_query}
                    </div>
                  </div>

                  {/* Assistant Response Card */}
                  <div
                    onClick={() => selectMessage(m)}
                    className={`group cursor-pointer p-4.5 rounded-2xl border transition-all duration-200 max-w-[90%] self-start text-left flex flex-col gap-3 ${
                      activeMessageId === m.id
                        ? "bg-surface border-primary/30 shadow-md"
                        : "bg-transparent border-outline-variant hover:border-outline"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-on-surface-variant/40 uppercase font-bold tracking-wider select-none">
                      <span className="flex items-center gap-1.5 text-primary">
                        <span className="material-symbols-outlined text-[13px]">psychology</span>
                        AI Insights
                      </span>
                      {m.execution_error ? (
                        <span className="text-error font-extrabold flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[12px]">gpp_bad</span>
                          Blocked / Failed
                        </span>
                      ) : (
                        <span className="text-success font-extrabold flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[12px]">check_circle</span>
                          Verified Query
                        </span>
                      )}
                    </div>

                    <div className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                      {m.execution_error ? (
                        <div className="text-error font-semibold italic bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl flex items-start gap-2">
                          <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">error_outline</span>
                          <span>
                            {m.execution_error.includes("Security Exception")
                              ? "AST Guardrail intercepted query. Restricted write actions or database catalog modifications blocked."
                              : "Query execution error occurred on database gateway. Check developer compiler traces."}
                          </span>
                        </div>
                      ) : (
                        renderMarkdown(m.narrative_response)
                      )}
                    </div>

                    {m.generated_sql && !m.execution_error && (
                      <div className="mt-1 flex items-center justify-between pt-2.5 border-t border-outline-variant select-none gap-4">
                        <span className="text-[10px] font-mono text-on-surface-variant/30 truncate flex-1">
                          {m.generated_sql.trim().split('\n')[0]}...
                        </span>
                        
                        <div className="flex gap-3 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(m.generated_sql);
                              alert("SQL copied to clipboard!");
                            }}
                            className="text-[10px] font-bold text-primary hover:text-on-surface transition-colors bg-transparent border-none cursor-pointer flex items-center gap-0.5"
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
                            className="text-[10px] font-bold text-secondary hover:text-on-surface transition-colors bg-transparent border-none cursor-pointer flex items-center gap-0.5"
                          >
                            <span className="material-symbols-outlined text-xs">open_in_new</span>
                            Studio
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
        <div className="p-4 border-t border-outline-variant bg-surface-dim space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-grow relative">
              <div className="relative border border-outline-variant rounded-xl px-4 py-1.5 flex items-center bg-surface-dim focus-within:border-primary/50 transition">
                <span className="material-symbols-outlined text-primary/60 text-[20px] mr-2">search</span>
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && executeQueryDirectly(query)}
                  className="w-full bg-transparent border-none focus:ring-0 text-sm py-2 placeholder-on-surface-variant/40 text-on-surface outline-none"
                  placeholder="Ask database questions in plain English..."
                />
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => executeQueryDirectly(query)}
                disabled={isExecuting}
                className="bg-primary text-on-primary font-bold px-5 rounded-xl flex items-center gap-2 hover:bg-primary/90 hover:scale-[1.01] active:scale-95 transition-all duration-200 cursor-pointer border-none text-xs uppercase tracking-wider"
              >
                <span>Execute</span>
                <span className="material-symbols-outlined text-[16px] font-extrabold">bolt</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Draggable splitter (Right) */}
      {inspectorOpen && (
        <div 
          className={`resizer-handle ${isResizingInspector ? 'is-dragging' : ''}`}
          onMouseDown={startResizeInspector}
        />
      )}

      {/* 3. Right Pane: Detail Inspector */}
      {inspectorOpen && (
        <div 
          style={{ width: `${inspectorWidth}px` }}
          className="h-full flex flex-col gap-4 overflow-hidden shrink-0"
        >
          {/* Compiled SQL Block */}
          <div className="glass-card rounded-2xl flex-grow flex flex-col overflow-hidden border border-outline-variant bg-surface">
            <div className="px-4.5 py-3 border-b border-outline-variant flex justify-between items-center bg-surface-dim shrink-0 select-none">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-[10px] text-on-surface-variant truncate">compiled_query.sql</span>
                <span className={`text-[9px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider shrink-0 ${
                  securityStatus.includes("VERIFIED") ? "bg-success/15 text-success border-success/20" :
                  securityStatus.includes("BLOCKED") ? "bg-error/15 text-error border-error/20 animate-pulse" :
                  securityStatus.includes("FAILED") ? "bg-error/15 text-error border-error/20" :
                  "bg-primary/10 text-primary border-primary/20"
                }`}>
                  {securityStatus}
                </span>
              </div>
              
              <div className="flex items-center gap-2.5 shrink-0 ml-2">
                <button onClick={handleExportPPTX} className="text-on-surface-variant hover:text-on-surface transition-colors bg-transparent border-none cursor-pointer flex p-0.5 rounded hover:bg-surface-dim" title="Export PPTX Deck">
                  <span className="material-symbols-outlined text-base">present_to_all</span>
                </button>
                <button onClick={handleCopySql} className="text-on-surface-variant hover:text-on-surface transition-colors bg-transparent border-none cursor-pointer flex p-0.5 rounded hover:bg-surface-dim" title="Copy SQL Code">
                  <span className="material-symbols-outlined text-base">content_copy</span>
                </button>
              </div>
            </div>
            
            {/* Code Container */}
            <div className="flex-grow monaco-editor overflow-auto custom-scrollbar text-xs whitespace-pre">
              {renderHighlightedSQL(generatedSql)}
            </div>
          </div>



        </div>
      )}

    </div>
  );
}
