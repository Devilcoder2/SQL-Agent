import React, { useState } from 'react';

export default function DatabasesTab({ 
  fetch, 
  activeDatabaseId, 
  setActiveDatabaseId, 
  databases, 
  fetchDatabases 
}) {
  const [alias, setAlias] = useState("");
  const [connectionUrl, setConnectionUrl] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Granular DB user permissions states
  const [permissionDb, setPermissionDb] = useState(null);
  const [permissionUsers, setPermissionUsers] = useState([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

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
      alert(`Database "${alias}" connected successfully and schema indexed!`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDatabase = async (dbId) => {
    if (dbId === 'default') {
      alert("The default database cannot be disconnected.");
      return;
    }
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
      alert("Database disconnected and search index cleared.");
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const openPermissionsModal = async (db) => {
    setPermissionDb(db);
    setLoadingPermissions(true);
    try {
      const res = await fetch(`/api/v1/databases/${db.id}/permissions`);
      if (res.ok) {
        const data = await res.json();
        setPermissionUsers(data.users || []);
      }
    } catch (err) {
      console.error("Error loading db permissions:", err);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handleToggleDbPermission = async (userItem, hasAccess) => {
    try {
      const res = await fetch(`/api/v1/databases/${permissionDb.id}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userItem.id,
          has_access: hasAccess
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to update database permission.");
      }
      setPermissionUsers(prev => prev.map(u => u.id === userItem.id ? { ...u, has_access: hasAccess } : u));
    } catch (err) {
      alert(err.message);
    }
  };

  const getEngineIcon = (url) => {
    if (!url) return "database";
    if (url.startsWith("postgresql://") || url.startsWith("postgres://")) return "dns";
    if (url.startsWith("mysql://")) return "settings_input_component";
    return "database";
  };

  const getEngineLabel = (url) => {
    if (!url) return "SQLite";
    if (url.startsWith("postgresql://") || url.startsWith("postgres://")) return "PostgreSQL";
    if (url.startsWith("mysql://")) return "MySQL";
    return "SQLite";
  };

  return (
    <>
      <div className="h-full w-full grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden select-text text-left">
      
      {/* Left Column: Connect new database form (Col span 5) */}
      <div className="glass-card rounded-2xl lg:col-span-5 flex flex-col h-full overflow-hidden border border-white/5 bg-[#0b1326]/20">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01] shrink-0">
          <h3 className="text-xs uppercase tracking-wider font-semibold text-secondary flex items-center gap-2">
            <span className="material-symbols-outlined text-base">add_box</span>
            Connect Database
          </h3>
        </div>

        <div className="flex-grow p-6 overflow-y-auto space-y-6 custom-scrollbar h-full bg-[#020617]/25">
          <form onSubmit={handleAddDatabase} className="p-5 border border-white/5 bg-[#0b1326]/40 rounded-2xl space-y-4">
            <h4 className="text-xs uppercase tracking-wider font-bold text-white">Database Credentials</h4>
            
            {error && (
              <div className="p-3 bg-red-950/40 border border-red-500/25 rounded-xl text-xs text-red-300 leading-relaxed font-mono">
                ⚠️ {error}
              </div>
            )}

            <div>
              <label className="text-[9px] uppercase font-extrabold text-white/30 block mb-1">Database Alias</label>
              <input
                type="text"
                required
                value={alias}
                onChange={e => setAlias(e.target.value)}
                disabled={loading}
                className="w-full bg-[#020617] border border-white/5 rounded-lg text-xs px-3 py-2 text-white outline-none focus:border-primary/50 transition-colors"
                placeholder="e.g. Production Analytics DB"
              />
            </div>

            <div>
              <label className="text-[9px] uppercase font-extrabold text-white/30 block mb-1">Connection URI String</label>
              <input
                type="text"
                required
                value={connectionUrl}
                onChange={e => setConnectionUrl(e.target.value)}
                disabled={loading}
                className="w-full bg-[#020617] border border-white/5 rounded-lg text-xs px-3 py-2 text-white outline-none focus:border-primary/50 transition-colors font-mono"
                placeholder="e.g. postgresql://user:pass@localhost:5432/db"
              />
              <span className="text-[9px] text-white/30 block mt-1 leading-normal">
                Supported Dialects: SQLite (`sqlite:///path/to/db`), PostgreSQL (`postgresql://`), MySQL (`mysql://`)
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-primary to-secondary text-[#020617] font-bold px-5 py-2.5 rounded-xl text-xs hover:shadow-lg hover:shadow-primary/5 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border-none w-full flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                  Connecting & Reflecting...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">link</span>
                  Test & Connect Database
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Right Column: Database list & active switch checks (Col span 7) */}
      <div className="glass-card rounded-2xl lg:col-span-7 flex flex-col h-full overflow-hidden border border-white/5 bg-[#0b1326]/20">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01] shrink-0">
          <h3 className="text-xs uppercase tracking-wider font-semibold text-secondary flex items-center gap-2">
            <span className="material-symbols-outlined text-base">inventory_2</span>
            Database Connections List ({databases.length})
          </h3>
        </div>

        <div className="flex-grow p-6 overflow-y-auto space-y-4 custom-scrollbar h-full bg-[#020617]/50">
          {databases.length === 0 ? (
            <div className="text-xs text-[#c3c6d7]/30 italic py-12 text-center">Loading databases...</div>
          ) : (
            databases.map(db => {
              const isActive = activeDatabaseId === db.id;
              const isDefault = db.id === 'default';
              const engineType = getEngineLabel(db.connection_url);
              const engineIcon = getEngineIcon(db.connection_url);
              return (
                <div 
                  key={db.id} 
                  onClick={() => setActiveDatabaseId(db.id)}
                  className={`p-4 border rounded-xl flex items-center justify-between gap-4 text-left cursor-pointer transition-all duration-200 ${
                    isActive 
                      ? 'border-primary/20 bg-primary/5 hover:bg-primary/10' 
                      : 'border-white/5 bg-[#0b1326]/30 hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isActive 
                        ? 'bg-primary/15 text-primary' 
                        : 'bg-white/5 text-[#c3c6d7]/70'
                    }`}>
                      <span className="material-symbols-outlined">{engineIcon}</span>
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-white truncate">{db.alias}</span>
                        <span className="bg-white/10 text-white/50 text-[8px] px-1.5 py-0.5 rounded font-mono uppercase font-bold shrink-0">
                          {engineType}
                        </span>
                        {isActive && (
                          <span className="bg-primary/10 text-primary text-[8px] px-1.5 py-0.5 rounded font-mono uppercase font-bold shrink-0">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-[#c3c6d7]/40 truncate max-w-sm sm:max-w-md">
                        {db.connection_url}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => openPermissionsModal(db)}
                      className="text-primary/70 hover:text-primary bg-transparent border-none cursor-pointer flex items-center p-2 rounded-lg hover:bg-primary/10 transition-colors mr-1"
                      title="Manage User Access"
                    >
                      <span className="material-symbols-outlined text-base">vpn_key</span>
                    </button>
                    {!isDefault ? (
                      <button
                        onClick={() => handleDeleteDatabase(db.id)}
                        className="text-red-400/70 hover:text-red-400 bg-transparent border-none cursor-pointer flex items-center p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                        title="Disconnect Database"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    ) : (
                      <span className="text-[9px] font-bold text-white/20 select-none px-2 uppercase py-1">
                        system
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
      
      {/* Database User Permissions Modal Overlay */}
      {permissionDb && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in text-left">
          <div className="glass-card w-full max-w-md bg-[#0b1326]/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">security</span>
                Access Control: <code className="text-secondary font-mono text-xs">{permissionDb.alias}</code>
              </h3>
              <button
                onClick={() => {
                  setPermissionDb(null);
                  setPermissionUsers([]);
                }}
                className="text-[#c3c6d7] hover:text-white bg-transparent border-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-[10px] text-[#c3c6d7]/70 leading-relaxed bg-[#131b2e]/40 border border-white/5 rounded-xl p-3">
                Grant or revoke database query permissions for users. Administrators automatically have full access to all connected databases.
              </p>

              <div className="max-h-60 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
                {loadingPermissions ? (
                  <div className="text-xs text-[#c3c6d7]/30 italic py-6 text-center">Loading permissions...</div>
                ) : permissionUsers.length === 0 ? (
                  <div className="text-xs text-[#c3c6d7]/30 italic py-6 text-center">No other users found.</div>
                ) : (
                  permissionUsers.map(userItem => {
                    const isAdmin = userItem.role === 'admin';
                    return (
                      <div key={userItem.id} className="p-3 border border-white/5 bg-[#0b1326]/40 rounded-xl flex items-center justify-between gap-4 text-xs">
                        <div>
                          <span className="font-extrabold text-white">{userItem.username}</span>
                          <span className={`ml-2 text-[8px] px-1.5 py-0.5 rounded font-mono uppercase font-bold ${isAdmin ? 'bg-secondary/15 text-secondary border border-secondary/20' : 'bg-primary/10 text-primary border border-primary/20'}`}>
                            {userItem.role}
                          </span>
                        </div>
                        <div>
                          <input
                            type="checkbox"
                            checked={userItem.has_access}
                            disabled={isAdmin}
                            onChange={(e) => handleToggleDbPermission(userItem, e.target.checked)}
                            className="rounded accent-primary border-white/10 bg-[#020617] w-4 h-4 cursor-pointer disabled:opacity-50"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    setPermissionDb(null);
                    setPermissionUsers([]);
                  }}
                  className="w-full bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-2.5 rounded-xl border border-white/15 cursor-pointer transition-all active:scale-[0.98]"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
