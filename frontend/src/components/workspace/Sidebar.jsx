import React from 'react';

export default function Sidebar({ workspaceTab, setWorkspaceTab, user, setView }) {
  return (
    <aside className="w-20 bg-[#0b1326]/60 border-r border-white/5 flex flex-col justify-between items-center py-6 shrink-0 z-20">
      <div className="flex flex-col items-center gap-6 w-full">
        {/* Brand Logo CTA */}
        <button 
          onClick={() => setView('landing')} 
          className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary to-secondary flex items-center justify-center cursor-pointer shadow-lg shadow-primary/15 border-none hover:scale-105 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[#020617] font-extrabold text-xl">terminal</span>
        </button>
        
        {/* Tab Navigation List */}
        <div className="flex flex-col gap-3 w-full px-2 mt-4">
          <button
            onClick={() => setWorkspaceTab('console')}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl cursor-pointer border-none transition-all duration-200 group ${
              workspaceTab === 'console'
                ? 'bg-primary/10 text-primary border border-primary/20 shadow-md shadow-primary/5'
                : 'text-on-surface-variant hover:bg-white/5 hover:text-white'
            }`}
            title="AI Agent Console"
          >
            <span className="material-symbols-outlined text-[22px]">forum</span>
            <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Console</span>
          </button>

          <button
            onClick={() => setWorkspaceTab('studio')}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl cursor-pointer border-none transition-all duration-200 group ${
              workspaceTab === 'studio'
                ? 'bg-primary/10 text-primary border border-primary/20 shadow-md shadow-primary/5'
                : 'text-on-surface-variant hover:bg-white/5 hover:text-white'
            }`}
            title="Data Studio"
          >
            <span className="material-symbols-outlined text-[22px]">analytics</span>
            <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Studio</span>
          </button>

          <button
            onClick={() => setWorkspaceTab('dashboard')}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl cursor-pointer border-none transition-all duration-200 group ${
              workspaceTab === 'dashboard'
                ? 'bg-primary/10 text-primary border border-primary/20 shadow-md shadow-primary/5'
                : 'text-on-surface-variant hover:bg-white/5 hover:text-white'
            }`}
            title="Dashboard Workspace"
          >
            <span className="material-symbols-outlined text-[22px]">space_dashboard</span>
            <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Dashboard</span>
          </button>

          {user?.can_view_schema !== false && (
            <button
              onClick={() => setWorkspaceTab('schema')}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl cursor-pointer border-none transition-all duration-200 group ${
                workspaceTab === 'schema'
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-md shadow-primary/5'
                  : 'text-on-surface-variant hover:bg-white/5 hover:text-white'
              }`}
              title="Schema Explorer"
            >
              <span className="material-symbols-outlined text-[22px]">schema</span>
              <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Schema</span>
            </button>
          )}

          {user?.can_view_alerts !== false && (
            <button
              onClick={() => setWorkspaceTab('alerts')}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl cursor-pointer border-none transition-all duration-200 group ${
                workspaceTab === 'alerts'
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-md shadow-primary/5'
                  : 'text-on-surface-variant hover:bg-white/5 hover:text-white'
              }`}
              title="Alerts Manager"
            >
              <span className="material-symbols-outlined text-[22px]">notifications_active</span>
              <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Alerts</span>
            </button>
          )}

          {user?.role === 'admin' && (
            <>
              <button
                onClick={() => setWorkspaceTab('users')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl cursor-pointer border-none transition-all duration-200 group ${
                  workspaceTab === 'users'
                    ? 'bg-primary/10 text-primary border border-primary/20 shadow-md shadow-primary/5'
                    : 'text-on-surface-variant hover:bg-white/5 hover:text-white'
                }`}
                title="Users Dashboard"
              >
                <span className="material-symbols-outlined text-[22px]">group</span>
                <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Users</span>
              </button>

              <button
                onClick={() => setWorkspaceTab('databases')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl cursor-pointer border-none transition-all duration-200 group ${
                  workspaceTab === 'databases'
                    ? 'bg-primary/10 text-primary border border-primary/20 shadow-md shadow-primary/5'
                    : 'text-on-surface-variant hover:bg-white/5 hover:text-white'
                }`}
                title="Database Connections"
              >
                <span className="material-symbols-outlined text-[22px]">database</span>
                <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Databases</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Exit Icon */}
      <button
        onClick={() => setView('landing')}
        className="p-3 text-on-surface-variant hover:text-red-400 transition-colors cursor-pointer bg-transparent border-none"
        title="Exit Workspace"
      >
        <span className="material-symbols-outlined text-[22px]">logout</span>
      </button>
    </aside>
  );
}
