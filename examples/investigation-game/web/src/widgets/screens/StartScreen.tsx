import { useOpenExternal } from "skybridge/web";

import { alpicLogo } from "../../data/images";
import { RainEffect } from "../components/effects/RainEffect";
import { LightningBolt } from "../components/svg/LightningBolt";
import { LightningBoltAlt } from "../components/svg/LightningBoltAlt";
import { SilhouetteHunched } from "../components/svg/SilhouetteHunched";
import { SilhouetteLeaning } from "../components/svg/SilhouetteLeaning";
import { SilhouetteStanding } from "../components/svg/SilhouetteStanding";

type StartScreenProps = {
  onStart: () => void;
};

export function StartScreen({ onStart }: StartScreenProps) {
  const openExternal = useOpenExternal();

  return (
    <div className="relative rounded-2xl overflow-hidden min-h-[400px] lg:min-h-[500px]">
      <div className="absolute inset-0 bg-linear-to-b from-[#12121a] via-[#221530] to-[#142236]" />
      <div className="absolute inset-0 bg-linear-to-t from-purple-900/20 via-transparent to-transparent" />
      <div className="lightning-overlay absolute inset-0 bg-linear-to-b from-purple-400/40 via-white/20 to-transparent pointer-events-none" />
      <div className="lightning-overlay-delayed absolute inset-0 bg-linear-to-br from-indigo-400/30 via-transparent to-purple-500/10 pointer-events-none" />
      <div className="lightning-overlay-third absolute inset-0 bg-linear-to-b from-purple-300/35 via-white/15 to-transparent pointer-events-none" />
      <div className="lightning-overlay-fourth absolute inset-0 bg-linear-to-bl from-indigo-300/30 via-white/10 to-transparent pointer-events-none" />

      <LightningBolt className="bolt-flash absolute top-0 left-[15%] w-12 h-64 text-purple-300/90 -rotate-12" />
      <LightningBoltAlt className="bolt-flash-delayed absolute top-0 right-[20%] w-10 h-56 text-indigo-300/80 rotate-6" />
      <LightningBolt className="bolt-flash-third absolute top-0 left-[40%] w-8 h-48 text-purple-200/70 rotate-3" />
      <LightningBoltAlt className="bolt-flash-fourth absolute top-0 right-[35%] w-9 h-52 text-indigo-200/75 -rotate-6" />

      <RainEffect />

      <div className="absolute bottom-0 left-0 right-0 h-[70%] flex items-end justify-center gap-0">
        <SilhouetteStanding className="silhouette-sway h-[72%] w-auto text-black/90 -mr-4 mb-0 drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]" />
        <SilhouetteHunched className="silhouette-sway-slow h-[85%] w-auto text-black/95 z-10 drop-shadow-[0_0_40px_rgba(0,0,0,0.9)]" />
        <SilhouetteLeaning className="silhouette-sway-reverse h-[68%] w-auto text-black/85 -ml-4 mb-0 -scale-x-100 drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-20 bg-linear-to-t from-black/80 via-black/40 to-transparent" />

      <div className="relative z-20 flex flex-col items-center justify-between h-full min-h-[400px] lg:min-h-[500px] p-8 lg:p-12">
        <div className="text-center pt-6 lg:pt-10">
          <h1 className="font-pixel text-lg sm:text-xl lg:text-2xl text-purple-200 title-flicker leading-relaxed tracking-wider">
            MURDER
            <br />
            <span className="text-white">IN THE VALLEY</span>
          </h1>
        </div>

        <div className="flex-1" />

        <div className="pb-8 lg:pb-12">
          <button
            onClick={onStart}
            className="button-pulse font-pixel text-sm lg:text-base px-8 lg:px-12 py-4 lg:py-5 bg-linear-to-b from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white rounded-lg border-2 border-purple-400/50 transition-colors duration-200 uppercase tracking-widest"
          >
            Start
          </button>
        </div>
      </div>

      <button
        onClick={() => openExternal("https://alpic.ai")}
        className="absolute bottom-5 right-5 lg:bottom-6 lg:right-6 z-20 flex items-end gap-2 opacity-60 hover:opacity-100 transition-opacity duration-200 cursor-pointer"
      >
        <span className="text-[11px] lg:text-xs text-slate-400 tracking-wide leading-none">An</span>
        <img src={alpicLogo} alt="Alpic" className="h-4 lg:h-5" />
        <span className="text-[11px] lg:text-xs text-slate-400 tracking-wide leading-none">game</span>
      </button>
    </div>
  );
}
