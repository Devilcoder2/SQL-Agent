import { useState } from 'react';

export default function Sidebar({ workspaceTab, setWorkspaceTab, user, setView, handleLogout }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("sidebarCollapsed") === "true";
  });

  const toggleSidebar = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem("sidebarCollapsed", String(nextState));
  };

  const navItems = [
    { id: 'console', label: 'Console', icon: 'forum', title: 'AI Agent Console', visible: true },
    { id: 'studio', label: 'Studio', icon: 'analytics', title: 'Data Studio', visible: true },
    { id: 'dashboard', label: 'Dashboard', icon: 'space_dashboard', title: 'Dashboard Workspace', visible: true },
    { id: 'schema', label: 'Schema', icon: 'schema', title: 'Schema Explorer', visible: user?.can_view_schema !== false },
    { id: 'alerts', label: 'Alerts', icon: 'notifications_active', title: 'Alerts Manager', visible: user?.can_view_alerts !== false },
    { id: 'users', label: 'Users', icon: 'group', title: 'Users Dashboard', visible: user?.role === 'admin' },
    { id: 'databases', label: 'Databases', icon: 'database', title: 'Database Connections', visible: user?.role === 'admin' },
  ];

  return (
    <>
      {/* 1. Desktop Vertical Collapsible Sidebar */}
      <aside 
        className={`hidden md:flex flex-col justify-between items-stretch py-5 shrink-0 z-30 glass-panel border-r border-outline-variant transition-all duration-300 ${
          isCollapsed ? 'w-16' : 'w-52'
        }`}
      >
        <div className="flex flex-col items-stretch gap-6 w-full px-3">
          {/* Brand Logo & Header / Collapse option */}
          <div className={`flex items-center w-full px-2 ${isCollapsed ? 'flex-col gap-4' : 'flex-row justify-between'}`}>
            <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
              <button 
                onClick={() => setView('landing')} 
                className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center cursor-pointer shadow-lg shadow-primary/10 border-none hover:scale-105 active:scale-95 transition-all shrink-0"
                title="Back to Landing Page"
              >
                <span className="material-symbols-outlined text-on-primary font-bold text-xl">database</span>
              </button>
            </div>
            
            <button
              onClick={toggleSidebar}
              className="flex items-center justify-center p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-dim transition-colors cursor-pointer bg-transparent border-none shrink-0"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <span className="material-symbols-outlined text-[18px]">
                {isCollapsed ? "keyboard_double_arrow_right" : "keyboard_double_arrow_left"}
              </span>
            </button>
          </div>

          {/* Navigation Items List */}
          <nav className="flex flex-col gap-2.5 w-full mt-3">
            {navItems.filter(item => item.visible).map(item => {
              const isActive = workspaceTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setWorkspaceTab(item.id)}
                  className={`flex items-center rounded-xl p-2.5 cursor-pointer border-none transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-on-surface-variant hover:bg-surface-dim hover:text-on-surface border border-transparent'
                  } ${isCollapsed ? 'justify-center' : 'justify-start gap-3'}`}
                  title={isCollapsed ? item.title : undefined}
                >
                  <span className={`material-symbols-outlined text-[20px] transition-transform group-hover:scale-105 ${isActive ? 'font-fill' : ''}`}>
                    {item.icon}
                  </span>
                  {!isCollapsed && (
                    <span className="text-xs font-semibold tracking-wide capitalize whitespace-nowrap">
                      {item.label}
                    </span>
                  )}

                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer actions: Logout */}
        <div className="flex flex-col gap-2 px-3">
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={`flex items-center rounded-xl p-2.5 text-on-surface-variant hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer bg-transparent border-none ${
              isCollapsed ? 'justify-center' : 'justify-start gap-3'
            }`}
            title="Logout"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            {!isCollapsed && <span className="text-xs font-semibold">Logout</span>}
          </button>
        </div>
      </aside>

      {/* 2. Mobile Responsive Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/90 backdrop-blur-lg border-t border-outline-variant flex justify-around items-center px-4 z-45">
        {navItems.filter(item => item.visible).slice(0, 5).map(item => {
          const isActive = workspaceTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setWorkspaceTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-3.5 rounded-xl cursor-pointer border-none transition-all duration-200 ${
                isActive 
                  ? 'text-primary bg-primary/10 scale-105' 
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className={`material-symbols-outlined text-[20px] ${isActive ? 'font-fill' : ''}`}>
                {item.icon}
              </span>
              <span className="text-[9px] font-bold mt-1 tracking-wide uppercase">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
