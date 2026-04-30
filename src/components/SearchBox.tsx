import React, { useState } from 'react';
import { Search, MapPin, Navigation, ArrowRight, Clock, Plus, X, GraduationCap, Building2, ShoppingBag, Landmark, Utensils, Bus, Info, Calendar } from 'lucide-react';
import stopsData from '../../data/stops.json';
import schedulesData from '../../data/schedules.json';

interface Stop {
  id: string;
  name: string;
}

interface StopCategory {
  category: string;
  stops: Stop[];
}

interface TripResult {
  line: string;
  lineName: string;
  origin: string;
  destination: string;
  departure: string;
  arrival: string;
  duration: number;
}

const SearchBox = () => {
  const [origins, setOrigins] = useState<Stop[]>([]);
  const [destinations, setDestinations] = useState<Stop[]>([]);
  const [showHelper, setShowHelper] = useState<'origin' | 'destination' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<TripResult[]>([]);
  const [targetTime, setTargetTime] = useState(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });
  const [dayType, setDayType] = useState<'business' | 'saturday' | 'holiday'>('business');

  const addStop = (stop: Stop, type: 'origin' | 'destination') => {
    if (type === 'origin') {
      if (!origins.find(s => s.id === stop.id)) setOrigins([...origins, stop]);
    } else {
      if (!destinations.find(s => s.id === stop.id)) setDestinations([...destinations, stop]);
    }
    setSearchTerm('');
    setShowHelper(null);
  };

  const removeStop = (id: string, type: 'origin' | 'destination') => {
    if (type === 'origin') setOrigins(origins.filter(s => s.id !== id));
    else setDestinations(destinations.filter(s => s.id !== id));
  };

  const normalize = (name: string) => {
    return name
      .toUpperCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remover acentos
      .replace(/ESC\.|ESCOLA|PARAGEM|ESTAÇÃO/g, "") // Remover termos comuns
      .replace(/[^A-Z0-9]/g, "") // Remover tudo o que não é letra ou número
      .trim();
  };

  const handleSearch = () => {
    if (origins.length === 0 || destinations.length === 0) return;

    const foundOptions: TripResult[] = [];
    const normalizedOrigins = origins.map(o => normalize(o.name));
    const normalizedDestinations = destinations.map(d => normalize(d.name));

    for (const line of schedulesData) {
      for (const trip of line.trips) {
        // Filtrar por tipo de dia (suporta 'all' para linhas diárias)
        if (trip.dayType !== dayType && trip.dayType !== 'all') continue;

        let bestOriginIdx = -1;
        let bestDestIdx = -1;
        let matchedOriginName = "";
        let matchedDestName = "";

        // Encontrar a primeira paragem que é uma das origens selecionadas E tem tempo >= targetTime
        for (let i = 0; i < line.stops.length; i++) {
          const stopInLine = line.stops[i];
          const normalizedStop = normalize(stopInLine);
          const stopTime = trip.times[i];

          if (stopTime === "-" || stopTime === "--:--") continue;

          // Verificar se esta paragem é uma das origens
          if (normalizedOrigins.some(no => normalizedStop.includes(no) || no.includes(normalizedStop))) {
            // Verificar se o tempo é válido
            if (stopTime >= targetTime) {
              bestOriginIdx = i;
              matchedOriginName = stopInLine;
              break; // Encontramos a primeira paragem válida na linha
            }
          }
        }

        // Se encontramos uma origem válida, procurar o destino depois dela
        if (bestOriginIdx !== -1) {
          for (let i = bestOriginIdx + 1; i < line.stops.length; i++) {
            const stopInLine = line.stops[i];
            const normalizedStop = normalize(stopInLine);
            const stopTime = trip.times[i];

            if (stopTime === "-" || stopTime === "--:--") continue;

            if (normalizedDestinations.some(nd => normalizedStop.includes(nd) || nd.includes(normalizedStop))) {
              bestDestIdx = i;
              matchedDestName = stopInLine;
              // Continuamos a procurar para encontrar o destino MAIS LONGE na linha, se houver múltiplos
            }
          }
        }

        if (bestOriginIdx !== -1 && bestDestIdx !== -1) {
          const depTime = trip.times[bestOriginIdx];
          const arrTime = trip.times[bestDestIdx];
          
          const [h1, m1] = depTime.split(':').map(Number);
          const [h2, m2] = arrTime.split(':').map(Number);
          let duration = (h2 * 60 + m2) - (h1 * 60 + m1);
          if (duration < 0) duration += 1440; // Caso passe da meia-noite

          foundOptions.push({
            line: line.line,
            lineName: line.lineName,
            origin: matchedOriginName,
            destination: matchedDestName,
            departure: depTime,
            arrival: arrTime,
            duration: duration
          });
        }
      }
    }

    setResults(foundOptions.sort((a, b) => a.departure.localeCompare(b.departure)));
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 px-4">
      <div className="glass-container p-6 rounded-3xl shadow-2xl animate-fade-in relative z-20">
        <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
          <Bus className="text-cyan-400" /> Planear Viagem
        </h2>

        {/* ORIGINS */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-cyan-400/70 uppercase tracking-wider mb-2 block">De onde podes partir?</label>
          <div className="flex flex-wrap gap-2 p-3 bg-white/5 border border-white/10 rounded-xl focus-within:border-cyan-500/50 transition-all min-h-[50px]">
            {origins.map(stop => (
              <span key={stop.id} className="bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-full text-sm flex items-center gap-1 border border-cyan-500/30">
                {stop.name}
                <X size={14} className="cursor-pointer hover:text-white" onClick={() => removeStop(stop.id, 'origin')} />
              </span>
            ))}
            <input
              type="text"
              placeholder={origins.length === 0 ? "Ex: Hospital, UBI..." : ""}
              className="bg-transparent border-none outline-none text-white flex-1 min-w-[120px]"
              onFocus={() => setShowHelper('origin')}
              value={showHelper === 'origin' ? searchTerm : ''}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* DESTINATIONS */}
        <div className="mb-6">
          <label className="text-xs font-semibold text-purple-400/70 uppercase tracking-wider mb-2 block">Para onde queres ir?</label>
          <div className="flex flex-wrap gap-2 p-3 bg-white/5 border border-white/10 rounded-xl focus-within:border-purple-500/50 transition-all min-h-[50px]">
            {destinations.map(stop => (
              <span key={stop.id} className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm flex items-center gap-1 border border-purple-500/30">
                {stop.name}
                <X size={14} className="cursor-pointer hover:text-white" onClick={() => removeStop(stop.id, 'destination')} />
              </span>
            ))}
            <input
              type="text"
              placeholder={destinations.length === 0 ? "Ex: Serra Shopping..." : ""}
              className="bg-transparent border-none outline-none text-white flex-1 min-w-[120px]"
              onFocus={() => setShowHelper('destination')}
              value={showHelper === 'destination' ? searchTerm : ''}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* HELPER MODAL */}
        {showHelper && (
          <div className="absolute left-0 right-0 top-[calc(100%+10px)] bg-[#1a1f2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-slide-up z-30">
            <div className="p-4 bg-white/5 border-b border-white/10 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Search size={16} className="text-cyan-400" /> Escolher Paragem
              </span>
              <X size={18} className="text-gray-500 cursor-pointer hover:text-white" onClick={() => setShowHelper(null)} />
            </div>
            <div className="max-h-[350px] overflow-y-auto p-4 custom-scrollbar">
              {stopsData.map((group) => (
                <div key={group.category} className="mb-4">
                  <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[2px] mb-2">{group.category}</h3>
                  <div className="grid grid-cols-1 gap-1">
                    {group.stops
                      .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map(stop => (
                        <button
                          key={stop.id}
                          onClick={() => addStop(stop, showHelper)}
                          className="text-left text-sm text-gray-300 p-3 rounded-xl hover:bg-white/10 transition-all border border-transparent hover:border-white/5 flex items-center gap-3"
                        >
                          <MapPin size={14} className="text-gray-600" />
                          {stop.name}
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DAY TYPE SELECTOR */}
        <div className="mb-6">
          <label className="text-xs font-semibold text-cyan-400/70 uppercase tracking-wider mb-2 block flex items-center gap-2">
            <Calendar size={14} /> Em que dia vais viajar?
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'business', label: 'Útil', icon: '💼' },
              { id: 'saturday', label: 'Sábado', icon: '🛍️' },
              { id: 'holiday', label: 'Feriado', icon: '⛪' }
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

        {/* TIME PICKER */}
        <div className="mb-8">
          <label className="text-xs font-semibold text-cyan-400/70 uppercase tracking-wider mb-2 block flex items-center gap-2">
            <Clock size={14} /> A partir de que horas?
          </label>
          <input
            type="time"
            value={targetTime}
            onChange={(e) => setTargetTime(e.target.value)}
            className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white text-xl font-bold focus:border-cyan-500/50 outline-none transition-all"
          />
          <p className="text-[10px] text-gray-500 mt-2 italic">
            * Mostraremos autocarros que passem numa das origens após as {targetTime}.
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
                className="glass-container p-6 rounded-[2.5rem] border-l-4 border-l-cyan-500 hover:bg-white/5 transition-all animate-slide-up group"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-black px-4 py-1.5 rounded-xl text-xs tracking-tighter shadow-lg shadow-cyan-900/20">
                      {res.line.split('-')[0]}
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-sm leading-tight group-hover:text-cyan-400 transition-colors">{res.lineName}</h4>
                      <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest mt-1 opacity-60">
                        {dayType === 'business' ? 'Dias Úteis' : dayType === 'saturday' ? 'Sábados' : 'Feriados/Domingos'}
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
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#121826] px-3">
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
