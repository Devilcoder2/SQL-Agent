import React, { useState, useEffect, useRef } from 'react';

// Child component to manage its own chart canvas lifecycle
function DashboardWidgetCard({ widget, onDelete }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [showMetrics, setShowMetrics] = useState(false);

  useEffect(() => {
    renderWidgetChart();
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [widget.results, widget.chart_type, widget.x_axis, widget.y_axis]);

  const renderWidgetChart = () => {
    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }

    if (!chartRef.current || !widget.results || widget.results.length === 0) return;

    const labels = widget.results.map(row => String(row[widget.x_axis] === null ? 'NULL' : row[widget.x_axis]));
    const values = widget.results.map(row => {
      const v = row[widget.y_axis];
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

    const gradient = ctx.createLinearGradient(0, 0, 0, 150);
    gradient.addColorStop(0, "rgba(180, 197, 255, 0.45)");
    gradient.addColorStop(1, "rgba(78, 222, 163, 0.02)");

    const isSingleColor = widget.chart_type === 'bar' || widget.chart_type === 'line';

    const datasetConfig = {
      label: widget.y_axis,
      data: values,
      backgroundColor: isSingleColor
        ? (widget.chart_type === 'line' ? gradient : "rgba(180, 197, 255, 0.6)")
        : palette.slice(0, Math.max(labels.length, 6)),
      borderColor: isSingleColor
        ? "#b4c5ff"
        : borderPalette.slice(0, Math.max(labels.length, 6)),
      borderWidth: 1.5,
      borderRadius: widget.chart_type === 'bar' ? 6 : 0
    };

    if (widget.chart_type === 'line') {
      datasetConfig.fill = true;
      datasetConfig.tension = 0.3;
      datasetConfig.pointBackgroundColor = "#4edea3";
      datasetConfig.pointBorderColor = "#ffffff";
    }

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: widget.chart_type === 'doughnut' || widget.chart_type === 'pie' ? 'right' : 'top',
          labels: { color: "#c3c6d7", font: { family: "Inter", size: 9 } }
        }
      }
    };

    if (widget.chart_type === 'bar' || widget.chart_type === 'line') {
      options.scales = {
        x: {
          grid: { color: "rgba(255, 255, 255, 0.02)" },
          ticks: { color: "#c3c6d7", font: { family: "Inter", size: 8 } }
        },
        y: {
          grid: { color: "rgba(255, 255, 255, 0.02)" },
          ticks: { color: "#c3c6d7", font: { family: "Inter", size: 8 } }
        }
      };
    }

    const ChartClass = window.Chart || Chart;
    if (!ChartClass) return;

    chartInstance.current = new ChartClass(ctx, {
      type: widget.chart_type,
      data: {
        labels: labels,
        datasets: [datasetConfig]
      },
      options: options
    });
  };

  return (
    <div className="glass-card rounded-2xl border border-white/5 bg-[#0b1326]/20 flex flex-col h-[400px] overflow-hidden hover:translate-y-0 transition-transform">
      {/* Card Header */}
      <div className="px-5 py-3.5 border-b border-white/5 flex justify-between items-center bg-white/[0.01] shrink-0 select-none">
        <h4 className="text-xs font-bold uppercase tracking-wider text-white truncate max-w-[50%]" title={widget.title}>
          {widget.title}
        </h4>
        <div className="flex items-center gap-3">
          {/* Pill Toggle Button */}
          <div className="flex bg-[#131b2e] p-0.5 rounded-lg border border-white/5 text-[9px] font-bold uppercase select-none shrink-0">
            <button
              onClick={() => setShowMetrics(false)}
              className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer border-none text-[9px] font-bold ${
                !showMetrics ? "bg-primary text-[#020617]" : "text-[#c3c6d7] hover:text-white"
              }`}
            >
              Chart
            </button>
            <button
              onClick={() => setShowMetrics(true)}
              className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer border-none text-[9px] font-bold ${
                showMetrics ? "bg-primary text-[#020617]" : "text-[#c3c6d7] hover:text-white"
              }`}
            >
              Details
            </button>
          </div>

          <button
            onClick={() => onDelete(widget.id)}
            className="text-[#c3c6d7] hover:text-red-400 p-1 rounded hover:bg-white/5 transition-colors cursor-pointer bg-transparent border-none flex shrink-0"
            title="Unpin Chart Widget"
          >
            <span className="material-symbols-outlined text-base">delete</span>
          </button>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex-1 p-5 relative overflow-hidden flex items-center justify-center">
        {/* The canvas/error wrappers are always kept mounted in the DOM */}
        <div className="w-full h-full">
          {widget.error ? (
            <div className="flex flex-col items-center justify-center text-center p-4 max-w-xs space-y-2 h-full justify-center">
              <span className="material-symbols-outlined text-red-400 text-3xl">report_problem</span>
              <div className="text-xs font-bold text-white uppercase tracking-wider">Query Execution Failed</div>
              <div className="text-[10px] text-red-300 font-mono line-clamp-3 leading-normal">
                {widget.error}
              </div>
            </div>
          ) : !widget.results || widget.results.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-4 space-y-1 select-none h-full justify-center">
              <span className="material-symbols-outlined text-white/20 text-3xl">dataset</span>
              <div className="text-xs font-semibold text-white/40">No dataset records found.</div>
            </div>
          ) : (
            <canvas ref={chartRef} className="w-full h-full max-h-full"></canvas>
          )}
        </div>

        {/* The metrics details panel overlays the canvas wrapper when active */}
        {showMetrics && (
          <div className="absolute inset-0 bg-[#020617]/95 p-5 overflow-y-auto custom-scrollbar text-[11px] leading-relaxed text-left flex flex-col gap-3 z-10 animate-fade-in">
            <div>
              <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider">Natural Query</span>
              <p className="text-[#dae2fd] italic">"{widget.query}"</p>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider">Generated Safe SQL</span>
              <pre className="bg-[#0b1326] p-2.5 rounded-lg border border-white/5 text-[10px] font-mono text-[#eeefff] overflow-x-auto whitespace-pre custom-scrollbar">
                {widget.generated_sql}
              </pre>
            </div>
            {widget.narrative_response && (
              <div>
                <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider">Executive Insight</span>
                <p className="text-[#c3c6d7]">{widget.narrative_response}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardTab({ fetch, activeDatabaseId, setWorkspaceTab }) {
  const [widgets, setWidgets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    fetchWidgets();
  }, [activeDatabaseId]);

  // Handle auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchWidgets(false); // background refresh
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, activeDatabaseId]);

  const fetchWidgets = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const res = await fetch("/api/v1/dashboard");
      if (res.ok) {
        const data = await res.json();
        setWidgets(data.widgets || []);
      }
    } catch (err) {
      console.error("Error loading dashboard widgets:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteWidget = async (widgetId) => {
    if (!window.confirm("Are you sure you want to unpin this chart from the Dashboard?")) return;
    try {
      const res = await fetch(`/api/v1/dashboard/${widgetId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setWidgets(prev => prev.filter(w => w.id !== widgetId));
      } else {
        alert("Failed to unpin widget.");
      }
    } catch (err) {
      console.error("Failed to delete widget:", err);
    }
  };

  return (
    <div className="h-full w-full flex flex-col gap-6 overflow-hidden text-left animate-fade-in">
      
      {/* Dashboard Top Header Control Panel */}
      <div className="glass-card rounded-2xl p-5 border border-white/5 bg-[#0b1326]/20 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 select-none">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">space_dashboard</span>
            Executive Analytical Dashboard
          </h3>
          <p className="text-xs text-[#c3c6d7] mt-1">
            Real-time charts executing queries dynamically on database connection: <span className="text-primary font-bold">{activeDatabaseId === "default" ? "Chinook Default" : `Connection #${activeDatabaseId}`}</span>
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {/* Auto refresh toggler */}
          <div className="flex items-center gap-2 bg-[#131b2e] px-3.5 py-2 rounded-xl border border-white/5">
            <span className="text-xs text-[#c3c6d7] font-semibold">Auto-Refresh (30s)</span>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`w-7 h-4 rounded-full p-0.5 transition-colors cursor-pointer border-none ${
                autoRefresh ? "bg-secondary" : "bg-white/20"
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full bg-[#020617] transform transition-transform duration-200 ${
                  autoRefresh ? "translate-x-3" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <button
            onClick={() => fetchWidgets(true)}
            className="flex items-center gap-2 px-4 py-2 border border-white/10 hover:border-white/20 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition cursor-pointer border-none"
            title="Refresh database data"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {/* Main widgets container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        {isLoading ? (
          <div className="h-full w-full flex items-center justify-center py-20 select-none">
            <div className="flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-primary text-4xl animate-spin">sync</span>
              <span className="text-xs text-[#c3c6d7]/60 font-semibold uppercase tracking-wider">Compiling live analytics...</span>
            </div>
          </div>
        ) : widgets.length === 0 ? (
          // Empty State view
          <div className="glass-card rounded-2xl py-16 px-6 border border-white/5 bg-[#0b1326]/10 flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-6 mt-10 animate-fade-in select-none">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(180,197,255,0.1)]">
              <span className="material-symbols-outlined text-3xl">space_dashboard</span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
                Your Dashboard is Empty
              </h4>
              <p className="text-xs text-[#c3c6d7] leading-relaxed max-w-sm">
                No visualization cards have been pinned to this database context yet. Build custom bar, line, or pie charts and pin them here.
              </p>
            </div>
            <button
              onClick={() => setWorkspaceTab("console")}
              className="bg-gradient-to-r from-primary to-secondary text-[#020617] font-bold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 hover:shadow-[0_0_15px_rgba(180,197,255,0.25)] hover:scale-102 active:scale-95 transition-all cursor-pointer border-none"
            >
              <span>Build Pinned Visuals</span>
              <span className="material-symbols-outlined text-sm font-extrabold">arrow_forward_ios</span>
            </button>
          </div>
        ) : (
          // Grid layout displaying charts
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-6">
            {widgets.map(w => (
              <DashboardWidgetCard key={w.id} widget={w} onDelete={deleteWidget} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
