import React, { useState, useEffect } from 'react';

export default function UsersTab({ fetch, user }) {
  const [enterpriseUsers, setEnterpriseUsers] = useState([]);
  const [newStaffUsername, setNewStaffUsername] = useState("");
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("general"); // 'general' | 'analyst' | 'admin'
  const [isRegisteringStaff, setIsRegisteringStaff] = useState(false);

  useEffect(() => {
    fetchEnterpriseUsers();
  }, []);

  const fetchEnterpriseUsers = async () => {
    if (user?.tenant_type !== 'enterprise') return;
    try {
      const res = await fetch("/api/v1/enterprise/users");
      if (res.ok) {
        const data = await res.json();
        setEnterpriseUsers(data.users || []);
      }
    } catch (err) {
      console.error("Error loading enterprise users:", err);
    }
  };

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

  return (
    <div className="h-full w-full grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden select-text text-left">
      
      {/* Left Column: Create user form (Col span 5) */}
      <div className="glass-card rounded-2xl lg:col-span-5 flex flex-col h-full overflow-hidden border border-white/5 bg-[#0b1326]/20">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01] shrink-0">
          <h3 className="text-xs uppercase tracking-wider font-semibold text-secondary flex items-center gap-2">
            <span className="material-symbols-outlined text-base">person_add</span>
            Add Enterprise User
          </h3>
        </div>

        <div className="flex-grow p-6 overflow-y-auto space-y-6 custom-scrollbar h-full bg-[#020617]/25">
          <div className="p-5 border border-white/5 bg-[#0b1326]/40 rounded-2xl space-y-4">
            <h4 className="text-xs uppercase tracking-wider font-bold text-white">New User Account Details</h4>
            
            <div>
              <label className="text-[9px] uppercase font-extrabold text-white/30 block mb-1">Username</label>
              <input
                type="text"
                value={newStaffUsername}
                onChange={e => setNewStaffUsername(e.target.value)}
                className="w-full bg-[#020617] border border-white/5 rounded-lg text-xs px-3 py-2 text-white outline-none focus:border-primary/50"
                placeholder="e.g. alice_smith"
              />
            </div>

            <div>
              <label className="text-[9px] uppercase font-extrabold text-white/30 block mb-1">Temporary Password</label>
              <input
                type="password"
                value={newStaffPassword}
                onChange={e => setNewStaffPassword(e.target.value)}
                className="w-full bg-[#020617] border border-white/5 rounded-lg text-xs px-3 py-2 text-white outline-none focus:border-primary/50"
                placeholder="e.g. tempPass123"
              />
            </div>

            <div>
              <label className="text-[9px] uppercase font-extrabold text-white/30 block mb-1">Clearance Role</label>
              <select
                value={newStaffRole}
                onChange={e => setNewStaffRole(e.target.value)}
                className="w-full bg-[#020617] border border-white/5 rounded-lg text-xs px-3 py-2.5 text-white outline-none focus:border-primary/50"
              >
                <option value="general">General (Full Masking/Redaction)</option>
                <option value="analyst">Analyst (Partial Column Masking)</option>
                <option value="admin">Admin (Unrestricted Database View)</option>
              </select>
            </div>

            <button
              onClick={handleCreateEnterpriseUser}
              disabled={isRegisteringStaff}
              className="bg-gradient-to-r from-primary to-secondary text-[#020617] font-bold px-5 py-2.5 rounded-xl text-xs hover:shadow-lg hover:shadow-primary/5 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border-none w-full"
            >
              {isRegisteringStaff ? 'Registering...' : 'Add User Account'}
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: User list & management grid (Col span 7) */}
      <div className="glass-card rounded-2xl lg:col-span-7 flex flex-col h-full overflow-hidden border border-white/5 bg-[#0b1326]/20">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01] shrink-0">
          <h3 className="text-xs uppercase tracking-wider font-semibold text-secondary flex items-center gap-2">
            <span className="material-symbols-outlined text-base">manage_accounts</span>
            Enterprise Members ({enterpriseUsers.length})
          </h3>
        </div>

        <div className="flex-grow p-6 overflow-y-auto space-y-4 custom-scrollbar h-full bg-[#020617]/50">
          {enterpriseUsers.length === 0 ? (
            <div className="text-xs text-[#c3c6d7]/30 italic py-12 text-center">Loading team members...</div>
          ) : (
            enterpriseUsers.map(member => {
              const isSelf = member.id === user?.id;
              return (
                <div key={member.id} className="p-4 border border-white/5 bg-[#0b1326]/30 rounded-xl flex items-center justify-between gap-4 text-left">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-white">{member.username}</span>
                      {isSelf && (
                        <span className="bg-white/10 text-white/50 text-[8px] px-1.5 py-0.5 rounded font-mono uppercase font-bold">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#c3c6d7]/40 font-mono">
                      Created: {member.created_at}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Role Select dropdown */}
                    <div>
                      <select
                        value={member.role}
                        disabled={isSelf}
                        onChange={e => handleUpdateEnterpriseUserRole(member.id, e.target.value)}
                        className={`bg-[#020617] border border-white/5 rounded text-[10px] font-bold uppercase py-1 px-2 text-white outline-none cursor-pointer disabled:opacity-50 ${
                          member.role === 'admin' ? 'text-secondary border-secondary/20 bg-secondary/5' :
                          member.role === 'analyst' ? 'text-tertiary border-tertiary/20 bg-tertiary/5' :
                          'text-primary border-primary/20 bg-primary/5'
                        }`}
                      >
                        <option value="general">GENERAL</option>
                        <option value="analyst">ANALYST</option>
                        <option value="admin">ADMIN</option>
                      </select>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDeleteEnterpriseUser(member.id)}
                      disabled={isSelf}
                      className="text-red-400/70 hover:text-red-400 disabled:opacity-30 bg-transparent border-none cursor-pointer flex items-center p-1 transition-colors"
                      title="Delete Member"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
