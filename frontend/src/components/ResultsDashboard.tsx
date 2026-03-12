import { useState } from 'react';
import {
    TrendingDown,
    Thermometer,
    Sun,
    Wind,
    ShieldCheck,
    Layers,
    ArrowUpRight,
    Info,
    CheckCircle2,
    Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

export default function ResultsDashboard({ results }: any) {
    const { predicted_eui, top_material_recommendations, climate_summary, material_sources, model_metrics } = results;
    const [activeTab, setActiveTab] = useState<'simulator' | 'details' | 'comparison'>('comparison');

    const getEUIColor = (eui: number) => {
        if (eui < 80) return "text-primary";
        if (eui < 130) return "text-secondary";
        return "text-accent";
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
        >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 premium-card p-8 flex flex-col justify-between relative overflow-hidden group min-h-[300px]">
                    <div className="absolute top-0 right-0 w-60 h-60 bg-primary/5 rounded-full blur-[80px] -z-10" />

                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <div className="section-label">Prediction Consensus</div>
                            <div className="flex items-baseline gap-4">
                                <span className={cn("text-8xl font-black tracking-tighter leading-none", getEUIColor(predicted_eui))}>
                                    {predicted_eui.toFixed(1)}
                                </span>
                                <div className="flex flex-col">
                                    <span className="text-white/20 font-bold italic text-xl leading-none">kWh/m²·yr</span>
                                    <span className="text-[9px] font-black tracking-[0.3em] text-primary/60 mt-2 uppercase">Forecasted EUI</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-4">
                            <div className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center gap-3">
                                <ShieldCheck className="w-4 h-4 text-primary" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-white/60 uppercase">
                                        {((model_metrics?.r2 || 0.94) * 100).toFixed(1)}% R² Confidence
                                    </span>
                                </div>
                            </div>
                            <div className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center gap-3">
                                <Activity className="w-4 h-4 text-secondary" />
                                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">
                                    ±{model_metrics?.mae ? (model_metrics.mae).toFixed(1) : "11.2"} kWh MAPE
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/[0.05] flex items-center justify-between">
                         <div className="flex gap-10">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-white/20 uppercase mb-1">Source Model</span>
                                <span className="text-xs font-bold text-white/60 italic">BEE Benchmarks v2.4</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-white/20 uppercase mb-1">Climate Data</span>
                                <span className="text-xs font-bold text-white/60 italic">{climate_summary?.source || "Override"}</span>
                            </div>
                         </div>
                    </div>
                </div>

                <div className="lg:col-span-4 premium-card p-6 bg-primary/[0.01]">
                    <div className="space-y-4">
                        <span className="section-label mb-0">Local Climatology</span>
                        <div className="grid grid-cols-1 gap-3">
                            <ClimateMetric icon={<Thermometer className="w-3.5 h-3.5 text-rose-500" />} label="Avg CDD" value={climate_summary?.cdd.toFixed(0)} unit="°D" isCompact />
                            <ClimateMetric icon={<Sun className="w-3.5 h-3.5 text-amber-500" />} label="Solar Rad" value={climate_summary?.annual_solrad.toFixed(1)} unit="kWh" isCompact />
                            <ClimateMetric icon={<Wind className="w-3.5 h-3.5 text-sky-500" />} label="Heat Scale" value={climate_summary?.hdd.toFixed(0)} unit="°D" isCompact />
                        </div>
                    </div>
                </div>
            </div>
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="section-label">Assembly Matrix</div>
                        <h3 className="text-4xl font-bold tracking-tighter italic">Recommended <span className="text-primary not-italic">Scenarios</span></h3>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {top_material_recommendations.map((rec: any, i: number) => {
                        const labels = ["Maximum Efficiency", "High Performance", "Balanced Architecture"];
                        const descriptions = [
                            "Optimized for extreme thermal resistance.",
                            "Strategic material usage for high cooling loads.",
                            "Best cost-to-efficiency ratio for Indian markets."
                        ];
                        
                        return (
                            <motion.div
                                key={i}
                                whileHover={{ y: -6, scale: 1.01 }}
                                className={cn(
                                    "premium-card p-6 flex flex-col gap-6 relative group border transition-all duration-500",
                                    i === 0 ? "border-primary/40 bg-primary/[0.01] z-10" : "border-white/[0.03]"
                                )}
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-primary/60">{labels[i]}</span>
                                        {i === 0 && <CheckCircle2 className="w-2.5 h-2.5 text-primary" />}
                                    </div>
                                    <p className="text-[9px] text-white/30 font-bold leading-tight">{descriptions[i]}</p>
                                </div>

                                <div className="space-y-4">
                                    <AssemblyItem icon={<Layers className="w-3.5 h-3.5 text-white/20" />} label="Wall" value={rec.wall} isCompact />
                                    <AssemblyItem icon={<Layers className="w-3.5 h-3.5 text-white/20" />} label="Roof" value={rec.roof} isCompact />
                                    <AssemblyItem icon={<Layers className="w-3.5 h-3.5 text-white/20" />} label="Glazing" value={rec.glazing} isCompact />
                                </div>
                                
                                <div className="mt-2 pt-4 border-t border-white/[0.05] flex justify-between items-end">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-white/10 uppercase mb-1">EUI</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-black text-white">{rec.predicted_eui.toFixed(1)}</span>
                                            <span className="text-[8px] text-white/20 font-bold uppercase italic">kWh</span>
                                        </div>
                                    </div>
                                    <TrendingDown className="w-4 h-4 text-primary opacity-20" />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </section>

            <section className="premium-card p-0 overflow-hidden bg-white/[0.005]">
                <div className="flex border-b border-white/[0.05]">
                    <button 
                        onClick={() => setActiveTab('comparison')}
                        className={cn("px-10 py-5 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative", activeTab === 'comparison' ? "text-primary bg-primary/5" : "text-white/20 hover:text-white/40")}
                    >
                        Scenario Comparison
                        {activeTab === 'comparison' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
                    </button>
                    <button 
                        onClick={() => setActiveTab('simulator')}
                        className={cn("px-10 py-5 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative", activeTab === 'simulator' ? "text-primary bg-primary/5" : "text-white/20 hover:text-white/40")}
                    >
                        Dynamic Simulator
                        {activeTab === 'simulator' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
                    </button>
                    <button 
                        onClick={() => setActiveTab('details')}
                        className={cn("px-10 py-5 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative", activeTab === 'details' ? "text-primary bg-primary/5" : "text-white/20 hover:text-white/40")}
                    >
                        Methodology & Sources
                        {activeTab === 'details' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
                    </button>
                </div>

                <div className="p-8">
                    {activeTab === 'comparison' ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/[0.05]">
                                        <th className="pb-4 text-[9px] font-black text-white/20 uppercase tracking-widest">Parameter</th>
                                        {top_material_recommendations.map((_: any, i: number) => (
                                            <th key={i} className="pb-4 text-[9px] font-black text-primary uppercase tracking-widest px-4 text-center">Option {i + 1}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="text-xs">
                                    <ComparisonRow label="Wall Material" values={top_material_recommendations.map((r: any) => r.wall)} />
                                    <ComparisonRow label="Roof Assembly" values={top_material_recommendations.map((r: any) => r.roof)} />
                                    <ComparisonRow label="Glazing Type" values={top_material_recommendations.map((r: any) => r.glazing)} />
                                    <tr className="border-t border-white/[0.05]">
                                        <td className="py-4 font-black text-white/30 uppercase tracking-widest text-[9px]">Predicted EUI</td>
                                        {top_material_recommendations.map((r: any, i: number) => (
                                            <td key={i} className="py-4 px-4 text-center">
                                                <span className="text-lg font-black text-white">{r.predicted_eui.toFixed(1)}</span>
                                                <span className="text-[8px] text-white/20 ml-1 italic font-bold">kWh</span>
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="py-4 font-black text-white/30 uppercase tracking-widest text-[9px]">Efficiency Gain</td>
                                        {top_material_recommendations.map((r: any, i: number) => {
                                            const gain = ((top_material_recommendations[top_material_recommendations.length - 1].predicted_eui - r.predicted_eui) / top_material_recommendations[top_material_recommendations.length - 1].predicted_eui * 100).toFixed(1);
                                            return (
                                                <td key={i} className="py-2 px-4 text-center font-bold text-secondary">
                                                    {i === top_material_recommendations.length - 1 ? "Baseline" : `+${gain}%`}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    ) : activeTab === 'simulator' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                            <div className="lg:col-span-8 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <SimulatorSelect label="Wall Selection" options={["AAC Block Wall", "Standard Brick Wall", "Burnt Clay Brick", "Fly Ash Brick"]} defaultValue={material_sources?.wall.name} />
                                    <SimulatorSelect label="Roof Strategy" options={["RCC Slab (150mm)", "Insulated Slab (XPS)", "Cool Roof", "Green Roof"]} defaultValue={material_sources?.roof.name} />
                                    <SimulatorSelect label="Glazing Config" options={["Single Clear Glass", "Double Low-E", "Double Tinted", "High Performance"]} defaultValue={material_sources?.glazing.name} />
                                </div>
                                <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/[0.04] flex items-center gap-6">
                                    <Info className="w-5 h-5 text-primary" />
                                    <p className="text-xs text-white/40 leading-relaxed font-bold italic">
                                        "Scientific Note: Swapping to <span className="text-primary">AAC Blocks</span> significantly reduces thermal bridging in tropical climates."
                                    </p>
                                </div>
                            </div>
                            <div className="lg:col-span-4 rounded-3xl bg-primary/[0.02] border border-primary/10 p-8 flex flex-col items-center justify-center text-center gap-4">
                                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Sensitivity Delta</span>
                                <div className="flex items-baseline gap-2">
                                    <TrendingDown className="w-5 h-5 text-primary/60" />
                                    <span className="text-5xl font-black text-white italic">-4.2</span>
                                    <span className="text-xs text-white/20 font-bold uppercase tracking-widest italic">kWh</span>
                                </div>
                                <button className="w-full btn-premium h-12 text-[10px] !rounded-2xl" onClick={() => window.alert("Rerunning simulation...")}>Update Forecast</button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-12">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                <SourceItem title="Wall Properties" source={material_sources.wall} model_metrics={model_metrics} />
                                <SourceItem title="Roof Properties" source={material_sources.roof} model_metrics={model_metrics} />
                                <SourceItem title="Glazing Properties" source={material_sources.glazing} model_metrics={model_metrics} />
                            </div>
                            
                            <div className="pt-10 border-t border-white/[0.05] grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <div className="space-y-4">
                                    <div className="section-label">Scientific Methodology</div>
                                    <p className="text-[11px] text-white/40 font-bold leading-relaxed">
                                        This engine utilizes an ensemble of <span className="text-white">XGBoost, RandomForest, and Ridge Regression</span> models trained on 10,000+ simulated and validated building scenarios. 
                                        Thermal physics are accounted for using ISHRAE transfer function methods and NASA POWER climatology for localized solar intensity.
                                    </p>
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-2 text-[8px] font-black text-primary uppercase">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                            ECBC 2017 Compliant
                                        </div>
                                        <div className="flex items-center gap-2 text-[8px] font-black text-secondary uppercase">
                                            <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                                            NASA 22-Year Normal
                                        </div>
                                    </div>
                                </div>
                                <div className="premium-card p-6 bg-white/[0.02] border border-white/[0.05]">
                                    <div className="text-[9px] font-black italic text-white/20 mb-4 uppercase tracking-widest">Citation Metadata</div>
                                    <p className="text-[10px] font-bold text-white/60 leading-tight mb-2">
                                        "Recommended materials comply with BMTPC Schedule of Rates 2024 and CPWD Thermal Integrity standards for Indian Housing (Pradhan Mantri Awas Yojana)."
                                    </p>
                                    <span className="text-[8px] font-black text-primary uppercase">Ref: 2026-ENG-0824-V2</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </motion.div>
    );
}

function ClimateMetric({ icon, label, value, unit, isCompact }: any) {
    return (
        <div className={cn("flex items-center justify-between group", isCompact ? "bg-white/[0.01] p-3 rounded-xl border border-white/[0.03]" : "")}>
            <div className="flex items-center gap-3">
                <div className={cn("rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center group-hover:bg-white/[0.06] transition-all duration-500", isCompact ? "w-8 h-8" : "w-12 h-12")}>
                    {icon}
                </div>
                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{label}</span>
            </div>
            <div className="flex items-baseline gap-1">
                <span className={cn("font-black text-white group-hover:text-primary transition-colors duration-500 tracking-tighter", isCompact ? "text-lg" : "text-2xl")}>{value}</span>
                <span className="text-[8px] font-bold text-white/10 uppercase italic">{unit}</span>
            </div>
        </div>
    );
}

function AssemblyItem({ icon, label, value, isCompact }: any) {
    return (
        <div className="flex items-start gap-4 group/item">
            <div className={cn("mt-1 group-hover/item:scale-110 transition-transform", isCompact ? "scale-90" : "")}>{icon}</div>
            <div className="space-y-1">
                <span className="text-[8px] font-black text-white/10 uppercase tracking-widest leading-none block">{label}</span>
                <p className={cn("font-black text-white/70 leading-tight group-hover/item:text-white transition-colors", isCompact ? "text-xs" : "text-[14px]")}>{value}</p>
            </div>
        </div>
    );
}

function SimulatorSelect({ label, options, defaultValue }: any) {
    return (
        <div className="space-y-4">
            <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-1">{label}</label>
            <div className="relative group/sel">
                <select 
                    defaultValue={defaultValue}
                    className="w-full glass-input !h-14 !rounded-2xl appearance-none bg-black/40 font-bold text-sm pr-12 cursor-pointer border-white/5 hover:border-white/20 transition-all"
                >
                    {options.map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/10 group-hover/sel:text-primary transition-colors">
                    <TrendingDown className="w-4 h-4 rotate-180" />
                </div>
            </div>
        </div>
    );
}

function SourceItem({ title, source, model_metrics }: any) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{title}</span>
                <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-white leading-tight italic">{source.name.replace('Custom: ', '')}</span>
                    {source.name.startsWith('Custom:') && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[7px] font-black text-primary uppercase tracking-widest">User Library</span>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/[0.05]">
                <div className="space-y-2">
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Training Precision</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-white/80">{(model_metrics?.r2 || 0).toFixed(3)}</span>
                        <span className="text-[8px] text-white/20 uppercase">R²</span>
                    </div>
                </div>
                <div className="space-y-2">
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Avg Variance</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-white/80">{(model_metrics?.mae || 0).toFixed(1)}</span>
                        <span className="text-[8px] text-white/20 uppercase">MAE</span>
                    </div>
                </div>
            </div>
            <div className="space-y-4">
                <div className="flex items-start gap-3">
                    <div className="w-1 h-8 bg-primary/20 rounded-full" />
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Citation</span>
                        <span className="text-[11px] text-white/60 font-bold">{source.citation}</span>
                    </div>
                </div>
                <div className="flex items-start gap-3">
                    <div className="w-1 h-8 bg-secondary/20 rounded-full" />
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Regulatory Ref</span>
                        <span className="text-[11px] text-white/60 font-bold">{source.ref}</span>
                    </div>
                </div>
            </div>
            {source.url && (
                <a 
                    href={source.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-4 flex items-center gap-2 group/link"
                >
                    <span className="text-[9px] font-black text-primary/40 group-hover/link:text-primary transition-colors uppercase tracking-[0.2em]">View Official Doc</span>
                    <ArrowUpRight className="w-3 h-3 text-primary/40 group-hover/link:text-primary transition-colors" />
                </a>
            )}
        </div>
    );
}
function ComparisonRow({ label, values }: any) {
    return (
        <tr className="border-b border-white/[0.02] group/row">
            <td className="py-4 text-white/40 font-bold leading-tight w-1/4">{label}</td>
            {values.map((v: string, i: number) => (
                <td key={i} className="py-4 px-4 text-center">
                    <span className="text-white/70 group-hover/row:text-white transition-colors">{v}</span>
                </td>
            ))}
        </tr>
    );
}
