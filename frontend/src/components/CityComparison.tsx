import { useState, useMemo } from 'react';
import {
    MapPin, Zap, Leaf, TrendingDown, TrendingUp, BarChart3, Download,
    ArrowRightLeft, CheckCircle2, AlertTriangle, Info, Globe, Activity,
    ShieldCheck, Calculator, RefreshCw, Scale, Upload
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, Cell, Legend, RadarChart, Radar, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import { cn } from '../lib/utils';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface CityResult {
    name: string;
    predicted_eui: number;
    baseline_eui: number;
    annual_savings_inr: number;
    co2_intensity_kg_m2_yr: number;
    co2_total_tonnes_yr: number;
    ecbc_compliance: any;
    climate_summary: any;
    thermal_comfort: any;
    sensitivity_analysis: any;
    model_metrics: any;
    top_material_recommendations: any[];
    material_sources: any;
    evidence_panel: any;
}

interface CompareResponse {
    city_a: CityResult;
    city_b: CityResult;
    delta: {
        eui_diff: number;
        eui_pct_diff: number;
        co2_diff_kg_m2: number;
        savings_diff_inr: number;
        higher_eui_city: string;
        lower_eui_city: string;
        climate_zone_a: string;
        climate_zone_b: string;
    };
    building_config: any;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const ARCHETYPE_LABELS: Record<string, string> = {
    office_small: 'Small Office',
    office_medium: 'Medium Office',
    retail: 'Retail',
    healthcare: 'Healthcare',
};

const HVAC_OPTIONS = [
    'Split/Window AC',
    'VAV',
    'Central Chiller (VAV)',
    'Variable Refrigerant Flow (VRF)',
    'Evaporative Cooler',
];

const ZONE_COLOR: Record<string, string> = {
    'Hot-Dry':   'bg-orange-100 text-orange-700 border-orange-200',
    'Warm-Humid':'bg-blue-100 text-blue-700 border-blue-200',
    'Composite': 'bg-violet-100 text-violet-700 border-violet-200',
    'Temperate': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Cold':      'bg-sky-100 text-sky-700 border-sky-200',
};

const COMPLIANCE_COLOR: Record<string, string> = {
    'SuperECBC':     'bg-emerald-100 text-emerald-700 border-emerald-300',
    'ECBC+':         'bg-sky-100 text-sky-700 border-sky-300',
    'ECBC Compliant':'bg-blue-100 text-blue-700 border-blue-300',
    'Non-Compliant': 'bg-red-100 text-red-700 border-red-300',
};

function KpiCard({ label, a, b, unit, invert = false, format = (v: number) => v.toFixed(1) }: any) {
    const diff = a - b;
    const aWins = invert ? a > b : a < b;
    const bWins = invert ? b > a : b < a;
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
            <div className="grid grid-cols-2 gap-3">
                <div className={cn("rounded-xl p-3 border-2 transition-all", aWins ? "border-emerald-400 bg-emerald-50" : bWins ? "border-slate-200 bg-slate-50" : "border-slate-200 bg-slate-50")}>
                    <div className="text-[9px] font-black text-slate-400 uppercase mb-1">City A</div>
                    <div className={cn("text-xl font-black", aWins ? "text-emerald-700" : "text-slate-700")}>{format(a)}</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">{unit}</div>
                </div>
                <div className={cn("rounded-xl p-3 border-2 transition-all", bWins ? "border-emerald-400 bg-emerald-50" : aWins ? "border-slate-200 bg-slate-50" : "border-slate-200 bg-slate-50")}>
                    <div className="text-[9px] font-black text-slate-400 uppercase mb-1">City B</div>
                    <div className={cn("text-xl font-black", bWins ? "text-emerald-700" : "text-slate-700")}>{format(b)}</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">{unit}</div>
                </div>
            </div>
            <div className={cn("text-xs font-bold flex items-center gap-1.5 pt-2 border-t border-slate-100",
                Math.abs(diff) < 0.5 ? "text-slate-400" : diff < 0 ? (invert ? "text-rose-500" : "text-emerald-600") : (invert ? "text-emerald-600" : "text-rose-500")
            )}>
                {Math.abs(diff) < 0.5 ? '≈ Equal' : diff < 0 ? '▼' : '▲'} {format(Math.abs(diff))} {unit} {diff < 0 ? 'lower in A' : 'higher in A'}
            </div>
        </div>
    );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function CityComparison() {
    /* Form state */
    const [cityA, setCityA] = useState('Mumbai, India');
    const [cityB, setCityB] = useState('Delhi, India');
    const [archetype, setArchetype] = useState('office_small');
    const [floorArea, setFloorArea] = useState(2000);
    const [wwr, setWwr] = useState(0.40);
    const [hvacType, setHvacType] = useState('VAV');
    const [opHours, setOpHours] = useState(50);
    const [occDensity, setOccDensity] = useState(0.1);
    const [eqLoad, setEqLoad] = useState(10.0);
    const [orientation, setOrientation] = useState('South');
    const [modelType, setModelType] = useState('XGBoost');
    const [climateOverridesA, setClimateOverridesA] = useState<any>(null);
    const [climateOverridesB, setClimateOverridesB] = useState<any>(null);
    const [epwNameA, setEpwNameA] = useState<string | null>(null);
    const [epwNameB, setEpwNameB] = useState<string | null>(null);

    /* Result + status state */
    const [loading, setLoading] = useState(false);
    const [error, setError]  = useState<string | null>(null);
    const [result, setResult] = useState<CompareResponse | null>(null);

    const runComparison = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.post('/compare', {
                city_a: cityA,
                city_b: cityB,
                archetype,
                floor_area_m2: floorArea,
                wwr,
                hvac_type: hvacType,
                operating_hours: opHours,
                occupancy_density: occDensity,
                equipment_load: eqLoad,
                orientation,
                model_type: modelType,
                climate_overrides_a: climateOverridesA,
                climate_overrides_b: climateOverridesB,
            });
            setResult(res.data);
        } catch (e: any) {
            const msg = e.response?.data?.detail || e.message || 'Comparison failed.';
            setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (file: File, isCityA: boolean) => {
        if (!file.name.endsWith('.epw')) {
            setError("Must be an .epw file.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/upload_epw', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (isCityA) {
                setClimateOverridesA(res.data);
                setEpwNameA(file.name);
                setCityA(file.name.replace('.epw', ' (EPW)'));
            } else {
                setClimateOverridesB(res.data);
                setEpwNameB(file.name);
                setCityB(file.name.replace('.epw', ' (EPW)'));
            }
        } catch (e: any) {
            const msg = e.response?.data?.detail || e.message || 'Failed to parse EPW.';
            setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setLoading(false);
        }
    };

    /* Chart data */
    const barData = useMemo(() => {
        if (!result) return [];
        return [
            { metric: 'EUI (kWh/m²·yr)',   a: result.city_a.predicted_eui,          b: result.city_b.predicted_eui },
            { metric: 'CO₂ (kg/m²·yr)',     a: result.city_a.co2_intensity_kg_m2_yr, b: result.city_b.co2_intensity_kg_m2_yr },
            { metric: 'Baseline EUI',        a: result.city_a.baseline_eui,           b: result.city_b.baseline_eui },
        ];
    }, [result]);

    const radarData = useMemo(() => {
        if (!result) return [];
        const a = result.city_a, b = result.city_b;
        const maxEUI = Math.max(a.predicted_eui, b.predicted_eui, 1);
        const maxCO2 = Math.max(a.co2_intensity_kg_m2_yr, b.co2_intensity_kg_m2_yr, 1);
        const maxBase = Math.max(a.baseline_eui, b.baseline_eui, 1);
        const maxTemp = Math.max(a.climate_summary?.annual_mean_temp || 30, b.climate_summary?.annual_mean_temp || 30, 1);
        const maxCDD = Math.max(a.climate_summary?.cdd || 2000, b.climate_summary?.cdd || 2000, 1);
        const s = (v: number, mx: number) => Math.round(Math.min(99, Math.max(5, (v / mx) * 100)));
        return [
            { metric: 'Pred. EUI',     A: s(a.predicted_eui, maxEUI),          B: s(b.predicted_eui, maxEUI) },
            { metric: 'CO₂ Intensity', A: s(a.co2_intensity_kg_m2_yr, maxCO2), B: s(b.co2_intensity_kg_m2_yr, maxCO2) },
            { metric: 'Baseline EUI',  A: s(a.baseline_eui, maxBase),           B: s(b.baseline_eui, maxBase) },
            { metric: 'Mean Temp',     A: s(a.climate_summary?.annual_mean_temp || 25, maxTemp), B: s(b.climate_summary?.annual_mean_temp || 25, maxTemp) },
            { metric: 'CDD',           A: s(a.climate_summary?.cdd || 2000, maxCDD), B: s(b.climate_summary?.cdd || 2000, maxCDD) },
        ];
    }, [result]);

    /* ─ PDF export (research paper table) ─ */
    const exportResearchCSV = () => {
        if (!result) return;
        const a = result.city_a, b = result.city_b;
        const rows = [
            ['Metric', a.name, b.name, 'Δ (A−B)'],
            ['Predicted EUI (kWh/m²·yr)', a.predicted_eui.toFixed(1), b.predicted_eui.toFixed(1), result.delta.eui_diff.toFixed(1)],
            ['Baseline EUI (kWh/m²·yr)', a.baseline_eui.toFixed(1), b.baseline_eui.toFixed(1), (a.baseline_eui - b.baseline_eui).toFixed(1)],
            ['EUI % of Baseline (%)', ((a.predicted_eui / a.baseline_eui) * 100).toFixed(1), ((b.predicted_eui / b.baseline_eui) * 100).toFixed(1), result.delta.eui_pct_diff.toFixed(1)],
            ['CO₂ Intensity (kg CO₂/m²·yr)', a.co2_intensity_kg_m2_yr.toFixed(1), b.co2_intensity_kg_m2_yr.toFixed(1), result.delta.co2_diff_kg_m2.toFixed(1)],
            ['Total CO₂ (t CO₂/yr)', a.co2_total_tonnes_yr.toFixed(2), b.co2_total_tonnes_yr.toFixed(2), (a.co2_total_tonnes_yr - b.co2_total_tonnes_yr).toFixed(2)],
            ['Annual Savings (₹/yr)', a.annual_savings_inr.toFixed(0), b.annual_savings_inr.toFixed(0), result.delta.savings_diff_inr.toFixed(0)],
            ['ECBC Climate Zone', result.delta.climate_zone_a, result.delta.climate_zone_b, '—'],
            ['ECBC Compliance Tier', a.ecbc_compliance?.status || '—', b.ecbc_compliance?.status || '—', '—'],
            ['Mean Annual Temp (°C)', (a.climate_summary?.annual_mean_temp || 0).toFixed(1), (b.climate_summary?.annual_mean_temp || 0).toFixed(1), '—'],
            ['CDD (Base 18.3°C)', (a.climate_summary?.cdd || 0).toFixed(0), (b.climate_summary?.cdd || 0).toFixed(0), '—'],
            ['HDD (Base 18.3°C)', (a.climate_summary?.hdd || 0).toFixed(0), (b.climate_summary?.hdd || 0).toFixed(0), '—'],
            ['GHI (kWh/m²·day)', (a.climate_summary?.annual_solrad || 0).toFixed(2), (b.climate_summary?.annual_solrad || 0).toFixed(2), '—'],
            ['Thermal Comfort (PMV proxy)', a.thermal_comfort?.label || '—', b.thermal_comfort?.label || '—', '—'],
            ['Model R² Score', (a.model_metrics?.r2 || 0).toFixed(4), (b.model_metrics?.r2 || 0).toFixed(4), '—'],
            ['Model MAE (kWh/m²·yr)', (a.model_metrics?.mae || 0).toFixed(2), (b.model_metrics?.mae || 0).toFixed(2), '—'],
            ['', '', '', ''],
            ['Building Configuration', '', '', ''],
            ['Archetype', ARCHETYPE_LABELS[archetype] || archetype, '(same)', ''],
            ['Floor Area (m²)', floorArea.toString(), '(same)', ''],
            ['Window-to-Wall Ratio', (wwr * 100).toFixed(0) + '%', '(same)', ''],
            ['HVAC System', hvacType, '(same)', ''],
            ['Operating Hours/wk', opHours.toString(), '(same)', ''],
            ['Occupancy Density (ppl/m²)', occDensity.toString(), '(same)', ''],
            ['Equipment Load (W/m²)', eqLoad.toString(), '(same)', ''],
            ['Orientation', orientation, '(same)', ''],
            ['ML Model', modelType, '(same)', ''],
            ['', '', '', ''],
            ['Sources', '', '', ''],
            ['Climate Data (City A)', epwNameA ? `Uploaded EPW: ${epwNameA}` : 'NASA POWER API (Climatology)', '', ''],
            ['Climate Data (City B)', epwNameB ? `Uploaded EPW: ${epwNameB}` : 'NASA POWER API (Climatology)', '', ''],
            ['ECBC Compliance', 'BEE ECBC 2017 Tables 5.3-5.5', '', ''],
            ['CO₂ Factor', 'CEA 2022 — 0.82 kgCO₂/kWh', '', ''],
            ['BEE Star Rating', 'BEE (2020) Star Rating Programme', '', ''],
        ];
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a2 = document.createElement('a');
        a2.href = url;
        a2.download = `ClimaBuild_CityComparison_${cityA.split(',')[0]}_vs_${cityB.split(',')[0]}.csv`;
        a2.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-8 pt-6 pb-16">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-2">
                    <div className="text-xs font-black text-primary uppercase tracking-[0.3em]">Research · ECBC 2017</div>
                    <h2 className="text-4xl font-bold tracking-tight text-slate-800">
                        City <span className="text-secondary">Comparison</span>
                    </h2>
                    <p className="text-slate-500 text-base max-w-2xl">
                        Run identical building simulations across two Indian cities to quantify the climate-driven
                        EUI differential — ideal for your research paper's comparative analysis section.
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/5 border border-primary/20 text-xs font-bold text-primary">
                    <Scale className="w-4 h-4" />
                    Same building · Two climates
                </div>
            </div>

            {/* Config Panel */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex items-center gap-2 mb-1">
                    <ArrowRightLeft className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Simulation Configuration</h3>
                </div>

                {/* City selectors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                        { label: 'City A', value: cityA, set: setCityA, color: 'border-primary/40 bg-primary/5', epwName: epwNameA, isA: true },
                        { label: 'City B', value: cityB, set: setCityB, color: 'border-secondary/40 bg-secondary/5', epwName: epwNameB, isA: false },
                    ].map(({ label, value, set, color, epwName, isA }) => (
                        <div key={label} className={cn("p-4 rounded-xl border-2 flex flex-col justify-between", color)}>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{label}</label>
                                    {epwName && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">EPW LOADED</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                                    <input
                                        type="text"
                                        value={value}
                                        onChange={e => {
                                            set(e.target.value);
                                            if (isA) { setEpwNameA(null); setClimateOverridesA(null); }
                                            else { setEpwNameB(null); setClimateOverridesB(null); }
                                        }}
                                        className="flex-1 glass-input py-2 text-sm font-semibold"
                                        placeholder="e.g. Mumbai, India"
                                    />
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-200/50 flex justify-end">
                                <label className="cursor-pointer flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-primary transition-colors">
                                    <Upload className="w-3.5 h-3.5" />
                                    {epwName ? 'Replace EPW' : 'Upload .epw'}
                                    <input type="file" accept=".epw" className="hidden" onChange={e => {
                                        if (e.target.files && e.target.files[0]) handleFileUpload(e.target.files[0], isA);
                                    }} />
                                </label>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Building parameters */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5">Archetype</label>
                        <select value={archetype} onChange={e => setArchetype(e.target.value)} className="glass-input w-full py-2 text-sm">
                            {Object.entries(ARCHETYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5">Floor Area (m²)</label>
                        <input type="number" value={floorArea} onChange={e => setFloorArea(+e.target.value)} className="glass-input w-full py-2 text-sm" min="100" max="50000" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5">WWR</label>
                        <input type="number" value={wwr} onChange={e => setWwr(+e.target.value)} className="glass-input w-full py-2 text-sm" min="0.1" max="0.9" step="0.05" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5">HVAC System</label>
                        <select value={hvacType} onChange={e => setHvacType(e.target.value)} className="glass-input w-full py-2 text-sm">
                            {HVAC_OPTIONS.map(h => <option key={h}>{h}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5">Op. Hours/wk</label>
                        <input type="number" value={opHours} onChange={e => setOpHours(+e.target.value)} className="glass-input w-full py-2 text-sm" min="8" max="168" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5">Occ. Density (ppl/m²)</label>
                        <input type="number" value={occDensity} onChange={e => setOccDensity(+e.target.value)} className="glass-input w-full py-2 text-sm" min="0.01" max="1.0" step="0.01" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5">Equip. Load (W/m²)</label>
                        <input type="number" value={eqLoad} onChange={e => setEqLoad(+e.target.value)} className="glass-input w-full py-2 text-sm" min="1" max="100" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5">ML Model</label>
                        <select value={modelType} onChange={e => setModelType(e.target.value)} className="glass-input w-full py-2 text-sm">
                            <option>XGBoost</option>
                            <option>RandomForest</option>
                            <option>RidgeRegression</option>
                        </select>
                    </div>
                </div>

                <button
                    onClick={runComparison}
                    disabled={loading}
                    className="btn-premium w-full h-12 text-sm font-bold tracking-wide disabled:opacity-60"
                >
                    {loading ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" /> Running dual-city simulation…</>
                    ) : (
                        <><BarChart3 className="w-4 h-4" /> Run City Comparison</>
                    )}
                </button>

                {error && (
                    <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold">
                        <AlertTriangle className="w-4 h-4 inline mr-2" />{error}
                    </div>
                )}
            </div>

            {/* Results */}
            <AnimatePresence>
            {result && (
                <motion.div
                    key="results"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    {/* Delta Summary Banner */}
                    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-secondary/10 rounded-full blur-3xl -z-10" />
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <div className="text-xs font-black text-primary uppercase tracking-widest mb-2">Key Finding</div>
                                <h3 className="text-2xl font-bold text-slate-800">
                                    <span className="text-primary">{result.delta.lower_eui_city.split(',')[0]}</span> uses{' '}
                                    <span className="text-emerald-600 font-black">{Math.abs(result.delta.eui_pct_diff).toFixed(1)}%</span> less energy
                                    <br className="hidden sm:block" /> than{' '}
                                    <span className="text-accent">{result.delta.higher_eui_city.split(',')[0]}</span>
                                </h3>
                                <p className="text-slate-500 text-sm mt-2">
                                    EUI Δ = {Math.abs(result.delta.eui_diff).toFixed(1)} kWh/m²·yr &nbsp;|&nbsp;
                                    CO₂ Δ = {Math.abs(result.delta.co2_diff_kg_m2).toFixed(1)} kg CO₂/m²·yr &nbsp;|&nbsp;
                                    Zones: {result.delta.climate_zone_a} vs {result.delta.climate_zone_b}
                                </p>
                            </div>
                            <button
                                onClick={exportResearchCSV}
                                className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-bold text-slate-700 shadow-sm transition-all shrink-0"
                            >
                                <Download className="w-4 h-4 text-primary" />
                                Export Research CSV
                            </button>
                        </div>
                    </div>

                    {/* City Header Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {(['city_a', 'city_b'] as const).map((key, idx) => {
                            const city = result[key];
                            const zone = city.ecbc_compliance?.climate_zone || '—';
                            const compliance = city.ecbc_compliance?.status || '—';
                            const isLower = city.predicted_eui <= (idx === 0 ? result.city_b.predicted_eui : result.city_a.predicted_eui);
                            return (
                                <motion.div
                                    key={key}
                                    initial={{ opacity: 0, scale: 0.97 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className={cn("bg-white border-2 rounded-2xl p-6 shadow-sm relative overflow-hidden",
                                        isLower ? "border-emerald-300" : "border-slate-200"
                                    )}
                                >
                                    {isLower && (
                                        <div className="absolute top-3 right-3 bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                                            <CheckCircle2 className="w-2.5 h-2.5" /> Lower EUI
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={cn("w-3 h-3 rounded-full", idx === 0 ? "bg-primary" : "bg-secondary")} />
                                        <h4 className="font-bold text-slate-800 text-base">{city.name}</h4>
                                    </div>
                                    <div className="text-5xl font-black text-slate-800 tracking-tight">{city.predicted_eui.toFixed(1)}</div>
                                    <div className="text-xs font-bold text-slate-400 mt-1">kWh/m²·yr</div>

                                    <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-100">
                                        <div>
                                            <div className="text-[9px] font-black text-slate-400 uppercase">CO₂</div>
                                            <div className="text-sm font-bold text-slate-700">{city.co2_intensity_kg_m2_yr.toFixed(1)}</div>
                                            <div className="text-[9px] text-slate-400">kg/m²·yr</div>
                                        </div>
                                        <div>
                                            <div className="text-[9px] font-black text-slate-400 uppercase">CDD</div>
                                            <div className="text-sm font-bold text-slate-700">{(city.climate_summary?.cdd || 0).toFixed(0)}</div>
                                            <div className="text-[9px] text-slate-400">base 18.3°C</div>
                                        </div>
                                        <div>
                                            <div className="text-[9px] font-black text-slate-400 uppercase">GHI</div>
                                            <div className="text-sm font-bold text-slate-700">{(city.climate_summary?.annual_solrad || 0).toFixed(2)}</div>
                                            <div className="text-[9px] text-slate-400">kWh/m²·day</div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mt-4">
                                        <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full border", ZONE_COLOR[zone] || 'bg-slate-100 text-slate-500 border-slate-200')}>{zone}</span>
                                        <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full border", COMPLIANCE_COLOR[compliance] || 'bg-slate-100 text-slate-500 border-slate-200')}>{compliance}</span>
                                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full border bg-slate-100 text-slate-500 border-slate-200">PMV: {city.thermal_comfort?.label || '—'}</span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* KPI Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        <KpiCard label="Predicted EUI" a={result.city_a.predicted_eui} b={result.city_b.predicted_eui} unit="kWh/m²·yr" />
                        <KpiCard label="CO₂ Intensity" a={result.city_a.co2_intensity_kg_m2_yr} b={result.city_b.co2_intensity_kg_m2_yr} unit="kg CO₂/m²·yr" />
                        <KpiCard label="Savings vs Baseline" a={result.city_a.annual_savings_inr} b={result.city_b.annual_savings_inr} unit="₹/yr" invert={true} format={(v) => `₹${(v/1000).toFixed(0)}K`} />
                        <KpiCard label="Cooling Degree Days" a={result.city_a.climate_summary?.cdd || 0} b={result.city_b.climate_summary?.cdd || 0} unit="CDD" format={(v) => v.toFixed(0)} />
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Bar Chart */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <h4 className="text-sm font-bold text-slate-800 mb-1">EUI & CO₂ Side-by-Side</h4>
                            <p className="text-[10px] text-slate-400 mb-5">Grouped bar — same building, two climate conditions</p>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                    <XAxis dataKey="metric" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <RechartsTooltip
                                        contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px' }}
                                        formatter={(val: any, name: any) => [`${Number(val).toFixed(1)}`, name === 'a' ? cityA.split(',')[0] : cityB.split(',')[0]]}
                                    />
                                    <Legend formatter={(v) => v === 'a' ? cityA.split(',')[0] : cityB.split(',')[0]} />
                                    <Bar dataKey="a" fill="#042642" name="a" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="b" fill="#7EB281" name="b" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Radar Chart */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <h4 className="text-sm font-bold text-slate-800 mb-1">Multi-Metric Radar</h4>
                            <p className="text-[10px] text-slate-400 mb-5">Higher = more energy/heat demand (normalised 0–100)</p>
                            <ResponsiveContainer width="100%" height={220}>
                                <RadarChart data={radarData}>
                                    <PolarGrid stroke="#e2e8f0" />
                                    <PolarAngleAxis dataKey="metric" tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8, fill: '#94a3b8' }} />
                                    <Radar name={cityA.split(',')[0]} dataKey="A" stroke="#042642" fill="#042642" fillOpacity={0.15} strokeWidth={2} />
                                    <Radar name={cityB.split(',')[0]} dataKey="B" stroke="#7EB281" fill="#7EB281" fillOpacity={0.15} strokeWidth={2} />
                                    <Legend formatter={(v) => v} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Detailed Research Comparison Table */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-x-auto">
                        <div className="flex items-center gap-2 mb-5">
                            <Calculator className="w-4 h-4 text-primary" />
                            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Detailed Research Comparison Table</h4>
                            <span className="citation-badge ml-auto">ECBC 2017 · BEE (2020) · CEA (2022)</span>
                        </div>
                        <table className="w-full text-xs border-collapse min-w-[600px]">
                            <thead>
                                <tr className="border-b-2 border-slate-200">
                                    <th className="text-left py-3 px-3 text-[10px] font-black text-slate-400 uppercase">Metric</th>
                                    <th className="text-center py-3 px-3 text-[10px] font-black text-primary uppercase">{cityA.split(',')[0]}</th>
                                    <th className="text-center py-3 px-3 text-[10px] font-black text-secondary uppercase">{cityB.split(',')[0]}</th>
                                    <th className="text-center py-3 px-3 text-[10px] font-black text-slate-400 uppercase">Δ (A − B)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {[
                                    { metric: 'Predicted EUI (kWh/m²·yr)', a: result.city_a.predicted_eui, b: result.city_b.predicted_eui, fmt: (v: number) => v.toFixed(1), lowerIsBetter: true },
                                    { metric: 'Baseline EUI (kWh/m²·yr)', a: result.city_a.baseline_eui, b: result.city_b.baseline_eui, fmt: (v: number) => v.toFixed(1), lowerIsBetter: true },
                                    { metric: 'EUI % of Baseline (%)', a: (result.city_a.predicted_eui / result.city_a.baseline_eui) * 100, b: (result.city_b.predicted_eui / result.city_b.baseline_eui) * 100, fmt: (v: number) => v.toFixed(1) + '%', lowerIsBetter: true },
                                    { metric: 'CO₂ Intensity (kg CO₂/m²·yr)', a: result.city_a.co2_intensity_kg_m2_yr, b: result.city_b.co2_intensity_kg_m2_yr, fmt: (v: number) => v.toFixed(1), lowerIsBetter: true },
                                    { metric: 'Total Annual CO₂ (t CO₂/yr)', a: result.city_a.co2_total_tonnes_yr, b: result.city_b.co2_total_tonnes_yr, fmt: (v: number) => v.toFixed(2), lowerIsBetter: true },
                                    { metric: 'Annual Savings vs Baseline (₹)', a: result.city_a.annual_savings_inr, b: result.city_b.annual_savings_inr, fmt: (v: number) => `₹${(v/1000).toFixed(0)}K`, lowerIsBetter: false },
                                    { metric: 'Mean Annual Temperature (°C)', a: result.city_a.climate_summary?.annual_mean_temp || 0, b: result.city_b.climate_summary?.annual_mean_temp || 0, fmt: (v: number) => v.toFixed(1), lowerIsBetter: null },
                                    { metric: 'Cooling Degree Days (base 18.3°C)', a: result.city_a.climate_summary?.cdd || 0, b: result.city_b.climate_summary?.cdd || 0, fmt: (v: number) => v.toFixed(0), lowerIsBetter: null },
                                    { metric: 'Heating Degree Days (base 18.3°C)', a: result.city_a.climate_summary?.hdd || 0, b: result.city_b.climate_summary?.hdd || 0, fmt: (v: number) => v.toFixed(0), lowerIsBetter: null },
                                    { metric: 'GHI (kWh/m²/day)', a: result.city_a.climate_summary?.annual_solrad || 0, b: result.city_b.climate_summary?.annual_solrad || 0, fmt: (v: number) => v.toFixed(2), lowerIsBetter: null },
                                ].map(({ metric, a, b, fmt, lowerIsBetter }, i) => {
                                    const diff = a - b;
                                    const aWins = lowerIsBetter === null ? false : lowerIsBetter ? a < b : a > b;
                                    const bWins = lowerIsBetter === null ? false : lowerIsBetter ? b < a : b > a;
                                    return (
                                        <tr key={i} className="hover:bg-slate-50">
                                            <td className="py-3 px-3 font-semibold text-slate-600">{metric}</td>
                                            <td className={cn("py-3 px-3 text-center font-bold", aWins ? "text-emerald-600" : "text-slate-800")}>{fmt(a)}</td>
                                            <td className={cn("py-3 px-3 text-center font-bold", bWins ? "text-emerald-600" : "text-slate-800")}>{fmt(b)}</td>
                                            <td className={cn("py-3 px-3 text-center font-mono text-[11px]",
                                                lowerIsBetter === null ? "text-slate-400" :
                                                diff < 0 ? (lowerIsBetter ? "text-emerald-600 font-bold" : "text-rose-500") :
                                                diff > 0 ? (lowerIsBetter ? "text-rose-500" : "text-emerald-600 font-bold") : "text-slate-400"
                                            )}>
                                                {diff === 0 ? '—' : `${diff > 0 ? '+' : ''}${fmt(diff).replace('₹', '').replace('%', '')}`}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {/* String rows */}
                                {[
                                    { metric: 'ECBC Climate Zone', a: result.delta.climate_zone_a, b: result.delta.climate_zone_b },
                                    { metric: 'ECBC Compliance Tier', a: result.city_a.ecbc_compliance?.status || '—', b: result.city_b.ecbc_compliance?.status || '—' },
                                    { metric: 'Thermal Comfort (PMV proxy*)', a: result.city_a.thermal_comfort?.label || '—', b: result.city_b.thermal_comfort?.label || '—' },
                                    { metric: 'Wall Material (default)', a: result.city_a.material_sources?.wall?.name || '—', b: result.city_b.material_sources?.wall?.name || '—' },
                                ].map(({ metric, a, b }, i) => (
                                    <tr key={`s${i}`} className="hover:bg-slate-50">
                                        <td className="py-3 px-3 font-semibold text-slate-600">{metric}</td>
                                        <td className="py-3 px-3 text-center text-slate-700">{a}</td>
                                        <td className="py-3 px-3 text-center text-slate-700">{b}</td>
                                        <td className="py-3 px-3 text-center text-slate-400">—</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <p className="text-[9px] text-slate-400 mt-4 italic">
                            *PMV values are envelope-based thermal stress proxies, not full ISO 7730:2005 calculations.
                            Full PMV requires 6 microclimate inputs (air temperature, MRT, humidity, air velocity, clo, met).
                            Ref: ISO 7730:2005; ASHRAE 55-2023 §6.2.
                        </p>
                    </div>

                    {/* Climate zone comparison — research insight box */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {(['city_a', 'city_b'] as const).map((key, idx) => {
                            const city = result[key];
                            const comp = city.ecbc_compliance;
                            const sens = city.sensitivity_analysis;
                            return (
                                <div key={key} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("w-2 h-2 rounded-full", idx === 0 ? "bg-primary" : "bg-secondary")} />
                                        <h5 className="font-bold text-slate-800">{city.name.split(',')[0]} — Analysis</h5>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                            <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Climate Zone</div>
                                            <div className={cn("font-bold text-xs px-2 py-0.5 rounded-full border inline-block mt-1", ZONE_COLOR[comp?.climate_zone] || 'bg-slate-100 text-slate-600 border-slate-200')}>
                                                {comp?.climate_zone || '—'}
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                            <div className="text-[9px] font-black text-slate-400 uppercase mb-1">ECBC Tier</div>
                                            <div className={cn("font-bold text-xs px-2 py-0.5 rounded-full border inline-block mt-1", COMPLIANCE_COLOR[comp?.status] || 'bg-slate-100 text-slate-600 border-slate-200')}>
                                                {comp?.status || '—'}
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                            <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Top Sensitivity</div>
                                            <div className="font-bold text-slate-700 mt-1">
                                                {sens ? Object.entries(sens).sort((a: any, b: any) => b[1].relative_importance - a[1].relative_importance)[0]?.[0]?.replace('_', ' ') || '—' : '—'}
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                            <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Annual CO₂ (building)</div>
                                            <div className="font-bold text-slate-700 mt-1">{city.co2_total_tonnes_yr?.toFixed(1)} t CO₂/yr</div>
                                        </div>
                                    </div>
                                    {/* Best material recommendation */}
                                    {city.top_material_recommendations?.[0] && (
                                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                                            <div className="text-[9px] font-black text-primary uppercase mb-2">Optimal Material Strategy</div>
                                            <div className="text-xs font-semibold text-slate-700">{city.top_material_recommendations[0].wall}</div>
                                            <div className="text-xs text-slate-500">{city.top_material_recommendations[0].roof}</div>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                                    EUI: {city.top_material_recommendations[0].predicted_eui?.toFixed(1)} kWh/m²·yr
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Research note */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex items-start gap-4">
                        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div className="space-y-2">
                            <div className="text-sm font-bold text-slate-800">Research Methodology Note</div>
                            <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
                                Both simulations use identical building configurations (same archetype, floor area, envelope, HVAC, occupancy schedule).
                                Climate data is fetched live from <strong>NASA POWER Climatology API</strong> for each city's coordinates.
                                EUI is predicted by an <strong>{modelType}</strong> surrogate model trained on 25,015 physics-calibrated samples
                                (ISO 13790:2008, ASHRAE 90.1-2019) + 15 published BEE/IGBC/TERI benchmarks, then post-processed
                                by the hybrid physics engine (schedule scaling, plug loads, occupant metabolic heat per ISO 7730:2005).
                                CO₂ conversion uses CEA (2022) India grid emission factor: 0.82 kgCO₂/kWh.
                                ECBC compliance evaluated against BEE ECBC 2017 Tables 5.3–5.5.
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {['NASA POWER API', 'ISO 13790:2008', 'ASHRAE 90.1-2019', 'BEE ECBC 2017', 'CEA 2022', 'ISO 7730:2005'].map(s => (
                                    <span key={s} className="citation-badge">{s}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
}
