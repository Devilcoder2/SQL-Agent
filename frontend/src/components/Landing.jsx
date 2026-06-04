import React, { useState } from 'react';

export default function Landing({ setView }) {
  // Sandbox Simulator State
  const [activeRole, setActiveRole] = useState('general'); // 'general' | 'analyst' | 'admin'
  const [activeQueryType, setActiveQueryType] = useState('read'); // 'read' | 'write'

  // Simulator Data Mapping
  const simulatorData = {
    read: {
      query: "SELECT CustomerId, FirstName, LastName, Email, Phone FROM Customer WHERE Country = 'Brazil';",
      astPassed: true,
      astMessage: "AST Safety Check Passed: Read-Only Query Enforced",
      results: {
        admin: [
          { id: 1, first: "Luís", last: "Gonçalves", email: "luisg@embraer.com.br", phone: "+55 (12) 3923-5555" },
          { id: 10, first: "Eduardo", last: "Martins", email: "eduardo@embraer.com.br", phone: "+55 (11) 3033-5432" }
        ],
        analyst: [
          { id: 1, first: "Luís", last: "Gonçalves", email: "l***g@embraer.com.br", phone: "+55 (12) 3923-XXXX" },
          { id: 10, first: "Eduardo", last: "Martins", email: "e***o@embraer.com.br", phone: "+55 (11) 3033-XXXX" }
        ],
        general: [
          { id: 1, first: "Luís", last: "Gonçalves", email: "[REDACTED]", phone: "[REDACTED]" },
          { id: 10, first: "Eduardo", last: "Martins", email: "[REDACTED]", phone: "[REDACTED]" }
        ]
      }
    },
    write: {
      query: "DELETE FROM Customer WHERE Country = 'Brazil';",
      astPassed: false,
      astMessage: "AST Safety Check Failed: Forbidden 'DELETE' Statement Blocked",
      results: null
    }
  };

  const currentSim = simulatorData[activeQueryType];

  return (
    <div className="min-h-screen bg-[#020617] text-[#dae2fd] overflow-x-hidden font-sans selection:bg-primary/30 selection:text-white">
      
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-[30%] right-[-10%] w-[600px] h-[600px] rounded-full bg-secondary/5 blur-[150px] pointer-events-none z-0" />

      {/* Top Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-[#0b1326]/75 backdrop-blur-md border-b border-white/5 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-[#020617] font-bold text-xl">terminal</span>
            </div>
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-[#c3c6d7]">
              SQL<span className="text-primary">Agent</span>
            </span>
          </div>
          
          <div className="flex gap-8 items-center">
            <a href="#features" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors cursor-pointer hidden sm:block">
              Features
            </a>
            <a href="#security" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors cursor-pointer hidden sm:block">
              Security Model
            </a>
            <button 
              onClick={() => setView('workspace')}
              className="bg-primary text-on-primary px-5 py-2 rounded-lg text-xs font-bold shadow-lg shadow-primary/10 hover:shadow-primary/20 hover:scale-[1.03] active:scale-95 transition-all duration-200 cursor-pointer"
            >
              Launch Workspace
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-16 relative z-10">
        
        {/* Hero Section */}
        <section className="relative min-h-[85vh] flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 py-12 overflow-hidden border-b border-white/5">
          {/* Animated Background Schema SVG */}
          <div className="absolute inset-0 z-0 opacity-10 pointer-events-none flex items-center justify-center">
            <div className="w-full h-full max-w-4xl max-h-[600px]">
              <svg className="w-full h-full" viewBox="0 0 800 600">
                <path d="M400 300 L200 150 M400 300 L600 150 M400 300 L400 500 M200 150 L100 200 M600 150 L700 200" stroke="#b4c5ff" strokeDasharray="5,5" strokeWidth="1.5"></path>
                <circle className="glow-node animate-pulse" cx="400" cy="300" fill="#b4c5ff" r="8"></circle>
                <circle className="glow-node animate-float" cx="200" cy="150" fill="#b4c5ff" r="5"></circle>
                <circle className="glow-node animate-float" style={{ animationDelay: '2s' }} cx="600" cy="150" fill="#4edea3" r="5"></circle>
                <circle className="glow-node animate-float" style={{ animationDelay: '4s' }} cx="400" cy="500" fill="#d0bcff" r="5"></circle>
              </svg>
            </div>
          </div>

          <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
            {/* Active Agent Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-8 animate-fade-in">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Self-Healing SQL Agent Active
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight text-white max-w-3xl">
              Talk to your database. <br />
              <span className="code-gradient">Safely and Semantically.</span>
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl text-[#c3c6d7] mb-10 max-w-2xl mx-auto leading-relaxed">
              Connect your SQLite or PostgreSQL schema, query in plain English, and watch the agent resolve schema issues, block SQL injections, redact PII, and build clean reports.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md sm:max-w-none">
              <button 
                onClick={() => setView('workspace')}
                className="bg-primary text-on-primary px-8 py-3.5 rounded-xl font-bold text-base shadow-xl shadow-primary/15 hover:shadow-primary/30 hover:scale-[1.02] transition-all active:scale-98 cursor-pointer border-none"
              >
                Open AI Workspace
              </button>
              <a 
                href="#security"
                className="border border-[#4edea3]/40 text-[#4edea3] bg-[#4edea3]/5 px-8 py-3.5 rounded-xl font-bold text-base hover:bg-[#4edea3]/15 hover:scale-[1.02] transition-all active:scale-98 text-center flex items-center justify-center cursor-pointer"
              >
                View Security Sandbox
              </a>
            </div>
          </div>
        </section>

        {/* Tech Stack Marquee */}
        <section className="py-5 bg-surface-container-lowest/60 border-b border-white/5 overflow-hidden">
          <div className="w-full overflow-hidden relative">
            {/* Fade overlays for smooth scrolling illusion */}
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#020617] to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#020617] to-transparent z-10 pointer-events-none" />
            
            <div className="flex animate-marquee whitespace-nowrap gap-16 items-center">
              {/* Iteration 1 */}
              <span className="text-on-surface-variant/50 font-mono text-xs tracking-widest uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" /> FastAPI Async Gateway
              </span>
              <span className="text-on-surface-variant/50 font-mono text-xs tracking-widest uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" /> LangGraph Agentic Loop
              </span>
              <span className="text-on-surface-variant/50 font-mono text-xs tracking-widest uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary" /> ChromaDB Semantic Vectors
              </span>
              <span className="text-on-surface-variant/50 font-mono text-xs tracking-widest uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" /> SQLGlot AST Safety Parser
              </span>
              <span className="text-on-surface-variant/50 font-mono text-xs tracking-widest uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" /> SQLAlchemy Introspection
              </span>
              <span className="text-on-surface-variant/50 font-mono text-xs tracking-widest uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary" /> Gemini Pro AI Engine
              </span>
              
              {/* Iteration 2 (Duplicate for seamless loop) */}
              <span className="text-on-surface-variant/50 font-mono text-xs tracking-widest uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" /> FastAPI Async Gateway
              </span>
              <span className="text-on-surface-variant/50 font-mono text-xs tracking-widest uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" /> LangGraph Agentic Loop
              </span>
              <span className="text-on-surface-variant/50 font-mono text-xs tracking-widest uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary" /> ChromaDB Semantic Vectors
              </span>
              <span className="text-on-surface-variant/50 font-mono text-xs tracking-widest uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" /> SQLGlot AST Safety Parser
              </span>
              <span className="text-on-surface-variant/50 font-mono text-xs tracking-widest uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" /> SQLAlchemy Introspection
              </span>
              <span className="text-on-surface-variant/50 font-mono text-xs tracking-widest uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary" /> Gemini Pro AI Engine
              </span>
            </div>
          </div>
        </section>

        {/* Pillars / Features Grid (Interactive Bento Box Layout) */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" id="features">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">Enterprise Capabilities & Roadmap</h2>
            <p className="text-on-surface-variant">Explore our live platform engines and upcoming collaborative whiteboard and automated alerting frameworks.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            
            {/* Bento Card 1: Self-Healing Loop (Wide - 2 Columns) */}
            <div className="glass-card p-8 rounded-3xl md:col-span-2 flex flex-col justify-between overflow-hidden relative group min-h-[300px]">
              <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/5 rounded-full blur-[60px] pointer-events-none" />
              <div className="z-10 flex flex-col justify-between h-full">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-11 h-11 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary shadow-inner">
                      <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                    </div>
                    <span className="bg-secondary/15 text-secondary border border-secondary/20 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      Active Engine
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Self-Healing Execution Loop</h3>
                  <p className="text-on-surface-variant text-sm max-w-lg leading-relaxed">
                    Catches query failures automatically. If a column or syntax mismatch occurs, the LangGraph loop feeds the traceback to the model, retrieves the index, and rewrites it.
                  </p>
                </div>

                {/* Animated Console Widget */}
                <div className="mt-6 bg-[#020617] border border-white/5 rounded-xl p-3.5 font-mono text-[10px] sm:text-xs text-[#c3c6d7] space-y-2 relative overflow-hidden max-h-[110px] custom-scrollbar shadow-inner">
                  <div className="flex items-center gap-2 text-white/40 pb-1.5 border-b border-white/5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
                    <span className="ml-1 text-[9px] uppercase tracking-wider font-semibold">Compiler Agent Trace</span>
                  </div>
                  <div className="space-y-1 select-none">
                    <div className="text-red-400 flex items-start gap-1">
                      <span className="text-white/30">&gt;</span>
                      <span>[DB_ERROR] no such column: Customer.customerId</span>
                    </div>
                    <div className="text-yellow-300 flex items-start gap-1 animate-pulse">
                      <span className="text-white/30">&gt;</span>
                      <span>[CHROMA] Resolved synonym "customerId" to SQLite field "CustomerId"</span>
                    </div>
                    <div className="text-secondary flex items-start gap-1">
                      <span className="text-white/30">&gt;</span>
                      <span>[SUCCESS] Query corrected. Execution returned 5 records.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Card 2: AST SQL Guardrails (Standard - 1 Column) */}
            <div className="glass-card p-8 rounded-3xl flex flex-col justify-between relative group min-h-[300px]">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <div className="z-10 flex flex-col justify-between h-full">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                      <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>gpp_maybe</span>
                    </div>
                    <span className="bg-secondary/15 text-secondary border border-secondary/20 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      Active
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">AST SQL Guardrails</h3>
                  <p className="text-on-surface-variant text-xs sm:text-sm leading-relaxed">
                    Parsed SQL trees block commands like `DELETE` or catalog queries at the driver.
                  </p>
                </div>
                
                {/* SVG Visual parser representation */}
                <div className="mt-6 flex justify-center items-center h-20 bg-[#020617]/55 border border-white/5 rounded-xl relative overflow-hidden">
                  <div className="flex gap-2 items-center">
                    <div className="px-2 py-1 rounded bg-white/5 text-[9px] font-mono border border-white/10 text-[#d0bcff]">AST Root</div>
                    <span className="text-white/30">→</span>
                    <div className="px-2 py-1 rounded bg-red-950/40 text-[9px] font-mono border border-red-500/20 text-red-300">DELETE (Blocked)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Card 3: Semantic Vector Glossary (Standard - 1 Column) */}
            <div className="glass-card p-8 rounded-3xl flex flex-col justify-between relative group min-h-[300px]">
              <div className="z-10 flex flex-col justify-between h-full">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-11 h-11 rounded-xl bg-tertiary/10 border border-tertiary/20 flex items-center justify-center text-tertiary shadow-inner">
                      <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
                    </div>
                    <span className="bg-secondary/15 text-secondary border border-secondary/20 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      Active
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Semantic Glossary</h3>
                  <p className="text-on-surface-variant text-xs sm:text-sm leading-relaxed">
                    Uses ChromaDB vectors to resolve company terminology to tables (e.g. "sales volume" → `Invoice.Total`).
                  </p>
                </div>
                
                {/* Interactive mapping nodes */}
                <div className="mt-6 grid grid-cols-2 gap-2 h-20 p-2.5 bg-[#020617]/55 border border-white/5 rounded-xl items-center text-[10px] font-mono">
                  <div className="text-[#c3c6d7] text-center p-1 rounded border border-white/5 bg-white/[0.01]">"sales volume"</div>
                  <div className="text-[#secondary] text-center p-1 rounded border border-secondary/20 bg-secondary/5 font-semibold text-secondary">Invoice.Total</div>
                </div>
              </div>
            </div>

            {/* Bento Card 4: Dynamic PII Redaction (Wide - 2 Columns) */}
            <div className="glass-card p-8 rounded-3xl md:col-span-2 flex flex-col justify-between overflow-hidden relative group min-h-[300px]">
              <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-[60px] pointer-events-none" />
              <div className="z-10 flex flex-col justify-between h-full">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                      <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield_person</span>
                    </div>
                    <span className="bg-secondary/15 text-secondary border border-secondary/20 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      Active Engine
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Dynamic PII Redaction</h3>
                  <p className="text-on-surface-variant text-sm max-w-lg leading-relaxed">
                    Secure database outputs dynamically. Column filtration adjusts sensitive attributes (phone numbers, billing logs, and home addresses) using custom role-based mapping hooks.
                  </p>
                </div>

                {/* Micro role demo switcher */}
                <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center bg-[#020617]/80 p-4 border border-white/5 rounded-xl">
                  <div className="flex gap-2 sm:flex-col items-center">
                    <button onClick={() => setActiveRole('admin')} className={`px-2 py-1 text-[9px] rounded uppercase font-bold border transition-all cursor-pointer ${activeRole==='admin'?'bg-secondary/10 border-secondary text-secondary':'border-white/5 text-white/40'}`}>Admin</button>
                    <button onClick={() => setActiveRole('analyst')} className={`px-2 py-1 text-[9px] rounded uppercase font-bold border transition-all cursor-pointer ${activeRole==='analyst'?'bg-tertiary/10 border-tertiary text-tertiary':'border-white/5 text-white/40'}`}>Analyst</button>
                    <button onClick={() => setActiveRole('general')} className={`px-2 py-1 text-[9px] rounded uppercase font-bold border transition-all cursor-pointer ${activeRole==='general'?'bg-primary/10 border-primary text-primary':'border-white/5 text-white/40'}`}>General</button>
                  </div>
                  <div className="flex-1 w-full text-xs font-mono text-[#c3c6d7] space-y-1 bg-[#020617] border border-white/5 p-2 rounded">
                    <div><span className="text-white/40">Email:</span> {activeRole==='admin' ? 'luisg@embraer.com' : activeRole==='analyst' ? 'lu***g@embraer.com' : '[REDACTED]'}</div>
                    <div><span className="text-white/40">Phone:</span> {activeRole==='admin' ? '+55 (12) 3923-555' : activeRole==='analyst' ? '+55 (12) XXX-XXX' : '[REDACTED]'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Card 5: Collaborative War Rooms (Wide - 2 Columns) */}
            <div className="glass-card p-8 rounded-3xl md:col-span-2 flex flex-col justify-between overflow-hidden relative group min-h-[300px]">
              <div className="absolute top-0 right-0 w-64 h-64 bg-tertiary/5 rounded-full blur-[60px] pointer-events-none" />
              
              {/* Floating Multiplayer Cursors (Aesthetics) */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
                {/* Cursor 1 */}
                <div className="absolute top-[50%] left-[20%] flex gap-1.5 items-center animate-[float_8s_ease-in-out_infinite] z-20">
                  <svg className="w-4 h-4 text-[#4edea3] fill-current drop-shadow-md" viewBox="0 0 24 24">
                    <path d="M4.5 2.25l15 15-6.75 2.25-3-6-5.25-11.25z" />
                  </svg>
                  <span className="bg-secondary/90 backdrop-blur-sm text-[#020617] px-2 py-0.5 rounded text-[8px] font-bold shadow-md uppercase tracking-wider">
                    Alice (Analyst)
                  </span>
                </div>
                {/* Cursor 2 */}
                <div className="absolute top-[30%] left-[70%] flex gap-1.5 items-center animate-[float_12s_ease-in-out_infinite] z-20" style={{ animationDelay: '3s' }}>
                  <svg className="w-4 h-4 text-[#b4c5ff] fill-current drop-shadow-md" viewBox="0 0 24 24">
                    <path d="M4.5 2.25l15 15-6.75 2.25-3-6-5.25-11.25z" />
                  </svg>
                  <span className="bg-primary/90 backdrop-blur-sm text-[#020617] px-2 py-0.5 rounded text-[8px] font-bold shadow-md uppercase tracking-wider">
                    Sarah (CTO)
                  </span>
                </div>
              </div>

              <div className="z-10 flex flex-col justify-between h-full">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-11 h-11 rounded-xl bg-tertiary/10 border border-tertiary/20 flex items-center justify-center text-tertiary shadow-inner">
                      <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
                    </div>
                    <span className="bg-tertiary/10 text-tertiary border border-tertiary/20 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      Roadmap Phase 4
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Real-Time Collaborative War Rooms</h3>
                  <p className="text-on-surface-variant text-sm max-w-lg leading-relaxed">
                    Collaborate inside a WebSocket-synchronized whiteboard canvas. Move, inspect, and evaluate generated query configurations and metrics directly with your core management team.
                  </p>
                </div>
                
                {/* Visual Canvas Mockup */}
                <div className="mt-6 h-20 bg-[#020617]/70 border border-white/5 rounded-xl flex gap-3 p-3 items-center justify-center relative overflow-hidden select-none">
                  <div className="w-24 h-12 rounded border border-white/10 bg-white/[0.02] flex items-center justify-center text-[9px] font-mono text-white/50">Query_1.sql</div>
                  <div className="w-24 h-12 rounded border border-[#4edea3]/20 bg-[#4edea3]/5 flex items-center justify-center text-[9px] font-mono text-[#4edea3]">Chart_Sales.png</div>
                </div>
              </div>
            </div>

            {/* Bento Card 6: Pitch-Ready Exporter (Standard - 1 Column) */}
            <div className="glass-card p-8 rounded-3xl flex flex-col justify-between relative group min-h-[300px]">
              <div className="z-10 flex flex-col justify-between h-full">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                      <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>picture_as_pdf</span>
                    </div>
                    <span className="bg-tertiary/10 text-tertiary border border-tertiary/20 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      Roadmap
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Pitch-Ready Exporter</h3>
                  <p className="text-on-surface-variant text-xs sm:text-sm leading-relaxed">
                    Convert insights into dynamic corporate assets like vector PPTX slides, PDFs, or formatted Excel grids.
                  </p>
                </div>
                
                {/* Download visual buttons */}
                <div className="mt-6 flex flex-col gap-1.5 select-none">
                  <div className="flex items-center justify-between p-2 rounded bg-[#020617]/55 border border-white/5 text-[9px]">
                    <span className="font-semibold text-[#eeefff]">sales_deck.pptx</span>
                    <span className="material-symbols-outlined text-[#d0bcff] text-[14px]">download</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-[#020617]/55 border border-white/5 text-[9px]">
                    <span className="font-semibold text-[#eeefff]">quarterly_sheet.xlsx</span>
                    <span className="material-symbols-outlined text-[#4edea3] text-[14px]">download</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Card 7: Anomaly Alerts Scheduler (Standard - 1 Column) */}
            <div className="glass-card p-8 rounded-3xl flex flex-col justify-between relative group min-h-[300px]">
              <div className="z-10 flex flex-col justify-between h-full">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-11 h-11 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary shadow-inner">
                      <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>notifications_active</span>
                    </div>
                    <span className="bg-tertiary/10 text-tertiary border border-tertiary/20 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      Roadmap
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">"Smoke Detector"</h3>
                  <p className="text-on-surface-variant text-xs sm:text-sm leading-relaxed">
                    Define scheduled rules in normal language. Bot queries anomaly metrics automatically using Celery Beat.
                  </p>
                </div>
                
                {/* Pulsing indicator */}
                <div className="mt-6 flex items-center justify-center h-20 bg-[#020617]/55 border border-white/5 rounded-xl">
                  <span className="relative flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                  </span>
                  <span className="ml-3 text-[10px] uppercase font-mono font-bold text-red-400">Anomaly Check: Triggered</span>
                </div>
              </div>
            </div>

            {/* Bento Card 8: Slack & Teams Messaging (Wide - 2 Columns) */}
            <div className="glass-card p-8 rounded-3xl md:col-span-2 flex flex-col justify-between overflow-hidden relative group min-h-[300px]">
              <div className="absolute inset-0 bg-gradient-to-r from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <div className="z-10 flex flex-col justify-between h-full">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                      <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
                    </div>
                    <span className="bg-tertiary/10 text-tertiary border border-tertiary/20 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      Roadmap Phase 5
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Slack & MS Teams Webhook Gateways</h3>
                  <p className="text-on-surface-variant text-sm max-w-lg leading-relaxed">
                    Query the database agent from corporate channels. Use commands like `/data-agent "active users"` and receive charts and narratives compiled directly inside chat threads.
                  </p>
                </div>
                
                {/* Chat bubble mockup */}
                <div className="mt-6 bg-[#020617]/70 border border-white/5 rounded-xl p-3.5 flex gap-3 items-start select-none">
                  <div className="w-7 h-7 rounded bg-[#4a154b] flex items-center justify-center font-bold text-white text-[10px]">S</div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-extrabold text-white">Slack App</span>
                      <span className="bg-white/10 text-white/50 text-[7px] px-1 rounded uppercase font-bold">Bot</span>
                    </div>
                    <div className="text-[10px] text-[#c3c6d7] leading-relaxed bg-[#020617] border border-white/5 p-2 rounded-lg inline-block">
                      📊 <span className="font-bold text-[#4edea3]">Invoice total sales</span> resolved to <code className="bg-white/5 px-1 rounded text-primary font-mono text-[9px]">Invoice.Total</code>. Total Sum is <span className="font-bold text-white">$195,432.22</span>.
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Interactive Code/Agent Simulation */}
        <section className="py-20 bg-surface-container-lowest/30 border-t border-b border-white/5" id="security">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">Interactive Security Sandbox</h2>
              <p className="text-on-surface-variant">Simulate how the agent parses SQL trees, enforces read-only access, and masks PII content based on user clearance role.</p>
            </div>
            
            {/* Interactive Widget Box */}
            <div className="glass-card rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex flex-col lg:flex-row">
              
              {/* Left Sandbox Control Console */}
              <div className="p-6 sm:p-8 lg:w-1/2 flex flex-col gap-6 border-b lg:border-b-0 lg:border-r border-white/10 bg-[#0b1326]/40">
                
                {/* Step 1: Select Query Type */}
                <div>
                  <label className="text-xs uppercase tracking-widest font-semibold text-on-surface-variant block mb-3">
                    Step 1: Choose Query Statement
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setActiveQueryType('read')}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-bold text-sm cursor-pointer transition-all duration-200 ${
                        activeQueryType === 'read'
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'border-white/5 hover:bg-white/5 text-[#c3c6d7]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">find_in_page</span>
                      Standard Read
                    </button>
                    <button
                      onClick={() => setActiveQueryType('write')}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-bold text-sm cursor-pointer transition-all duration-200 ${
                        activeQueryType === 'write'
                          ? 'bg-error/10 border-error text-error'
                          : 'border-white/5 hover:bg-white/5 text-[#c3c6d7]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                      Malicious Write
                    </button>
                  </div>
                </div>

                {/* Step 2: Select Role */}
                <div className={activeQueryType === 'write' ? 'opacity-40 pointer-events-none' : ''}>
                  <label className="text-xs uppercase tracking-widest font-semibold text-on-surface-variant block mb-3">
                    Step 2: Choose Active Clearance Role
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['general', 'analyst', 'admin'].map((role) => (
                      <button
                        key={role}
                        onClick={() => setActiveRole(role)}
                        className={`py-2 px-3 rounded-lg border font-bold text-xs uppercase cursor-pointer transition-all duration-150 text-center ${
                          activeRole === role
                            ? 'bg-secondary/15 border-secondary text-secondary'
                            : 'border-white/5 hover:bg-white/5 text-[#c3c6d7]'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pipeline State Display */}
                <div className="mt-4 pt-6 border-t border-white/5 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#4edea3] text-[20px]">psychology</span>
                    <span className="text-xs uppercase tracking-widest font-semibold text-[#4edea3]">Natural Query Input</span>
                  </div>
                  <div className="bg-[#020617] p-4 rounded-xl border border-white/5 text-sm leading-relaxed text-white">
                    {activeQueryType === 'read' 
                      ? '"Get customers from Brazil and display their names and contact details"'
                      : '"Delete the customer record from Brazil to clear data logs"'}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">terminal</span>
                    <span className="text-xs uppercase tracking-widest font-semibold text-primary">Generated SQL Expression</span>
                  </div>
                  <div className="bg-[#020617] p-4 rounded-xl border border-white/10 font-mono text-xs overflow-x-auto text-[#eeefff]">
                    <code>{currentSim.query}</code>
                  </div>
                </div>

              </div>
              
              {/* Right Sandbox Outputs Console */}
              <div className="p-6 sm:p-8 lg:w-1/2 flex flex-col justify-between bg-surface-container-lowest/40">
                
                <div className="space-y-6">
                  {/* Title */}
                  <div className="flex justify-between items-center pb-4 border-b border-white/5">
                    <div className="flex items-center gap-2 text-tertiary">
                      <span className="material-symbols-outlined">policy</span>
                      <span className="text-xs uppercase tracking-widest font-semibold">Security Pipeline Results</span>
                    </div>
                    {/* Badge */}
                    <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                      currentSim.astPassed 
                        ? 'bg-secondary/15 text-secondary border border-secondary/20' 
                        : 'bg-error/15 text-error border border-error/20 animate-pulse'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {currentSim.astPassed ? 'PASSED' : 'BLOCKED'}
                    </div>
                  </div>

                  {/* AST Message */}
                  <div className={`p-4 rounded-xl text-xs font-semibold flex gap-3 items-start border ${
                    currentSim.astPassed 
                      ? 'bg-secondary/5 border-secondary/20 text-[#70fbbe]' 
                      : 'bg-error/5 border-error/20 text-[#ffb4ab]'
                  }`}>
                    <span className="material-symbols-outlined text-[18px]">
                      {currentSim.astPassed ? 'verified_user' : 'gpp_bad'}
                    </span>
                    <div>{currentSim.astMessage}</div>
                  </div>

                  {/* Data Result Grid or Blocked Display */}
                  <div>
                    <label className="text-xs uppercase tracking-widest font-semibold text-on-surface-variant block mb-3">
                      Pipeline Output Dataset
                    </label>

                    {currentSim.astPassed && currentSim.results ? (
                      <div className="overflow-x-auto border border-white/5 rounded-xl bg-[#020617]/80">
                        <table className="min-w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02] text-on-surface-variant">
                              <th className="p-3 font-semibold">ID</th>
                              <th className="p-3 font-semibold">Name</th>
                              <th className="p-3 font-semibold">Email</th>
                              <th className="p-3 font-semibold">Phone</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-white">
                            {currentSim.results[activeRole].map((row) => (
                              <tr key={row.id} className="hover:bg-white/[0.01] transition-colors">
                                <td className="p-3 text-on-surface-variant font-mono">{row.id}</td>
                                <td className="p-3 font-medium">{row.first} {row.last}</td>
                                <td className={`p-3 font-mono ${row.email === '[REDACTED]' ? 'text-error/80 font-bold' : 'text-[#d0bcff]'}`}>
                                  {row.email}
                                </td>
                                <td className={`p-3 font-mono ${row.phone === '[REDACTED]' ? 'text-error/80 font-bold' : 'text-secondary'}`}>
                                  {row.phone}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 border border-dashed border-error/30 rounded-xl bg-error/[0.02]">
                        <span className="material-symbols-outlined text-error text-[40px] mb-2 animate-bounce">security_update_warning</span>
                        <div className="text-xs font-bold text-error uppercase tracking-wider">Statement Terminated</div>
                        <div className="text-center text-on-surface-variant text-xs mt-2 max-w-xs leading-relaxed">
                          Execution aborted before database connection. The parsing parser detected forbidden writing commands.
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Footer Note */}
                <div className="mt-8 pt-4 border-t border-white/5 flex items-center gap-2 text-on-surface-variant text-[11px]">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  Zero data is leaked. Role-based masking occurs immediately after query validation.
                </div>

              </div>
              
            </div>
          </div>
        </section>
      </main>

      {/* Footer Section */}
      <footer className="w-full border-t border-white/5 bg-[#060e20] py-12 mt-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-6">
          <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
                <span className="material-symbols-outlined text-[#020617] text-sm font-bold">terminal</span>
              </div>
              <span className="text-lg text-white font-bold">SQL Agent</span>
            </div>
            
            <div className="flex flex-wrap justify-center gap-6 text-xs text-on-surface-variant">
              <span className="hover:text-primary transition-colors cursor-default">GDPR Redaction Enforced</span>
              <span className="text-white/10 hidden sm:inline">•</span>
              <span className="hover:text-primary transition-colors cursor-default">Zero-Trust Role Control</span>
              <span className="text-white/10 hidden sm:inline">•</span>
              <span className="hover:text-primary transition-colors cursor-default">Read-Only Safety Hook</span>
            </div>
          </div>
          
          <div className="w-full border-t border-white/5 my-2" />
          
          <div className="flex flex-col sm:flex-row justify-between w-full text-xs text-on-surface-variant/40 gap-4">
            <p>© 2026 Enterprise AI SQL Agent. Built with FastAPI, LangGraph, and sqlglot.</p>
            <p className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px] text-secondary">verified</span>
              Admin Control Center Active
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

