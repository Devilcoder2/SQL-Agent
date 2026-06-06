import { useState } from 'react';

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
    <div className="min-h-screen bg-surface text-on-surface overflow-x-hidden font-sans selection:bg-primary/20 selection:text-primary relative">
      
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-15%] w-[600px] h-[600px] rounded-full bg-primary/5 blur-[130px] pointer-events-none z-0" />
      <div className="absolute top-[35%] right-[-15%] w-[700px] h-[700px] rounded-full bg-secondary/5 blur-[160px] pointer-events-none z-0" />
      <div className="absolute bottom-[5%] left-[20%] w-[500px] h-[500px] rounded-full bg-tertiary/5 blur-[140px] pointer-events-none z-0" />

      {/* Top Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-surface/75 backdrop-blur-md border-b border-outline-variant/60 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-primary to-secondary flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-white font-bold text-xl">database</span>
            </div>
            <span className="text-lg font-extrabold tracking-wider text-on-surface">
              Veridian<span className="text-primary">SQL</span>
            </span>
          </div>
          
          <div className="flex gap-6 sm:gap-8 items-center">
            <a href="#features" className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant hover:text-primary transition-colors cursor-pointer hidden sm:block">
              Features
            </a>
            <a href="#security" className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant hover:text-primary transition-colors cursor-pointer hidden sm:block">
              Sandbox
            </a>
            <button 
              onClick={() => setView('workspace')}
              className="bg-primary text-white hover:bg-primary/90 px-4.5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all duration-200 cursor-pointer active:scale-95 border-none"
            >
              Launch Workspace
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-16 relative z-10">
        
        {/* Hero Section */}
        <section className="relative min-h-[85vh] flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 py-14 overflow-hidden border-b border-outline-variant/60 dotted-grid">
          {/* Animated Background Schema SVG */}
          <div className="absolute inset-0 z-0 opacity-10 pointer-events-none flex items-center justify-center">
            <div className="w-full h-full max-w-4xl max-h-[600px]">
              <svg className="w-full h-full" viewBox="0 0 800 600">
                <path d="M400 300 L200 150 M400 300 L600 150 M400 300 L400 500 M200 150 L100 200 M600 150 L700 200" stroke="var(--color-outline)" strokeDasharray="6,6" strokeWidth="1.5"></path>
                <circle className="glow-node animate-pulse" cx="400" cy="300" fill="var(--color-primary)" r="8"></circle>
                <circle className="glow-node animate-float" cx="200" cy="150" fill="var(--color-primary)" r="5"></circle>
                <circle className="glow-node animate-float" style={{ animationDelay: '2s' }} cx="600" cy="150" fill="var(--color-secondary)" r="5"></circle>
                <circle className="glow-node animate-float" style={{ animationDelay: '4s' }} cx="400" cy="500" fill="var(--color-tertiary)" r="5"></circle>
              </svg>
            </div>
          </div>

          <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
            {/* Active Agent Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider mb-6 animate-fade-in">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
              </span>
              Self-Healing SQL Agent Active
            </div>
            
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight text-on-surface max-w-3xl">
              Talk to your database. <br />
              <span className="code-gradient">Safely and Semantically.</span>
            </h1>
            
            <p className="text-sm sm:text-base md:text-lg text-on-surface-variant mb-10 max-w-2xl mx-auto leading-relaxed">
              Connect your SQLite or PostgreSQL database, query in plain English, and watch the agent resolve schema issues, enforce AST blocks, redact sensitive PII, and generate PowerPoint slides.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4.5 justify-center w-full max-w-xs sm:max-w-none">
              <button 
                onClick={() => setView('workspace')}
                className="bg-gradient-to-r from-primary to-secondary text-white px-7 py-3 rounded-xl font-bold text-sm shadow-md hover:shadow-lg hover:scale-[1.01] transition-all active:scale-95 cursor-pointer border-none"
              >
                Open AI Workspace
              </button>
              <a 
                href="#security"
                className="border border-secondary/30 text-secondary bg-secondary/5 px-7 py-3 rounded-xl font-bold text-sm hover:bg-secondary/10 hover:scale-[1.01] transition-all active:scale-95 text-center flex items-center justify-center cursor-pointer"
              >
                Launch Sandbox
              </a>
            </div>
          </div>
        </section>

        {/* Tech Stack Marquee */}
        <section className="py-4 bg-surface-dim/45 border-b border-outline-variant/60 overflow-hidden select-none">
          <div className="w-full overflow-hidden relative">
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-surface to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-surface to-transparent z-10 pointer-events-none" />
            
            <div className="flex animate-marquee whitespace-nowrap gap-16 items-center">
              {/* Iteration 1 */}
              <span className="text-on-surface-variant/50 font-mono text-[10px] tracking-widest uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" /> FastAPI Async Gateway
              </span>
              <span className="text-on-surface-variant/50 font-mono text-[10px] tracking-widest uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" /> LangGraph Agentic Loop
              </span>
              <span className="text-on-surface-variant/50 font-mono text-[10px] tracking-widest uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary" /> ChromaDB Semantic Vectors
              </span>
              <span className="text-on-surface-variant/50 font-mono text-[10px] tracking-widest uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" /> SQLGlot AST Safety Parser
              </span>
              <span className="text-on-surface-variant/50 font-mono text-[10px] tracking-widest uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" /> SQLAlchemy Introspection
              </span>
              <span className="text-on-surface-variant/50 font-mono text-[10px] tracking-widest uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary" /> Gemini Pro AI Engine
              </span>
              
              {/* Iteration 2 */}
              <span className="text-on-surface-variant/50 font-mono text-[10px] tracking-widest uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" /> FastAPI Async Gateway
              </span>
              <span className="text-on-surface-variant/50 font-mono text-[10px] tracking-widest uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" /> LangGraph Agentic Loop
              </span>
              <span className="text-on-surface-variant/50 font-mono text-[10px] tracking-widest uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary" /> ChromaDB Semantic Vectors
              </span>
              <span className="text-on-surface-variant/50 font-mono text-[10px] tracking-widest uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" /> SQLGlot AST Safety Parser
              </span>
              <span className="text-on-surface-variant/50 font-mono text-[10px] tracking-widest uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" /> SQLAlchemy Introspection
              </span>
              <span className="text-on-surface-variant/50 font-mono text-[10px] tracking-widest uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary" /> Gemini Pro AI Engine
              </span>
            </div>
          </div>
        </section>

        {/* Pillars / Features Bento Grid */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 select-none" id="features">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-on-surface mb-4">Enterprise Capabilities & Roadmap</h2>
            <p className="text-on-surface-variant text-sm sm:text-base">Explore our live platform engines and upcoming collaborative whiteboard and automated alerting frameworks.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            
            {/* Bento Card 1: Self-Healing Loop */}
            <div className="glass-card p-7 sm:p-8 rounded-3xl md:col-span-2 flex flex-col justify-between overflow-hidden relative group min-h-[320px]">
              <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/5 rounded-full blur-[65px] pointer-events-none" />
              <div className="z-10 flex flex-col justify-between h-full">
                <div>
                  <div className="flex justify-between items-start mb-5">
                    <div className="w-11 h-11 rounded-xl bg-secondary/15 border border-secondary/25 flex items-center justify-center text-secondary shadow-inner">
                      <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                    </div>
                    <span className="bg-secondary/10 text-secondary border border-secondary/20 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                      Active Loop
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-on-surface mb-2">Self-Healing Execution Loop</h3>
                  <p className="text-on-surface-variant text-xs sm:text-sm max-w-lg leading-relaxed">
                    Catches query failures automatically. If a column or syntax mismatch occurs, the LangGraph loop feeds the traceback to the model, retrieves the index, and self-heals in real time.
                  </p>
                </div>

                {/* Animated Console Widget */}
                <div className="mt-6 bg-surface border border-outline-variant/60 rounded-xl p-3.5 font-mono text-[10px] sm:text-xs text-on-surface-variant space-y-2 relative overflow-hidden max-h-[110px] custom-scrollbar shadow-inner text-left">
                  <div className="flex items-center gap-2 text-on-surface-variant/40 pb-1.5 border-b border-outline-variant/60">
                    <span className="w-2.5 h-2.5 rounded-full bg-error/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-tertiary/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-success/80" />
                    <span className="ml-1 text-[9px] uppercase tracking-wider font-semibold">Compiler Agent Trace</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-error flex items-start gap-1">
                      <span className="text-on-surface-variant/30">&gt;</span>
                      <span>[DB_ERROR] no such column: Customer.customerId</span>
                    </div>
                    <div className="text-secondary flex items-start gap-1 animate-pulse">
                      <span className="text-on-surface-variant/30">&gt;</span>
                      <span>[CHROMA] Resolved synonym "customerId" to SQLite field "CustomerId"</span>
                    </div>
                    <div className="text-primary flex items-start gap-1">
                      <span className="text-on-surface-variant/30">&gt;</span>
                      <span>[SUCCESS] Query corrected. Execution returned 5 records.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Card 2: AST SQL Guardrails */}
            <div className="glass-card p-7 sm:p-8 rounded-3xl flex flex-col justify-between relative group min-h-[320px]">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <div className="z-10 flex flex-col justify-between h-full">
                <div>
                  <div className="flex justify-between items-start mb-5">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                      <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>gpp_maybe</span>
                    </div>
                    <span className="bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                      Active
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-on-surface mb-2">AST SQL Guardrails</h3>
                  <p className="text-on-surface-variant text-xs leading-relaxed">
                    Parsed SQL trees intercept malicious operations or unauthorized schema alterations (e.g. `DELETE`) directly at driver levels.
                  </p>
                </div>
                
                {/* SVG Visual parser representation */}
                <div className="mt-6 flex justify-center items-center h-20 bg-surface border border-outline-variant/60 rounded-xl relative overflow-hidden">
                  <div className="flex gap-2 items-center text-[10px] font-mono">
                    <div className="px-2 py-1 rounded bg-surface-dim border border-outline/30 text-primary">AST Root</div>
                    <span className="text-on-surface-variant/30">→</span>
                    <div className="px-2 py-1 rounded bg-error-container/30 border border-error/20 text-error">DELETE (Blocked)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Card 3: Semantic Vector Glossary */}
            <div className="glass-card p-7 sm:p-8 rounded-3xl flex flex-col justify-between relative group min-h-[320px]">
              <div className="z-10 flex flex-col justify-between h-full">
                <div>
                  <div className="flex justify-between items-start mb-5">
                    <div className="w-11 h-11 rounded-xl bg-tertiary/15 border border-tertiary/25 flex items-center justify-center text-tertiary shadow-inner">
                      <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
                    </div>
                    <span className="bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                      Active
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-on-surface mb-2">Semantic Glossary</h3>
                  <p className="text-on-surface-variant text-xs leading-relaxed">
                    Indexes corporate abbreviations using ChromaDB vector database mappings, translating fuzzy logic columns on the fly.
                  </p>
                </div>
                
                {/* Interactive mapping nodes */}
                <div className="mt-6 grid grid-cols-2 gap-2 h-20 p-2.5 bg-surface border border-outline-variant/60 rounded-xl items-center text-[10px] font-mono">
                  <div className="text-on-surface-variant text-center p-1 rounded border border-outline/35 bg-surface-dim">"sales volume"</div>
                  <div className="text-secondary text-center p-1 rounded border border-secondary/20 bg-secondary/5 font-semibold">Invoice.Total</div>
                </div>
              </div>
            </div>

            {/* Bento Card 4: Dynamic PII Redaction */}
            <div className="glass-card p-7 sm:p-8 rounded-3xl md:col-span-2 flex flex-col justify-between overflow-hidden relative group min-h-[320px]">
              <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-[65px] pointer-events-none" />
              <div className="z-10 flex flex-col justify-between h-full">
                <div>
                  <div className="flex justify-between items-start mb-5">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                      <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield_person</span>
                    </div>
                    <span className="bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                      Active
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-on-surface mb-2">Dynamic PII Redaction</h3>
                  <p className="text-on-surface-variant text-sm max-w-lg leading-relaxed">
                    Protect sensitive corporate attributes dynamically. Built-in hooks auto-redact email values, phone numbers, and addresses based on clearance levels.
                  </p>
                </div>

                {/* Micro role demo switcher */}
                <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center bg-surface-dim/45 p-4 border border-outline-variant/60 rounded-xl text-left select-none">
                  <div className="flex gap-2 sm:flex-col items-center">
                    <button onClick={() => setActiveRole('admin')} className={`px-2.5 py-1 text-[9px] rounded-lg uppercase font-bold border transition-all cursor-pointer ${activeRole==='admin'?'bg-secondary/15 border-secondary text-secondary':'border-outline/35 text-on-surface-variant/40 bg-transparent'}`}>Admin</button>
                    <button onClick={() => setActiveRole('analyst')} className={`px-2.5 py-1 text-[9px] rounded-lg uppercase font-bold border transition-all cursor-pointer ${activeRole==='analyst'?'bg-tertiary/15 border-tertiary text-tertiary':'border-outline/35 text-on-surface-variant/40 bg-transparent'}`}>Analyst</button>
                    <button onClick={() => setActiveRole('general')} className={`px-2.5 py-1 text-[9px] rounded-lg uppercase font-bold border transition-all cursor-pointer ${activeRole==='general'?'bg-primary/15 border-primary text-primary':'border-outline/35 text-on-surface-variant/40 bg-transparent'}`}>General</button>
                  </div>
                  <div className="flex-grow w-full text-xs font-mono text-on-surface space-y-1 bg-surface border border-outline-variant/60 p-2 rounded-lg">
                    <div><span className="text-on-surface-variant/40">Email:</span> {activeRole==='admin' ? 'luisg@embraer.com.br' : activeRole==='analyst' ? 'lu***g@embraer.com.br' : '[REDACTED]'}</div>
                    <div><span className="text-on-surface-variant/40">Phone:</span> {activeRole==='admin' ? '+55 (12) 3923-5555' : activeRole==='analyst' ? '+55 (12) XXXX-XXXX' : '[REDACTED]'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Card 6: PowerPoint Exporter */}
            <div className="glass-card p-7 sm:p-8 rounded-3xl flex flex-col justify-between relative group min-h-[320px]">
              <div className="z-10 flex flex-col justify-between h-full">
                <div>
                  <div className="flex justify-between items-start mb-5">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                      <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>picture_as_pdf</span>
                    </div>
                    <span className="bg-tertiary/10 text-tertiary border border-tertiary/20 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                      Roadmap
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-on-surface mb-2">Slide Deck Exporter</h3>
                  <p className="text-on-surface-variant text-xs leading-relaxed">
                    Generate visual PPTX slide briefs, PDF analytical summaries, and grid excels in seconds.
                  </p>
                </div>
                
                {/* Download visual buttons */}
                <div className="mt-6 flex flex-col gap-2 select-none">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-surface border border-outline-variant/60 text-[9px] font-mono">
                    <span className="font-semibold text-on-surface">sales_deck.pptx</span>
                    <span className="material-symbols-outlined text-primary text-[14px]">download</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-surface border border-outline-variant/60 text-[9px] font-mono">
                    <span className="font-semibold text-on-surface">quarterly_sheet.xlsx</span>
                    <span className="material-symbols-outlined text-success text-[14px]">download</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Card 7: Anomaly Alerts Scheduler */}
            <div className="glass-card p-7 sm:p-8 rounded-3xl flex flex-col justify-between relative group min-h-[320px]">
              <div className="z-10 flex flex-col justify-between h-full">
                <div>
                  <div className="flex justify-between items-start mb-5">
                    <div className="w-11 h-11 rounded-xl bg-secondary/15 border border-secondary/25 flex items-center justify-center text-secondary shadow-inner">
                      <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>notifications_active</span>
                    </div>
                    <span className="bg-tertiary/10 text-tertiary border border-tertiary/20 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                      Roadmap
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-on-surface mb-2">Smoke Detector Alerts</h3>
                  <p className="text-on-surface-variant text-xs leading-relaxed">
                    Establish SQL triggers using plain business rules to query database changes on schedule.
                  </p>
                </div>
                
                {/* Pulsing indicator */}
                <div className="mt-6 flex items-center justify-center h-20 bg-surface border border-outline-variant/60 rounded-xl text-[10px] font-mono">
                  <span className="relative flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-error"></span>
                  </span>
                  <span className="ml-3 font-bold text-error uppercase tracking-wider animate-pulse">Watchdogs Active</span>
                </div>
              </div>
            </div>

            {/* Bento Card 8: Slack & Teams Webhooks */}
            <div className="glass-card p-7 sm:p-8 rounded-3xl flex flex-col justify-between overflow-hidden relative group min-h-[320px]">
              <div className="absolute inset-0 bg-gradient-to-r from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <div className="z-10 flex flex-col justify-between h-full">
                <div>
                  <div className="flex justify-between items-start mb-5">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                      <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
                    </div>
                    <span className="bg-tertiary/10 text-tertiary border border-tertiary/20 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                      Phase 5
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-on-surface mb-2">Slack Webhook Gateways</h3>
                  <p className="text-on-surface-variant text-xs sm:text-sm leading-relaxed">
                    Query databases from corporate channels using commands like `/veridian "invoices total"`.
                  </p>
                </div>
                
                {/* Chat bubble mockup */}
                <div className="mt-6 bg-surface border border-outline-variant/60 rounded-xl p-3 flex gap-2.5 items-start text-left select-none">
                  <div className="w-6 h-6 rounded bg-secondary flex items-center justify-center font-bold text-white text-[9px] shrink-0">V</div>
                  <div className="flex-grow space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-extrabold text-on-surface">Veridian App</span>
                      <span className="bg-surface-container text-on-surface-variant/70 text-[6px] px-1 rounded font-bold uppercase">Bot</span>
                    </div>
                    <div className="text-[9px] text-on-surface-variant leading-relaxed bg-surface-dim border border-outline-variant/60 p-2 rounded-lg inline-block truncate max-w-full">
                      📊 Invoice total sales resolved. Sum: <span className="font-bold text-on-surface">$195.4k</span>.
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Interactive Code/Agent Simulation */}
        <section className="py-20 bg-surface-dim/40 border-t border-b border-outline-variant/60" id="security">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <h2 className="text-2xl sm:text-4xl font-extrabold text-on-surface mb-3">Interactive Security Sandbox</h2>
              <p className="text-on-surface-variant text-sm sm:text-base">Simulate how the agent parses SQL trees, enforces read-only access, and masks PII content based on user clearance role.</p>
            </div>
            
            {/* Interactive Widget Box */}
            <div className="glass-card rounded-3xl overflow-hidden border border-outline-variant/60 shadow-xl flex flex-col lg:flex-row text-left">
              
              {/* Left Sandbox Control Console */}
              <div className="p-6 sm:p-8 lg:w-1/2 flex flex-col gap-6 border-b lg:border-b-0 lg:border-r border-outline-variant/60 bg-surface-dim/20">
                
                {/* Step 1: Select Query Type */}
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant block mb-3">
                    Step 1: Choose Query Statement
                  </label>
                  <div className="grid grid-cols-2 gap-3 select-none">
                    <button
                      onClick={() => setActiveQueryType('read')}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-bold text-xs cursor-pointer transition-all duration-200 uppercase tracking-wider ${
                        activeQueryType === 'read'
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'border-outline/30 hover:bg-surface-container text-on-surface-variant bg-transparent'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">find_in_page</span>
                      Standard Read
                    </button>
                    <button
                      onClick={() => setActiveQueryType('write')}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-bold text-xs cursor-pointer transition-all duration-200 uppercase tracking-wider ${
                        activeQueryType === 'write'
                          ? 'bg-error/15 border-error text-error'
                          : 'border-outline/30 hover:bg-surface-container text-on-surface-variant bg-transparent'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                      Malicious Write
                    </button>
                  </div>
                </div>

                {/* Step 2: Select Role */}
                <div className={activeQueryType === 'write' ? 'opacity-40 pointer-events-none' : ''}>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant block mb-3">
                    Step 2: Choose Clearance clearance role
                  </label>
                  <div className="grid grid-cols-3 gap-2.5 select-none">
                    {['general', 'analyst', 'admin'].map((role) => (
                      <button
                        key={role}
                        onClick={() => setActiveRole(role)}
                        className={`py-2 px-3 rounded-xl border font-bold text-[10px] uppercase cursor-pointer transition-all duration-150 text-center tracking-wider ${
                          activeRole === role
                            ? 'bg-secondary/15 border-secondary text-secondary'
                            : 'border-outline/30 hover:bg-surface-container text-on-surface-variant bg-transparent'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pipeline State Display */}
                <div className="mt-4 pt-6 border-t border-outline-variant/60 space-y-4">
                  <div className="flex items-center gap-2 select-none">
                    <span className="material-symbols-outlined text-success text-[20px]">psychology</span>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-success">Natural Query Input</span>
                  </div>
                  <div className="bg-surface p-4 rounded-xl border border-outline/30 text-xs leading-relaxed text-on-surface">
                    {activeQueryType === 'read' 
                      ? '"Get customers from Brazil and display their names and contact details"'
                      : '"Delete the customer record from Brazil to clear data logs"'}
                  </div>

                  <div className="flex items-center gap-2 select-none">
                    <span className="material-symbols-outlined text-primary text-[20px]">terminal</span>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-primary">Generated SQL Expression</span>
                  </div>
                  <div className="bg-surface p-4 rounded-xl border border-outline/30 font-mono text-xs overflow-x-auto text-secondary">
                    <code>{currentSim.query}</code>
                  </div>
                </div>

              </div>
              
              {/* Right Sandbox Outputs Console */}
              <div className="p-6 sm:p-8 lg:w-1/2 flex flex-col justify-between bg-transparent">
                
                <div className="space-y-6">
                  {/* Title */}
                  <div className="flex justify-between items-center pb-4 border-b border-outline-variant/60 select-none">
                    <div className="flex items-center gap-2 text-tertiary">
                      <span className="material-symbols-outlined text-lg">policy</span>
                      <span className="text-[10px] uppercase tracking-wider font-bold">Security Pipeline Results</span>
                    </div>
                    {/* Badge */}
                    <div className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 border ${
                      currentSim.astPassed 
                        ? 'bg-success/15 text-success border-success/20' 
                        : 'bg-error/15 text-error border-error/20 animate-pulse'
                    }`}>
                      <span className="w-1 h-1 rounded-full bg-current" />
                      {currentSim.astPassed ? 'PASSED' : 'BLOCKED'}
                    </div>
                  </div>

                  {/* AST Message */}
                  <div className={`p-4 rounded-xl text-xs font-semibold flex gap-3 items-start border ${
                    currentSim.astPassed 
                      ? 'bg-success-container/20 border-success/30 text-on-success-container' 
                      : 'bg-error-container/20 border-error/30 text-on-error-container'
                  }`}>
                    <span className="material-symbols-outlined text-[18px] shrink-0">
                      {currentSim.astPassed ? 'verified_user' : 'gpp_bad'}
                    </span>
                    <div>{currentSim.astMessage}</div>
                  </div>

                  {/* Data Result Grid or Blocked Display */}
                  <div>
                    <label className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant block mb-3 select-none">
                      Pipeline Output Dataset
                    </label>

                    {currentSim.astPassed && currentSim.results ? (
                      <div className="overflow-x-auto border border-outline-variant/60 rounded-xl bg-surface">
                        <table className="min-w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-outline-variant/60 bg-surface-dim/40 text-on-surface-variant text-[10px] uppercase font-bold">
                              <th className="p-3">ID</th>
                              <th className="p-3">Name</th>
                              <th className="p-3">Email</th>
                              <th className="p-3">Phone</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/30 text-on-surface font-mono">
                            {currentSim.results[activeRole].map((row) => (
                              <tr key={row.id} className="hover:bg-surface-container-low/50 transition-colors">
                                <td className="p-3 text-on-surface-variant">{row.id}</td>
                                <td className="p-3 font-medium text-on-surface">{row.first} {row.last}</td>
                                <td className={`p-3 ${row.email === '[REDACTED]' ? 'text-error font-bold' : 'text-secondary'}`}>
                                  {row.email}
                                </td>
                                <td className={`p-3 ${row.phone === '[REDACTED]' ? 'text-error font-bold' : 'text-secondary'}`}>
                                  {row.phone}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 border border-dashed border-error/30 rounded-xl bg-error-container/20 select-none">
                        <span className="material-symbols-outlined text-error text-[40px] mb-2 animate-bounce">security_update_warning</span>
                        <div className="text-xs font-bold text-error uppercase tracking-wider">Statement Terminated</div>
                        <div className="text-center text-on-surface-variant text-xs mt-2 max-w-xs leading-relaxed">
                          Execution aborted before database transaction context. The compiler detected writing command sets.
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Footer Note */}
                <div className="mt-8 pt-4 border-t border-outline-variant/60 flex items-center gap-2 text-on-surface-variant text-[10px] select-none">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  Zero data is leaked. Role-based masking occurs immediately after AST validation.
                </div>

              </div>
              
            </div>
          </div>
        </section>
      </main>

      {/* Footer Section */}
      <footer className="w-full border-t border-outline-variant/60 bg-surface-dim py-12 mt-12 relative z-10 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-6">
          <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7.5 h-7.5 rounded bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-sm font-bold">database</span>
              </div>
              <span className="text-base text-on-surface font-extrabold">Veridian SQL</span>
            </div>
            
            <div className="flex flex-wrap justify-center gap-6 text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
              <span className="hover:text-primary transition-colors cursor-default">GDPR Masking Enforced</span>
              <span className="text-outline-variant hidden sm:inline">•</span>
              <span className="hover:text-primary transition-colors cursor-default">Zero-Trust Access Control</span>
              <span className="text-outline-variant hidden sm:inline">•</span>
              <span className="hover:text-primary transition-colors cursor-default">Read-Only Safety Hook</span>
            </div>
          </div>
          
          <div className="w-full border-t border-outline-variant/60 my-2" />
          
          <div className="flex flex-col sm:flex-row justify-between w-full text-xs text-on-surface-variant/70 gap-4">
            <p>© 2026 Veridian SQL. Built with FastAPI, LangGraph, and sqlglot.</p>
            <p className="flex items-center gap-1.5 font-bold text-on-surface-variant">
              <span className="material-symbols-outlined text-[13px] text-secondary">verified</span>
              Admin Control Center Active
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
