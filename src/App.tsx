import React, { useState } from 'react'
import { Bus, Map as MapIcon, Search as SearchIcon, X } from 'lucide-react'
import SearchBox from './components/SearchBox'
import InteractiveMap from './components/InteractiveMap'

const LINE_MAPPING: Record<string, string> = {
  "2121": "21A",
  "1001": "L1",
  "1002": "L2",
  "1003": "L3"
};

const formatLineName = (lineId: string) => {
  const base = lineId.split('-')[0];
  return LINE_MAPPING[base] || base;
};

function App() {
  const [highlightedStops, setHighlightedStops] = useState<string[]>([]);
  const [centerStopId, setCenterStopId] = useState<string | null>(null);
  const [routeStopIds, setRouteStopIds] = useState<string[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [view, setView] = useState<'search' | 'map'>('search');
  
  // Selection handlers to pass to the Map
  const [manualOrigin, setManualOrigin] = useState<string | null>(null);
  const [manualDest, setManualDest] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#0f1219] flex flex-col relative overflow-x-hidden">
      {/* HEADER - Hidden on mobile map view to maximize space */}
      <header className={`pt-8 pb-4 px-6 text-center transition-all duration-300 ${view === 'map' ? 'hidden md:block' : 'block'}`}>
        <h1 className="text-3xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600 mb-2 tracking-tighter">
          Caminho do Autocarro
        </h1>
        <p className="text-gray-500 text-sm font-medium">
          Rede oficial da Covilhã Mobilidade
        </p>
      </header>

      {/* FLOATING MOBILE NAVIGATION PILL (Airbnb / Google Maps style) */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[4000] bg-[#1a1f2e]/90 backdrop-blur-xl border border-white/10 shadow-2xl rounded-full p-1 flex gap-1 items-center">
        <button 
          onClick={() => setView('search')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 ${
            view === 'search' 
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-900/40 scale-105' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <SearchIcon size={14} /> Pesquisa
        </button>
        <button 
          onClick={() => setView('map')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 relative ${
            view === 'map' 
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-900/40 scale-105' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <MapIcon size={14} /> Mapa
          {routeStopIds.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-cyan-400 rounded-full animate-pulse border border-[#1a1f2e]" />
          )}
        </button>
      </div>

      {/* MAIN CONTENT AREA - Edge-to-edge on mobile map view */}
      <main className={`flex-1 flex flex-col md:flex-row gap-6 max-w-[1600px] mx-auto w-full relative transition-all duration-300 ${view === 'map' ? 'p-0 md:p-6' : 'p-6'}`}>
        
        {/* LEFT COLUMN: Search & Results */}
        <div className={`flex-1 ${view === 'map' ? 'hidden md:block' : 'block'}`}>
          <SearchBox 
            onStopHighlight={(ids) => setHighlightedStops(ids)} 
            onStopFocus={(id) => setCenterStopId(id)}
            onRouteSelect={(ids, lineId) => {
              setRouteStopIds(ids);
              setSelectedLineId(lineId);
              // Auto switch to map view on mobile so they instantly see their plotted route
              if (ids.length > 0) {
                setView('map');
              }
            }}
            manualOrigin={manualOrigin}
            manualDest={manualDest}
          />
        </div>

        {/* RIGHT COLUMN: Map (Immersive fullscreen on mobile map view) */}
        <div className={`flex-1 ${view === 'search' ? 'hidden md:block' : 'block'} ${view === 'map' ? 'h-[calc(100vh-80px)] md:h-auto' : 'h-[500px]'} relative`}>
          <div className="md:sticky md:top-6 h-full md:h-[calc(100vh-160px)] relative">
            
            {/* FLOATING ROUTE INFO CARD OVER MAP */}
            {routeStopIds.length > 0 && selectedLineId && (
              <div className="absolute top-4 left-4 right-4 z-[1000] bg-[#121826]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4 animate-slide-up">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-black px-3 py-1.5 rounded-xl text-sm tracking-tighter shadow-lg shadow-cyan-900/30">
                    {formatLineName(selectedLineId)}
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-xs leading-tight">Rota Selecionada</h4>
                    <p className="text-[10px] text-cyan-400 font-mono mt-0.5">{routeStopIds.length} paragens no trajeto</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setRouteStopIds([]);
                    setSelectedLineId(null);
                  }}
                  className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors"
                  title="Limpar Rota"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <InteractiveMap 
              key={view}
              highlightedStops={highlightedStops} 
              centerStopId={centerStopId}
              routeStopIds={routeStopIds}
              selectedLineId={selectedLineId}
              onSelectAsOrigin={(id) => {
                setManualOrigin(id);
                // Switch back to search screen so they can choose destination or see schedules
                setView('search');
              }}
              onSelectAsDest={(id) => {
                setManualDest(id);
                // Switch back to search screen so they can see schedules or choose origin
                setView('search');
              }}
            />
          </div>
        </div>

      </main>

      {/* FOOTER - Hidden on mobile map view to maximize space */}
      <footer className={`py-6 text-center text-gray-600 text-[10px] uppercase font-black tracking-widest opacity-40 transition-all duration-300 ${view === 'map' ? 'hidden md:block' : 'block'}`}>
        © 2026 Covilhã Mobilidade • Sistema de Navegação Inteligente
      </footer>
    </div>
  )
}

export default App

