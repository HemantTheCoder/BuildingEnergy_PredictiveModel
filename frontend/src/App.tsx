import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Zap,
  Globe,
  Menu,
  ShieldCheck,
  Activity,
  Sparkles,
  Database,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './lib/utils';
import InputForm from './components/InputForm';
import ResultsDashboard from './components/ResultsDashboard';
import MaterialLibrary from './components/MaterialLibrary';
import ModelIntelligence from './components/ModelIntelligence';

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'simulator' | 'materials' | 'intelligence'>('simulator');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios.get(`${API_BASE}/materials`).then(res => setMaterials(res.data)).catch(console.error);
  }, []);

  const handlePredict = async (formData: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE}/predict`, formData);
      setResults(response.data);
    } catch (error: any) {
      console.error("Prediction failed", error);
      setError(error.response?.data?.detail || "Connection failed. Please ensure the backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'simulator', label: 'Simulator', icon: Zap },
    { id: 'materials', label: 'Material Library', icon: Database },
    { id: 'intelligence', label: 'Model Intelligence', icon: Cpu },
  ];

  return (
    <div className="min-h-screen selection:bg-primary/30 relative flex flex-col">
      <div className="mesh-gradient" />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-[100] border-b border-white/[0.03] bg-black/40 backdrop-blur-3xl">
        <div className="max-w-[1500px] mx-auto px-8 h-24 flex items-center justify-between">
          <div className="flex items-center gap-5 group cursor-pointer" onClick={() => setActiveTab('simulator')}>
            <div className="w-14 h-14 bg-primary rounded-[1.25rem] flex items-center justify-center shadow-[0_0_40px_rgba(45,212,191,0.2)] group-hover:scale-110 transition-transform duration-500 ease-out">
              <Zap className="w-8 h-8 text-black" fill="currentColor" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-tighter leading-none flex items-center gap-2">
                ECOSTRUCTURE <span className="text-white/20 font-light translate-y-[2px]">|</span> <span className="text-primary italic font-black">AI</span>
              </span>
              <span className="text-[9px] font-black tracking-[0.4em] text-white/30 uppercase mt-1">Sustainable Systems</span>
            </div>
          </div>

          <div className="hidden xl:flex items-center gap-12">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn("tab-link", activeTab === tab.id && "active")}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
              <Globe className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Asia • Mumbai-IND</span>
            </div>
            <button className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] transition-all">
              <Menu className="w-5 h-5 text-white/60" />
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-16 px-8 max-w-[1600px] mx-auto w-full flex-grow">
        <AnimatePresence mode="wait">
          {activeTab === 'simulator' && (
            <motion.div
              key="simulator"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-10"
            >
              <section className="lg:col-span-4 space-y-12">
                <div className="space-y-6 page-enter">
                  <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-primary/5 border border-primary/10">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(45,212,191,0.5)]" />
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/80">Active Simulation Engine v4.0</span>
                  </div>

                  <h1 className="text-5xl font-bold tracking-tighter leading-[0.9] text-white">
                    Designing <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary italic">Tomorrow's</span> Efficiency.
                  </h1>

                  <p className="text-lg text-white/40 font-medium leading-relaxed max-w-md">
                    Precision EUI forecasting for Indian climates, powered by NASA and BMTPC.
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-5xl blur-2xl opacity-20 -z-10" />
                  <InputForm onPredict={handlePredict} loading={loading} />
                  
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold text-center"
                    >
                      {error}
                    </motion.div>
                  )}
                </div>
              </section>

              <section className="lg:col-span-8">
                {results ? (
                  <ResultsDashboard results={results} />
                ) : (
                  <div className="h-full premium-card p-20 flex flex-col items-center justify-center text-center group relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10 animate-pulse-slow" />
                    <div className="relative mb-12">
                      <div className="w-36 h-36 bg-white/[0.02] border border-white/[0.05] rounded-[3rem] flex items-center justify-center group-hover:scale-110 transition-transform duration-700">
                        <Sparkles className="w-16 h-16 text-white/5 group-hover:text-primary/40 transition-colors duration-500" />
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-black rounded-2xl flex items-center justify-center border border-white/5">
                        <Activity className="w-5 h-5 text-primary/60" />
                      </div>
                    </div>
                    <h3 className="text-4xl font-bold mb-6 tracking-tight">Intelligence Ready</h3>
                    <p className="text-white/30 max-w-md text-xl leading-relaxed mb-12 font-medium">
                      Configure your project parameters to initialize the hyper-spectral energy transition model.
                    </p>
                    <div className="grid grid-cols-2 gap-6 w-full max-w-sm">
                      {[{ label: 'NASA Power', status: 'Linked', color: 'bg-emerald-500' }, { label: 'BMTPC Core', status: 'Active', color: 'bg-sky-500' }].map(sys => (
                        <div key={sys.label} className="p-5 rounded-3xl bg-white/[0.02] border border-white/[0.05] flex flex-col items-center gap-3">
                          <div className={cn("w-2 h-2 rounded-full", sys.color, "animate-pulse")} />
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/30">{sys.label}</span>
                          <span className="text-xs font-bold text-white/60">{sys.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </motion.div>
          )}

          {activeTab === 'materials' && (
            <motion.div
              key="materials"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <MaterialLibrary materials={materials} />
            </motion.div>
          )}

          {activeTab === 'intelligence' && (
            <motion.div
              key="intelligence"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
            >
              <ModelIntelligence results={results} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Extreme Footer */}
      <footer className="border-t border-white/[0.03] bg-black/60 py-16">
        <div className="max-w-[1500px] mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-white/40" />
              </div>
              <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Government Standards Validated</span>
            </div>
            <p className="text-white/20 text-[11px] leading-relaxed max-w-xs font-medium">
              Developed for the Climate-Aware Architectural Competition. All rights reserved © 2026.
            </p>
          </div>
          <div className="flex items-center gap-12 text-white/30 text-[10px] font-black uppercase tracking-[0.3em]">
            <a href="#" className="hover:text-primary transition-all">Security</a>
            <a href="#" className="hover:text-primary transition-all">API Docs</a>
            <a href="#" className="hover:text-primary transition-all">Materials</a>
            <a href="#" className="hover:text-primary transition-all">Sustainability</a>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none">Global Relay</span>
              <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_15px_rgba(45,212,191,0.6)] animate-pulse" />
            </div>
            <span className="text-[9px] font-medium text-white/20 tracking-tighter">SERVER IND-CLUSTER-001 • v4.28.1 ALPHA</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
