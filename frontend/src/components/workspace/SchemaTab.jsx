import React, { useState, useEffect } from 'react';

export default function SchemaTab({ fetch }) {
  const [tables, setTables] = useState([]);
  const [tableSchemas, setTableSchemas] = useState({}); // { tableName: { columns: [], fkeys: [] } }
  const [expandedTables, setExpandedTables] = useState(new Set());
  
  const [gTerm, setGTerm] = useState("");
  const [gDef, setGDef] = useState("");
  const [gSql, setGSql] = useState("");
  const [isRegisteringGlossary, setIsRegisteringGlossary] = useState(false);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const res = await fetch("/api/v1/tables");
      if (!res.ok) throw new Error("Failed to load tables");
      const data = await res.json();
      setTables(data.tables);
    } catch (err) {
      console.error("Error fetching tables:", err);
    }
  };

  const loadTableColumns = async (tableName) => {
    if (tableSchemas[tableName]) return;
    try {
      const res = await fetch(`/api/v1/tables/${tableName}/schema`);
      if (!res.ok) throw new Error("Failed to load schema");
      const data = await res.json();
      setTableSchemas(prev => ({
        ...prev,
        [tableName]: {
          columns: data.columns,
          foreign_keys: data.foreign_keys
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
      setGTerm("");
      setGDef("");
      setGSql("");
      alert(`Glossary term "${gTerm}" successfully registered.`);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsRegisteringGlossary(false);
    }
  };

  return (
    <div className="h-full w-full grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden text-left">
      
      {/* Left Side: Introspection schema explorer list (Col span 8) */}
      <div className="glass-card rounded-2xl lg:col-span-8 flex flex-col h-full overflow-hidden border border-white/5 bg-[#0b1326]/20">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01] shrink-0">
          <h3 className="text-xs uppercase tracking-wider font-semibold text-[#b4c5ff] flex items-center gap-2">
            <span className="material-symbols-outlined text-base">table_rows</span>
            SQLite Database Schema Explorer
          </h3>
          <button onClick={fetchTables} className="text-[#c3c6d7] hover:text-white transition-colors cursor-pointer bg-transparent border-none">
            <span className="material-symbols-outlined text-sm">sync</span>
          </button>
        </div>

        <div className="flex-grow p-6 overflow-y-auto space-y-3 custom-scrollbar h-full bg-[#020617]/25">
          {tables.length === 0 ? (
            <div className="text-xs text-on-surface-variant/40 italic py-16 text-center select-none">
              Connecting and introspection...
            </div>
          ) : (
            tables.map(table => {
              const isExpanded = expandedTables.has(table);
              const schema = tableSchemas[table];
              return (
                <div key={table} className="border border-white/5 bg-[#0b1326]/40 rounded-xl overflow-hidden text-left">
                  <div 
                    onClick={() => toggleTableExpand(table)}
                    className="flex items-center justify-between p-3.5 hover:bg-white/[0.02] cursor-pointer duration-150 select-none"
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#4edea3] text-[18px]">table_chart</span>
                      <span className="text-xs sm:text-sm font-semibold text-white">{table}</span>
                    </div>
                    <span 
                      className="material-symbols-outlined text-sm text-[#c3c6d7] transition-transform"
                      style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    >
                      chevron_right
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="bg-[#020617] border-t border-white/5 p-3 space-y-1.5 text-xs font-mono text-[#c3c6d7] divide-y divide-white/[0.02]">
                      {!schema ? (
                        <div className="text-[10px] italic text-[#c3c6d7]/40 px-2 py-1">Loading columns...</div>
                      ) : (
                        schema.columns.map(col => {
                          const isPK = col.primary_key;
                          const fk = schema.foreign_keys.find(f => f.constrained_columns.includes(col.name));
                          return (
                            <div key={col.name} className="flex items-center px-3 py-2 hover:bg-white/5 rounded transition-all">
                              <span className="text-white font-medium">{col.name}</span>
                              <span className="text-[10px] text-white/30 ml-2 font-sans">{col.type}</span>
                              {isPK && <span className="text-secondary text-[10px] ml-auto font-sans font-bold border border-secondary/20 bg-secondary/5 px-1.5 py-0.5 rounded">🔑 PK</span>}
                              {fk && <span className="text-primary text-[10px] ml-auto font-sans font-bold border border-primary/20 bg-primary/5 px-1.5 py-0.5 rounded cursor-help" title={`References ${fk.referred_table}`}>🔗 FK</span>}
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

      {/* Right Side: Semantic glossary forms (Col span 4) */}
      <div className="glass-card rounded-2xl lg:col-span-4 flex flex-col h-full overflow-hidden border border-white/5 bg-[#0b1326]/20">
        <div className="px-5 py-4 border-b border-white/5 bg-white/[0.01] shrink-0">
          <h3 className="text-xs uppercase tracking-wider font-semibold text-tertiary flex items-center gap-2">
            <span className="material-symbols-outlined text-base">book_2</span>
            Map Vector Glossary
          </h3>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Associate fuzzy corporate vocabulary synonyms to exact database columns to assist AI parsing logic (e.g. mapping "sales" to `Invoice.Total`).
          </p>
          
          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-white/40 block mb-1">Synonym Term</label>
              <input 
                type="text" 
                placeholder="e.g. quarterly sales" 
                value={gTerm}
                onChange={e => setGTerm(e.target.value)}
                className="w-full bg-[#020617] border border-white/5 rounded-lg text-xs px-3 py-2 text-white outline-none focus:border-primary/50"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-white/40 block mb-1">Business Definition</label>
              <input 
                type="text" 
                placeholder="e.g. Total price paid on customer invoices" 
                value={gDef}
                onChange={e => setGDef(e.target.value)}
                className="w-full bg-[#020617] border border-white/5 rounded-lg text-xs px-3 py-2 text-white outline-none focus:border-primary/50"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-white/40 block mb-1">SQLite Target Column Hint</label>
              <input 
                type="text" 
                placeholder="e.g. Invoice.Total" 
                value={gSql}
                onChange={e => setGSql(e.target.value)}
                className="w-full bg-[#020617] border border-white/5 rounded-lg text-xs px-3 py-2 text-white outline-none focus:border-primary/50"
              />
            </div>

            <button 
              onClick={registerGlossary}
              disabled={isRegisteringGlossary}
              className="w-full mt-2 bg-gradient-to-r from-primary to-secondary text-[#020617] py-2.5 rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-primary/5 transition-all active:scale-[0.98] border-none cursor-pointer"
            >
              {isRegisteringGlossary ? 'Registering...' : 'Register Glossary Term'}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
