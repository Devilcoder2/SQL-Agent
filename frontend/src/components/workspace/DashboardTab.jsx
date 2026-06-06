/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from 'react';

// Child component to manage its own chart canvas lifecycle
function DashboardWidgetCard({ widget, onDelete }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [showMetrics, setShowMetrics] = useState(false);
  const [isWide, setIsWide] = useState(false); // User control to toggle card grid size

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

    const gradient = ctx.createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, "rgba(31, 111, 68, 0.45)");
    gradient.addColorStop(1, "rgba(200, 90, 50, 0.01)");

    const isSingleColor = widget.chart_type === 'bar' || widget.chart_type === 'line';

    const datasetConfig = {
      label: widget.y_axis,
      data: values,
      backgroundColor: isSingleColor
        ? (widget.chart_type === 'line' ? gradient : "rgba(31, 111, 68, 0.55)")
        : palette.slice(0, Math.max(labels.length, 6)),
      borderColor: isSingleColor
        ? "#1f6f44"
        : borderPalette.slice(0, Math.max(labels.length, 6)),
      borderWidth: 1.5,
      borderRadius: widget.chart_type === 'bar' ? 5 : 0
    };

    if (widget.chart_type === 'line') {
      datasetConfig.fill = true;
      datasetConfig.tension = 0.35;
      datasetConfig.pointBackgroundColor = "#c85a32";
      datasetConfig.pointBorderColor = "#ffffff";
    }

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: widget.chart_type === 'doughnut' || widget.chart_type === 'pie' ? 'right' : 'top',
          labels: { color: "#5c564f", font: { family: "Inter", size: 9 } }
        }
      }
    };

    if (widget.chart_type === 'bar' || widget.chart_type === 'line') {
      options.scales = {
        x: {
          grid: { color: "rgba(0, 0, 0, 0.03)" },
          ticks: { color: "#5c564f", font: { family: "Inter", size: 8 } }
        },
        y: {
          grid: { color: "rgba(0, 0, 0, 0.03)" },
          ticks: { color: "#5c564f", font: { family: "Inter", size: 8 } }
        }
      };
    }

    const ChartClass = window.Chart;
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

  useEffect(() => {
    renderWidgetChart();
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [widget.results, widget.chart_type, widget.x_axis, widget.y_axis, isWide]);

  return (
    <div className={`glass-card rounded-2xl flex flex-col overflow-hidden hover:translate-y-0 transition-all ${
      isWide ? 'xl:col-span-2 h-[450px]' : 'col-span-1 h-[400px]'
    }`}>
      {/* Card Header */}
      <div className="px-5 py-3 border-b border-outline-variant flex justify-between items-center bg-surface-dim/20 shrink-0 select-none">
        <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface truncate max-w-[45%]" title={widget.title}>
          {widget.title}
        </h4>
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          
          {/* Resize Card user control */}
          <button
            onClick={() => setIsWide(!isWide)}
            className="text-on-surface-variant hover:text-primary p-1 rounded hover:bg-surface-container transition-colors cursor-pointer bg-transparent border-none flex shrink-0"
            title={isWide ? "Make card compact (1x)" : "Make card wide (2x)"}
          >
            <span className="material-symbols-outlined text-base">
              {isWide ? "width_normal" : "width_wide"}
            </span>
          </button>

          {/* Pill Toggle Button */}
          <div className="flex bg-surface-dim p-0.5 rounded-lg border border-outline/30 text-[9px] font-bold uppercase select-none shrink-0">
            <button
              onClick={() => setShowMetrics(false)}
              className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer border-none text-[9px] font-bold ${
                !showMetrics ? "bg-primary text-white" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
              }`}
            >
              Chart
            </button>
            <button
              onClick={() => setShowMetrics(true)}
              className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer border-none text-[9px] font-bold ${
                showMetrics ? "bg-primary text-white" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
              }`}
            >
              Details
            </button>
          </div>

          <button
            onClick={() => onDelete(widget.id)}
            className="text-on-surface-variant hover:text-error p-1 rounded hover:bg-error-container transition-colors cursor-pointer bg-transparent border-none flex shrink-0"
            title="Unpin Chart Widget"
          >
            <span className="material-symbols-outlined text-base">delete</span>
          </button>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex-1 p-5 relative overflow-hidden flex items-center justify-center bg-surface-container-lowest/30">
        <div className="w-full h-full">
          {widget.error ? (
            <div className="flex flex-col items-center justify-center text-center p-4 max-w-xs space-y-2 h-full mx-auto">
              <span className="material-symbols-outlined text-error text-3xl">report_problem</span>
              <div className="text-xs font-bold text-on-surface uppercase tracking-wider">Query Failure</div>
              <div className="text-[10px] text-error font-mono line-clamp-4 leading-relaxed">
                {widget.error}
              </div>
            </div>
          ) : !widget.results || widget.results.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-4 space-y-1 select-none h-full">
              <span className="material-symbols-outlined text-on-surface-variant/20 text-3xl">dataset</span>
              <div className="text-xs font-semibold text-on-surface-variant/40">No dataset records found.</div>
            </div>
          ) : (
            <canvas ref={chartRef} className="w-full h-full max-h-full"></canvas>
          )}
        </div>

        {/* Details overlay */}
        {showMetrics && (
          <div className="absolute inset-0 bg-surface-container-lowest/98 p-5 overflow-y-auto custom-scrollbar text-[11px] leading-relaxed text-left flex flex-col gap-3.5 z-10 animate-fade-in border-t border-outline-variant/60 backdrop-blur-xl">
            <div>
              <span className="text-[9px] uppercase font-bold text-on-surface-variant tracking-wider">Natural Query Prompt</span>
              <p className="text-on-surface italic font-medium">"{widget.query}"</p>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-on-surface-variant tracking-wider">Generated Safe SQL Statement</span>
              <pre className="bg-surface p-3 rounded-xl border border-outline-variant/60 text-[10px] font-mono text-secondary overflow-x-auto whitespace-pre custom-scrollbar">
                {widget.generated_sql}
              </pre>
            </div>
            {widget.narrative_response && (
              <div>
                <span className="text-[9px] uppercase font-bold text-on-surface-variant tracking-wider">Executive Insights</span>
                <p className="text-on-surface bg-surface-dim/40 p-3 rounded-xl border border-outline-variant/60 leading-relaxed">
                  {widget.narrative_response}
                </p>
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
    <div className="h-full w-full flex flex-col gap-5 overflow-hidden text-left animate-fade-in">
      
      {/* Dashboard Top Header Control Panel */}
      <div className="glass-card rounded-2xl p-4.5 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 select-none">
        <div>
          <h3 className="text-xs uppercase tracking-wider font-extrabold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">space_dashboard</span>
            Executive Analytical Dashboard
          </h3>
          <p className="text-[11px] text-on-surface-variant mt-1.5 font-medium">
            Live analytics executing queries on database context: <span className="text-secondary font-bold font-mono bg-secondary/5 border border-secondary/25 px-1.5 py-0.5 rounded">{activeDatabaseId === "default" ? "Chinook Default" : `Connection #${activeDatabaseId}`}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Auto refresh toggler */}
          <div className="flex items-center gap-2 bg-surface-dim px-3.5 py-2 rounded-xl border border-outline/30">
            <span className="text-[11px] text-on-surface-variant font-bold uppercase tracking-wider">Auto-Refresh (30s)</span>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`w-7 h-4 rounded-full p-0.5 transition-colors cursor-pointer border-none relative flex items-center ${
                autoRefresh ? "bg-success" : "bg-outline/50"
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full bg-surface transform transition-transform duration-200 ${
                  autoRefresh ? "translate-x-3" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <button
            onClick={() => fetchWidgets(true)}
            className="flex items-center gap-1.5 px-4 py-2 border border-outline/30 rounded-xl bg-surface hover:bg-surface-container text-on-surface text-xs font-bold transition cursor-pointer active:scale-95"
            title="Refresh dashboard data"
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
              <span className="material-symbols-outlined text-primary text-3xl animate-spin">sync</span>
              <span className="text-[10px] text-on-surface-variant font-extrabold uppercase tracking-widest">Compiling live analytics...</span>
            </div>
          </div>
        ) : widgets.length === 0 ? (
          // Empty State view
          <div className="glass-card rounded-2xl py-14 px-6 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-5 mt-10 animate-fade-in select-none">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-2xl">space_dashboard</span>
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-on-surface uppercase tracking-wider mb-1">
                Your Dashboard is Empty
              </h4>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                No visualization cards have been pinned to this connection context yet. Build custom bar, line, or pie charts in Studio and pin them here.
              </p>
            </div>
            <button
              onClick={() => setWorkspaceTab("console")}
              className="bg-gradient-to-r from-primary to-secondary text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 hover:scale-102 active:scale-95 transition-all cursor-pointer border-none"
            >
              <span>Build Pinned Visuals</span>
              <span className="material-symbols-outlined text-sm font-extrabold">arrow_forward</span>
            </button>
          </div>
        ) : (
          // Grid layout displaying charts (with support for col-span-2)
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
