import { useOpenExternal } from "skybridge/web";

import { elonImage } from "../../data/images";
import { PrisonBars } from "../components/svg/PrisonBars";

export function VictoryScreen() {
  const openExternal = useOpenExternal();

  return (
    <div className="victory-enter relative rounded-2xl overflow-hidden min-h-[320px] sm:min-h-[360px] lg:min-h-[420px] bg-linear-to-b from-[#0a0a0f] via-[#1a1025] to-[#0f1a2a]">
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(34, 197, 94, 0.15) 0%, transparent 70%)",
        }}
      />

      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 max-w-[160px] sm:max-w-[200px]">
        <div className="bg-slate-900/80 border border-purple-500/30 rounded-lg px-4 py-3 backdrop-blur-sm">
          <p className="text-[10px] sm:text-xs text-slate-300 leading-relaxed">
            If you want to build a cool App like this one, you should check out{" "}
            <button
              onClick={() => openExternal("https://github.com/alpic-ai/skybridge")}
              className="text-amber-400 hover:text-amber-300 transition-colors cursor-pointer font-semibold"
            >
              Skybridge
            </button>
          </p>
        </div>
      </div>

      <div className="text-center pt-4 sm:pt-6 lg:pt-8">
        <h2 className="victory-title font-pixel text-sm sm:text-base lg:text-xl text-green-400 tracking-wider">
          CASE SOLVED!
        </h2>
        <p className="mt-2 font-pixel text-[10px] sm:text-xs text-purple-300">The murderer has been caught</p>
      </div>

      <div className="flex items-center justify-center mt-4 sm:mt-6 lg:mt-8">
        <div className="relative">
          <div className="w-32 h-40 sm:w-40 sm:h-52 lg:w-48 lg:h-60 rounded-lg overflow-hidden border-4 border-slate-600">
            <img src={elonImage} alt="Elon" className="w-full h-full object-cover grayscale-30" />
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <PrisonBars className="w-full h-full text-slate-700 opacity-80" />
          </div>

          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black px-3 py-1 border border-slate-600">
            <span className="font-pixel text-[8px] sm:text-[10px] text-red-400">GUILTY</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 sm:bottom-6 left-4 right-4">
        <div className="dialogue-box px-3 py-2 sm:px-4 sm:py-3">
          <p className="font-pixel text-[8px] sm:text-[10px] text-amber-100 leading-relaxed text-center">
            Elon killed Claude by accident when Sam's stolen code didn't work—Dario had changed it the day before.
          </p>
        </div>
      </div>
    </div>
  );
}
