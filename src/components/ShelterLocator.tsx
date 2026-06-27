import React from "react";
import { Shelter } from "../types";
import { ShieldCheck, ShieldAlert, Waves, MapPin, AlertCircle } from "lucide-react";

interface ShelterLocatorProps {
  shelters: Shelter[];
  selectedShelterId: string | null;
  onSelectShelter: (id: string) => void;
  activeHazard: string;
  theme?: "dark" | "light";
}

export default function ShelterLocator({
  shelters,
  selectedShelterId,
  onSelectShelter,
  activeHazard,
  theme = "dark",
}: ShelterLocatorProps) {
  const isLight = theme === "light";
  
  // Render occupancy block indicators (10 blocks) to mimic tactical retro LED meters
  function renderSegmentedBar(current: number, max: number) {
    const ratio = current / max;
    const filledBlocks = Math.round(ratio * 10);
    
    // Choose colors matching the system specs (Purple for critical, orange for warning, green for stable)
    let blockColor = "bg-[#00FF66]";
    if (ratio >= 0.9) blockColor = "bg-[#9d05ff]";
    else if (ratio >= 0.75) blockColor = "bg-[#ff6600]";

    return (
      <div className="flex gap-0.5 mt-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`h-2 w-3 ${i < filledBlocks ? blockColor : (isLight ? "bg-stone-200" : "bg-gray-800")} border-t border-b border-black`}
            style={{ opacity: i < filledBlocks ? 1 - (10 - i) * 0.05 : 0.3 }}
          />
        ))}
      </div>
    );
  }

  // Get colors and indicators for overall shelter state
  function getCapacityBadge(current: number, max: number) {
    const ratio = current / max;
    if (ratio >= 0.9) {
      return {
        text: `CRITICAL LOAD: ${(ratio * 100).toFixed(0)}%`,
        color: "text-[#9d05ff] border-[#9d05ff] bg-[#9d05ff]/10"
      };
    } else if (ratio >= 0.75) {
      return {
        text: `WARNING: ${(ratio * 100).toFixed(0)}%`,
        color: "text-[#ff6600] border-[#ff6600] bg-[#ff6600]/10"
      };
    } else {
      return {
        text: `STABLE: ${(ratio * 100).toFixed(0)}%`,
        color: "text-[#00FF66] border-[#00FF66] bg-[#00FF66]/10"
      };
    }
  }

  const borderClass = isLight ? "border-[#ccc7b9]" : "border-[#393939]";
  const bgClass = isLight ? "bg-white text-stone-900" : "bg-[#121212] text-[#e5e2e1]";
  const headerBgClass = isLight ? "bg-[#eae6db]" : "bg-[#0c0c0c]";
  const itemBgClass = isLight ? "bg-[#fbf9f4] hover:bg-stone-100" : "bg-[#0c0c0c] hover:bg-[#161616]";
  const itemBorderClass = isLight ? "border-stone-200" : "border-[#393939]";

  return (
    <div className={`border ${borderClass} ${bgClass} flex flex-col h-full font-mono transition-colors duration-300`}>
      {/* Header Panel */}
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${borderClass} ${headerBgClass} text-xs justify-between transition-colors duration-300`}>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#ff6600]" />
          <span className="font-bold tracking-wider text-[#ff6600]">JTDC_SHELTER_LOCATOR</span>
        </div>
        <div className="text-[9px] text-gray-400 font-bold">
          HAZARD_VECTOR: <span className="text-[#ff6600] uppercase font-bold">{activeHazard}</span>
        </div>
      </div>

      {/* Grid List of Shelters */}
      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-h-[300px] md:max-h-[350px]">
        {shelters.map((shelter) => {
          const isSelected = shelter.id === selectedShelterId;
          const ratio = shelter.capacity_current / shelter.capacity_max;
          const isCritical = ratio >= 0.9;
          const isWarning = ratio >= 0.75 && ratio < 0.9;
          
          // Outer glow classes matching specs
          let glowBorder = itemBorderClass;
          if (isSelected) {
            if (isCritical) glowBorder = "border-[#9d05ff] glow-purple";
            else if (isWarning) glowBorder = "border-[#ff6600] glow-orange";
            else glowBorder = "border-[#00FF66] glow-green";
          }

          const capBadge = getCapacityBadge(shelter.capacity_current, shelter.capacity_max);

          return (
            <div
              key={shelter.id}
              onClick={() => onSelectShelter(shelter.id)}
              className={`border p-3 transition-all duration-200 cursor-pointer ${itemBgClass} relative flex flex-col justify-between ${glowBorder}`}
            >
              {/* Highlight notch for selected card */}
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#ff6600] transform rotate-45 border-r border-t border-black pointer-events-none"></div>
              )}

              <div>
                {/* Header section with distance */}
                <div className="flex items-start justify-between mb-1">
                  <span className={`text-[10px] font-bold ${isLight ? "text-stone-950" : "text-white"} tracking-wide uppercase break-words truncate max-w-[130px]`}>
                    {shelter.name_en}
                  </span>
                  <span className="text-[10px] text-[#00e55b] font-bold shrink-0">
                    {shelter.distance_km ? `${shelter.distance_km} KM` : "NEARBY"}
                  </span>
                </div>

                {/* Subtitle / JP name */}
                <span className="text-[9px] text-gray-500 block truncate mb-2 font-bold">
                  {shelter.name}
                </span>

                {/* Occupancy and block meter */}
                <div className={`mt-1 pb-2 border-b ${isLight ? "border-stone-200" : "border-[#1c1b1b]"}`}>
                  <div className="flex justify-between items-center text-[8px] font-bold">
                    <span className="text-gray-400">CAPACITY LOAD:</span>
                    <span className={`px-1 font-bold border text-[8px] ${capBadge.color}`}>
                      {capBadge.text}
                    </span>
                  </div>
                  {renderSegmentedBar(shelter.capacity_current, shelter.capacity_max)}
                </div>
              </div>

              {/* Hazard safety flags (Earthquake, Tsunami, Flood) */}
              <div className="mt-2.5 pt-1 flex items-center gap-1.5">
                <span className="text-[7px] text-gray-500 font-bold uppercase shrink-0">
                  SAFE_FLAGS:
                </span>
                
                {/* EQ Flag */}
                <span 
                  title="Earthquake Approved" 
                  className={`text-[8px] px-1 py-0.5 border flex items-center gap-0.5 font-bold ${shelter.hazard_eq ? "border-[#00FF66]/30 text-[#00FF66] bg-[#00FF66]/5" : (isLight ? "border-stone-200 text-stone-300" : "border-gray-800 text-gray-600 bg-transparent")}`}
                >
                  EQ
                </span>

                {/* TS Flag */}
                <span 
                  title="Tsunami Approved" 
                  className={`text-[8px] px-1 py-0.5 border flex items-center gap-0.5 font-bold ${shelter.hazard_ts ? "border-[#00FF66]/30 text-[#00FF66] bg-[#00FF66]/5" : (isLight ? "border-stone-200 text-stone-300" : "border-gray-800 text-gray-600 bg-transparent")}`}
                >
                  TS
                </span>

                {/* FL Flag */}
                <span 
                  title="Flood Approved" 
                  className={`text-[8px] px-1 py-0.5 border flex items-center gap-0.5 font-bold ${shelter.hazard_fl ? "border-[#00FF66]/30 text-[#00FF66] bg-[#00FF66]/5" : (isLight ? "border-stone-200 text-stone-300" : "border-gray-800 text-gray-600 bg-transparent")}`}
                >
                  FL
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legends & Metadata panel footer */}
      <div className={`px-3 py-1.5 border-t ${borderClass} ${headerBgClass} text-[9px] text-gray-500 flex justify-between items-center transition-colors duration-300`}>
        <div className="flex gap-3 font-bold">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-[#00FF66] rounded-none"></span>
            STABLE (&lt;75%)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-[#ff6600] rounded-none"></span>
            WARNING (75%-90%)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-[#9d05ff] rounded-none"></span>
            CRITICAL (&gt;90%)
          </span>
        </div>
        <div className="flex items-center gap-1 font-bold">
          <AlertCircle className="w-3 h-3 text-[#ff6600]" />
          <span>GSI GEOMETRIC DATASET (MLIT JAPAN)</span>
        </div>
      </div>
    </div>
  );
}
