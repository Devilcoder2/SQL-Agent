import { useState, useEffect, useRef } from 'react';

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

  const canManageDbs = user?.role === 'admin';

  return (
    <>
      <header className="w-full h-16 bg-surface/50 border-b border-outline-variant flex justify-between items-center px-4 sm:px-6 shrink-0 z-20 backdrop-blur-md">
        {/* Left: Tab Title Indicator */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs sm:text-sm font-bold tracking-wider text-on-surface truncate uppercase flex items-center gap-2">
            {workspaceTab === 'console' && (
              <>
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                💬 Conversation Console
              </>
            )}
            {workspaceTab === 'studio' && (
              <>
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                📊 Data Studio Visuals
              </>
            )}
            {workspaceTab === 'schema' && (
              <>
                <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
                🗄️ Database Introspection
              </>
            )}
            {workspaceTab === 'alerts' && (
              <>
                <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
                🔔 Smoke Detector Alerts
              </>
            )}
            {workspaceTab === 'users' && (
              <>
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                👥 Enterprise Users Dashboard
              </>
            )}
            {workspaceTab === 'databases' && (
              <>
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                🗄️ Connections Management
              </>
            )}
          </span>
        </div>

        {/* Right: User status, database selector, logout */}
        <div className="flex items-center gap-3 sm:gap-4 ml-4 shrink-0">
          
          {/* User Profile Info - Hidden on tiny screens */}
          <div className="hidden xs:flex items-center gap-2.5 bg-surface-dim border border-outline-variant rounded-xl px-3 py-1.5 text-xs select-none">
            <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center text-on-primary font-extrabold uppercase text-[10px]">
              {user?.username ? user.username.substring(0, 2) : "US"}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-on-surface font-bold">{user?.username}</span>
              <span className="text-[9px] text-on-surface-variant font-medium capitalize">
                {user?.tenant_type === 'enterprise' ? `${user.enterprise_name} • ` : ''}{user?.role}
              </span>
            </div>
          </div>

          {/* Database Switcher Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 text-[11px] sm:text-xs font-semibold px-3 py-1.5 rounded-xl bg-surface-dim hover:bg-surface-container border border-outline-variant hover:border-outline select-none cursor-pointer text-on-surface-variant hover:text-on-surface transition-all active:scale-[0.98]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
              <span className="max-w-[100px] sm:max-w-[150px] truncate">
                {getEngineType(activeDb.connection_url)}: <code className="text-secondary font-mono font-bold">{activeDb.alias}</code>
              </span>
              <span className="material-symbols-outlined text-[14px] leading-none transition-transform duration-200" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }}>
                keyboard_arrow_down
              </span>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-surface-bright border border-outline rounded-xl shadow-2xl overflow-hidden z-40 animate-fade-in text-left backdrop-blur-xl">
                <div className="px-3.5 py-2.5 border-b border-outline-variant text-[10px] uppercase font-bold text-on-surface-variant tracking-wider bg-surface-dim">
                  Select Connected Database
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-outline-variant custom-scrollbar">
                  {/* Default Chinook */}
                  <div
                    onClick={() => {
                      setActiveDatabaseId("default");
                      setDropdownOpen(false);
                    }}
                    className={`flex items-center justify-between px-3.5 py-3 hover:bg-surface-dim cursor-pointer transition-colors text-xs ${activeDatabaseId === 'default' ? 'bg-primary/10 text-primary border-l-2 border-primary font-bold' : 'text-on-surface-variant'}`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="font-semibold text-on-surface">Default (Chinook)</span>
                      <span className="text-[9px] text-on-surface-variant font-mono truncate">sqlite:///data/chinook.db</span>
                    </div>
                    {activeDatabaseId === 'default' && (
                      <span className="material-symbols-outlined text-xs text-primary shrink-0">check_circle</span>
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
                      className={`flex items-center justify-between px-3.5 py-3 hover:bg-surface-dim cursor-pointer transition-colors text-xs group ${activeDatabaseId === db.id ? 'bg-primary/10 text-primary border-l-2 border-primary font-bold' : 'text-on-surface-variant'}`}
                    >
                      <div className="flex flex-col min-w-0 flex-grow pr-2">
                        <span className="font-semibold text-on-surface truncate">{db.alias}</span>
                        <span className="text-[9px] text-on-surface-variant font-mono truncate">{db.connection_url}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {activeDatabaseId === db.id && (
                          <span className="material-symbols-outlined text-xs text-primary">check_circle</span>
                        )}
                        {canManageDbs && (
                          <button
                            onClick={(e) => handleDeleteDatabase(e, db.id)}
                            className="text-on-surface-variant hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors bg-transparent border-none cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Disconnect Database"
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {canManageDbs && (
                  <div className="p-3 border-t border-outline-variant bg-surface-dim">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        setModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 text-on-primary font-bold py-2 px-3 rounded-lg text-xs transition-all cursor-pointer border-none"
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
            className="bg-surface-dim hover:bg-red-50 text-on-surface-variant hover:text-red-600 border border-outline-variant hover:border-red-200 transition-all cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Connect Database Modal Overlay */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-card w-full max-w-md bg-surface-bright border border-outline rounded-2xl shadow-2xl overflow-hidden animate-scale-in text-left">
            <div className="px-6 py-4.5 border-b border-outline-variant flex justify-between items-center bg-surface-dim">
              <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface flex items-center gap-2">
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
                className="text-on-surface-variant hover:text-on-surface bg-transparent border-none cursor-pointer flex p-1 rounded hover:bg-surface-dim transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleAddDatabase} className="p-6 space-y-5">
              <div className="text-[11px] text-on-surface-variant leading-relaxed bg-primary-container/10 border border-primary/20 rounded-xl p-3.5 flex gap-2.5 items-start">
                <span className="material-symbols-outlined text-primary text-[16px] shrink-0 mt-0.5">info</span>
                <span>
                  <b>Introspection Note:</b> Connecting a new database triggers schema reflection. Tables, columns, and relations will automatically index in the vector store for semantic searches.
                </span>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 leading-relaxed font-mono flex gap-2 items-start">
                  <span className="material-symbols-outlined text-red-600 text-sm shrink-0">warning</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block mb-1.5">Database Alias Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sales Production DB"
                    value={alias}
                    onChange={e => setAlias(e.target.value)}
                    disabled={loading}
                    className="w-full bg-surface-dim border border-outline-variant rounded-xl text-xs px-3.5 py-2.5 text-on-surface outline-none focus:border-primary/50 transition-colors focus:bg-surface-container"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block mb-1.5">Connection URI String</label>
                  <input
                    type="text"
                    required
                    placeholder="postgresql://user:pass@host:5432/db"
                    value={connectionUrl}
                    onChange={e => setConnectionUrl(e.target.value)}
                    disabled={loading}
                    className="w-full bg-surface-dim border border-outline-variant rounded-xl text-xs px-3.5 py-2.5 text-on-surface outline-none focus:border-primary/50 transition-colors focus:bg-surface-container font-mono"
                  />
                  <span className="text-[9px] text-on-surface-variant mt-1.5 block leading-normal">
                    Supported: SQLite (`sqlite:///path/to/db`), PostgreSQL (`postgresql://`), MySQL (`mysql://`).
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setAlias("");
                    setConnectionUrl("");
                    setError(null);
                  }}
                  disabled={loading}
                  className="flex-1 bg-surface-dim hover:bg-surface-container text-on-surface text-xs font-bold py-3 rounded-xl border border-outline-variant cursor-pointer transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary text-on-primary text-xs font-bold py-3 rounded-xl border-none cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
