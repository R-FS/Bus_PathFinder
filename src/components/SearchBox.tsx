import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Navigation, ArrowRight, Clock, Plus, X, GraduationCap, Building2, ShoppingBag, Landmark, Utensils, Bus, Info, Calendar, ChevronUp, ChevronDown } from 'lucide-react';
import stopsData from '../../data/stops.json';
import schedulesData from '../../data/schedules.json';

interface Stop {
  id: string;
  name: string;
}

interface StopGroup {
  category: string;
  stops: Stop[];
}

interface Trip {
  id?: string;
  dayType: string;
  times: string[];
}

interface ScheduleLine {
  line: string;
  lineName: string;
  stops: string[];
  stopIds?: string[];
  trips: Trip[];
}

interface TripResult {
  line: string;
  lineName: string;
  origin: string;
  originId: string;
  destination: string;
  destinationId: string;
  departure: string;
  arrival: string;
  duration: number;
}

const typedStopsData = stopsData as StopGroup[];
const allStops = typedStopsData[0].stops;
const typedSchedulesData = schedulesData as ScheduleLine[];

// --- MAPPING FOR FRIENDLY LINE NAMES ---
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

// --- LONG PRESS BUTTON COMPONENT ---
interface LongPressButtonProps {
  onAction: () => void;
  children: React.ReactNode;
  className?: string;
}

const LongPressButton: React.FC<LongPressButtonProps> = ({ onAction, children, className }) => {
  const [pressing, setPressing] = useState(false);
  const onActionRef = useRef(onAction);
  
  useEffect(() => {
    onActionRef.current = onAction;
  }, [onAction]);

  useEffect(() => {
    if (!pressing) return;

    // Trigger immediately on first press
    onActionRef.current();

    let intervalId: any;
    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        onActionRef.current();
      }, 80);
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [pressing]);

  return (
    <button
      onPointerDown={(e) => {
        if (e.pointerType === 'touch') e.preventDefault();
        setPressing(true);
      }}
      onPointerUp={() => setPressing(false)}
      onPointerLeave={() => setPressing(false)}
      onContextMenu={(e) => e.preventDefault()}
      style={{ touchAction: 'none' }}
      className={className}
    >
      {children}
    </button>
  );
};

// --- CUSTOM TIME SELECTOR COMPONENT ---
interface TimeSelectorProps {
  value: string;
  onChange: (val: string) => void;
  label: string;
}

const TimeSelector: React.FC<TimeSelectorProps> = ({ value, onChange, label }) => {
  const [h, m] = value.split(':');
  
  const updateHour = (delta: number) => {
    let newH = parseInt(h) + delta;
    if (newH > 23) newH = 0;
    if (newH < 0) newH = 23;
    onChange(`${newH.toString().padStart(2, '0')}:${m}`);
  };

  const updateMin = (delta: number) => {
    let newM = parseInt(m) + delta;
    if (newM > 59) newM = 0;
    if (newM < 0) newM = 59;
    onChange(`${h}:${newM.toString().padStart(2, '0')}`);
  };

  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] text-gray-500 uppercase font-black tracking-tighter mb-2">{label}</span>
      <div className="flex gap-1 items-center bg-white/5 p-1.5 rounded-2xl border border-white/10 shadow-inner">
        {/* HOURS */}
        <div className="flex flex-col items-center group">
          <LongPressButton onAction={() => updateHour(1)} className="p-1 hover:text-cyan-400 transition-colors opacity-40 group-hover:opacity-100">
            <ChevronUp size={14} />
          </LongPressButton>
          <div className="text-xl font-black text-white w-8 text-center tabular-nums">{h}</div>
          <LongPressButton onAction={() => updateHour(-1)} className="p-1 hover:text-cyan-400 transition-colors opacity-40 group-hover:opacity-100">
            <ChevronDown size={14} />
          </LongPressButton>
        </div>
        
        <div className="text-gray-600 font-bold mb-1">:</div>
        
        {/* MINUTES */}
        <div className="flex flex-col items-center group">
          <LongPressButton onAction={() => updateMin(5)} className="p-1 hover:text-cyan-400 transition-colors opacity-40 group-hover:opacity-100">
            <ChevronUp size={14} />
          </LongPressButton>
          <div className="text-xl font-black text-white w-8 text-center tabular-nums">{m}</div>
          <LongPressButton onAction={() => updateMin(-5)} className="p-1 hover:text-cyan-400 transition-colors opacity-40 group-hover:opacity-100">
            <ChevronDown size={14} />
          </LongPressButton>
        </div>
      </div>
    </div>
  );
};

interface SearchBoxProps {
  onStopHighlight?: (stopIds: string[]) => void;
  onStopFocus?: (stopId: string | null) => void;
  onRouteSelect?: (stopIds: string[], lineId: string | null) => void;
  manualOrigin?: string | null;
  manualDest?: string | null;
}

const SearchBox: React.FC<SearchBoxProps> = ({ 
  onStopHighlight, 
  onStopFocus, 
  onRouteSelect,
  manualOrigin,
  manualDest
}) => {
  const [origins, setOrigins] = useState<Stop[]>([]);
  const [destinations, setDestinations] = useState<Stop[]>([]);
  const [showHelper, setShowHelper] = useState<'origin' | 'destination' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<TripResult[]>([]);
  const [targetTime, setTargetTime] = useState(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });
  const [endTime, setEndTime] = useState("23:59");
  const [dayType, setDayType] = useState<'business' | 'saturday' | 'holiday'>('business');

  // Handle manual selection from map
  useEffect(() => {
    if (manualOrigin) {
      const stop = allStops.find(s => s.id === manualOrigin);
      if (stop) addStop(stop, 'origin');
    }
  }, [manualOrigin]);

  useEffect(() => {
    if (manualDest) {
      const stop = allStops.find(s => s.id === manualDest);
      if (stop) addStop(stop, 'destination');
    }
  }, [manualDest]);

  const addStop = (stop: Stop, type: 'origin' | 'destination') => {
    if (type === 'origin') {
      if (!origins.find(s => s.id === stop.id)) setOrigins([...origins, stop]);
    } else {
      if (!destinations.find(s => s.id === stop.id)) setDestinations([...destinations, stop]);
    }
    setSearchTerm('');
    setShowHelper(null);
    onStopFocus?.(stop.id);
  };

  const removeStop = (id: string, type: 'origin' | 'destination') => {
    if (type === 'origin') setOrigins(origins.filter(s => s.id !== id));
    else setDestinations(destinations.filter(s => s.id !== id));
    onStopFocus?.(null);
  };

  const handleRouteClick = (lineId: string, originId: string, destId: string) => {
    const line = typedSchedulesData.find(l => l.line === lineId);
    if (!line) return;

    const stopIds = line.stopIds || [];
    const originIdx = stopIds.indexOf(originId);
    const destIdx = stopIds.indexOf(destId);

    if (originIdx !== -1 && destIdx !== -1) {
      const pathIds = stopIds.slice(originIdx, destIdx + 1);
      onRouteSelect?.(pathIds, line.line);
    }
    
    onStopFocus?.(originId);
  };

  const normalize = (name: string) => {
    return name
      .toUpperCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]/g, "")
      .trim();
  };

  const handleSearch = () => {
    if (origins.length === 0 || destinations.length === 0) return;

    const foundOptions: TripResult[] = [];
    const originIds = origins.map(o => o.id);
    const destinationIds = destinations.map(d => d.id);

    onRouteSelect?.([], null);
    onStopHighlight?.([...originIds, ...destinationIds]);

    for (const line of typedSchedulesData) {
      for (const trip of line.trips) {
        if (trip.dayType !== dayType && trip.dayType !== 'all') continue;

        let bestOriginIdx = -1;
        let bestDestIdx = -1;
        let matchedOriginName = "";
        let matchedOriginId = "";
        let matchedDestName = "";
        let matchedDestId = "";

        const currentStopIds = line.stopIds || [];
        const currentStopNames = line.stops;

        for (let i = 0; i < currentStopNames.length; i++) {
          const stopId = currentStopIds[i];
          const stopName = currentStopNames[i];
          const stopTime = trip.times[i];

          if (stopTime === "-" || stopTime === "--:--") continue;

          const matchedOrigin = origins.find(o => 
            stopId ? o.id === stopId : normalize(o.name) === normalize(stopName)
          );

          if (matchedOrigin) {
            if (stopTime >= targetTime && stopTime <= endTime) {
              bestOriginIdx = i;
              matchedOriginName = stopName;
              matchedOriginId = matchedOrigin.id;
              break; 
            }
          }
        }

        if (bestOriginIdx !== -1) {
          for (let i = bestOriginIdx + 1; i < currentStopNames.length; i++) {
            const stopId = currentStopIds[i];
            const stopName = currentStopNames[i];
            const stopTime = trip.times[i];

            if (stopTime === "-" || stopTime === "--:--") continue;

            const matchedDest = destinations.find(d => 
              stopId ? d.id === stopId : normalize(d.name) === normalize(stopName)
            );

            if (matchedDest) {
              bestDestIdx = i;
              matchedDestName = stopName;
              matchedDestId = matchedDest.id;
            }
          }
        }

        if (bestOriginIdx !== -1 && bestDestIdx !== -1) {
          const depTime = trip.times[bestOriginIdx];
          const arrTime = trip.times[bestDestIdx];
          
          const [h1, m1] = depTime.split(':').map(Number);
          const [h2, m2] = arrTime.split(':').map(Number);
          let duration = (h2 * 60 + m2) - (h1 * 60 + m1);
          if (duration < 0) duration += 1440;

          foundOptions.push({
            line: line.line,
            lineName: line.lineName,
            origin: matchedOriginName,
            originId: matchedOriginId,
            destination: matchedDestName,
            destinationId: matchedDestId,
            departure: depTime,
            arrival: arrTime,
            duration: duration
          });
        }
      }
    }

    setResults(foundOptions.sort((a, b) => a.departure.localeCompare(b.departure)));
  };

  const renderHelper = (type: 'origin' | 'destination') => {
    if (showHelper !== type) return null;
    
    return (
      <div className="absolute left-0 right-0 top-[calc(100%+8px)] bg-[#1a1f2e]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-slide-up z-50">
        <div className="p-3 bg-white/5 border-b border-white/10 flex justify-between items-center">
          <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
            <Search size={12} /> Sugestões
          </span>
          <X size={14} className="text-gray-500 cursor-pointer hover:text-white" onClick={() => setShowHelper(null)} />
        </div>
        <div className="max-h-[250px] overflow-y-auto p-2 custom-scrollbar">
          {typedStopsData.map((group) => (
            <div key={group.category}>
              <div className="grid grid-cols-1 gap-1">
                {group.stops
                  .filter(s => 
                    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    s.id.includes(searchTerm)
                  )
                  .slice(0, 10) 
                  .map(stop => (
                    <button
                      key={stop.id}
                      onClick={() => addStop(stop, type)}
                      className="text-left text-sm text-gray-300 p-3 rounded-xl hover:bg-white/10 transition-all border border-transparent hover:border-white/5 flex items-center justify-between group/item"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin size={14} className="text-gray-600 group-hover/item:text-cyan-500" />
                        <span className="group-hover/item:text-white transition-colors">{stop.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-gray-600 bg-white/5 px-2 py-0.5 rounded border border-white/5 group-hover/item:border-cyan-500/30 group-hover/item:text-cyan-400 transition-all">
                        #{stop.id}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          ))}
          {searchTerm && typedStopsData[0].stops.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.includes(searchTerm)).length === 0 && (
            <div className="p-4 text-center text-gray-500 text-xs italic">
              Nenhuma paragem encontrada para "{searchTerm}"
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 overflow-y-auto max-h-full custom-scrollbar pb-10">
      <div className="glass-container p-6 rounded-3xl shadow-2xl animate-fade-in relative z-20">
        <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
          <Bus className="text-cyan-400" /> Planear Viagem
        </h2>

        {/* ORIGINS */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-cyan-400/70 uppercase tracking-wider mb-2 block">De onde podes partir?</label>
          <div className="relative">
            <div className={`flex flex-wrap gap-2 p-3 bg-white/5 border border-white/10 rounded-xl transition-all min-h-[50px] ${showHelper === 'origin' ? 'border-cyan-500/50 bg-cyan-500/5 ring-4 ring-cyan-500/10' : ''}`}>
              {origins.map(stop => (
                <span key={stop.id} className="bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 border border-cyan-500/30">
                  <span className="opacity-40 font-mono text-[9px]">#{stop.id}</span>
                  {stop.name}
                  <X size={14} className="cursor-pointer hover:text-white" onClick={() => removeStop(stop.id, 'origin')} />
                </span>
              ))}
              <input
                type="text"
                placeholder={origins.length === 0 ? "Ex: Hospital, UBI..." : ""}
                className="bg-transparent border-none outline-none text-white flex-1 min-w-[120px]"
                onFocus={() => {
                  setShowHelper('origin');
                  setSearchTerm('');
                }}
                value={showHelper === 'origin' ? searchTerm : ''}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {renderHelper('origin')}
          </div>
        </div>

        {/* DESTINATIONS */}
        <div className="mb-6">
          <label className="text-xs font-semibold text-purple-400/70 uppercase tracking-wider mb-2 block">Para onde queres ir?</label>
          <div className="relative">
            <div className={`flex flex-wrap gap-2 p-3 bg-white/5 border border-white/10 rounded-xl transition-all min-h-[50px] ${showHelper === 'destination' ? 'border-purple-500/50 bg-purple-500/5 ring-4 ring-purple-500/10' : ''}`}>
              {destinations.map(stop => (
                <span key={stop.id} className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 border border-purple-500/30">
                  <span className="opacity-40 font-mono text-[9px]">#{stop.id}</span>
                  {stop.name}
                  <X size={14} className="cursor-pointer hover:text-white" onClick={() => removeStop(stop.id, 'destination')} />
                </span>
              ))}
              <input
                type="text"
                placeholder={destinations.length === 0 ? "Ex: Serra Shopping..." : ""}
                className="bg-transparent border-none outline-none text-white flex-1 min-w-[120px]"
                onFocus={() => {
                  setShowHelper('destination');
                  setSearchTerm('');
                }}
                value={showHelper === 'destination' ? searchTerm : ''}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {renderHelper('destination')}
          </div>
        </div>

        {/* DAY TYPE SELECTOR */}
        <div className="mb-6">
          <label className="text-xs font-semibold text-cyan-400/70 uppercase tracking-wider mb-2 block flex items-center gap-2">
            <Calendar size={14} /> Em que dia vais viajar?
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'business', label: 'Dias Úteis', icon: '💼' },
              { id: 'saturday', label: 'Sábados', icon: '🛍️' },
              { id: 'holiday', label: 'Fins de Semana / Feriados', icon: '⛪' }
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setDayType(type.id as any)}
                className={`p-3 rounded-xl border text-sm font-bold transition-all flex flex-col items-center gap-1 ${
                  dayType === type.id 
                    ? 'bg-cyan-500/20 border-cyan-500 text-white' 
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                }`}
              >
                <span className="text-lg">{type.icon}</span>
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* TIME PICKER RANGE (CUSTOM 24H - CYCLED) */}
        <div className="mb-8">
          <label className="text-xs font-semibold text-cyan-400/70 uppercase tracking-wider mb-4 block flex items-center gap-2">
            <Clock size={14} /> Em que intervalo de horas? (24h)
          </label>
          
          <div className="flex items-center justify-around bg-white/2 backdrop-blur-sm p-4 rounded-3xl border border-white/5">
            <TimeSelector value={targetTime} onChange={setTargetTime} label="A partir das" />
            <div className="h-10 w-px bg-white/10 self-end mb-4" />
            <TimeSelector value={endTime} onChange={setEndTime} label="Até às" />
          </div>
          
          <p className="text-[10px] text-gray-500 mt-4 italic text-center">
            Podes manter premido para avançar as horas rapidamente.
          </p>
        </div>

        <button 
          onClick={handleSearch}
          className="w-full bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-cyan-900/20 active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Search size={20} /> Encontrar Melhores Horários
        </button>
      </div>

      {/* RESULTS SECTION */}
      <div className="mt-8 space-y-4">
        {results.length > 0 ? (
          <>
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-[3px] mb-4 ml-1">
              Opções Encontradas ({results.length})
            </h3>
            {results.map((res, idx) => (
              <div 
                key={idx} 
                onClick={() => handleRouteClick(res.line, res.originId, res.destinationId)}
                onMouseEnter={() => onStopFocus?.(res.originId)}
                className="glass-container p-6 rounded-[2.5rem] border-l-4 border-l-cyan-500 hover:bg-white/5 transition-all animate-slide-up group cursor-pointer"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-black text-cyan-500 uppercase tracking-widest mb-1">Linha</span>
                      <div className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-black px-4 py-2 rounded-2xl text-base tracking-tighter shadow-lg shadow-cyan-900/30 min-w-[50px] text-center">
                        {formatLineName(res.line)}
                      </div>
                    </div>
                    <div className="pt-4">
                      <h4 className="text-white font-bold text-sm leading-tight group-hover:text-cyan-400 transition-colors">{res.lineName}</h4>
                      <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest mt-1 opacity-60">
                        {dayType === 'business' ? 'Dias Úteis' : dayType === 'saturday' ? 'Sábados' : 'Fins de Semana / Feriados'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-white tracking-tighter leading-none">{res.departure}</div>
                    <div className="text-[10px] text-cyan-400/60 font-black uppercase tracking-widest mt-1">Partida</div>
                  </div>
                </div>

                <div className="mb-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-[11px] text-gray-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                    <span className="font-bold text-gray-300">De:</span> {res.origin}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-gray-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    <span className="font-bold text-gray-300">Para:</span> {res.destination}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#121826] px-3 border border-white/5 rounded-full">
                      <ArrowRight size={14} className="text-gray-600 group-hover:text-cyan-400 transition-colors" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-cyan-500/30 transition-all">
                      <Clock size={16} className="text-cyan-400" />
                    </div>
                    <div>
                      <span className="text-lg font-black text-white tracking-tight">{res.duration} min</span>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Tempo Estimado</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-300 tracking-tight">{res.arrival}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Chegada prevista</div>
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : origins.length > 0 && destinations.length > 0 ? (
          <div className="text-center py-16 glass-container rounded-[2.5rem] border-dashed">
            <Navigation className="mx-auto mb-4 opacity-10 text-cyan-400" size={64} />
            <h4 className="text-white font-bold mb-1">Sem autocarros diretos</h4>
            <p className="text-gray-500 text-sm max-w-[250px] mx-auto">Não encontrámos viagens diretas para este horário e paragens.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default SearchBox;
