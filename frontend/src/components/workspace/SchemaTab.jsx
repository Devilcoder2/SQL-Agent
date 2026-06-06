/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';


export default function SchemaTab({ fetch, activeDatabaseId, tableSearch }) {
  const [tables, setTables] = useState([]);
  const [tableSchemas, setTableSchemas] = useState({}); // { tableName: { columns: [], fkeys: [] } }
  const [expandedTables, setExpandedTables] = useState(new Set());

  // Glossary Form State
  const [gTerm, setGTerm] = useState("");
  const [gDef, setGDef] = useState("");
  const [gSql, setGSql] = useState("");
  const [isRegisteringGlossary, setIsRegisteringGlossary] = useState(false);

  // Glossary Search state
  const [glossarySearch, setGlossarySearch] = useState("");
  const [glossaryResults, setGlossaryResults] = useState([]);
  const [loadingGlossary, setLoadingGlossary] = useState(false);

  // Draggable Splitter States
  const [explorerWidth, setExplorerWidth] = useState(65); // percentage width of left schema panel
  const [isResizing, setIsResizing] = useState(false);

  const fetchTables = async () => {
    try {
      const res = await fetch("/api/v1/tables");
      if (!res.ok) throw new Error("Failed to load tables");
      const data = await res.json();
      setTables(data.tables || []);
    } catch (err) {
      console.error("Error fetching tables:", err);
    }
  };

  const searchGlossary = async (q) => {
    setLoadingGlossary(true);
    try {
      const res = await fetch(`/api/v1/glossary?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setGlossaryResults(data || []);
      }
    } catch (err) {
      console.error("Glossary search error:", err);
    } finally {
      setLoadingGlossary(false);
    }
  };

  useEffect(() => {
    fetchTables();
    setTableSchemas({});
    setExpandedTables(new Set());
    setGlossaryResults([]);
    setGlossarySearch("");
  }, [activeDatabaseId]);

  useEffect(() => {
    if (glossarySearch.trim()) {
      searchGlossary(glossarySearch);
    } else {
      setGlossaryResults([]);
    }
  }, [glossarySearch]);

  const loadTableColumns = async (tableName) => {
    if (tableSchemas[tableName]) return;
    try {
      const res = await fetch(`/api/v1/tables/${tableName}/schema`);
      if (!res.ok) throw new Error("Failed to load schema");
      const data = await res.json();
      setTableSchemas(prev => ({
        ...prev,
        [tableName]: {
          columns: data.columns || [],
          foreign_keys: data.foreign_keys || []
        }
      }));
    } catch (err) {
      console.error(`Error loading columns for ${tableName}:`, err);
    }
  };

  const toggleTableExpand = async (tableName) => {
    const nextExpanded = new Set(expandedTables);
    if (nextExpanded.has(tableName)) {
      nextExpanded.delete(tableName);
    } else {
      nextExpanded.add(tableName);
      await loadTableColumns(tableName);
    }
    setExpandedTables(nextExpanded);
  };

  const registerGlossary = async () => {
    if (!gTerm.trim() || !gDef.trim() || !gSql.trim()) {
      alert("Please fill in all glossary fields.");
      return;
    }
    setIsRegisteringGlossary(true);
    try {
      const res = await fetch("/api/v1/glossary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: gTerm, definition: gDef, sql_hint: gSql })
      });
      if (!res.ok) throw new Error("Failed to save glossary term");
      
      const termRegistered = gTerm;
      setGTerm("");
      setGDef("");
      setGSql("");
      alert(`Glossary term "${termRegistered}" successfully registered.`);
      
      // Auto trigger search to show registered item
      setGlossarySearch(termRegistered);
      searchGlossary(termRegistered);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsRegisteringGlossary(false);
    }
  };



  // Drag handles for vertical splitter percentage width
  const startResize = (e) => {
    e.preventDefault();
    setIsResizing(true);
    const container = e.currentTarget.parentElement;
    const containerWidth = container.getBoundingClientRect().width;
    
    const onMouseMove = (moveEvent) => {
      const containerRect = container.getBoundingClientRect();
      const deltaX = moveEvent.clientX - containerRect.left;
      const percentage = (deltaX / containerWidth) * 100;
      setExplorerWidth(Math.max(40, Math.min(80, percentage)));
    };
    
    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const filteredTables = tables.filter(t => 
    t.toLowerCase().includes(tableSearch.toLowerCase())
  );

  return (
    <div className="h-full w-full flex overflow-hidden text-left relative animate-fade-in gap-0">
      
      {/* Left Side: Introspection schema explorer list */}
      <div 
        style={{ width: `${explorerWidth}%` }}
        className="glass-card rounded-2xl flex flex-col h-full overflow-hidden shrink-0"
      >
        <div className="px-5 py-3.5 border-b border-outline-variant flex items-center justify-between bg-surface-dim/20 shrink-0 select-none">
          <div className="flex items-center gap-2">
            <h3 className="text-xs uppercase tracking-wider font-extrabold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-base">schema</span>
              Schema Introspection Explorer
            </h3>
            <span className="bg-primary/10 text-primary border border-primary/20 text-[9px] px-2 py-0.5 rounded font-extrabold">
              {tables.length} Tables
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={fetchTables} 
              className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer bg-transparent border-none flex p-1 rounded hover:bg-surface-container"
              title="Refresh database tables"
            >
              <span className="material-symbols-outlined text-sm">sync</span>
            </button>
          </div>
        </div>

        <div className="flex-grow p-5 overflow-y-auto space-y-3.5 custom-scrollbar h-full bg-surface-container-lowest/30">
          {tables.length === 0 ? (
            <div className="text-xs text-on-surface-variant/40 italic py-20 text-center select-none flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-3xl animate-spin text-primary">sync</span>
              <span>Reflecting connections & schema indices...</span>
            </div>
          ) : filteredTables.length === 0 ? (
            <div className="text-xs text-on-surface-variant/40 italic py-20 text-center select-none flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-3xl opacity-40">search_off</span>
              <span>No tables match search query</span>
            </div>
          ) : (
            filteredTables.map(table => {
              const isExpanded = expandedTables.has(table);
              const schema = tableSchemas[table];
              return (
                <div key={table} className="border border-outline-variant/60 bg-surface-dim/35 rounded-xl overflow-hidden text-left hover:border-primary/30 transition-colors">
                  <div 
                    onClick={() => toggleTableExpand(table)}
                    className="flex items-center justify-between p-3.5 hover:bg-surface-container-low/50 cursor-pointer duration-150 select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                        <span className="material-symbols-outlined text-sm font-extrabold">table_chart</span>
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-on-surface">{table}</span>
                    </div>
                    <span 
                      className="material-symbols-outlined text-sm text-on-surface-variant transition-transform"
                      style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    >
                      chevron_right
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="bg-surface border-t border-outline-variant/60 p-3.5 space-y-2 text-xs font-mono text-on-surface-variant divide-y divide-outline-variant/30">
                      {!schema ? (
                        <div className="text-[10px] italic text-on-surface-variant/40 px-2 py-1 flex items-center gap-2">
                          <span className="material-symbols-outlined text-xs animate-spin">sync</span>
                          Reflecting column details...
                        </div>
                      ) : (
                        schema.columns.map(col => {
                          const isPK = col.primary_key;
                          const fk = schema.foreign_keys.find(f => f.constrained_columns.includes(col.name));
                          return (
                            <div key={col.name} className="flex items-center justify-between px-3 py-2 hover:bg-surface-container rounded transition-all">
                              <div className="flex items-center gap-2">
                                <span className="text-on-surface font-bold">{col.name}</span>
                                <span className="text-[10px] text-on-surface-variant font-sans bg-surface-dim border border-outline-variant/60 px-1.5 py-0.5 rounded font-bold">{col.type}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {isPK && <span className="text-success text-[10px] font-sans font-bold border border-success/20 bg-success/5 px-1.5 py-0.5 rounded">🔑 PK</span>}
                                {fk && <span className="text-primary text-[10px] font-sans font-bold border border-primary/20 bg-primary/5 px-1.5 py-0.5 rounded cursor-help" title={`References ${fk.referred_table}`}>🔗 FK</span>}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Draggable vertical divider splitter */}
      <div 
        className={`resizer-handle ${isResizing ? 'is-dragging' : ''}`}
        onMouseDown={startResize}
      />

      {/* Right Side: Semantic glossary forms */}
      <div 
        style={{ width: `${100 - explorerWidth}%` }}
        className="glass-card rounded-2xl flex flex-col h-full overflow-hidden shrink-0"
      >
        <div className="px-5 py-3.5 border-b border-outline-variant bg-surface-dim/20 shrink-0 select-none">
          <h3 className="text-xs uppercase tracking-wider font-extrabold text-tertiary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">book_2</span>
            Map Vector Glossary
          </h3>
        </div>

        <div className="flex-grow overflow-y-auto p-5 space-y-5 custom-scrollbar h-full bg-surface-container-lowest/30 select-none">
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Associate fuzzy business vocabulary (e.g. synonym term) to exact database table columns (e.g. SQLite hint) to enable zero-shot AI compilation.
          </p>
          
          <div className="space-y-3.5 border border-outline-variant/60 bg-surface-dim/30 p-4.5 rounded-2xl">
            <div>
              <label className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1.5 tracking-wider">Synonym Term</label>
              <input 
                type="text" 
                placeholder="e.g. sales volume" 
                value={gTerm}
                onChange={e => setGTerm(e.target.value)}
                className="w-full bg-surface border border-outline/30 rounded-xl text-xs px-3.5 py-2.5 text-on-surface outline-none focus:border-primary/50 transition-colors placeholder-on-surface-variant/40"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1.5 tracking-wider">Business Definition</label>
              <input 
                type="text" 
                placeholder="e.g. Total price paid on customer invoices" 
                value={gDef}
                onChange={e => setGDef(e.target.value)}
                className="w-full bg-surface border border-outline/30 rounded-xl text-xs px-3.5 py-2.5 text-on-surface outline-none focus:border-primary/50 transition-colors placeholder-on-surface-variant/40"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1.5 tracking-wider">SQLite Column Target Hint</label>
              <input 
                type="text" 
                placeholder="e.g. Invoice.Total" 
                value={gSql}
                onChange={e => setGSql(e.target.value)}
                className="w-full bg-surface border border-outline/30 rounded-xl text-xs px-3.5 py-2.5 text-on-surface outline-none focus:border-primary/50 transition-colors placeholder-on-surface-variant/40 font-mono"
              />
            </div>

            <button 
              onClick={registerGlossary}
              disabled={isRegisteringGlossary}
              className="w-full bg-gradient-to-r from-primary to-secondary text-white py-2.5 rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-primary/10 transition-all active:scale-[0.98] border-none cursor-pointer disabled:opacity-50"
            >
              {isRegisteringGlossary ? 'Registering...' : 'Register Glossary Term'}
            </button>
          </div>

          {/* Business Glossary Term Search Explorer */}
          <div className="space-y-3 pt-3 border-t border-outline-variant/60">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-bold text-on-surface-variant block tracking-wider">Search Glossary</label>
              {loadingGlossary && <span className="material-symbols-outlined text-xs animate-spin text-tertiary">sync</span>}
            </div>
            <input 
              type="text" 
              placeholder="Query synonym term (e.g. sales)..."
              value={glossarySearch}
              onChange={e => setGlossarySearch(e.target.value)}
              className="w-full bg-surface border border-outline/30 rounded-xl text-xs px-3.5 py-2 text-on-surface outline-none focus:border-primary/50 transition-colors placeholder-on-surface-variant/40"
            />

            <div className="space-y-2 mt-2 max-h-56 overflow-y-auto custom-scrollbar">
              {glossaryResults.length > 0 ? (
                glossaryResults.map((g, idx) => (
                  <div key={idx} className="p-3 border border-outline-variant/60 bg-surface rounded-xl text-left space-y-1">
                    <div className="flex justify-between items-center text-xs font-extrabold text-on-surface">
                      <span>📘 {g.term}</span>
                      <span className="text-[9px] text-success font-mono">{(g.score * 100).toFixed(0)}% match</span>
                    </div>
                    <p className="text-[10px] text-on-surface-variant leading-relaxed">
                      {g.definition}
                    </p>
                    <div className="text-[9px] bg-surface-dim border border-outline-variant/60 py-1 px-2.5 rounded text-primary font-mono select-all">
                      Hint: {g.sql_hint}
                    </div>
                  </div>
                ))
              ) : glossarySearch.trim() && !loadingGlossary ? (
                <div className="text-[10px] text-on-surface-variant/40 italic text-center py-4">No matching glossary terms found.</div>
              ) : (
                <div className="text-[10px] text-on-surface-variant/40 italic text-center py-4">Search terms to inspect vector resolutions.</div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
