import { useState, useEffect } from 'react';
import api from './lib/api';
import {
  Zap,
  Globe,
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


export default function App() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'simulator' | 'materials' | 'intelligence'>('simulator');
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    api.get(`/materials`).then(res => setMaterials(res.data)).catch(console.error);
  }, []);

  const handlePredict = async (data: any = formData) => {
    if (!data) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(`/predict`, data);
      setResults(response.data);
    } catch (error: any) {
      console.error("Prediction failed", error);
      const isNetworkError = !error.response;
      let errMsg = error.response?.data?.detail || `Connection failed.`;
      
      if (isNetworkError) {
        errMsg = `Connection failed to ${import.meta.env.VITE_API_URL || 'backend'}. Please ensure your VERCEL environment variable VITE_API_URL is set correctly and the backend at ${import.meta.env.VITE_API_URL} is running and accessible (no trailing slashes recommended).`;
      }
      
      setError(errMsg);
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
    <div className="h-screen overflow-hidden selection:bg-primary/30 relative flex flex-col bg-[#050505]">
      <div className="mesh-gradient absolute inset-0 z-0 pointer-events-none" />

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
          </div>
        </div>
      </nav>

      <main className="pt-28 pb-6 px-8 max-w-[1700px] mx-auto w-full flex-grow relative z-10 flex min-h-0">
        <AnimatePresence mode="wait">
          {activeTab === 'simulator' && (
            <motion.div
              key="simulator"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full h-full min-h-0"
            >
              <section className="lg:col-span-4 flex flex-col min-h-0">
                <div className="space-y-4 page-enter shrink-0 mb-6">
                  <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(45,212,191,0.5)]" />
                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/80">Active Simulation Engine v4.0</span>
                  </div>

                  <h1 className="text-4xl font-bold tracking-tighter leading-[0.9] text-white">
                    Designing <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary italic">Tomorrow's</span> Efficiency.
                  </h1>
                </div>

                <div className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-2 premium-scrollbar">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-5xl blur-2xl opacity-10 -z-10" />
                  <InputForm 
                    onPredict={handlePredict} 
                    onChange={setFormData}
                    loading={loading} 
                  />
                  
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold text-center shrink-0"
                    >
                      {error}
                    </motion.div>
                  )}
                </div>
              </section>

              <section className="lg:col-span-8 flex flex-col min-h-0">
                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-2 premium-scrollbar">
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
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'materials' && (
            <motion.div
              key="materials"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full h-full min-h-0 overflow-y-auto overflow-x-hidden pr-2 premium-scrollbar"
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
              className="w-full h-full min-h-0 overflow-y-auto overflow-x-hidden pr-2 premium-scrollbar"
            >
              <ModelIntelligence results={results} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Removed Huge Footer to save vertical height constraint in Dashboard mode */}
    </div>
  );
}
