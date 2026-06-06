/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-undef */
/* eslint-disable no-useless-escape */
import { useState, useEffect, useRef } from 'react';

const renderMarkdown = (text) => {
  if (!text) return null;

  const lines = text.split('\n');
  const renderedElements = [];
  let currentList = [];

  const flushList = (key) => {
    if (currentList.length > 0) {
      renderedElements.push(
        <ul key={key} className="list-disc pl-5 mb-3 space-y-1.5">
          {currentList}
        </ul>
      );
      currentList = [];
    }
  };

  const parseInlineStyles = (lineText) => {
    const parts = lineText.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} className="text-on-surface font-extrabold">{part}</strong>;
      }
      return part;
    });
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList(`list-${idx}`);
      return;
    }

    const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      flushList(`list-${idx}`);
      const level = headerMatch[1].length;
      const headerText = headerMatch[2];
      const parsedText = parseInlineStyles(headerText);
      const classes = level === 1 ? "text-base font-bold text-on-surface mb-2" :
                      level === 2 ? "text-sm font-bold text-on-surface mb-2" :
                      "text-xs font-bold text-on-surface mb-1.5";
      const DynamicTag = `h${level}`;
      renderedElements.push(<DynamicTag key={idx} className={classes}>{parsedText}</DynamicTag>);
      return;
    }

    const listMatch = trimmed.match(/^[-*+]\s+(.*)$/);
    if (listMatch) {
      const itemText = listMatch[1];
      const parsedText = parseInlineStyles(itemText);
      currentList.push(<li key={`li-${idx}`} className="text-on-surface-variant text-xs sm:text-sm leading-relaxed">{parsedText}</li>);
      return;
    }

    flushList(`list-${idx}`);
    const parsedText = parseInlineStyles(trimmed);
    renderedElements.push(<p key={idx} className="mb-2 text-on-surface-variant text-xs sm:text-sm leading-relaxed">{parsedText}</p>);
  });

  flushList(`list-final`);
  return <div className="space-y-1 text-left">{renderedElements}</div>;
};

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

  // Drag split states
  const [editorWidth, setEditorWidth] = useState(380);
  const [editorOpen, setEditorOpen] = useState(true);
  const [isResizing, setIsResizing] = useState(false);

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

  // --- Chart.js Rendering Engine ---
  function renderChart() {
    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }

    if (!queryResults || queryResults.length === 0 || !chartRef.current || !xAxisColumn || !yAxisColumn || !editorOpen) return;

    const labels = queryResults.map(row => String(row[xAxisColumn] === null ? 'NULL' : row[xAxisColumn]));
    const values = queryResults.map(row => {
      const v = row[yAxisColumn];
      return typeof v === "number" ? v : parseFloat(v) || 0;
    });

    const ctx = chartRef.current.getContext("2d");

    // Veridian Light Accent palette (Forest green, Terracotta, Ochre, Sage, Charcoal, Clay)
    const palette = [
      "rgba(31, 111, 68, 0.75)",   // forest green
      "rgba(200, 90, 50, 0.75)",   // terracotta
      "rgba(217, 119, 6, 0.75)",    // ochre
      "rgba(82, 183, 136, 0.75)",  // sage green
      "rgba(92, 86, 79, 0.75)",    // charcoal
      "rgba(227, 222, 203, 0.75)"  // clay
    ];

    const borderPalette = [
      "#1f6f44", "#c85a32", "#d97706", "#52b788", "#5c564f", "#e3decb"
    ];

    // Background gradient for line/area
    const gradient = ctx.createLinearGradient(0, 0, 0, 240);
    gradient.addColorStop(0, "rgba(31, 111, 68, 0.45)");
    gradient.addColorStop(1, "rgba(200, 90, 50, 0.02)");

    const isSingleColor = chartType === 'bar' || chartType === 'line';

    const ChartClass = window.Chart || Chart;
    if (!ChartClass) return;

    const datasetConfig = {
      label: yAxisColumn,
      data: values,
      backgroundColor: isSingleColor 
        ? (chartType === 'line' ? gradient : "rgba(31, 111, 68, 0.5)")
        : palette.slice(0, Math.max(labels.length, 6)),
      borderColor: isSingleColor 
        ? "#1f6f44" 
        : borderPalette.slice(0, Math.max(labels.length, 6)),
      borderWidth: 1.5,
      borderRadius: chartType === 'bar' ? 5 : 0,
      hoverBackgroundColor: isSingleColor 
        ? "rgba(31, 111, 68, 0.7)" 
        : undefined
    };

    if (chartType === 'line') {
      datasetConfig.fill = true;
      datasetConfig.tension = 0.35;
      datasetConfig.pointBackgroundColor = "#c85a32";
      datasetConfig.pointBorderColor = "#ffffff";
      datasetConfig.pointHoverRadius = 5;
    }

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: chartType === 'doughnut' || chartType === 'pie' ? 'right' : 'top',
          labels: { color: "#5c564f", font: { family: "Inter", size: 10 } }
        }
      }
    };

    // Cartesian axes configuration (only for bar and line)
    if (chartType === 'bar' || chartType === 'line') {
      options.scales = {
        x: {
          grid: { color: "rgba(0, 0, 0, 0.03)" },
          ticks: { color: "#5c564f", font: { family: "Inter", size: 9 } }
        },
        y: {
          grid: { color: "rgba(0, 0, 0, 0.03)" },
          ticks: { color: "#5c564f", font: { family: "Inter", size: 9 } }
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
  }

  // Re-plot chart when results or config change
  useEffect(() => {
    renderChart();
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [queryResults, chartType, xAxisColumn, yAxisColumn, editorOpen, editorWidth]);

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



  // Helper to highlight search term match in grid table
  const highlightText = (text, highlight) => {
    if (!highlight.trim()) return text;
    const parts = String(text === null ? 'NULL' : text).split(new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === highlight.toLowerCase() 
        ? <mark key={index} className="bg-amber-500/25 text-amber-200 px-0.5 rounded">{part}</mark> 
        : part
    );
  };

  // Drag Resizer Handlers
  const startResize = (e) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startW = editorWidth;
    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      setEditorWidth(Math.max(280, Math.min(600, startW - deltaX)));
    };
    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Extract column keys for axis selectors
  const datasetKeys = queryResults && queryResults.length > 0 ? Object.keys(queryResults[0]) : [];

  return (
    <div className="h-full w-full flex overflow-hidden text-left relative gap-0 animate-fade-in">
      
      {/* Left/Center Column: Results Data Grid */}
      <div className="glass-card rounded-2xl flex-grow flex flex-col h-full overflow-hidden">
        <div className="px-5 py-3.5 border-b border-outline-variant flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-surface-dim/20 shrink-0 gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-xs uppercase tracking-wider font-extrabold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-base">table_chart</span>
              Tabular Results Grid
            </h3>
            <span className="bg-primary/10 text-primary border border-primary/20 text-[9px] px-2 py-0.5 rounded font-extrabold">
              {filteredResults.length} Rows
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
            <input
              type="text"
              placeholder="Filter grid columns..."
              value={studioSearch}
              onChange={e => setStudioSearch(e.target.value)}
              className="bg-surface border border-outline/30 text-xs px-3 py-1.5 rounded-xl text-on-surface focus:outline-none placeholder-on-surface-variant/40 outline-none w-full sm:w-36 md:w-44 focus:border-primary/50 transition-colors"
            />

            <button
              onClick={handleExportExcel}
              disabled={!queryResults}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-primary/20 bg-primary/5 text-primary hover:bg-primary/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">grid_on</span>
              Excel
            </button>

            <button
              onClick={handleExportPDF}
              disabled={!queryResults}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-success/20 bg-success/5 text-success hover:bg-success/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
              PDF Report
            </button>

            <button
              onClick={handleDownloadCSV}
              disabled={!queryResults || queryResults.length === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-outline/30 bg-surface-dim text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              CSV
            </button>

            <button
              onClick={() => setEditorOpen(!editorOpen)}
              className="text-on-surface-variant hover:text-primary transition-colors bg-transparent border-none cursor-pointer flex items-center p-1 rounded hover:bg-surface-container"
              title={editorOpen ? "Collapse Chart Visualizer" : "Expand Chart Visualizer"}
            >
              <span className="material-symbols-outlined text-base">
                {editorOpen ? "right_panel_close" : "analytics"}
              </span>
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-auto custom-scrollbar h-full relative">
          {!queryResults ? (
            <div className="text-xs text-on-surface-variant/40 italic py-20 text-center select-none flex flex-col items-center justify-center gap-2 h-full">
              <span className="material-symbols-outlined text-3xl opacity-40">grid_on</span>
              <span>No dataset records loaded. Run a query in the Agent Console to preview results here.</span>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="text-xs text-on-surface-variant/40 italic py-20 text-center select-none flex flex-col items-center justify-center gap-2 h-full">
              <span className="material-symbols-outlined text-3xl opacity-40">search_off</span>
              <span>No records match the current filter terms.</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-surface-dim border-b border-outline-variant/60 text-primary uppercase tracking-wider font-extrabold sticky top-0 z-10">
                <tr>
                  {Object.keys(queryResults[0]).map(k => (
                    <th key={k} className="px-4.5 py-3">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 text-on-surface font-mono">
                {filteredResults.map((row, idx) => (
                  <tr key={idx} className="hover:bg-surface-container-low/50 transition-colors border-b border-outline-variant/30">
                    {Object.keys(queryResults[0]).map(k => {
                      const val = row[k];
                      const isRedacted = val === "[REDACTED]";
                      return (
                        <td key={k} className={`px-4.5 py-3 ${isRedacted ? 'text-error font-bold' : ''}`}>
                          {val === null ? 'NULL' : highlightText(val, studioSearch)}
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

      {/* Draggable Splitter Handle */}
      {editorOpen && (
        <div 
          className={`resizer-handle ${isResizing ? 'is-dragging' : ''}`}
          onMouseDown={startResize}
        />
      )}

      {/* Right Column: Visualizer Chart Canvas & Axis Builders */}
      {editorOpen && (
        <div 
          style={{ width: `${editorWidth}px` }}
          className="glass-card rounded-2xl flex flex-col h-full overflow-hidden shrink-0 ml-1.5"
        >
          <div className="px-5 py-3.5 border-b border-outline-variant flex items-center justify-between bg-surface-dim/20 shrink-0 select-none">
            <h3 className="text-xs uppercase tracking-wider font-extrabold text-secondary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">analytics</span>
              Visualizer Editor
            </h3>
            {queryResults && (
              <button
                onClick={() => setPinModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/15 hover:bg-secondary/25 border border-secondary/20 text-secondary rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all active:scale-95"
                title="Pin this chart layout to Dashboard"
              >
                <span className="material-symbols-outlined text-xs font-bold">keep</span>
                Pin Chart
              </button>
            )}
          </div>
          
          {/* Editor controls when data is loaded */}
          {queryResults && queryResults.length > 0 && (
            <div className="p-4.5 border-b border-outline-variant/60 bg-surface-dim/40 grid grid-cols-3 gap-3 shrink-0 select-none">
              {/* Chart Type Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase font-bold text-on-surface-variant tracking-wider">Type</label>
                <select
                  value={chartType}
                  onChange={e => setChartType(e.target.value)}
                  className="bg-surface border border-outline/30 rounded-xl text-xs py-1.5 px-2 text-on-surface focus:outline-none outline-none cursor-pointer focus:border-primary/50 transition-colors"
                >
                  <option value="bar">Bar Chart</option>
                  <option value="line">Line / Area</option>
                  <option value="doughnut">Doughnut</option>
                  <option value="pie">Pie Chart</option>
                  <option value="polarArea">Polar Arc</option>
                </select>
              </div>
              {/* X Axis Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase font-bold text-on-surface-variant tracking-wider">X-Axis</label>
                <select
                  value={xAxisColumn}
                  onChange={e => setXAxisColumn(e.target.value)}
                  className="bg-surface border border-outline/30 rounded-xl text-xs py-1.5 px-2 text-on-surface focus:outline-none outline-none cursor-pointer focus:border-primary/50 transition-colors"
                >
                  {datasetKeys.map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
              {/* Y Axis Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase font-bold text-on-surface-variant tracking-wider">Y-Axis</label>
                <select
                  value={yAxisColumn}
                  onChange={e => setYAxisColumn(e.target.value)}
                  className="bg-surface border border-outline/30 rounded-xl text-xs py-1.5 px-2 text-on-surface focus:outline-none outline-none cursor-pointer focus:border-primary/50 transition-colors"
                >
                  {datasetKeys.map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="flex-grow p-5 flex items-center justify-center relative overflow-hidden h-full bg-surface-container-lowest/30">
            <canvas ref={chartRef} id="studio-chart" className="w-full h-full max-h-full"></canvas>
            {!queryResults && (
              <div className="absolute text-xs text-on-surface-variant/40 italic text-center select-none max-w-[220px] flex flex-col items-center gap-1.5">
                <span className="material-symbols-outlined text-3xl opacity-40">bar_chart</span>
                <span>No charts plotted. Run a query in the Console first, then open Studio to chart.</span>
              </div>
            )}
          </div>

          {/* Executive Narrative Block */}
          <div className="h-[220px] border-t border-outline-variant flex flex-col overflow-hidden bg-surface shrink-0">
            <div className="px-4.5 py-3 border-b border-outline-variant bg-surface-dim select-none">
              <h3 className="text-[10px] uppercase tracking-wider font-extrabold text-tertiary flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">subject</span>
                Executive Narrative Brief
              </h3>
            </div>
            <div className="flex-grow p-4.5 overflow-y-auto custom-scrollbar text-xs leading-relaxed text-on-surface-variant">
              {!narrativeResponse ? (
                <div className="text-on-surface-variant/30 italic text-center py-6 select-none flex flex-col items-center justify-center h-full gap-1">
                  <span className="material-symbols-outlined text-2xl opacity-40">find_in_page</span>
                  <span>No report compiled. Run a successful query in the Console to view narrative details.</span>
                </div>
              ) : (
                <div className="font-sans leading-relaxed">
                  {renderMarkdown(narrativeResponse)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pin to Dashboard Glass Modal */}
      {pinModalOpen && (
        <div className="fixed inset-0 bg-[#1e1b18]/45 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card rounded-2xl p-6 max-w-md w-full flex flex-col gap-4.5 animate-scale-in text-left">
            <div className="flex justify-between items-center pb-2 border-b border-outline-variant/60">
              <h3 className="text-sm font-bold uppercase tracking-wider text-secondary flex items-center gap-2">
                <span className="material-symbols-outlined text-base">keep</span>
                Pin Chart Widget
              </h3>
              <button
                onClick={() => setPinModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface bg-transparent border-none cursor-pointer flex p-1 rounded hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Widget Card Title</label>
              <input
                type="text"
                value={widgetTitle}
                onChange={e => setWidgetTitle(e.target.value)}
                className="bg-surface border border-outline/30 rounded-xl text-xs py-2.5 px-3.5 text-on-surface outline-none focus:border-primary/50 transition-colors placeholder-on-surface-variant/40"
                placeholder="Name your chart widget..."
              />
            </div>

            <div className="p-3.5 bg-surface-dim/40 border border-outline-variant/60 rounded-xl text-xs text-on-surface-variant leading-relaxed flex flex-col gap-1.5 font-sans">
              <div><strong>Chart Configurations:</strong></div>
              <div>• Chart Layout Type: <span className="text-secondary font-mono font-bold capitalize">{chartType}</span></div>
              <div>• Render Axes: <span className="text-primary font-mono font-bold">{xAxisColumn}</span> (X) × <span className="text-primary font-mono font-bold">{yAxisColumn}</span> (Y)</div>
              <div className="truncate mt-1">• Chat Query context: <span className="italic">"{query || "Custom Query"}"</span></div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setPinModalOpen(false)}
                className="px-4.5 py-2.5 border border-outline/30 rounded-xl text-xs font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-container bg-transparent cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                onClick={handlePinWidget}
                disabled={isPinning || !widgetTitle.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-xl text-xs flex items-center gap-1.5 hover:shadow-lg active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer transition"
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
