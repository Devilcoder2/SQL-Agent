import { useState } from 'react';

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
    <div className="h-screen w-screen flex bg-surface text-on-background overflow-hidden font-sans select-text">
      
      {/* Left Side: Visual Experience Sidebar */}
      <aside className="hidden lg:flex lg:w-1/2 mesh-gradient flex-col justify-center items-center relative px-10 overflow-hidden text-left shrink-0">
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[10%] left-[10%] w-64 h-64 border-2 border-white rounded-full"></div>
          <div className="absolute bottom-[20%] right-[15%] w-96 h-96 border border-white rounded-2xl rotate-12"></div>
        </div>

        <div className="relative z-10 max-w-lg text-center flex flex-col items-center">
          <div className="mb-4">
            <span className="inline-flex items-center px-4 py-1.5 bg-white/10 rounded-full text-white text-xs font-semibold uppercase tracking-widest backdrop-blur-sm">
              Self-Healing SQL Engine
            </span>
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-6 leading-tight">
            Talk to your database. Safely and Semantically.
          </h1>
          <p className="text-white/80 text-lg mb-10 leading-relaxed">
            Veridian SQL translates plain English queries into secure execution paths, self-healing database schema errors and redacting sensitive PII dynamically.
          </p>

          {/* Bento Preview Fragment */}
          <div className="bg-white/10 border border-white/20 backdrop-blur-md rounded-2xl p-6 flex items-center gap-4 text-left w-full max-w-md mx-auto hover:bg-white/15 hover:border-white/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>shield_person</span>
            </div>
            <div>
              <div className="text-white font-bold text-base">AST Access Guardrails</div>
              <div className="text-white/70 text-xs leading-normal">Enforcing strict read-only execution and role-based masking by default.</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Right Side: Auth Card */}
      <main className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-10 bg-surface overflow-y-auto">
        <div className="w-full max-w-[440px] space-y-6">
          
          {/* Branding Header */}
          <div className="text-center flex flex-col items-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl primary-gradient-btn text-white mb-4 ambient-shadow overflow-hidden select-none">
              <img 
                alt="Veridian Logo" 
                className="w-10 h-10 object-contain brightness-0 invert" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD4IIl6iWvSVe7jsZjef6rqfaWaItDEOIf_9fHJ6elyCk6Wq4M7oFcjfAyIDkhDnUiWmNqBmwAeDjb1w2AV2-vJnSWKfpplYXEc4TBVZhq7qxeP9C1M9Vi6CSCg33JeZNBOYrmuGbsJ6AzD3ZrriETHHLafhwbSD-0Uq6dgQ7kfrnVIH_BMlRSR0mTAjMYRzI6Nsr0RMl2kkkMSjE0aSpAQB2Mkdqt4Bjl11A5c7nCGK6VIMf1Ef95oDw5Cl6Mtw11NOI6WsKwtdJ8"
              />
            </div>
            <h2 className="text-2xl font-bold text-primary">Veridian Workspace</h2>
            <p className="text-on-surface-variant text-xs mt-1">Enterprise-grade secure natural language querying</p>
          </div>

          {/* Auth Card Content */}
          <div className="bg-white rounded-2xl p-6 lg:p-8 border border-outline-variant/60 shadow-xl relative overflow-hidden">
            
            {/* Mode Toggle */}
            <div className="flex p-1 bg-surface-container-low rounded-xl mb-6 relative select-none">
              <div 
                className="absolute top-1 left-1 h-[calc(100%-8px)] rounded-lg transition-all duration-300 transform primary-gradient-btn"
                style={{
                  width: 'calc(50% - 4px)',
                  transform: authMode === 'register' ? 'translateX(100%)' : 'translateX(0%)'
                }}
              ></div>
              <button 
                onClick={() => { setAuthMode('login'); setAuthError(""); }}
                className={`relative z-10 w-1/2 py-2 text-xs font-bold transition-all duration-200 cursor-pointer border-none bg-transparent ${
                  authMode === 'login' ? 'text-white' : 'text-on-surface-variant'
                }`}
              >
                Sign In
              </button>
              <button 
                onClick={() => { setAuthMode('register'); setAuthError(""); }}
                className={`relative z-10 w-1/2 py-2 text-xs font-bold transition-all duration-200 cursor-pointer border-none bg-transparent ${
                  authMode === 'register' ? 'text-white' : 'text-on-surface-variant'
                }`}
              >
                Register
              </button>
            </div>

            {/* Segmented User Type Toggle */}
            <div className="flex border border-outline-variant/60 rounded-xl overflow-hidden mb-6 select-none">
              <button 
                onClick={() => { setTenantType('single'); setAuthError(""); }}
                className={`flex-1 py-2 text-[10px] uppercase tracking-wider font-bold cursor-pointer border-none transition-all ${
                  tenantType === 'single' 
                    ? 'bg-secondary-container text-on-secondary-container' 
                    : 'bg-transparent text-on-surface-variant/70 hover:bg-surface-container-low'
                }`}
              >
                SINGLE USER
              </button>
              <button 
                onClick={() => { setTenantType('enterprise'); setAuthError(""); }}
                className={`flex-1 py-2 text-[10px] uppercase tracking-wider font-bold cursor-pointer border-none transition-all ${
                  tenantType === 'enterprise' 
                    ? 'bg-secondary-container text-on-secondary-container' 
                    : 'bg-transparent text-on-surface-variant/70 hover:bg-surface-container-low'
                }`}
              >
                ENTERPRISE
              </button>
            </div>

            {authError && (
              <div className="p-3 mb-4 bg-error-container/30 border border-error/20 text-error text-xs rounded-xl text-center font-medium leading-relaxed">
                ⚠️ {authError}
              </div>
            )}

            {/* Forms Container */}
            <div className="space-y-4">
              {tenantType === 'enterprise' && (
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1.5 tracking-wider select-none">Enterprise Name</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-[20px] select-none">domain</span>
                    <input 
                      type="text" 
                      value={authMode === 'login' ? loginEnterpriseName : regEnterpriseName}
                      onChange={e => authMode === 'login' ? setLoginEnterpriseName(e.target.value) : setRegEnterpriseName(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant/60 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-on-surface-variant/30 text-xs text-on-surface"
                      placeholder="e.g. Acme Corp"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1.5 tracking-wider select-none">Username</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-[20px] select-none">person</span>
                  <input 
                    type="text" 
                    value={authMode === 'login' ? loginUsername : regUsername}
                    onChange={e => authMode === 'login' ? setLoginUsername(e.target.value) : setRegUsername(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant/60 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-on-surface-variant/30 text-xs text-on-surface"
                    placeholder="e.g. john_doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1.5 tracking-wider select-none">Password</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-[20px] select-none">lock</span>
                  <input 
                    type="password" 
                    value={authMode === 'login' ? loginPassword : regPassword}
                    onChange={e => authMode === 'login' ? setLoginPassword(e.target.value) : setRegPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant/60 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-on-surface-variant/30 text-xs text-on-surface"
                    placeholder="••••••••"
                    onKeyDown={e => e.key === 'Enter' && (authMode === 'login' ? handleLogin() : handleRegister())}
                  />
                </div>
              </div>

              <button 
                onClick={authMode === 'login' ? handleLogin : handleRegister}
                className="w-full primary-gradient-btn text-white py-3 rounded-xl font-bold text-xs shadow-md active:scale-[0.98] transition-all hover:opacity-95 cursor-pointer border-none mt-2"
              >
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </div>
          </div>

          {/* Navigation Back */}
          <div className="text-center group select-none">
            <button 
              onClick={() => setView('landing')} 
              className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer bg-transparent border-none py-1 px-3"
            >
              <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
              <span className="text-xs font-semibold">Back to Landing</span>
            </button>
          </div>
        </div>
      </main>

    </div>
  );
}
