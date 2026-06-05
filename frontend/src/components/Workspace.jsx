import React, { useState, useEffect } from 'react';
import Sidebar from './workspace/Sidebar';
import Header from './workspace/Header';
import AuthPanel from './workspace/AuthPanel';
import ConsoleTab from './workspace/ConsoleTab';
import StudioTab from './workspace/StudioTab';
import SchemaTab from './workspace/SchemaTab';
import AlertsTab from './workspace/AlertsTab';
import UsersTab from './workspace/UsersTab';
import DatabasesTab from './workspace/DatabasesTab';

export default function Workspace({ setView }) {
  // Navigation State
  const [workspaceTab, setWorkspaceTab] = useState("console");

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

  // --- Multi-Database Management State ---
  const [activeDatabaseId, setActiveDatabaseId] = useState(() => localStorage.getItem("activeDatabaseId") || "default");
  const [databases, setDatabases] = useState([]);

  // Global authenticated fetch wrapper
  const fetchWrapper = async (url, options = {}) => {
    const headers = options.headers || {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (activeDatabaseId) {
      headers["x-database-id"] = activeDatabaseId;
    }
    return window.fetch(url, { ...options, headers });
  };

  const fetchDatabases = async () => {
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
  };

  useEffect(() => {
    fetchDatabases();
  }, [token, activeDatabaseId]);

  useEffect(() => {
    if (workspaceTab === 'alerts' && user?.can_view_alerts === false) {
      setWorkspaceTab('console');
    }
    if (workspaceTab === 'schema' && user?.can_view_schema === false) {
      setWorkspaceTab('console');
    }
  }, [workspaceTab, user]);

  const handleAuthSuccess = (newToken, newUser) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setRole(newUser.role);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setUser(null);
    setRole("general");
    setWorkspaceTab("console");
  };

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
    <div className="h-screen w-screen flex bg-[#020617] text-[#dae2fd] overflow-hidden select-none font-sans">
      
      {/* 1. Left Slim Sidebar */}
      <Sidebar 
        workspaceTab={workspaceTab} 
        setWorkspaceTab={setWorkspaceTab} 
        user={user} 
        setView={setView} 
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex-grow flex flex-col overflow-hidden relative">
        
        {/* Workspace Top Header Bar */}
        <Header 
          workspaceTab={workspaceTab} 
          user={user} 
          handleLogout={handleLogout}
          activeDatabaseId={activeDatabaseId}
          setActiveDatabaseId={(id) => {
            localStorage.setItem("activeDatabaseId", id);
            setActiveDatabaseId(id);
          }}
          databases={databases}
          fetchDatabases={fetchDatabases}
          fetch={fetchWrapper}
        />

        {/* Workspace Active Views Render Window */}
        <div className="flex-grow p-6 overflow-hidden bg-[#020617]">
          
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
              setWorkspaceTab={setWorkspaceTab}
            />
          )}

          {/* VIEW B: Data Studio View */}
          {workspaceTab === 'studio' && (
            <StudioTab
              fetch={fetchWrapper}
              query={query}
              queryResults={queryResults}
              narrativeResponse={narrativeResponse}
            />
          )}

          {/* VIEW C: Schema & Glossary View */}
          {workspaceTab === 'schema' && user?.can_view_schema !== false && (
            <SchemaTab fetch={fetchWrapper} activeDatabaseId={activeDatabaseId} />
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
