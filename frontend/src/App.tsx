import { useState, useEffect } from 'react';
import api from './lib/api';
import {
  Zap,
  Globe,
  Activity,
  Database,
  Cpu,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './lib/utils';
import InputForm from './components/InputForm';
import ResultsDashboard from './components/ResultsDashboard';
import MaterialLibrary from './components/MaterialLibrary';
import ModelIntelligence from './components/ModelIntelligence';
import KnowledgeBase from './components/KnowledgeBase';
import SplashScreen from './components/SplashScreen';
import ResearchContext from './components/ResearchContext';


export default function App() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'simulator' | 'materials' | 'intelligence' | 'learn'>('simulator');
  const [error, setError] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);

  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3500);
    return () => clearTimeout(timer);
  }, []);

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
      
      if (Array.isArray(errMsg)) {
        errMsg = errMsg.map((e: any) => `${e.loc?.join('.') || 'Field'}: ${e.msg}`).join(" | ");
      } else if (typeof errMsg === 'object') {
        errMsg = JSON.stringify(errMsg);
      }
      
      if (isNetworkError) {
        errMsg = `Connection failed to ${import.meta.env.VITE_API_URL || 'backend'}. Please ensure your VERCEL environment variable VITE_API_URL is set correctly and the backend at ${import.meta.env.VITE_API_URL} is running and accessible.`;
      }
      
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };


  const tabs = [
    { id: 'simulator',   label: 'Simulator',          icon: Zap },
    { id: 'materials',   label: 'Material Library',    icon: Database },
    { id: 'intelligence',label: 'Model Intelligence',  icon: Cpu },
    { id: 'learn',       label: 'Learn',               icon: BookOpen },
  ];

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <div className="h-screen overflow-hidden selection:bg-primary/20 relative flex flex-col bg-slate-50 text-slate-900">
      <nav className="fixed top-0 left-0 w-full z-[100] border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="max-w-[1500px] mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveTab('simulator')}>
            <div className="h-14 flex items-center justify-start ml-2">
              <img src="/logo.png" alt="ClimaBuild AI Logo" className="h-full w-auto object-contain drop-shadow-sm" />
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
            <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 border border-slate-200">
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-semibold text-slate-600">BEE Standards</span>
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
              <section className="lg:col-span-4 flex flex-col min-h-0 border-r border-slate-200 pr-8">
                <div className="space-y-2 page-enter shrink-0 mb-6 border-b border-slate-200 pb-6">
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-800 flex flex-col gap-1">
                    <span>Performance</span>
                    <span className="text-slate-500">Simulation Setup</span>
                  </h1>
                </div>

                <div className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-4 premium-scrollbar">
                  <InputForm 
                    onPredict={handlePredict} 
                    onChange={setFormData}
                    loading={loading} 
                  />
                  
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 p-4 rounded-2xl bg-orange-100 border border-orange-200 text-orange-600 text-xs font-bold text-center shrink-0"
                    >
                      {error}
                    </motion.div>
                  )}
                </div>
              </section>

              <section className="lg:col-span-8 flex flex-col min-h-0 pl-2">
                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 premium-scrollbar">
                {results ? (
                  <ResultsDashboard results={results} onPredict={handlePredict} formData={formData} />
                ) : (
                  <ResearchContext />
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

          {activeTab === 'learn' && (
            <motion.div
              key="learn"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full h-full min-h-0 overflow-y-auto overflow-x-hidden pr-2 premium-scrollbar"
            >
              <KnowledgeBase />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
