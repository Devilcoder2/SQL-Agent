import React from 'react';

export default function Header({ workspaceTab, user, handleLogout }) {
  return (
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

        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#131b2e] border border-white/5 select-none">
          <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
          <span>sqlite: <code className="text-secondary font-mono">chinook.db</code></span>
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
  );
}
