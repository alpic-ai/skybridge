import { MapPin, Navigation } from "lucide-react";
import { useMemo } from "react";

type CapitalSummary = {
  name: string;
  countryName: string;
  cca2: string;
  coordinates: { lat: number; lng: number };
};

const getFlagUrl = (cca2: string) =>
  `https://flagcdn.com/w40/${cca2.toLowerCase()}.png`;

type NearbyListProps = {
  capitals: CapitalSummary[];
  mapCenter: { lat: number; lng: number };
  selectedCapital: string | null;
  onCapitalSelect: (capitalName: string) => void;
};

// Haversine formula to calculate distance between two points
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  if (km < 100) {
    return `${km.toFixed(1)} km`;
  }
  return `${Math.round(km).toLocaleString()} km`;
}

export function NearbyList({
  capitals,
  mapCenter,
  selectedCapital,
  onCapitalSelect,
}: NearbyListProps) {
  const sortedCapitals = useMemo(() => {
    return capitals
      .map((capital) => ({
        ...capital,
        distance: calculateDistance(
          mapCenter.lat,
          mapCenter.lng,
          capital.coordinates.lat,
          capital.coordinates.lng,
        ),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 15); // Show top 15 nearest
  }, [capitals, mapCenter.lat, mapCenter.lng]);

  return (
    <div className="h-full flex flex-col bg-slate-900/90 backdrop-blur-sm">
      <div className="px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center gap-2 text-slate-400">
          <Navigation className="w-4 h-4" />
          <span className="text-xs font-medium uppercase tracking-wider">
            Nearby Capitals
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {sortedCapitals.map((capital, index) => {
          const isSelected =
            selectedCapital?.toLowerCase() === capital.name.toLowerCase();

          return (
            <button
              type="button"
              key={`${capital.cca2}-${capital.name}`}
              onClick={() => onCapitalSelect(capital.name)}
              className={`
                w-full px-4 py-3 flex items-center gap-3 transition-all cursor-pointer
                border-b border-slate-800/50
                ${
                  isSelected
                    ? "bg-amber-500/10 border-l-2 border-l-amber-400"
                    : "hover:bg-slate-800/50 border-l-2 border-l-transparent"
                }
              `}
            >
              <span
                className={`
                  w-5 text-xs font-mono
                  ${isSelected ? "text-amber-400" : "text-slate-600"}
                `}
              >
                {index + 1}
              </span>

              <img
                src={getFlagUrl(capital.cca2)}
                alt={capital.countryName}
                className="w-6 h-4 object-cover rounded shadow-sm"
              />

              <div className="flex-1 min-w-0 text-left">
                <div
                  className={`
                    text-sm font-medium truncate
                    ${isSelected ? "text-amber-400" : "text-white"}
                  `}
                >
                  {capital.name}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {capital.countryName}
                </div>
              </div>

              <div className="flex items-center gap-1 text-slate-500">
                <MapPin className="w-3 h-3" />
                <span className="text-xs font-mono">
                  {formatDistance(capital.distance)}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="px-4 py-2 border-t border-slate-700/50 text-center">
        <span className="text-[10px] text-slate-600 uppercase tracking-wider">
          {capitals.length} capitals worldwide
        </span>
      </div>
    </div>
  );
}
