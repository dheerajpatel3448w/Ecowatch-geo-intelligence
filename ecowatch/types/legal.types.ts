export interface CarbonImpact {
  treesLost: number;
  co2TonnesLost: number;
  economicDamage: {
    usd: number;
    inr: number;
    inrLakhs: number;
    basis: string;
  };
}

export interface DeforestationMetrics {
  forestLossPct: number;
  deforestedKm2: number;
  deforestedHa: number;
}

export interface CarbonLossData {
  zone: {
    id: string;
    name: string;
    area_km2: number;
  };
  period: {
    from: string;
    to: string;
    scans: number;
  };
  deforestation: DeforestationMetrics;
  carbonImpact: CarbonImpact;
  note: string;
}

export interface CarbonLossResponse {
  success: boolean;
  message?: string;
  data: CarbonLossData | null;
}

export interface ZoneRiskData {
  zoneId: string;
  zoneName: string;
  area_km2: number;
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  forestPct: number | null;
  ndviLoss: number;
  alerts3mo: number;
  lastScan: string | null;
}

export interface AllRiskScoresResponse {
  success: boolean;
  count: number;
  data: ZoneRiskData[];
}

export interface SingleZoneRiskData {
  zone: {
    id: string;
    name: string;
    area_km2: number;
  };
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  breakdown: {
    ndviLoss: number;
    alerts3mo: number;
    latestThreat: string;
  };
  recommendation: string;
  lastScan: string | null;
}

export interface SingleZoneRiskResponse {
  success: boolean;
  data: SingleZoneRiskData;
}
