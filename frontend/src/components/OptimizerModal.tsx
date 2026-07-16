import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Activity, Droplets, Leaf, IndianRupee, CheckCircle2 } from 'lucide-react';
import api from '../lib/api';
import { cn } from '../lib/utils';

export default function OptimizerModal({ isOpen, setIsOpen, formData, onApply }: any) {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any>(null);

    useEffect(() => {
        if (isOpen && !results && !loading) {
            runOptimizer();
        }
    }, [isOpen]);

    const runOptimizer = async () => {
        setLoading(true);
        try {
            const res = await api.post('/optimize', formData);
            setResults(res.data);
        } catch (e) {
            console.error("Optimizer error:", e);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-slate-900 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 shadow-sm flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-100 tracking-tight">Generative Design Optimizer</h2>
                                <p className="text-xs text-slate-400">Evaluated 5,000 parameter combinations to find Pareto-optimal designs</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-900 rounded-full transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto premium-scrollbar bg-slate-800/50 flex-1">
                        {loading ? (
                            <div className="h-64 flex flex-col items-center justify-center space-y-4">
                                <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin"></div>
                                <p className="text-sm font-semibold text-slate-300 animate-pulse">Running Genetic Algorithm (5,000 Iterations)...</p>
                            </div>
                        ) : results ? (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {results.options.map((opt: any, i: number) => (
                                    <div key={i} className="bg-slate-900 rounded-2xl p-6 shadow-sm border border-white/10 hover:border-emerald-300 transition-colors flex flex-col">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-sm font-black text-slate-100 uppercase tracking-wider">{opt.name}</span>
                                            {i === 0 ? <Leaf className="w-5 h-5 text-emerald-500" /> : i === 1 ? <Activity className="w-5 h-5 text-blue-500" /> : <IndianRupee className="w-5 h-5 text-amber-500" />}
                                        </div>

                                        <div className="space-y-6 flex-1">
                                            {/* Key Metrics */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-100">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase">Predicted EUI</div>
                                                    <div className="text-xl font-black text-slate-100">{opt.predicted_eui}</div>
                                                    <div className="text-xs font-bold text-emerald-400">-{opt.improvement_pct}% vs ECBC</div>
                                                </div>
                                                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-100">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase">Est. Payback</div>
                                                    <div className="text-xl font-black text-slate-100">{opt.payback_years > 0 ? `${opt.payback_years} Yrs` : 'Immediate'}</div>
                                                    <div className="text-xs text-slate-400">ROI</div>
                                                </div>
                                                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-100">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase">Upfront Cost</div>
                                                    <div className="text-lg font-black text-slate-100">₹{(opt.estimated_cost/100000).toFixed(1)}L</div>
                                                </div>
                                                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-100">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase">Embodied Carbon</div>
                                                    <div className="text-lg font-black text-slate-100">{opt.embodied_carbon}</div>
                                                </div>
                                            </div>

                                            {/* Parameters */}
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider mb-3">Optimal Parameters</h4>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-slate-400">WWR</span>
                                                        <span className="font-bold text-slate-100">{(opt.wwr*100).toFixed(0)}%</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-slate-400">Wall U-Value</span>
                                                        <span className="font-bold text-slate-100">{opt.u_wall}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-slate-400">Roof U-Value</span>
                                                        <span className="font-bold text-slate-100">{opt.u_roof}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-slate-400">Glass U-Value</span>
                                                        <span className="font-bold text-slate-100">{opt.u_glass}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-slate-400">Glass SHGC</span>
                                                        <span className="font-bold text-slate-100">{opt.shgc}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-slate-400">HVAC COP</span>
                                                        <span className="font-bold text-slate-100">{opt.hvac_cop}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => {
                                                onApply(opt);
                                                setIsOpen(false);
                                            }}
                                            className="mt-6 w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-md hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle2 className="w-4 h-4" /> Apply This Design
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
