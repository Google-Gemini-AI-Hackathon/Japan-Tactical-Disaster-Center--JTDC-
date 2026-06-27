import React, { useState, useRef } from "react";
import { Upload, Zap, ShieldAlert, Sparkles, Image as ImageIcon, Loader } from "lucide-react";

interface SimulationControlsProps {
  onTriggerEarthquake: (mag: number, epicenter: string, lat: number, lng: number) => void;
  onRunTriage: (prompt: string, imageBase64?: string, imageMime?: string) => void;
  isProcessing: boolean;
  theme?: "dark" | "light";
}

export default function SimulationControls({
  onTriggerEarthquake,
  onRunTriage,
  isProcessing,
  theme = "dark",
}: SimulationControlsProps) {
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedImage, setSelectedImage] = useState<{ base64: string; mime: string; name: string } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLight = theme === "light";

  // Quick scenario presets
  const scenarios = [
    {
      label: "MAG_7.2_TOKYO_BAY",
      desc: "Earthquake trigger",
      action: () => onTriggerEarthquake(7.2, "Tokyo Bay (東京湾)", 35.60, 139.80),
    },
    {
      label: "SAGAMI_BAY_TSUNAMI",
      desc: "Tsunami wave alert",
      action: () => onTriggerEarthquake(6.8, "Sagami Bay (相模湾)", 35.15, 139.40),
    },
    {
      label: "EDOGAWA_FLOOD_VECTOR",
      desc: "Extreme flood simulation",
      action: () => {
        onRunTriage(
          "Analyze flood hazard in low-lying Edogawa sector. Rain levels reaching 120mm/hr. River banks overflowing."
        );
      },
    },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const base64Data = reader.result.split(",")[1];
        setSelectedImage({
          base64: base64Data,
          mime: file.type,
          name: file.name,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleExecuteTriage = () => {
    if (!customPrompt && !selectedImage) return;
    onRunTriage(
      customPrompt || "Analyze this tactical satellite image and provide disaster response triage commands.",
      selectedImage?.base64,
      selectedImage?.mime
    );
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const borderClass = isLight ? "border-[#ccc7b9]" : "border-[#393939]";
  const bgClass = isLight ? "bg-white text-stone-900" : "bg-[#121212] text-[#e5e2e1]";
  const headerBgClass = isLight ? "bg-[#eae6db]" : "bg-[#0c0c0c]";
  const itemBgClass = isLight ? "bg-[#fbf9f4]" : "bg-[#0c0c0c]";
  const innerBgClass = isLight ? "bg-stone-50" : "bg-black";
  const textMutedClass = isLight ? "text-stone-500 font-bold" : "text-gray-500";
  const labelClass = isLight ? "text-stone-700 font-bold" : "text-gray-400 font-bold";

  return (
    <div className={`border ${borderClass} ${bgClass} flex flex-col h-full font-mono transition-colors duration-300`}>
      {/* Header Panel */}
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${borderClass} ${headerBgClass} text-xs transition-colors duration-300`}>
        <Zap className="w-4 h-4 text-[#ff6600]" />
        <span className="font-bold tracking-wider text-[#ff6600]">JTDC_SIMULATION_CONTROLS</span>
        <span className="ml-auto text-[8px] border border-red-500/30 text-red-500 px-1 py-0.5 bg-red-500/5 animate-pulse font-bold">
          SANDBOX_MODE
        </span>
      </div>

      <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto max-h-[350px]">
        
        {/* Left pane: Quick Trigger Actions */}
        <div className="space-y-3">
          <span className={`text-[10px] ${labelClass} tracking-widest block uppercase`}>
            [PRESET_SEISMIC_TRIGGERS]
          </span>
          <div className="space-y-2">
            {scenarios.map((sc, idx) => (
              <button
                key={idx}
                onClick={sc.action}
                className={`w-full text-left border ${isLight ? "border-stone-300 hover:border-[#ff6600]" : "border-[#ff6600]/30 hover:border-[#ff6600]"} ${itemBgClass} hover:bg-[#ff6600]/10 p-2.5 transition-all text-xs flex justify-between items-center cursor-pointer group`}
              >
                <div>
                  <div className={`font-extrabold ${isLight ? "text-stone-900" : "text-white"} group-hover:text-[#ff6600]`}>
                    {sc.label}
                  </div>
                  <div className={`text-[9px] ${textMutedClass} mt-0.5`}>{sc.desc}</div>
                </div>
                <Zap className="w-4 h-4 text-[#ff6600] opacity-50 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </div>

        {/* Right pane: Custom Triage & Satellite Uploader */}
        <div className="space-y-3 flex flex-col justify-between">
          <div>
            <span className={`text-[10px] ${labelClass} tracking-widest block uppercase`}>
              [SATELLITE_IMAGE_INGESTION]
            </span>
            
            {/* Drag & Drop File Container */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed ${isLight ? "border-stone-300" : "border-[#393939]"} ${innerBgClass} hover:opacity-90 transition-all p-3 text-center cursor-pointer relative h-24 flex flex-col justify-center items-center mt-2 ${dragActive ? "border-[#ff6600] bg-[#ff6600]/5" : "hover:border-gray-500"}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedImage ? (
                <div className="flex items-center gap-2 text-left w-full px-2" onClick={(e) => e.stopPropagation()}>
                  <ImageIcon className="w-8 h-8 text-[#00FF66] shrink-0" />
                  <div className="truncate flex-1">
                    <div className={`text-[10px] font-bold ${isLight ? "text-stone-950" : "text-white"} truncate`}>{selectedImage.name}</div>
                    <div className="text-[8px] text-gray-500 uppercase font-bold">File ready for Gemini upload</div>
                  </div>
                  <button
                    onClick={handleClearImage}
                    className="text-red-500 hover:text-red-400 text-[9px] font-bold underline cursor-pointer"
                  >
                    REMOVE
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-gray-500 mb-1" />
                  <div className={`text-[9px] ${isLight ? "text-stone-600" : "text-gray-400"}`}>
                    DRAG & DROP SATELLITE PHOTO OR <span className="text-[#ff6600] font-bold">BROWSE</span>
                  </div>
                  <div className="text-[7px] text-gray-500 mt-0.5">SUPPORTED: JPG, PNG, WEBP</div>
                </>
              )}
            </div>

            {/* Custom text query box */}
            <div className="mt-2.5">
              <span className="text-[8px] text-gray-500 font-bold uppercase block mb-1">
                ADDITIONAL CRITICAL DIRECTIVE PROMPT
              </span>
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g. Earthquake in central Tokyo block 3 with collapsed bridges..."
                className={`w-full ${isLight ? "bg-stone-50 border-stone-200 text-stone-900" : "bg-[#050505] border-[#2a2a2a] text-white"} text-xs p-2 focus:outline-none focus:border-[#ff6600] border`}
              />
            </div>
          </div>

          {/* Core action button */}
          <button
            onClick={handleExecuteTriage}
            disabled={isProcessing || (!customPrompt && !selectedImage)}
            className="w-full mt-3 py-2 bg-transparent border border-[#00FF66] hover:bg-[#00FF66]/10 text-[#00FF66] hover:shadow-[0_0_10px_rgba(0,255,102,0.3)] disabled:border-gray-300 disabled:text-gray-400 disabled:bg-transparent disabled:shadow-none transition-all cursor-pointer font-bold text-[10px] tracking-wider uppercase flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader className="w-3.5 h-3.5 animate-spin" />
                <span>TRIAGING MULTI-AGENT RESPONSE...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>RUN AI SATELLITE TRIAGE ANALYZER</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Footer info line */}
      <div className={`px-3 py-1.5 border-t ${borderClass} ${headerBgClass} text-[8px] text-gray-500 transition-colors duration-300`}>
        SIMULATOR CHANNELS RE-CONNECTED :: ACTIVE TELEMETRY EMULATOR (1.0.4)
      </div>
    </div>
  );
}
