/**
 * BEE Building Energy Benchmark Data
 *
 * Published EUI reference ranges (kWh/m²·yr) for Indian commercial buildings
 * across all five ECBC 2017 climate zones and four primary archetypes.
 *
 * Sources:
 *  - Bureau of Energy Efficiency (BEE). Star Rating Programme for Commercial Buildings (2020).
 *  - BEE. Energy Conservation Building Code (ECBC) 2017, §6 — Performance compliance EUI baselines.
 *  - TERI. Energy Benchmarking of Commercial Buildings in India (2019).
 *  - NBC 2016 Part 8 §3 — Energy norms for building archetypes.
 *  - GRIHA Council. Building Energy Performance Data (2022).
 *
 * Notes:
 *  - "min"     → bottom decile of the observed stock (highly efficient buildings)
 *  - "typical" → median / geometric mean of observed stock
 *  - "max"     → top decile (least efficient compliant buildings)
 *  - "bee5star" → BEE 5-star EPI threshold (best-in-class, top 10%)
 *  - "bee3star" → BEE 3-star EPI threshold (minimum acceptable target)
 *  - "ecbcBaseline" → ECBC 2017 prescriptive-path baseline EUI for the zone
 */

export type BenchmarkZone =
  | 'Hot-Dry'
  | 'Warm-Humid'
  | 'Composite'
  | 'Temperate'
  | 'Cold';

export type BenchmarkArchetype =
  | 'office_small'
  | 'office_medium'
  | 'retail'
  | 'healthcare';

export interface BenchmarkRange {
  min: number;
  typical: number;
  max: number;
  bee5star: number;
  bee3star: number;
  ecbcBaseline: number;
}

export interface BenchmarkResult {
  archetype: BenchmarkArchetype;
  zone: BenchmarkZone;
  range: BenchmarkRange;
  predictedEUI: number;
  status: 'below_range' | 'within_range' | 'above_range';
  statusLabel: string;
  statusColor: string;
  percentile: number; // 0-100, where 0 = at min, 100 = at max
  deviation: number;  // kWh/m²·yr relative to typical (negative = better)
  deviationPct: number; // % relative to typical
  beeStarRating: number; // 1-5
}

// ─── Benchmark Table ─────────────────────────────────────────────────────────
const BENCHMARK_TABLE: Record<BenchmarkArchetype, Record<BenchmarkZone, BenchmarkRange>> = {
  office_small: {
    'Hot-Dry':    { min: 120, typical: 165, max: 230, bee5star: 75,  bee3star: 130, ecbcBaseline: 175 },
    'Warm-Humid': { min: 110, typical: 155, max: 210, bee5star: 70,  bee3star: 120, ecbcBaseline: 160 },
    'Composite':  { min: 120, typical: 170, max: 225, bee5star: 75,  bee3star: 125, ecbcBaseline: 175 },
    'Temperate':  { min: 85,  typical: 120, max: 165, bee5star: 55,  bee3star: 95,  ecbcBaseline: 130 },
    'Cold':       { min: 80,  typical: 110, max: 155, bee5star: 50,  bee3star: 90,  ecbcBaseline: 120 },
  },
  office_medium: {
    'Hot-Dry':    { min: 140, typical: 190, max: 260, bee5star: 85,  bee3star: 140, ecbcBaseline: 200 },
    'Warm-Humid': { min: 130, typical: 180, max: 240, bee5star: 80,  bee3star: 130, ecbcBaseline: 185 },
    'Composite':  { min: 140, typical: 195, max: 255, bee5star: 85,  bee3star: 135, ecbcBaseline: 200 },
    'Temperate':  { min: 100, typical: 140, max: 190, bee5star: 65,  bee3star: 105, ecbcBaseline: 150 },
    'Cold':       { min: 95,  typical: 130, max: 180, bee5star: 60,  bee3star: 100, ecbcBaseline: 140 },
  },
  retail: {
    'Hot-Dry':    { min: 200, typical: 280, max: 380, bee5star: 90,  bee3star: 155, ecbcBaseline: 290 },
    'Warm-Humid': { min: 185, typical: 260, max: 350, bee5star: 85,  bee3star: 145, ecbcBaseline: 270 },
    'Composite':  { min: 195, typical: 270, max: 370, bee5star: 90,  bee3star: 150, ecbcBaseline: 280 },
    'Temperate':  { min: 155, typical: 215, max: 295, bee5star: 70,  bee3star: 120, ecbcBaseline: 225 },
    'Cold':       { min: 145, typical: 200, max: 280, bee5star: 65,  bee3star: 115, ecbcBaseline: 210 },
  },
  healthcare: {
    'Hot-Dry':    { min: 300, typical: 380, max: 500, bee5star: 150, bee3star: 230, ecbcBaseline: 400 },
    'Warm-Humid': { min: 280, typical: 360, max: 470, bee5star: 140, bee3star: 220, ecbcBaseline: 380 },
    'Composite':  { min: 295, typical: 375, max: 490, bee5star: 145, bee3star: 225, ecbcBaseline: 390 },
    'Temperate':  { min: 240, typical: 315, max: 420, bee5star: 110, bee3star: 180, ecbcBaseline: 330 },
    'Cold':       { min: 220, typical: 295, max: 400, bee5star: 100, bee3star: 170, ecbcBaseline: 310 },
  },
};

// ─── Zone Inference ──────────────────────────────────────────────────────────
/**
 * Infers ECBC 2017 climate zone from CDD/HDD/GHI climate variables.
 * Mirrors _derive_climate_code() in ml_engine.py — thresholds must stay in sync.
 */
export function inferClimateZone(cdd: number, hdd: number, solrad: number): BenchmarkZone {
  if (hdd > 1200) return 'Cold';
  if (cdd >= 2500 && solrad > 5.5) return 'Hot-Dry';
  if (cdd >= 2500) return 'Warm-Humid';
  if (cdd <= 1200 && hdd <= 1200) return 'Temperate';
  return 'Composite';
}

/** Maps a raw archetype string (e.g. 'office_small', 'Office (Small)') to a canonical key. */
export function normaliseArchetype(archetype: string): BenchmarkArchetype {
  const a = archetype?.toLowerCase().replace(/\s+/g, '_') ?? '';
  if (a.includes('medium') || a.includes('large')) return 'office_medium';
  if (a.includes('retail') || a.includes('mall') || a.includes('shop')) return 'retail';
  if (a.includes('health') || a.includes('hospital') || a.includes('clinic')) return 'healthcare';
  return 'office_small'; // safe fallback — most common archetype
}

// ─── BEE Star Rating ─────────────────────────────────────────────────────────
function getBeeStarRating(predictedEUI: number, range: BenchmarkRange): number {
  // Linear interpolation between bee5star (5★) and bee3star (3★) boundaries;
  // Above bee3star linearly decays toward 1★ at max.
  if (predictedEUI <= range.bee5star) return 5;
  if (predictedEUI <= range.bee3star) {
    return 5 - 2 * ((predictedEUI - range.bee5star) / (range.bee3star - range.bee5star));
  }
  if (predictedEUI <= range.max) {
    return 3 - 2 * ((predictedEUI - range.bee3star) / (range.max - range.bee3star));
  }
  return 1;
}

// ─── Main Validation Function ─────────────────────────────────────────────────
export function validateAgainstBenchmark(
  predictedEUI: number,
  archetype: string,
  climateZone?: string,
  cdd?: number,
  hdd?: number,
  solrad?: number,
): BenchmarkResult {
  // Resolve archetype and zone
  const archetypeKey = normaliseArchetype(archetype);
  let zone: BenchmarkZone = 'Composite';
  if (climateZone) {
    const zoneMap: Record<string, BenchmarkZone> = {
      'hot-dry': 'Hot-Dry',
      'warm-humid': 'Warm-Humid',
      'composite': 'Composite',
      'temperate': 'Temperate',
      'cold': 'Cold',
    };
    const lc = climateZone.toLowerCase().replace(/_/g, '-');
    zone = Object.entries(zoneMap).find(([k]) => lc.includes(k))?.[1] ?? 'Composite';
  } else if (cdd !== undefined && hdd !== undefined && solrad !== undefined) {
    zone = inferClimateZone(cdd, hdd, solrad);
  }

  const range = BENCHMARK_TABLE[archetypeKey][zone];

  // Percentile position within [min, max] (clamped 0–100)
  const span = range.max - range.min;
  const percentile = Math.max(0, Math.min(100,
    ((predictedEUI - range.min) / span) * 100
  ));

  // Status
  let status: BenchmarkResult['status'];
  let statusLabel: string;
  let statusColor: string;
  if (predictedEUI < range.min) {
    status = 'below_range';
    statusLabel = 'Excellent — Below Benchmark';
    statusColor = '#10b981'; // emerald
  } else if (predictedEUI <= range.max) {
    status = 'within_range';
    statusLabel = 'Within Published BEE Range';
    statusColor = '#0d9488'; // teal
  } else {
    status = 'above_range';
    statusLabel = 'Above Benchmark — Review Design';
    statusColor = '#ef4444'; // red
  }

  const deviation = predictedEUI - range.typical;
  const deviationPct = (deviation / range.typical) * 100;
  const beeStarRating = getBeeStarRating(predictedEUI, range);

  return {
    archetype: archetypeKey,
    zone,
    range,
    predictedEUI,
    status,
    statusLabel,
    statusColor,
    percentile,
    deviation,
    deviationPct,
    beeStarRating,
  };
}

// ─── All-Zone Summary (for PDF table) ─────────────────────────────────────────
export function getBenchmarkSummaryTable(
  archetype: string,
): Array<{ zone: BenchmarkZone; range: BenchmarkRange }> {
  const archetypeKey = normaliseArchetype(archetype);
  return (['Hot-Dry', 'Warm-Humid', 'Composite', 'Temperate', 'Cold'] as BenchmarkZone[]).map(zone => ({
    zone,
    range: BENCHMARK_TABLE[archetypeKey][zone],
  }));
}

export { BENCHMARK_TABLE };
