import { useState } from 'react';
import { Database, Layers, ArrowUpRight, Leaf, Shield, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

const TYPE_COLORS: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
    wall:    { bg: "bg-primary/10",   border: "border-primary/20",   icon: "text-primary",   badge: "bg-primary/10 text-primary border-primary/20" },
    roof:    { bg: "bg-secondary/10", border: "border-secondary/20", icon: "text-secondary", badge: "bg-secondary/10 text-secondary border-secondary/20" },
    glazing: { bg: "bg-accent/10",    border: "border-accent/20",    icon: "text-accent",    badge: "bg-accent/10 text-accent border-accent/20" },
};

function getECBCContext(material: any): { label: string; color: string } | null {
    const u = parseFloat(material.u_value);
    const type = material.component_type;
    if (type === "wall") {
        if (u <= 0.44) return { label: "SuperECBC ✓", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
        if (u <= 0.80) return { label: "ECBC 2017 ✓",  color: "text-sky-700 bg-sky-50 border-sky-200" };
    }
    if (type === "roof") {
        if (u <= 0.20) return { label: "SuperECBC ✓", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
        if (u <= 0.40) return { label: "ECBC 2017 ✓",  color: "text-sky-700 bg-sky-50 border-sky-200" };
    }
    if (type === "glazing") {
        if (u <= 1.80) return { label: "SuperECBC ✓", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
        if (u <= 3.30) return { label: "ECBC 2017 ✓",  color: "text-sky-700 bg-sky-50 border-sky-200" };
    }
    return null;
}

function getCarbonLabel(carbon: number): { label: string; color: string } {
    if (carbon < 0)    return { label: "Carbon-Negative", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    if (carbon < 0.50) return { label: "Low Carbon",      color: "text-sky-700 bg-sky-50 border-sky-200" };
    if (carbon < 1.50) return { label: "Medium Carbon",   color: "text-yellow-700 bg-yellow-50 border-yellow-200" };
    return               { label: "High Carbon",          color: "text-red-700 bg-red-50 border-red-200" };
}

export default function MaterialLibrary({ materials }: { materials: any[] }) {
    const [filter, setFilter] = useState('all');
    const [sortBy, setSortBy] = useState<'u_value' | 'carbon' | 'cost'>('u_value');

    const categories = [
        { id: 'all',     label: 'All Assemblies' },
        { id: 'wall',    label: 'Wall Systems' },
        { id: 'roof',    label: 'Roof Components' },
        { id: 'glazing', label: 'External Glazing' },
    ];

    const filtered = (filter === 'all' ? materials : materials.filter(m => m.component_type === filter))
        .slice()
        .sort((a, b) => {
            if (sortBy === 'u_value') return parseFloat(a.u_value) - parseFloat(b.u_value);
            if (sortBy === 'carbon')  return parseFloat(a.embodied_carbon ?? 99) - parseFloat(b.embodied_carbon ?? 99);
            if (sortBy === 'cost')    return parseInt(a.cost_index ?? 5) - parseInt(b.cost_index ?? 5);
            return 0;
        });

    return (
        <div className="space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-4">
                    <div className="section-label">Central Repository · BMTPC / CPWD / ECBC 2017</div>
                    <h2 className="text-5xl font-bold tracking-tighter text-slate-800 italic">Material <span className="text-primary not-italic">Intelligence</span></h2>
                    <p className="text-slate-500 text-base max-w-xl font-medium leading-relaxed">
                        Thermal properties sourced from BMTPC Schedule 2020, CPWD Schedule of Rates 2024, 
                        BEE ECBC 2017, and international standards (EN 673, NFRC 100, IS 2553).
                        Embodied carbon values from BEE ENS 2018 and IEA EBC Annexes.
                    </p>
                </div>
            </div>

            {/* Filters + Sort */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex gap-2 bg-white border border-slate-200 p-1.5 rounded-2xl shadow-sm">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setFilter(cat.id)}
                            className={cn(
                                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                filter === cat.id
                                    ? "bg-primary text-white shadow-sm"
                                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    <span>Sort:</span>
                    {[
                        { id: 'u_value', label: 'U-Value (low→high)' },
                        { id: 'carbon',  label: 'Carbon' },
                        { id: 'cost',    label: 'Cost Index' },
                    ].map(s => (
                        <button
                            key={s.id}
                            onClick={() => setSortBy(s.id as any)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg border transition-all",
                                sortBy === s.id
                                    ? "bg-primary text-white border-primary"
                                    : "bg-white border-slate-200 text-slate-500 hover:text-slate-700"
                            )}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-[10px] font-semibold">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-emerald-700">SuperECBC threshold</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-sky-400" /><span className="text-sky-700">ECBC 2017 compliant</span></div>
                <div className="flex items-center gap-1.5"><Leaf className="w-3 h-3 text-emerald-600" /><span className="text-slate-500">Carbon-negative</span></div>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filtered.map((mat, i) => {
                    const typeStyle = TYPE_COLORS[mat.component_type] || TYPE_COLORS.wall;
                    const ecbcTag = getECBCContext(mat);
                    const carbon = parseFloat(mat.embodied_carbon ?? 0);
                    const carbonLabel = getCarbonLabel(carbon);
                    const costDots = Math.min(10, parseInt(mat.cost_index ?? 5));
                    const shgc = parseFloat(mat.shgc);

                    return (
                        <motion.div
                            key={mat.id || mat.name}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(i * 0.04, 0.6) }}
                            className="premium-card p-6 group relative overflow-hidden flex flex-col gap-4"
                        >
                            {/* Background watermark */}
                            <div className="absolute top-0 right-0 p-6 opacity-[0.04] group-hover:scale-110 transition-transform duration-700 text-slate-500">
                                <Database className="w-20 h-20" />
                            </div>

                            {/* Top row */}
                            <div className="flex items-start justify-between relative">
                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", typeStyle.bg, typeStyle.border)}>
                                    <Layers className={cn("w-4 h-4", typeStyle.icon)} />
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest", typeStyle.badge)}>
                                        {mat.component_type}
                                    </span>
                                    {ecbcTag && (
                                        <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", ecbcTag.color)}>
                                            {ecbcTag.label}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Name */}
                            <h4 className="text-base font-bold text-slate-800 group-hover:text-primary transition-colors duration-300 leading-tight">{mat.name}</h4>

                            {/* Key properties grid */}
                            <div className="grid grid-cols-2 gap-2">
                                <Property label="U-Value" value={parseFloat(mat.u_value).toFixed(2)} unit="W/m²·K" highlight={parseFloat(mat.u_value) < 0.5} />
                                <Property label="Conductivity λ" value={parseFloat(mat.conductivity).toFixed(3)} unit="W/m·K" />
                                <Property label="Density ρ" value={mat.density} unit="kg/m³" />
                                <Property label="Thickness" value={mat.thickness} unit="mm" />
                                {!isNaN(shgc) && <Property label="SHGC" value={shgc.toFixed(2)} unit="—" highlight={shgc < 0.30} />}
                                <Property label="Cp" value={mat.specific_heat} unit="J/kg·K" />
                            </div>

                            {/* Carbon + Cost row */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                                    <div className="flex items-center gap-1">
                                        <Leaf className="w-3 h-3 text-emerald-600" />
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Embodied Carbon</span>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className={cn("text-sm font-bold", carbon < 0 ? "text-emerald-700" : "text-slate-800")}>
                                            {carbon >= 0 ? "+" : ""}{carbon.toFixed(2)}
                                        </span>
                                        <span className="text-[8px] text-slate-400 uppercase">kgCO₂e/kg</span>
                                    </div>
                                    <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded-full border inline-block", carbonLabel.color)}>
                                        {carbonLabel.label}
                                    </span>
                                </div>

                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                                    <div className="flex items-center gap-1">
                                        <Flame className="w-3 h-3 text-amber-500" />
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cost Index</span>
                                    </div>
                                    <div className="flex gap-0.5 mt-1.5 flex-wrap">
                                        {Array.from({ length: 10 }).map((_, idx) => (
                                            <div
                                                key={idx}
                                                className={cn("w-2.5 h-2.5 rounded-sm", idx < costDots ? "bg-primary" : "bg-slate-200")}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-[8px] text-slate-400">{costDots}/10 relative cost</span>
                                </div>
                            </div>

                            {/* Citation footer */}
                            <div className="pt-3 border-t border-slate-100 space-y-1">
                                <div className="flex items-start gap-1.5">
                                    <Shield className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                                    <p className="text-[9px] text-slate-500 leading-relaxed font-medium">{mat.source_citation || "BMTPC / CPWD"}</p>
                                </div>
                                {mat.official_ref && (
                                    <span className="citation-badge">{mat.official_ref}</span>
                                )}
                            </div>

                            {/* External link */}
                            {mat.source_url && (
                                <a
                                    href={mat.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute bottom-4 right-4 w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center hover:border-primary/40 hover:bg-primary/5 transition-all bg-white shadow-sm"
                                >
                                    <ArrowUpRight className="w-3 h-3 text-primary" />
                                </a>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Footnote */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-[10px] text-slate-500 leading-relaxed space-y-1">
                <p className="font-bold text-slate-700">Notes on data provenance:</p>
                <p>U-values for wall and roof assemblies include standard surface resistances (Rsi = 0.13 m²K/W, Rso = 0.04 m²K/W) per IS 3792 / ISO 6946. Glazing U-values are centre-of-glass per NFRC 100 / EN 673. Embodied carbon values (kgCO₂e/kg) are approximate; they represent cradle-to-gate scope and vary by regional manufacturing processes. Cost indices are relative (1=Low, 10=High) and should be validated against current CPWD Schedule of Rates for the project location.</p>
            </div>
        </div>
    );
}

function Property({ label, value, unit, highlight = false }: { label: string; value: any; unit: string; highlight?: boolean }) {
    return (
        <div className={cn("p-3 rounded-xl border space-y-0.5", highlight ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200")}>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none block">{label}</span>
            <div className="flex items-baseline gap-1">
                <span className={cn("text-sm font-bold", highlight ? "text-emerald-700" : "text-slate-800")}>
                    {typeof value === 'number' ? value : (isNaN(parseFloat(value)) ? value : value)}
                </span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">{unit}</span>
            </div>
        </div>
    );
}
