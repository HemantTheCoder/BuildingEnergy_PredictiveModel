import React, { useState } from 'react';
import { Database, Layers, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

export default function MaterialLibrary({ materials }: { materials: any[] }) {
    const [filter, setFilter] = useState('all');

    const categories = [
        { id: 'all', label: 'All Assemblies' },
        { id: 'wall', label: 'Wall Systems' },
        { id: 'roof', label: 'Roof Components' },
        { id: 'glazing', label: 'External Glazing' },
    ];

    const filteredMaterials = filter === 'all'
        ? materials
        : materials.filter(m => m.component_type === filter);

    return (
        <div className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-4">
                    <div className="section-label">Central Repository</div>
                    <h2 className="text-5xl font-bold tracking-tighter italic">Material <span className="text-primary not-italic">Intelligence</span></h2>
                    <p className="text-white/40 text-lg max-w-xl font-medium">
                        Authentic thermal properties sourced from BMTPC (Building Materials & Technology Promotion Council) and CPWD Standards.
                    </p>
                </div>

                <div className="flex gap-2 bg-white/[0.02] border border-white/[0.05] p-1.5 rounded-2xl backdrop-blur-3xl">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setFilter(cat.id)}
                            className={cn(
                                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                filter === cat.id
                                    ? "bg-primary text-black shadow-[0_0_20px_rgba(45,212,191,0.3)]"
                                    : "text-white/30 hover:text-white/60 hover:bg-white/5"
                            )}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {filteredMaterials.map((mat, i) => (
                    <motion.div
                        key={mat.name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="premium-card p-8 group relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-125 transition-transform duration-700">
                            <Database className="w-24 h-24" />
                        </div>

                        <div className="flex justify-between items-start mb-8 relative">
                            <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center border border-primary/10">
                                <Layers className="w-5 h-5 text-primary" />
                            </div>
                            <div className="text-[9px] font-bold text-white/20 uppercase tracking-[0.3em] bg-white/[0.03] px-3 py-1 rounded-full border border-white/[0.05]">
                                {mat.component_type}
                            </div>
                        </div>

                        <h4 className="text-xl font-bold text-white mb-6 group-hover:text-primary transition-colors duration-500">{mat.name}</h4>

                        <div className="grid grid-cols-2 gap-4">
                            <Property label="U-Value" value={mat.u_value} unit="W/m²·K" />
                            <Property label="Conductivity" value={mat.conductivity} unit="W/m·K" />
                            <Property label="Source" value={mat.official_ref || "Standard"} unit="Ref" />
                            <Property label="Citation" value={mat.source_citation || "BMTPC"} unit="Doc" />
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/[0.05] flex justify-between items-center group/btn">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Property Matrix</span>
                            {mat.source_url && (
                                <a href={mat.source_url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full border border-white/5 flex items-center justify-center hover:border-primary/40 hover:bg-primary/5 transition-all">
                                    <ArrowUpRight className="w-4 h-4 text-white/10 text-primary" />
                                </a>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

function Property({ label, value, unit }: any) {
    return (
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.03] space-y-1">
            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest leading-none">{label}</span>
            <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-bold text-white/80">{value}</span>
                <span className="text-[8px] font-bold text-white/10 uppercase">{unit}</span>
            </div>
        </div>
    );
}
