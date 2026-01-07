import { useRef, useEffect } from "react";
import MapGL, { Marker, NavigationControl } from "react-map-gl";
import type { MapRef } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useLayout } from "skybridge/web";

type CapitalMarker = {
  name: string;
  countryName: string;
  cca2: string;
  coordinates: { lat: number; lng: number };
};

const getFlagUrl = (cca2: string) =>
  `https://flagcdn.com/w40/${cca2.toLowerCase()}.png`;

type MapViewProps = {
  capitals: CapitalMarker[];
  selectedCapital: string | null;
  center: { lat: number; lng: number };
  zoom: number;
  onCapitalClick: (capitalName: string) => void;
};

export function MapView({
  capitals,
  selectedCapital,
  center,
  zoom,
  onCapitalClick,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [center.lng, center.lat],
        zoom: zoom,
        duration: 1500,
      });
    }
  }, [center.lat, center.lng, zoom]);

  const { theme } = useLayout();

  return (
    <MapGL
      ref={mapRef}
      mapboxAccessToken={import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN}
      initialViewState={{
        longitude: center.lng,
        latitude: center.lat,
        zoom: zoom,
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle={`mapbox://styles/mapbox/${theme}-v11`}
      attributionControl={false}
    >
      <NavigationControl position="bottom-right" />

      {capitals.map((capital) => {
        const isSelected =
          selectedCapital?.toLowerCase() === capital.name.toLowerCase();
        if (
          Number.isNaN(capital.coordinates.lng) ||
          Number.isNaN(capital.coordinates.lat)
        ) {
          return null;
        }

        return (
          <Marker
            key={`${capital.cca2}-${capital.name}`}
            longitude={capital.coordinates.lng}
            latitude={capital.coordinates.lat}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onCapitalClick(capital.name);
            }}
          >
            <div
              className={`
                cursor-pointer transition-all duration-200
                ${isSelected ? "scale-125 z-10" : "hover:scale-110"}
              `}
            >
              <div
                className={`
                  relative flex items-center justify-center
                  ${isSelected ? "w-10 h-10" : "w-7 h-7"}
                `}
              >
                {/* Glow effect for selected */}
                {isSelected && (
                  <div className="absolute inset-0 rounded-full bg-amber-400/40 animate-pulse" />
                )}

                {/* Flag circle */}
                <div
                  className={`
                    rounded-full overflow-hidden border-2 shadow-lg
                    ${isSelected ? "border-amber-400 w-9 h-9" : "border-white/80 w-6 h-6"}
                  `}
                >
                  <img
                    src={getFlagUrl(capital.cca2)}
                    alt={capital.countryName}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {isSelected && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 whitespace-nowrap">
                  <span className="px-2 py-0.5 bg-slate-900/90 text-amber-400 text-xs font-medium rounded-full">
                    {capital.name}
                  </span>
                </div>
              )}
            </div>
          </Marker>
        );
      })}
    </MapGL>
  );
}
