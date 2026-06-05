import React, { useState, useEffect, useRef } from 'react';

export default function Header({ 
  workspaceTab, 
  user, 
  handleLogout, 
  activeDatabaseId, 
  setActiveDatabaseId, 
  databases, 
  fetchDatabases, 
  fetch 
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Modal Form State
  const [alias, setAlias] = useState("");
  const [connectionUrl, setConnectionUrl] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const dropdownRef = useRef(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeDb = databases.find(db => db.id === activeDatabaseId) || {
    id: "default",
    alias: "Default (Chinook)",
    connection_url: "sqlite:///data/chinook.db"
  };

  const getEngineType = (url) => {
    if (!url) return "sqlite";
    if (url.startsWith("postgresql://") || url.startsWith("postgres://")) return "postgresql";
    if (url.startsWith("mysql://")) return "mysql";
    if (url.startsWith("sqlite://")) return "sqlite";
    return "database";
  };

  const handleAddDatabase = async (e) => {
    e.preventDefault();
    if (!alias.trim() || !connectionUrl.trim()) {
      setError("Please fill in all database configuration fields.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/v1/databases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alias, connection_url: connectionUrl })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to add database connection.");
      }
      await fetchDatabases();
      setActiveDatabaseId(data.database_id);
      setAlias("");
      setConnectionUrl("");
      setModalOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDatabase = async (e, dbId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to disconnect this database and delete its search indexes?")) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/databases/${dbId}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to disconnect database.");
      }
      await fetchDatabases();
      if (activeDatabaseId === dbId) {
        setActiveDatabaseId("default");
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const canManageDbs = user?.role === 'admin' || user?.tenant_type === 'single';

  return (
    <>
      <header className="w-full h-16 bg-[#0b1326]/40 border-b border-white/5 flex justify-between items-center px-6 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold uppercase tracking-wider text-white">
            {workspaceTab === 'console' && '💬 Agent Chat Console'}
            {workspaceTab === 'studio' && '📊 Data Studio Visuals'}
            {workspaceTab === 'schema' && '🗄️ Database Introspection'}
            {workspaceTab === 'warroom' && '🤝 Collaborative War Room'}
            {workspaceTab === 'alerts' && '🔔 Smoke Detector Alerts'}
            {workspaceTab === 'users' && '👥 Enterprise Users Dashboard'}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* User Profile Info */}
          <div className="flex items-center gap-2.5 bg-[#131b2e]/60 border border-white/5 rounded-xl px-3 py-1.5 text-xs select-none">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-[#020617] font-bold uppercase text-[10px]">
              {user?.username ? user.username.substring(0, 2) : "US"}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-white font-extrabold">{user?.username}</span>
              <span className="text-[9px] text-[#c3c6d7]/50 font-medium capitalize">
                {user?.tenant_type === 'enterprise' ? `${user.enterprise_name} • ` : ''}{user?.role}
              </span>
            </div>
          </div>

          {/* Database Switcher Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#131b2e] hover:bg-[#1a233a] border border-white/5 hover:border-white/10 select-none cursor-pointer text-[#dae2fd] hover:text-white transition-all active:scale-[0.98]"
            >
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span>
                {getEngineType(activeDb.connection_url)}: <code className="text-secondary font-mono">{activeDb.alias}</code>
              </span>
              <span className="material-symbols-outlined text-[14px] leading-none transition-transform" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }}>
                keyboard_arrow_down
              </span>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-[#0d1527] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20 animate-fade-in text-left">
                <div className="px-3 py-2 border-b border-white/5 text-[10px] uppercase font-bold text-white/40">
                  Select Connected Database
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-white/[0.03]">
                  {/* Default Chinook */}
                  <div
                    onClick={() => {
                      setActiveDatabaseId("default");
                      setDropdownOpen(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2.5 hover:bg-white/[0.03] cursor-pointer transition-colors text-xs ${activeDatabaseId === 'default' ? 'bg-primary/5 text-primary' : 'text-[#c3c6d7]'}`}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold truncate">Default (Chinook)</span>
                      <span className="text-[9px] text-[#c3c6d7]/40 font-mono truncate">sqlite:///data/chinook.db</span>
                    </div>
                    {activeDatabaseId === 'default' && (
                      <span className="material-symbols-outlined text-xs text-primary">check_circle</span>
                    )}
                  </div>

                  {/* Custom databases */}
                  {databases.filter(db => db.id !== 'default').map(db => (
                    <div
                      key={db.id}
                      onClick={() => {
                        setActiveDatabaseId(db.id);
                        setDropdownOpen(false);
                      }}
                      className={`flex items-center justify-between px-3 py-2.5 hover:bg-white/[0.03] cursor-pointer transition-colors text-xs group ${activeDatabaseId === db.id ? 'bg-primary/5 text-primary' : 'text-[#c3c6d7]'}`}
                    >
                      <div className="flex flex-col min-w-0 flex-grow">
                        <span className="font-semibold truncate">{db.alias}</span>
                        <span className="text-[9px] text-[#c3c6d7]/40 font-mono truncate">{db.connection_url}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {activeDatabaseId === db.id && (
                          <span className="material-symbols-outlined text-xs text-primary">check_circle</span>
                        )}
                        {canManageDbs && (
                          <button
                            onClick={(e) => handleDeleteDatabase(e, db.id)}
                            className="text-[#c3c6d7]/20 hover:text-red-400 p-0.5 rounded transition-colors bg-transparent border-none cursor-pointer opacity-0 group-hover:opacity-100"
                            title="Disconnect Database"
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {canManageDbs && (
                  <div className="p-2 border-t border-white/5 bg-[#090f1d]/50">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        setModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/5 text-[#020617] font-bold py-1.5 px-3 rounded-lg text-xs transition-all cursor-pointer border-none"
                    >
                      <span className="material-symbols-outlined text-xs">add_circle</span>
                      Connect New Database
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="bg-white/5 hover:bg-white/10 text-[#c3c6d7] hover:text-white border border-white/10 hover:border-white/20 transition-all cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            Logout
          </button>
        </div>
      </header>

      {/* Connect Database Modal Overlay */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-card w-full max-w-md bg-[#0b1326]/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-slide-up text-left">
            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">database</span>
                Connect New Database
              </h3>
              <button
                onClick={() => {
                  setModalOpen(false);
                  setAlias("");
                  setConnectionUrl("");
                  setError(null);
                }}
                className="text-[#c3c6d7] hover:text-white bg-transparent border-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleAddDatabase} className="p-6 space-y-4">
              <p className="text-[11px] text-[#c3c6d7]/70 leading-relaxed bg-[#131b2e]/40 border border-white/5 rounded-xl p-3">
                <b>Introspection Note:</b> Connecting a new schema will trigger introspection. All tables, columns, and relations are automatically indexed in vector store context.
              </p>

              {error && (
                <div className="p-3 bg-red-950/40 border border-red-500/25 rounded-xl text-xs text-red-300 leading-relaxed font-mono">
                  ⚠️ {error}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-white/40 block mb-1">Database Alias Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sales Production DB"
                    value={alias}
                    onChange={e => setAlias(e.target.value)}
                    disabled={loading}
                    className="w-full bg-[#020617] border border-white/5 rounded-lg text-xs px-3 py-2 text-white outline-none focus:border-primary/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-white/40 block mb-1">Connection URI String</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. sqlite:///data/sales.db or postgresql://user:pass@host/db"
                    value={connectionUrl}
                    onChange={e => setConnectionUrl(e.target.value)}
                    disabled={loading}
                    className="w-full bg-[#020617] border border-white/5 rounded-lg text-xs px-3 py-2 text-white outline-none focus:border-primary/50 transition-colors font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setAlias("");
                    setConnectionUrl("");
                    setError(null);
                  }}
                  disabled={loading}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-2.5 rounded-xl border border-white/15 cursor-pointer transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-primary to-secondary text-[#020617] text-xs font-bold py-2.5 rounded-xl border-none cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 hover:shadow-lg hover:shadow-primary/5"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                      Introspecting...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">power</span>
                      Establish Connection
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
