import React, { useRef, useEffect } from "react";
import { IntelItem } from "../types";
import { Radio, AlertTriangle, ShieldCheck, Flame, Cpu } from "lucide-react";

interface IntelStreamProps {
  feed: IntelItem[];
  onSelectItem?: (item: IntelItem) => void;
  theme?: "dark" | "light";
}

export default function IntelStream({ feed, onSelectItem, theme = "dark" }: IntelStreamProps) {
  const containerEndRef = useRef<HTMLDivElement>(null);
  const isLight = theme === "light";

  // Auto scroll down as new live intel logs arrive
  useEffect(() => {
    containerEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [feed]);

  // Decides colors and icons of NERV status chips
  function getTagStyles(tag: IntelItem["tag"]) {
    switch (tag) {
      case "CRITICAL":
        return {
          bg: "bg-[#9d05ff]/20 text-[#9d05ff] border-[#9d05ff]",
          label: "CRIT",
          icon: <Flame className="w-3 h-3 animate-pulse" />
        };
      case "URGENT":
        return {
          bg: "bg-[#ff6600]/20 text-[#ff6600] border-[#ff6600]",
          label: "URGENT",
          icon: <AlertTriangle className="w-3 h-3 animate-bounce" />
        };
      case "FLASH":
        return {
          bg: "bg-[#ff6600]/10 text-[#ff8533] border-[#ff6600]/40",
          label: "FLASH",
          icon: <Radio className="w-3 h-3 text-[#ff6600] animate-pulse" />
        };
      case "NERV":
        return {
          bg: "bg-[#00e55b]/20 text-[#00e55b] border-[#00e55b]",
          label: "JTDC_HQ",
          icon: <Cpu className="w-3 h-3" />
        };
      case "STABLE":
      default:
        return {
          bg: isLight ? "bg-stone-100 text-stone-700 border-stone-300" : "bg-gray-800 text-gray-300 border-gray-700",
          label: "STABLE",
          icon: <ShieldCheck className="w-3 h-3" />
        };
    }
  }

  const borderClass = isLight ? "border-[#ccc7b9]" : "border-[#393939]";
  const bgClass = isLight ? "bg-white text-stone-900" : "bg-[#121212] text-[#e5e2e1]";
  const headerBgClass = isLight ? "bg-[#eae6db]" : "bg-[#0c0c0c]";
  const itemBgClass = isLight ? "bg-[#fbf9f4] border-stone-200 hover:bg-stone-50" : "bg-[#0c0c0c] border-[#2a2a2a] hover:border-[#ff6600]/50";
  const itemBorderClass = isLight ? "border-stone-200" : "border-[#2a2a2a]";
  const textMutedClass = isLight ? "text-stone-500 font-bold" : "text-gray-500 font-bold";
  const textBodyClass = isLight ? "text-stone-800 font-medium" : "text-gray-300";

  return (
    <div className={`border ${borderClass} ${bgClass} flex flex-col h-full font-mono transition-colors duration-300`}>
      {/* Panel Header */}
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${borderClass} ${headerBgClass} text-xs transition-colors duration-300`}>
        <Radio className="w-4 h-4 text-[#ff6600] animate-pulse" />
        <span className="font-bold tracking-wider text-[#ff6600]">JTDC_INTEL_STREAM</span>
        <span className="ml-auto text-[10px] bg-[#ff6600]/10 text-[#ff6600] px-1.5 py-0.5 border border-[#ff6600]/30 animate-pulse">
          LIVE_FEED
        </span>
      </div>

      {/* Scrolling Content Feed Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar max-h-[350px] md:max-h-[500px]">
        {feed.map((item) => {
          const styles = getTagStyles(item.tag);
          return (
            <div
              key={item.id}
              onClick={() => onSelectItem?.(item)}
              className={`group border ${itemBgClass} p-2.5 transition-all duration-200 cursor-pointer relative`}
            >
              {/* Highlight bar inside container */}
              <div className="absolute top-0 left-0 bottom-0 w-[2px] bg-transparent group-hover:bg-[#ff6600] transition-all"></div>
              
              {/* Log Header Row */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-[10px] ${textMutedClass} tracking-wide`}>
                  {item.time}
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 border font-bold tracking-widest flex items-center gap-1 ${styles.bg}`}>
                  {styles.icon}
                  {styles.label}
                </span>
              </div>

              {/* Log Body Text */}
              <p className={`text-[11px] leading-relaxed ${textBodyClass} break-words group-hover:text-[#ff6600] transition-colors`}>
                {item.text}
              </p>
            </div>
          );
        })}
        <div ref={containerEndRef} />
      </div>

      {/* Panel Status Line */}
      <div className={`px-3 py-1.5 border-t ${borderClass} ${headerBgClass} text-[9px] text-gray-500 flex justify-between transition-colors duration-300`}>
        <span>STREAM_RATE: 12.4 kb/s</span>
        <span className="text-[#00e55b] animate-pulse font-bold">● FEED_ONLINE</span>
      </div>
    </div>
  );
}
