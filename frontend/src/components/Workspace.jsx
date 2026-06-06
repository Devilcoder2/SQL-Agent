/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import Sidebar from './workspace/Sidebar';
import Header from './workspace/Header';
import AuthPanel from './workspace/AuthPanel';
import ConsoleTab from './workspace/ConsoleTab';
import StudioTab from './workspace/StudioTab';
import SchemaTab from './workspace/SchemaTab';
import AlertsTab from './workspace/AlertsTab';
import UsersTab from './workspace/UsersTab';
import DatabasesTab from './workspace/DatabasesTab';
import DashboardTab from './workspace/DashboardTab';
export default function Workspace({ setView }) {
  // Navigation State
  const [workspaceTab, setWorkspaceTab] = useState(() => localStorage.getItem("workspaceTab") || "console");

  const changeWorkspaceTab = (tab) => {
    localStorage.setItem("workspaceTab", tab);
    setWorkspaceTab(tab);
  };

  // --- Auth Session State ---
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });
  const [role, setRole] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user"));
      return u ? u.role : "general";
    } catch {
      return "general";
    }
  });

  // --- Shared Query State (Persists across tab switching) ---
  const [query, setQuery] = useState("Who are the top 3 support representatives based on total customer sales?");
  const [queryResults, setQueryResults] = useState(null);
  const [generatedSql, setGeneratedSql] = useState("");
  const [narrativeResponse, setNarrativeResponse] = useState("");

  // --- Global Header Search States ---
  const [studioSearch, setStudioSearch] = useState("");
  const [tableSearch, setTableSearch] = useState("");

  // --- Multi-Database Management State ---
  const [activeDatabaseId, setActiveDatabaseId] = useState(() => localStorage.getItem("activeDatabaseId") || "default");
  const [databases, setDatabases] = useState([]);

  // Global authenticated fetch wrapper
  async function fetchWrapper(url, options = {}) {
    const headers = options.headers || {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (activeDatabaseId) {
      headers["x-database-id"] = activeDatabaseId;
    }
    const response = await window.fetch(url, { ...options, headers });
    if (response.status === 401) {
      handleLogout();
    }
    return response;
  }

  async function fetchDatabases() {
    if (!token) return;
    try {
      const res = await fetchWrapper("/api/v1/databases");
      if (res.ok) {
        const data = await res.json();
        setDatabases(data.databases || []);
      }
    } catch (err) {
      console.error("Error loading databases:", err);
    }
  }

  useEffect(() => {
    fetchDatabases();
  }, [token, activeDatabaseId]);

  useEffect(() => {
    if (workspaceTab === 'alerts' && user?.can_view_alerts === false) {
      changeWorkspaceTab('console');
    }
    if (workspaceTab === 'schema' && user?.can_view_schema === false) {
      changeWorkspaceTab('console');
    }
    if ((workspaceTab === 'users' || workspaceTab === 'databases') && user?.role !== 'admin') {
      changeWorkspaceTab('console');
    }
  }, [workspaceTab, user]);

  const handleAuthSuccess = (newToken, newUser) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setRole(newUser.role);
  };

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("workspaceTab");
    setToken("");
    setUser(null);
    setRole("general");
    changeWorkspaceTab("console");
    setView("landing");
  }

  const handleQuerySuccess = (result) => {
    setQuery(result.query);
    setGeneratedSql(result.generatedSql);
    setQueryResults(result.queryResults);
    setNarrativeResponse(result.narrativeResponse);
  };

  // Render Auth Panel if not logged in
  if (!token) {
    return <AuthPanel onAuthSuccess={handleAuthSuccess} setView={setView} />;
  }

  return (
    <div className="h-screen w-screen flex bg-surface text-on-surface overflow-hidden select-none font-sans">
      
      {/* 1. Left Sidebar */}
      <Sidebar 
        workspaceTab={workspaceTab} 
        setWorkspaceTab={changeWorkspaceTab} 
        user={user} 
        setView={setView} 
        handleLogout={handleLogout}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex-grow flex flex-col overflow-hidden relative">
        
        {/* Workspace Top Header Bar */}
        <Header 
          workspaceTab={workspaceTab} 
          user={user} 
          activeDatabaseId={activeDatabaseId}
          setActiveDatabaseId={(id) => {
            localStorage.setItem("activeDatabaseId", id);
            setActiveDatabaseId(id);
          }}
          databases={databases}
          fetchDatabases={fetchDatabases}
          fetch={fetchWrapper}
          studioSearch={studioSearch}
          setStudioSearch={setStudioSearch}
          tableSearch={tableSearch}
          setTableSearch={setTableSearch}
        />

        {/* Workspace Active Views Render Window */}
        <div className="flex-grow p-4 sm:p-6 pb-20 md:pb-6 overflow-hidden bg-surface">
          
          {/* VIEW A: Agent Console tab */}
          {workspaceTab === 'console' && (
            <ConsoleTab
              fetch={fetchWrapper}
              initialQuery={query}
              initialRole={role}
              onQuerySuccess={handleQuerySuccess}
              generatedSql={generatedSql}
              narrativeResponse={narrativeResponse}
              activeDatabaseId={activeDatabaseId}
              setWorkspaceTab={changeWorkspaceTab}
            />
          )}

          {/* VIEW B: Data Studio View */}
          {workspaceTab === 'studio' && (
            <StudioTab
              fetch={fetchWrapper}
              query={query}
              queryResults={queryResults}
              narrativeResponse={narrativeResponse}
              generatedSql={generatedSql}
              studioSearch={studioSearch}
              setStudioSearch={setStudioSearch}
            />
          )}

          {/* VIEW H: Dashboard View */}
          {workspaceTab === 'dashboard' && (
            <DashboardTab
              fetch={fetchWrapper}
              activeDatabaseId={activeDatabaseId}
              setWorkspaceTab={changeWorkspaceTab}
            />
          )}

          {/* VIEW C: Schema & Glossary View */}
          {workspaceTab === 'schema' && user?.can_view_schema !== false && (
            <SchemaTab 
              fetch={fetchWrapper} 
              activeDatabaseId={activeDatabaseId} 
              tableSearch={tableSearch}
              setTableSearch={setTableSearch}
            />
          )}


          {/* VIEW E: Alerts Manager Tab */}
          {workspaceTab === 'alerts' && user?.can_view_alerts !== false && (
            <AlertsTab fetch={fetchWrapper} token={token} activeDatabaseId={activeDatabaseId} />
          )}

          {/* VIEW F: Users Dashboard Tab */}
          {workspaceTab === 'users' && user?.role === 'admin' && (
            <UsersTab fetch={fetchWrapper} user={user} />
          )}

          {/* VIEW G: Databases Dashboard Tab */}
          {workspaceTab === 'databases' && user?.role === 'admin' && (
            <DatabasesTab 
              fetch={fetchWrapper} 
              activeDatabaseId={activeDatabaseId} 
              setActiveDatabaseId={(id) => {
                localStorage.setItem("activeDatabaseId", id);
                setActiveDatabaseId(id);
              }}
              databases={databases}
              fetchDatabases={fetchDatabases}
            />
          )}

        </div>
      </div>
    </div>
  );
}
