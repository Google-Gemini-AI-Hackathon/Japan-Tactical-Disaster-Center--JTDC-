import React, { useState, useEffect } from "react";
import { DisasterAlert, IntelItem, Shelter, TriageStatus } from "./types";
import TacticalMap from "./components/TacticalMap";
import IntelStream from "./components/IntelStream";
import TriagePanel from "./components/TriagePanel";
import ShelterLocator from "./components/ShelterLocator";
import SimulationControls from "./components/SimulationControls";
import { 
  Shield, 
  Map, 
  Radio, 
  Cpu, 
  Settings, 
  Power, 
  Flame, 
  Volume2, 
  BellRing,
  Globe,
  Clock,
  Sun,
  Moon
} from "lucide-react";

export default function App() {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<"GEOSPATIAL" | "INTEL_STREAM" | "RESOURCE_LOCATOR" | "MULTI_AGENT_AI" | "SIMULATION">("GEOSPATIAL");
  
  // Dynamic theme state ("dark" | "light")
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  
  // Sector Location selector
  const [activeSector, setActiveSector] = useState("TOKYO-3_SECTOR_01");
  
  // Real-time disaster alerts
  const [activeAlert, setActiveAlert] = useState<DisasterAlert | null>(null);
  const [selectedShelterId, setSelectedShelterId] = useState<string | null>("SHELTER_04_SHINJUKU");
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [intelFeed, setIntelFeed] = useState<IntelItem[]>([]);
  
  // Satellite photo simulation asset
  const [satelliteImage, setSatelliteImage] = useState<string | null>(null);
  
  // UI Loading / action triggers
  const [isProcessingTriage, setIsProcessingTriage] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isSirenActive, setIsSirenActive] = useState(false);
  const [showRealEarthquakes, setShowRealEarthquakes] = useState(false);
  const [realEarthquakes, setRealEarthquakes] = useState<any[]>([]);

  // Ticking operational clock (UTC and Local)
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Triage state
  const [triageStatus, setTriageStatus] = useState<TriageStatus>({
    loaded: true,
    parsing: false,
    crossRef: "STANDBY",
    casualtyProbability: "0.00%",
    optimizing: false,
    scanning: false,
  });

  // Fetch initial data & initialize SSE real-time subscriber pipeline
  useEffect(() => {
    // 1. Load designated shelters from GSI Database API
    fetchShelters(35.6895, 139.6917, "earthquake");

    // 2. Load initial emergency broadcasts
    fetch("/api/intel")
      .then((res) => res.json())
      .then((data) => setIntelFeed(data))
      .catch((err) => console.error("Error loading intel feed:", err));

    // 3. Connect to Server-Sent Events (SSE) pipeline
    const eventSource = new EventSource("/api/stream");

    eventSource.addEventListener("disaster_alert", (event: any) => {
      const alert = JSON.parse(event.data);
      setActiveAlert(alert);
      
      // Auto zoom / pan map close to new epicenter if provided
      if (alert.lat && alert.lng) {
        fetchShelters(alert.lat, alert.lng, alert.disaster_type);
      }
    });

    eventSource.addEventListener("intel_feed", (event: any) => {
      const intelItem = JSON.parse(event.data);
      setIntelFeed((prev) => [...prev, intelItem]);
    });

    return () => {
      eventSource.close();
    };
  }, []);

  // Fetch nearest shelters based on geolocation and hazard constraints
  const fetchShelters = (lat: number, lng: number, hazard: string) => {
    fetch(`/api/shelters?lat=${lat}&lng=${lng}&hazard=${hazard}`)
      .then((res) => res.json())
      .then((data) => {
        setShelters(data);
        // Default select closest shelter
        if (data.length > 0) {
          setSelectedShelterId(data[0].id);
        }
      })
      .catch((err) => console.error("Error loading shelters:", err));
  };

  // Fetch real-time live JMA alerts from p2pquake historical feed
  const loadRealEarthquakes = () => {
    setShowRealEarthquakes(true);
    fetch("/api/earthquakes")
      .then((res) => res.json())
      .then((data) => setRealEarthquakes(data))
      .catch((err) => console.error("Error loading p2pquake history:", err));
  };

  // Trigger simulated earthquake event
  const triggerSimulationEarthquake = (mag: number, epicenter: string, lat: number, lng: number) => {
    fetch("/api/simulate/earthquake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ magnitude: mag, epicenterName: epicenter, lat, lng }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          // Epicenter update handles by SSE trigger
          console.log("Simulation triggered successfully");
        }
      })
      .catch((err) => console.error("Error triggering simulation:", err));
  };

  // Ingest satellite images or custom prompt triggers for Gemini Multi-Agent Triage
  const runSatelliteTriage = (prompt: string, imageBase64?: string, imageMime?: string) => {
    setIsProcessingTriage(true);
    
    if (imageBase64) {
      setSatelliteImage(`data:${imageMime};base64,${imageBase64}`);
    }

    setTriageStatus({
      loaded: true,
      parsing: true,
      crossRef: "CONNECTING TO COGNITIVE CORE",
      casualtyProbability: "CALCULATING...",
      optimizing: true,
      scanning: true,
    });

    fetch("/api/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, imageBase64, imageMime }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Triage failed");
        return res.json();
      })
      .then((data) => {
        setActiveAlert(data);
        setTriageStatus({
          loaded: true,
          parsing: false,
          crossRef: "VERIFIED_SATELLITE_MATCH_100%",
          casualtyProbability: "0.012% (LOW HAZARD LOAD)",
          optimizing: false,
          scanning: false,
        });
        
        // Append an action log in intel feed
        const newFeedItem: IntelItem = {
          id: `intel_${Date.now()}`,
          time: new Date().toLocaleTimeString("ja-JP", { hour12: false }),
          tag: "NERV",
          text: `GEMINI_REASONING: Satellite scan triage executed. Epicenter matched with high fidelity. Evacuations active.`,
        };
        setIntelFeed((prev) => [...prev, newFeedItem]);
      })
      .catch((err) => {
        console.error("Gemini api error:", err);
        setTriageStatus({
          loaded: true,
          parsing: false,
          crossRef: "ERROR: GEMINI OFFLINE",
          casualtyProbability: "N/A",
          optimizing: false,
          scanning: false,
        });
      })
      .finally(() => {
        setIsProcessingTriage(false);
      });
  };

  // Broadcast sms alert with sound confirmation
  const handleTransmitBroadcast = (smsJp: string, smsEn: string) => {
    setIsBroadcasting(true);
    
    // Play sound notification using AudioContext
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // High-pitch beep
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      // AudioContext failed or blocked by iframe
    }

    setTimeout(() => {
      setIsBroadcasting(false);
      // Append J-ALERT transmit log
      const newFeedItem: IntelItem = {
        id: `intel_${Date.now()}`,
        time: new Date().toLocaleTimeString("ja-JP", { hour12: false }),
        tag: "CRITICAL",
        text: `BROADCAST TRANSMITTED NATIONWIDE: "${smsEn}"`,
      };
      setIntelFeed((prev) => [...prev, newFeedItem]);
    }, 1500);
  };

  // Full-screen warning evacuation protocol mode
  const toggleEvacSiren = () => {
    setIsSirenActive(!isSirenActive);
    
    if (!isSirenActive) {
      // Append red alert log
      const logItem: IntelItem = {
        id: `intel_${Date.now()}`,
        time: new Date().toLocaleTimeString("ja-JP", { hour12: false }),
        tag: "CRITICAL",
        text: `【RED ALERT】EVACUATION PROTOCOL INITIATED BY COMMAND UNIT 01. SIRENS ACTIVE.`,
      };
      setIntelFeed((prev) => [...prev, logItem]);
    }
  };

  // Clear simulated alert back to standby
  const handleClearAlert = () => {
    setActiveAlert(null);
    setSatelliteImage(null);
    setTriageStatus({
      loaded: true,
      parsing: false,
      crossRef: "STANDBY",
      casualtyProbability: "0.00%",
      optimizing: false,
      scanning: false,
    });
  };

  // Sector selector handler
  const handleSectorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActiveSector(e.target.value);
    const newFeedItem: IntelItem = {
      id: `intel_${Date.now()}`,
      time: new Date().toLocaleTimeString("ja-JP", { hour12: false }),
      tag: "NERV",
      text: `SECTOR COORDINATE RE-ALIGNED TO ${e.target.value}`,
    };
    setIntelFeed((prev) => [...prev, newFeedItem]);
  };

  const isLight = theme === "light";

  return (
    <div className={`min-h-screen ${isLight ? "bg-[#fbf9f4] text-stone-900" : "bg-background text-[#e5e2e1]"} flex flex-col relative select-none scanlines transition-colors duration-300`}>
      
      {/* SCANLINE OVERLAY */}
      <div className="absolute inset-0 scanline-overlay pointer-events-none z-[60]"></div>

      {/* FULL-SCREEN SIREN EVACUATION STROBE COVER */}
      {isSirenActive && (
        <div className="absolute inset-0 z-50 bg-[#9d05ff]/20 animate-pulse pointer-events-none mix-blend-color-burn border-8 border-[#9d05ff] flex items-center justify-center">
          <div className="bg-black/95 border-4 border-[#9d05ff] p-8 max-w-xl text-center space-y-6 pointer-events-auto shadow-[0_0_50px_rgba(157,0,255,0.8)]">
            <div className="diagonal-stripes-purple h-6"></div>
            <div className="flex justify-center gap-3">
              <BellRing className="w-12 h-12 text-[#9d05ff] animate-bounce" />
              <Flame className="w-12 h-12 text-[#ff6600] animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-[#9d05ff] tracking-widest uppercase blink-fast">
                EVACUATION PROTOCOL
              </h1>
              <p className="text-xs text-gray-400 mt-2 tracking-wider">
                【日本有事災害対策指揮本部・JTDC作戦管制部】
              </p>
            </div>
            <div className="border border-[#9d05ff]/50 bg-black p-4 text-left text-sm space-y-3 font-mono text-[#ff8533]">
              <p>● SECTOR: <span className="text-white font-bold">{activeSector}</span></p>
              <p>● STATUS: <span className="text-red-500 blink-fast font-bold">ALL CITIZENS PROCEED TO DESIGNATED REINFORCED SHELTERS</span></p>
              <p className="text-xs text-gray-500 leading-relaxed">
                J-Alert has been dispatched to all mobile carriers, subways, and broadcast networks. Coastal gates closing immediately. Air defence sirens activated.
              </p>
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={toggleEvacSiren}
                className="px-6 py-2 border-2 border-[#9d05ff] text-[#9d05ff] font-bold text-xs hover:bg-[#9d05ff]/10 active:bg-[#9d05ff]/30 cursor-pointer"
              >
                STAND_DOWN_SIREN
              </button>
            </div>
            <div className="diagonal-stripes-purple h-6"></div>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <header className={`border-b border-outline-variant ${isLight ? "bg-[#eae6db] text-stone-900" : "bg-surface text-[#e5e2e1]"} px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shrink-0 shadow-[0_0_8px_rgba(255,181,150,0.3)] transition-colors duration-300`}>
        <div className="flex items-center gap-3">
          {/* JTDC Styled Orange Title */}
          <h1 className="text-xl md:text-2xl font-extrabold text-[#ff6600] tracking-wider uppercase font-mono flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#ff6600]" />
            <span>JAPAN TACTICAL DISASTER CENTER (JTDC)</span>
          </h1>
          <span className="text-[10px] bg-[#ff6600]/20 text-[#ff6600] px-2 py-0.5 border border-[#ff6600] font-bold animate-pulse tracking-widest shrink-0">
            LIVE_STREAM
          </span>
        </div>

        {/* Header Telemetries */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          
          {/* Light Mode / Dark Mode Toggle Button */}
          <button
            onClick={() => setTheme(isLight ? "dark" : "light")}
            className={`flex items-center gap-1.5 px-2.5 py-1 border ${isLight ? "border-stone-400 bg-stone-100 hover:bg-stone-200 text-stone-800" : "border-outline-variant bg-surface hover:bg-surface-container-high text-gray-300"} font-mono font-bold text-[10px] tracking-wider uppercase transition-all cursor-pointer`}
            title="Toggle Theme Mode"
          >
            {isLight ? (
              <>
                <Moon className="w-3.5 h-3.5 text-purple-600" />
                <span>DARK_MODE</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
                <span>LIGHT_MODE</span>
              </>
            )}
          </button>

          {/* Ticking Clock Readout */}
          <div className={`flex items-center gap-2 border ${isLight ? "border-stone-400 bg-[#fbf9f4]" : "border-outline-variant bg-surface-container-lowest"} px-2.5 py-1 text-gray-300`}>
            <Clock className="w-3.5 h-3.5 text-[#ff6600]" />
            <span className={`font-bold ${isLight ? "text-stone-900" : "text-white"} tracking-widest`}>
              {currentTime.toLocaleTimeString("ja-JP", { hour12: false })} UTC
            </span>
          </div>

          {/* Location Sector Selector */}
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#ff6600]" />
            <select
              value={activeSector}
              onChange={handleSectorChange}
              className={`${isLight ? "bg-[#fbf9f4] border-stone-400 text-stone-900" : "bg-surface-container-lowest border border-outline-variant text-[#e5e2e1]"} text-[11px] px-2 py-1 focus:outline-none focus:border-[#ff6600] font-bold rounded-none`}
            >
              <option value="TOKYO-3_SECTOR_01">TOKYO-3 :: SECTOR_01</option>
              <option value="SHIBUYA_SECTOR_02">SHIBUYA :: SECTOR_02</option>
              <option value="SHINJUKU_SECTOR_03">SHINJUKU :: SECTOR_03</option>
              <option value="MINATO_SECTOR_04">MINATO :: SECTOR_04</option>
              <option value="UENO_SECTOR_05">UENO :: SECTOR_05</option>
            </select>
          </div>

          {/* System status ready dot */}
          <div className={`flex items-center gap-1.5 border ${isLight ? "border-stone-400 bg-[#fbf9f4]" : "border-outline-variant bg-surface-container-lowest"} px-2.5 py-1 shrink-0`}>
            <span className={`w-2 h-2 rounded-full animate-pulse ${activeAlert ? "bg-[#9d05ff]" : "bg-[#00FF66]"}`} />
            <span className={`text-[10px] font-bold ${activeAlert ? "text-[#9d05ff]" : "text-[#00FF66]"}`}>
              {activeAlert ? "THREAT ACTIVE" : "SYSTEM ONLINE"}
            </span>
          </div>
        </div>
      </header>

      {/* MAIN TWO-COLUMN DASHBOARD GRID */}
      <div className={`flex-1 grid grid-cols-1 lg:grid-cols-[240px_1fr] divide-x ${isLight ? "divide-stone-300 bg-[#fbf9f4]" : "divide-outline-variant/30"} overflow-hidden`}>
        
        {/* LEFT COLUMN: Command Unit Sidebar Navigation */}
        <aside className={`${isLight ? "bg-[#eae6db] border-r border-stone-300 divide-stone-300" : "bg-surface-container-lowest divide-outline-variant/30"} p-4 flex flex-col justify-between divide-y transition-colors duration-300`}>
          
          {/* Navigation controls */}
          <div className="space-y-4 pb-4">
            <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">
              JTDC_COMMAND_UNIT_01
            </div>

            <div className="flex flex-col gap-1.5">
              
              {/* Geospatial mode */}
              <button
                onClick={() => setActiveTab("GEOSPATIAL")}
                className={`w-full py-2.5 px-3 text-left font-bold text-xs flex items-center gap-2 border transition-all ${activeTab === "GEOSPATIAL" ? "bg-[#9d05ff]/10 text-[#9d05ff] border-[#9d05ff]" : `${isLight ? "border-transparent text-stone-700 hover:text-stone-950 hover:bg-stone-100" : "border-[#1c1b1b] text-gray-400 hover:text-white"}`}`}
              >
                <Map className="w-4 h-4 shrink-0" />
                <span>GEOSPATIAL</span>
              </button>

              {/* Intel mode */}
              <button
                onClick={() => setActiveTab("INTEL_STREAM")}
                className={`w-full py-2.5 px-3 text-left font-bold text-xs flex items-center gap-2 border transition-all ${activeTab === "INTEL_STREAM" ? "bg-[#ff6600]/10 text-[#ff6600] border-[#ff6600]" : `${isLight ? "border-transparent text-stone-700 hover:text-stone-950 hover:bg-stone-100" : "border-[#1c1b1b] text-gray-400 hover:text-white"}`}`}
              >
                <Radio className="w-4 h-4 shrink-0" />
                <span>INTEL_STREAM</span>
              </button>

              {/* Resource selector tab */}
              <button
                onClick={() => setActiveTab("RESOURCE_LOCATOR")}
                className={`w-full py-2.5 px-3 text-left font-bold text-xs flex items-center gap-2 border transition-all ${activeTab === "RESOURCE_LOCATOR" ? "bg-[#ff6600]/10 text-[#ff6600] border-[#ff6600]" : `${isLight ? "border-transparent text-stone-700 hover:text-stone-950 hover:bg-stone-100" : "border-[#1c1b1b] text-gray-400 hover:text-white"}`}`}
              >
                <Globe className="w-4 h-4 shrink-0" />
                <span>RESOURCE_LOCATOR</span>
              </button>

              {/* Simulation panel tab */}
              <button
                onClick={() => setActiveTab("SIMULATION")}
                className={`w-full py-2.5 px-3 text-left font-bold text-xs flex items-center gap-2 border transition-all ${activeTab === "SIMULATION" ? "bg-[#00e55b]/10 text-[#00e55b] border-[#00e55b]" : `${isLight ? "border-transparent text-stone-700 hover:text-stone-950 hover:bg-stone-100" : "border-[#1c1b1b] text-gray-400 hover:text-white"}`}`}
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span>SIMULATION</span>
              </button>
            </div>
          </div>

          {/* Quick Real JMA alerts toggle */}
          <div className="py-4 space-y-3">
            <span className="text-[10px] text-gray-500 font-bold tracking-widest block uppercase">
              [LIVE_JMA_TELEM_CODE]
            </span>
            <button
              onClick={loadRealEarthquakes}
              className="w-full text-center py-2 bg-[#ff6600]/5 hover:bg-[#ff6600]/15 border border-[#ff6600]/30 hover:border-[#ff6600] text-[#ff6600] text-[10px] font-extrabold tracking-widest transition-all cursor-pointer uppercase"
            >
              QUERY P2PQUAKE API
            </button>
            
            {showRealEarthquakes && (
              <div className={`p-2 border max-h-36 overflow-y-auto text-[8px] font-mono space-y-1 custom-scrollbar ${isLight ? "bg-white border-stone-300 text-stone-600" : "bg-surface-container-lowest border-outline-variant text-gray-400"}`}>
                <div className={`border-b pb-1 font-bold text-[9px] ${isLight ? "text-stone-900 border-stone-200" : "text-white border-outline-variant/30"}`}>LATEST JMA TELEMETRY:</div>
                {realEarthquakes.length === 0 ? (
                  <div className="animate-pulse">STREAMING DATA...</div>
                ) : (
                  realEarthquakes.map((eq: any, idx: number) => (
                    <div key={idx} className={`border-b pb-1 mb-1 ${isLight ? "border-stone-100" : "border-outline-variant/10"}`}>
                      <div className="text-[#ff6600] font-bold">EPICENTER: {eq.earthquake?.hypocenter?.name || "Unknown"}</div>
                      <div>TIME: {new Date(eq.time || Date.now()).toLocaleTimeString()}</div>
                      <div>SHINDO SC: {(eq.earthquake?.maxScale / 10) || "N/A"}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Bottom control buttons */}
          <div className="pt-4 space-y-2.5">
            {/* Initiate Emergency Protocol Button */}
            <button
              onClick={toggleEvacSiren}
              className="w-full py-3 bg-[#9d05ff]/20 hover:bg-[#9d05ff]/35 border-2 border-[#9d05ff] text-[#9d05ff] hover:shadow-[0_0_15px_rgba(157,0,255,0.5)] transition-all cursor-pointer text-[10px] font-extrabold tracking-widest text-center uppercase"
            >
              INITIATE_EVAC_PROTOCOL
            </button>

            {activeAlert && (
              <button
                onClick={handleClearAlert}
                className={`w-full py-2 text-[9px] font-bold tracking-widest text-center uppercase border ${isLight ? "bg-stone-100 border-stone-300 text-stone-700 hover:bg-stone-200" : "bg-surface hover:bg-surface-container-high border-outline-variant text-gray-400"}`}
              >
                RESET_THREAT_READY
              </button>
            )}

            <div className="flex items-center gap-2 pt-2 text-[9px] text-gray-500 font-bold">
              <Power className="w-3 h-3 text-red-500 animate-pulse" />
              <span>LOGOUT_COMMANDER</span>
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: The grand interactive cockpit grids */}
        <main className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-60px)]">
          
          {/* Main layout split row (Interactive Map & Simulation Overlay on left, Intel Logs & Broadcasts on right) */}
          <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-4">
            
            {/* Left section: Interactive Map Canvas container */}
            <div className="flex flex-col gap-4">
              <div className="h-[400px] md:h-[500px]">
                <TacticalMap
                  shelters={shelters}
                  activeAlert={activeAlert}
                  selectedShelterId={selectedShelterId}
                  onSelectShelter={setSelectedShelterId}
                  satelliteImage={satelliteImage}
                  theme={theme}
                  onMapClick={(lat, lng) => triggerSimulationEarthquake(6.8, "Custom Epicenter", lat, lng)}
                />
              </div>

              {/* Dynamic threat details panel shown if disaster active */}
              {activeAlert && (
                <div className={`border border-[#9d05ff] bg-[#9d05ff]/5 p-3.5 space-y-2.5 ${isLight ? "text-stone-900" : "text-white"}`}>
                  <div className="flex justify-between border-b border-[#9d05ff]/30 pb-1.5 items-center">
                    <span className="text-[#9d05ff] font-extrabold text-xs flex items-center gap-1.5 uppercase blink-fast">
                      <Volume2 className="w-4 h-4" />
                      [ACTIVE_DISASTER_ALERT_LEVEL_4]
                    </span>
                    <span className="text-[10px] text-gray-500 font-bold">
                      DETECTED: {activeAlert.timestamp || "RECENT"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs leading-relaxed">
                    <div className={`border ${isLight ? "border-stone-300 bg-white" : "border-[#393939] bg-black"} p-2`}>
                      <span className="text-[#ff6600] text-[9px] font-bold block uppercase">epicenter:</span>
                      <span className={`font-extrabold ${isLight ? "text-stone-950" : "text-white"}`}>{activeAlert.epicenter}</span>
                    </div>
                    <div className={`border ${isLight ? "border-stone-300 bg-white" : "border-[#393939] bg-black"} p-2`}>
                      <span className="text-[#ff6600] text-[9px] font-bold block uppercase">intensity:</span>
                      <span className="text-[#9d05ff] font-extrabold">JMA SHINDO {activeAlert.intensity_max}</span>
                    </div>
                    <div className={`border ${isLight ? "border-stone-300 bg-white" : "border-[#393939] bg-black"} p-2`}>
                      <span className="text-[#ff6600] text-[9px] font-bold block uppercase">hazards:</span>
                      <span className={`font-medium truncate block ${isLight ? "text-stone-700" : "text-gray-300"}`}>{activeAlert.immediate_hazards[0] || "None"}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right section: Triage reasoning core and incoming intel logs */}
            <div className="grid grid-rows-[1fr_auto] gap-4">
              
              {/* Top Right: Real-time Intel Streams */}
              <div className="h-[300px] md:h-[350px] xl:h-full">
                <IntelStream
                  feed={intelFeed}
                  theme={theme}
                  onSelectItem={(item) => {
                    const logItem: IntelItem = {
                      id: `intel_${Date.now()}`,
                      time: new Date().toLocaleTimeString("ja-JP", { hour12: false }),
                      tag: "NERV",
                      text: `INSPECTING LOG DETAIL: "${item.text}"`,
                    };
                    setIntelFeed((prev) => [...prev, logItem]);
                  }}
                />
              </div>

              {/* Bottom Right: Gemini Triage & broadast channels */}
              <div className="h-auto">
                <TriagePanel
                  activeAlert={activeAlert}
                  triageStatus={triageStatus}
                  onTransmitBroadcast={handleTransmitBroadcast}
                  isTransmitting={isBroadcasting}
                  theme={theme}
                />
              </div>

            </div>

          </div>

          {/* Sandbox control block for triggering simulations */}
          <div className="border-t border-[#ff6600]/10 pt-1">
            <SimulationControls
              onTriggerEarthquake={triggerSimulationEarthquake}
              onRunTriage={runSatelliteTriage}
              isProcessing={isProcessingTriage}
              theme={theme}
            />
          </div>

          {/* Bottom Panel: Nearest Shelters locator grid */}
          <div className="border-t border-[#ff6600]/10 pt-1">
            <ShelterLocator
              shelters={shelters}
              selectedShelterId={selectedShelterId}
              onSelectShelter={setSelectedShelterId}
              activeHazard={activeAlert?.disaster_type || "earthquake"}
              theme={theme}
            />
          </div>

        </main>
      </div>

      {/* FOOTER SYSTEM STATUS TELEMETRIES */}
      <footer className={`border-t border-outline-variant ${isLight ? "bg-[#eae6db] text-stone-600 border-stone-300" : "bg-surface-container-low text-gray-500"} text-[10px] px-4 py-2 flex flex-wrap justify-between items-center gap-3 shrink-0 transition-colors duration-300`}>
        <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono font-bold">
          <div>UPTIME: <span className={isLight ? "text-stone-900" : "text-white"}>1422:12:04</span></div>
          <div>DATA_FLOW: <span className={isLight ? "text-stone-900" : "text-white"}>4.2 TB/S</span></div>
          <div>NODES: <span className="text-tertiary">1,024 ACTIVE</span></div>
          <div>TERMINAL_ACCESS: <span className="text-tertiary">SECURE</span></div>
          <div>API_DOCS: <span className={`${isLight ? "text-stone-800" : "text-gray-400"} font-bold underline cursor-pointer`}>p2pquake_v2_history</span></div>
        </div>
        <div className={`text-right ${isLight ? "text-stone-500" : "text-gray-600"} font-mono text-[9px] font-bold`}>
          © 2026 JAPAN TACTICAL DISASTER CENTER (JTDC). DATA_CONFIDENTIALITY_LEVEL_4.
        </div>
      </footer>

    </div>
  );
}
