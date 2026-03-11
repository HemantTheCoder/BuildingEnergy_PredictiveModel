import React, { useState, useEffect } from 'react';
import { MapPin, ChevronRight, Calculator, Cpu, Wind, Thermometer, Sun, Settings2, RefreshCcw, Layers, Activity } from 'lucide-react';
import axios from 'axios';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = "http://localhost:8000";

export default function InputForm({ onPredict, loading }: any) {
    const [cities, setCities] = useState<string[]>([]);
    const [manualClimate, setManualClimate] = useState(false);
    const [fetchingClimate, setFetchingClimate] = useState(false);

    const [formData, setFormData] = useState({
        city: "Mumbai, India",
        archetype: "office_small",
        floor_area_m2: 1200,
        wwr: 0.35,
        hvac_type: "VAV",
        material_overrides: {},
        property_overrides: {
            u_wall: 2.1,
            u_roof: 3.1,
            u_glass: 5.8,
            shgc: 0.82
        },
        climate_overrides: {
            cdd: 2500,
            hdd: 100,
            annual_solrad: 5.5
        }
    });

    const [manualMaterials, setManualMaterials] = useState(false);

    useEffect(() => {
        axios.get(`${API_BASE}/cities`).then(res => setCities(res.data)).catch(console.error);
    }, []);

    const fetchClimate = async (cityName: string) => {
        setFetchingClimate(true);
        try {
            const res = await axios.get(`${API_BASE}/fetch_climate?city=${encodeURIComponent(cityName)}`);
            setFormData(prev => ({
                ...prev,
                city: cityName,
                climate_overrides: {
                    cdd: res.data.cdd,
                    hdd: res.data.hdd,
                    annual_solrad: res.data.annual_solrad
                }
            }));
        } catch (error) {
            console.error("Failed to fetch climate", error);
        } finally {
            setFetchingClimate(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onPredict({
            ...formData,
            climate_overrides: manualClimate ? formData.climate_overrides : null,
            property_overrides: manualMaterials ? formData.property_overrides : null
        });
    };

    return (
        <form onSubmit={handleSubmit} className="premium-card p-12 space-y-12 relative group overflow-hidden">
            {/* Visual Accent */}
            <div className="absolute top-0 right-12 w-40 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

            {/* Section 1: Geographic Intelligence */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10">
                            <MapPin className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">Geographic Context</span>
                    </div>
                    {fetchingClimate && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="flex items-center gap-2 text-[10px] font-bold text-primary italic"
                        >
                            <RefreshCcw className="w-3 h-3 animate-spin" />
                            Fetching Climatology...
                        </motion.div>
                    )}
                </div>

                <div className="relative group">
                    <input
                        list="indian-cities"
                        type="text"
                        value={formData.city}
                        className="w-full glass-input h-16 text-lg font-bold pl-8 group-hover:border-white/10 transition-all"
                        onChange={(e) => {
                            setFormData({ ...formData, city: e.target.value });
                            if (cities.includes(e.target.value)) fetchClimate(e.target.value);
                        }}
                        placeholder="Select or enter city..."
                    />
                    <datalist id="indian-cities">
                        {cities.map(c => <option key={c} value={c} />)}
                    </datalist>

                    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setManualClimate(!manualClimate)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all h-9",
                                manualClimate ? "bg-primary/20 border-primary text-primary" : "bg-white/[0.03] border-white/[0.05] text-white/30 hover:text-white/60"
                            )}
                        >
                            <Settings2 className="w-3.5 h-3.5" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Override</span>
                        </button>
                    </div>
                </div>

                <AnimatePresence>
                    {manualClimate && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="grid grid-cols-3 gap-4 pt-4">
                                <ClimateField
                                    icon={<Thermometer className="w-3 h-3 text-rose-500" />}
                                    label="CDD"
                                    value={formData.climate_overrides.cdd}
                                    onChange={(v: number) => setFormData({ ...formData, climate_overrides: { ...formData.climate_overrides, cdd: v } })}
                                />
                                <ClimateField
                                    icon={<Wind className="w-3 h-3 text-sky-500" />}
                                    label="HDD"
                                    value={formData.climate_overrides.hdd}
                                    onChange={(v: number) => setFormData({ ...formData, climate_overrides: { ...formData.climate_overrides, hdd: v } })}
                                />
                                <ClimateField
                                    icon={<Sun className="w-3 h-3 text-amber-500" />}
                                    label="SOLRAD"
                                    value={formData.climate_overrides.annual_solrad}
                                    onChange={(v: number) => setFormData({ ...formData, climate_overrides: { ...formData.climate_overrides, annual_solrad: v } })}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </section>

            {/* Section 2: Model Configuration */}
            <section className="space-y-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-secondary/5 flex items-center justify-center border border-secondary/10">
                        <Cpu className="w-4 h-4 text-secondary" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">Simulation Model</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-1">Building Profile</label>
                        <select
                            className="w-full glass-input h-14 font-bold appearance-none bg-black"
                            value={formData.archetype}
                            onChange={(e) => setFormData({ ...formData, archetype: e.target.value })}
                        >
                            <option value="office_small">Small Office</option>
                            <option value="office_medium">Medium Institutional</option>
                            <option value="retail">Commercial / Retail</option>
                            <option value="healthcare">Critical Care / Healthcare</option>
                        </select>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-1">HVAC System</label>
                        <select
                            className="w-full glass-input h-14 font-bold appearance-none bg-black"
                            value={formData.hvac_type}
                            onChange={(e) => setFormData({ ...formData, hvac_type: e.target.value })}
                        >
                            <option value="VAV">Pneumatic VAV</option>
                            <option value="Split AC">Direct Expansion (DX)</option>
                            <option value="Variable Refrigerant Flow (VRF)">Advanced VRF</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-1">Net Floor Area (m²)</label>
                    <div className="relative">
                        <input
                            type="number"
                            className="w-full glass-input h-14 text-xl font-black pr-20"
                            value={formData.floor_area_m2}
                            onChange={(e) => setFormData({ ...formData, floor_area_m2: Number(e.target.value) })}
                        />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-sm text-primary italic">m²</div>
                    </div>
                </div>
            </section>

            {/* Section 2.5: Material Performance Overrides */}
            <section className="space-y-6">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-orange-500/5 flex items-center justify-center border border-orange-500/10">
                            <Layers className="w-4 h-4 text-orange-500" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">Thermal Performance</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setManualMaterials(!manualMaterials)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all h-9",
                            manualMaterials ? "bg-orange-500/20 border-orange-500 text-orange-500" : "bg-white/[0.03] border-white/[0.05] text-white/30 hover:text-white/60"
                        )}
                    >
                        <Settings2 className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Custom Specs</span>
                    </button>
                </div>

                <AnimatePresence>
                    {manualMaterials && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <ClimateField
                                    icon={<Layers className="w-3 h-3 text-orange-500" />}
                                    label="Wall U-Value"
                                    value={formData.property_overrides.u_wall}
                                    onChange={(v: number) => setFormData({ ...formData, property_overrides: { ...formData.property_overrides, u_wall: v } })}
                                />
                                <ClimateField
                                    icon={<Layers className="w-3 h-3 text-orange-500" />}
                                    label="Roof U-Value"
                                    value={formData.property_overrides.u_roof}
                                    onChange={(v: number) => setFormData({ ...formData, property_overrides: { ...formData.property_overrides, u_roof: v } })}
                                />
                                <ClimateField
                                    icon={<Sun className="w-3 h-3 text-amber-500" />}
                                    label="Glass U-Value"
                                    value={formData.property_overrides.u_glass}
                                    onChange={(v: number) => setFormData({ ...formData, property_overrides: { ...formData.property_overrides, u_glass: v } })}
                                />
                                <ClimateField
                                    icon={<Activity className="w-3 h-3 text-primary" />}
                                    label="Glass SHGC"
                                    value={formData.property_overrides.shgc}
                                    onChange={(v: number) => setFormData({ ...formData, property_overrides: { ...formData.property_overrides, shgc: v } })}
                                />
                            </div>
                            <p className="mt-4 text-[9px] text-white/20 font-bold italic">
                                * Overriding these values will bypass the standard material selections.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </section>

            {/* Section 3: Envelope Transparency */}
            <section className="space-y-8">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-accent/5 flex items-center justify-center border border-accent/10">
                            <Wind className="w-4 h-4 text-accent" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">Envelope Analysis</span>
                    </div>
                    <div className="text-3xl font-black text-primary italic tracking-tight">{(formData.wwr * 100).toFixed(0)}<span className="text-sm not-italic opacity-40 ml-1">%</span></div>
                </div>

                <div className="relative pt-2 pb-4">
                    <input
                        type="range"
                        min="0.05"
                        max="0.8"
                        step="0.05"
                        className="w-full h-2 bg-white/5 rounded-full appearance-none cursor-pointer accent-primary hover:accent-secondary transition-all"
                        value={formData.wwr}
                        onChange={(e) => setFormData({ ...formData, wwr: Number(e.target.value) })}
                    />
                </div>
            </section>

            <button
                type="submit"
                disabled={loading || fetchingClimate}
                className="w-full btn-premium h-20 group disabled:opacity-50"
            >
                {loading ? (
                    <div className="flex items-center gap-4">
                        <RefreshCcw className="w-5 h-5 animate-spin" />
                        <span className="font-black text-[10px] tracking-widest uppercase italic">Synthesizing EUI Forecast...</span>
                    </div>
                ) : (
                    <>
                        <Calculator className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                        <span className="mt-0.5">Initialize Thermal Simulation</span>
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-500 ease-out" />
                    </>
                )}
            </button>
        </form>
    );
}

function ClimateField({ icon, label, value, onChange }: any) {
    return (
        <div className="space-y-2 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
            <div className="flex items-center gap-2">
                {icon}
                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">{label}</span>
            </div>
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full bg-transparent text-sm font-bold focus:outline-none text-white/80"
            />
        </div>
    );
}
