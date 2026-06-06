/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';


export default function UsersTab({ fetch, user }) {
  const [enterpriseUsers, setEnterpriseUsers] = useState([]);
  const [newStaffUsername, setNewStaffUsername] = useState("");
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("general"); // 'general' | 'analyst' | 'admin'
  const [isRegisteringStaff, setIsRegisteringStaff] = useState(false);

  // User DB Access States
  const [permissionUser, setPermissionUser] = useState(null);
  const [userDatabases, setUserDatabases] = useState([]);
  const [loadingUserDatabases, setLoadingUserDatabases] = useState(false);

  const fetchEnterpriseUsers = async () => {
    try {
      const res = await fetch("/api/v1/enterprise/users");
      if (res.ok) {
        const data = await res.json();
        setEnterpriseUsers(data.users || []);
      }
    } catch (err) {
      console.error("Error loading users:", err);
    }
  };

  useEffect(() => {
    fetchEnterpriseUsers();
  }, []);

  const handleCreateEnterpriseUser = async () => {
    if (!newStaffUsername.trim() || !newStaffPassword.trim()) {
      alert("Username and password are required.");
      return;
    }
    setIsRegisteringStaff(true);
    try {
      const res = await fetch("/api/v1/enterprise/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newStaffUsername,
          password: newStaffPassword,
          role: newStaffRole
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to create user.");
      }
      setNewStaffUsername("");
      setNewStaffPassword("");
      alert(`User "${newStaffUsername}" created successfully.`);
      fetchEnterpriseUsers();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsRegisteringStaff(false);
    }
  };

  const handleDeleteEnterpriseUser = async (userId) => {
    if (userId === user?.id) {
      alert("You cannot delete your own administrative account.");
      return;
    }
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await fetch(`/api/v1/enterprise/users/${userId}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to delete user.");
      }
      fetchEnterpriseUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateEnterpriseUserRole = async (userId, newRole) => {
    if (userId === user?.id) {
      alert("You cannot change your own role.");
      return;
    }
    try {
      const res = await fetch(`/api/v1/enterprise/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to update role.");
      }
      fetchEnterpriseUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleTogglePermission = async (userId, field, checked) => {
    const member = enterpriseUsers.find(u => u.id === userId);
    if (!member) return;

    const updatedPermissions = {
      can_view_alerts: field === 'can_view_alerts' ? checked : (member.can_view_alerts !== 0),
      can_view_schema: field === 'can_view_schema' ? checked : (member.can_view_schema !== 0)
    };

    try {
      const res = await fetch(`/api/v1/enterprise/users/${userId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPermissions)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to update permissions.");
      }
      fetchEnterpriseUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const openUserDbModal = async (member) => {
    setPermissionUser(member);
    setLoadingUserDatabases(true);
    try {
      const res = await fetch(`/api/v1/enterprise/users/${member.id}/databases`);
      if (res.ok) {
        const data = await res.json();
        setUserDatabases(data.databases || []);
      }
    } catch (err) {
      console.error("Error fetching user databases:", err);
    } finally {
      setLoadingUserDatabases(false);
    }
  };

  const handleToggleUserDbPermission = async (dbItem, hasAccess) => {
    try {
      const res = await fetch(`/api/v1/enterprise/users/${permissionUser.id}/databases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          database_id: dbItem.id,
          has_access: hasAccess
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to update database permission.");
      }
      setUserDatabases(prev => prev.map(db => db.id === dbItem.id ? { ...db, has_access: hasAccess } : db));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <>
      <div className="h-full w-full grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden select-text text-left">
      
        {/* Left Column: Create user form (Col span 4) */}
        <div className="glass-card rounded-2xl lg:col-span-4 flex flex-col h-full overflow-hidden shrink-0">
          <div className="px-5 py-3.5 border-b border-outline-variant flex items-center justify-between bg-surface-dim/20 shrink-0 select-none">
            <h3 className="text-xs uppercase tracking-wider font-extrabold text-secondary flex items-center gap-2">
              <span className="material-symbols-outlined text-base">person_add</span>
              Add {user?.tenant_type === 'enterprise' ? 'Enterprise' : 'Workspace'} User
            </h3>
          </div>

          <div className="flex-grow p-5 overflow-y-auto space-y-6 custom-scrollbar h-full bg-surface-container-lowest/30 select-none">
            <div className="p-4.5 border border-outline-variant/60 bg-surface rounded-2xl space-y-4">
              <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">New User Credentials</h4>
              
              <div>
                <label className="text-[9px] uppercase font-bold text-on-surface-variant block mb-1.5 tracking-wider">Username</label>
                <input
                  type="text"
                  value={newStaffUsername}
                  onChange={e => setNewStaffUsername(e.target.value)}
                  className="w-full bg-surface border border-outline/30 rounded-xl text-xs px-3.5 py-2.5 text-on-surface outline-none focus:border-primary/50 transition-colors placeholder-on-surface-variant/40"
                  placeholder="e.g. alice_smith"
                />
              </div>

              <div>
                <label className="text-[9px] uppercase font-bold text-on-surface-variant block mb-1.5 tracking-wider">Temporary Password</label>
                <input
                  type="password"
                  value={newStaffPassword}
                  onChange={e => setNewStaffPassword(e.target.value)}
                  className="w-full bg-surface border border-outline/30 rounded-xl text-xs px-3.5 py-2.5 text-on-surface outline-none focus:border-primary/50 transition-colors placeholder-on-surface-variant/40"
                  placeholder="e.g. tempPass123"
                />
              </div>

              <div>
                <label className="text-[9px] uppercase font-bold text-on-surface-variant block mb-1.5 tracking-wider">Clearance Clearance Role</label>
                <select
                  value={newStaffRole}
                  onChange={e => setNewStaffRole(e.target.value)}
                  className="w-full bg-surface border border-outline/30 rounded-xl text-xs py-2.5 px-3 text-on-surface outline-none focus:border-primary/50 cursor-pointer transition-colors"
                >
                  <option value="general">General (Full Masking / Redaction)</option>
                  <option value="analyst">Analyst (Partial Masking)</option>
                  <option value="admin">Admin (Unrestricted Database View)</option>
                </select>
              </div>

              <button
                onClick={handleCreateEnterpriseUser}
                disabled={isRegisteringStaff}
                className="bg-gradient-to-r from-primary to-secondary text-white font-bold px-5 py-2.5 rounded-xl text-xs hover:shadow-lg hover:shadow-primary/10 transition-all cursor-pointer border-none w-full"
              >
                {isRegisteringStaff ? 'Registering...' : 'Add User Account'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: User list & management grid (Col span 8) */}
        <div className="glass-card rounded-2xl lg:col-span-8 flex flex-col h-full overflow-hidden">
          <div className="px-5 py-3.5 border-b border-outline-variant flex items-center justify-between bg-surface-dim/20 shrink-0 select-none">
            <h3 className="text-xs uppercase tracking-wider font-extrabold text-secondary flex items-center gap-2">
              <span className="material-symbols-outlined text-base">manage_accounts</span>
              Workspace Team Members ({enterpriseUsers.length})
            </h3>
          </div>

          <div className="flex-grow p-5 overflow-y-auto custom-scrollbar h-full bg-surface-container-lowest/30 select-none">
            {enterpriseUsers.length === 0 ? (
              <div className="text-xs text-on-surface-variant/40 italic py-16 text-center select-none">Loading team members list...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                {enterpriseUsers.map(member => {
                  const isSelf = member.id === user?.id;
                  const isUserAdmin = member.role === 'admin';
                  const isUserAnalyst = member.role === 'analyst';
                  
                  return (
                    <div key={member.id} className="p-4.5 border border-outline-variant/60 bg-surface rounded-xl flex flex-col justify-between gap-4 text-left hover:border-primary/30 transition-colors">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Profile Letter Avatar */}
                            <div className="w-8 h-8 rounded-lg bg-surface border border-outline/30 text-on-surface font-extrabold flex items-center justify-center uppercase text-xs shrink-0">
                              {member.username.substring(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-on-surface truncate flex items-center gap-1.5">
                                {member.username}
                                {isSelf && (
                                  <span className="bg-surface-container text-on-surface-variant text-[7px] px-1 rounded uppercase tracking-wider font-mono font-bold shrink-0">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-[9px] text-on-surface-variant/40 font-mono mt-0.5">
                                Joined: {member.created_at.split(' ')[0]}
                              </div>
                            </div>
                          </div>
                          
                          {/* Role Select dropdown badges */}
                          <div>
                            <select
                              value={member.role}
                              disabled={isSelf}
                              onChange={e => handleUpdateEnterpriseUserRole(member.id, e.target.value)}
                              className={`bg-surface border rounded-lg text-[9px] font-bold uppercase py-1 px-2.5 outline-none cursor-pointer disabled:opacity-50 ${
                                isUserAdmin ? 'text-error border-error/20 bg-error-container/20' :
                                isUserAnalyst ? 'text-secondary border-secondary/20 bg-secondary-container/20' :
                                'text-primary border-primary/20 bg-primary-container/20'
                              }`}
                            >
                              <option value="general">GENERAL</option>
                              <option value="analyst">ANALYST</option>
                              <option value="admin">ADMIN</option>
                            </select>
                          </div>
                        </div>

                        {/* Permissions checklist */}
                        {!isSelf && !isUserAdmin && (
                          <div className="flex items-center gap-4 py-2 px-3 bg-surface-dim/40 rounded-xl border border-outline-variant/60 text-[10px] text-on-surface-variant">
                            <span className="font-bold uppercase tracking-wider text-[9px] text-on-surface-variant/40 mr-1 select-none">Auth Tabs:</span>
                            <label className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors">
                              <input
                                type="checkbox"
                                checked={member.can_view_alerts !== 0}
                                onChange={(e) => handleTogglePermission(member.id, 'can_view_alerts', e.target.checked)}
                                className="rounded accent-primary border-outline/30 bg-surface w-3 h-3 cursor-pointer"
                              />
                              <span>Alerts</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors">
                              <input
                                type="checkbox"
                                checked={member.can_view_schema !== 0}
                                onChange={(e) => handleTogglePermission(member.id, 'can_view_schema', e.target.checked)}
                                className="rounded accent-primary border-outline/30 bg-surface w-3 h-3 cursor-pointer"
                              />
                              <span>Schema</span>
                            </label>
                          </div>
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between border-t border-outline-variant/60 pt-3 mt-1 shrink-0">
                        <div>
                          {!isSelf && !isUserAdmin ? (
                            <button
                              onClick={() => openUserDbModal(member)}
                              className="text-[10px] text-primary hover:bg-primary/10 bg-primary/5 border border-primary/20 hover:border-primary/35 px-3 py-1.5 rounded-xl cursor-pointer transition-colors flex items-center gap-1"
                              title="Manage Database Permissions"
                            >
                              <span className="material-symbols-outlined text-xs">database</span>
                              DB Access Key
                            </button>
                          ) : (
                            <span className="text-[9px] text-on-surface-variant/20 italic select-none">
                              {isUserAdmin ? "Full schema access" : "Self account"}
                            </span>
                          )}
                        </div>

                        {!isSelf && (
                          <button
                            onClick={() => handleDeleteEnterpriseUser(member.id)}
                            className="text-error hover:bg-error-container bg-error-container/30 border border-error/20 rounded-xl p-1.5 transition-colors cursor-pointer flex items-center"
                            title="Delete User Member"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
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

      {/* User Database Permissions Modal Overlay */}
      {permissionUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1e1b18]/45 backdrop-blur-sm p-4 animate-fade-in text-left">
          <div className="glass-card w-full max-w-md rounded-2xl overflow-hidden animate-scale-in">
            <div className="px-6 py-4.5 border-b border-outline-variant/60 flex justify-between items-center bg-surface-dim/20 select-none">
              <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">database</span>
                Database Access: <span className="text-secondary font-mono text-xs font-bold">{permissionUser.username}</span>
              </h3>
              <button
                onClick={() => {
                  setPermissionUser(null);
                  setUserDatabases([]);
                }}
                className="text-on-surface-variant hover:text-primary bg-transparent border-none cursor-pointer flex p-1 rounded hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4.5">
              <p className="text-[10px] text-on-surface-variant leading-relaxed bg-surface-dim border border-outline-variant/60 rounded-xl p-3 select-none">
                Grant or restrict databases query permissions for this member. Administrators have unrestricted read access automatically.
              </p>

              <div className="max-h-60 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
                {loadingUserDatabases ? (
                  <div className="text-xs text-on-surface-variant/40 italic py-8 text-center flex items-center justify-center gap-1.5">
                    <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                    <span>Querying connections...</span>
                  </div>
                ) : userDatabases.length === 0 ? (
                  <div className="text-xs text-on-surface-variant/40 italic py-8 text-center select-none">No databases configured.</div>
                ) : (
                  userDatabases.map(dbItem => {
                    const isAdmin = permissionUser.role === 'admin';
                    return (
                      <div key={dbItem.id} className="p-3.5 border border-outline-variant/60 bg-surface rounded-xl flex items-center justify-between gap-4 text-xs hover:border-primary/30 transition-colors">
                        <div className="min-w-0">
                          <span className="font-bold text-on-surface truncate block">{dbItem.alias}</span>
                          {dbItem.id === 'default' && (
                            <span className="inline-block bg-surface-container text-on-surface-variant/40 text-[7px] px-1 py-0.5 rounded font-mono uppercase font-bold mt-1">
                              system db
                            </span>
                          )}
                        </div>
                        <div>
                          <input
                            type="checkbox"
                            checked={dbItem.has_access}
                            disabled={isAdmin}
                            onChange={(e) => handleToggleUserDbPermission(dbItem, e.target.checked)}
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
                    setPermissionUser(null);
                    setUserDatabases([]);
                  }}
                  className="w-full bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold py-3 rounded-xl border-none cursor-pointer transition-all active:scale-[0.98] hover:shadow-lg"
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
