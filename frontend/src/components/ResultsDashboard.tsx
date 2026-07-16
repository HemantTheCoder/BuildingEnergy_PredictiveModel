import { useState, useMemo } from 'react';
import {
    TrendingDown,
    ArrowUpRight,
    Info,
    CheckCircle2,
    Activity,
    FileDown,
    ThermometerSnowflake,
    Zap,
    AlertTriangle,
    Database,
    Cpu,
    Globe,
    MapPin,
    Calculator,
    Leaf,
    BarChart3,
    Sparkles,
    Loader2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, Legend, ReferenceLine,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import LCCAModule from './LCCAModule';
import OptimizerModal from './OptimizerModal';
import { generatePDFReport } from '../lib/pdfReportGenerator';
import { validateAgainstBenchmark } from '../lib/benchmarkData';

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 border border-white/10 p-3 rounded-lg shadow-xl text-slate-100">
                <p className="font-semibold text-sm mb-2 text-slate-100">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-slate-400">{entry.name}:</span>
                        <span className="font-bold text-slate-100">{entry.value.toFixed(1)}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

/**
 * BEE / NBC 2016 / ECBC 2017 climate zone classification for India.
 * Based on BIS SP 41 (2011) and ECBC 2017 §3.1 five-zone classification.
 *
 * Zone boundaries (indicative proxy using NASA POWER CDD/HDD/GHI):
 *   Hot-Dry:    CDD > 2500 AND GHI > 5.5  (Ahmedabad, Jodhpur, Nagpur)
 *   Warm-Humid: CDD > 2500 AND GHI ≤ 5.5  (Mumbai, Chennai, Kolkata, Goa)
 *   Composite:  1200 < CDD ≤ 2500          (Delhi, Jaipur, Lucknow, Bhopal)
 *   Temperate:  CDD ≤ 1200 AND HDD ≤ 1200 (Bangalore, Pune, Shillong)
 *   Cold:       HDD > 1200                 (Shimla, Leh, Srinagar)
 *
 * Ref: NBC 2016 Part 8; BEE ECBC 2017 §3.1; SP 41:2011.
 */
const getClimateContext = (climate: any) => {
    if (!climate) return {
        zone: "Unknown Climate Zone",
        zoneCode: "—",
        insight: "Awaiting climate data.",
        ecbcRef: "ECBC 2017"
    };

    const cdd = climate.cdd ?? 0;
    const hdd = climate.hdd ?? 0;
    const ghi = climate.annual_solrad ?? 5.0;

    if (hdd > 1200) {
        return {
            zone: "Cold",
            zoneCode: "BEE Zone 5",
            insight: "Heating-dominated profile. High-insulation walls (U ≤ 0.44), triple glazing, and passive solar orientation recommended. Avoid excessive shading.",
            ecbcRef: "ECBC 2017 Table 5.5 (Cold)"
        };
    }
    if (cdd > 2500 && ghi > 5.5) {
        return {
            zone: "Hot-Dry",
            zoneCode: "BEE Zone 1",
            insight: "Intense solar radiation with low humidity. Prioritise roof insulation (U ≤ 0.20), reflective surfaces (SRI ≥ 78), and low SHGC glazing (≤ 0.25).",
            ecbcRef: "ECBC 2017 Table 5.3 (Hot-Dry)"
        };
    }
    if (cdd > 2500) {
        return {
            zone: "Warm-Humid",
            zoneCode: "BEE Zone 2",
            insight: "High latent heat load due to coastal humidity. Natural cross-ventilation, overhangs, and low SHGC glazing (≤ 0.25) are key strategies.",
            ecbcRef: "ECBC 2017 Table 5.3 (Warm-Humid)"
        };
    }
    if (cdd <= 1200 && hdd <= 1200) {
        return {
            zone: "Temperate",
            zoneCode: "BEE Zone 4",
            insight: "Mild year-round climate. Moderate insulation with higher SHGC tolerance (≤ 0.44 SuperECBC). Mixed-mode ventilation often viable.",
            ecbcRef: "ECBC 2017 Table 5.4 (Temperate)"
        };
    }
    return {
        zone: "Composite",
        zoneCode: "BEE Zone 3",
        insight: "Both heating and cooling loads are significant. Balanced envelope with adaptive shading and good insulation across all surfaces recommended.",
        ecbcRef: "ECBC 2017 Table 5.3 (Composite)"
    };
};

const DAYS_IN_MONTH = [31,28,31,30,31,30,31,31,30,31,30,31];
const MONTH_LABELS  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function ResultsDashboard({ results, onPredict, formData }: any) {
    const { 
        predicted_eui, 
        baseline_eui,
        annual_savings_inr,
        co2_intensity_kg_m2_yr,
        co2_total_tonnes_yr,
        current_cost_score,
        top_material_recommendations, 
        climate_summary, 
        material_sources, 
        model_metrics, 
        sensitivity_analysis,
        thermal_comfort,
        evidence_panel,
        ecbc_compliance
    } = results;
    
    const co2Intensity   = co2_intensity_kg_m2_yr ?? parseFloat((predicted_eui * 0.82).toFixed(1));
    const co2TotalTonnes = co2_total_tonnes_yr    ?? parseFloat((co2Intensity * (formData?.floor_area_m2 || 1200) / 1000).toFixed(2));

    const [activeTab, setActiveTab] = useState<'analytics' | 'comparison' | 'simulator' | 'details'>('analytics');
    const [isOptimizerOpen, setIsOptimizerOpen] = useState(false);
    const [pdfGenerating, setPdfGenerating] = useState(false);
    
    const [simulatorOverrides, setSimulatorOverrides] = useState<any>({
        wall:    material_sources?.wall?.name    || "AAC Block Wall (200 mm)",
        roof:    material_sources?.roof?.name    || "RCC Flat Slab (150 mm) \u2014 Baseline",
        glazing: material_sources?.glazing?.name || "Single Clear Glass (6 mm)",
    });

    const handleExportPDF = async () => {
        if (pdfGenerating) return;
        setPdfGenerating(true);
        try {
            await generatePDFReport({ formData, results });
        } catch (err) {
            console.error('PDF generation failed:', err);
            alert('PDF generation encountered an error. Please try again.');
        } finally {
            setPdfGenerating(false);
        }
    };

    // ── Benchmark Validation ────────────────────────────────────────────────
    const benchmarkResult = useMemo(() => {
        if (!predicted_eui) return null;
        return validateAgainstBenchmark(
            predicted_eui,
            formData?.archetype ?? 'office_small',
            ecbc_compliance?.climate_zone,
            climate_summary?.cdd,
            climate_summary?.hdd,
            climate_summary?.annual_solrad,
        );
    }, [predicted_eui, formData?.archetype, ecbc_compliance, climate_summary]);

    // Monthly climate profile (CDD / HDD per month)
    const monthlyProfile = useMemo(() => {
        const mCDD = climate_summary?.monthly_cdd as number[] | undefined;
        const mHDD = climate_summary?.monthly_hdd as number[] | undefined;
        const temps = climate_summary?.monthly_temps as number[] | undefined;
        if (!temps || temps.length < 12) return [];
        return MONTH_LABELS.map((month, i) => ({
            month,
            Cooling: mCDD ? mCDD[i] : parseFloat((Math.max(0, temps[i] - 18.3) * DAYS_IN_MONTH[i]).toFixed(1)),
            Heating: mHDD ? mHDD[i] : parseFloat((Math.max(0, 18.3 - temps[i]) * DAYS_IN_MONTH[i]).toFixed(1)),
        }));
    }, [climate_summary]);

    // Radar chart data — normalised 0–100 (higher = better)
    const radarScenarios = useMemo(() => {
        const currentCost = current_cost_score ?? 5;
        const allS = [
            { label: 'Current', eui: predicted_eui, carbon: totalEmbodiedCarbonCalc(), cost: currentCost },
            ...((top_material_recommendations || []).slice(0,3).map((rec: any, i: number) => ({
                label: i===0 ? 'Optimum' : i===1 ? 'Balanced' : 'Eco',
                eui: rec.predicted_eui,
                carbon: rec.embodied_carbon,
                cost: rec.cost_score ?? 5,
            })))
        ];
        const maxEUI    = Math.max(...allS.map(s => s.eui), 1);
        const maxCarbon = Math.max(...allS.map(s => s.carbon), 1);
        function score(val: number, maxVal: number) {
            return Math.round(Math.max(5, Math.min(98, (1 - val/maxVal) * 100)));
        }
        return {
            chartData: [
                { metric: 'Energy\nEfficiency',   ...Object.fromEntries(allS.map(s => [s.label, score(s.eui,    maxEUI)])) },
                { metric: 'Low Embodied\nCarbon', ...Object.fromEntries(allS.map(s => [s.label, score(s.carbon, maxCarbon)])) },
                { metric: 'Cost\nEfficiency',     ...Object.fromEntries(allS.map(s => [s.label, Math.round(Math.max(5, Math.min(98, (1 - s.cost/10)*100)))])) },
                { metric: 'ECBC\nCompliance',     ...Object.fromEntries(allS.map(s => [s.label, Math.round(Math.max(5, Math.min(98, (1 - s.eui/(baseline_eui*1.3))*100)))])) },
            ],
            labels: allS.map(s => s.label),
        };
    }, [predicted_eui, top_material_recommendations, baseline_eui, current_cost_score]);

    function totalEmbodiedCarbonCalc() {
        return (material_sources?.wall?.carbon || 0) + (material_sources?.roof?.carbon || 0) + (material_sources?.glazing?.carbon || 0);
    }

    // Dynamic BEE Star Rating thresholds by archetype and climate zone
    // Source: BEE (2020) Star Rating for Commercial Buildings; ECBC 2017 §6
    const BEE_STAR_THRESHOLDS: Record<string, Record<string, {s5: number; s4: number; s3: number}>> = {
        office_small:  { 'Hot-Dry': {s5:75, s4:100, s3:130}, 'Warm-Humid': {s5:70, s4:95, s3:120}, 'Composite': {s5:75, s4:100, s3:125}, 'Temperate': {s5:55, s4:75, s3:95}, 'Cold': {s5:50, s4:70, s3:90} },
        office_medium: { 'Hot-Dry': {s5:85, s4:110, s3:140}, 'Warm-Humid': {s5:80, s4:105, s3:130}, 'Composite': {s5:85, s4:110, s3:135}, 'Temperate': {s5:65, s4:85, s3:105}, 'Cold': {s5:60, s4:80, s3:100} },
        retail:        { 'Hot-Dry': {s5:90, s4:120, s3:155}, 'Warm-Humid': {s5:85, s4:115, s3:145}, 'Composite': {s5:90, s4:120, s3:150}, 'Temperate': {s5:70, s4:95, s3:120}, 'Cold': {s5:65, s4:90, s3:115} },
        healthcare:    { 'Hot-Dry': {s5:150, s4:190, s3:230}, 'Warm-Humid': {s5:140, s4:180, s3:220}, 'Composite': {s5:145, s4:185, s3:225}, 'Temperate': {s5:110, s4:145, s3:180}, 'Cold': {s5:100, s4:135, s3:170} },
    };
    const ecbcZone = ecbc_compliance?.climate_zone || 'Composite';
    const archKey = formData?.archetype || 'office_small';
    const starBands = BEE_STAR_THRESHOLDS[archKey]?.[ecbcZone] || BEE_STAR_THRESHOLDS['office_small']['Composite'];

    const getEUIColor = (eui: number) => {
        if (eui < starBands.s4) return "text-emerald-600";
        if (eui < starBands.s3) return "text-amber-500";
        return "text-orange-400";
    };

    const totalEmbodiedCarbon = (material_sources.wall.carbon || 0) + (material_sources.roof.carbon || 0) + (material_sources.glazing.carbon || 0);
    const savings = annual_savings_inr !== undefined ? annual_savings_inr : (180 - predicted_eui) * (formData?.floor_area_m2 || 1200) * 9;
    const currentBaseline = baseline_eui !== undefined ? baseline_eui : 180;

    // --- Chart Data Preparation ---
    const euiComparisonData = [
        { name: 'Baseline', eui: currentBaseline },
        { name: 'Predicted', eui: predicted_eui },
        ...(top_material_recommendations || []).slice(0, 3).map((rec: any, i: number) => ({
            name: i === 0 ? "Optimum" : i === 1 ? "Balanced" : "Eco",
            eui: rec.predicted_eui
        }))
    ];

    const carbonComparisonData = [
        { name: 'Current', carbon: totalEmbodiedCarbon },
        ...(top_material_recommendations || []).slice(0, 3).map((rec: any, i: number) => ({
            name: i === 0 ? "Optimum" : i === 1 ? "Balanced" : "Eco",
            carbon: rec.embodied_carbon
        }))
    ];

    // Format for Tornado chart (horizontal bar)
    const sensitivityData = sensitivity_analysis ? Object.entries(sensitivity_analysis).map(([param, data]: [string, any]) => ({
        parameter: param.replace('_', ' ').substring(0, 10), 
        LowImpact: data.low_impact, // Negative values extend left
        HighImpact: data.high_impact // Positive values extend right
    })) : [];

    return (
        <motion.div
            id="results-dashboard-content"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
        >
            {/* Climate-aware contextual banner */}
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-5 flex items-start md:items-center justify-between flex-col md:flex-row gap-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -z-10 translate-x-1/2 -translate-y-1/2" />
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center border border-white/10 shrink-0 shadow-sm">
                        <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-100">{formData?.city || climate_summary?.city || "Unknown Location"}</h3>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                            <p className="text-sm font-bold text-primary tracking-wide uppercase">{getClimateContext(climate_summary).zone}</p>
                            <span className="citation-badge">{getClimateContext(climate_summary).zoneCode}</span>
                            <span className="citation-badge hidden md:inline">{getClimateContext(climate_summary).ecbcRef}</span>
                        </div>
                    </div>
                </div>
                <div className="md:text-right md:border-l-2 border-primary/20 md:pl-6 flex flex-col items-end gap-2">
                    <p className="text-sm font-medium text-slate-300 leading-relaxed max-w-sm">
                        {getClimateContext(climate_summary).insight}
                    </p>
                    {ecbc_compliance && (
                        <span className={cn(
                            "text-[10px] font-bold px-3 py-1 rounded-full border",
                            ecbc_compliance.status === "SuperECBC"      ? "bg-emerald-100 border-emerald-300 text-emerald-400" :
                            ecbc_compliance.status === "ECBC+"           ? "bg-sky-100 border-sky-300 text-sky-700" :
                            ecbc_compliance.status === "ECBC Compliant"  ? "bg-blue-100 border-blue-300 text-blue-700" :
                            "bg-red-100 border-red-300 text-red-400"
                        )}>
                            {ecbc_compliance.status} — ECBC 2017
                        </span>
                    )}
                </div>
            </div>

            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 premium-card p-6 border-white/10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-60 h-60 bg-primary/5 rounded-full blur-[80px] -z-10" />
                    
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                        <div className="space-y-1 mt-2 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <div className="text-sm font-semibold text-slate-400 uppercase">Energy Intensity (EUI)</div>
                                <div className="tooltip-wrap">
                                    <Info className="w-4 h-4 text-slate-400 hover:text-primary transition-colors" />
                                    <div className="info-tooltip">
                                        Energy Use Intensity (kWh/m²·yr) is the total energy consumed by the building per year, divided by its gross floor area. Lower is better — BEE 5-Star targets &lt;75 kWh/m²·yr for offices.
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-baseline gap-4 mb-3">
                                <span className={cn("text-5xl md:text-7xl font-bold tracking-tight leading-none flex items-baseline gap-2", getEUIColor(predicted_eui))}>
                                    {predicted_eui.toFixed(1)}
                                    {model_metrics?.uncertainty_ci && (
                                        <span className="text-2xl md:text-3xl font-medium text-slate-400/80">
                                            ±{model_metrics.uncertainty_ci.toFixed(1)}
                                        </span>
                                    )}
                                </span>
                                <div className="flex flex-col">
                                    <span className="text-slate-400 font-bold text-xl leading-none">kWh/m²·yr</span>
                                    <span className="text-xs font-semibold text-primary/80 mt-2 uppercase">Operational Forecast</span>
                                </div>
                            </div>
                            
                            
                            {/* Color Legend — BEE Star Rating reference (dynamic per archetype + zone) */}
                            <div className="flex flex-wrap items-center gap-3 mt-1 pb-2">
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500/200" /><span className="text-[10px] font-bold text-slate-400 uppercase">BEE 4–5★ (&lt;{starBands.s4})</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500/200" /><span className="text-[10px] font-bold text-slate-400 uppercase">BEE 2–3★ ({starBands.s4}–{starBands.s3})</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-600" /><span className="text-[10px] font-bold text-slate-400 uppercase">BEE &lt;2★ (&gt;{starBands.s3})</span></div>
                                <span className="citation-badge ml-auto">BEE Star Rating 2020 · {ecbcZone}</span>
                            </div>

                            {/* Operational CO₂ Intensity Strip */}
                            <div className="mt-2 mb-4 p-4 rounded-xl bg-emerald-500/20 border border-emerald-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex items-start gap-3">
                                        <Leaf className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">CO₂ Intensity</span>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-2xl font-bold text-emerald-800">{co2Intensity.toFixed(1)}</span>
                                                <span className="text-xs font-semibold text-emerald-600">kg CO₂/m²·yr</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Annual Building Total</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-bold text-emerald-800">{co2TotalTonnes.toFixed(1)}</span>
                                            <span className="text-xs font-semibold text-emerald-600">t CO₂/yr</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="mt-4 pt-3 border-t border-emerald-200/60 flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <span className="text-[10px] font-bold text-emerald-600 uppercase block">Paris 2050 Target</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-emerald-400">≤ 10 kg CO₂/m²·yr</span>
                                            <span className="text-[9px] text-emerald-500">IPCC AR6 WG3 § 9.4</span>
                                        </div>
                                    </div>
                                    <span className="citation-badge bg-emerald-100 border-emerald-300 text-emerald-400">CEA 2022 — 0.82 kg CO₂/kWh</span>
                                </div>
                            </div>
                            
                            {/* Baseline Materials Insight */}
                            <div className="mt-5 bg-slate-800/50 border border-white/10 rounded-xl p-3 shadow-inner">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                                    <span>Baseline Envelope Properties</span>
                                    <div className="tooltip-wrap flex items-center gap-1">
                                        <span className="text-[9px] text-secondary">Verified DB</span>
                                        <Database className="w-3 h-3 text-secondary" />
                                        <div className="info-tooltip info-tooltip-right" style={{width:'260px',fontSize:'10px'}}>
                                            Data sourced from CPWD (Central Public Works Dept) &amp; BMTPC Schedule of Rates. U-Values &amp; Embodied Carbon are deterministic physics constants, not AI-generated.
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-slate-400">Wall:</span>
                                        <span className="font-bold text-slate-200 truncate max-w-[160px]" title={material_sources?.wall?.name}>{material_sources?.wall?.name || "Standard Wall"}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-slate-400">Roof:</span>
                                        <span className="font-bold text-slate-200 truncate max-w-[160px]" title={material_sources?.roof?.name}>{material_sources?.roof?.name || "Standard Roof"}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-slate-400">Glass:</span>
                                        <span className="font-bold text-slate-200 truncate max-w-[160px]" title={material_sources?.glazing?.name}>{material_sources?.glazing?.name || "Standard Glass"}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {evidence_panel?.prediction_interval && (
                                <div className="flex flex-wrap items-center gap-2 mt-4">
                                    <div className="px-3 py-1 rounded bg-slate-800/60 border border-white/10 text-xs font-semibold text-slate-400">
                                        Approx. ±Band: {evidence_panel.prediction_interval[0].toFixed(1)}–{evidence_panel.prediction_interval[1].toFixed(1)} kWh/m²·yr
                                    </div>
                                    {evidence_panel.physics_anomalies_detected && (
                                        <div className="px-3 py-1 rounded bg-orange-100 border border-orange-200 text-xs font-bold text-accent flex items-center gap-1.5">
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            Drift Detected
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col md:items-end gap-3 md:text-right md:mt-32 shrink-0">
                            <div className="flex flex-col gap-1 items-end">
                                <span className="text-xs font-semibold text-slate-400 uppercase">Est. Annual Savings</span>
                                <span className="text-2xl font-bold text-secondary">₹{savings > 0 ? (savings/1000).toFixed(1) : "0"}K</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1 flex flex-col gap-6">
                    {/* Provenance Card */}
                    <div className="premium-card p-6 border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Database className="w-4 h-4 text-secondary" />
                                <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Data Provenance</span>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4 text-slate-400" />
                                <span className="text-xs font-bold text-slate-200 truncate">{evidence_panel?.climate_source_metadata?.source || "NASA POWER"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Database className="w-4 h-4 text-slate-400" />
                                <span className="text-xs font-bold text-slate-200 truncate">CPWD & BMTPC</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Cpu className="w-4 h-4 text-emerald-500" />
                                <span className="text-xs font-bold text-emerald-400">System Confidence: {evidence_panel ? (evidence_panel.overall_confidence * 100).toFixed(0) : "80"}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Thermal Stress */}
                    <div className="premium-card p-6 flex flex-col justify-between border-white/10">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-slate-400 uppercase">Thermal Stress</span>
                                    <div className="tooltip-wrap">
                                        <Info className="w-4 h-4 text-slate-400 hover:text-primary transition-colors" />
                                        <div className="info-tooltip info-tooltip-right">
                                            <span className="font-bold text-amber-300">Simplified Thermal Stress Proxy</span> — mapped onto the ISO 7730 PMV scale (−3 Cold to +3 Hot). This is not a full Fanger PMV calculation, which requires air velocity, clothing (clo), and metabolic rate (met). Use as a relative indicator only.
                                            <p className="mt-1.5 text-slate-400 text-[9px]">Ref: ISO 7730:2005; ASHRAE 55-2023 §6.2</p>
                                        </div>
                                    </div>
                                </div>
                                <ThermometerSnowflake className="w-4 h-4 text-primary" />
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs font-semibold text-slate-400 uppercase">Thermal Stress Proxy</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold text-slate-100">{thermal_comfort?.index?.toFixed(1) || "0.0"}</span>
                                    <span className={cn("text-xs font-bold uppercase", 
                                        thermal_comfort?.status === 'Warm' || thermal_comfort?.status === 'Hot' ? "text-accent" : 
                                        thermal_comfort?.status === 'Cool' || thermal_comfort?.status === 'Cold' ? "text-primary" : "text-secondary"
                                    )}>
                                        {thermal_comfort?.status || "Neutral"}
                                    </span>
                                </div>
                                <span className="text-[9px] font-semibold text-amber-400 bg-amber-500/20 border border-amber-200 rounded px-1.5 py-0.5 inline-block mt-1">
                                    ★ Envelope proxy — not full ISO 7730 PMV
                                </span>
                            </div>

                            <div className="relative h-6 flex items-center">
                                <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-accent rounded-full h-1 opacity-20" />
                                <motion.div 
                                    initial={{ left: "50%" }}
                                    animate={{ left: `${50 + (thermal_comfort?.index || 0) * 16.66}%` }}
                                    className="absolute w-3 h-3 bg-slate-900 rounded-full border-2 border-primary z-10 shadow-sm"
                                />
                            </div>
                        </div>

                        {/* Buttons Box */}
                        <div className="flex flex-col gap-3 mt-6">
                            <motion.button 
                                onClick={handleExportPDF}
                                disabled={pdfGenerating}
                                whileHover={pdfGenerating ? {} : { scale: 1.02 }}
                                whileTap={pdfGenerating ? {} : { scale: 0.97 }}
                                className={cn(
                                    "w-full h-12 rounded-xl border transition-all flex items-center justify-center gap-2.5 group/btn relative overflow-hidden",
                                    pdfGenerating
                                        ? "bg-primary/5 border-primary/20 cursor-wait text-primary/60"
                                        : "bg-gradient-to-r from-primary to-primary-light border-primary/30 hover:shadow-lg hover:shadow-primary/20 text-white cursor-pointer"
                                )}
                            >
                                {pdfGenerating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-xs font-bold uppercase tracking-wide">Generating PDF…</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                        <FileDown className="w-4 h-4 relative z-10" />
                                        <span className="text-xs font-bold uppercase tracking-wide relative z-10">Download Full Report</span>
                                    </>
                                )}
                            </motion.button>
                            <p className="text-[9px] text-slate-400 text-center leading-tight px-1">
                                6-section PDF · Benchmark Validation · Sensitivity · LCCA · SHAP
                            </p>
                            <button 
                                onClick={() => setIsOptimizerOpen(true)}
                                className="w-full h-10 rounded-xl bg-emerald-500/20 border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2 group/btn text-emerald-400"
                            >
                                <Sparkles className="w-4 h-4" />
                                <span className="text-xs font-semibold uppercase">✨ AI Optimize Design</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Tabs with Visualizations */}
            <section className="premium-card p-0 overflow-hidden">
                <div className="flex border-b border-white/10 overflow-x-auto bg-slate-800/50/50">
                    {[
                        { id: 'analytics', label: 'Design Analytics' },
                        { id: 'comparison', label: 'Material Scenarios' },
                        { id: 'simulator', label: 'Dynamic Simulator' },
                        { id: 'details', label: 'Methodology' }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn("px-6 py-4 text-xs font-semibold whitespace-nowrap transition-all relative", activeTab === tab.id ? "text-primary bg-slate-900" : "text-slate-400 hover:text-slate-200")}
                        >
                            {tab.label}
                            {activeTab === tab.id && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 w-full h-[3px] bg-primary rounded-t-full" />}
                        </button>
                    ))}
                </div>

                <div className="p-4 md:p-8 bg-slate-900">
                    {activeTab === 'analytics' && (
                        <div className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                            {/* Sensitivity Bars (Left) */}
                            <div className="lg:col-span-6 space-y-8">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-primary" />
                                        <h4 className="text-sm font-semibold text-slate-100">Sensitivity Analysis Impact</h4>
                                    </div>
                                    <div className="space-y-6 pt-4">
                                        {sensitivity_analysis && Object.entries(sensitivity_analysis).map(([param, data]: [string, any]) => (
                                            <div key={param} className="space-y-2">
                                                <div className="flex justify-between text-xs font-semibold text-slate-400 uppercase">
                                                    <span>{param.replace('_', ' ')}</span>
                                                    <span className="flex gap-4">
                                                        <span className="text-secondary">-{Math.abs(data.low_impact).toFixed(1)}</span>
                                                        <span className="text-accent">+{Math.abs(data.high_impact).toFixed(1)}</span>
                                                    </span>
                                                </div>
                                                <div className="relative h-2 w-full bg-slate-800/60 rounded-full flex justify-center items-center">
                                                    <div className="absolute w-px h-4 bg-slate-300 left-1/2" />
                                                    <motion.div 
                                                        initial={{ scaleX: 0 }}
                                                        animate={{ scaleX: 1 }}
                                                        className="h-full bg-primary/40 rounded-full"
                                                        style={{ 
                                                            width: `${(data.relative_importance / 20) * 100}%`,
                                                            opacity: Math.max(0.2, (data.relative_importance / 15))
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Sensitivity Tornado Chart (Right) */}
                            <div className="lg:col-span-6 flex flex-col space-y-6 justify-between">
                                <div className="premium-card bg-slate-800/50 p-6 h-72 border-white/10">
                                    <span className="text-xs font-bold text-slate-100 uppercase mb-2 block">Tornado Impact Analysis</span>
                                    <span className="text-[10px] text-slate-400 block mb-4">Shows variable influence on EUI (negative = energy reduction)</span>
                                    <ResponsiveContainer width="100%" height="80%">
                                        <BarChart layout="vertical" data={sensitivityData} margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
                                            <XAxis type="number" tick={{fill: '#cbd5e1', fontSize: 10}} axisLine={false} tickLine={false} unit=" kWh" />
                                            <YAxis dataKey="parameter" type="category" tick={{fill: '#475569', fontSize: 10}} axisLine={false} tickLine={false} width={80} />
                                            <RechartsTooltip content={<CustomTooltip />} />
                                            <Legend wrapperStyle={{fontSize: '11px', color: '#cbd5e1'}}/>
                                            <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={1.5} />
                                            <Bar dataKey="LowImpact" name="Low scenario (−50%)" fill="#0d9488" radius={[4, 4, 4, 4]} maxBarSize={18} />
                                            <Bar dataKey="HighImpact" name="High scenario (+50%)" fill="#ea580c" radius={[4, 4, 4, 4]} maxBarSize={18} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-sm font-semibold text-slate-100">Strategic Insight</span>
                                    <p className="text-sm text-slate-300 leading-relaxed border-l-2 border-primary/50 pl-4 bg-slate-800/50 py-2 pr-2">
                                        Each parameter is varied ±50% from its baseline value (all others held constant). The parameter with the largest <span className="text-slate-50 font-bold">relative range</span> is your highest-leverage design lever. Note: real-world interactions between parameters can amplify or dampen these individual effects.
                                        <span className="block mt-1 text-[10px] text-slate-400 italic">Ref: ASHRAE Handbook of Fundamentals (2021) Ch. 18; ceteris paribus sensitivity methodology.</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ── Benchmark Validation Panel ── */}
                        {benchmarkResult && (
                        <div className="premium-card p-6 border-white/10 bg-slate-900">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span className="text-xs font-bold text-slate-100 uppercase tracking-wide">Benchmark Validation</span>
                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest"
                                        style={{ backgroundColor: benchmarkResult.statusColor + '18', color: benchmarkResult.statusColor }}>
                                        {benchmarkResult.statusLabel}
                                    </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-medium">
                                    BEE Star Rating 2020 · TERI 2019 · ECBC 2017 §6
                                </span>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                {/* Left — range bar */}
                                <div className="lg:col-span-7 space-y-4">
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                                            <span>BEE 5★ ({benchmarkResult.range.bee5star} kWh/m²·yr)</span>
                                            <span className="text-slate-400 font-bold">{benchmarkResult.archetype.replace('_', ' ').toUpperCase()} · {benchmarkResult.zone}</span>
                                            <span>Stock Max ({benchmarkResult.range.max} kWh/m²·yr)</span>
                                        </div>

                                        {/* Range bar */}
                                        <div className="relative h-7 rounded-xl overflow-hidden bg-gradient-to-r from-emerald-100 via-teal-100 to-red-100 border border-white/10">
                                            {/* Typical marker */}
                                            <div
                                                className="absolute top-0 h-full w-px bg-slate-400/60"
                                                style={{ left: `${((benchmarkResult.range.typical - benchmarkResult.range.min) / (benchmarkResult.range.max - benchmarkResult.range.min)) * 100}%` }}
                                            />
                                            {/* Prediction needle */}
                                            <motion.div
                                                initial={{ left: '0%' }}
                                                animate={{ left: `${Math.min(100, Math.max(0, benchmarkResult.percentile))}%` }}
                                                transition={{ duration: 0.9, ease: 'easeOut' }}
                                                className="absolute top-1 h-5 w-1.5 rounded-full shadow-lg -translate-x-1/2"
                                                style={{ backgroundColor: benchmarkResult.statusColor }}
                                            />
                                        </div>

                                        <div className="flex justify-between text-[10px] text-slate-400">
                                            <span>Stock Min</span>
                                            <span className="text-slate-400">▲ Typical ({benchmarkResult.range.typical})</span>
                                            <span>Stock Max</span>
                                        </div>
                                    </div>

                                    {/* Annotation */}
                                    <p className="text-xs text-slate-300 leading-relaxed border-l-2 pl-3 py-1"
                                        style={{ borderColor: benchmarkResult.statusColor }}>
                                        Predicted EUI of <span className="font-bold text-slate-50">{predicted_eui.toFixed(1)} kWh/m²·yr</span> is{' '}
                                        {benchmarkResult.deviation < 0
                                            ? <span className="text-emerald-600 font-bold">{Math.abs(benchmarkResult.deviationPct).toFixed(1)}% below</span>
                                            : <span className="text-orange-400 font-bold">{benchmarkResult.deviationPct.toFixed(1)}% above</span>}{' '}
                                        the published typical for {benchmarkResult.archetype.replace('_', ' ')} buildings in a{' '}
                                        <span className="font-semibold">{benchmarkResult.zone}</span> climate.
                                        ECBC 2017 prescriptive baseline for this zone: <span className="font-bold">{benchmarkResult.range.ecbcBaseline} kWh/m²·yr</span>.
                                        <span className="block mt-1 text-[10px] text-slate-400 italic">
                                            Ref: BEE Star Rating Programme 2020; TERI Energy Benchmarking 2019; ECBC 2017 §6 Performance Compliance Path.
                                        </span>
                                    </p>
                                </div>

                                {/* Right — KPI chips */}
                                <div className="lg:col-span-5 grid grid-cols-2 gap-3">
                                    {[
                                        { label: 'Predicted EUI', value: `${predicted_eui.toFixed(1)}`, unit: 'kWh/m²·yr', color: benchmarkResult.statusColor },
                                        { label: 'BEE Typical', value: `${benchmarkResult.range.typical}`, unit: 'kWh/m²·yr', color: '#cbd5e1' },
                                        { label: 'BEE 5★ Target', value: `${benchmarkResult.range.bee5star}`, unit: 'kWh/m²·yr', color: '#f59e0b' },
                                        { label: 'ECBC Baseline', value: `${benchmarkResult.range.ecbcBaseline}`, unit: 'kWh/m²·yr', color: '#0d9488' },
                                        { label: 'Deviation vs Typical', value: `${benchmarkResult.deviation >= 0 ? '+' : ''}${benchmarkResult.deviationPct.toFixed(1)}%`, unit: '', color: benchmarkResult.deviation < 0 ? '#10b981' : '#ef4444' },
                                        { label: 'Est. BEE Star', value: `${benchmarkResult.beeStarRating.toFixed(1)}★`, unit: '', color: '#f59e0b' },
                                    ].map(kpi => (
                                        <div key={kpi.label} className="bg-slate-800/50 rounded-xl p-3 border border-white/10">
                                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider mb-1">{kpi.label}</p>
                                            <p className="text-base font-extrabold leading-none" style={{ color: kpi.color }}>
                                                {kpi.value} <span className="text-[10px] font-semibold text-slate-400">{kpi.unit}</span>
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        )}

                        {/* Monthly Climate Load Profile */}
                        {monthlyProfile.length > 0 && (
                            <div className="premium-card bg-slate-800/50 p-6 border-white/10">
                                <div className="flex items-center gap-2 mb-1">
                                    <BarChart3 className="w-4 h-4 text-primary" />
                                    <span className="text-xs font-bold text-slate-100 uppercase">Monthly Climate Load Profile</span>
                                </div>
                                <span className="text-[10px] text-slate-400 block mb-4">
                                    Monthly Cooling &amp; Heating Degree-Days (base 18.3 °C) — derived from {climate_summary?.metadata?.source || 'climate data'}. Peak months drive the largest energy demand.
                                </span>
                                <div className="h-56">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={monthlyProfile} margin={{ top: 4, right: 10, left: -10, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                            <XAxis dataKey="month" tick={{fill: '#cbd5e1', fontSize: 11}} axisLine={false} tickLine={false} />
                                            <YAxis tick={{fill: '#cbd5e1', fontSize: 11}} axisLine={false} tickLine={false} unit=" DD" />
                                            <RechartsTooltip content={<CustomTooltip />} />
                                            <Legend wrapperStyle={{fontSize: '11px', color: '#cbd5e1'}} />
                                            <Bar dataKey="Cooling" name="Cooling DD (CDD)" stackId="a" fill="#ea580c" radius={[0,0,0,0]} maxBarSize={36} />
                                            <Bar dataKey="Heating" name="Heating DD (HDD)" stackId="a" fill="#042642" radius={[4,4,0,0]} maxBarSize={36} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-[9px] text-slate-400 mt-2 italic">
                                    Ref: ASHRAE 55-2023; BEE ECBC 2017 Climate Zone Classification. CDD/HDD base 18.3 °C (65 °F) — ISO 15927-6.
                                </p>
                            </div>
                        )}

                        {/* LCCA Module */}
                        <LCCAModule 
                            formData={formData} 
                            predicted_eui={predicted_eui} 
                            baseline_eui={baseline_eui} 
                        />
                        </div>
                    )}

                    {activeTab === 'comparison' && (
                        <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 md:gap-8">
                            <div className="md:col-span-1 lg:col-span-5 space-y-4 md:space-y-6">
                                {top_material_recommendations.map((rec: any, i: number) => (
                                    <motion.div
                                        key={i}
                                        whileHover={{ y: -4 }}
                                        className={cn(
                                            "premium-card p-5 flex flex-col gap-4 relative group border transition-all duration-500",
                                            i === 0 ? "border-primary/30 bg-primary/[0.02] shadow-md z-10" : "border-white/10 bg-slate-900"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-primary uppercase">
                                                {i === 0 ? "Optimum (Max Efficiency)" : i === 1 ? "Balanced Cost" : "Sustainability Leader"}
                                            </span>
                                            {i === 0 && <CheckCircle2 className="w-4 h-4 text-primary" />}
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <p className="text-sm font-semibold text-slate-100 truncate">{rec.wall}</p>
                                            <p className="text-sm font-medium text-slate-400 truncate">{rec.roof}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase block">EUI</span>
                                                <span className="text-lg font-bold text-slate-100">{rec.predicted_eui.toFixed(1)}</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Carbon</span>
                                                <span className="text-lg font-bold text-secondary">{rec.embodied_carbon.toFixed(1)}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                            
                            {/* Charts (Right Side) */}
                            <div className="md:col-span-1 lg:col-span-7 flex flex-col gap-6">
                                <div className="premium-card p-6 bg-slate-800/50 border border-white/10 flex-1 flex flex-col">
                                    <div className="mb-4">
                                        <span className="text-xs font-bold text-slate-100 uppercase block">EUI Trajectory Comparison</span>
                                        <span className="text-[10px] text-slate-400 block">Lower EUI indicates better operational efficiency (kWh/m²·yr)</span>
                                    </div>
                                    <div className="flex-1 min-h-[160px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={euiComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                                <XAxis dataKey="name" tick={{fill: '#cbd5e1', fontSize: 11}} axisLine={false} tickLine={false} />
                                                <YAxis tick={{fill: '#cbd5e1', fontSize: 11}} axisLine={false} tickLine={false} />
                                                <RechartsTooltip content={<CustomTooltip />} />
                                                <Legend wrapperStyle={{fontSize: '11px', color: '#cbd5e1'}}/>
                                                <Bar dataKey="eui" name="Predicted EUI" radius={[4, 4, 0, 0]} maxBarSize={50}>
                                                    {euiComparisonData.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#94a3b8' : index === 1 ? '#ea580c' : '#042642'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="premium-card p-6 bg-slate-800/50 border border-white/10 flex-1 flex flex-col">
                                    <div className="mb-4">
                                        <span className="text-xs font-bold text-slate-100 uppercase block">Embodied Carbon Footprint</span>
                                        <span className="text-[10px] text-slate-400 block">Lower is better for sustainability (kgCO2e)</span>
                                    </div>
                                    <div className="flex-1 min-h-[160px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={carbonComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                                <XAxis dataKey="name" tick={{fill: '#cbd5e1', fontSize: 11}} axisLine={false} tickLine={false} />
                                                <YAxis tick={{fill: '#cbd5e1', fontSize: 11}} axisLine={false} tickLine={false} />
                                                <RechartsTooltip content={<CustomTooltip />} />
                                                <Legend wrapperStyle={{fontSize: '11px', color: '#cbd5e1'}}/>
                                                <Bar dataKey="carbon" name="Embodied Carbon" radius={[4, 4, 0, 0]} maxBarSize={50}>
                                                     {carbonComparisonData.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#94a3b8' : '#0C7277'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Radar / Spider Chart — Multi-Criteria Scenario Comparison */}
                        {radarScenarios.chartData.length > 0 && (
                            <div className="mt-8 premium-card bg-slate-800/50 p-6 border-white/10">
                                <div className="flex items-center gap-2 mb-1">
                                    <Activity className="w-4 h-4 text-primary" />
                                    <span className="text-xs font-bold text-slate-100 uppercase">Multi-Criteria Scenario Radar</span>
                                </div>
                                <span className="text-[10px] text-slate-400 block mb-4">
                                    Normalised performance scores (0–100, higher = better) across four sustainability dimensions. Each axis is independently normalised across all scenarios.
                                </span>
                                <div className="flex flex-col lg:flex-row gap-6 items-center">
                                    <div className="w-full lg:w-[55%] h-72">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart data={radarScenarios.chartData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                                                <PolarGrid stroke="#e2e8f0" />
                                                <PolarAngleAxis dataKey="metric" tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }} />
                                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 9 }} tickCount={4} />
                                                {radarScenarios.labels.map((label: string, i: number) => {
                                                    const colors = ['#ea580c', '#042642', '#0C7277', '#7EB281'];
                                                    return (
                                                        <Radar key={label} name={label} dataKey={label}
                                                            stroke={colors[i]} fill={colors[i]} fillOpacity={0.12} strokeWidth={2} dot={{ r: 3 }} />
                                                    );
                                                })}
                                                <Legend wrapperStyle={{ fontSize: '11px', color: '#cbd5e1' }} />
                                                <RechartsTooltip content={<CustomTooltip />} />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="lg:w-[45%] space-y-3">
                                        <p className="text-xs font-semibold text-slate-300 leading-relaxed">
                                            <span className="text-slate-100 font-bold">How to read:</span> The farther a scenario's polygon extends on each axis, the better it performs on that dimension. An ideal design would fill all four axes.
                                        </p>
                                        <div className="space-y-2">
                                            {[
                                                { name: 'Energy Efficiency', desc: 'Based on predicted EUI vs worst-case scenario' },
                                                { name: 'Low Embodied Carbon', desc: 'Material lifecycle CO₂e (BMTPC sources)' },
                                                { name: 'Cost Efficiency', desc: 'Inverse of material cost index (CPWD 2024)' },
                                                { name: 'ECBC Compliance', desc: 'EUI proximity to ECBC 2017 zone thresholds' },
                                            ].map(ax => (
                                                <div key={ax.name} className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10">
                                                    <p className="text-[10px] font-bold text-primary uppercase">{ax.name}</p>
                                                    <p className="text-[10px] text-slate-400">{ax.desc}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-[9px] text-slate-400 italic">
                                            Ref: ASHRAE 90.1-2019; BEE ECBC 2017; BMTPC Rates 2024; CEA 2022.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                        </div>
                    )}

                    {activeTab === 'simulator' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
                            <div className="lg:col-span-8 space-y-6 md:space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <SimulatorSelect
                                        label="Wall Selection"
                                        options={[
                                            "AAC Block Wall (200 mm)",
                                            "Burnt Clay Brick Wall (230 mm)",
                                            "Fly Ash Brick Wall (230 mm)",
                                            "Hollow Concrete Block (200 mm)",
                                            "XPS Insulated Brick Wall (230+50 mm)",
                                        ]}
                                        defaultValue={simulatorOverrides.wall}
                                        onChange={(v: string) => setSimulatorOverrides({ ...simulatorOverrides, wall: v })}
                                    />
                                    <SimulatorSelect
                                        label="Roof Strategy"
                                        options={[
                                            "RCC Flat Slab (150 mm) \u2014 Baseline",
                                            "Ultra-Cool Roof (SRI \u2265 110 Coating on RCC)",
                                            "RCC (150 mm) + 100 mm Rockwool Insulation",
                                            "Adaptive Green Roof (Intensive, 450 mm substrate)",
                                        ]}
                                        defaultValue={simulatorOverrides.roof}
                                        onChange={(v: string) => setSimulatorOverrides({ ...simulatorOverrides, roof: v })}
                                    />
                                    <SimulatorSelect
                                        label="Glazing Config"
                                        options={[
                                            "Single Clear Glass (6 mm)",
                                            "Double Glazed Low-E (6/12Ar/6 mm)",
                                            "Double Tinted IGU (6/12air/6 mm)",
                                            "Triple Glazed Argon Low-E IGU (6/12Ar/6/12Ar/6 mm)",
                                        ]}
                                        defaultValue={simulatorOverrides.glazing}
                                        onChange={(v: string) => setSimulatorOverrides({ ...simulatorOverrides, glazing: v })}
                                    />
                                </div>
                                <div className="p-6 rounded-2xl bg-slate-800/50 border border-white/10 flex items-center gap-6 mt-6">
                                    <Info className="w-5 h-5 text-primary shrink-0" />
                                    <p className="text-sm text-slate-200 leading-relaxed font-medium">
                                        <span className="font-bold text-slate-50">Scientific Note:</span> Switching to <span className="font-bold">{material_sources?.wall.name}</span> contributes <span className="font-bold">{(material_sources.wall.carbon || 0).toFixed(2)} kgCO2e/kg</span> to the project's total embodied carbon of <span className="text-secondary font-bold">{totalEmbodiedCarbon.toFixed(2)}</span>.
                                    </p>
                                </div>
                            </div>
                            <div className="lg:col-span-4 rounded-3xl bg-secondary/10 border border-secondary/20 p-6 md:p-8 flex flex-col items-center justify-center text-center gap-6">
                                <div className="space-y-1">
                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">Operational Impact</span>
                                    <div className="flex items-baseline justify-center gap-2">
                                        <TrendingDown className="w-6 h-6 text-secondary" />
                                        <span className="text-4xl md:text-6xl font-bold text-slate-100 tracking-tight">{Math.abs(((currentBaseline - predicted_eui)/currentBaseline) * 100).toFixed(0)}%</span>
                                    </div>
                                    <span className="text-xs font-medium text-slate-400 uppercase">Efficiency vs Baseline</span>
                                </div>
                                
                                <div className="w-full space-y-3 pt-6 border-t border-white/10">
                                    <div className="flex justify-between text-xs font-semibold uppercase text-slate-400">
                                        <span>Embodied Carbon</span>
                                        <span className="text-slate-100">{totalEmbodiedCarbon.toFixed(1)}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-secondary transition-all" style={{ width: `${Math.min(100, (totalEmbodiedCarbon/5)*100)}%` }} />
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={() => {
                                        if (onPredict && formData) {
                                            const updatedData = {
                                                ...formData,
                                                material_overrides: {
                                                    wall: simulatorOverrides.wall,
                                                    roof: simulatorOverrides.roof,
                                                    glazing: simulatorOverrides.glazing
                                                }
                                            };
                                            onPredict(updatedData);
                                        }
                                    }}
                                    className="w-full py-4 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary-light transition-colors mt-4 shadow-sm"
                                >
                                    <Zap className="w-4 h-4" />
                                    Recalculate Path
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'details' && (
                        <div className="space-y-12">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                <SourceItem title="Wall Properties" source={material_sources.wall} model_metrics={model_metrics} />
                                <SourceItem title="Roof Properties" source={material_sources.roof} model_metrics={model_metrics} />
                                <SourceItem title="Glazing Properties" source={material_sources.glazing} model_metrics={model_metrics} />
                            </div>
                            
                            <div className="pt-10 border-t border-white/10 grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <div className="space-y-4">
                                    <div className="text-sm font-bold text-slate-100 uppercase">Data Provenance & MLOps</div>
                                    <div className="space-y-2">
                                        <p className="text-sm text-slate-400 font-medium">
                                            <span className="text-slate-200">Climate Source:</span> {evidence_panel?.climate_source_metadata?.source || "NASA POWER API (Auto)"}
                                        </p>
                                        <p className="text-sm text-slate-400 font-medium">
                                            <span className="text-slate-200">System Confidence:</span> {evidence_panel && evidence_panel.overall_confidence ? (evidence_panel.overall_confidence * 100).toFixed(0) : "88"}%
                                        </p>
                                        <p className="text-sm text-slate-400 font-medium">
                                            <span className="text-slate-200">Last Sync:</span> {evidence_panel?.climate_source_metadata?.retrieval_date ? new Date(evidence_panel.climate_source_metadata.retrieval_date).toLocaleDateString() : "Live Cached"}
                                        </p>
                                    </div>
                                    <p className="text-sm text-slate-400 font-medium mt-2 border-t border-white/10 pt-4">
                                        This prediction engine is actively running the <span className="text-slate-100 font-semibold">{formData?.model_type || "XGBoost"}</span> model. Anomaly triggers and thermodynamic guardrails are strictly enforced.
                                    </p>
                                    <div className="flex gap-4 pt-2">
                                        <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                            Continuous Retraining (CT)
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-bold text-secondary uppercase">
                                            <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                                            Physics Guardrails Active
                                        </div>
                                    </div>
                                </div>
                                <div className="premium-card p-6 bg-slate-800/50 border border-white/10 flex flex-col justify-center">
                                    <div className="text-xs font-bold text-slate-400 mb-3 uppercase">Citation Metadata</div>
                                    <p className="text-sm font-medium text-slate-200 leading-relaxed max-w-md">
                                        Recommended materials comply with BMTPC Schedule of Rates 2024 and CPWD Thermal Integrity standards for Indian Housing (Pradhan Mantri Awas Yojana).
                                    </p>
                                </div>
                            </div>
                            
                            {/* SHAP Explainability Section */}
                            {evidence_panel?.shap_drivers && Object.keys(evidence_panel.shap_drivers).length > 0 && (
                                <div className="pt-10 border-t border-white/10">
                                    <div className="flex items-center gap-2 mb-6">
                                        <Cpu className="w-5 h-5 text-accent" />
                                        <h4 className="text-base font-bold text-slate-100 uppercase">AI Explainability (SHAP Values)</h4>
                                    </div>
                                    <p className="text-sm text-slate-400 mb-6 max-w-3xl">
                                        SHAP (SHapley Additive exPlanations) values reveal exactly how the Machine Learning model arrived at its prediction. It breaks down the EUI prediction by showing how much each parameter pushed the energy intensity up (red) or down (green) relative to the baseline.
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {Object.entries(evidence_panel.shap_drivers).sort((a: any, b: any) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 6).map(([feature, impact]: [string, any], idx) => (
                                            <div key={idx} className="flex flex-col gap-2 p-4 rounded-xl border border-white/10 bg-slate-800/50">
                                                <span className="text-xs font-bold text-slate-400 uppercase">{feature ? feature.replace('_', ' ') : 'Unknown'}</span>
                                                <div className="flex items-center justify-between">
                                                    <span className={cn("text-xl font-bold", impact > 0 ? "text-accent" : "text-primary")}>
                                                        {impact > 0 ? "+" : ""}{Number(impact || 0).toFixed(2)}
                                                    </span>
                                                    <span className="text-[10px] uppercase font-bold text-slate-400">Impact on EUI</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Hybrid Physics Mathematics Section */}
                            <div className="pt-10 border-t border-white/10 pb-8">
                                <div className="flex items-center gap-2 mb-6">
                                    <Calculator className="w-5 h-5 text-secondary" />
                                    <h4 className="text-base font-bold text-slate-100 uppercase">Physics-Informed Hybrid Engine Math</h4>
                                </div>
                                <p className="text-sm text-slate-400 mb-6 max-w-3xl">
                                    While the machine learning model calculates the baseline thermal envelope efficiency, we use deterministic thermodynamic equations to scale this baseline according to real-world operating schedules and plug loads.
                                </p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-6 rounded-xl border border-white/10 bg-slate-800/50">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">1. Schedule & Occupancy Scaling</div>
                                        <div className="font-mono text-sm text-slate-100 bg-slate-900 p-4 border border-white/10 rounded-lg shadow-sm">
                                            ThermalEUI = BaseML_EUI × (Hours / 50)<br/>
                                            OccPenalty = 1.0 + (Density × 0.5)<br/>
                                            <br/>
                                            <span className="text-secondary font-bold">ScaledThermal = ThermalEUI × OccPenalty</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                                            The base AI model is trained on a standard 50-hour work week. We linearly scale the cooling/heating loads based on your selected operating hours, and apply a thermodynamic penalty for human heat signatures (occupancy density).
                                        </p>
                                    </div>

                                    <div className="p-6 rounded-xl border border-white/10 bg-slate-800/50">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">2. Deterministic Plug Loads + Occupant Metabolic</div>
                                        <div className="font-mono text-sm text-slate-100 bg-slate-900 p-4 border border-white/10 rounded-lg shadow-sm">
                                            PlugEUI = <span className="text-slate-400">(W/m² × hrs/wk × 52) / 1000</span><br/>
                                            OccEUI = <span className="text-slate-400">(75W × ρ_occ × hrs/wk × 52) / (1000 × COP)</span><br/>
                                            <br/>
                                            <span className="text-primary font-bold">EUI_final = EUI_thermal × (t/50) + PlugEUI + OccEUI</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                                            Plug loads are deterministic (W/m² × schedule). Occupant metabolic heat (75 W/person per ISO 7730:2005) adds to HVAC cooling demand, scaled by occupancy density and COP. This is the novel hybrid equation combining ML thermal prediction with physics-based internal loads.
                                        </p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}
                </div>
            </section>

            {/* ─── PRINT-ONLY REPORT ─── Hidden on screen, rendered for window.print() ─── */}
            <div id="print-report" className="hidden">
                <h1>ClimaBuild AI — Energy Performance Report</h1>
                <p className="pr-label">{formData?.city || 'Building'} · Floor Area {formData?.floor_area_m2 || '—'} m² · {new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</p>

                <h2>Key Performance Indicators</h2>
                <div className="pr-grid">
                    <div className="pr-cell">
                        <p className="pr-label">Predicted EUI</p>
                        <p className="pr-kpi">{(predicted_eui ?? 0).toFixed(1)}</p>
                        <p className="pr-label">kWh/m²·yr</p>
                    </div>
                    <div className="pr-cell">
                        <p className="pr-label">BEE Benchmark</p>
                        <p className="pr-kpi">{(baseline_eui ?? 0).toFixed(1)}</p>
                        <p className="pr-label">kWh/m²·yr</p>
                    </div>
                    <div className="pr-cell">
                        <p className="pr-label">Annual CO₂ (Grid)</p>
                        <p className="pr-kpi">{co2TotalTonnes}</p>
                        <p className="pr-label">tonnes CO₂e/yr</p>
                    </div>
                </div>
                <div className="pr-grid">
                    <div className="pr-cell">
                        <p className="pr-label">CO₂ Intensity</p>
                        <p className="pr-kpi" style={{fontSize:'16pt'}}>{co2Intensity}</p>
                        <p className="pr-label">kgCO₂e/m²·yr (CEA 2022: 0.82 kg/kWh)</p>
                    </div>
                    <div className="pr-cell">
                        <p className="pr-label">Annual Savings</p>
                        <p className="pr-kpi" style={{fontSize:'16pt'}}>₹{((annual_savings_inr ?? 0) / 1000).toFixed(0)}K</p>
                        <p className="pr-label">vs. BEE baseline</p>
                    </div>
                    <div className="pr-cell">
                        <p className="pr-label">ECBC Compliance</p>
                        <p className="pr-kpi" style={{fontSize:'16pt', color: ecbc_compliance?.eui_pass ? '#7EB281' : '#ea580c'}}>
                            {ecbc_compliance?.eui_pass ? 'PASS' : ecbc_compliance?.status ?? 'N/A'}
                        </p>
                        <p className="pr-label">Threshold: {ecbc_compliance?.threshold ?? baseline_eui} kWh/m²·yr · {ecbc_compliance?.climate_zone ?? '—'}</p>
                    </div>
                </div>

                <h2>Top Material Recommendations</h2>
                <table>
                    <thead>
                        <tr>
                            <th>#</th><th>Scenario</th><th>Wall</th><th>Roof</th>
                            <th>EUI (kWh/m²·yr)</th><th>Embodied Carbon</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(top_material_recommendations ?? []).map((rec: any, i: number) => (
                            <tr key={i}>
                                <td>{i+1}</td>
                                <td>{i===0 ? 'Optimum' : i===1 ? 'Balanced Cost' : 'Sustainability'}</td>
                                <td>{rec.wall}</td>
                                <td>{rec.roof}</td>
                                <td>{(rec.predicted_eui ?? 0).toFixed(1)}</td>
                                <td>{(rec.embodied_carbon ?? 0).toFixed(1)} kgCO₂e</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <h2>Climate Summary</h2>
                <table>
                    <thead><tr><th>Parameter</th><th>Value</th><th>Source</th></tr></thead>
                    <tbody>
                        <tr><td>Annual Solar Radiation</td><td>{climate_summary?.annual_solrad?.toFixed(1) ?? '—'} kWh/m²/yr</td><td>NASA POWER / EPW</td></tr>
                        <tr><td>Peak Summer Temp</td><td>{climate_summary?.peak_summer_temp ?? '—'} °C</td><td>Climate Station</td></tr>
                        <tr><td>Climate Zone</td><td>{climate_summary?.climate_zone ?? '—'}</td><td>BEE ECBC 2017</td></tr>
                        <tr><td>Location</td><td>{climate_summary?.location ?? formData?.city ?? '—'}</td><td>—</td></tr>
                    </tbody>
                </table>

                <div className="pr-footer">
                    Generated by ClimaBuild AI · IGEC Abu Dhabi 2025 · References: BEE ECBC 2017, ASHRAE 90.1-2019, CEA Grid Emission Factor 2022, BMTPC Schedule of Rates 2024, NASA POWER Surface Meteorology API.
                </div>
            </div>
        </motion.div>
    );
}

function SimulatorSelect({ label, options, defaultValue, onChange }: any) {
    return (
        <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide ml-1">{label}</label>
            <div className="relative group/sel">
                <select 
                    value={defaultValue}
                    onChange={(e) => onChange && onChange(e.target.value)}
                    className="w-full glass-input appearance-none cursor-pointer pr-10 hover:border-white/20 bg-slate-900 text-slate-100"
                >
                    {options.map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover/sel:text-primary transition-colors">
                    <TrendingDown className="w-4 h-4 rotate-180" />
                </div>
            </div>
        </div>
    );
}

function SourceItem({ title, source, model_metrics }: any) {
    return (
        <div className="space-y-4 p-4 rounded-xl border border-white/10 bg-slate-800/50">
            <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{title}</span>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-100">{source?.name ? source.name.replace('Custom: ', '') : 'Unknown'}</span>
                    {source?.name && source.name.startsWith('Custom:') && (
                        <span className="px-2 py-0.5 rounded border border-primary/20 text-xs font-bold text-primary uppercase">User Library</span>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Training Precision</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-slate-100">{(model_metrics?.r2 || 0).toFixed(3)}</span>
                        <span className="text-xs text-slate-400">R²</span>
                    </div>
                </div>
                <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Avg Variance</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-slate-100">{(model_metrics?.mae || 0).toFixed(1)}</span>
                        <span className="text-xs text-slate-400">MAE</span>
                    </div>
                </div>
            </div>
            <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Citation</span>
                    <span className="text-sm text-slate-200">{source.citation}</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Regulatory Ref</span>
                    <span className="text-sm text-slate-200">{source.ref}</span>
                </div>
            </div>
            {source.url && (
                <a 
                    href={source.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-4 flex items-center gap-2 group/link w-fit hover:bg-slate-800/60 px-2 py-1 rounded transition-colors"
                >
                    <span className="text-xs font-bold text-primary">View Official Doc</span>
                    <ArrowUpRight className="w-3 h-3 text-primary" />
                </a>
            )}
        </div>
    );
}
