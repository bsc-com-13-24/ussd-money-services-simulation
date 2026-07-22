import { useState } from "react";
import UssdPhone from "./UssdPhone";
import { airtelConfig } from "./institutions/airtel";
import { mpambaConfig } from "./institutions/mpamba";
import { bankConfig } from "./institutions/bank";

const INSTITUTIONS = [airtelConfig, mpambaConfig, bankConfig];

export default function App() {
  const [active, setActive] = useState(0);

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center p-6 font-sans gap-4">
      <div className="flex gap-2">
        {INSTITUTIONS.map((inst, i) => (
          <button
            key={inst.key}
            onClick={() => setActive(i)}
            className="px-3 py-1.5 rounded-full text-xs font-medium border"
            style={{
              backgroundColor: active === i ? inst.brandColor : "transparent",
              borderColor: inst.brandColor,
              color: active === i ? "#fff" : inst.brandColor,
            }}
          >
            {inst.displayName}
          </button>
        ))}
      </div>
      {/* key={key} forces a full remount when switching institutions —
          each has its own SIM/session state, no bleed-through */}
      <UssdPhone key={INSTITUTIONS[active].key} institution={INSTITUTIONS[active]} />
    </div>
  );
}
