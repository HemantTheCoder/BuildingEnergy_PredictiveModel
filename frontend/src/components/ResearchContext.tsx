import { BookOpen, Database, FlaskConical, Globe, BarChart3, Layers, Shield, Cpu, Sun, Thermometer, Sparkles } from 'lucide-react';

const BEE_BENCHMARKS = [
    { label: "5-Star (Best Practice)", eui: "< 75", color: "bg-emerald-500", textColor: "text-emerald-700", bgLight: "bg-emerald-50 border-emerald-200" },
    { label: "4-Star (Efficient)",      eui: "75–100", color: "bg-primary",       textColor: "text-primary",       bgLight: "bg-blue-50 border-blue-200" },
    { label: "3-Star (Standard)",       eui: "100–125", color: "bg-sky-400",      textColor: "text-sky-700",       bgLight: "bg-sky-50 border-sky-200" },
    { label: "2-Star (Below Average)", eui: "125–150", color: "bg-yellow-400",    textColor: "text-yellow-700",    bgLight: "bg-yellow-50 border-yellow-200" },
    { label: "1-Star (Poor)",          eui: "150–175", color: "bg-orange-500",    textColor: "text-orange-700",    bgLight: "bg-orange-50 border-orange-200" },
    { label: "Non-Compliant (ECBC)",   eui: "> 175",   color: "bg-red-500",       textColor: "text-red-700",       bgLight: "bg-red-50 border-red-200" },
];

const BEE_ZONES = [
    { name: "Hot-Dry",    example: "Ahmedabad, Jodhpur, Nagpur", icon: "☀️", desc: "High solar + low humidity" },
    { name: "Warm-Humid", example: "Mumbai, Chennai, Kolkata",   icon: "💧", desc: "High solar + coastal humidity" },
    { name: "Composite",  example: "Delhi, Jaipur, Lucknow",     icon: "🌤", desc: "Mixed heating & cooling loads" },
    { name: "Temperate",  example: "Bangalore, Pune, Shillong",  icon: "🌿", desc: "Moderate year-round climate" },
    { name: "Cold",       example: "Shimla, Leh, Srinagar",      icon: "❄️", desc: "Heating dominated" },
];

const DATA_SOURCES = [
    { name: "NASA POWER",        role: "Climate data (CDD/HDD/GHI)", url: "https://power.larc.nasa.gov/" },
    { name: "BEE ECBC 2017",     role: "Compliance thresholds & benchmarks" },
    { name: "BMTPC",             role: "Thermal properties of building materials" },
    { name: "CPWD Schedule 2024",role: "Material specifications & cost indices" },
    { name: "IS 2553 / EN 673",  role: "Glazing U-value & SHGC standards" },
    { name: "SHAP (Lundberg 2017)", role: "ML explainability (feature attribution)" },
    { name: "NSGA-II Proxy",     role: "Generative optimization algorithm" },
];

const METHODOLOGY_STEPS = [
    {
        icon: <Globe className="w-4 h-4 text-primary" />,
        title: "Climate Retrieval",
        desc: "NASA POWER API (0.5° grid, 22-year normals) computes CDD₁₈.₃, HDD₁₈.₃, and mean daily GHI for the building location."
    },
    {
        icon: <Cpu className="w-4 h-4 text-secondary" />,
        title: "Surrogate ML Engine",
        desc: "XGBoost / Random Forest trained on 1,500+ parametric samples derived from ECBC-compliant building archetypes. SHAP values explain each prediction."
    },
    {
        icon: <FlaskConical className="w-4 h-4 text-accent" />,
        title: "Physics Hybrid Scaling",
        desc: "ML thermal baseline is scaled by operating schedule (hours/week) and occupancy heat gains (W/m²), then combined with deterministic plug-load EUI."
    },
    {
        icon: <Shield className="w-4 h-4 text-primary" />,
        title: "ECBC 2017 Compliance & LCCA",
        desc: "Checks envelope metrics against BEE ECBC 2017 thresholds, while the 30-Year LCCA projects dynamic NPV energy savings against the ECBC baseline."
    },
    {
        icon: <Sparkles className="w-4 h-4 text-emerald-500" />,
        title: "Generative AI Optimization",
        desc: "Batch evaluates 5,000 parametric variations via the XGBoost engine in milliseconds to return Pareto-optimal designs across EUI, Upfront Cost, and ROI."
    },
];

export default function ResearchContext() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* Header */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Research Context</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                    How This Tool Works
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">
                    ClimaBuild AI is a physics-informed machine learning surrogate for commercial building 
                    energy simulation in India, grounded in BEE ECBC 2017, NASA POWER climate data, 
                    BMTPC material standards, and ASHRAE thermal science.
                </p>
            </div>

            {/* BEE EUI Benchmark Reference */}
            <div className="premium-card p-6 space-y-4 border-slate-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-primary" />
                        <span className="text-sm font-bold text-slate-800">BEE Star Rating — EUI Benchmarks (Office Buildings)</span>
                    </div>
                    <span className="citation-badge">BEE Star Rating 2020</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                    Energy Use Intensity (kWh/m²·yr) reference ranges for commercial offices per the 
                    Bureau of Energy Efficiency Star Rating Programme for Buildings.
                </p>
                <div className="space-y-2">
                    {BEE_BENCHMARKS.map((b) => (
                        <div key={b.label} className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs font-semibold ${b.bgLight}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-2.5 h-2.5 rounded-full ${b.color}`} />
                                <span className={b.textColor}>{b.label}</span>
                            </div>
                            <span className="font-bold text-slate-700">{b.eui} kWh/m²·yr</span>
                        </div>
                    ))}
                </div>
                <p className="text-[10px] text-slate-400 italic mt-1">
                    Note: EUI benchmarks are archetype- and climate-zone-dependent. These ranges represent 
                    typical office buildings in composite/warm climates (Delhi, Mumbai, Bangalore).
                    Source: BEE Star Rating Programme for Commercial Buildings (2nd cycle, 2018–2020).
                </p>
            </div>

            {/* Two-column: Climate Zones + Methodology */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

                {/* BEE Climate Zones */}
                <div className="premium-card p-6 space-y-4 border-slate-200">
                    <div className="flex items-center gap-2">
                        <Thermometer className="w-4 h-4 text-secondary" />
                        <span className="text-sm font-bold text-slate-800">NBC 2016 / ECBC 2017 Climate Zones</span>
                        <span className="citation-badge ml-auto">NBC 2016 · SP 41</span>
                    </div>
                    <div className="space-y-2">
                        {BEE_ZONES.map((z) => (
                            <div key={z.name} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                                <span className="text-lg leading-none mt-0.5">{z.icon}</span>
                                <div className="min-w-0">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-xs font-bold text-slate-800">{z.name}</span>
                                        <span className="text-[10px] text-slate-400 italic">{z.desc}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5 font-medium">{z.example}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Simulation Methodology */}
                <div className="premium-card p-6 space-y-4 border-slate-200">
                    <div className="flex items-center gap-2">
                        <FlaskConical className="w-4 h-4 text-accent" />
                        <span className="text-sm font-bold text-slate-800">Simulation Methodology</span>
                    </div>
                    <div className="space-y-3">
                        {METHODOLOGY_STEPS.map((step, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                                    {step.icon}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-800">{step.title}</p>
                                    <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Data Sources */}
            <div className="premium-card p-6 space-y-4 border-slate-200">
                <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-secondary" />
                    <span className="text-sm font-bold text-slate-800">Data Provenance</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {DATA_SOURCES.map((src) => (
                        <div key={src.name} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-wide block">{src.name}</span>
                            <span className="text-[10px] text-slate-500 leading-relaxed">{src.role}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Limitations & Caveats */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
                <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-amber-700 uppercase">Known Limitations & Caveats</span>
                </div>
                <ul className="space-y-1.5 pl-1">
                    {[
                        "Surrogate ML model is trained on parametric simulations, not measured IoT/BMS data. Absolute EUI values have an estimated ±MAE×1.96 uncertainty band (heuristic, not a calibrated 95% CI).",
                        "Thermal Comfort index is a simplified envelope-based proxy — not a full ISO 7730 PMV calculation (which requires air velocity, clothing, and metabolic rate).",
                        "Sensitivity analysis varies each parameter ±50% in isolation (ceteris paribus); real interactions may differ.",
                        "Orientation factors (North 0.65×, South 1.0×, East 0.9×, West 1.15×) are climate-zone-averaged and do not account for site-specific shading or facade geometry.",
                        "Savings estimate uses a generic 180 kWh/m²·yr Indian commercial baseline. City- and archetype-specific baselines would improve accuracy.",
                    ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-[10px] text-amber-800 leading-relaxed">
                            <span className="text-amber-500 mt-0.5 shrink-0">•</span>
                            {item}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Key Literature */}
            <div className="premium-card p-6 space-y-4 border-slate-200">
                <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-accent" />
                    <span className="text-sm font-bold text-slate-800">Key Literature</span>
                </div>
                <div className="space-y-2 text-[10px] text-slate-600 leading-relaxed font-mono">
                    {[
                        "[1] BEE. Energy Conservation Building Code (ECBC) 2017. Ministry of Power, India.",
                        "[2] Bureau of Energy Efficiency. Star Rating Programme for Commercial Buildings, 2018–2020.",
                        "[3] Chen, T. & Guestrin, C. XGBoost: A Scalable Tree Boosting System. KDD 2016.",
                        "[4] Lundberg, S. & Lee, S.-I. A Unified Approach to Interpreting Model Predictions. NeurIPS 2017.",
                        "[5] Fanger, P.O. Thermal Comfort. Danish Technical Press, 1970.",
                        "[6] ISO 7730:2005. Ergonomics of the thermal environment — PMV and PPD. ISO.",
                        "[7] ASHRAE 55-2023. Thermal Environmental Conditions for Human Occupancy.",
                        "[8] BMTPC. Thermal Properties of Building Materials. Technical Document, 2020.",
                        "[9] NBC 2016. National Building Code of India. BIS SP 7.",
                        "[10] NASA POWER (2024). Prediction of Worldwide Energy Resources. NASA LaRC.",
                    ].map((ref) => (
                        <p key={ref} className="leading-relaxed">{ref}</p>
                    ))}
                </div>
            </div>

        </div>
    );
}
