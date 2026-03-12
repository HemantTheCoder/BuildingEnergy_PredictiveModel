import { useState, useEffect, type FormEvent } from 'react';
import { MapPin, ChevronRight, Calculator, Cpu, Wind, Thermometer, Sun, Settings2, RefreshCcw, Layers, Activity } from 'lucide-react';
import axios from 'axios';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function InputForm({ onPredict, loading }: any) {
    const [cities, setCities] = useState<string[]>([]);
    const [modelInfo, setModelInfo] = useState({ available_models: ["XGBoost"], metrics: {} as any });
    const [manualClimate, setManualClimate] = useState(false);
    const [fetchingClimate, setFetchingClimate] = useState(false);

    const [formData, setFormData] = useState({
        city: "Mumbai, India",
        archetype: "office_small",
        floor_area_m2: 1200,
        wwr: 0.35,
        hvac_type: "VAV",
        orientation: "South",
        model_type: "XGBoost",
        material_overrides: {} as any,
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
    const [libraryMaterials, setLibraryMaterials] = useState<{name: string, type: string, props: any}[]>([]);
    const [customName, setCustomName] = useState("");

    const saveToLibrary = (type: 'wall' | 'roof' | 'glazing') => {
        if (!customName) return;
        const newMat = {
            name: `Custom: ${customName}`,
            type,
            props: { ...formData.property_overrides }
        };
        setLibraryMaterials([...libraryMaterials, newMat]);
        setCustomName("");
    };

    const [dbMaterials, setDbMaterials] = useState<any[]>([]);

    useEffect(() => {
        axios.get(`${API_BASE}/cities`)
            .then(res => {
                setCities(res.data);
                if (res.data.includes(formData.city)) {
                    fetchClimate(formData.city);
                }
            })
            .catch(console.error);

        axios.get(`${API_BASE}/models`).then(res => setModelInfo(res.data)).catch(console.error);
        axios.get(`${API_BASE}/materials`).then(res => setDbMaterials(res.data)).catch(console.error);
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

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onPredict({
            ...formData,
            climate_overrides: manualClimate ? formData.climate_overrides : null,
            property_overrides: manualMaterials ? formData.property_overrides : null
        });
    };

    return (
        <form onSubmit={handleSubmit} className="premium-card p-8 space-y-8 relative group overflow-hidden">
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
                        className="w-full glass-input h-14 text-base font-bold pl-8 group-hover:border-white/10 transition-all"
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
            <section className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-secondary/5 flex items-center justify-center border border-secondary/10">
                        <Cpu className="w-4 h-4 text-secondary" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">Simulation Model</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-1">ML Technique</label>
                        <select
                            className="w-full glass-input h-14 font-bold appearance-none bg-black border-primary/20"
                            value={formData.model_type}
                            onChange={(e) => setFormData({ ...formData, model_type: e.target.value })}
                        >
                            {modelInfo.available_models.map(m => (
                                <option key={m} value={m}>{m} ({((modelInfo.metrics[m]?.r2 || 0) * 100).toFixed(1)}% Acc.)</option>
                            ))}
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
            </section>

            {/* Section 2.1: Material Selection */}
            <section className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10">
                        <Layers className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">Baseline Envelope</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <MaterialSelect 
                        label="Wall Assembly" 
                        value={formData.material_overrides['wall']}
                        options={dbMaterials.filter(m => m.category === 'wall').map(m => m.name)}
                        customOptions={libraryMaterials.filter(m => m.type === 'wall').map(m => m.name)}
                        onChange={(val: string) => setFormData({ ...formData, material_overrides: { ...formData.material_overrides, wall: val } })}
                    />
                    <MaterialSelect 
                        label="Roof Strategy" 
                        value={formData.material_overrides['roof']}
                        options={dbMaterials.filter(m => m.category === 'roof').map(m => m.name)}
                        customOptions={libraryMaterials.filter(m => m.type === 'roof').map(m => m.name)}
                        onChange={(val: string) => setFormData({ ...formData, material_overrides: { ...formData.material_overrides, roof: val } })}
                    />
                    <MaterialSelect 
                        label="Glazing Config" 
                        value={formData.material_overrides['glazing']}
                        options={dbMaterials.filter(m => m.category === 'glazing').map(m => m.name)}
                        customOptions={libraryMaterials.filter(m => m.type === 'glazing').map(m => m.name)}
                        onChange={(val: string) => setFormData({ ...formData, material_overrides: { ...formData.material_overrides, glazing: val } })}
                    />
                </div>
            </section>

            <section className="space-y-3">
                <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-1">Net Floor Area (m²)</label>
                <div className="relative">
                    <input
                        type="number"
                        className="w-full glass-input h-14 text-lg font-black pr-20"
                        value={formData.floor_area_m2}
                        onChange={(e) => setFormData({ ...formData, floor_area_m2: Number(e.target.value) })}
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-sm text-primary italic">m²</div>
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
                            <div className="mt-6 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Material Identity</span>
                                </div>
                                <div className="flex gap-3">
                                    <input 
                                        type="text" 
                                        placeholder="Material Name (e.g. Bio-composite Wall)"
                                        value={customName}
                                        onChange={(e) => setCustomName(e.target.value)}
                                        className="flex-1 glass-input h-10 text-xs px-4"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => saveToLibrary('wall')}
                                        className="flex-1 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-500 text-[9px] font-black uppercase hover:bg-orange-500/20 transition-all"
                                    >
                                        Wall
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => saveToLibrary('roof')}
                                        className="flex-1 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[9px] font-black uppercase hover:bg-amber-500/20 transition-all"
                                    >
                                        Roof
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => saveToLibrary('glazing')}
                                        className="flex-1 h-10 rounded-xl bg-primary/10 border border-primary/30 text-primary text-[9px] font-black uppercase hover:bg-primary/20 transition-all"
                                    >
                                        Glass
                                    </button>
                                </div>
                                {libraryMaterials.length > 0 && (
                                    <div className="pt-2">
                                        <div className="text-[8px] font-black text-white/10 uppercase mb-2">Saved Library</div>
                                        <div className="flex flex-wrap gap-2">
                                            {libraryMaterials.map((m, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => setFormData({ 
                                                        ...formData, 
                                                        property_overrides: { ...m.props },
                                                        material_overrides: { ...formData.material_overrides, [m.type]: m.name }
                                                    })}
                                                    className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[8px] font-bold text-white/40 hover:text-white transition-colors"
                                                >
                                                    {m.name.replace('Custom: ', '')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <p className="mt-4 text-[9px] text-white/20 font-bold italic">
                                * Overriding these values will bypass the standard material selections.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </section>

            {/* Section 3: Orientation & Envelope */}
            <section className="space-y-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10">
                        <Sun className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">Building Orientation</span>
                </div>

                <div className="grid grid-cols-4 gap-4">
                    {['North', 'South', 'East', 'West'].map((dir) => (
                        <button
                            key={dir}
                            type="button"
                            onClick={() => setFormData({ ...formData, orientation: dir })}
                            className={cn(
                                "flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition-all relative group/dir",
                                formData.orientation === dir 
                                    ? "bg-primary/10 border-primary text-primary shadow-[0_0_20px_rgba(45,212,191,0.1)]" 
                                    : "bg-white/[0.02] border-white/[0.05] text-white/30 hover:border-white/10"
                            )}
                        >
                            <div className={cn(
                                "w-2 h-2 rounded-full mb-1 transition-all duration-500",
                                formData.orientation === dir ? "bg-primary scale-125" : "bg-white/10"
                            )} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{dir}</span>
                            
                            {formData.orientation === dir && (
                                <motion.div 
                                    layoutId="dir-glow"
                                    className="absolute inset-0 bg-primary/5 rounded-[inherit] -z-10"
                                />
                            )}
                        </button>
                    ))}
                </div>
                <p className="text-[9px] text-white/20 font-bold italic leading-relaxed">
                    * Direction affects solar intensity: West (Peak Load), North (Shaded), South (Base).
                </p>

                <div className="pt-6 space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-accent/5 flex items-center justify-center border border-accent/10">
                                <Wind className="w-4 h-4 text-accent" />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">Window to Wall Ratio</span>
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
                </div>
            </section>

            <button
                type="submit"
                disabled={loading || fetchingClimate}
                className="w-full btn-premium h-16 group disabled:opacity-50"
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
function MaterialSelect({ label, value, options, customOptions, onChange }: any) {
    return (
        <div className="space-y-3">
            <label className="text-[9px] font-black text-white/20 uppercase tracking-widest ml-1">{label}</label>
            <div className="relative group/sel">
                <select 
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full glass-input h-12 text-[11px] font-bold appearance-none bg-black/40 pr-10 border-white/5 hover:border-white/20 transition-all"
                >
                    <option value="">System Default</option>
                    {customOptions.length > 0 && (
                        <optgroup label="User Library">
                            {customOptions.map((opt: string) => (
                                <option key={opt} value={opt}>{opt.replace('Custom: ', '')}</option>
                            ))}
                        </optgroup>
                    )}
                    <optgroup label="Official Standards">
                        {options.map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </optgroup>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/10 group-hover/sel:text-primary transition-colors">
                    <ChevronRight className="w-3 h-3 rotate-90" />
                </div>
            </div>
        </div>
    );
}
