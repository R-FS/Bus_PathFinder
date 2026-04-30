import React, { useState } from 'react'
import { Bus, Map as MapIcon, Search as SearchIcon } from 'lucide-react'
import SearchBox from './components/SearchBox'
import InteractiveMap from './components/InteractiveMap'

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
    <div className="min-h-screen bg-[#0f1219] flex flex-col">
      {/* HEADER */}
      <header className="pt-8 pb-4 px-6 text-center">
        <h1 className="text-3xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600 mb-2 tracking-tighter">
          Caminho do Autocarro
        </h1>
        <p className="text-gray-500 text-sm font-medium">
          Rede oficial da Covilhã Mobilidade
        </p>
      </header>

      {/* MOBILE TABS */}
      <div className="md:hidden flex px-6 mb-4 gap-2">
        <button 
          onClick={() => setView('search')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all ${view === 'search' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-900/40' : 'bg-white/5 text-gray-500'}`}
        >
          <SearchIcon size={18} /> Pesquisa
        </button>
        <button 
          onClick={() => setView('map')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all ${view === 'map' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-900/40' : 'bg-white/5 text-gray-500'}`}
        >
          <MapIcon size={18} /> Mapa
        </button>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col md:flex-row gap-6 p-6 max-w-[1600px] mx-auto w-full relative">
        
        {/* LEFT COLUMN: Search & Results */}
        <div className={`flex-1 ${view === 'map' ? 'hidden md:block' : 'block'}`}>
          <SearchBox 
            onStopHighlight={(ids) => setHighlightedStops(ids)} 
            onStopFocus={(id) => setCenterStopId(id)}
            onRouteSelect={(ids, lineId) => {
              setRouteStopIds(ids);
              setSelectedLineId(lineId);
            }}
            manualOrigin={manualOrigin}
            manualDest={manualDest}
          />
        </div>

        {/* RIGHT COLUMN: Map (Sticky) */}
        <div className={`flex-1 h-[500px] md:h-auto md:min-h-0 ${view === 'search' ? 'hidden md:block' : 'block'}`}>
          <div className="md:sticky md:top-6 h-full md:h-[calc(100vh-160px)]">
            <InteractiveMap 
              highlightedStops={highlightedStops} 
              centerStopId={centerStopId}
              routeStopIds={routeStopIds}
              selectedLineId={selectedLineId}
              onSelectAsOrigin={(id) => setManualOrigin(id)}
              onSelectAsDest={(id) => setManualDest(id)}
            />
          </div>
        </div>

      </main>

      <footer className="py-6 text-center text-gray-600 text-[10px] uppercase font-black tracking-widest opacity-40">
        © 2026 Covilhã Mobilidade • Sistema de Navegação Inteligente
      </footer>
    </div>
  )
}

export default App
