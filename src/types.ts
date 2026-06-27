export interface DisasterAlert {
  disaster_type: "earthquake" | "tsunami" | "flood" | "typhoon" | "landslide" | "other";
  intensity_max: string; // e.g. "1" to "7"
  epicenter: string;
  lat?: number;
  lng?: number;
  affected_prefectures: string[];
  immediate_hazards: string[];
  agent_triage_directives: string[];
  drafts: {
    sms_alert_jp: string;
    sms_alert_en: string;
    social_feed_jp: string;
  };
  timestamp?: string;
}

export interface IntelItem {
  id: string;
  time: string;
  tag: "FLASH" | "NERV" | "URGENT" | "CRITICAL" | "STABLE";
  text: string;
}

export interface Shelter {
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
  distance_km?: number;
  is_safe?: boolean;
}

export interface TriageStatus {
  loaded: boolean;
  parsing: boolean;
  crossRef: string;
  casualtyProbability: string;
  optimizing: boolean;
  scanning: boolean;
}
