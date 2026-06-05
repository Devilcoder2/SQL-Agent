import React, { useState, useEffect, useRef } from 'react';

export default function StudioTab({
  fetch,
  query,
  queryResults,
  narrativeResponse
}) {
  const [studioSearch, setStudioSearch] = useState("");
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Re-plot chart when results change or component mounts
  useEffect(() => {
    renderChart();
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [queryResults]);

  // Filter studio dataset based on query results and local search query
  const filteredResults = queryResults?.filter(row => 
    Object.values(row).some(val => 
      String(val === null ? '' : val).toLowerCase().includes(studioSearch.toLowerCase())
    )
  ) || [];

  // --- Document Exporters ---
  const handleExportExcel = async () => {
    if (!queryResults) return;
    try {
      const res = await fetch("/api/v1/export/excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results: queryResults })
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `excel_report_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      alert("Excel export failed: " + err.message);
    }
  };

  const handleExportPDF = async () => {
    if (!queryResults) return;
    try {
      const res = await fetch("/api/v1/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query,
          narrative: narrativeResponse || "No summary brief compiled.",
          results: queryResults
        })
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics_brief_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      alert("PDF export failed: " + err.message);
    }
  };

  const handleDownloadCSV = () => {
    if (!queryResults || queryResults.length === 0) return;
    const headers = Object.keys(queryResults[0]).join(",");
    const rows = queryResults.map(row => 
      Object.values(row).map(val => {
        const text = String(val === null ? 'NULL' : val);
        return text.includes(',') ? `"${text}"` : text;
      }).join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sql_agent_result_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Chart.js Rendering Engine ---
  const renderChart = () => {
    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }

    if (!queryResults || queryResults.length === 0 || !chartRef.current) return;

    const firstRow = queryResults[0];
    const keys = Object.keys(firstRow);
    
    let labelKey = null;
    let valueKey = null;

    for (let key of keys) {
      const val = firstRow[key];
      if (typeof val === "string" && !labelKey) {
        labelKey = key;
      } else if (typeof val === "number" && !valueKey) {
        valueKey = key;
      }
    }

    if (!labelKey) labelKey = keys[0];
    if (!valueKey) {
      for (let key of keys) {
        if (key !== labelKey) {
          const parsed = parseFloat(firstRow[key]);
          if (!isNaN(parsed)) {
            valueKey = key;
            break;
          }
        }
      }
    }

    if (!valueKey) return;

    const labels = queryResults.map(row => row[labelKey]);
    const values = queryResults.map(row => {
      const v = row[valueKey];
      return typeof v === "number" ? v : parseFloat(v) || 0;
    });

    const ctx = chartRef.current.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, "rgba(180, 197, 255, 0.4)");
    gradient.addColorStop(1, "rgba(78, 222, 163, 0.05)");

    const ChartClass = window.Chart || Chart;
    if (!ChartClass) return;

    chartInstance.current = new ChartClass(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: valueKey,
          data: values,
          backgroundColor: gradient,
          borderColor: "#b4c5ff",
          borderWidth: 1.5,
          borderRadius: 6,
          hoverBackgroundColor: "rgba(180, 197, 255, 0.7)"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: { color: "#c3c6d7", font: { family: "Inter", size: 10 } }
          }
        },
        scales: {
          x: {
            grid: { color: "rgba(255, 255, 255, 0.03)" },
            ticks: { color: "#c3c6d7", font: { family: "Inter", size: 9 } }
          },
          y: {
            grid: { color: "rgba(255, 255, 255, 0.03)" },
            ticks: { color: "#c3c6d7", font: { family: "Inter", size: 9 } }
          }
        }
      }
    });
  };

  return (
    <div className="h-full w-full grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden text-left">
      
      {/* Left/Center Column: Results Data Grid */}
      <div className="glass-card rounded-2xl lg:col-span-2 flex flex-col h-full overflow-hidden border border-white/5 bg-[#0b1326]/20">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01] shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-base">table_chart</span>
              Tabular Results Grid
            </h3>
            <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] px-2 py-0.5 rounded font-bold">
              {filteredResults.length} Rows
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Filter grid rows..."
              value={studioSearch}
              onChange={e => setStudioSearch(e.target.value)}
              className="bg-[#020617] border border-white/5 text-xs px-2.5 py-1 rounded-lg text-white focus:outline-none placeholder-white/20 outline-none w-32 sm:w-40"
            />

            <button
              onClick={handleExportExcel}
              disabled={!queryResults}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">grid_on</span>
              Excel
            </button>

            <button
              onClick={handleExportPDF}
              disabled={!queryResults}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#4edea3]/20 bg-[#4edea3]/5 text-[#4edea3] hover:bg-[#4edea3]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
              PDF Report
            </button>

            <button
              onClick={handleDownloadCSV}
              disabled={!queryResults || queryResults.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              CSV
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-auto custom-scrollbar bg-[#020617]/50 h-full relative">
          {!queryResults ? (
            <div className="text-xs text-[#c3c6d7]/40 italic py-16 text-center select-none">
              No dataset loaded. Run a query in the Agent Console to preview results.
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="text-xs text-[#c3c6d7]/40 italic py-16 text-center select-none">
              No records match the current filter.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#131b2e]/60 text-primary uppercase tracking-wider font-bold sticky top-0 z-10 border-b border-white/5">
                <tr>
                  {Object.keys(queryResults[0]).map(k => (
                    <th key={k} className="px-4 py-3">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-[#eeefff] font-mono">
                {filteredResults.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors border-b border-white/5">
                    {Object.keys(queryResults[0]).map(k => {
                      const val = row[k];
                      const isRedacted = val === "[REDACTED]";
                      return (
                        <td key={k} className={`px-4 py-3 ${isRedacted ? 'text-red-400 font-bold' : ''}`}>
                          {val === null ? 'NULL' : String(val)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right Column: Visualizer Chart Canvas */}
      <div className="glass-card rounded-2xl flex flex-col h-full overflow-hidden border border-white/5 bg-[#0b1326]/20">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01] shrink-0">
          <h3 className="text-xs uppercase tracking-wider font-semibold text-secondary flex items-center gap-2">
            <span className="material-symbols-outlined text-base">analytics</span>
            Dynamic Visualizer
          </h3>
          <span className="bg-secondary/15 text-secondary border border-secondary/20 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
            Bar Chart
          </span>
        </div>
        
        <div className="flex-grow p-6 flex items-center justify-center relative overflow-hidden h-full">
          <canvas ref={chartRef} id="studio-chart" className="w-full h-full max-h-full"></canvas>
          {!queryResults && (
            <div className="absolute text-xs text-[#c3c6d7]/40 italic text-center select-none">
              Charts plot automatically when numerical keys are found.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
