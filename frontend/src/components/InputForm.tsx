import { useState, useEffect, type FormEvent } from 'react';
import { MapPin, ChevronRight, Calculator, Cpu, Wind, Thermometer, Sun, Settings2, RefreshCcw, Layers, Activity, Info, UploadCloud, Globe, WifiOff } from 'lucide-react';
import api from '../lib/api';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const ARCHETYPE_DEFAULTS: Record<string, { hours: number, occ: number, eq: number }> = {
    office_small: { hours: 50, occ: 0.1, eq: 10.0 },
    office_medium: { hours: 55, occ: 0.15, eq: 12.0 },
    retail: { hours: 80, occ: 0.25, eq: 25.0 },
    healthcare: { hours: 168, occ: 0.20, eq: 30.0 }
};

export default function InputForm({ onPredict, onChange, loading, backendStatus }: any) {
    const [cities, setCities] = useState<string[]>([]);
    const [manualClimate, setManualClimate] = useState(false);
    const [fetchingClimate, setFetchingClimate] = useState(false);
    const [uploadingEPW, setUploadingEPW] = useState(false);
    const [climateSource, setClimateSource] = useState<'nasa'|'epw'>('nasa');
    const [detectedEPWCity, setDetectedEPWCity] = useState<string | null>(null);
    const [epwStatus, setEpwStatus] = useState<{type: 'success'|'error'; msg: string} | null>(null);
    const [isAdvancedMode, setIsAdvancedMode] = useState(false);

    const [formData, setFormData] = useState({
        city: "Mumbai, India",
        archetype: "office_small",
        floor_area_m2: 1200,
        wwr: 0.35,
        hvac_type: "VAV",
        operating_hours: 50,
        occupancy_density: 0.1,
        equipment_load: 10.0,
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

    const [dbMaterials, setDbMaterials] = useState<any[]>([]);

    useEffect(() => {
        if (onChange) {
            onChange(formData);
        }
    }, [formData, onChange]);

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

    useEffect(() => {
        const handleApplyDesign = (e: any) => {
            const opt = e.detail;
            if (!opt) return;
            setFormData(prev => ({
                ...prev,
                wwr: opt.wwr,
                property_overrides: {
                    ...prev.property_overrides,
                    u_wall: opt.u_wall,
                    u_roof: opt.u_roof,
                    u_glass: opt.u_glass,
                    shgc: opt.shgc
                }
            }));
            // After setting state, we need to trigger predict. 
            // We use setTimeout to ensure state is updated first.
            setTimeout(() => {
                const submitBtn = document.getElementById('run-sim-btn');
                if (submitBtn) submitBtn.click();
            }, 100);
        };
        window.addEventListener('applyOptimizedDesign', handleApplyDesign);
        
        api.get(`/cities`)
            .then(res => {
                setCities(res.data);
                if (res.data.some((c: string) => c.toLowerCase() === formData.city.toLowerCase())) {
                    fetchClimate(formData.city);
                }
            })
            .catch(console.error);

        api.get(`/materials`).then(res => setDbMaterials(res.data)).catch(console.error);
        
        return () => window.removeEventListener('applyOptimizedDesign', handleApplyDesign);
    }, []);

    const fetchClimate = async (cityName: string) => {
        setFetchingClimate(true);
        try {
            const res = await api.get(`/fetch_climate?city=${encodeURIComponent(cityName)}`);
            setFormData(prev => ({
                ...prev,
                city: cityName,
                climate_overrides: {
                    cdd: res.data.cdd,
                    hdd: res.data.hdd,
                    annual_solrad: res.data.annual_solrad,
                    metadata: res.data.metadata || { source: 'NASA POWER' }
                }
            }));
        } catch (error) {
            console.error("Failed to fetch climate", error);
        } finally {
            setFetchingClimate(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingEPW(true);
        const formPayload = new FormData();
        formPayload.append("file", file);

        try {
            const res = await api.post('/upload_epw', formPayload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setFormData(prev => ({
                ...prev,
                city: res.data.city || prev.city,
                climate_overrides: {
                    cdd: res.data.cdd,
                    hdd: res.data.hdd,
                    annual_solrad: res.data.annual_solrad,
                    metadata: res.data.metadata
                }
            }));
            setManualClimate(true);
            setDetectedEPWCity(res.data.city);
            setEpwStatus({ type: 'success', msg: `Parsed: ${res.data.metadata?.source || file.name}` });
        } catch (err) {
            setEpwStatus({ type: 'error', msg: 'Failed to parse EPW file. Check the file format.' });
            console.error(err);
        } finally {
            setUploadingEPW(false);
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
        <form onSubmit={handleSubmit} className="premium-card p-6 space-y-8 relative group text-slate-100">
            
            {/* Mode Toggle Bar */}
            <div className="flex border-b border-white/10 mb-6 pb-2">
                <button
                    type="button"
                    onClick={() => setIsAdvancedMode(false)}
                    className={cn(
                        "px-6 py-2 text-sm font-semibold transition-all relative",
                        !isAdvancedMode ? "text-primary bg-primary/5 rounded-t-lg" : "text-slate-400 hover:text-slate-100"
                    )}
                >
                    Simple Mode
                    {!isAdvancedMode && <div className="absolute bottom-[-9px] left-0 w-full h-[2px] bg-primary" />}
                </button>
                <button
                    type="button"
                    onClick={() => setIsAdvancedMode(true)}
                    className={cn(
                        "px-6 py-2 text-sm font-semibold transition-all relative",
                        isAdvancedMode ? "text-primary bg-primary/5 rounded-t-lg" : "text-slate-400 hover:text-slate-100"
                    )}
                >
                    Advanced Editor
                    {isAdvancedMode && <div className="absolute bottom-[-9px] left-0 w-full h-[2px] bg-primary" />}
                </button>
            </div>

            {/* Section 1: Geographic Intelligence */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <span className="section-label m-0 p-0 border-0 flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> Location & Climate
                    </span>
                    {fetchingClimate && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="flex items-center gap-2 text-xs font-semibold text-primary"
                        >
                            <RefreshCcw className="w-3 h-3 animate-spin" />
                            Fetching Climatology...
                        </motion.div>
                    )}
                </div>

                <div className="flex bg-slate-800/60/50 p-1 rounded-xl w-full mb-2 border border-white/10">
                    <button 
                        type="button" 
                        onClick={() => setClimateSource('nasa')} 
                        className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", climateSource === 'nasa' ? "bg-slate-900 shadow-sm text-primary" : "text-slate-400 hover:text-slate-200")}
                    >
                        NASA POWER API (Auto)
                    </button>
                    <button 
                        type="button" 
                        onClick={() => setClimateSource('epw')} 
                        className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", climateSource === 'epw' ? "bg-slate-900 shadow-sm text-primary" : "text-slate-400 hover:text-slate-200")}
                    >
                        EPW File Upload
                    </button>
                </div>

                {climateSource === 'nasa' ? (
                    <div className="relative group flex gap-3">
                        <div className="relative flex-1">
                            <input
                                list="indian-cities"
                                type="text"
                                value={formData.city}
                                className="w-full glass-input h-12 text-sm pl-10 bg-slate-900"
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setFormData({ ...formData, city: val });
                                    if (cities.some(c => c.toLowerCase() === val.toLowerCase())) {
                                        fetchClimate(val);
                                    }
                                }}
                                placeholder="Select or enter city..."
                            />
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <datalist id="indian-cities">
                                {cities.map(c => <option key={c} value={c}>{c}</option>)}
                            </datalist>
                        </div>

                        <button
                            type="button"
                            title="Force Climate Fetch"
                            onClick={() => fetchClimate(formData.city)}
                            className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-800/50 border border-white/10 hover:bg-slate-800/60 transition-all text-slate-400"
                        >
                            <RefreshCcw className={cn("w-4 h-4", fetchingClimate && "animate-spin")} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setManualClimate(!manualClimate)}
                            className={cn(
                                "flex items-center gap-2 px-4 h-12 rounded-xl border transition-all text-sm font-semibold",
                                manualClimate ? "bg-primary/10 border-primary/30 text-primary" : "bg-slate-800/50 border-white/10 text-slate-300 hover:text-slate-100"
                            )}
                        >
                            <Settings2 className="w-4 h-4" />
                            Override
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <label className={cn(
                            "flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed transition-all cursor-pointer",
                            uploadingEPW ? "bg-slate-800/50 border-white/20 opacity-70" : "bg-slate-900 border-white/20 hover:border-primary hover:bg-primary/5"
                        )}>
                            <UploadCloud className={cn("w-6 h-6 text-slate-400 mb-2", uploadingEPW && "animate-bounce text-primary")} />
                            <span className="text-sm font-semibold text-slate-300">{uploadingEPW ? 'Parsing Data...' : 'Drop EPW file here or click to browse'}</span>
                            <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold">Standard .epw weather format</span>
                            <input type="file" accept=".epw" className="hidden" onChange={handleFileUpload} disabled={uploadingEPW} />
                        </label>
                        {epwStatus && (
                            <div className={cn(
                                "flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border",
                                epwStatus.type === 'success'
                                    ? "bg-emerald-500/20 border-emerald-200 text-emerald-700"
                                    : "bg-red-500/20 border-red-200 text-red-700"
                            )}>
                                {epwStatus.type === 'success' ? '✓' : '✗'} {epwStatus.msg}
                            </div>
                        )}
                        <div className="flex items-start justify-between gap-4 mt-1">
                            <div className="flex flex-col gap-1.5">
                                <a href="https://climate.onebuilding.org/" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary hover:underline flex items-start gap-1.5 pt-1 max-w-[200px]">
                                    <Globe className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                    <span>Download EPW from Climate.OneBuilding</span>
                                </a>
                                {detectedEPWCity && (
                                    <div className="flex items-center gap-2 mt-2 bg-slate-800/50 border border-white/10 px-3 py-1.5 rounded-lg w-fit">
                                        <MapPin className="w-3 h-3 text-secondary" />
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Detected: </span>
                                        <span className="text-xs font-bold text-slate-100">{detectedEPWCity}</span>
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setManualClimate(!manualClimate)}
                                className={cn(
                                    "flex items-center gap-2 px-4 h-9 rounded-lg border transition-all text-xs font-semibold",
                                    manualClimate ? "bg-primary/10 border-primary/30 text-primary" : "bg-slate-800/50 border-white/10 text-slate-400 hover:text-slate-100"
                                )}
                            >
                                <Settings2 className="w-3.5 h-3.5" />
                                {manualClimate ? 'Hide Extracted Data' : 'View Extracted Data'}
                            </button>
                        </div>
                    </div>
                )}

                <AnimatePresence>
                    {manualClimate && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                                <ClimateField
                                    icon={<Thermometer className="w-4 h-4 text-orange-500" />}
                                    label="Cooling Degree Days"
                                    value={formData.climate_overrides.cdd}
                                    onChange={(v: number) => setFormData({ ...formData, climate_overrides: { ...formData.climate_overrides, cdd: v } })}
                                />
                                <ClimateField
                                    icon={<Wind className="w-4 h-4 text-sky-500" />}
                                    label="Heating Degree Days"
                                    value={formData.climate_overrides.hdd}
                                    onChange={(v: number) => setFormData({ ...formData, climate_overrides: { ...formData.climate_overrides, hdd: v } })}
                                />
                                <ClimateField
                                    icon={<Sun className="w-4 h-4 text-yellow-500" />}
                                    label="Solar Radiation"
                                    value={formData.climate_overrides.annual_solrad}
                                    onChange={(v: number) => setFormData({ ...formData, climate_overrides: { ...formData.climate_overrides, annual_solrad: v } })}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </section>

            {/* Section 2: Model Configuration */}
            <section className="space-y-4">
                <span className="section-label m-0 p-0 border-0 flex items-center gap-2">
                    <Cpu className="w-4 h-4" /> Building Profile
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Primary Archetype</label>
                        <select
                            className="w-full glass-input h-12"
                            value={formData.archetype}
                            onChange={(e) => {
                                const val = e.target.value;
                                const defaults = ARCHETYPE_DEFAULTS[val] || ARCHETYPE_DEFAULTS['office_small'];
                                setFormData({ 
                                    ...formData, 
                                    archetype: val,
                                    operating_hours: defaults.hours,
                                    occupancy_density: defaults.occ,
                                    equipment_load: defaults.eq
                                });
                            }}
                        >
                            <option value="office_small">Small Office</option>
                            <option value="office_medium">Medium Institutional</option>
                            <option value="retail">Commercial / Mall</option>
                            <option value="healthcare">Healthcare / Clinic</option>
                        </select>
                        {!isAdvancedMode && (
                            <div className="mt-2 p-2 bg-slate-800/50 border border-white/10 rounded text-[10px] text-slate-400 font-medium leading-relaxed">
                                <span className="font-bold text-slate-200">Physics Defaults Applied: </span>
                                {ARCHETYPE_DEFAULTS[formData.archetype]?.hours || 50} hrs/wk, {ARCHETYPE_DEFAULTS[formData.archetype]?.occ || 0.1} ppl/m², {ARCHETYPE_DEFAULTS[formData.archetype]?.eq || 10.0} W/m².<br/>
                                <span className="text-primary italic">Toggle Advanced Editor to manually override.</span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Net Floor Area (m²)</label>
                        <div className="relative">
                            <input
                                type="number"
                                className="w-full glass-input h-12 pr-12"
                                value={formData.floor_area_m2}
                                onChange={(e) => setFormData({ ...formData, floor_area_m2: Number(e.target.value) })}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 font-medium text-sm text-slate-400">m²</div>
                        </div>
                    </div>

                    {isAdvancedMode && (
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Simulation Model</label>
                            <select
                                name="model_type"
                                value={formData.model_type}
                                onChange={(e) => setFormData({ ...formData, model_type: e.target.value })}
                                className="w-full bg-slate-800/50 border border-white/10 text-slate-100 text-xs rounded-xl focus:ring-secondary focus:border-secondary transition-all px-4 py-3 appearance-none font-bold"
                            >
                                <option value="XGBoost">XGBoost API</option>
                                <option value="RandomForest">Random Forest</option>
                                <option value="RidgeRegression">Ridge Regression</option>
                                <option value="StackedEnsemble">Stacked Ensemble (XGB+RF+Ridge)</option>
                            </select>
                        </div>
                    )}

                    {isAdvancedMode && (
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">HVAC Strategy</label>
                            <select
                                className="w-full glass-input h-12"
                                value={formData.hvac_type}
                                onChange={(e) => setFormData({ ...formData, hvac_type: e.target.value })}
                            >
                                <option value="Split/Window AC">Split / Window AC</option>
                                <option value="Central Chiller (VAV)">Central Water-Cooled Chiller</option>
                                <option value="Variable Refrigerant Flow (VRF)">Inverter VRF</option>
                                <option value="Evaporative Cooler">Evaporative Cooler</option>
                            </select>
                        </div>
                    )}

                    {isAdvancedMode && (
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                                Operating Hours / Wk <Definition text="Hours the building is fully active per week." />
                            </label>
                            <input
                                type="number" step="1" min="10" max="168"
                                className="w-full glass-input h-12"
                                value={formData.operating_hours}
                                onChange={(e) => setFormData({ ...formData, operating_hours: Number(e.target.value) })}
                            />
                        </div>
                    )}

                    {isAdvancedMode && (
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                                Occupancy Density <Definition text="Personnel density (ppl/m²)." />
                            </label>
                            <input
                                type="number" step="0.01" min="0.01" max="1.0"
                                className="w-full glass-input h-12"
                                value={formData.occupancy_density}
                                onChange={(e) => setFormData({ ...formData, occupancy_density: Number(e.target.value) })}
                            />
                        </div>
                    )}

                    {isAdvancedMode && (
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                                Plug Loads (W/m²) <Definition text="Equipment heat load." />
                            </label>
                            <input
                                type="number" step="1" min="0" max="100"
                                className="w-full glass-input h-12"
                                value={formData.equipment_load}
                                onChange={(e) => setFormData({ ...formData, equipment_load: Number(e.target.value) })}
                            />
                        </div>
                    )}
                </div>
            </section>

            {/* Section 2.1: Material Selection */}
            {isAdvancedMode && (
                <section className="space-y-4">
                    <span className="section-label m-0 p-0 border-0 flex items-center gap-2">
                        <Layers className="w-4 h-4" /> Baseline Envelope Settings
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <MaterialSelect 
                            label="Wall Assembly" 
                            value={formData.material_overrides['wall']}
                            options={dbMaterials.filter(m => m.component_type === 'wall').map(m => m.name)}
                            customOptions={libraryMaterials.filter(m => m.type === 'wall').map(m => m.name)}
                            onChange={(val: string) => setFormData({ ...formData, material_overrides: { ...formData.material_overrides, wall: val } })}
                        />
                        <MaterialSelect 
                            label="Roof Strategy" 
                            value={formData.material_overrides['roof']}
                            options={dbMaterials.filter(m => m.component_type === 'roof').map(m => m.name)}
                            customOptions={libraryMaterials.filter(m => m.type === 'roof').map(m => m.name)}
                            onChange={(val: string) => setFormData({ ...formData, material_overrides: { ...formData.material_overrides, roof: val } })}
                        />
                        <MaterialSelect 
                            label="Glazing Config" 
                            value={formData.material_overrides['glazing']}
                            options={dbMaterials.filter(m => m.component_type === 'glazing').map(m => m.name)}
                            customOptions={libraryMaterials.filter(m => m.type === 'glazing').map(m => m.name)}
                            onChange={(val: string) => setFormData({ ...formData, material_overrides: { ...formData.material_overrides, glazing: val } })}
                        />
                    </div>
                </section>
            )}

            {/* Section 2.5: Thermal Performance Overrides */}
            {isAdvancedMode && (
                <section className="space-y-4 border-t border-white/10 pt-4">
                     <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-accent flex items-center gap-2">
                            <Layers className="w-4 h-4" /> Thermal Performance Overrides
                        </span>
                        <button
                            type="button"
                            onClick={() => setManualMaterials(!manualMaterials)}
                            className={cn(
                                "flex items-center gap-2 px-4 h-9 rounded-xl border transition-all text-xs font-semibold",
                                manualMaterials ? "bg-orange-100 border-orange-300 text-orange-600" : "bg-slate-800/50 border-white/10 text-slate-400 hover:text-slate-200"
                            )}
                        >
                            <Settings2 className="w-3.5 h-3.5" />
                            Use Custom Specs
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
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-4">
                                    <ClimateField
                                        icon={<Layers className="w-3 h-3 text-accent" />}
                                        label="Wall U-Value"
                                        value={formData.property_overrides.u_wall}
                                        onChange={(v: number) => setFormData({ ...formData, property_overrides: { ...formData.property_overrides, u_wall: v } })}
                                    />
                                    <ClimateField
                                        icon={<Layers className="w-3 h-3 text-accent" />}
                                        label="Roof U-Value"
                                        value={formData.property_overrides.u_roof}
                                        onChange={(v: number) => setFormData({ ...formData, property_overrides: { ...formData.property_overrides, u_roof: v } })}
                                    />
                                    <ClimateField
                                        icon={<Sun className="w-3 h-3 text-yellow-500" />}
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
                                
                                <div className="p-4 rounded-xl border border-white/10 bg-slate-800/50 space-y-3">
                                    <div className="text-xs font-semibold text-slate-400">Save to Project Library</div>
                                    <div className="flex gap-3">
                                        <input 
                                            type="text" 
                                            placeholder="Assembly Name"
                                            value={customName}
                                            onChange={(e) => setCustomName(e.target.value)}
                                            className="flex-1 glass-input h-10 text-sm"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => saveToLibrary('wall')}
                                            className="px-4 h-10 rounded-lg bg-slate-900 border border-white/10 text-orange-600 text-xs font-semibold hover:bg-slate-800/60 transition-all"
                                        >
                                            Save Wall
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => saveToLibrary('roof')}
                                            className="px-4 h-10 rounded-lg bg-slate-900 border border-white/10 text-yellow-600 text-xs font-semibold hover:bg-slate-800/60 transition-all"
                                        >
                                            Save Roof
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => saveToLibrary('glazing')}
                                            className="px-4 h-10 rounded-lg bg-slate-900 border border-white/10 text-primary text-xs font-semibold hover:bg-slate-800/60 transition-all"
                                        >
                                            Save Glass
                                        </button>
                                    </div>
                                    {libraryMaterials.length > 0 && (
                                        <div className="pt-2">
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
                                                        className="px-3 py-1.5 rounded-md bg-slate-900 border border-white/10 text-xs font-medium text-slate-300 hover:text-slate-50 transition-colors shadow-sm"
                                                    >
                                                        {m.name.replace('Custom: ', '')}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>
            )}

            {/* Section 3: Orientation & WWR */}
            {isAdvancedMode && (
                <section className="space-y-4">
                    <span className="section-label m-0 p-0 border-0 flex items-center gap-2">
                        <Sun className="w-4 h-4" /> Solar & Envelope Design
                    </span>
                    
                    <div className="grid grid-cols-4 gap-4">
                        {['North', 'South', 'East', 'West'].map((dir) => (
                            <button
                                key={dir}
                                type="button"
                                onClick={() => setFormData({ ...formData, orientation: dir })}
                                className={cn(
                                    "p-3 rounded-xl border transition-all text-sm font-semibold flex items-center justify-center gap-2 shadow-sm",
                                    formData.orientation === dir 
                                        ? "bg-primary/10 border-primary/40 text-primary" 
                                        : "bg-slate-900 border-white/10 text-slate-400 hover:bg-slate-800/50"
                                )}
                            >
                                <div className={cn(
                                    "w-1.5 h-1.5 rounded-full transition-all duration-300",
                                    formData.orientation === dir ? "bg-primary" : "bg-slate-300"
                                )} />
                                {dir}
                            </button>
                        ))}
                    </div>
                </section>
            )}

            <section className="space-y-4 pb-4">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                         Window to Wall Ratio (WWR)
                    </label>
                    <div className="text-xl font-bold text-primary">{(formData.wwr * 100).toFixed(0)}%</div>
                </div>

                <div className="relative pt-2 pb-4">
                    <input
                        type="range"
                        min="0.05"
                        max="0.8"
                        step="0.05"
                        className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-primary hover:accent-primary-light transition-all"
                        value={formData.wwr}
                        onChange={(e) => setFormData({ ...formData, wwr: Number(e.target.value) })}
                    />
                </div>
            </section>

            <button
                type="submit"
                disabled={loading || fetchingClimate || backendStatus === 'waking' || backendStatus === 'offline' || backendStatus === 'checking'}
                className="w-full btn-premium h-14 group disabled:opacity-50 text-sm"
            >
                {loading ? (
                    <div className="flex items-center gap-3">
                        <RefreshCcw className="w-5 h-5 animate-spin" />
                        <span className="font-semibold text-sm">Processing Simulation...</span>
                    </div>
                ) : backendStatus === 'waking' || backendStatus === 'checking' ? (
                    <div className="flex items-center gap-3">
                        <RefreshCcw className="w-5 h-5 animate-spin" />
                        <span className="font-semibold text-sm">Waiting for server…</span>
                    </div>
                ) : backendStatus === 'offline' ? (
                    <div className="flex items-center gap-3">
                        <WifiOff className="w-5 h-5" />
                        <span className="font-semibold text-sm">Backend Offline</span>
                    </div>
                ) : (
                    <>
                        <Calculator className="w-5 h-5" />
                        <span>Run Energy Simulation</span>
                        <ChevronRight className="w-5 h-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </>
                )}
            </button>
        </form>
    );
}

function Definition({ text }: { text: string }) {
    return (
        <div className="tooltip-wrap align-middle">
            <Info className="w-3.5 h-3.5 text-slate-400 hover:text-primary transition-colors" />
            <div className="info-tooltip" style={{width: '220px'}}>
                {text}
            </div>
        </div>
    );
}

function ClimateField({ icon, label, value, onChange }: any) {
    return (
        <div className="space-y-2 p-3 rounded-xl bg-slate-900 border border-white/10 shadow-sm">
            <div className="flex items-center gap-2">
                {icon}
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
            </div>
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full bg-transparent text-lg font-bold focus:outline-none text-slate-100"
            />
        </div>
    );
}

function MaterialSelect({ label, value, options, customOptions, onChange }: any) {
    return (
        <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</label>
            <div className="relative group/sel">
                <select 
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full glass-input h-12 text-sm appearance-none pr-10 bg-slate-900"
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
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover/sel:text-primary transition-colors">
                    <ChevronRight className="w-4 h-4 rotate-90" />
                </div>
            </div>
        </div>
    );
}
