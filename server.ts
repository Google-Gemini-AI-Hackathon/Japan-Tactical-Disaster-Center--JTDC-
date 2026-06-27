import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Unified ESM & CommonJS Path Resolution
let myFilename = "";
let myDirname = "";
try {
  myFilename = fileURLToPath(import.meta.url);
  myDirname = path.dirname(myFilename);
} catch (e) {
  // Fallback if bundled under CommonJS CJS
  myFilename = __filename;
  myDirname = __dirname;
}

// Tokyo Designated Shelters Database (指定避難所)
interface Shelter {
  id: string;
  name: string;
  name_en: string;
  lat: number;
  lng: number;
  address: string;
  capacity_max: number;
  capacity_current: number;
  hazard_eq: boolean;
  hazard_ts: boolean;
  hazard_fl: boolean;
}

const SHELTERS: Shelter[] = [
  {
    id: "SHELTER_01_SHIBUYA",
    name: "渋谷スポーツセンター",
    name_en: "Shibuya Sports Center",
    lat: 35.6725,
    lng: 139.6912,
    address: "東京都渋谷区西原1-40-1",
    capacity_max: 2500,
    capacity_current: 1800, // 72%
    hazard_eq: true,
    hazard_ts: false,
    hazard_fl: true,
  },
  {
    id: "SHELTER_02_UENO",
    name: "上野恩賜公園避難所",
    name_en: "Ueno Park Shelter",
    lat: 35.7145,
    lng: 139.7735,
    address: "東京都台東区上野公園",
    capacity_max: 5000,
    capacity_current: 4400, // 88%
    hazard_eq: true,
    hazard_ts: true,
    hazard_fl: false,
  },
  {
    id: "SHELTER_03_MINATO",
    name: "港区芝公園グラウンド",
    name_en: "Minato Shiba Park Ground",
    lat: 35.6558,
    lng: 139.7482,
    address: "東京都港区芝公園4-10-17",
    capacity_max: 3000,
    capacity_current: 2820, // 94%
    hazard_eq: true,
    hazard_ts: false,
    hazard_fl: false,
  },
  {
    id: "SHELTER_04_SHINJUKU",
    name: "新宿中央公園避難所",
    name_en: "Shinjuku Chuo Park",
    lat: 35.6896,
    lng: 139.6917,
    address: "東京都新宿区西新宿2-11",
    capacity_max: 4000,
    capacity_current: 1800, // 45%
    hazard_eq: true,
    hazard_ts: true,
    hazard_fl: true,
  },
  {
    id: "SHELTER_05_CHIYODA",
    name: "日比谷公園大音楽堂周辺",
    name_en: "Hibiya Park Area",
    lat: 35.6738,
    lng: 139.7558,
    address: "東京都千代田区日比谷公園1-5",
    capacity_max: 3500,
    capacity_current: 1050, // 30%
    hazard_eq: true,
    hazard_ts: false,
    hazard_fl: true,
  },
  {
    id: "SHELTER_06_EDOGAWA",
    name: "江戸川区陸上競技場",
    name_en: "Edogawa Stadium",
    lat: 35.6433,
    lng: 139.8617,
    address: "東京都江戸川区清新町2-1-1",
    capacity_max: 4500,
    capacity_current: 900, // 20%
    hazard_eq: true,
    hazard_ts: false,
    hazard_fl: false,
  }
];

// Spatial distance calculator (Haversine formula in KM)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

// Global active simulated disaster alerts
let activeSimulatedDisaster: any = null;
let sseClients: any[] = [];

function broadcastSSE(type: string, data: any) {
  sseClients.forEach((client) => {
    client.write(`event: ${type}\n`);
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  });
}

// Initial Simulated Intel broadcast feeds
const defaultIntelFeed = [
  {
    id: "intel_1",
    time: "14:02:11",
    tag: "FLASH",
    text: "JMA reports minor tremors in Sagami Bay. Tsunami sensors stabilizing.",
  },
  {
    id: "intel_2",
    time: "14:00:45",
    tag: "NERV",
    text: "Sector 4 shelter capacity reaching 85%. Traffic control rerouting to Sector 7.",
  },
  {
    id: "intel_3",
    time: "13:58:22",
    tag: "STABLE",
    text: "Power grid frequency fluctuation detected in Chiyoda-ku. No outage expected.",
  },
  {
    id: "intel_4",
    time: "13:55:10",
    tag: "URGENT",
    text: "Anomalous thermal signature detected at Shinjuku crossing point. Analyzing.",
  },
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "20mb" }));

  // Lazy initialize Gemini SDK client
  const ai = process.env.GEMINI_API_KEY
    ? new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      })
    : null;

  // 1. Shelters search database
  app.get("/api/shelters", (req, res) => {
    const lat = parseFloat(req.query.lat as string) || 35.6895;
    const lng = parseFloat(req.query.lng as string) || 139.6917;
    const hazard = (req.query.hazard as string) || "earthquake";

    const result = SHELTERS.map((s) => {
      const distance = calculateDistance(lat, lng, s.lat, s.lng);
      let is_safe = true;
      if (hazard === "earthquake") is_safe = s.hazard_eq;
      else if (hazard === "tsunami") is_safe = s.hazard_ts;
      else if (hazard === "flood" || hazard === "landslide" || hazard === "typhoon") is_safe = s.hazard_fl;

      return {
        ...s,
        distance_km: distance,
        is_safe,
      };
    });

    result.sort((a, b) => a.distance_km - b.distance_km);
    res.json(result);
  });

  // 2. Fetch live p2pquake earthquakes
  app.get("/api/earthquakes", async (req, res) => {
    try {
      const response = await fetch("https://api.p2pquake.net/v2/history?codes=551&limit=5");
      if (!response.ok) throw new Error("p2pquake down");
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.json([
        {
          id: "mock_eq_1",
          time: new Date().toISOString(),
          earthquake: {
            hypocenter: { name: "Sagami Bay (相模湾)", depth: 10, latitude: 35.2, longitude: 139.3 },
            maxScale: 40,
            domesticTsunami: "None",
          },
        },
      ]);
    }
  });

  // 3. Simulated Intel feed
  app.get("/api/intel", (req, res) => {
    res.json(defaultIntelFeed);
  });

  // 4. Trigger simulated alerts
  app.post("/api/simulate/earthquake", (req, res) => {
    const { magnitude, epicenterName, lat, lng } = req.body;
    const timestamp = new Date().toLocaleTimeString("ja-JP", { hour12: false });
    
    const newDisaster = {
      disaster_type: "earthquake",
      intensity_max: magnitude >= 7 ? "7" : "6-强",
      epicenter: epicenterName || "Tokyo Bay (東京湾)",
      lat: lat || 35.60,
      lng: lng || 139.80,
      affected_prefectures: ["Tokyo", "Kanagawa", "Chiba", "Saitama"],
      immediate_hazards: [
        "Severe ground shaking in coastal reclaim blocks",
        "Minor sea level fluctuations detected",
        "Liquefaction vulnerability in Koto-ku",
      ],
      agent_triage_directives: [
        ">> RED ALERT: Deploy Emergency Taskforce to Tokyo Port District",
        ">> CRITICAL: Divert traffic away from Rainbow Bridge",
        ">> WARNING: High capacity load on Shinjuku Sector 4 shelter",
      ],
      drafts: {
        sms_alert_jp: `【緊急地震速報】${epicenterName || '東京湾'}で大地震発生。強い揺れに警戒、身の安全を確保してください。`,
        sms_alert_en: `EMERGENCY ALERT: Major Earthquake off ${epicenterName || 'Tokyo Bay'}. Drop, Cover, and Hold on.`,
        social_feed_jp: `【NERV災害対策本部】東京湾を震源とするマグニチュード7.2の地震を観測。最大震度7。津波警報の有無に警戒せよ。 #防災`,
      },
      timestamp,
    };

    activeSimulatedDisaster = newDisaster;
    
    const feedEvent = {
      id: `intel_${Date.now()}`,
      time: timestamp,
      tag: "CRITICAL",
      text: `SIMULATION TRIGGERED: Magnitude ${magnitude} Earthquake at ${epicenterName || 'Tokyo Bay'}. Shindo ${magnitude >= 7 ? '7' : '6+'}.`,
    };

    broadcastSSE("disaster_alert", newDisaster);
    broadcastSSE("intel_feed", feedEvent);

    res.json({ success: true, disaster: newDisaster, feedEvent });
  });

  // 5. Gemini 3.5 Flash Triage Engine
  app.post("/api/triage", async (req, res) => {
    if (!ai) {
      return res.status(500).json({
        error: "Gemini API key is not configured. Please add GEMINI_API_KEY to your secrets.",
      });
    }

    const { prompt, imageBase64, imageMime } = req.body;

    try {
      const sysInstruction = `You are the intelligence core of the NERV Disaster Response Coordinator. Your purpose is to process highly chaotic, multimodal data (JMA alert JSON, satellite images, local tweets) and coordinate immediate evacuation and resource allocation recommendations for Japan.

When processing, follow these rules strictly:
1. Always parse location text (e.g., "新宿区", "Shinjuku", "東京湾") and associate it with geographic regions.
2. For any disaster, cross-reference designated shelters (避難所) based on the threat vector. DO NOT recommend a shelter flagged as unsafe for the active hazard.
3. Always output your findings and coordinated outputs in highly structured JSON formats.
4. Keep translations accurate across Japanese (日本語) and English.`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          disaster_type: { 
            type: Type.STRING, 
            enum: ["earthquake", "tsunami", "flood", "typhoon", "landslide", "other"] 
          },
          intensity_max: { 
            type: Type.STRING, 
            description: "JMA Shindo scale (1 to 7)" 
          },
          epicenter: { type: Type.STRING },
          affected_prefectures: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          immediate_hazards: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          agent_triage_directives: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          drafts: {
            type: Type.OBJECT,
            properties: {
              sms_alert_jp: { type: Type.STRING },
              sms_alert_en: { type: Type.STRING },
              social_feed_jp: { type: Type.STRING }
            },
            required: ["sms_alert_jp", "sms_alert_en", "social_feed_jp"]
          }
        },
        required: [
          "disaster_type", 
          "intensity_max", 
          "epicenter", 
          "affected_prefectures", 
          "immediate_hazards", 
          "agent_triage_directives", 
          "drafts"
        ]
      };

      let contents: any[] = [];
      if (imageBase64 && imageMime) {
        contents.push({
          inlineData: {
            mimeType: imageMime,
            data: imageBase64,
          },
        });
      }

      contents.push({
        text: prompt || "Assess current tactical situation and provide immediate triage response directives for Tokyo Bay area.",
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction: sysInstruction,
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      });

      const resultText = response.text || "{}";
      const triageResult = JSON.parse(resultText);

      activeSimulatedDisaster = {
        ...triageResult,
        timestamp: new Date().toLocaleTimeString("ja-JP", { hour12: false }),
      };

      broadcastSSE("disaster_alert", activeSimulatedDisaster);

      res.json(triageResult);
    } catch (error: any) {
      console.error("Gemini triage error:", error);
      res.status(500).json({ error: error.message || "Failed to process triage via Gemini API" });
    }
  });

  // 6. SSE Event Stream Endpoint for Real-time updating
  app.get("/api/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    res.write("data: { \"connected\": true }\n\n");
    sseClients.push(res);

    req.on("close", () => {
      sseClients = sseClients.filter((client) => client !== res);
    });
  });

  // Mount Vite development middlewares OR serve static bundle
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
