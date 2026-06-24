import { useState, useEffect, useRef } from 'react';
import api from './lib/api';
import {
  Zap,
  Globe,
  Database,
  Cpu,
  BookOpen,
  RefreshCw,
  WifiOff,
  ArrowRightLeft,
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
import CityComparison from './components/CityComparison';


export default function App() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'simulator' | 'compare' | 'materials' | 'intelligence' | 'learn'>('simulator');
  const [error, setError] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);

  const [formData, setFormData] = useState<any>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'waking' | 'ready' | 'offline'>('checking');
  const wakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let attempt = 0;

    const ping = async () => {
      try {
        await api.get('/health', { timeout: 12000 });
        if (!cancelled) setBackendStatus('ready');
      } catch {
        if (!cancelled) {
          attempt += 1;
          if (attempt === 1) setBackendStatus('waking');
          if (attempt < 15) {
            wakeTimerRef.current = setTimeout(ping, 4000);
          } else {
            setBackendStatus('offline');
          }
        }
      }
    };

    ping();
    return () => {
      cancelled = true;
      if (wakeTimerRef.current) clearTimeout(wakeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (backendStatus === 'ready') {
      api.get(`/materials`).then(res => setMaterials(res.data)).catch(console.error);
    }
  }, [backendStatus]);

  const handlePredict = async (data: any = formData) => {
    if (!data) return;
    if (backendStatus === 'waking') {
      setError('The server is still waking up — this takes ~15s on first load. Please wait for the amber banner to disappear, then try again.');
      return;
    }
    if (backendStatus === 'offline') {
      setError('Cannot reach the backend server. Check that your Render deployment is running and VITE_API_URL is set correctly in Vercel.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(`/predict`, data);
      setResults(response.data);
    } catch (error: any) {
      console.error("Prediction failed", error);
      const isNetworkError = !error.response;
      let errMsg = error.response?.data?.detail || `Simulation failed.`;
      
      if (Array.isArray(errMsg)) {
        errMsg = errMsg.map((e: any) => `${e.loc?.join('.') || 'Field'}: ${e.msg}`).join(" | ");
      } else if (typeof errMsg === 'object') {
        errMsg = JSON.stringify(errMsg);
      }
      
      if (isNetworkError) {
        errMsg = `Network error — could not reach the backend. The Render server may still be waking up. Wait ~15s and try again.`;
      }
      
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };


  const tabs = [
    { id: 'simulator',   label: 'Simulator',          icon: Zap },
    { id: 'compare',     label: 'City Compare',        icon: ArrowRightLeft },
    { id: 'materials',   label: 'Material Library',    icon: Database },
    { id: 'intelligence',label: 'Model Intelligence',  icon: Cpu },
    { id: 'learn',       label: 'Learn',               icon: BookOpen },
  ];

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <div className="flex flex-col min-h-screen lg:h-screen lg:overflow-hidden selection:bg-primary/20 relative bg-slate-50 text-slate-900">
      {/* ── Top Navigation ── */}
      <nav className="fixed top-0 left-0 w-full z-[100] border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 md:px-8 h-14 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('simulator')}>
            <div className="h-9 md:h-14 flex items-center justify-start">
              <img src="/logo.png" alt="ClimaBuild AI Logo" className="h-full w-auto object-contain drop-shadow-sm" />
            </div>
          </div>

          {/* Desktop nav links — visible md+ */}
          <div className="hidden md:flex items-center gap-6 lg:gap-12">
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

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200">
              <Globe className="w-3 h-3 text-slate-500" />
              <span className="text-xs font-semibold text-slate-600">BEE Standards</span>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Backend status banners ── */}
      {backendStatus === 'waking' && (
        <div className="fixed top-14 md:top-20 left-0 right-0 z-[90] bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-2 text-sm text-amber-800 font-medium">
          <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
          Server is waking up on Render — first load takes ~15s. Please wait…
        </div>
      )}
      {backendStatus === 'offline' && (
        <div className="fixed top-14 md:top-20 left-0 right-0 z-[90] bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-center gap-2 text-sm text-red-700 font-medium">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          Cannot reach the backend server. Check your Render deployment or set VITE_API_URL correctly.
        </div>
      )}

      {/* ── Main content ── */}
      <main className={cn(
        "pb-20 md:pb-6 px-4 sm:px-6 md:px-8 max-w-[1700px] mx-auto w-full flex-grow relative z-10 lg:flex lg:min-h-0",
        backendStatus === 'waking' || backendStatus === 'offline'
          ? "pt-24 md:pt-30"
          : "pt-14 md:pt-20"
      )}>
        <AnimatePresence mode="wait">
          {activeTab === 'simulator' && (
            <motion.div
              key="simulator"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 w-full lg:h-full lg:min-h-0"
            >
              {/* Left panel — form */}
              <section className="lg:col-span-4 lg:flex lg:flex-col lg:min-h-0 border-b border-slate-200 pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
                <div className="space-y-1 page-enter shrink-0 mb-5 border-b border-slate-200 pb-5">
                  <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-800 flex flex-col gap-0.5">
                    <span>Performance</span>
                    <span className="text-slate-500">Simulation Setup</span>
                  </h1>
                </div>

                <div className="relative lg:flex-1 lg:min-h-0 lg:overflow-y-auto overflow-x-hidden lg:pr-4 premium-scrollbar">
                  <InputForm 
                    onPredict={handlePredict} 
                    onChange={setFormData}
                    loading={loading}
                    backendStatus={backendStatus}
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

              {/* Right panel — results */}
              <section className="lg:col-span-8 lg:flex lg:flex-col lg:min-h-0 lg:pl-2">
                <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto overflow-x-hidden lg:px-2 premium-scrollbar">
                {results ? (
                  <ResultsDashboard results={results} onPredict={handlePredict} formData={formData} />
                ) : (
                  <ResearchContext />
                )}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'compare' && (
            <motion.div
              key="compare"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full lg:h-full lg:min-h-0 lg:overflow-y-auto overflow-x-hidden lg:pr-2 premium-scrollbar"
            >
              <CityComparison />
            </motion.div>
          )}

          {activeTab === 'materials' && (
            <motion.div
              key="materials"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full lg:h-full lg:min-h-0 lg:overflow-y-auto overflow-x-hidden lg:pr-2 premium-scrollbar"
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
              className="w-full lg:h-full lg:min-h-0 lg:overflow-y-auto overflow-x-hidden lg:pr-2 premium-scrollbar"
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
              className="w-full lg:h-full lg:min-h-0 lg:overflow-y-auto overflow-x-hidden lg:pr-2 premium-scrollbar"
            >
              <KnowledgeBase />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Mobile bottom navigation bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200"
           style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="grid grid-cols-5 h-16">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 transition-colors active:scale-95",
                  isActive ? "text-primary" : "text-slate-400"
                )}
              >
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                  isActive ? "bg-primary/10" : "bg-transparent"
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={cn("text-[9px] font-bold uppercase tracking-wide leading-none",
                  isActive ? "text-primary" : "text-slate-400"
                )}>
                  {tab.label.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
