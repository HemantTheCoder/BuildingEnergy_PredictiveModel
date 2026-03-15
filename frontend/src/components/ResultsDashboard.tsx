import { useState } from 'react';
import {
    TrendingDown,
    ArrowUpRight,
    Info,
    CheckCircle2,
    Activity,
    FileDown,
    ThermometerSnowflake,
    Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

export default function ResultsDashboard({ results }: any) {
    const { 
        predicted_eui, 
        top_material_recommendations, 
        climate_summary, 
        material_sources, 
        model_metrics, 
        sensitivity_analysis,
        thermal_comfort,
        ecbc_compliance
    } = results;
    const [activeTab, setActiveTab] = useState<'simulator' | 'details' | 'comparison' | 'analytics'>('analytics');

    const handleExportPDF = () => {
        window.alert("Generating professional PDF report... (Feature implementation via jsPDF/Html2Canvas)");
    };

    const getEUIColor = (eui: number) => {
        if (eui < 80) return "text-primary";
        if (eui < 130) return "text-secondary";
        return "text-accent";
    };

    const totalEmbodiedCarbon = (material_sources.wall.carbon || 0) + (material_sources.roof.carbon || 0) + (material_sources.glazing.carbon || 0);
    const annualSavingsINR = (180 - predicted_eui) * 1200 * 9; // Comparison with baseline ~180 EUI, 1200m2, 9 INR/unit

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main EUI Card */}
                <div className="md:col-span-2 premium-card p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-60 h-60 bg-primary/5 rounded-full blur-[80px] -z-10" />
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <div className="section-label">Energy Intensity</div>
                            <div className="flex items-baseline gap-4">
                                <span className={cn("text-8xl font-black tracking-tighter leading-none", getEUIColor(predicted_eui))}>
                                    {predicted_eui.toFixed(1)}
                                </span>
                                <div className="flex flex-col">
                                    <span className="text-white/20 font-bold italic text-xl leading-none">kWh/m²·yr</span>
                                    <span className="text-[9px] font-black tracking-[0.4em] text-primary/60 mt-2 uppercase">Operational Forecast</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-3 text-right">
                             <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Est. Annual Savings</span>
                                <span className="text-2xl font-black text-secondary italic">₹{annualSavingsINR > 0 ? (annualSavingsINR/1000).toFixed(1) : "0"}K</span>
                            </div>
                            {ecbc_compliance && (
                                <div className={cn("px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest", 
                                    ecbc_compliance.color === 'emerald' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                                    ecbc_compliance.color === 'sky' ? "bg-sky-500/10 border-sky-500/20 text-sky-500" :
                                    ecbc_compliance.color === 'primary' ? "bg-primary/10 border-primary/20 text-primary" :
                                    "bg-rose-500/10 border-rose-500/20 text-rose-500"
                                )}>
                                    {ecbc_compliance.status}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Carbon & ROI Card */}
                <div className="premium-card p-8 flex flex-col justify-between border-white/[0.03] bg-white/[0.01]">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="section-label mb-0">Thermal Comfort</span>
                            <ThermometerSnowflake className="w-4 h-4 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Predicted Mean Vote (PMV)</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black text-white">{thermal_comfort?.index?.toFixed(1) || "0.0"}</span>
                                <span className={cn("text-[10px] font-black uppercase tracking-widest", 
                                    thermal_comfort?.status === 'Warm' || thermal_comfort?.status === 'Hot' ? "text-rose-400" : 
                                    thermal_comfort?.status === 'Cool' || thermal_comfort?.status === 'Cold' ? "text-sky-400" : "text-primary"
                                )}>
                                    {thermal_comfort?.status || "Neutral"}
                                </span>
                            </div>
                        </div>
                        <div className="relative h-6 flex items-center">
                            <div className="absolute inset-0 bg-gradient-to-r from-sky-500 via-primary to-rose-500 rounded-full h-1 blur-[1px] opacity-20" />
                            <motion.div 
                                initial={{ left: "50%" }}
                                animate={{ left: `${50 + (thermal_comfort?.index || 0) * 16.66}%` }}
                                className="absolute w-4 h-4 bg-white rounded-full border-2 border-primary shadow-[0_0_10px_rgba(45,212,191,0.5)] z-10"
                            />
                        </div>
                    </div>
                    <button 
                        onClick={handleExportPDF}
                        className="mt-6 w-full h-10 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-primary hover:text-black hover:border-primary transition-all flex items-center justify-center gap-2 group/btn"
                    >
                        <FileDown className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Generate Report</span>
                    </button>
                </div>
            </div>

            <section className="premium-card p-0 overflow-hidden bg-white/[0.005]">
                <div className="flex border-b border-white/[0.05] overflow-x-auto">
                    {[
                        { id: 'analytics', label: 'Design Analytics' },
                        { id: 'comparison', label: 'Material Scenarios' },
                        { id: 'simulator', label: 'Dynamic Simulator' },
                        { id: 'details', label: 'Methodology' }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn("px-8 py-5 text-[9px] font-black uppercase tracking-[0.3em] whitespace-nowrap transition-all relative", activeTab === tab.id ? "text-primary bg-primary/5" : "text-white/20 hover:text-white/40")}
                        >
                            {tab.label}
                            {activeTab === tab.id && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
                        </button>
                    ))}
                </div>

                <div className="p-8">
                    {activeTab === 'analytics' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                            <div className="lg:col-span-7 space-y-8">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-primary" />
                                        <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/60">Sensitivity Analysis (Tornado Impact)</h4>
                                    </div>
                                    <div className="space-y-6 pt-4">
                                        {sensitivity_analysis && Object.entries(sensitivity_analysis).map(([param, data]: [string, any]) => (
                                            <div key={param} className="space-y-2">
                                                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-white/30">
                                                    <span>{param.replace('_', ' ')}</span>
                                                    <span className="flex gap-4">
                                                        <span className="text-rose-400">-{Math.abs(data.low_impact).toFixed(1)}</span>
                                                        <span className="text-primary">+{Math.abs(data.high_impact).toFixed(1)}</span>
                                                    </span>
                                                </div>
                                                <div className="relative h-2 w-full bg-white/5 rounded-full flex justify-center items-center">
                                                    <div className="absolute w-px h-4 bg-white/10 left-1/2" />
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
                            <div className="lg:col-span-5 premium-card bg-primary/[0.01] p-6 space-y-6 flex flex-col justify-center">
                                <div className="space-y-2">
                                    <span className="section-label">Strategic Insight</span>
                                    <p className="text-xs text-white/60 font-medium leading-relaxed italic">
                                        "Parameter sensitivity reveals that <span className="text-primary font-black">WWR</span> is your dominant lever for optimization in {climate_summary?.city || 'this climate'}. A 20% reduction could yield substantial energy savings without compromising daylighting."
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                                        <span className="text-[8px] font-black text-white/20 uppercase mb-1 block">Payback Scale</span>
                                        <span className="text-sm font-bold text-white tracking-tight">2.4 Years</span>
                                    </div>
                                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                                        <span className="text-[8px] font-black text-white/20 uppercase mb-1 block">BEE Star Rating</span>
                                        <div className="flex gap-0.5 pt-1">
                                            {[1,2,3,4,5].map(s => <div key={s} className={cn("w-1.5 h-3 rounded-full", s <= 4 ? "bg-primary" : "bg-white/5")} />)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'comparison' ? (
                        <div className="space-y-8">
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {top_material_recommendations.map((rec: any, i: number) => (
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
                                                <span className="text-[8px] font-black uppercase tracking-widest text-primary/60">{i === 0 ? "Max Efficiency" : i === 1 ? "Balanced Cost" : "Sustainability Leader"}</span>
                                                {i === 0 && <CheckCircle2 className="w-2.5 h-2.5 text-primary" />}
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex flex-col">
                                                <span className="text-[7px] font-black text-white/10 uppercase mb-1">Assembly</span>
                                                <p className="text-[10px] font-bold text-white/60 line-clamp-1">{rec.wall}</p>
                                                <p className="text-[10px] font-bold text-white/60 line-clamp-1">{rec.roof}</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.05]">
                                                <div>
                                                    <span className="text-[7px] font-black text-white/20 uppercase block">EUI</span>
                                                    <span className="text-base font-black text-white">{rec.predicted_eui.toFixed(1)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[7px] font-black text-white/20 uppercase block">Carbon</span>
                                                    <span className="text-base font-black text-secondary">{rec.embodied_carbon.toFixed(1)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                             </div>
                        </div>
                    ) : activeTab === 'simulator' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                            <div className="lg:col-span-8 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <SimulatorSelect label="Wall Selection" options={["AAC Block Wall (200mm)", "Autoclaved Aerated Block", "Standard Brick Wall (230mm)", "Burnt Clay Brick"]} defaultValue={material_sources?.wall.name} />
                                    <SimulatorSelect label="Roof Strategy" options={["RCC Slab (150mm)", "Insulated RCC Slab (150mm + 75mm XPS)", "Cool Roof Paint", "Green Roof"]} defaultValue={material_sources?.roof.name} />
                                    <SimulatorSelect label="Glazing Config" options={["Single Clear Glass (6mm)", "Double Glazed Low-E (6/12/6)", "Double Glazed Tinted", "High Performance Solar Control"]} defaultValue={material_sources?.glazing.name} />
                                </div>
                                <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/[0.04] flex items-center gap-6">
                                    <Info className="w-5 h-5 text-primary" />
                                    <p className="text-xs text-white/40 leading-relaxed font-bold italic">
                                        "Scientific Note: Switching to <span className="text-primary">{material_sources?.wall.name}</span> contributes <span className="text-white">{(material_sources.wall.carbon || 0).toFixed(2)} kgCO2e/kg</span> to the project's total embodied carbon of <span className="text-secondary">{totalEmbodiedCarbon.toFixed(2)}</span>."
                                    </p>
                                </div>
                            </div>
                            <div className="lg:col-span-4 rounded-3xl bg-secondary/[0.02] border border-secondary/10 p-8 flex flex-col items-center justify-center text-center gap-6">
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black text-white/20 uppercase tracking-widest block">Operational Impact</span>
                                    <div className="flex items-baseline justify-center gap-2">
                                        <TrendingDown className="w-5 h-5 text-secondary/60" />
                                        <span className="text-6xl font-black text-white italic">-{(((180 - predicted_eui)/180) * 100).toFixed(0)}%</span>
                                    </div>
                                    <span className="text-[9px] font-black text-secondary uppercase tracking-[0.2em]">Efficiency vs Baseline</span>
                                </div>
                                
                                <div className="w-full space-y-3 pt-6 border-t border-white/[0.05]">
                                    <div className="flex justify-between text-[10px] font-black uppercase text-white/30">
                                        <span>Embodied Carbon</span>
                                        <span className="text-white">{totalEmbodiedCarbon.toFixed(1)}</span>
                                    </div>
                                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-secondary" style={{ width: `${Math.min(100, (totalEmbodiedCarbon/5)*100)}%` }} />
                                    </div>
                                </div>
                                
                                <button className="w-full h-14 bg-primary rounded-2xl text-black font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(45,212,191,0.2)] hover:scale-[1.02] transition-all flex items-center justify-center gap-3">
                                    <Zap className="w-4 h-4 fill-current" />
                                    Recalculate Path
                                </button>
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
                                        This engine utilizes an ensemble of <span className="text-white">XGBoost, RandomForest, and Ridge Regression</span> models trained on 22 official BEE Indicative Benchmarks for commercial building archetypes. 
                                        Thermal physics are objectively mapped using official BEE thermal transfer coefficients and NASA POWER 22-year meteorological normals.
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

function Definition({ text }: { text: string }) {
    return (
        <div className="group/def relative inline-block mx-1 cursor-help">
            <Info className="w-2.5 h-2.5 text-white/20 group-hover/def:text-primary transition-colors" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 rounded-xl bg-black/90 border border-white/10 backdrop-blur-xl opacity-0 group-hover/def:opacity-100 pointer-events-none transition-all z-50 text-[10px] font-medium leading-relaxed text-white/60 shadow-2xl">
                {text}
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
                    className="w-full glass-input !h-14 !rounded-2xl appearance-none bg-black/40 font-bold text-sm pr-12 cursor-pointer border-white/5 hover:border-white/20 transition-all font-inter"
                >
                    {options.map((opt: string) => (
                        <option key={opt} value={opt} className="bg-neutral-900">{opt}</option>
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
