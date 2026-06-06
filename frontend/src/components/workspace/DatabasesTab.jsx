/* eslint-disable no-unused-vars */
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
      
        {/* Left Column: Connect new database form (Col span 4) */}
        <div className="glass-card rounded-2xl lg:col-span-4 flex flex-col h-full overflow-hidden shrink-0">
          <div className="px-5 py-3.5 border-b border-outline-variant flex items-center justify-between bg-surface-dim/20 shrink-0 select-none">
            <h3 className="text-xs uppercase tracking-wider font-extrabold text-secondary flex items-center gap-2">
              <span className="material-symbols-outlined text-base">add_box</span>
              Connect Database
            </h3>
          </div>

          <div className="flex-grow p-5 overflow-y-auto space-y-6 custom-scrollbar h-full bg-surface-container-lowest/30 select-none">
            <form onSubmit={handleAddDatabase} className="p-4.5 border border-outline-variant/60 bg-surface rounded-2xl space-y-4">
              <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Database Credentials</h4>
              
              {error && (
                <div className="p-3 bg-error-container/30 border border-error/20 rounded-xl text-xs text-error leading-relaxed font-mono flex gap-2 items-start">
                  <span className="material-symbols-outlined text-error text-sm shrink-0">warning</span>
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="text-[9px] uppercase font-bold text-on-surface-variant block mb-1.5 tracking-wider">Database Alias</label>
                <input
                  type="text"
                  required
                  value={alias}
                  onChange={e => setAlias(e.target.value)}
                  disabled={loading}
                  className="w-full bg-surface border border-outline/30 rounded-xl text-xs px-3.5 py-2.5 text-on-surface outline-none focus:border-primary/50 transition-colors placeholder-on-surface-variant/40"
                  placeholder="e.g. Production Analytics DB"
                />
              </div>

              <div>
                <label className="text-[9px] uppercase font-bold text-on-surface-variant block mb-1.5 tracking-wider">Connection URI String</label>
                <input
                  type="text"
                  required
                  value={connectionUrl}
                  onChange={e => setConnectionUrl(e.target.value)}
                  disabled={loading}
                  className="w-full bg-surface border border-outline/30 rounded-xl text-xs px-3.5 py-2.5 text-on-surface outline-none focus:border-primary/50 transition-colors placeholder-on-surface-variant/40 font-mono"
                  placeholder="postgresql://user:pass@localhost:5432/db"
                />
                <span className="text-[9px] text-on-surface-variant/40 block mt-2 leading-relaxed">
                  Supported: SQLite (`sqlite:///path/to/db`), PostgreSQL (`postgresql://`), MySQL (`mysql://`).
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-primary to-secondary text-white font-bold px-5 py-2.5 rounded-xl text-xs hover:shadow-lg hover:shadow-primary/10 transition-all cursor-pointer border-none w-full flex items-center justify-center gap-2 disabled:opacity-50"
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

        {/* Right Column: Database list & active switch checks (Col span 8) */}
        <div className="glass-card rounded-2xl lg:col-span-8 flex flex-col h-full overflow-hidden">
          <div className="px-5 py-3.5 border-b border-outline-variant flex items-center justify-between bg-surface-dim/20 shrink-0 select-none">
            <h3 className="text-xs uppercase tracking-wider font-extrabold text-secondary flex items-center gap-2">
              <span className="material-symbols-outlined text-base">inventory_2</span>
              Database Connections List ({databases.length})
            </h3>
          </div>

          <div className="flex-grow p-5 overflow-y-auto custom-scrollbar h-full bg-surface-container-lowest/30 select-none">
            {databases.length === 0 ? (
              <div className="text-xs text-on-surface-variant/40 italic py-16 text-center select-none">Loading databases list...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                {databases.map(db => {
                  const isActive = activeDatabaseId === db.id;
                  const isDefault = db.id === 'default';
                  const engineType = getEngineLabel(db.connection_url);
                  const engineIcon = getEngineIcon(db.connection_url);
                  
                  return (
                    <div 
                      key={db.id} 
                      onClick={() => setActiveDatabaseId(db.id)}
                      className={`p-4 border rounded-xl flex flex-col justify-between gap-4 text-left cursor-pointer transition-all duration-200 ${
                        isActive 
                          ? 'border-primary/30 bg-primary/10' 
                          : 'border-outline-variant/60 bg-surface hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isActive 
                            ? 'bg-primary/15 text-primary' 
                            : 'bg-surface-container text-on-surface-variant/70'
                        }`}>
                          <span className="material-symbols-outlined text-lg">{engineIcon}</span>
                        </div>
                        <div className="space-y-0.5 min-w-0 flex-grow">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-on-surface truncate">{db.alias}</span>
                            <span className="bg-surface-container text-on-surface-variant text-[7px] px-1.5 py-0.5 rounded font-mono uppercase font-bold shrink-0">
                              {engineType}
                            </span>
                            {isActive && (
                              <span className="bg-primary/10 text-primary text-[7px] px-1.5 py-0.5 rounded font-mono uppercase font-bold shrink-0">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] font-mono text-on-surface-variant/40 truncate max-w-xs">
                            {db.connection_url}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-outline-variant/60 pt-3 mt-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <div>
                          <button
                            onClick={() => openPermissionsModal(db)}
                            className="text-[10px] text-primary hover:bg-primary/10 bg-primary/5 border border-primary/20 hover:border-primary/35 px-3 py-1.5 rounded-xl cursor-pointer transition-colors flex items-center gap-1"
                            title="Manage User Access Permissions"
                          >
                            <span className="material-symbols-outlined text-xs">vpn_key</span>
                            Access Keys
                          </button>
                        </div>
                        
                        {!isDefault ? (
                          <button
                            onClick={() => handleDeleteDatabase(db.id)}
                            className="text-error hover:bg-error-container bg-error-container/30 border border-error/20 rounded-xl p-1.5 transition-colors cursor-pointer flex items-center"
                            title="Disconnect Database Connection"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        ) : (
                          <span className="text-[8px] font-bold text-on-surface-variant/30 select-none px-2 uppercase py-1 border border-outline-variant/60 rounded-lg">
                            system db
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Database User Permissions Modal Overlay */}
      {permissionDb && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1e1b18]/45 backdrop-blur-sm p-4 animate-fade-in text-left">
          <div className="glass-card w-full max-w-md rounded-2xl overflow-hidden animate-scale-in">
            <div className="px-6 py-4.5 border-b border-outline-variant/60 flex justify-between items-center bg-surface-dim/20 select-none">
              <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">security</span>
                Access Control: <code className="text-secondary font-mono text-xs font-bold">{permissionDb.alias}</code>
              </h3>
              <button
                onClick={() => {
                  setPermissionDb(null);
                  setPermissionUsers([]);
                }}
                className="text-on-surface-variant hover:text-primary bg-transparent border-none cursor-pointer flex p-1 rounded hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4.5">
              <p className="text-[10px] text-on-surface-variant leading-relaxed bg-surface-dim border border-outline-variant/60 rounded-xl p-3 select-none">
                Grant or revoke database query permissions for users. Administrators automatically have full access to all connected databases.
              </p>

              <div className="max-h-60 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
                {loadingPermissions ? (
                  <div className="text-xs text-on-surface-variant/40 italic py-8 text-center flex items-center justify-center gap-1.5">
                    <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                    <span>Loading permissions...</span>
                  </div>
                ) : permissionUsers.length === 0 ? (
                  <div className="text-xs text-on-surface-variant/40 italic py-8 text-center select-none">No other users found.</div>
                ) : (
                  permissionUsers.map(userItem => {
                    const isAdmin = userItem.role === 'admin';
                    const isAnalyst = userItem.role === 'analyst';
                    return (
                      <div key={userItem.id} className="p-3.5 border border-outline-variant/60 bg-surface rounded-xl flex items-center justify-between gap-4 text-xs hover:border-primary/30 transition-colors">
                        <div className="min-w-0">
                          <span className="font-bold text-on-surface block truncate">{userItem.username}</span>
                          <span className={`inline-block mt-1 text-[7px] px-1.5 py-0.5 rounded font-mono uppercase font-bold border ${
                            isAdmin ? 'text-error border-error/20 bg-error-container/20' :
                            isAnalyst ? 'text-secondary border-secondary/20 bg-secondary-container/20' :
                            'text-primary border-primary/20 bg-primary-container/20'
                          }`}>
                            {userItem.role}
                          </span>
                        </div>
                        <div>
                          <input
                            type="checkbox"
                            checked={userItem.has_access}
                            disabled={isAdmin}
                            onChange={(e) => handleToggleDbPermission(userItem, e.target.checked)}
                            className="rounded accent-primary border-outline/30 bg-surface w-4 h-4 cursor-pointer disabled:opacity-50"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-2 select-none">
                <button
                  onClick={() => {
                    setPermissionDb(null);
                    setPermissionUsers([]);
                  }}
                  className="w-full bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold py-3 rounded-xl border-none cursor-pointer transition-all active:scale-[0.98]"
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
