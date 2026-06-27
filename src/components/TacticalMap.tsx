import React, { useState, useEffect } from "react";
import { Shelter, DisasterAlert } from "../types";
import { Compass, ZoomIn, ZoomOut, Eye, Layers, ShieldAlert, Navigation, Info, AlertTriangle } from "lucide-react";

interface TacticalMapProps {
  shelters: Shelter[];
  activeAlert: DisasterAlert | null;
  selectedShelterId: string | null;
  onSelectShelter: (id: string) => void;
  satelliteImage: string | null;
  theme?: "dark" | "light";
  onMapClick?: (lat: number, lng: number) => void;
}

export default function TacticalMap({
  shelters,
  activeAlert,
  selectedShelterId,
  onSelectShelter,
  satelliteImage,
  theme = "dark",
  onMapClick,
}: TacticalMapProps) {
  const [zoomLevel, setZoomLevel] = useState<"1:25,000" | "1:50,000" | "1:100,000">("1:25,000");
  const [showGrids, setShowGrids] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showSensors, setShowSensors] = useState(true);
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [waveRadius, setWaveRadius] = useState(0);
  const [hoveredLandmark, setHoveredLandmark] = useState<string | null>(null);

  const isLight = theme === "light";

  // Projection engine mapping Tokyo coordinates onto an 800x600 SVG viewBox
  function project(lat: number, lng: number) {
    const minLat = 35.58;
    const maxLat = 35.76;
    const minLng = 139.62;
    const maxLng = 139.92;

    const x = ((lng - minLng) / (maxLng - minLng)) * 700 + 50;
    // y is inverted in SVG
    const y = 550 - ((lat - minLat) / (maxLat - minLat)) * 500;
    return { x, y };
  }

  // Inverse projection engine mapping SVG coordinates back to Geo Lat/Lng
  function deproject(x: number, y: number) {
    const minLat = 35.58;
    const maxLat = 35.76;
    const minLng = 139.62;
    const maxLng = 139.92;

    const lng = ((x - 50) / 700) * (maxLng - minLng) + minLng;
    const lat = ((550 - y) / 500) * (maxLat - minLat) + minLat;
    return {
      lat: parseFloat(lat.toFixed(4)),
      lng: parseFloat(lng.toFixed(4)),
    };
  }

  // Animating epicenter seismic waves
  useEffect(() => {
    if (activeAlert) {
      setWaveRadius(0);
      const interval = setInterval(() => {
        setWaveRadius((prev) => (prev >= 160 ? 0 : prev + 2));
      }, 30);
      return () => clearInterval(interval);
    }
  }, [activeAlert]);

  // Handle map click to trigger simulation epicenter or select a shelter
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 800;
    const clickY = ((e.clientY - rect.top) / rect.height) * 600;

    // Check if clicked near a shelter first (radius 14px for better click target)
    const clickedShelter = shelters.find((s) => {
      const sCoords = project(s.lat, s.lng);
      const dist = Math.hypot(clickX - sCoords.x, clickY - sCoords.y);
      return dist < 14;
    });

    if (clickedShelter) {
      onSelectShelter(clickedShelter.id);
      return;
    }

    // Trigger onMapClick if provided (simulate custom earthquake)
    if (onMapClick) {
      const geo = deproject(clickX, clickY);
      // Validate bounds
      if (clickX >= 0 && clickX <= 800 && clickY >= 0 && clickY <= 600) {
        onMapClick(geo.lat, geo.lng);
      }
    }
  };

  // Detailed landmass path covering top/west/east land, leaving center bottom open for Tokyo Bay water
  const landmassPath = `
    M 0,600
    L 0, 480
    Q 80, 470 120, 460
    Q 160, 470 180, 485
    L 190, 520
    L 240, 520
    L 250, 490
    L 210, 465
    Q 240, 440 280, 440
    Q 310, 410 330, 390
    L 345, 385
    Q 370, 370 395, 385
    Q 425, 395 450, 395
    Q 480, 385 520, 395
    Q 560, 405 600, 410
    Q 650, 420 700, 450
    Q 740, 480 770, 530
    L 800, 560
    L 800, 0
    L 0, 0
    Z
  `;

  // Major rivers / canals in Tokyo (Sumida, Arakawa, Edo)
  const rivers = [
    // Sumida River
    "M 345,50 Q 320,180 335,250 T 345,385",
    // Arakawa River
    "M 470,50 Q 430,180 445,280 T 450,395",
    // Edo River
    "M 600,50 Q 550,150 565,260 T 520,395"
  ];

  // Grid line values
  const gridLinesX = Array.from({ length: 7 }, (_, i) => 100 + i * 100);
  const gridLinesY = Array.from({ length: 5 }, (_, i) => 100 + i * 100);

  // Epicenter coordinates
  const epicenterCoords = activeAlert?.lat && activeAlert?.lng
    ? project(activeAlert.lat, activeAlert.lng)
    : project(35.60, 139.80); // Default Tokyo Bay epicenter

  // Find projected coords for selected shelter to draw evacuation routing lines
  const focusedShelter = shelters.find(s => s.id === selectedShelterId);
  const selectedShelterCoords = focusedShelter
    ? project(focusedShelter.lat, focusedShelter.lng)
    : null;

  // Theme colors
  const waterColor = isLight ? "#d0e1f9" : "#070c14";
  const landColor = isLight ? "#fbf9f4" : "#12151e";
  const shorelineColor = isLight ? "#a2b4cd" : "#2d3748";
  const riverColor = waterColor;
  const gridLineColor = isLight ? "#ccc7ba" : "#2a2d35";
  const textLabelColor = isLight ? "#4a4a45" : "#a1a1a1";
  const mapBorderColor = isLight ? "border-[#ccc7b9]" : "border-[#393939]";
  const headerBg = isLight ? "bg-[#eae6db]" : "bg-[#0c0c0c]";
  const containerBg = isLight ? "bg-[#ffffff]" : "bg-[#121212]";

  return (
    <div className={`border ${mapBorderColor} ${containerBg} relative overflow-hidden h-full flex flex-col font-mono transition-colors duration-300`}>
      {/* Map Header Panel */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${mapBorderColor} ${headerBg} text-xs transition-colors duration-300`}>
        <div className="flex items-center gap-2">
          <Compass className={`w-4 h-4 text-[#ff6600] animate-spin-slow`} />
          <span className={`font-bold tracking-wider ${isLight ? "text-[#1c1917]" : "text-white"}`}>
            TACTICAL_GEOSPATIAL_RADAR :: TOKYO_BAY
          </span>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-gray-500">
          <div>ZOOM: <span className="text-[#ff6600] font-bold">{zoomLevel}</span></div>
          <div className="hidden sm:block">PROJECTION: <span className={isLight ? "text-gray-800" : "text-gray-200"}>WGS84_UTM_54N</span></div>
        </div>
      </div>

      {/* Vector Interactive Map Area */}
      <div className={`relative flex-1 ${isLight ? "bg-[#d0e1f9]" : "bg-black"} overflow-hidden select-none transition-colors duration-300`}>
        {/* Real Dynamic Satellite Scan Overlay */}
        {satelliteImage && (
          <div className="absolute inset-0 pointer-events-none z-10 opacity-30 mix-blend-screen transition-opacity">
            <img 
              src={satelliteImage} 
              alt="Satellite Scan" 
              className="w-full h-full object-cover filter brightness-125 contrast-125 grayscale hue-rotate-15"
              referrerPolicy="no-referrer"
            />
            {/* Blinking Classification overlay */}
            <div className="absolute top-4 left-4 bg-black/80 border border-[#9d05ff] px-2 py-1 text-[9px] text-[#9d05ff] font-bold tracking-widest uppercase animate-pulse">
              [SATELLITE THERMAL SCAN ACTIVE]
            </div>
          </div>
        )}

        <svg 
          viewBox="0 0 800 600" 
          onClick={handleSvgClick}
          className="w-full h-full relative z-0 cursor-crosshair"
          style={{ backgroundColor: waterColor }}
        >
          {/* 1. Coastline / Landmass Polygon */}
          <path
            d={landmassPath}
            fill={landColor}
            stroke={shorelineColor}
            strokeWidth="2"
            className="transition-colors duration-300"
          />

          {/* 2. Rivers cutting through land */}
          {rivers.map((r, i) => (
            <path
              key={i}
              d={r}
              fill="none"
              stroke={riverColor}
              strokeWidth="4"
              className="transition-colors duration-300"
            />
          ))}

          {/* 3. Grid coordinates & lines */}
          {showGrids && (
            <g className="opacity-60 pointer-events-none">
              {gridLinesX.map((xVal, idx) => (
                <g key={`x-${idx}`}>
                  <line 
                    x1={xVal} y1="0" x2={xVal} y2="600" 
                    stroke={gridLineColor} strokeWidth="0.75" strokeDasharray="3,6" 
                  />
                  <text 
                    x={xVal + 5} y="15" 
                    fill={textLabelColor} fontSize="8" className="font-mono font-bold"
                  >
                    139.{(62 + idx * 0.05).toFixed(2)}E
                  </text>
                </g>
              ))}
              {gridLinesY.map((yVal, idx) => (
                <g key={`y-${idx}`}>
                  <line 
                    x1="0" y1={yVal} x2="800" y2={yVal} 
                    stroke={gridLineColor} strokeWidth="0.75" strokeDasharray="3,6" 
                  />
                  <text 
                    x="5" y={yVal - 5} 
                    fill={textLabelColor} fontSize="8" className="font-mono font-bold"
                  >
                    35.{(58 + idx * 0.04).toFixed(2)}N
                  </text>
                </g>
              ))}
            </g>
          )}

          {/* 4. Major Landmarks & Bridges (Intuitive Context) */}
          {showLandmarks && (
            <g>
              {/* Tokyo Bay Aqualine (Bridge/Tunnel system) */}
              <g className="opacity-80">
                {/* Subsea Tunnel Kawasaki -> Umihotaru */}
                <line x1="210" y1="465" x2="520" y2="485" stroke="#9d05ff" strokeWidth="2.5" strokeDasharray="3,4" />
                {/* Bridge Umihotaru -> Kisarazu */}
                <line x1="520" y1="485" x2="770" y2="530" stroke={isLight ? "#4a5568" : "#a0aec0"} strokeWidth="2.5" />
                {/* Umihotaru Island PA */}
                <g 
                  transform="translate(520, 485)" 
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredLandmark("AQUALINE_UMI_HOTARU")}
                  onMouseLeave={() => setHoveredLandmark(null)}
                >
                  <ellipse rx="7" ry="4" fill="#ff6600" stroke={isLight ? "white" : "black"} strokeWidth="1" />
                  <circle cx="0" cy="0" r="1.5" fill="#00FF66" className="animate-ping" />
                </g>
              </g>

              {/* Rainbow Bridge */}
              <g 
                className="cursor-pointer opacity-90"
                onMouseEnter={() => setHoveredLandmark("RAINBOW_BRIDGE")}
                onMouseLeave={() => setHoveredLandmark(null)}
              >
                <line x1="330" y1="390" x2="395" y2="385" stroke={isLight ? "#2d3748" : "#e2e8f0"} strokeWidth="3" />
                <line x1="330" y1="390" x2="395" y2="385" stroke="#ff6600" strokeWidth="1" strokeDasharray="2,3" />
                <circle cx="350" cy="389" r="2.5" fill={isLight ? "black" : "white"} />
                <circle cx="375" cy="387" r="2.5" fill={isLight ? "black" : "white"} />
              </g>

              {/* Haneda Airport Runways */}
              <g 
                transform="translate(205, 500) rotate(-15)" 
                className="cursor-pointer opacity-80"
                onMouseEnter={() => setHoveredLandmark("HANEDA_AIRPORT")}
                onMouseLeave={() => setHoveredLandmark(null)}
              >
                <rect x="0" y="0" width="35" height="7" fill={isLight ? "#a8a29e" : "#2d303a"} stroke={shorelineColor} strokeWidth="1" />
                <line x1="0" y1="3.5" x2="35" y2="3.5" stroke="white" strokeWidth="0.75" strokeDasharray="3,3" />
                <rect x="10" y="10" width="28" height="6" fill={isLight ? "#a8a29e" : "#2d303a"} stroke={shorelineColor} strokeWidth="1" />
                <line x1="10" y1="13" x2="38" y2="13" stroke="white" strokeWidth="0.75" strokeDasharray="3,3" />
              </g>

              {/* Tokyo Tower (Minato) */}
              <g 
                transform="translate(310, 340)" 
                className="cursor-pointer"
                onMouseEnter={() => setHoveredLandmark("TOKYO_TOWER")}
                onMouseLeave={() => setHoveredLandmark(null)}
              >
                <line x1="0" y1="0" x2="0" y2="-22" stroke="#ff3300" strokeWidth="1.5" />
                <path d="M-6,0 L-1.5,-18 L1.5,-18 L6,0 Z" fill="#ff3300" />
                <circle cx="0" cy="-22" r="2" fill="#ff3300" className="animate-pulse" />
              </g>

              {/* Tokyo Skytree (Sumida) */}
              <g 
                transform="translate(430, 200)" 
                className="cursor-pointer"
                onMouseEnter={() => setHoveredLandmark("TOKYO_SKYTREE")}
                onMouseLeave={() => setHoveredLandmark(null)}
              >
                <line x1="0" y1="0" x2="0" y2="-28" stroke={isLight ? "#4a5568" : "#cbd5e0"} strokeWidth="1.5" />
                <path d="M-4,0 L-1,-24 L1,-24 L4,0 Z" fill={isLight ? "#718096" : "#a0aec0"} />
                <circle cx="0" cy="-15" r="2.5" fill="#00e55b" />
                <circle cx="0" cy="-28" r="2" fill="red" className="animate-ping" />
              </g>

              {/* Snowy Mt Fuji reference (pointing off-map directions) */}
              <g transform="translate(45, 550)" className="opacity-70 pointer-events-none">
                <polygon points="0,0 -15,15 15,15" fill={isLight ? "#d6d3d1" : "#1e293b"} stroke={shorelineColor} strokeWidth="1" />
                <polygon points="-5,5 0,0 5,5 -2,5" fill="white" />
                <text x="20" y="10" fill={textLabelColor} fontSize="7" fontWeight="bold">MT. FUJI DIRECTION (80KM)</text>
              </g>
            </g>
          )}

          {/* 5. Coast & Land Text Labels (Intuitive Geolocation Context) */}
          <g className="pointer-events-none opacity-80 font-bold select-none">
            <text x="180" y="270" fill={textLabelColor} fontSize="8">SHINJUKU (新宿)</text>
            <text x="170" y="325" fill={textLabelColor} fontSize="8">SHIBUYA (渋谷)</text>
            <text x="320" y="295" fill={textLabelColor} fontSize="8">CHIYODA / HQ (千代田)</text>
            <text x="380" y="170" fill={textLabelColor} fontSize="8">UENO (上野)</text>
            <text x="290" y="355" fill={textLabelColor} fontSize="7">MINATO (港)</text>
            <text x="540" y="310" fill={textLabelColor} fontSize="8">EDOGAWA (江戸川)</text>
            <text x="110" y="525" fill={textLabelColor} fontSize="8">YOKOHAMA (横浜)</text>
            <text x="630" y="445" fill={textLabelColor} fontSize="8">CHIBA (千葉)</text>
            <text x="700" y="570" fill={textLabelColor} fontSize="8">BOSO PENINSULA</text>
            
            {/* Sea body label */}
            <text 
              x="530" 
              y="540" 
              fill={isLight ? "#4682b4" : "#1e2c3f"} 
              fontSize="12" 
              letterSpacing="3"
              className="italic font-extrabold text-center"
            >
              TOKYO BAY (東京湾)
            </text>
          </g>

          {/* 6. Seismic Sensors Array Markers */}
          {showSensors && (
            <g className="opacity-40">
              <polygon points="120,100 124,108 116,108" fill="#00FF66" stroke="black" strokeWidth="0.5" />
              <polygon points="510,120 514,128 506,128" fill="#00FF66" stroke="black" strokeWidth="0.5" />
              <polygon points="210,320 214,328 206,328" fill="#00FF66" stroke="black" strokeWidth="0.5" />
              <polygon points="680,210 684,218 676,218" fill="#00FF66" stroke="black" strokeWidth="0.5" />
              <polygon points="410,480 414,488 406,488" fill="#00FF66" stroke="black" strokeWidth="0.5" />
            </g>
          )}

          {/* 7. Active Epicenters & Dynamic Sonar Scan/Shockwaves */}
          {activeAlert && (
            <g>
              {/* Sonar radiating scanning waves */}
              <circle
                cx={epicenterCoords.x}
                cy={epicenterCoords.y}
                r={waveRadius}
                fill="none"
                stroke={activeAlert.intensity_max === "7" || activeAlert.disaster_type === "tsunami" ? "#9d05ff" : "#ff6600"}
                strokeWidth="2"
                opacity={Math.max(0, 1 - waveRadius / 160)}
                pointerEvents="none"
              />
              <circle
                cx={epicenterCoords.x}
                cy={epicenterCoords.y}
                r={Math.max(0, waveRadius - 50)}
                fill="none"
                stroke={activeAlert.intensity_max === "7" || activeAlert.disaster_type === "tsunami" ? "#9d05ff" : "#ff6600"}
                strokeWidth="1.5"
                opacity={Math.max(0, 1 - (waveRadius - 50) / 160)}
                pointerEvents="none"
              />
              <circle
                cx={epicenterCoords.x}
                cy={epicenterCoords.y}
                r={Math.max(0, waveRadius - 100)}
                fill="none"
                stroke={activeAlert.intensity_max === "7" || activeAlert.disaster_type === "tsunami" ? "#9d05ff" : "#ff6600"}
                strokeWidth="1"
                opacity={Math.max(0, 1 - (waveRadius - 100) / 160)}
                pointerEvents="none"
              />

              {/* Pulsating Epicenter indicator */}
              <g className="cursor-pointer">
                {/* Outer warning ring */}
                <circle
                  cx={epicenterCoords.x}
                  cy={epicenterCoords.y}
                  r="18"
                  fill="none"
                  stroke={activeAlert.intensity_max === "7" ? "#9d05ff" : "#ff6600"}
                  strokeWidth="2"
                  className="animate-ping"
                />
                
                {/* Red/Purple hazard diamond */}
                <polygon 
                  points={`${epicenterCoords.x},${epicenterCoords.y - 12} ${epicenterCoords.x + 12},${epicenterCoords.y} ${epicenterCoords.x},${epicenterCoords.y + 12} ${epicenterCoords.x - 12},${epicenterCoords.y}`}
                  fill={activeAlert.intensity_max === "7" ? "#9d05ff" : "#ff6600"}
                  stroke="white"
                  strokeWidth="1.5"
                />

                {/* Micro icon inside epicenter */}
                <path 
                  d={`M ${epicenterCoords.x - 4} ${epicenterCoords.y} L ${epicenterCoords.x + 4} ${epicenterCoords.y}`} 
                  stroke="white" 
                  strokeWidth="2" 
                />
                <path 
                  d={`M ${epicenterCoords.x} ${epicenterCoords.y - 4} L ${epicenterCoords.x} ${epicenterCoords.y + 4}`} 
                  stroke="white" 
                  strokeWidth="2" 
                />

                {/* Epicenter Label Card */}
                <g transform={`translate(${epicenterCoords.x + 16}, ${epicenterCoords.y - 12})`}>
                  <rect 
                    width="120" 
                    height="24" 
                    fill="#050505" 
                    stroke={activeAlert.intensity_max === "7" ? "#9d05ff" : "#ff6600"}
                    strokeWidth="1.5" 
                    rx="1"
                  />
                  <text 
                    x="6" 
                    y="15" 
                    fill="#00FF66" 
                    fontSize="8" 
                    fontWeight="bold"
                    className="font-mono"
                  >
                    EPICENTER: {activeAlert.disaster_type.toUpperCase()}
                  </text>
                </g>
              </g>
            </g>
          )}

          {/* 8. Shelter Nodes (Designated Safe zones) */}
          {shelters.map((shelter) => {
            const coords = project(shelter.lat, shelter.lng);
            const isSelected = shelter.id === selectedShelterId;
            const isCritical = shelter.capacity_current / shelter.capacity_max >= 0.9;
            const isWarning = shelter.capacity_current / shelter.capacity_max >= 0.75 && !isCritical;
            
            // Render styled shelter circles matching specs
            let nodeFillColor = "#00FF66";
            if (isCritical) nodeFillColor = "#9d05ff";
            else if (isWarning) nodeFillColor = "#ff6600";

            return (
              <g 
                key={shelter.id}
                className="cursor-pointer group"
                onClick={() => onSelectShelter(shelter.id)}
              >
                {/* Visual glowing ring for selection */}
                {isSelected && (
                  <circle
                    cx={coords.x}
                    cy={coords.y}
                    r="16"
                    fill="none"
                    stroke={nodeFillColor}
                    strokeWidth="2"
                    className="animate-ping opacity-70"
                  />
                )}

                {/* Node visual marker: Outer ring and inner dot */}
                <circle
                  cx={coords.x}
                  cy={coords.y}
                  r={isSelected ? "9" : "7"}
                  fill={isSelected ? nodeFillColor : "black"}
                  stroke={nodeFillColor}
                  strokeWidth="2.5"
                  className="transition-all duration-300"
                />
                
                {/* Innermost dot for unselected shelters */}
                {!isSelected && (
                  <circle
                    cx={coords.x}
                    cy={coords.y}
                    r="2.5"
                    fill={nodeFillColor}
                  />
                )}

                {/* Label text */}
                <g transform={`translate(${coords.x + 12}, ${coords.y + 3})`}>
                  {/* Subtle backdrop tag */}
                  <rect
                    x="-2"
                    y="-9"
                    width={shelter.name_en.length * 5.2 + 6}
                    height="12"
                    fill={isLight ? "rgba(255, 255, 255, 0.85)" : "rgba(5, 5, 5, 0.8)"}
                    rx="1"
                    className="opacity-90 group-hover:opacity-100 transition-opacity"
                  />
                  <text
                    fill={isSelected ? (isLight ? "#1a1a17" : "#ffffff") : (isLight ? "#2d3748" : "#cfbfa8")}
                    fontSize={isSelected ? "9" : "7.5"}
                    fontWeight={isSelected ? "bold" : "normal"}
                    className="font-mono pointer-events-none select-none"
                  >
                    {shelter.name_en.toUpperCase()}
                  </text>
                </g>
              </g>
            );
          })}

          {/* 9. Evacuation routes connecting Epicenter to selected Shelter */}
          {showRoutes && selectedShelterCoords && activeAlert && (
            <g>
              <line
                x1={epicenterCoords.x}
                y1={epicenterCoords.y}
                x2={selectedShelterCoords.x}
                y2={selectedShelterCoords.y}
                stroke="#9d05ff"
                strokeWidth="2"
                strokeDasharray="5,5"
                className="animate-pulse"
                opacity="0.9"
              />
              <circle 
                cx={selectedShelterCoords.x} 
                cy={selectedShelterCoords.y} 
                r="22" 
                fill="none" 
                stroke="#9d05ff" 
                strokeWidth="1" 
                strokeDasharray="2,3" 
                className="animate-spin-slow"
              />
              
              {/* Route distance indicator tag */}
              <g transform={`translate(${(epicenterCoords.x + selectedShelterCoords.x) / 2 - 40}, ${(epicenterCoords.y + selectedShelterCoords.y) / 2 - 10})`}>
                <rect
                  width="80"
                  height="18"
                  fill={isLight ? "#ffffff" : "#050505"}
                  stroke="#9d05ff"
                  strokeWidth="1.5"
                  rx="1"
                />
                <text
                  x="40"
                  y="12"
                  fill="#00e55b"
                  fontSize="7.5"
                  textAnchor="middle"
                  fontWeight="bold"
                  className="font-mono"
                >
                  EVAC_ROUTE_LINK
                </text>
              </g>
            </g>
          )}
        </svg>

        {/* Hovered Landmark Info Tooltip */}
        {hoveredLandmark && (
          <div className={`absolute top-12 left-4 ${isLight ? "bg-white/95 text-stone-900 border-[#ff6600]" : "bg-black/95 text-white border-[#ff6600]"} border p-2 text-[9px] z-30 font-mono pointer-events-none transition-colors duration-300`}>
            <div className="text-[#ff6600] font-bold">INFO OVERLAY :: LANDMARK</div>
            <div className="uppercase mt-0.5">{hoveredLandmark.replace(/_/g, " ")}</div>
            <div className={`${isLight ? "text-stone-600 font-bold" : "text-gray-400"} text-[8px] mt-0.5`}>
              {hoveredLandmark === "TOKYO_TOWER" && "MINATO BLOCK TACTICAL TRANSMITTER"}
              {hoveredLandmark === "TOKYO_SKYTREE" && "METROPOLITAN ATMOSPHERIC SENSOR VECTOR"}
              {hoveredLandmark === "HANEDA_AIRPORT" && "EMERGENCY EVACUATION AIRBASE & SUPPLIES HUB"}
              {hoveredLandmark === "RAINBOW_BRIDGE" && "TOKYO PORT LOGISTICAL HIGHWAY"}
              {hoveredLandmark === "AQUALINE_UMI_HOTARU" && "SUB-SEA TSUNAMI BARRIER & FLOW MONITOR"}
            </div>
          </div>
        )}

        {/* Selected Shelter Reticle & Information Overlay (floating box top-right of map) */}
        {focusedShelter && selectedShelterCoords && (
          <div className={`absolute top-12 right-4 ${isLight ? "bg-white text-stone-900 border-[#ccc7b9] shadow-lg" : "bg-black/95 text-gray-200 border-[#393939]"} border-2 p-3 w-56 text-[10px] space-y-1.5 z-20 glow-orange transition-colors duration-300`}>
            <div className={`flex items-center justify-between border-b ${isLight ? "border-stone-200" : "border-[#393939]"} pb-1`}>
              <span className="text-[#ff6600] font-bold tracking-wider">[SELECTED NODE]</span>
              <span className="text-gray-500 font-bold">ID: {focusedShelter.id.split("_")[2]}</span>
            </div>
            <div className={`text-xs font-bold uppercase ${isLight ? "text-stone-950" : "text-white"}`}>{focusedShelter.name}</div>
            <div className="text-gray-500 font-medium italic">{focusedShelter.name_en}</div>
            <div className={`border-t ${isLight ? "border-stone-200" : "border-[#1c1b1b]"} pt-1.5 space-y-1`}>
              <div className="flex justify-between">
                <span>COORD SCALE:</span>
                <span className="text-[#00FF66] font-bold">{focusedShelter.lat.toFixed(4)} / {focusedShelter.lng.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span>EST DISTANCE:</span>
                <span className="text-[#ff6600] font-bold">
                  {focusedShelter.distance_km ? `${focusedShelter.distance_km} KM` : "CALCULATING..."}
                </span>
              </div>
              <div className="flex justify-between">
                <span>HAZARD SUITABILITY:</span>
                <span className={focusedShelter.is_safe !== false ? "text-[#00FF66] font-bold" : "text-[#9d05ff] font-bold"}>
                  {focusedShelter.is_safe !== false ? "● SECURE" : "▲ UNSAFE VECTOR"}
                </span>
              </div>
            </div>
            <div className="pt-1 flex items-center gap-1">
              <Navigation className="w-3 h-3 text-[#ff6600] animate-bounce" />
              <span className="text-[8px] text-[#ff6600] font-bold">SECURE ROUTE PLOTTED</span>
            </div>
          </div>
        )}

        {/* Dynamic Map Click Instruction Overlay */}
        <div className={`absolute top-12 left-1/2 transform -translate-x-1/2 ${isLight ? "bg-white/95 border-stone-300 text-stone-700 shadow-sm" : "bg-black/80 border-gray-800 text-gray-400"} border px-3 py-1 text-[8px] flex items-center gap-1.5 pointer-events-none tracking-widest uppercase rounded transition-colors duration-300`}>
          <Info className="w-3 h-3 text-[#ff6600]" />
          <span>Click anywhere on map to trigger simulated epicenter impact</span>
        </div>

        {/* Map Grid / Layer Controls Bar */}
        <div className={`absolute bottom-4 left-4 ${isLight ? "bg-white/95 text-stone-900 border-[#ccc7b9]" : "bg-[#0c0c0c]/90 text-gray-300 border-[#393939]"} border px-3 py-1.5 flex gap-4 text-[10px] z-20 font-bold transition-colors duration-300`}>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-[#ff6600]">
            <input 
              type="checkbox" 
              checked={showGrids} 
              onChange={() => setShowGrids(!showGrids)}
              className="accent-[#ff6600] rounded-none bg-black border-[#393939]" 
            />
            <span>COORD_GRIDS</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-[#ff6600]">
            <input 
              type="checkbox" 
              checked={showRoutes} 
              onChange={() => setShowRoutes(!showRoutes)}
              className="accent-[#ff6600] rounded-none bg-black border-[#393939]" 
            />
            <span>EVAC_VECTOR</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-[#ff6600]">
            <input 
              type="checkbox" 
              checked={showSensors} 
              onChange={() => setShowSensors(!showSensors)}
              className="accent-[#ff6600] rounded-none bg-black border-[#393939]" 
            />
            <span>SENSORS</span>
          </label>
        </div>

        {/* Mini compass overlay on map */}
        <div className="absolute bottom-4 right-4 text-gray-500 flex flex-col items-center select-none pointer-events-none opacity-40">
          <Compass className="w-8 h-8 text-[#ff6600]" />
          <span className="text-[8px] mt-1 font-bold">ORIENT::N</span>
        </div>
      </div>

      {/* Map Control Actions Footer */}
      <div className={`flex items-center justify-between p-2 ${headerBg} border-t ${mapBorderColor} text-xs transition-colors duration-300`}>
        <div className="flex gap-2 items-center">
          <span className="text-gray-500 font-bold">GRID RANGE:</span>
          <button 
            onClick={() => setZoomLevel("1:25,000")} 
            className={`px-2 py-0.5 border text-[9px] font-bold ${zoomLevel === "1:25,000" ? "bg-[#ff6600]/20 text-[#ff6600] border-[#ff6600]" : `${isLight ? "border-[#ccc7b9] text-stone-600" : "border-[#393939] text-gray-400"} hover:text-[#ff6600]`}`}
          >
            25K
          </button>
          <button 
            onClick={() => setZoomLevel("1:50,000")} 
            className={`px-2 py-0.5 border text-[9px] font-bold ${zoomLevel === "1:50,000" ? "bg-[#ff6600]/20 text-[#ff6600] border-[#ff6600]" : `${isLight ? "border-[#ccc7b9] text-stone-600" : "border-[#393939] text-gray-400"} hover:text-[#ff6600]`}`}
          >
            50K
          </button>
          <button 
            onClick={() => setZoomLevel("1:100,000")} 
            className={`px-2 py-0.5 border text-[9px] font-bold ${zoomLevel === "1:100,000" ? "bg-[#ff6600]/20 text-[#ff6600] border-[#ff6600]" : `${isLight ? "border-[#ccc7b9] text-stone-600" : "border-[#393939] text-gray-400"} hover:text-[#ff6600]`}`}
          >
            100K
          </button>
        </div>

        {/* Legend */}
        <div className="hidden md:flex gap-3 text-[9px] text-gray-500 font-bold">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66]" />
            STABLE
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff6600]" />
            WARNING
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9d05ff]" />
            CRITICAL
          </span>
        </div>
      </div>
    </div>
  );
}
