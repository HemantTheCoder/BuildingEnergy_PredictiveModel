import { Activity, ShieldCheck, Zap, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function ModelIntelligence({ results }: { results: any }) {
    // If no results, show generic model metadata
    const shapData = results ? Object.entries(results.shap_values)
        .map(([name, value]: [string, any]) => ({
            name: name.replace('_', ' ').toUpperCase(),
            value: Math.abs(value),
            original: value
        }))
        .sort((a, b) => b.value - a.value) : [];

    const metrics = results?.model_metrics || {};
    const algorithm = metrics.algorithm || "XGBoost";
    const depth = metrics.depth !== undefined && metrics.depth !== null ? String(metrics.depth) : "N/A";
    const estimators = metrics.estimators !== undefined && metrics.estimators !== null ? String(metrics.estimators) : "N/A";
    const alpha = metrics.alpha !== undefined && metrics.alpha !== null ? String(metrics.alpha) : "N/A";
    const trainingSamples = metrics.training_samples !== undefined && metrics.training_samples !== null ? metrics.training_samples : 1504;

    return (
        <div className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-4">
                    <div className="section-label">Inference Engine v4</div>
                    <h2 className="text-5xl font-bold tracking-tighter text-slate-800 italic">Model <span className="text-secondary not-italic">Intelligence</span></h2>
                    <p className="text-slate-500 text-lg max-w-xl font-medium">
                        Deep analysis of our gradient-boosted surrogate model performance, explainability, and validation metrics.
                    </p>
                </div>

                <div className="flex gap-4 items-center">
                    <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200 flex items-center gap-4 shadow-sm">
                        <ShieldCheck className="w-5 h-5 text-secondary" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Model Accuracy</span>
                            <span className="text-xl font-black text-slate-800 italic tracking-tighter">{(results?.model_metrics?.r2 || 0.786).toFixed(3)} <span className="text-xs not-italic text-slate-400 uppercase ml-1">R²</span></span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* SHAP Chart (Large) */}
                <div className="lg:col-span-8 premium-card p-12 space-y-12">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-2xl font-bold tracking-tight text-slate-800">Feature Influence</h3>
                            <p className="text-sm text-slate-500 mt-1">Marginal contribution of each parameter to the final EUI prediction.</p>
                        </div>
                        <Target className="w-6 h-6 text-slate-300" />
                    </div>

                    <div className="h-[400px] w-full">
                        {shapData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={shapData} layout="vertical" margin={{ left: 20 }}>
                                    <XAxis type="number" hide />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        tick={{ fill: '#64748b', fontSize: 9, fontWeight: 900, letterSpacing: '0.15em' }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={140}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xl">
                                                        <p className="text-[9px] uppercase font-black tracking-widest text-slate-500 mb-2">{payload[0].payload.name}</p>
                                                        <p className="text-3xl font-bold flex items-baseline gap-2 text-slate-800">
                                                            {payload[0].payload.original > 0 ? '+' : ''}
                                                            {payload[0].payload.original.toFixed(4)}
                                                            <span className="text-xs text-slate-400 font-medium">Impact</span>
                                                        </p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={24}>
                                        {shapData.map((entry: any, index: number) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.original > 0 ? '#ea580c' : '#0d9488'}
                                                fillOpacity={0.8}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 italic">
                                <Activity className="w-12 h-12 mb-4 animate-pulse" />
                                <p>Run a simulation to generate intelligence data</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Model Meta (Side) */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="premium-card p-10 space-y-8">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Hyperparameters</h4>
                        <div className="space-y-6">
                            <ConfigRow label="Algorithm" value={algorithm} />
                            <ConfigRow label="Depth" value={depth} />
                            <ConfigRow label="Estimators" value={estimators} />
                            <ConfigRow label="Alpha" value={alpha} />
                        </div>
                    </div>

                    <div className="premium-card p-10 space-y-8">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Validation Methodology</h4>
                        <div className="space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="w-1.5 h-1.5 rounded-full bg-secondary mt-1.5" />
                                <p className="text-[10px] text-slate-500 leading-relaxed">
                                    <span className="text-slate-700 font-bold">Protocol:</span> 80/20 Train/Test Validation split for scientific rigor.
                                </p>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="w-1.5 h-1.5 rounded-full bg-secondary mt-1.5" />
                                <p className="text-[10px] text-slate-500 leading-relaxed">
                                    <span className="text-slate-700 font-bold">Feature Selection:</span> ASHRAE 90.1 & ECBC 2017 core thermal drivers used.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="premium-card p-10 space-y-6 bg-slate-50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-slate-200">
                                <Zap className="w-5 h-5 text-secondary" />
                            </div>
                            <span className="text-xs font-bold text-slate-600">Training Set</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-baseline">
                                <span className="text-4xl font-black italic text-slate-800">{trainingSamples}</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Training Records</span>
                            </div>
                            <p className="text-[11px] leading-relaxed text-slate-500 font-medium">
                                Expanded parametric dataset based on CPWD and BMTPC thermal standards, anchored by official BEE benchmarking reports.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ConfigRow({ label, value }: any) {
    return (
        <div className="flex justify-between items-center group">
            <span className="text-xs font-bold text-slate-500 lowercase tracking-widest">{label}</span>
            <span className="text-sm font-black text-slate-800 group-hover:text-secondary transition-colors italic">{value}</span>
        </div>
    );
}
