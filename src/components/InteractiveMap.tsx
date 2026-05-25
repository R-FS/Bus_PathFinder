import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import stopsData from '../../data/stops.json';

interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface StopGroup {
  category: string;
  stops: Stop[];
}

interface InteractiveMapProps {
  highlightedStops?: string[];
  centerStopId?: string | null;
  routeStopIds?: string[];
  selectedLineId?: string | null;
  liveBuses?: any[];
  onSelectAsOrigin?: (stopId: string) => void;
  onSelectAsDest?: (stopId: string) => void;
}

const typedStopsData = stopsData as StopGroup[];
const allStops = typedStopsData[0].stops;

const ResizeMap = () => {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => { 
      map.invalidateSize();
      window.dispatchEvent(new Event('resize'));
    }, 200);
  }, [map]);
  return null;
};

const ChangeView = ({ center }: { center: [number, number] | null }) => {
  const map = useMap();
  useEffect(() => {
    if (center && map) {
      try {
        map.setView(center, 18, { animate: true });
      } catch (e) {
        console.warn("Map view change failed:", e);
      }
    }
  }, [center, map]);
  return null;
};

const InteractiveMap: React.FC<InteractiveMapProps> = ({ 
  highlightedStops = [], 
  centerStopId, 
  routeStopIds = [],
  onSelectAsOrigin,
  onSelectAsDest
}) => {
  const covilhaCenter: [number, number] = [40.2825, -7.5033];
  const [roadPath, setRoadPath] = useState<[number, number][]>([]);
  
  // Logic to fetch the real road path from OSRM
  useEffect(() => {
    let active = true;
    if (routeStopIds.length < 2) {
      setRoadPath([]);
      return;
    }

    // DRASTIC SIMPLIFICATION: Max 15 stops to avoid 502/URL length issues
    const maxStops = 15;
    const simplifiedIds = routeStopIds.length > maxStops 
      ? routeStopIds.filter((_, i) => i % Math.ceil(routeStopIds.length / maxStops) === 0 || i === routeStopIds.length - 1)
      : routeStopIds;

    const coords = simplifiedIds
      .map(id => allStops.find(s => s.id === id))
      .filter((s): s is Stop => !!s)
      .map(s => `${s.lng},${s.lat}`)
      .join(';');

    // Use AllOrigins Proxy - More resilient for development
    const osrmUrl = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(osrmUrl)}`;

    fetch(proxyUrl)
      .then(res => {
        if (!res.ok) throw new Error(`Routing Proxy Status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (active && data.routes && data.routes[0]) {
          const points = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
          setRoadPath(points);
        }
      })
      .catch(err => {
        console.warn("Road path failed, using straight lines:", err.message);
        if (active) {
          const fallback = routeStopIds
            .map(id => allStops.find(s => s.id === id))
            .filter((s): s is Stop => !!s)
            .map(s => [s.lat, s.lng] as [number, number]);
          setRoadPath(fallback);
        }
      });
      
    return () => { active = false; };
  }, [routeStopIds]);

  const centerPos = centerStopId 
    ? allStops.find(s => s.id === centerStopId) 
    : null;

  const routeStops = allStops.filter(s => routeStopIds.includes(s.id));
  const clusteredStops = allStops.filter(s => !routeStopIds.includes(s.id));

  const renderStop = (stop: Stop, inRoute: boolean) => {
    const isHighlighted = highlightedStops.includes(stop.id);
    const isFocused = centerStopId === stop.id;
    
    let color = inRoute ? '#06b6d4' : '#475569';
    let radius = inRoute ? 6 : 4;
    let weight = inRoute ? 2 : 1;
    let opacity = isHighlighted || inRoute ? 1 : 0.5;

    if (isFocused) {
      color = '#ffffff';
      radius = 8;
      weight = 3;
      opacity = 1;
    }

    return (
      <CircleMarker 
        key={`${inRoute ? 'route' : 'cluster'}-${stop.id}`} 
        center={[stop.lat, stop.lng]}
        pathOptions={{ 
          fillColor: color, 
          color: isFocused ? '#06b6d4' : color, 
          fillOpacity: opacity,
          weight: weight
        }}
        radius={radius}
      >
        <Popup className="custom-popup" autoPan={false}>
          <div className="p-2 min-w-[180px]">
            <div className="mb-3">
              <p className="text-[9px] text-cyan-500 font-black uppercase tracking-widest mb-0.5">Paragem</p>
              <h3 className="font-bold text-white text-sm leading-tight">{stop.name}</h3>
              <p className="text-[10px] text-gray-500 font-mono mt-1">ID: #{stop.id}</p>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
              <button 
                onClick={() => onSelectAsOrigin?.(stop.id)}
                className="w-full py-2 bg-cyan-600/20 hover:bg-cyan-600 text-cyan-400 hover:text-white text-[10px] font-bold rounded-lg transition-all border border-cyan-500/20"
              >
                Partir daqui
              </button>
              <button 
                onClick={() => onSelectAsDest?.(stop.id)}
                className="w-full py-2 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white text-[10px] font-bold rounded-lg transition-all border border-purple-500/20"
              >
                Ir para aqui
              </button>
            </div>
          </div>
        </Popup>
      </CircleMarker>
    );
  };

  return (
    <div className="h-full w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative z-10 bg-[#0f1219]">
      <MapContainer 
        center={covilhaCenter} 
        zoom={14} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        maxZoom={20}
      >
        <ResizeMap />
        <TileLayer
          attribution='&copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={20}
        />

        <ChangeView center={centerPos ? [centerPos.lat, centerPos.lng] : null} />

        {/* BUS ROUTE POLYLINE (SOLID) */}
        {roadPath.length > 0 && (
          <Polyline 
            positions={roadPath} 
            pathOptions={{ 
              color: '#06b6d4', 
              weight: 5, 
              opacity: 1,
              lineJoin: 'round'
            }} 
          />
        )}

        {/* ROUTE STOPS (OUTSIDE CLUSTER) */}
        {routeStops.map(s => renderStop(s, true))}

        {/* OTHER STOPS */}
        {clusteredStops.map(s => renderStop(s, false))}
      </MapContainer>

      <div className="absolute bottom-4 right-4 z-[1000] bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[10px] text-gray-400 font-medium">
        Mostrando {allStops.length} paragens
      </div>
    </div>
  );
};

export default InteractiveMap;
