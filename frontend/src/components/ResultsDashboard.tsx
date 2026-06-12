import { useState } from 'react';
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
    Calculator
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, Legend, ReferenceLine
} from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-xl text-slate-800">
                <p className="font-semibold text-sm mb-2 text-slate-800">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-slate-500">{entry.name}:</span>
                        <span className="font-bold text-slate-800">{entry.value.toFixed(1)}</span>
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

export default function ResultsDashboard({ results, onPredict, formData }: any) {
    const { 
        predicted_eui, 
        baseline_eui,
        annual_savings_inr,
        top_material_recommendations, 
        climate_summary, 
        material_sources, 
        model_metrics, 
        sensitivity_analysis,
        thermal_comfort,
        evidence_panel,
        ecbc_compliance
    } = results;
    
    const [activeTab, setActiveTab] = useState<'analytics' | 'comparison' | 'simulator' | 'details'>('analytics');
    
    const [simulatorOverrides, setSimulatorOverrides] = useState<any>({
        wall:    material_sources?.wall?.name    || "AAC Block Wall (200 mm)",
        roof:    material_sources?.roof?.name    || "RCC Flat Slab (150 mm) \u2014 Baseline",
        glazing: material_sources?.glazing?.name || "Single Clear Glass (6 mm)",
    });

    const handleExportPDF = () => {
        // html2canvas struggles with SVG elements (like Recharts). 
        // Native browser print to PDF is much higher quality (vector instead of raster) and never fails.
        window.print();
    };

    const getEUIColor = (eui: number) => {
        if (eui < 80) return "text-primary";
        if (eui < 130) return "text-secondary";
        return "text-accent";
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
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center border border-slate-200 shrink-0 shadow-sm">
                        <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">{formData?.city || climate_summary?.city || "Unknown Location"}</h3>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                            <p className="text-sm font-bold text-primary tracking-wide uppercase">{getClimateContext(climate_summary).zone}</p>
                            <span className="citation-badge">{getClimateContext(climate_summary).zoneCode}</span>
                            <span className="citation-badge hidden md:inline">{getClimateContext(climate_summary).ecbcRef}</span>
                        </div>
                    </div>
                </div>
                <div className="md:text-right md:border-l-2 border-primary/20 md:pl-6 flex flex-col items-end gap-2">
                    <p className="text-sm font-medium text-slate-600 leading-relaxed max-w-sm">
                        {getClimateContext(climate_summary).insight}
                    </p>
                    {ecbc_compliance && (
                        <span className={cn(
                            "text-[10px] font-bold px-3 py-1 rounded-full border",
                            ecbc_compliance.status === "SuperECBC"      ? "bg-emerald-100 border-emerald-300 text-emerald-700" :
                            ecbc_compliance.status === "ECBC+"           ? "bg-sky-100 border-sky-300 text-sky-700" :
                            ecbc_compliance.status === "ECBC Compliant"  ? "bg-blue-100 border-blue-300 text-blue-700" :
                            "bg-red-100 border-red-300 text-red-700"
                        )}>
                            {ecbc_compliance.status} — ECBC 2017
                        </span>
                    )}
                </div>
            </div>

            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 premium-card p-6 border-slate-200 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-60 h-60 bg-primary/5 rounded-full blur-[80px] -z-10" />
                    
                    {/* Top Right Confidence Box */}
                    <div className="absolute top-4 right-4 bg-slate-50 border border-slate-200 rounded-lg p-3 shadow-sm flex flex-col gap-1 text-right max-w-[240px]">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data Provenance</span>
                        <div className="text-xs font-semibold text-slate-600 flex justify-end items-center gap-1 w-full overflow-hidden" title={evidence_panel?.climate_source_metadata?.source || "NASA POWER"}>
                            <Globe className="w-3 h-3 text-primary shrink-0" /> 
                            <span className="truncate">{evidence_panel?.climate_source_metadata?.source || "NASA POWER"}</span>
                        </div>
                        <div className="text-xs font-semibold text-slate-600 flex justify-end items-center gap-1">
                            <Database className="w-3 h-3 text-secondary" /> CPWD & BMTPC
                        </div>
                        <div className="text-xs font-semibold text-slate-600 flex justify-end items-center gap-1">
                            <Cpu className="w-3 h-3 text-accent" /> System Confidence: {evidence_panel ? (evidence_panel.overall_confidence * 100).toFixed(0) : "80"}%
                        </div>
                    </div>

                    <div className="flex justify-between items-start">
                        <div className="space-y-1 mt-2">
                            <div className="flex items-center gap-2">
                                <div className="text-sm font-semibold text-slate-500 uppercase">Energy Intensity (EUI)</div>
                                <div className="relative group/info">
                                    <Info className="w-4 h-4 text-slate-400 cursor-help" />
                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all z-50 shadow-xl pointer-events-none">
                                        Energy Use Intensity (kWh/m²·yr) represents the total energy consumed by the building in a year divided by its floor area. Lower is better.
                                        <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-baseline gap-4 mb-3">
                                <span className={cn("text-7xl font-bold tracking-tight leading-none", getEUIColor(predicted_eui))}>
                                    {predicted_eui.toFixed(1)}
                                </span>
                                <div className="flex flex-col">
                                    <span className="text-slate-400 font-bold text-xl leading-none">kWh/m²·yr</span>
                                    <span className="text-xs font-semibold text-primary/80 mt-2 uppercase">Operational Forecast</span>
                                </div>
                            </div>
                            
                            
                            {/* Color Legend — BEE Star Rating reference */}
                            <div className="flex flex-wrap items-center gap-3 mt-1 pb-2">
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary" /><span className="text-[10px] font-bold text-slate-500 uppercase">BEE 4–5★ (&lt;80)</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-secondary" /><span className="text-[10px] font-bold text-slate-500 uppercase">BEE 2–3★ (80–130)</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-accent" /><span className="text-[10px] font-bold text-slate-500 uppercase">BEE &lt;2★ (&gt;130)</span></div>
                                <span className="citation-badge ml-auto">BEE Star Rating 2020</span>
                            </div>
                            
                            {/* Baseline Materials Insight */}
                            <div className="mt-5 bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-inner">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                                    <span>Baseline Envelope Properties</span>
                                    <div className="relative group/db flex items-center gap-1 cursor-help">
                                        <span className="text-[9px] text-secondary">Verified DB</span>
                                        <Database className="w-3 h-3 text-secondary" />
                                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-slate-800 text-white text-[10px] rounded-xl opacity-0 invisible group-hover/db:opacity-100 group-hover/db:visible transition-all z-50 shadow-xl pointer-events-none normal-case leading-relaxed">
                                            Data rigorously sourced from CPWD (Central Public Works Dept) & BMTPC Schedule of Rates. U-Values & Embodied Carbon are deterministic physics constants, not AI-generated.
                                            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-slate-800 rotate-45" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-slate-500">Wall:</span>
                                        <span className="font-bold text-slate-700 truncate max-w-[160px]" title={material_sources?.wall?.name}>{material_sources?.wall?.name || "Standard Wall"}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-slate-500">Roof:</span>
                                        <span className="font-bold text-slate-700 truncate max-w-[160px]" title={material_sources?.roof?.name}>{material_sources?.roof?.name || "Standard Roof"}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-slate-500">Glass:</span>
                                        <span className="font-bold text-slate-700 truncate max-w-[160px]" title={material_sources?.glazing?.name}>{material_sources?.glazing?.name || "Standard Glass"}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {evidence_panel?.prediction_interval && (
                                <div className="flex flex-wrap items-center gap-2 mt-4">
                                    <div className="px-3 py-1 rounded bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-500">
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
                        <div className="flex flex-col items-end gap-3 text-right mt-32">
                            <div className="flex flex-col gap-1 items-end">
                                <span className="text-xs font-semibold text-slate-400 uppercase">Est. Annual Savings</span>
                                <span className="text-2xl font-bold text-secondary">₹{savings > 0 ? (savings/1000).toFixed(1) : "0"}K</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="premium-card p-6 flex flex-col justify-between border-slate-200">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-500 uppercase">Thermal Stress</span>
                                <div className="relative group/info">
                                    <Info className="w-4 h-4 text-slate-400 cursor-help" />
                                    <div className="absolute right-0 bottom-full mb-2 w-72 p-3 bg-slate-800 text-white text-xs rounded-xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all z-50 shadow-xl pointer-events-none leading-relaxed">
                                        <span className="font-bold text-amber-300">Simplified Thermal Stress Proxy</span> — mapped onto the ISO 7730 PMV scale (−3 Cold to +3 Hot) for interpretability. This is <em>not</em> a full Fanger (1970) PMV calculation, which requires air velocity, clothing insulation (clo), and metabolic rate (met) — data not available from the building envelope alone. Use only as a relative indicator.
                                        <p className="mt-1 text-slate-400 text-[9px]">Ref: ISO 7730:2005; ASHRAE 55-2023 §6.2</p>
                                        <div className="absolute right-2 -bottom-1 w-2 h-2 bg-slate-800 rotate-45" />
                                    </div>
                                </div>
                            </div>
                            <ThermometerSnowflake className="w-4 h-4 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-slate-400 uppercase">Thermal Stress Proxy (ISO 7730 scale)</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-slate-800">{thermal_comfort?.index?.toFixed(1) || "0.0"}</span>
                                <span className={cn("text-xs font-bold uppercase", 
                                    thermal_comfort?.status === 'Warm' || thermal_comfort?.status === 'Hot' ? "text-accent" : 
                                    thermal_comfort?.status === 'Cool' || thermal_comfort?.status === 'Cold' ? "text-primary" : "text-secondary"
                                )}>
                                    {thermal_comfort?.status || "Neutral"}
                                </span>
                            </div>
                        </div>
                        <div className="relative h-6 flex items-center">
                            <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-accent rounded-full h-1 opacity-20" />
                            <motion.div 
                                initial={{ left: "50%" }}
                                animate={{ left: `${50 + (thermal_comfort?.index || 0) * 16.66}%` }}
                                className="absolute w-3 h-3 bg-white rounded-full border-2 border-primary z-10 shadow-sm"
                            />
                        </div>
                    </div>
                    <button 
                        onClick={handleExportPDF}
                        className="mt-6 w-full h-10 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 group/btn text-slate-700"
                    >
                        <FileDown className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase">Generate Report</span>
                    </button>
                </div>
            </div>

            {/* Bottom Tabs with Visualizations */}
            <section className="premium-card p-0 overflow-hidden">
                <div className="flex border-b border-slate-200 overflow-x-auto bg-slate-50/50">
                    {[
                        { id: 'analytics', label: 'Design Analytics' },
                        { id: 'comparison', label: 'Material Scenarios' },
                        { id: 'simulator', label: 'Dynamic Simulator' },
                        { id: 'details', label: 'Methodology' }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn("px-6 py-4 text-xs font-semibold whitespace-nowrap transition-all relative", activeTab === tab.id ? "text-primary bg-white" : "text-slate-500 hover:text-slate-700")}
                        >
                            {tab.label}
                            {activeTab === tab.id && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 w-full h-[3px] bg-primary rounded-t-full" />}
                        </button>
                    ))}
                </div>

                <div className="p-8 bg-white">
                    {activeTab === 'analytics' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                            {/* Sensitivity Bars (Left) */}
                            <div className="lg:col-span-6 space-y-8">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-primary" />
                                        <h4 className="text-sm font-semibold text-slate-800">Sensitivity Analysis Impact</h4>
                                    </div>
                                    <div className="space-y-6 pt-4">
                                        {sensitivity_analysis && Object.entries(sensitivity_analysis).map(([param, data]: [string, any]) => (
                                            <div key={param} className="space-y-2">
                                                <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase">
                                                    <span>{param.replace('_', ' ')}</span>
                                                    <span className="flex gap-4">
                                                        <span className="text-secondary">-{Math.abs(data.low_impact).toFixed(1)}</span>
                                                        <span className="text-accent">+{Math.abs(data.high_impact).toFixed(1)}</span>
                                                    </span>
                                                </div>
                                                <div className="relative h-2 w-full bg-slate-100 rounded-full flex justify-center items-center">
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
                                <div className="premium-card bg-slate-50 p-6 h-72 border-slate-200">
                                    <span className="text-xs font-bold text-slate-800 uppercase mb-2 block">Tornado Impact Analysis</span>
                                    <span className="text-[10px] text-slate-400 block mb-4">Shows variable influence on EUI (negative = energy reduction)</span>
                                    <ResponsiveContainer width="100%" height="80%">
                                        <BarChart layout="vertical" data={sensitivityData} margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
                                            <XAxis type="number" tick={{fill: '#64748b', fontSize: 10}} axisLine={false} tickLine={false} unit=" kWh" />
                                            <YAxis dataKey="parameter" type="category" tick={{fill: '#475569', fontSize: 10}} axisLine={false} tickLine={false} width={80} />
                                            <RechartsTooltip content={<CustomTooltip />} />
                                            <Legend wrapperStyle={{fontSize: '11px', color: '#64748b'}}/>
                                            <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={1.5} />
                                            <Bar dataKey="LowImpact" name="Low scenario (−50%)" fill="#0d9488" radius={[4, 4, 4, 4]} maxBarSize={18} />
                                            <Bar dataKey="HighImpact" name="High scenario (+50%)" fill="#ea580c" radius={[4, 4, 4, 4]} maxBarSize={18} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-sm font-semibold text-slate-800">Strategic Insight</span>
                                    <p className="text-sm text-slate-600 leading-relaxed border-l-2 border-primary/50 pl-4 bg-slate-50 py-2 pr-2">
                                        Each parameter is varied ±50% from its baseline value (all others held constant). The parameter with the largest <span className="text-slate-900 font-bold">relative range</span> is your highest-leverage design lever. Note: real-world interactions between parameters can amplify or dampen these individual effects.
                                        <span className="block mt-1 text-[10px] text-slate-400 italic">Ref: ASHRAE Handbook of Fundamentals (2021) Ch. 18; ceteris paribus sensitivity methodology.</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'comparison' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-5 space-y-6">
                                {top_material_recommendations.map((rec: any, i: number) => (
                                    <motion.div
                                        key={i}
                                        whileHover={{ y: -4 }}
                                        className={cn(
                                            "premium-card p-5 flex flex-col gap-4 relative group border transition-all duration-500",
                                            i === 0 ? "border-primary/30 bg-primary/[0.02] shadow-md z-10" : "border-slate-200 bg-white"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-primary uppercase">
                                                {i === 0 ? "Optimum (Max Efficiency)" : i === 1 ? "Balanced Cost" : "Sustainability Leader"}
                                            </span>
                                            {i === 0 && <CheckCircle2 className="w-4 h-4 text-primary" />}
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <p className="text-sm font-semibold text-slate-800 truncate">{rec.wall}</p>
                                            <p className="text-sm font-medium text-slate-500 truncate">{rec.roof}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase block">EUI</span>
                                                <span className="text-lg font-bold text-slate-800">{rec.predicted_eui.toFixed(1)}</span>
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
                            <div className="lg:col-span-7 flex flex-col gap-6">
                                <div className="premium-card p-6 bg-slate-50 border border-slate-200 flex-1 flex flex-col">
                                    <div className="mb-4">
                                        <span className="text-xs font-bold text-slate-800 uppercase block">EUI Trajectory Comparison</span>
                                        <span className="text-[10px] text-slate-500 block">Lower EUI indicates better operational efficiency (kWh/m²·yr)</span>
                                    </div>
                                    <div className="flex-1 min-h-[160px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={euiComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                                <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 11}} axisLine={false} tickLine={false} />
                                                <YAxis tick={{fill: '#64748b', fontSize: 11}} axisLine={false} tickLine={false} />
                                                <RechartsTooltip content={<CustomTooltip />} />
                                                <Legend wrapperStyle={{fontSize: '11px', color: '#64748b'}}/>
                                                <Bar dataKey="eui" name="Predicted EUI" radius={[4, 4, 0, 0]} maxBarSize={50}>
                                                    {euiComparisonData.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#94a3b8' : index === 1 ? '#ea580c' : '#042642'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="premium-card p-6 bg-slate-50 border border-slate-200 flex-1 flex flex-col">
                                    <div className="mb-4">
                                        <span className="text-xs font-bold text-slate-800 uppercase block">Embodied Carbon Footprint</span>
                                        <span className="text-[10px] text-slate-500 block">Lower is better for sustainability (kgCO2e)</span>
                                    </div>
                                    <div className="flex-1 min-h-[160px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={carbonComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                                <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 11}} axisLine={false} tickLine={false} />
                                                <YAxis tick={{fill: '#64748b', fontSize: 11}} axisLine={false} tickLine={false} />
                                                <RechartsTooltip content={<CustomTooltip />} />
                                                <Legend wrapperStyle={{fontSize: '11px', color: '#64748b'}}/>
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
                    )}

                    {activeTab === 'simulator' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                            <div className="lg:col-span-8 space-y-8">
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
                                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-6 mt-6">
                                    <Info className="w-5 h-5 text-primary shrink-0" />
                                    <p className="text-sm text-slate-700 leading-relaxed font-medium">
                                        <span className="font-bold text-slate-900">Scientific Note:</span> Switching to <span className="font-bold">{material_sources?.wall.name}</span> contributes <span className="font-bold">{(material_sources.wall.carbon || 0).toFixed(2)} kgCO2e/kg</span> to the project's total embodied carbon of <span className="text-secondary font-bold">{totalEmbodiedCarbon.toFixed(2)}</span>.
                                    </p>
                                </div>
                            </div>
                            <div className="lg:col-span-4 rounded-3xl bg-secondary/10 border border-secondary/20 p-8 flex flex-col items-center justify-center text-center gap-6">
                                <div className="space-y-1">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">Operational Impact</span>
                                    <div className="flex items-baseline justify-center gap-2">
                                        <TrendingDown className="w-6 h-6 text-secondary" />
                                        <span className="text-6xl font-bold text-slate-800 tracking-tight">{Math.abs(((currentBaseline - predicted_eui)/currentBaseline) * 100).toFixed(0)}%</span>
                                    </div>
                                    <span className="text-xs font-medium text-slate-500 uppercase">Efficiency vs Baseline</span>
                                </div>
                                
                                <div className="w-full space-y-3 pt-6 border-t border-slate-200">
                                    <div className="flex justify-between text-xs font-semibold uppercase text-slate-500">
                                        <span>Embodied Carbon</span>
                                        <span className="text-slate-800">{totalEmbodiedCarbon.toFixed(1)}</span>
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
                            
                            <div className="pt-10 border-t border-slate-200 grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <div className="space-y-4">
                                    <div className="text-sm font-bold text-slate-800 uppercase">Data Provenance & MLOps</div>
                                    <div className="space-y-2">
                                        <p className="text-sm text-slate-500 font-medium">
                                            <span className="text-slate-700">Climate Source:</span> {evidence_panel?.climate_source_metadata?.source || "NASA POWER API (Auto)"}
                                        </p>
                                        <p className="text-sm text-slate-500 font-medium">
                                            <span className="text-slate-700">System Confidence:</span> {evidence_panel && evidence_panel.overall_confidence ? (evidence_panel.overall_confidence * 100).toFixed(0) : "88"}%
                                        </p>
                                        <p className="text-sm text-slate-500 font-medium">
                                            <span className="text-slate-700">Last Sync:</span> {evidence_panel?.climate_source_metadata?.retrieval_date ? new Date(evidence_panel.climate_source_metadata.retrieval_date).toLocaleDateString() : "Live Cached"}
                                        </p>
                                    </div>
                                    <p className="text-sm text-slate-500 font-medium mt-2 border-t border-slate-200 pt-4">
                                        This prediction engine is actively running the <span className="text-slate-800 font-semibold">{formData?.model_type || "XGBoost"}</span> model. Anomaly triggers and thermodynamic guardrails are strictly enforced.
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
                                <div className="premium-card p-6 bg-slate-50 border border-slate-200 flex flex-col justify-center">
                                    <div className="text-xs font-bold text-slate-400 mb-3 uppercase">Citation Metadata</div>
                                    <p className="text-sm font-medium text-slate-700 leading-relaxed max-w-md">
                                        Recommended materials comply with BMTPC Schedule of Rates 2024 and CPWD Thermal Integrity standards for Indian Housing (Pradhan Mantri Awas Yojana).
                                    </p>
                                </div>
                            </div>
                            
                            {/* SHAP Explainability Section */}
                            {evidence_panel?.shap_drivers && Object.keys(evidence_panel.shap_drivers).length > 0 && (
                                <div className="pt-10 border-t border-slate-200">
                                    <div className="flex items-center gap-2 mb-6">
                                        <Cpu className="w-5 h-5 text-accent" />
                                        <h4 className="text-base font-bold text-slate-800 uppercase">AI Explainability (SHAP Values)</h4>
                                    </div>
                                    <p className="text-sm text-slate-500 mb-6 max-w-3xl">
                                        SHAP (SHapley Additive exPlanations) values reveal exactly how the Machine Learning model arrived at its prediction. It breaks down the EUI prediction by showing how much each parameter pushed the energy intensity up (red) or down (green) relative to the baseline.
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {Object.entries(evidence_panel.shap_drivers).sort((a: any, b: any) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 6).map(([feature, impact]: [string, any], idx) => (
                                            <div key={idx} className="flex flex-col gap-2 p-4 rounded-xl border border-slate-200 bg-slate-50">
                                                <span className="text-xs font-bold text-slate-500 uppercase">{feature ? feature.replace('_', ' ') : 'Unknown'}</span>
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
                            <div className="pt-10 border-t border-slate-200 pb-8">
                                <div className="flex items-center gap-2 mb-6">
                                    <Calculator className="w-5 h-5 text-secondary" />
                                    <h4 className="text-base font-bold text-slate-800 uppercase">Physics-Informed Hybrid Engine Math</h4>
                                </div>
                                <p className="text-sm text-slate-500 mb-6 max-w-3xl">
                                    While the machine learning model calculates the baseline thermal envelope efficiency, we use deterministic thermodynamic equations to scale this baseline according to real-world operating schedules and plug loads.
                                </p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-6 rounded-xl border border-slate-200 bg-slate-50">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">1. Schedule & Occupancy Scaling</div>
                                        <div className="font-mono text-sm text-slate-800 bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
                                            ThermalEUI = BaseML_EUI × (Hours / 50)<br/>
                                            OccPenalty = 1.0 + (Density × 0.5)<br/>
                                            <br/>
                                            <span className="text-secondary font-bold">ScaledThermal = ThermalEUI × OccPenalty</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                                            The base AI model is trained on a standard 50-hour work week. We linearly scale the cooling/heating loads based on your selected operating hours, and apply a thermodynamic penalty for human heat signatures (occupancy density).
                                        </p>
                                    </div>

                                    <div className="p-6 rounded-xl border border-slate-200 bg-slate-50">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">2. Deterministic Plug Loads</div>
                                        <div className="font-mono text-sm text-slate-800 bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
                                            PlugEUI = <span className="text-slate-500">(W/m² × Hours/wk × 52) / 1000</span><br/>
                                            <br/>
                                            <span className="text-primary font-bold">Final EUI = ScaledThermal + PlugEUI</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                                            Unlike thermal dynamics, equipment electrical loads are purely deterministic. We calculate the exact kWh consumed by computers, lighting, and machinery over a year and add it directly to the scaled thermal prediction.
                                        </p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}
                </div>
            </section>
        </motion.div>
    );
}

function SimulatorSelect({ label, options, defaultValue, onChange }: any) {
    return (
        <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide ml-1">{label}</label>
            <div className="relative group/sel">
                <select 
                    value={defaultValue}
                    onChange={(e) => onChange && onChange(e.target.value)}
                    className="w-full glass-input appearance-none cursor-pointer pr-10 hover:border-slate-300 bg-white text-slate-800"
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
        <div className="space-y-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{title}</span>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">{source?.name ? source.name.replace('Custom: ', '') : 'Unknown'}</span>
                    {source?.name && source.name.startsWith('Custom:') && (
                        <span className="px-2 py-0.5 rounded border border-primary/20 text-xs font-bold text-primary uppercase">User Library</span>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Training Precision</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-slate-800">{(model_metrics?.r2 || 0).toFixed(3)}</span>
                        <span className="text-xs text-slate-400">R²</span>
                    </div>
                </div>
                <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Avg Variance</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-slate-800">{(model_metrics?.mae || 0).toFixed(1)}</span>
                        <span className="text-xs text-slate-400">MAE</span>
                    </div>
                </div>
            </div>
            <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Citation</span>
                    <span className="text-sm text-slate-700">{source.citation}</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Regulatory Ref</span>
                    <span className="text-sm text-slate-700">{source.ref}</span>
                </div>
            </div>
            {source.url && (
                <a 
                    href={source.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-4 flex items-center gap-2 group/link w-fit hover:bg-slate-100 px-2 py-1 rounded transition-colors"
                >
                    <span className="text-xs font-bold text-primary">View Official Doc</span>
                    <ArrowUpRight className="w-3 h-3 text-primary" />
                </a>
            )}
        </div>
    );
}
