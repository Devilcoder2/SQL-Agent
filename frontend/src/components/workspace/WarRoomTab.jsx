import React, { useState, useEffect, useRef } from 'react';

export default function WarRoomTab({ role }) {
  // Whiteboard Draggable Cards State
  const [pinnedCards, setPinnedCards] = useState({
    queryCard: { x: 40, y: 40 },
    chartCard: { x: 80, y: 220 },
    narrativeCard: { x: 580, y: 50 },
    stickyCard: { x: 640, y: 310 }
  });

  const wsRef = useRef(null);

  // Multiplayer cursor state simulation for War Room
  const [cursors, setCursors] = useState([
    { id: 1, name: "Sarah (Data Analyst)", x: 220, y: 150, color: "#ff9e80" },
    { id: 2, name: "Mark (VP Product)", x: 620, y: 310, color: "#80ffff" }
  ]);

  // On mount: initialize simulated multiplayer cursor path cycles
  useEffect(() => {
    // Cursor movement timeline simulation
    const interval = setInterval(() => {
      setCursors(prev => prev.map(c => {
        if (c.id !== 1 && c.id !== 2) return c;
        const angle = Date.now() * 0.001 * (c.id === 1 ? 1 : -0.8);
        const radius = c.id === 1 ? 80 : 120;
        const centerX = c.id === 1 ? 300 : 700;
        const centerY = c.id === 1 ? 200 : 250;
        return {
          ...c,
          x: Math.round(centerX + Math.cos(angle) * radius),
          y: Math.round(centerY + Math.sin(angle) * radius * 0.5)
        };
      }));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Handle WebSockets for real-time War Room cursor/card sync
  useEffect(() => {
    const host = window.location.host.replace('5173', '8000');
    const ws = new WebSocket(`ws://${host}/ws/warroom/1`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'cursor') {
          setCursors(prev => {
            const exists = prev.some(c => c.id === data.id);
            if (exists) {
              return prev.map(c => c.id === data.id ? { ...c, x: data.x, y: data.y } : c);
            } else {
              return [...prev, data];
            }
          });
        } else if (data.type === 'card_move') {
          setPinnedCards(prev => ({
            ...prev,
            [data.cardId]: { x: data.x, y: data.y }
          }));
        }
      } catch (err) {
        console.error("Error parsing WS packet:", err);
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, []);

  // WebSocket cursor update trigger
  const handleMouseMove = (e) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    
    wsRef.current.send(JSON.stringify({
      type: 'cursor',
      id: 99, // Current client ID
      name: `You (${role.toUpperCase()})`,
      x: x,
      y: y,
      color: '#4edea3'
    }));
  };

  // Card movement drag transmitter
  const handleCardDrag = (cardId, deltaX, deltaY) => {
    setPinnedCards(prev => {
      const newX = Math.max(0, prev[cardId].x + deltaX);
      const newY = Math.max(0, prev[cardId].y + deltaY);
      
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'card_move',
          cardId: cardId,
          x: newX,
          y: newY
        }));
      }
      return {
        ...prev,
        [cardId]: { x: newX, y: newY }
      };
    });
  };

  const handleStartDrag = (e, cardId) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = pinnedCards[cardId].x;
    const initialY = pinnedCards[cardId].y;

    const handleMouseDrag = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      handleCardDrag(cardId, deltaX, deltaY);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseDrag);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseDrag);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden relative rounded-2xl border border-white/5 bg-[#0b1326]/10 text-left">
      
      {/* Whiteboard dotted viewport */}
      <div 
        className="flex-grow relative dotted-grid overflow-hidden flex items-center justify-center p-6"
        onMouseMove={handleMouseMove}
      >
        
        {/* Visual grid watermark title */}
        <div className="absolute top-4 left-6 text-left select-none pointer-events-none">
          <h4 className="text-xs uppercase tracking-widest font-extrabold text-white/30">Shared Board Workspace</h4>
          <p className="text-[10px] text-white/20 mt-1">Multiplayer cursor coordination active (WebSocket loop simulation)</p>
        </div>

        {/* Multiplayer cursor representations */}
        {cursors.map(c => (
          <div 
            key={c.id} 
            className="absolute pointer-events-none transition-all duration-100 flex gap-1 z-30 select-none"
            style={{ left: `${c.x}px`, top: `${c.y}px` }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4.5 3V19.5L10.5 13.5H19.5L4.5 3Z" fill={c.color} stroke="white" strokeWidth="1.5"/>
            </svg>
            <div 
              className="text-[8px] font-bold px-1.5 py-0.5 rounded shadow mt-3 whitespace-nowrap text-[#020617]"
              style={{ backgroundColor: c.color }}
            >
              {c.name}
            </div>
          </div>
        ))}

        {/* Floating canvas cards representing workspace widgets */}
        <div className="relative w-full h-full max-w-5xl max-h-[500px]">
          
          {/* Card A: Compiled Statement card */}
          <div 
            className="absolute w-72 p-4 bg-[#0b1326]/85 border border-white/10 rounded-2xl shadow-xl select-none z-10 cursor-move"
            style={{ left: `${pinnedCards.queryCard.x}px`, top: `${pinnedCards.queryCard.y}px` }}
            onMouseDown={(e) => handleStartDrag(e, 'queryCard')}
          >
            <div className="flex justify-between items-center pb-2 border-b border-white/5 mb-3 text-[10px] uppercase font-bold text-primary">
              <span>Query Statement</span>
              <span className="w-2 h-2 rounded-full bg-secondary" />
            </div>
            <code className="text-[9px] font-mono text-[#c3c6d7] block leading-relaxed whitespace-pre-wrap">
              SELECT EmployeeId, FirstName FROM Employee WHERE Title = 'Sales Manager';
            </code>
          </div>

          {/* Card B: static mini-chart visualizer card */}
          <div 
            className="absolute w-80 p-4 bg-[#0b1326]/85 border border-[#4edea3]/20 rounded-2xl shadow-xl select-none z-10 cursor-move"
            style={{ left: `${pinnedCards.chartCard.x}px`, top: `${pinnedCards.chartCard.y}px` }}
            onMouseDown={(e) => handleStartDrag(e, 'chartCard')}
          >
            <div className="flex justify-between items-center pb-2 border-b border-white/5 mb-3 text-[10px] uppercase font-bold text-secondary">
              <span>Sales Summary Chart</span>
              <span className="text-[8px] border border-[#4edea3]/30 px-1 rounded">2026</span>
            </div>
            <div className="h-24 bg-[#020617] border border-white/5 rounded-lg flex items-end justify-between p-3 gap-2">
              <div className="w-4 bg-primary/20 h-[30%] rounded-sm" />
              <div className="w-4 bg-primary/40 h-[60%] rounded-sm" />
              <div className="w-4 bg-gradient-to-t from-primary to-secondary h-[85%] rounded-sm" />
              <div className="w-4 bg-primary/50 h-[45%] rounded-sm" />
            </div>
          </div>

          {/* Card C: TLDR narrative brief card */}
          <div 
            className="absolute w-80 p-4 bg-[#0b1326]/85 border border-white/10 rounded-2xl shadow-xl select-none z-10 cursor-move"
            style={{ left: `${pinnedCards.narrativeCard.x}px`, top: `${pinnedCards.narrativeCard.y}px` }}
            onMouseDown={(e) => handleStartDrag(e, 'narrativeCard')}
          >
            <div className="flex justify-between items-center pb-2 border-b border-white/5 mb-3 text-[10px] uppercase font-bold text-tertiary">
              <span>Executive Brief Card</span>
              <span className="material-symbols-outlined text-[12px]">subject</span>
            </div>
            <p className="text-[10px] text-[#c3c6d7] leading-relaxed">
              • Customer volume in South America rose by 14% year-over-year.<br/>
              • Brazil invoices accounts for 63% of the continent sales.<br/>
              • Top support rep is resolved to Margaret Park.
            </p>
          </div>

          {/* Card D: Collaborative Yellow Sticky Note */}
          <div 
            className="absolute w-60 p-4 bg-amber-400/90 text-[#302100] rounded-xl shadow-2xl rotate-2 select-none z-10 hover:rotate-0 transition-transform cursor-move"
            style={{ left: `${pinnedCards.stickyCard.x}px`, top: `${pinnedCards.stickyCard.y}px` }}
            onMouseDown={(e) => handleStartDrag(e, 'stickyCard')}
          >
            <div className="text-[9px] uppercase font-extrabold opacity-60 tracking-wider mb-2">Team Note</div>
            <p className="text-[11px] leading-relaxed font-bold font-sans">
              "I verified the Brazil invoice counts with Sarah. The corrected query is compiled and ready to be exported to the client. Let's get feedback!"
            </p>
            <div className="mt-3 text-[8px] font-bold text-right opacity-60">- Mark</div>
          </div>

        </div>

      </div>

    </div>
  );
}
