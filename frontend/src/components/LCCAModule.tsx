import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ReferenceDot } from 'recharts';
import { IndianRupee, TrendingUp, Settings2 } from 'lucide-react';

export default function LCCAModule({ formData, predicted_eui, baseline_eui }: any) {
    const [elecRate, setElecRate] = useState(9.0);
    const [discountRate, setDiscountRate] = useState(8.0);
    const [inflationRate, setInflationRate] = useState(4.0);

    const lccaData = useMemo(() => {
        const area = formData?.floor_area_m2 || 1200;
        
        // Match backend cost proxy logic
        const calcCost = (wwr: number, u_wall: number, u_roof: number, u_glass: number, shgc: number, hvac_cop: number) => {
            let base = 25000.0 * (area / 100.0);
            base += (wwr * 100.0) * 500.0;
            if (shgc < 0.3) base += 15000.0;
            if (u_glass < 2.0) base += 20000.0;
            if (hvac_cop > 4.0) base += 35000.0;
            if (u_wall < 0.8) base += 12000.0;
            if (u_roof < 0.5) base += 18000.0;
            return base;
        };

        const cop_map: Record<string, number> = {
            "Split/Window AC": 2.8,
            "VAV": 4.0,
            "Central Chiller (VAV)": 4.0,
            "Variable Refrigerant Flow (VRF)": 3.8,
            "Evaporative Cooler": 8.0,
        };
        const current_cop = cop_map[formData?.hvac_type || "VAV"] || 3.0;

        const current_upfront = calcCost(
            formData?.wwr || 0.4,
            formData?.property_overrides?.u_wall || 1.5,
            formData?.property_overrides?.u_roof || 1.2,
            formData?.property_overrides?.u_glass || 3.3,
            formData?.property_overrides?.shgc || 0.4,
            current_cop
        );

        // ECBC Baseline Cost (WWR=40, U=0.8, U=0.4, U=3.3, SHGC=0.4, COP=3.0)
        const baseline_upfront = calcCost(0.4, 0.8, 0.4, 3.3, 0.4, 3.0);

        const years = Array.from({ length: 31 }, (_, i) => i);
        let current_cum = current_upfront;
        let baseline_cum = baseline_upfront;

        const base_energy_cost_yr0 = baseline_eui * area * elecRate;
        const curr_energy_cost_yr0 = predicted_eui * area * elecRate;

        const data: any[] = [];
        let paybackYear: number | null = null;

        for (let y = 0; y <= 30; y++) {
            if (y > 0) {
                const infFactor = Math.pow(1 + inflationRate / 100, y);
                const discFactor = Math.pow(1 + discountRate / 100, y);
                
                const curr_cost_y = (curr_energy_cost_yr0 * infFactor) / discFactor;
                const base_cost_y = (base_energy_cost_yr0 * infFactor) / discFactor;

                current_cum += curr_cost_y;
                baseline_cum += base_cost_y;
            }

            if (paybackYear === null && y > 0 && current_cum < baseline_cum && current_upfront > baseline_upfront) {
                paybackYear = y;
            }

            data.push({
                year: y,
                current: current_cum / 100000, // In Lakhs
                baseline: baseline_cum / 100000,
            });
        }

        return { data, paybackYear, current_upfront, baseline_upfront };
    }, [formData, predicted_eui, baseline_eui, elecRate, discountRate, inflationRate]);

    const formatRupee = (val: number) => `₹${val.toFixed(1)}L`;

    return (
        <div className="premium-card bg-slate-900 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                        30-Year Lifecycle Cost Analysis (LCCA)
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Cumulative Net Present Value (NPV) vs ECBC Baseline</p>
                    <p className="text-[10px] text-amber-600 font-semibold mt-0.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500/200 inline-block"></span>
                        Cost values are relative comparison indices, not absolute construction estimates (CPWD 2024).
                    </p>
                </div>

                {lccaData.paybackYear ? (
                    <div className="text-right">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payback Period</div>
                        <div className="text-2xl font-black text-emerald-600">{lccaData.paybackYear} Years</div>
                    </div>
                ) : lccaData.current_upfront <= lccaData.baseline_upfront ? (
                    <div className="text-right">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payback Period</div>
                        <div className="text-2xl font-black text-emerald-600">Immediate</div>
                    </div>
                ) : (
                    <div className="text-right">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payback Period</div>
                        <div className="text-lg font-black text-rose-500">No Payback</div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Electricity Rate (₹/kWh)</label>
                        <div className="flex items-center gap-3">
                            <input type="range" min="4" max="15" step="0.5" value={elecRate} onChange={e => setElecRate(parseFloat(e.target.value))} className="w-full accent-emerald-500" />
                            <span className="text-sm font-bold text-slate-100 w-12">₹{elecRate}</span>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Discount Rate (%)</label>
                        <div className="flex items-center gap-3">
                            <input type="range" min="2" max="15" step="0.5" value={discountRate} onChange={e => setDiscountRate(parseFloat(e.target.value))} className="w-full accent-emerald-500" />
                            <span className="text-sm font-bold text-slate-100 w-12">{discountRate}%</span>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Energy Inflation (%)</label>
                        <div className="flex items-center gap-3">
                            <input type="range" min="0" max="10" step="0.5" value={inflationRate} onChange={e => setInflationRate(parseFloat(e.target.value))} className="w-full accent-emerald-500" />
                            <span className="text-sm font-bold text-slate-100 w-12">{inflationRate}%</span>
                        </div>
                    </div>
                    
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-100 mt-4">
                        <h4 className="text-xs font-bold text-slate-100 mb-2 flex items-center gap-1"><Settings2 className="w-3 h-3" /> Baseline Assumptions</h4>
                        <ul className="text-[10px] text-slate-300 space-y-1">
                            <li>• <b>WWR:</b> 40%</li>
                            <li>• <b>Wall U-Value:</b> 0.80 W/m²·K</li>
                            <li>• <b>Roof U-Value:</b> 0.40 W/m²·K</li>
                            <li>• <b>Glass U-Value:</b> 3.30 W/m²·K</li>
                            <li>• <b>Glass SHGC:</b> 0.40</li>
                            <li>• <b>HVAC COP:</b> 3.0</li>
                        </ul>
                    </div>
                </div>

                <div className="md:col-span-2 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lccaData.data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis dataKey="year" tick={{fill: '#cbd5e1', fontSize: 10}} tickLine={false} axisLine={false} />
                            <YAxis tickFormatter={formatRupee} tick={{fill: '#cbd5e1', fontSize: 10}} tickLine={false} axisLine={false} width={60} />
                            <RechartsTooltip 
                                formatter={(value: any) => [`₹${Number(value).toFixed(1)} Lakhs`, '']}
                                labelFormatter={(label) => `Year ${label}`}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <Line type="monotone" dataKey="baseline" name="ECBC Baseline" stroke="#94a3b8" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                            <Line type="monotone" dataKey="current" name="Current Design" stroke="#10b981" strokeWidth={3} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
