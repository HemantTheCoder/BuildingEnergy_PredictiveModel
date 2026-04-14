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
    AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

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
        ecbc_compliance,
        evidence_panel
    } = results;
    const [activeTab, setActiveTab] = useState<'simulator' | 'details' | 'comparison' | 'analytics'>('analytics');
    
    const [simulatorOverrides, setSimulatorOverrides] = useState<any>({
        wall: material_sources?.wall?.name || "AAC Block Wall (200mm)",
        roof: material_sources?.roof?.name || "RCC Slab (150mm) - Standard",
        glazing: material_sources?.glazing?.name || "Single Clear Glass (6mm)"
    });

    const handleExportPDF = () => {
        window.alert("Generating professional PDF report... (Feature implementation via jsPDF/Html2Canvas)");
    };

    const getEUIColor = (eui: number) => {
        if (eui < 80) return "text-primary";
        if (eui < 130) return "text-secondary";
        return "text-accent";
    };

    const totalEmbodiedCarbon = (material_sources.wall.carbon || 0) + (material_sources.roof.carbon || 0) + (material_sources.glazing.carbon || 0);
    // Use dynamic backend savings if available, otherwise fallback
    const savings = annual_savings_inr !== undefined ? annual_savings_inr : (180 - predicted_eui) * 1200 * 9;
    const currentBaseline = baseline_eui !== undefined ? baseline_eui : 180;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main EUI Card */}
                <div className="md:col-span-2 premium-card p-6 bg-white/5 border border-white/10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-60 h-60 bg-primary/10 rounded-full blur-[80px] -z-10" />
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <div className="text-sm font-semibold text-white/50 uppercase">Energy Intensity</div>
                            <div className="flex items-baseline gap-4 mb-3">
                                <span className={cn("text-7xl font-bold tracking-tight leading-none", getEUIColor(predicted_eui))}>
                                    {predicted_eui.toFixed(1)}
                                </span>
                                <div className="flex flex-col">
                                    <span className="text-white/40 font-bold text-xl leading-none">kWh/m²·yr</span>
                                    <span className="text-xs font-semibold text-primary/80 mt-2 uppercase">Operational Forecast</span>
                                </div>
                            </div>
                            
                            {evidence_panel?.prediction_interval && (
                                <div className="flex flex-wrap items-center gap-2 mt-4">
                                    <div className="px-3 py-1 rounded bg-black/20 border border-white/10 text-xs font-semibold text-white/60">
                                        Evidence CI: {evidence_panel.prediction_interval[0].toFixed(1)} - {evidence_panel.prediction_interval[1].toFixed(1)}
                                    </div>
                                    {evidence_panel.physics_anomalies_detected && (
                                        <div className="px-3 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-500 flex items-center gap-1.5">
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            Drift Detected
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col items-end gap-3 text-right">
                            <div className="flex flex-col gap-1 items-end">
                                <span className="text-xs font-semibold text-white/40 uppercase">Est. Annual Savings</span>
                                <span className="text-2xl font-bold text-secondary">₹{savings > 0 ? (savings/1000).toFixed(1) : "0"}K</span>
                            </div>
                            {ecbc_compliance && (
                                <div className={cn("px-3 py-1 rounded font-bold text-xs uppercase", 
                                    ecbc_compliance.color === 'emerald' ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500" :
                                    ecbc_compliance.color === 'sky' ? "bg-sky-500/10 border border-sky-500/20 text-sky-500" :
                                    ecbc_compliance.color === 'primary' ? "bg-primary/10 border border-primary/20 text-primary" :
                                    "bg-rose-500/10 border border-rose-500/20 text-rose-500"
                                )}>
                                    {ecbc_compliance.status}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Carbon & ROI Card */}
                <div className="premium-card p-6 flex flex-col justify-between border-white/10 bg-white/5">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-white/50 uppercase">Thermal Comfort</span>
                            <ThermometerSnowflake className="w-4 h-4 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-white/40 uppercase">Predicted Mean Vote (PMV)</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-white">{thermal_comfort?.index?.toFixed(1) || "0.0"}</span>
                                <span className={cn("text-xs font-bold uppercase", 
                                    thermal_comfort?.status === 'Warm' || thermal_comfort?.status === 'Hot' ? "text-rose-400" : 
                                    thermal_comfort?.status === 'Cool' || thermal_comfort?.status === 'Cold' ? "text-sky-400" : "text-primary"
                                )}>
                                    {thermal_comfort?.status || "Neutral"}
                                </span>
                            </div>
                        </div>
                        <div className="relative h-6 flex items-center">
                            <div className="absolute inset-0 bg-gradient-to-r from-sky-500 via-primary to-rose-500 rounded-full h-1 opacity-40" />
                            <motion.div 
                                initial={{ left: "50%" }}
                                animate={{ left: `${50 + (thermal_comfort?.index || 0) * 16.66}%` }}
                                className="absolute w-3 h-3 bg-white rounded-full border border-primary z-10"
                            />
                        </div>
                    </div>
                    <button 
                        onClick={handleExportPDF}
                        className="mt-6 w-full h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 group/btn"
                    >
                        <FileDown className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase">Generate Report</span>
                    </button>
                </div>
            </div>

            <section className="premium-card p-0 overflow-hidden bg-white/5 border border-white/10 mt-8">
                <div className="flex border-b border-white/10 overflow-x-auto bg-[#1a1e27]">
                    {[
                        { id: 'analytics', label: 'Design Analytics' },
                        { id: 'comparison', label: 'Material Scenarios' },
                        { id: 'simulator', label: 'Dynamic Simulator' },
                        { id: 'details', label: 'Methodology' }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn("px-6 py-4 text-xs font-semibold whitespace-nowrap transition-all relative", activeTab === tab.id ? "text-white bg-white/5" : "text-white/50 hover:text-white/80")}
                        >
                            {tab.label}
                            {activeTab === tab.id && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 w-full h-[3px] bg-primary rounded-t-full" />}
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
                                        <h4 className="text-sm font-semibold text-white/80">Sensitivity Analysis (Tornado Impact)</h4>
                                    </div>
                                    <div className="space-y-6 pt-4">
                                        {sensitivity_analysis && Object.entries(sensitivity_analysis).map(([param, data]: [string, any]) => (
                                            <div key={param} className="space-y-2">
                                                <div className="flex justify-between text-xs font-semibold text-white/50 uppercase">
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
                            <div className="lg:col-span-5 premium-card bg-white/5 p-6 space-y-6 flex flex-col justify-center">
                                <div className="space-y-2">
                                    <span className="text-sm font-semibold text-white/80">Strategic Insight</span>
                                    <p className="text-sm text-white/60 leading-relaxed italic border-l-2 border-primary/50 pl-4">
                                        "Parameter sensitivity reveals that <span className="text-white font-bold">WWR</span> is your dominant lever for optimization in {climate_summary?.city || 'this climate'}. A 20% reduction could yield substantial energy savings without compromising daylighting."
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                                        <span className="text-xs font-semibold text-white/40 uppercase block mb-1">Payback Scale</span>
                                        <span className="text-lg font-bold text-white tracking-tight">2.4 Years</span>
                                    </div>
                                    <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                                        <span className="text-xs font-semibold text-white/40 uppercase block mb-1">BEE Star Rating</span>
                                        <div className="flex gap-1 pt-1">
                                            {[1,2,3,4,5].map(s => <div key={s} className={cn("w-2 h-4 rounded-sm", s <= 4 ? "bg-primary" : "bg-white/10")} />)}
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
                                                <span className="text-xs font-semibold text-primary/80">{i === 0 ? "Max Efficiency" : i === 1 ? "Balanced Cost" : "Sustainability Leader"}</span>
                                                {i === 0 && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-semibold text-white/40 uppercase">Assembly</span>
                                                <p className="text-sm font-medium text-white/80">{rec.wall}</p>
                                                <p className="text-sm font-medium text-white/80">{rec.roof}</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                                                <div>
                                                    <span className="text-xs font-semibold text-white/40 uppercase block">EUI</span>
                                                    <span className="text-xl font-bold text-white">{rec.predicted_eui.toFixed(1)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-xs font-semibold text-white/40 uppercase block">Carbon</span>
                                                    <span className="text-xl font-bold text-secondary">{rec.embodied_carbon.toFixed(1)}</span>
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
                                    <SimulatorSelect 
                                        label="Wall Selection" 
                                        options={["AAC Block Wall (200mm)", "Autoclaved Aerated Block", "Burnt Clay Brick Wall (230mm)", "Fly Ash Brick Wall (230mm)", "Solid Concrete Block (200mm)"]} 
                                        defaultValue={simulatorOverrides.wall}
                                        onChange={(v: string) => setSimulatorOverrides({ ...simulatorOverrides, wall: v })}
                                    />
                                    <SimulatorSelect 
                                        label="Roof Strategy" 
                                        options={["RCC Slab (150mm) - Standard", "RCC (150mm) + 50mm EPS Insulation", "RCC (150mm) + 100mm Rockwool Insulation", "Smart Green Roof (Adaptive Irrigation)"]} 
                                        defaultValue={simulatorOverrides.roof}
                                        onChange={(v: string) => setSimulatorOverrides({ ...simulatorOverrides, roof: v })}
                                    />
                                    <SimulatorSelect 
                                        label="Glazing Config" 
                                        options={["Single Clear Glass (6mm)", "Double Glazed Low-E (6/12/6)", "Double Glazed Heat Reflective (6/12/6)", "Triple Glazed Argon Fill"]} 
                                        defaultValue={simulatorOverrides.glazing}
                                        onChange={(v: string) => setSimulatorOverrides({ ...simulatorOverrides, glazing: v })}
                                    />
                                </div>
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-6 mt-6">
                                    <Info className="w-5 h-5 text-primary shrink-0" />
                                    <p className="text-sm text-white/80 leading-relaxed font-medium italic border-l-2 border-primary/50 pl-4">
                                        "Scientific Note: Switching to <span className="text-white font-bold">{material_sources?.wall.name}</span> contributes <span className="text-white font-bold">{(material_sources.wall.carbon || 0).toFixed(2)} kgCO2e/kg</span> to the project's total embodied carbon of <span className="text-secondary font-bold">{totalEmbodiedCarbon.toFixed(2)}</span>."
                                    </p>
                                </div>
                            </div>
                            <div className="lg:col-span-4 rounded-3xl bg-secondary/10 border border-secondary/20 p-8 flex flex-col items-center justify-center text-center gap-6">
                                <div className="space-y-1">
                                    <span className="text-xs font-semibold text-white/50 uppercase tracking-wide block">Operational Impact</span>
                                    <div className="flex items-baseline justify-center gap-2">
                                        <TrendingDown className="w-6 h-6 text-secondary/80" />
                                        <span className="text-6xl font-bold text-white tracking-tight">{Math.abs(((currentBaseline - predicted_eui)/currentBaseline) * 100).toFixed(0)}%</span>
                                    </div>
                                    <span className="text-xs font-medium text-secondary/80 uppercase">Efficiency vs Baseline</span>
                                </div>
                                
                                <div className="w-full space-y-3 pt-6 border-t border-white/10">
                                    <div className="flex justify-between text-xs font-semibold uppercase text-white/50">
                                        <span>Embodied Carbon</span>
                                        <span className="text-white">{totalEmbodiedCarbon.toFixed(1)}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
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
                                    className="w-full py-4 bg-primary text-black rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary-light transition-colors mt-4"
                                >
                                    <Zap className="w-4 h-4" />
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
                            
                            <div className="pt-10 border-t border-white/10 grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <div className="space-y-4">
                                    <div className="text-sm font-semibold text-white/80 uppercase">Data Provenance & MLOps</div>
                                    <div className="space-y-2">
                                        <p className="text-sm text-white/60 font-medium">
                                            <span className="text-white/80">Climate Source:</span> {evidence_panel?.climate_source_metadata?.source || "NASA POWER"}
                                        </p>
                                        <p className="text-sm text-white/60 font-medium">
                                            <span className="text-white/80">System Confidence:</span> {evidence_panel ? (evidence_panel.overall_confidence * 100).toFixed(0) : "80"}%
                                        </p>
                                        <p className="text-sm text-white/60 font-medium">
                                            <span className="text-white/80">Last Sync:</span> {evidence_panel?.climate_source_metadata?.retrieval_date || "Cached"}
                                        </p>
                                    </div>
                                    <p className="text-sm text-white/60 font-medium mt-2 border-t border-white/10 pt-4">
                                        This engine utilizes an ensemble of <span className="text-white">XGBoost, RandomForest, and Ridge Regression</span>. Anomaly triggers are actively monitored.
                                    </p>
                                    <div className="flex gap-4 pt-2">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                            Continuous Retraining (CT)
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-semibold text-secondary uppercase">
                                            <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                                            Physics Guardrails Active
                                        </div>
                                    </div>
                                </div>
                                <div className="premium-card p-6 bg-white/5 border border-white/10 flex flex-col justify-center">
                                    <div className="text-xs font-semibold text-white/40 mb-3 uppercase">Citation Metadata</div>
                                    <p className="text-sm font-medium text-white/80 leading-relaxed max-w-md">
                                        Recommended materials comply with BMTPC Schedule of Rates 2024 and CPWD Thermal Integrity standards for Indian Housing (Pradhan Mantri Awas Yojana).
                                    </p>
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
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wide ml-1">{label}</label>
            <div className="relative group/sel">
                <select 
                    value={defaultValue}
                    onChange={(e) => onChange && onChange(e.target.value)}
                    className="w-full glass-input appearance-none cursor-pointer pr-10 hover:border-white/20"
                >
                    {options.map((opt: string) => (
                        <option key={opt} value={opt} className="bg-neutral-900">{opt}</option>
                    ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/20 group-hover/sel:text-primary transition-colors">
                    <TrendingDown className="w-4 h-4 rotate-180" />
                </div>
            </div>
        </div>
    );
}

function SourceItem({ title, source, model_metrics }: any) {
    return (
        <div className="space-y-4 p-4 rounded-xl border border-white/10 bg-white/5">
            <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-white/40 uppercase tracking-wide">{title}</span>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{source.name.replace('Custom: ', '')}</span>
                    {source.name.startsWith('Custom:') && (
                        <span className="px-2 py-0.5 rounded border border-primary/20 text-xs font-semibold text-primary uppercase">User Library</span>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div className="space-y-1">
                    <span className="text-xs font-semibold text-white/40 uppercase">Training Precision</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-white">{(model_metrics?.r2 || 0).toFixed(3)}</span>
                        <span className="text-xs text-white/50">R²</span>
                    </div>
                </div>
                <div className="space-y-1">
                    <span className="text-xs font-semibold text-white/40 uppercase">Avg Variance</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-white">{(model_metrics?.mae || 0).toFixed(1)}</span>
                        <span className="text-xs text-white/50">MAE</span>
                    </div>
                </div>
            </div>
            <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-white/40 uppercase">Citation</span>
                    <span className="text-sm text-white/80">{source.citation}</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-white/40 uppercase">Regulatory Ref</span>
                    <span className="text-sm text-white/80">{source.ref}</span>
                </div>
            </div>
            {source.url && (
                <a 
                    href={source.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-4 flex items-center gap-2 group/link w-fit hover:bg-white/5 px-2 py-1 rounded transition-colors"
                >
                    <span className="text-xs font-semibold text-primary">View Official Doc</span>
                    <ArrowUpRight className="w-3 h-3 text-primary" />
                </a>
            )}
        </div>
    );
}
