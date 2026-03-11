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

    return (
        <div className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-4">
                    <div className="section-label">Inference Engine v4</div>
                    <h2 className="text-5xl font-bold tracking-tighter italic">Model <span className="text-secondary not-italic">Intelligence</span></h2>
                    <p className="text-white/40 text-lg max-w-xl font-medium">
                        Deep analysis of our gradient-boosted surrogate model performance, explainability, and validation metrics.
                    </p>
                </div>

                <div className="flex gap-4 items-center">
                    <div className="p-4 rounded-3xl bg-secondary/5 border border-secondary/10 flex items-center gap-4">
                        <ShieldCheck className="w-5 h-5 text-secondary" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Model Accuracy</span>
                            <span className="text-xl font-black text-white italic tracking-tighter">0.914 <span className="text-xs not-italic text-white/30 uppercase ml-1">R²</span></span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* SHAP Chart (Large) */}
                <div className="lg:col-span-8 premium-card p-12 space-y-12">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-2xl font-bold tracking-tight">Feature Influence</h3>
                            <p className="text-sm text-white/30 mt-1">Marginal contribution of each parameter to the final EUI prediction.</p>
                        </div>
                        <Target className="w-6 h-6 text-white/10" />
                    </div>

                    <div className="h-[400px] w-full">
                        {shapData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={shapData} layout="vertical" margin={{ left: 20 }}>
                                    <XAxis type="number" hide />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 900, letterSpacing: '0.15em' }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={140}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-black/95 border border-white/10 p-6 rounded-3xl shadow-2xl backdrop-blur-3xl ring-1 ring-white/10">
                                                        <p className="text-[9px] uppercase font-black tracking-widest text-secondary/60 mb-2">{payload[0].payload.name}</p>
                                                        <p className="text-3xl font-bold flex items-baseline gap-2">
                                                            {payload[0].payload.original > 0 ? '+' : ''}
                                                            {payload[0].payload.original.toFixed(4)}
                                                            <span className="text-xs text-white/20 font-medium">Impact</span>
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
                                                fill={entry.original > 0 ? '#f43f5e' : '#6366f1'}
                                                fillOpacity={0.8}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-white/10 italic">
                                <Activity className="w-12 h-12 mb-4 animate-pulse" />
                                <p>Run a simulation to generate intelligence data</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Model Meta (Side) */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="premium-card p-10 space-y-8">
                        <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Hyperparameters</h4>
                        <div className="space-y-6">
                            <ConfigRow label="Algorithm" value="XGBoost 2.0" />
                            <ConfigRow label="Max Depth" value="7" />
                            <ConfigRow label="Estimators" value="500" />
                            <ConfigRow label="LR" value="0.05" />
                        </div>
                    </div>

                    <div className="premium-card p-10 space-y-6 bg-secondary/[0.02]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                                <Zap className="w-5 h-5 text-secondary" />
                            </div>
                            <span className="text-xs font-bold text-white/60">Training Set</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-baseline">
                                <span className="text-4xl font-black italic">5,000</span>
                                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Simulations</span>
                            </div>
                            <p className="text-[11px] leading-relaxed text-white/30 font-medium">
                                Parametric energy models run for 15+ Indian climate zones across 12 building archetypes.
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
            <span className="text-xs font-bold text-white/30 lowercase tracking-widest">{label}</span>
            <span className="text-sm font-black text-white/80 group-hover:text-secondary transition-colors italic">{value}</span>
        </div>
    );
}
