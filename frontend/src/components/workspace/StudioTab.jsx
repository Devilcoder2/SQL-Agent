import React, { useState, useEffect, useRef } from 'react';

export default function StudioTab({
  fetch,
  query,
  queryResults,
  narrativeResponse,
  generatedSql
}) {
  const [studioSearch, setStudioSearch] = useState("");
  
  // Chart states
  const [chartType, setChartType] = useState("bar");
  const [xAxisColumn, setXAxisColumn] = useState("");
  const [yAxisColumn, setYAxisColumn] = useState("");
  
  // Pin states
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [widgetTitle, setWidgetTitle] = useState("");
  const [isPinning, setIsPinning] = useState(false);

  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Initialize and auto-detect columns
  useEffect(() => {
    if (queryResults && queryResults.length > 0) {
      const keys = Object.keys(queryResults[0]);
      
      let detectedX = "";
      let detectedY = "";
      
      // Auto-detect X-axis: first string/date column
      for (let key of keys) {
        const val = queryResults[0][key];
        if (typeof val === "string" && !detectedX) {
          detectedX = key;
        } else if (typeof val === "number" && !detectedY) {
          detectedY = key;
        }
      }
      
      if (!detectedX) detectedX = keys[0];
      if (!detectedY) {
        for (let key of keys) {
          if (key !== detectedX) {
            const parsed = parseFloat(queryResults[0][key]);
            if (!isNaN(parsed)) {
              detectedY = key;
              break;
            }
          }
        }
      }
      
      setXAxisColumn(detectedX);
      setYAxisColumn(detectedY || keys[1] || keys[0]);
      
      // Pre-fill widget title
      setWidgetTitle(query ? `Chart: ${query.substring(0, 40)}${query.length > 40 ? '...' : ''}` : "My Pinned Chart");
    }
  }, [queryResults, query]);

  // Re-plot chart when results or config change
  useEffect(() => {
    renderChart();
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [queryResults, chartType, xAxisColumn, yAxisColumn]);

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

  // Pin Visualizer Widget to Dashboard
  const handlePinWidget = async () => {
    if (!widgetTitle.trim()) return;
    setIsPinning(true);
    try {
      const res = await fetch("/api/v1/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: widgetTitle,
          chart_type: chartType,
          x_axis: xAxisColumn,
          y_axis: yAxisColumn,
          query: query || "Custom Query",
          generated_sql: generatedSql || "",
          narrative_response: narrativeResponse || ""
        })
      });
      if (res.ok) {
        alert("Chart successfully pinned to Dashboard!");
        setPinModalOpen(false);
      } else {
        const data = await res.json();
        alert("Failed to pin chart: " + (data.detail || "Unknown error"));
      }
    } catch (err) {
      alert("Error pinning chart: " + err.message);
    } finally {
      setIsPinning(false);
    }
  };

  // --- Chart.js Rendering Engine ---
  const renderChart = () => {
    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }

    if (!queryResults || queryResults.length === 0 || !chartRef.current || !xAxisColumn || !yAxisColumn) return;

    const labels = queryResults.map(row => String(row[xAxisColumn] === null ? 'NULL' : row[xAxisColumn]));
    const values = queryResults.map(row => {
      const v = row[yAxisColumn];
      return typeof v === "number" ? v : parseFloat(v) || 0;
    });

    const ctx = chartRef.current.getContext("2d");

    // Colors
    const palette = [
      "rgba(180, 197, 255, 0.75)", // primary
      "rgba(78, 222, 163, 0.75)",  // secondary
      "rgba(208, 188, 255, 0.75)", // tertiary
      "rgba(255, 180, 171, 0.75)", // error
      "rgba(255, 204, 128, 0.75)", // warn
      "rgba(128, 222, 234, 0.75)"  // info
    ];

    const borderPalette = [
      "#b4c5ff", "#4edea3", "#d0bcff", "#ffb4ab", "#ffcc80", "#80deea"
    ];

    // Background gradient for line/area
    const gradient = ctx.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, "rgba(180, 197, 255, 0.45)");
    gradient.addColorStop(1, "rgba(78, 222, 163, 0.02)");

    const isSingleColor = chartType === 'bar' || chartType === 'line';

    const ChartClass = window.Chart || Chart;
    if (!ChartClass) return;

    const datasetConfig = {
      label: yAxisColumn,
      data: values,
      backgroundColor: isSingleColor 
        ? (chartType === 'line' ? gradient : "rgba(180, 197, 255, 0.6)")
        : palette.slice(0, Math.max(labels.length, 6)),
      borderColor: isSingleColor 
        ? "#b4c5ff" 
        : borderPalette.slice(0, Math.max(labels.length, 6)),
      borderWidth: 1.5,
      borderRadius: chartType === 'bar' ? 6 : 0,
      hoverBackgroundColor: isSingleColor 
        ? "rgba(180, 197, 255, 0.8)" 
        : undefined
    };

    if (chartType === 'line') {
      datasetConfig.fill = true;
      datasetConfig.tension = 0.3;
      datasetConfig.pointBackgroundColor = "#4edea3";
      datasetConfig.pointBorderColor = "#ffffff";
      datasetConfig.pointHoverRadius = 6;
    }

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: chartType === 'doughnut' || chartType === 'pie' ? 'right' : 'top',
          labels: { color: "#c3c6d7", font: { family: "Inter", size: 10 } }
        }
      }
    };

    // Cartesian axes configuration (only for bar and line)
    if (chartType === 'bar' || chartType === 'line') {
      options.scales = {
        x: {
          grid: { color: "rgba(255, 255, 255, 0.03)" },
          ticks: { color: "#c3c6d7", font: { family: "Inter", size: 9 } }
        },
        y: {
          grid: { color: "rgba(255, 255, 255, 0.03)" },
          ticks: { color: "#c3c6d7", font: { family: "Inter", size: 9 } }
        }
      };
    }

    chartInstance.current = new ChartClass(ctx, {
      type: chartType,
      data: {
        labels: labels,
        datasets: [datasetConfig]
      },
      options: options
    });
  };

  // Extract column keys for axis selectors
  const datasetKeys = queryResults && queryResults.length > 0 ? Object.keys(queryResults[0]) : [];

  return (
    <div className="h-full w-full grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden text-left relative">
      
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
              className="bg-[#020617] border border-white/5 text-xs px-2.5 py-1.5 rounded-lg text-white focus:outline-none placeholder-white/20 outline-none w-32 sm:w-40"
            />

            <button
              onClick={handleExportExcel}
              disabled={!queryResults}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold cursor-pointer border-none"
            >
              <span className="material-symbols-outlined text-[16px]">grid_on</span>
              Excel
            </button>

            <button
              onClick={handleExportPDF}
              disabled={!queryResults}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#4edea3]/20 bg-[#4edea3]/5 text-[#4edea3] hover:bg-[#4edea3]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold cursor-pointer border-none"
            >
              <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
              PDF Report
            </button>

            <button
              onClick={handleDownloadCSV}
              disabled={!queryResults || queryResults.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold cursor-pointer border-none"
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

      {/* Right Column: Visualizer Chart Canvas & Axis Builders */}
      <div className="glass-card rounded-2xl flex flex-col h-full overflow-hidden border border-white/5 bg-[#0b1326]/20">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01] shrink-0">
          <h3 className="text-xs uppercase tracking-wider font-semibold text-secondary flex items-center gap-2">
            <span className="material-symbols-outlined text-base">analytics</span>
            Visualization Editor
          </h3>
          {queryResults && (
            <button
              onClick={() => setPinModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-secondary/10 hover:bg-secondary/20 border border-secondary/25 text-secondary rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all border-none"
              title="Pin this chart layout to Dashboard"
            >
              <span className="material-symbols-outlined text-xs">keep</span>
              Pin to Dashboard
            </button>
          )}
        </div>
        
        {/* Editor controls when data is loaded */}
        {queryResults && queryResults.length > 0 && (
          <div className="p-4 border-b border-white/5 bg-[#131b2e]/30 grid grid-cols-3 gap-3 shrink-0">
            {/* Chart Type Selector */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase font-bold text-white/50 tracking-wider">Type</label>
              <select
                value={chartType}
                onChange={e => setChartType(e.target.value)}
                className="bg-[#020617] border border-white/10 rounded-lg text-xs py-1 px-2 text-[#dae2fd] focus:outline-none outline-none cursor-pointer"
              >
                <option value="bar">Bar Chart</option>
                <option value="line">Line/Area</option>
                <option value="doughnut">Doughnut</option>
                <option value="pie">Pie Chart</option>
                <option value="polarArea">Polar Arc</option>
              </select>
            </div>
            {/* X Axis Selector */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase font-bold text-white/50 tracking-wider">X-Axis</label>
              <select
                value={xAxisColumn}
                onChange={e => setXAxisColumn(e.target.value)}
                className="bg-[#020617] border border-white/10 rounded-lg text-xs py-1 px-2 text-[#dae2fd] focus:outline-none outline-none cursor-pointer"
              >
                {datasetKeys.map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
            {/* Y Axis Selector */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase font-bold text-white/50 tracking-wider">Y-Axis</label>
              <select
                value={yAxisColumn}
                onChange={e => setYAxisColumn(e.target.value)}
                className="bg-[#020617] border border-white/10 rounded-lg text-xs py-1 px-2 text-[#dae2fd] focus:outline-none outline-none cursor-pointer"
              >
                {datasetKeys.map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="flex-grow p-6 flex items-center justify-center relative overflow-hidden h-full">
          <canvas ref={chartRef} id="studio-chart" className="w-full h-full max-h-full"></canvas>
          {!queryResults && (
            <div className="absolute text-xs text-[#c3c6d7]/40 italic text-center select-none max-w-[200px]">
              No charts plotted. Run a query in the Console and click Studio to activate.
            </div>
          )}
        </div>
      </div>

      {/* Pin to Dashboard Glass Modal */}
      {pinModalOpen && (
        <div className="fixed inset-0 bg-[#020617]/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl border border-white/10 bg-[#0b1326]/90 p-6 max-w-md w-full flex flex-col gap-4 animate-scale-in">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">keep</span>
                Pin Chart Widget
              </h3>
              <button
                onClick={() => setPinModalOpen(false)}
                className="text-[#c3c6d7] hover:text-white bg-transparent border-none cursor-pointer flex"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Widget Card Title</label>
              <input
                type="text"
                value={widgetTitle}
                onChange={e => setWidgetTitle(e.target.value)}
                className="bg-[#020617] border border-white/10 rounded-xl text-xs py-2 px-3 text-white outline-none focus:border-primary/50"
                placeholder="Name your chart widget..."
              />
            </div>

            <div className="p-3 bg-white/[0.01] border border-white/5 rounded-xl text-[11px] text-[#c3c6d7] leading-relaxed flex flex-col gap-1">
              <div><strong>Chart Settings:</strong></div>
              <div>• Type: <span className="text-secondary font-mono">{chartType}</span></div>
              <div>• Dimensions: <span className="text-primary font-mono">{xAxisColumn}</span> (X) × <span className="text-primary font-mono">{yAxisColumn}</span> (Y)</div>
              <div className="truncate mt-1">• Query: <span className="italic">"{query}"</span></div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setPinModalOpen(false)}
                className="px-4 py-2 border border-white/10 rounded-xl text-xs font-semibold text-[#c3c6d7] hover:text-white hover:bg-white/5 bg-transparent cursor-pointer transition border-none"
              >
                Cancel
              </button>
              <button
                onClick={handlePinWidget}
                disabled={isPinning || !widgetTitle.trim()}
                className="px-5 py-2 bg-gradient-to-r from-primary to-secondary text-[#020617] font-bold rounded-xl text-xs flex items-center gap-1 hover:shadow-lg hover:shadow-primary/10 active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer transition border-none"
              >
                {isPinning ? "Pinning..." : "Confirm Pin"}
                <span className="material-symbols-outlined text-sm font-extrabold">check</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
