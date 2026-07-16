import { Activity, ShieldCheck, Zap, Target, BookOpen, AlertCircle, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '../lib/utils';

const REFERENCES = [
    {
        id: "[1]",
        text: "Chen, T. & Guestrin, C. (2016). XGBoost: A Scalable Tree Boosting System. Proceedings of KDD 2016.",
        link: "https://doi.org/10.1145/2939672.2939785"
    },
    {
        id: "[2]",
        text: "Lundberg, S. & Lee, S.-I. (2017). A Unified Approach to Interpreting Model Predictions. NeurIPS 2017.",
        link: "https://doi.org/10.48550/arXiv.1705.07874"
    },
    {
        id: "[3]",
        text: "Pedregosa et al. (2011). Scikit-learn: Machine Learning in Python. JMLR 12, pp. 2825–2830.",
    },
    {
        id: "[4]",
        text: "BEE (2017). Energy Conservation Building Code. Ministry of Power, Government of India.",
    },
    {
        id: "[5]",
        text: "ASHRAE (2021). Handbook of Fundamentals, Ch. 18 — Energy Estimation Methods.",
    },
    {
        id: "[6]",
        text: "Khosravi, A. et al. (2011). Comprehensive Review of Neural Network–Based Prediction Intervals. IEEE TNNLS.",
        link: "https://doi.org/10.1109/TNNLS.2011.2115327"
    },
];

const FEATURE_DESCRIPTIONS: Record<string, { label: string; note: string; ref?: string }> = {
    cdd: { label: "Cooling Degree Days", note: "Primary driver of cooling load (base 18.3°C, ASHRAE 90.1)", ref: "ECBC 2017 §3.1" },
    hdd: { label: "Heating Degree Days", note: "Primary driver of heating load (base 18.3°C)", ref: "ECBC 2017 §3.1" },
    solrad: { label: "Solar Radiation (GHI)", note: "Mean daily GHI (kWh/m²·day) from NASA POWER; modulated by SHGC × WWR", ref: "NASA POWER API" },
    wwr: { label: "Window-to-Wall Ratio", note: "Fraction of opaque wall area replaced by glazing; governs solar gains and infiltration", ref: "ECBC 2017 §5.5" },
    shgc: { label: "Solar Heat Gain Coefficient", note: "Fraction of incident solar radiation transmitted through glazing as heat", ref: "NFRC 200; EN 410" },
    u_wall: { label: "Wall U-Value", note: "Overall thermal transmittance of wall assembly including surface resistances", ref: "IS 3792; ISO 6946" },
    u_roof: { label: "Roof U-Value", note: "Critical in India — roof is largest solar gain surface in hot climates", ref: "ECBC 2017 Table 5.3" },
    u_glass: { label: "Glazing U-Value", note: "Centre-of-glass U-value per NFRC 100 / EN 673", ref: "NFRC 100" },
    hvac_cop: { label: "HVAC COP", note: "Coefficient of Performance; higher = more efficient cooling", ref: "BEE Star Rating Prog." },
    floor_area: { label: "Floor Area", note: "Gross conditioned floor area (m²); affects absolute energy but not EUI", ref: "—" },
};

export default function ModelIntelligence({ results }: { results: any }) {
    const shapValues = results?.evidence_panel?.shap_drivers || {};
    const shapData = Object.keys(shapValues).length > 0 ? Object.entries(shapValues)
        .map(([name, value]: [string, any]) => ({
            name: (FEATURE_DESCRIPTIONS[name]?.label || name).toUpperCase(),
            rawName: name,
            value: Math.abs(Number(value) || 0),
            original: Number(value) || 0
        }))
        .sort((a, b) => b.value - a.value) : [];

    const metrics = results?.model_metrics || {};
    const algorithm = metrics.algorithm || "XGBoost";
    const depth = metrics.depth !== undefined && metrics.depth !== null ? String(metrics.depth) : "N/A";
    const estimators = metrics.estimators !== undefined && metrics.estimators !== null ? String(metrics.estimators) : "N/A";
    const alpha = metrics.alpha !== undefined && metrics.alpha !== null ? String(metrics.alpha) : "N/A";
    const trainingSamples = metrics.training_samples || 25015;
    const r2 = metrics.r2 || 0;
    const mae = metrics.mae || 0;
    const rmse = metrics.rmse || 0;
    // 5-fold CV stats (available after model re-trains with new code)
    const cvR2Mean  = metrics.cv_r2_mean;
    const cvR2Std   = metrics.cv_r2_std;
    const cvMaeMean = metrics.cv_mae_mean;
    const cvMaeStd  = metrics.cv_mae_std;
    const hasCv = cvR2Mean !== undefined && cvR2Mean !== null;

    return (
        <div className="space-y-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-4">
                    <div className="section-label">ML Explainability · ECBC 2017</div>
                    <h2 className="text-5xl font-bold tracking-tighter text-slate-100 italic">Model <span className="text-secondary not-italic">Intelligence</span></h2>
                    <p className="text-slate-400 text-lg max-w-xl font-medium">
                        Gradient-boosted surrogate model performance, SHAP feature attribution, 
                        and validation against BEE energy benchmarks.
                    </p>
                </div>
                <div className="flex gap-4 flex-wrap">
                    <MetricPill label="R² Score" value={r2 > 0 ? r2.toFixed(3) : "—"} note="Test-set goodness of fit" good={r2 > 0.80} />
                    <MetricPill label="MAE" value={mae > 0 ? mae.toFixed(1) : "—"} unit="kWh/m²·yr" note="Test-set mean abs. error" good={mae < 8} />
                    {rmse > 0 && <MetricPill label="RMSE" value={rmse.toFixed(1)} unit="kWh/m²·yr" note="Test-set RMSE" good={rmse < 12} />}
                    {hasCv && <MetricPill label="CV-5 R²" value={`${cvR2Mean!.toFixed(3)}±${cvR2Std!.toFixed(3)}`} note="5-fold cross-val (mean±std)" good={(cvR2Mean || 0) > 0.80} />}
                    {hasCv && <MetricPill label="CV-5 MAE" value={`${cvMaeMean!.toFixed(1)}±${cvMaeStd!.toFixed(1)}`} unit="kWh/m²·yr" note="5-fold CV MAE (mean±std)" good={(cvMaeMean || 99) < 10} />}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* SHAP Chart */}
                <div className="lg:col-span-8 premium-card p-10 space-y-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-bold tracking-tight text-slate-100">SHAP Feature Attribution</h3>
                            <p className="text-sm text-slate-400 mt-1 max-w-md">
                                SHAP (SHapley Additive exPlanations) values show the marginal contribution of each 
                                input to the predicted EUI. <span className="text-accent font-semibold">Orange</span> = increases EUI; 
                                <span className="text-secondary font-semibold"> teal</span> = decreases EUI.
                            </p>
                            <p className="mt-2 text-[10px] text-slate-400 italic">
                                Ref: Lundberg & Lee (2017) NeurIPS <span className="citation-badge">SHAP</span>
                            </p>
                        </div>
                        <Target className="w-5 h-5 text-slate-300 shrink-0 mt-1" />
                    </div>

                    <div className="h-[380px] w-full">
                        {shapData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={shapData} layout="vertical" margin={{ left: 10, right: 20 }}>
                                    <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v.toFixed(1)}`} />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        tick={{ fill: '#475569', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em' }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={160}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const d = payload[0].payload;
                                                const meta = FEATURE_DESCRIPTIONS[d.rawName];
                                                return (
                                                    <div className="bg-slate-900 border border-white/10 p-5 rounded-2xl shadow-xl max-w-xs">
                                                        <p className="text-[9px] uppercase font-black tracking-widest text-slate-400 mb-1">{d.name}</p>
                                                        {meta && <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">{meta.note}</p>}
                                                        <p className="text-2xl font-bold text-slate-100">
                                                            {d.original > 0 ? '+' : ''}{d.original.toFixed(3)}
                                                            <span className="text-xs text-slate-400 font-medium ml-1">SHAP impact</span>
                                                        </p>
                                                        {meta?.ref && <p className="text-[9px] text-slate-400 mt-1 italic">Ref: {meta.ref}</p>}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={20}>
                                        {shapData.map((entry: any, index: number) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.original > 0 ? '#ea580c' : '#0C7277'}
                                                fillOpacity={0.85}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                <Activity className="w-10 h-10 mb-3 animate-pulse" />
                                <p className="text-sm italic">Run a simulation to generate SHAP attribution data</p>
                            </div>
                        )}
                    </div>

                    {/* Feature legend */}
                    {shapData.length > 0 && (
                        <div className="pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3">
                            {shapData.slice(0, 4).map((d: any) => {
                                const meta = FEATURE_DESCRIPTIONS[d.rawName];
                                return meta ? (
                                    <div key={d.rawName} className="flex items-start gap-2 p-3 rounded-xl bg-slate-800/50 border border-slate-100">
                                        <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", d.original > 0 ? "bg-accent" : "bg-secondary")} />
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-200">{meta.label}</span>
                                            <p className="text-[9px] text-slate-400 leading-relaxed">{meta.note}</p>
                                        </div>
                                    </div>
                                ) : null;
                            })}
                        </div>
                    )}
                    
                    {/* SHAP Interactions (Advanced) */}
                    {results?.evidence_panel?.shap_interactions && results.evidence_panel.shap_interactions.length > 0 && (
                        <div className="pt-6 border-t border-slate-100">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-4">Thermodynamic Interactions (Top Pairs)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {results.evidence_panel.shap_interactions.map((interaction: any, idx: number) => (
                                    <div key={idx} className="p-3 rounded-xl bg-slate-800/50 border border-slate-100 flex flex-col justify-between">
                                        <span className="text-xs font-bold text-slate-200 leading-tight mb-2">{interaction.pair}</span>
                                        <div className="flex items-end justify-between">
                                            <span className="text-[9px] text-slate-400 font-medium">Interaction Impact</span>
                                            <span className={cn("text-lg font-black tracking-tighter", interaction.impact > 0 ? "text-accent" : "text-secondary")}>
                                                {interaction.impact > 0 ? '+' : ''}{interaction.impact.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Hyperparameters */}
                    <div className="premium-card p-8 space-y-6">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-secondary" />
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Hyperparameters</h4>
                        </div>
                        <div className="space-y-4">
                            <ConfigRow label="Algorithm" value={algorithm} sub={algorithm === "XGBoost" ? "Chen & Guestrin, 2016 [1]" : algorithm === "RandomForest" ? "Breiman, 2001" : "Hoerl & Kennard, 1970"} />
                            <ConfigRow label="Max Depth" value={depth} sub="Controls overfitting" />
                            <ConfigRow label="Estimators" value={estimators} sub="Ensemble size" />
                            {alpha !== "N/A" && <ConfigRow label="Regularisation α" value={alpha} sub="L2 ridge penalty" />}
                        </div>
                    </div>

                    {/* Validation */}
                    <div className="premium-card p-8 space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Validation Methodology</h4>
                        <div className="space-y-3">
                            {[
                                { title: "Train/Test Split", body: "80/20 random split. Stratified on climate zone to prevent distribution leakage." },
                                { title: "Feature Set", body: "10 ECBC-derived features: U-values (wall, roof, glass), SHGC, WWR, CDD, HDD, solar radiation, HVAC COP, floor area." },
                                { title: "Uncertainty Band", body: "Approximate ±band = MAE × 1.96. Note: this is heuristic, not a calibrated 95% CI. [6]" },
                                { title: "Physics Guardrails", body: "Inputs outside physical bounds (e.g. SHGC > 1, CDD < 0) raise a hard validation error." },
                            ].map((item) => (
                                <div key={item.title} className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-secondary mt-1.5 shrink-0" />
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-200 block">{item.title}</span>
                                        <p className="text-[10px] text-slate-400 leading-relaxed">{item.body}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Training Data */}
                    <div className="premium-card p-8 space-y-4 bg-slate-800/50">
                        <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-secondary" />
                            <span className="text-xs font-bold text-slate-200">Training Dataset</span>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black italic text-slate-100">{trainingSamples.toLocaleString()}</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Records</span>
                            </div>
                            <p className="text-[10px] leading-relaxed text-slate-400">
                                Parametric samples generated from ECBC 2017-compliant building archetypes. 
                                Climate inputs from NASA POWER (22-year normals). Material properties from 
                                BMTPC / CPWD Schedule of Rates 2024.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Uncertainty disclaimer */}
            <div className="p-4 rounded-2xl bg-amber-500/20 border border-amber-200 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-800 leading-relaxed">
                    <span className="font-bold">Uncertainty note:</span> The prediction interval shown in results 
                    is computed as MAE × 1.96. This is a practical heuristic; it is <em>not</em> a formal 95% 
                    confidence interval (which requires RMSE and Gaussian residuals). For calibrated prediction 
                    intervals in building energy models, see Khosravi et al. (2011) IEEE TNNLS [6].
                </p>
            </div>

            {/* References */}
            <div className="premium-card p-8 space-y-5 border-white/10">
                <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-bold text-slate-100">References</h4>
                </div>
                <div className="space-y-3">
                    {REFERENCES.map((ref) => (
                        <div key={ref.id} className="flex gap-3 text-[10px] leading-relaxed font-mono text-slate-300">
                            <span className="text-primary font-bold shrink-0">{ref.id}</span>
                            <span>{ref.text}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function ConfigRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
        <div className="flex justify-between items-start group">
            <div>
                <span className="text-xs font-bold text-slate-400 lowercase tracking-widest block">{label}</span>
                {sub && <span className="text-[9px] text-slate-400 italic">{sub}</span>}
            </div>
            <span className="text-sm font-black text-slate-100 group-hover:text-secondary transition-colors italic">{value}</span>
        </div>
    );
}

function MetricPill({ label, value, unit, note, good }: { label: string; value: string; unit?: string; note: string; good: boolean }) {
    return (
        <div className={cn("p-4 rounded-2xl border flex flex-col", good ? "bg-emerald-500/10 border-emerald-500/30" : "bg-slate-800/50 border-white/10")}>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
            <div className="flex items-baseline gap-1 mt-1">
                <span className={cn("text-2xl font-black italic", good ? "text-emerald-400" : "text-slate-200")}>{value}</span>
                {unit && <span className="text-[9px] font-bold text-slate-400 uppercase">{unit}</span>}
            </div>
            <span className="text-[9px] text-slate-400 mt-0.5">{note}</span>
        </div>
    );
}

function InfoBadge({ text }: { text: string }) {
    return (
        <div className="group relative inline-block cursor-help">
            <Info className="w-3 h-3 text-slate-400 group-hover:text-slate-300" />
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-48 p-2 bg-slate-800 text-white text-[9px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible z-50 leading-relaxed">
                {text}
            </div>
        </div>
    );
}
