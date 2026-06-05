import React, { useState } from 'react';

export default function AuthPanel({ onAuthSuccess, setView }) {
  const [authMode, setAuthMode] = useState("login"); // 'login' | 'register'
  const [tenantType, setTenantType] = useState("single"); // 'single' | 'enterprise'
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginEnterpriseName, setLoginEnterpriseName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regEnterpriseName, setRegEnterpriseName] = useState("");
  const [authError, setAuthError] = useState("");

  const handleLogin = async () => {
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setAuthError("Username and password are required.");
      return;
    }
    if (tenantType === 'enterprise' && !loginEnterpriseName.trim()) {
      setAuthError("Enterprise name is required.");
      return;
    }
    setAuthError("");
    try {
      const res = await window.fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
          enterprise_name: tenantType === 'enterprise' ? loginEnterpriseName : null
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Authentication failed.");
      }
      const data = await res.json();
      onAuthSuccess(data.access_token, data.user);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleRegister = async () => {
    if (!regUsername.trim() || !regPassword.trim()) {
      setAuthError("Username and password are required.");
      return;
    }
    if (tenantType === 'enterprise' && !regEnterpriseName.trim()) {
      setAuthError("Enterprise name is required.");
      return;
    }
    setAuthError("");
    try {
      const url = tenantType === 'enterprise' 
        ? "/api/v1/auth/register-enterprise" 
        : "/api/v1/auth/register-single";
      
      const body = tenantType === 'enterprise'
        ? { enterprise_name: regEnterpriseName, username: regUsername, password: regPassword }
        : { username: regUsername, password: regPassword };

      const res = await window.fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Registration failed.");
      }
      
      setLoginUsername(regUsername);
      setLoginPassword(regPassword);
      if (tenantType === 'enterprise') setLoginEnterpriseName(regEnterpriseName);
      setAuthMode("login");
      alert("Registration successful! Please login.");
    } catch (err) {
      setAuthError(err.message);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#020617] text-[#dae2fd] relative overflow-hidden font-sans select-text">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-[30%] right-[-10%] w-[600px] h-[600px] rounded-full bg-secondary/5 blur-[150px] pointer-events-none z-0" />

      <div className="glass-card max-w-md w-full p-8 rounded-3xl border border-white/10 bg-[#0b1326]/60 backdrop-blur-xl shadow-2xl relative z-10 space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
            <span className="material-symbols-outlined text-[#020617] font-extrabold text-2xl">terminal</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">AI SQL Agent Workspace</h2>
          <p className="text-[#c3c6d7]/50 text-xs mt-1">Enterprise-grade secure natural language querying</p>
        </div>

        {/* Mode switch */}
        <div className="grid grid-cols-2 gap-2 bg-[#020617] p-1 rounded-xl border border-white/5">
          <button 
            onClick={() => { setAuthMode('login'); setAuthError(""); }}
            className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border-none ${authMode === 'login' ? 'bg-primary text-[#020617]' : 'bg-transparent text-white/50'}`}
          >
            Sign In
          </button>
          <button 
            onClick={() => { setAuthMode('register'); setAuthError(""); }}
            className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border-none ${authMode === 'register' ? 'bg-primary text-[#020617]' : 'bg-transparent text-white/50'}`}
          >
            Register
          </button>
        </div>

        {/* Tenant Switch */}
        <div className="grid grid-cols-2 gap-2 bg-[#020617]/50 p-1 rounded-xl border border-white/5">
          <button 
            onClick={() => { setTenantType('single'); setAuthError(""); }}
            className={`py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-extrabold transition-all cursor-pointer border-none ${tenantType === 'single' ? 'bg-secondary/15 text-secondary border border-secondary/20' : 'bg-transparent text-white/30'}`}
          >
            Single User
          </button>
          <button 
            onClick={() => { setTenantType('enterprise'); setAuthError(""); }}
            className={`py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-extrabold transition-all cursor-pointer border-none ${tenantType === 'enterprise' ? 'bg-secondary/15 text-secondary border border-secondary/20' : 'bg-transparent text-white/30'}`}
          >
            Enterprise
          </button>
        </div>

        {authError && (
          <div className="p-3 bg-red-950/40 border border-red-500/20 text-red-300 text-xs rounded-lg text-center font-medium">
            {authError}
          </div>
        )}

        {/* Auth forms */}
        <div className="space-y-4">
          {tenantType === 'enterprise' && (
            <div>
              <label className="text-[9px] uppercase font-extrabold text-white/30 block mb-1">Enterprise Name</label>
              <input 
                type="text" 
                value={authMode === 'login' ? loginEnterpriseName : regEnterpriseName}
                onChange={e => authMode === 'login' ? setLoginEnterpriseName(e.target.value) : setRegEnterpriseName(e.target.value)}
                className="w-full bg-[#020617] border border-white/5 rounded-xl text-xs px-3.5 py-2.5 text-white outline-none focus:border-primary/50"
                placeholder="e.g. Acme Corp"
              />
            </div>
          )}

          <div>
            <label className="text-[9px] uppercase font-extrabold text-white/30 block mb-1">Username</label>
            <input 
              type="text" 
              value={authMode === 'login' ? loginUsername : regUsername}
              onChange={e => authMode === 'login' ? setLoginUsername(e.target.value) : setRegUsername(e.target.value)}
              className="w-full bg-[#020617] border border-white/5 rounded-xl text-xs px-3.5 py-2.5 text-white outline-none focus:border-primary/50"
              placeholder="e.g. john_doe"
            />
          </div>

          <div>
            <label className="text-[9px] uppercase font-extrabold text-white/30 block mb-1">Password</label>
            <input 
              type="password" 
              value={authMode === 'login' ? loginPassword : regPassword}
              onChange={e => authMode === 'login' ? setLoginPassword(e.target.value) : setRegPassword(e.target.value)}
              className="w-full bg-[#020617] border border-white/5 rounded-xl text-xs px-3.5 py-2.5 text-white outline-none focus:border-primary/50"
              placeholder="••••••••"
              onKeyDown={e => e.key === 'Enter' && (authMode === 'login' ? handleLogin() : handleRegister())}
            />
          </div>

          <button 
            onClick={authMode === 'login' ? handleLogin : handleRegister}
            className="w-full bg-gradient-to-r from-primary to-secondary text-[#020617] font-extrabold py-3 rounded-xl text-xs hover:shadow-lg hover:shadow-primary/5 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer border-none mt-2"
          >
            {authMode === 'login' ? 'Authenticate Session' : 'Create Account'}
          </button>
        </div>

        <div className="text-center pt-2">
          <button 
            onClick={() => setView('landing')} 
            className="text-[10px] text-white/40 hover:text-white/60 bg-transparent border-none cursor-pointer flex items-center gap-1.5 mx-auto"
          >
            <span className="material-symbols-outlined text-xs">arrow_back</span>
            Back to Landing
          </button>
        </div>
      </div>
    </div>
  );
}
