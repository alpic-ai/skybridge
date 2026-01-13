import { useEffect, useState } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { mountWidget, useDisplayMode } from "skybridge/web";
import { Spinner } from "@/components/ui/shadcn-io/spinner/index.js";
import { useCallTool, useToolInfo } from "../helpers.js";
import { CapitalDetail } from "./components/CapitalDetail.js";
import { MapView } from "./components/MapView.js";
import { NearbyList } from "./components/NearbyList.js";

// biome-ignore lint/correctness/useImportExtensions: biome doesn't support .css imports
import "@/index.css";

function CapitalExplorer() {
  const [displayMode, setDisplayMode] = useDisplayMode();
  const isFullscreen = displayMode === "fullscreen";

  const { input, output, responseMetadata, isPending } =
    useToolInfo<"capital">();
  const [selectedCapital, setSelectedCapital] = useState(input?.name);
  const [pendingCapital, setPendingCapital] = useState<string | null>(null);
  const allCapitals = responseMetadata?.allCapitals || [];

  const {
    callTool: travelTo,
    isPending: isTraveling,
    data,
  } = useCallTool("capital");

  useEffect(() => {
    if (isFullscreen && pendingCapital) {
      setSelectedCapital(pendingCapital);
      travelTo({ name: pendingCapital });
      setPendingCapital(null);
    }
  }, [isFullscreen, pendingCapital, travelTo]);

  const isLoadingCapital = isPending || isTraveling;
  const capitalLight = allCapitals.find(
    (capital) => capital.name === selectedCapital,
  );
  const mapCenter = capitalLight?.coordinates || { lat: 48, lng: 2 };
  const capital = data?.structuredContent.capital || output?.capital;

  const handleCapitalClick = (capitalName: string) => {
    setPendingCapital(capitalName);
    setDisplayMode("fullscreen");
  };

  return (
    <div
      className={`
        bg-slate-950 overflow-hidden transition-all duration-500 ease-out
        ${isFullscreen ? "fixed inset-0 z-50" : "relative h-[500px] rounded-xl"}
      `}
    >
      <div className="absolute inset-0">
        <MapView
          capitals={allCapitals}
          selectedCapital={selectedCapital ?? null}
          center={mapCenter}
          zoom={5}
          onCapitalClick={handleCapitalClick}
        />
      </div>
      Left Panel - Nearby Capitals
      <div
        className={`
          absolute left-0 top-0 bottom-0 w-72 transition-transform duration-500
          ${isFullscreen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <NearbyList
          capitals={allCapitals}
          mapCenter={mapCenter}
          selectedCapital={selectedCapital ?? null}
          onCapitalSelect={handleCapitalClick}
        />
      </div>
      <div
        className={`
          absolute right-0 top-0 bottom-0 w-80 transition-transform duration-500
          ${isFullscreen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {isLoadingCapital ? (
          <div className="h-full flex flex-col bg-slate-900/95 backdrop-blur-sm overflow-hidden items-center justify-center">
            <Spinner color="white" />
          </div>
        ) : capital ? (
          <CapitalDetail capital={capital} />
        ) : null}
      </div>
      {isFullscreen && (
        <button
          type="button"
          onClick={() => setDisplayMode("inline")}
          className="cursor-pointer absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900/80 backdrop-blur-sm text-slate-300 text-sm rounded-full border border-slate-700/50 hover:bg-slate-800 transition-colors"
        >
          Exit Fullscreen
        </button>
      )}
    </div>
  );
}

function CapitalWidget() {
  return (
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<CapitalExplorer />}>
          <Route path="/:capitalName" element={<CapitalExplorer />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

export default CapitalWidget;

mountWidget(<CapitalWidget />);
