import React, { useState, useEffect } from "react";
import { DisasterAlert, TriageStatus } from "../types";
import { Cpu, ShieldCheck, HeartPulse, Send, Copy, AlertOctagon } from "lucide-react";

interface TriagePanelProps {
  activeAlert: DisasterAlert | null;
  triageStatus: TriageStatus;
  onTransmitBroadcast: (smsJp: string, smsEn: string) => void;
  isTransmitting: boolean;
  theme?: "dark" | "light";
}

export default function TriagePanel({
  activeAlert,
  triageStatus,
  onTransmitBroadcast,
  isTransmitting,
  theme = "dark",
}: TriagePanelProps) {
  const [copiedJp, setCopiedJp] = useState(false);
  const [copiedEn, setCopiedEn] = useState(false);
  const [deployedUnitB, setDeployedUnitB] = useState(false);
  const [gridRebalanced, setGridRebalanced] = useState(false);

  const isLight = theme === "light";

  // Default drafts when no active alert is present
  const defaultAlert: DisasterAlert = {
    disaster_type: "other",
    intensity_max: "0",
    epicenter: "TOKYO-3_SECTOR_01",
    affected_prefectures: [],
    immediate_hazards: ["SYSTEM MONITORING NORMAL"],
    agent_triage_directives: ["STANDBY MODE ACTIVE"],
    drafts: {
      sms_alert_jp: "避難勧告：新宿区第4セクターの方は直ちに指定の避難場所へ移動してください。",
      sms_alert_en: "EVACUATION ORDER: Sector 4 residents proceed to designated shelter.",
      social_feed_jp: "【JTDC災害対策本部】現在安定稼働中。有事の際は直ちに警戒アラートを発報します。",
    }
  };

  const alertData = activeAlert || defaultAlert;

  const handleCopy = (text: string, isJp: boolean) => {
    navigator.clipboard.writeText(text);
    if (isJp) {
      setCopiedJp(true);
      setTimeout(() => setCopiedJp(false), 2000);
    } else {
      setCopiedEn(true);
      setTimeout(() => setCopiedEn(false), 2000);
    }
  };

  const borderClass = isLight ? "border-[#ccc7b9]" : "border-[#393939]";
  const bgClass = isLight ? "bg-white text-stone-900" : "bg-[#121212] text-[#e5e2e1]";
  const headerBgClass = isLight ? "bg-[#eae6db]" : "bg-[#0c0c0c]";
  const subBgClass = isLight ? "bg-stone-50" : "bg-[#0c0c0c]";
  const consoleBgClass = isLight ? "bg-stone-100 border-stone-200" : "bg-[#050505] border-[#2a2a2a]";
  const listBorderClass = isLight ? "border-stone-200 bg-white" : "border-[#393939] bg-black";

  return (
    <div className={`grid grid-rows-[auto_1fr_auto] h-full border ${borderClass} ${bgClass} font-mono transition-colors duration-300`}>
      {/* 1. Header Row */}
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${borderClass} ${headerBgClass} text-xs transition-colors duration-300`}>
        <Cpu className="w-4 h-4 text-[#ff6600]" />
        <span className={`font-bold tracking-wider ${isLight ? "text-stone-950" : "text-white"}`}>INTEL_TRIAGE_REASONING_CORE</span>
        <span className="ml-auto text-[9px] text-[#00FF66] flex items-center gap-1 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-pulse"></span>
          COGNITIVE_ACTIVE
        </span>
      </div>

      {/* 2. Main content split layout */}
      <div className={`grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x ${borderClass} overflow-y-auto max-h-[600px]`}>
        
        {/* LEFT COLUMN: Triage Engine Logs & Resource Coordinator */}
        <div className={`flex flex-col divide-y ${borderClass}`}>
          
          {/* Triage Engine Status Log */}
          <div className={`p-3 ${isLight ? "bg-stone-50" : "bg-[#080808]"}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] text-[#00FF66] font-bold tracking-widest uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-[#00FF66] rounded-none animate-ping"></span>
                [JTDC_TRIAGE_CORE]
              </span>
              <span className="text-[8px] text-gray-500 font-bold">MODE: PROCESSING</span>
            </div>
            
            {/* Console Log readout lines */}
            <div className={`space-y-1 ${consoleBgClass} border p-2 text-[9px] leading-relaxed ${isLight ? "text-stone-700 font-medium" : "text-gray-400"} font-mono h-28 overflow-y-auto custom-scrollbar`}>
              <div className="text-[#00FF66] font-bold">&gt;&gt; AGENT_GEMINI_3.5_LOADED</div>
              <div className="text-gray-500 animate-pulse">&gt;&gt; PARSING_SATELLITE_TELEMETRY...</div>
              <div className="text-gray-500">&gt;&gt; CROSS_REF_SEISMIC_DATA: MATCH_FOUND (95%)</div>
              <div className="text-[#ff6600] font-bold">&gt;&gt; INTENSITY_SHINDO: {alertData.intensity_max}</div>
              <div className="text-gray-500">&gt;&gt; OPTIMIZING_RESOURCE_FLOW_V7_ALPHA</div>
              <div className="text-gray-500">&gt;&gt; SCANNING_CRITICAL_INFRASTRUCTURE...</div>
              {alertData.affected_prefectures.length > 0 && (
                <div className="text-[#9d05ff] font-bold">
                  &gt;&gt; AFFECTED PREFECTURES: {alertData.affected_prefectures.join(", ").toUpperCase()}
                </div>
              )}
              {alertData.immediate_hazards.map((haz, idx) => (
                <div key={idx} className="text-red-500 font-bold">&gt;&gt; ALERT_HAZARD: {haz.toUpperCase()}</div>
              ))}
            </div>
          </div>

          {/* Resource Coordinator Actions */}
          <div className={`p-3 flex-1 ${subBgClass} transition-colors duration-300`}>
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold tracking-widest block mb-2 uppercase">
              [RESOURCE_COORDINATOR]
            </span>
            <div className="space-y-2">
              
              {/* Directive item 1: Deploy Medical Unit B */}
              <div className={`border ${borderClass} ${listBorderClass} p-2 flex items-center justify-between text-[10px]`}>
                <div className="flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-rose-500" />
                  <div>
                    <div className={`font-bold ${isLight ? "text-stone-900" : "text-white"}`}>DEPLOY_MEDICAL_UNIT_B</div>
                    <div className="text-gray-500 text-[8px] font-bold">PRIORITY: HIGH | ETA: 4m</div>
                  </div>
                </div>
                <button
                  onClick={() => setDeployedUnitB(true)}
                  disabled={deployedUnitB}
                  className={`px-2 py-1 text-[8px] border font-bold ${deployedUnitB ? "border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed" : "border-rose-500 text-rose-500 hover:bg-rose-500/10 active:bg-rose-500/30"}`}
                >
                  {deployedUnitB ? "DEPLOYED" : "LAUNCH"}
                </button>
              </div>

              {/* Directive item 2: Rebalance Grid */}
              <div className={`border ${borderClass} ${listBorderClass} p-2 flex items-center justify-between text-[10px]`}>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#00e55b]" />
                  <div>
                    <div className={`font-bold ${isLight ? "text-stone-900" : "text-white"}`}>REBALANCE_POWER_GRID</div>
                    <div className="text-gray-500 text-[8px] font-bold">PRIORITY: MED | READY</div>
                  </div>
                </div>
                <button
                  onClick={() => setGridRebalanced(true)}
                  disabled={gridRebalanced}
                  className={`px-2 py-1 text-[8px] border font-bold ${gridRebalanced ? "border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed" : "border-[#00e55b] text-[#00e55b] hover:bg-[#00e55b]/10 active:bg-[#00e55b]/30"}`}
                >
                  {gridRebalanced ? "BALANCED" : "EXECUTE"}
                </button>
              </div>

              {/* Dynamic Directive Alerts from Gemini */}
              {alertData.agent_triage_directives.slice(0, 2).map((dir, idx) => (
                <div key={idx} className={`border ${isLight ? "border-amber-300 bg-amber-50" : "border-[#ff6600]/30 bg-black"} p-2 flex items-start gap-2 text-[8px] ${isLight ? "text-stone-800" : "text-gray-300"}`}>
                  <AlertOctagon className="w-3.5 h-3.5 text-[#ff6600] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#ff6600]">TRIAGE_DIRECTIVE_{idx + 1}</span>
                    <p className="mt-0.5 font-medium">{dir.replace(/^>>\s*/, "")}</p>
                  </div>
                </div>
              ))}

            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Public Broadcaster */}
        <div className={`p-3 ${isLight ? "bg-white" : "bg-[#0d0d0d]"} flex flex-col justify-between transition-colors duration-300`}>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] text-[#ff6600] font-bold tracking-widest uppercase">
                [J-ALERT_BROADCASTER]
              </span>
              <span className="text-[8px] text-gray-500 font-bold">MODE: SATELLITE DISPATCH</span>
            </div>

            {/* JP translation Box */}
            <div className="space-y-1 mb-3">
              <div className="flex items-center justify-between text-[8px] text-gray-500 font-bold">
                <span>DRAFT_MSG (JP)</span>
                <button 
                  onClick={() => handleCopy(alertData.drafts.sms_alert_jp, true)}
                  className={`flex items-center gap-1 ${isLight ? "text-stone-600 hover:text-[#ff6600]" : "text-gray-400 hover:text-white"}`}
                >
                  <Copy className="w-2.5 h-2.5" />
                  <span>{copiedJp ? "COPIED" : "COPY"}</span>
                </button>
              </div>
              <textarea
                readOnly
                value={alertData.drafts.sms_alert_jp}
                className={`w-full ${isLight ? "bg-stone-50 border-stone-200 text-stone-900" : "bg-[#050505] border-[#2a2a2a] text-[#ff8533]"} text-xs p-2 focus:outline-none resize-none h-14 border font-bold`}
              />
            </div>

            {/* EN translation Box */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[8px] text-gray-500 font-bold">
                <span>DRAFT_MSG (EN)</span>
                <button 
                  onClick={() => handleCopy(alertData.drafts.sms_alert_en, false)}
                  className={`flex items-center gap-1 ${isLight ? "text-stone-600 hover:text-[#ff6600]" : "text-gray-400 hover:text-white"}`}
                >
                  <Copy className="w-2.5 h-2.5" />
                  <span>{copiedEn ? "COPIED" : "COPY"}</span>
                </button>
              </div>
              <textarea
                readOnly
                value={alertData.drafts.sms_alert_en}
                className={`w-full ${isLight ? "bg-stone-50 border-stone-200 text-stone-900" : "bg-[#050505] border-[#2a2a2a] text-white/90"} text-xs p-2 focus:outline-none resize-none h-14 border font-bold`}
              />
            </div>
          </div>

          {/* Glowing transmitter orange button */}
          <button
            onClick={() => onTransmitBroadcast(alertData.drafts.sms_alert_jp, alertData.drafts.sms_alert_en)}
            disabled={isTransmitting}
            className="w-full py-2.5 mt-4 bg-[#ff6600] text-black font-extrabold tracking-widest text-[11px] hover:bg-[#ff8533] hover:shadow-[0_0_15px_rgba(255,102,0,0.6)] active:bg-[#cc5200] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {isTransmitting ? "TRANSMITTING BROADCAST..." : "TRANSMIT NATIONWIDE J-ALERT"}
          </button>
        </div>

      </div>

      {/* 3. Footer status line */}
      <div className={`px-3 py-1.5 border-t ${borderClass} ${headerBgClass} text-[8px] text-gray-500 transition-colors duration-300`}>
        COGNITIVE CORE INTEL :: MODEL ENGINE: GEMINI-3.5-FLASH
      </div>
    </div>
  );
}
