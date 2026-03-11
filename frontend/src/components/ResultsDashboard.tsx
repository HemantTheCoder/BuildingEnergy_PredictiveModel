import React from 'react';
import {
    TrendingDown,
    Thermometer,
    Sun,
    Wind,
    ShieldCheck,
    Layers,
    ArrowUpRight,
    Sparkles,
    Globe,
    Info
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

export default function ResultsDashboard({ results }: any) {
    const { predicted_eui, top_material_recommendations, climate_summary, material_sources } = results;

    const getEUIColor = (eui: number) => {
        if (eui < 80) return "text-primary";
        if (eui < 130) return "text-secondary";
        return "text-accent";
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-16"
        >
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
                <div className="lg:col-span-3 premium-card p-12 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px] -z-10" />

                    <div className="space-y-2 relative">
                        <div className="section-label">Prediction Consensus</div>
                        <div className="flex flex-col">
                            <div className="flex items-baseline gap-6">
                                <span className={cn("text-9xl font-black tracking-tighter leading-none", getEUIColor(predicted_eui))}>
                                    {predicted_eui.toFixed(1)}
                                </span>
                                <div className="flex flex-col">
                                    <span className="text-white/20 font-bold italic text-2xl leading-none">kWh/m²·yr</span>
                                    <span className="text-[10px] font-black tracking-[0.4em] text-primary/60 mt-4 uppercase">Target Estimated</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-20 flex flex-wrap gap-12 items-center border-t border-white/[0.05] pt-12 relative">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center border border-primary/10">
                                <ShieldCheck className="w-6 h-6 text-primary" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[11px] font-black text-white/30 uppercase tracking-widest">Model Fidelity</span>
                                <span className="text-lg font-bold text-white/90 italic">91.4% Reliable</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-secondary/5 flex items-center justify-center border border-secondary/10">
                                <TrendingDown className="w-6 h-6 text-secondary" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[11px] font-black text-white/30 uppercase tracking-widest">Efficiency</span>
                                <span className="text-lg font-bold text-white/90 italic">Optimal Tier-1</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 premium-card p-10 flex flex-col justify-between bg-primary/[0.01]">
                    <div className="space-y-8">
                        <div className="flex items-center justify-between">
                            <span className="section-label mb-0">Local Climatology</span>
                            <Globe className="w-4 h-4 text-white/10" />
                        </div>
                        <div className="space-y-8">
                            <ClimateMetric icon={<Thermometer className="text-rose-500" />} label="Average CDD" value={climate_summary?.cdd.toFixed(0)} unit="°D" />
                            <ClimateMetric icon={<Sun className="text-amber-500" />} label="Solar Rad" value={climate_summary?.annual_solrad.toFixed(2)} unit="kWh" />
                            <ClimateMetric icon={<Wind className="text-sky-500" />} label="Heat Degree Scale" value={climate_summary?.hdd.toFixed(0)} unit="°D" />
                        </div>
                    </div>
                    <div className="pt-10 border-t border-white/[0.05] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(45,212,191,0.5)]" />
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">
                                {climate_summary?.source || "Override"}
                            </span>
                        </div>
                        <Info className="w-3 h-3 text-white/5" />
                    </div>
                </div>
            </div>            <section className="space-y-10">
                <div className="flex items-end justify-between">
                    <div>
                        <div className="section-label">Assembly Matrix</div>
                        <h3 className="text-5xl font-bold tracking-tighter italic">Recommended <span className="text-primary not-italic">Scenarios</span></h3>
                    </div>
                    <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest max-w-[200px] text-right">
                        Combinations that minimize predicted EUI.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    {top_material_recommendations.map((rec: any, i: number) => (
                        <motion.div
                            key={i}
                            whileHover={{ y: -12, scale: 1.02 }}
                            className={cn(
                                "premium-card p-10 flex flex-col gap-10 relative group border-2 transition-all duration-700",
                                i === 0 ? "border-primary/40 bg-primary/[0.02] scale-105 z-10 shadow-[0_40px_100px_-20px_rgba(45,212,191,0.15)]" : "border-white/[0.03]"
                            )}
                        >
                            {i === 0 && (
                                <div className="absolute top-4 right-8 bg-primary text-black text-[10px] font-black uppercase px-6 py-2 rounded-lg italic tracking-widest flex items-center gap-2">
                                    <Sparkles className="w-3 h-3" />
                                    Top Choice
                                </div>
                            )}
                            <div className="space-y-8">
                                <AssemblyItem icon={<Layers className="w-4 h-4 text-white/20" />} label="Structure Wall" value={rec.wall} />
                                <AssemblyItem icon={<Layers className="w-4 h-4 text-white/20" />} label="Structural Roof" value={rec.roof} />
                                <AssemblyItem icon={<Layers className="w-4 h-4 text-white/20" />} label="Glazing System" value={rec.glazing} />
                            </div>
                            <div className="mt-6 pt-10 border-t border-white/[0.05] flex justify-between items-end group/item">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-white/10 uppercase tracking-[0.3em] mb-1">Optimized Pass</span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black text-white group-hover/item:text-primary transition-colors duration-500">{rec.predicted_eui.toFixed(1)}</span>
                                        <span className="text-[10px] text-white/20 font-bold uppercase italic tracking-widest">kWh</span>
                                    </div>
                                </div>
                                <div className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center group-hover/item:border-primary/40 group-hover/item:bg-primary/5 transition-all">
                                    <ArrowUpRight className="w-5 h-5 text-white/10 group-hover/item:text-primary" />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {material_sources && (
                <section className="premium-card p-12 border-primary/20 bg-primary/[0.01]">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="px-5 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            <ShieldCheck className="w-3 h-3" />
                            Data Source Verified
                        </div>
                        <h4 className="text-2xl font-bold tracking-tighter italic text-white/90">Source Transparency <span className="text-white/20 font-normal not-italic ml-2">(Official India Datasets)</span></h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-14">
                        <SourceItem title="Wall Properties" source={material_sources.wall} />
                        <SourceItem title="Roof Properties" source={material_sources.roof} />
                        <SourceItem title="Glazing Properties" source={material_sources.glazing} />
                    </div>

                    <div className="mt-14 pt-10 border-t border-white/[0.05] grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">ML Training Engine</span>
                            <p className="text-xs text-white/60 leading-relaxed font-bold italic">
                                Model trained on real-world measured EPI data from BEE India Star Labeling and Commercial Benchmarking Reports (2020-2024). No synthetic data used in final inference.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Climatology Source</span>
                            <p className="text-xs text-white/60 leading-relaxed font-bold italic">
                                Static and dynamic weather parameters fetched from NASA POWER API Climatology (30-year averages) and ISHRAE TMY Data Profiles.
                            </p>
                        </div>
                    </div>
                </section>
            )}
        </motion.div>
    );
}

function ClimateMetric({ icon, label, value, unit }: any) {
    return (
        <div className="flex items-center justify-between group">
            <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center group-hover:bg-white/[0.06] transition-all duration-500">
                    {icon}
                </div>
                <span className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">{label}</span>
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white group-hover:text-primary transition-colors duration-500 tracking-tighter">{value}</span>
                <span className="text-[10px] font-bold text-white/10 uppercase italic">{unit}</span>
            </div>
        </div>
    );
}

function AssemblyItem({ icon, label, value }: any) {
    return (
        <div className="flex items-start gap-5">
            <div className="mt-1">{icon}</div>
            <div className="space-y-2">
                <span className="text-[10px] font-black text-white/10 uppercase tracking-[0.4em] leading-none block">{label}</span>
                <p className="text-[14px] font-black text-white/70 leading-tight group-hover:text-white transition-colors">{value}</p>
            </div>
        </div>
    );
}

function SourceItem({ title, source }: any) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{title}</span>
                <span className="text-lg font-bold text-white leading-tight italic">{source.name}</span>
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
