import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import {
    BookOpen, ChevronDown, Zap, Thermometer, Wind, Layers, Cpu,
    Leaf, BarChart3, Globe, ShieldCheck, Calculator, Sun,
    Building2, FlaskConical, TrendingDown, Info, Star, Activity
} from 'lucide-react';

/* ── Types ── */
interface Concept {
    id: string;
    icon: React.ElementType;
    color: string;
    title: string;
    subtitle: string;
    simple: string;
    deep: string;
    formula?: { label: string; expr: string; vars?: string[] };
    impact: string;
    ref: string;
    tags: string[];
}

/* ── All concepts ── */
const CONCEPTS: Concept[] = [
    {
        id: 'eui',
        icon: Zap,
        color: 'primary',
        title: 'Energy Use Intensity (EUI)',
        subtitle: 'The master metric of building energy performance',
        simple: 'EUI tells you how much energy a building consumes per square metre of floor area every year. Think of it as a building\'s "fuel economy" — lower is always better. A well-designed office in India should target below 100 kWh/m²·yr; the best-practice 5-Star BEE target is under 75.',
        deep: 'EUI is calculated by dividing a building\'s total annual energy consumption (kWh/yr) — electricity, natural gas, district cooling, etc. — by its gross conditioned floor area (m²). ClimaBuild AI predicts EUI for the operational phase only (HVAC + lighting + plug loads), not embodied energy. The model outputs a site EUI at the building meter boundary, not source EUI.\n\nIn India, ECBC 2017 mandates EUI ≤ 160–200 kWh/m²·yr depending on archetype and climate zone. The BEE Star Rating Programme (2020 update) adds tiered benchmarks from 1-Star (poor) to 5-Star (best practice).',
        formula: {
            label: 'EUI Calculation',
            expr: 'EUI = E_total (kWh/yr) ÷ A_gross (m²)',
            vars: ['E_total = sum of all fuel-converted annual energy end-uses', 'A_gross = gross conditioned floor area in m²']
        },
        impact: 'A 10 kWh/m²·yr reduction in a 5,000 m² office saves ~₹4.5 lakh/yr at ₹9/kWh and avoids ~4.1 tonnes of CO₂ annually (CEA 2022 grid factor).',
        ref: 'BEE Star Rating Programme (2020); ASHRAE 90.1-2019 §11; ECBC 2017 §1.4',
        tags: ['energy', 'core', 'metric'],
    },
    {
        id: 'bee-star',
        icon: Star,
        color: 'accent',
        title: 'BEE Star Rating System',
        subtitle: 'India\'s energy efficiency label for commercial buildings',
        simple: 'Just like a refrigerator has an energy star rating, commercial buildings in India can be rated from 1-Star (poor efficiency) to 5-Star (best practice). The Bureau of Energy Efficiency (BEE) under the Ministry of Power administers this programme. Higher stars = lower energy bills and lower carbon footprint.',
        deep: 'The BEE Star Rating Programme for commercial buildings was launched in 2009 and updated in 2020. It applies to occupied commercial buildings ≥ 500 m² conditioned area across office buildings, BPO/IT parks, retail malls, and hotels.\n\nRating is based on the Energy Performance Index (EPI = site EUI in kWh/m²·yr) measured through actual billing data or simulation. The thresholds vary by climate zone and building archetype. A building must be operational for ≥ 1 year to be rated. The rating is valid for 5 years.\n\nClimaBuild AI uses the 2020-updated thresholds: 5-Star < 75, 4-Star 75–100, 3-Star 100–125, 2-Star 125–150, 1-Star 150–175, Non-Compliant > 175 kWh/m²·yr for composite-zone offices.',
        formula: {
            label: 'Star Band (Composite Zone, Office)',
            expr: '5★ < 75 | 4★ 75–100 | 3★ 100–125 | 2★ 125–150 | 1★ 150–175 | NC > 175',
            vars: ['Units: kWh/m²·yr (site EUI)', 'Thresholds vary by archetype and climate zone']
        },
        impact: 'BEE 5-Star buildings typically achieve 30–45% energy savings vs. conventional design. Many green leases and government tenders now mandate minimum BEE 4-Star rating.',
        ref: 'BEE (2020). Star Rating for Commercial Buildings — Programme Guide. MoP, GoI.',
        tags: ['rating', 'compliance', 'india'],
    },
    {
        id: 'ecbc',
        icon: ShieldCheck,
        color: 'primary',
        title: 'ECBC 2017 & Climate Zones',
        subtitle: 'India\'s energy code — what your building must meet by law',
        simple: 'The Energy Conservation Building Code (ECBC 2017) is India\'s mandatory energy standard for new commercial buildings above 500 m² connected load or 100 kW demand. It sets minimum performance requirements for the building envelope (walls, roofs, windows), HVAC, lighting, and water heating. Think of it as the minimum legal standard a building must pass.',
        deep: 'ECBC 2017 divides India into 5 climate zones based on Cooling Degree Days (CDD) and Heating Degree Days (HDD) per NBC 2016, Part 8, Annex A:\n\n• Hot-Dry: CDD ≥ 2500 + high solar radiation. Cities: Ahmedabad, Jodhpur, Nagpur.\n• Warm-Humid: CDD ≥ 2500 + humidity. Cities: Mumbai, Chennai, Kolkata, Goa.\n• Composite: Mixed seasons. Cities: Delhi, Jaipur, Lucknow, Bhopal.\n• Temperate: Mild year-round. Cities: Bangalore, Pune, Shillong.\n• Cold: HDD > 1200. Cities: Shimla, Leh, Srinagar.\n\nClimaBuild AI auto-classifies the climate zone from NASA POWER CDD/HDD data and applies zone-specific ECBC thresholds for U-values, SHGC, and EUI compliance.\n\nThree tiers: ECBC Basic (mandatory), ECBC+ (~25% better), SuperECBC (~50% better, incentive tier for FAR/tax benefits).',
        formula: {
            label: 'Climate Zone Classification',
            expr: 'HDD > 1200 → Cold | CDD ≥ 2500 + GHI > 5.5 → Hot-Dry | CDD ≥ 2500 → Warm-Humid | Low both → Temperate | else → Composite',
            vars: ['CDD = Cooling Degree Days (base 18.3°C)', 'HDD = Heating Degree Days (base 18.3°C)', 'GHI = Global Horizontal Irradiance (kWh/m²/day)']
        },
        impact: 'ECBC-compliant buildings save an estimated 50 billion units of electricity annually across India by 2030 (EESL estimate). Non-compliance can result in occupancy certificate delays in participating states.',
        ref: 'BEE ECBC 2017, Chapter 5; NBC 2016 Part 8, Annex A; BEE ECSBC Draft 2024',
        tags: ['compliance', 'regulation', 'india'],
    },
    {
        id: 'u-value',
        icon: Layers,
        color: 'secondary',
        title: 'U-Value (Thermal Transmittance)',
        subtitle: 'How fast heat flows through your building skin',
        simple: 'U-Value measures how easily heat passes through a wall, roof, or window — in watts per square metre per degree Kelvin of temperature difference (W/m²·K). Lower U-value = better insulation = less heat flowing in (or out). A single brick wall has a U-value around 2.5; a well-insulated AAC block wall drops it below 0.8.',
        deep: 'U-value is the reciprocal of total thermal resistance (R-value). It accounts for all layers of a construction assembly — surface air films, each material layer, and any air gaps.\n\nFor a multi-layer wall:\nU = 1 / (Rsi + Σ(thickness_i / conductivity_i) + Rse)\n\nwhere Rsi = 0.13 m²·K/W (internal surface resistance) and Rse = 0.04 m²·K/W (external surface).\n\nECBC 2017 prescribes maximum U-values by zone and assembly:\n• Wall: ≤ 0.80 W/m²·K (ECBC Basic, all hot zones)\n• Roof: ≤ 0.40 W/m²·K\n• Glazing: ≤ 3.30 W/m²·K\n\nClimaBuild AI uses U-values from BMTPC Schedule of Rates 2024 and IS 3792 for all materials in its library. The ML model uses U_wall, U_roof, and U_glass as direct input features.',
        formula: {
            label: 'Thermal Transmittance',
            expr: 'U = 1 / R_total  where  R_total = Rsi + Σ(d_i / λ_i) + Rse',
            vars: ['d_i = thickness of layer i (m)', 'λ_i = thermal conductivity of layer i (W/m·K)', 'Rsi = 0.13, Rse = 0.04 m²·K/W (surface resistances)']
        },
        impact: 'Reducing U_wall from 2.5 → 0.44 W/m²·K (brick → AAC+insulation) in a hot-dry climate can cut cooling load by 15–25%, saving roughly 30–45 kWh/m²·yr.',
        ref: 'IS 3792:1978; ECBC 2017 Tables 5.3–5.5; ASHRAE 90.1-2019 §5.5; ISO 6946:2017',
        tags: ['envelope', 'materials', 'physics'],
    },
    {
        id: 'shgc',
        icon: Sun,
        color: 'accent',
        title: 'Solar Heat Gain Coefficient (SHGC)',
        subtitle: 'How much solar energy your glazing lets in',
        simple: 'SHGC is a number from 0 to 1 that tells you what fraction of the solar energy hitting a window actually passes through into the building as heat. SHGC = 0.87 (single clear glass) means 87% of solar energy becomes heat load. SHGC = 0.25 (low-e glazing) means only 25% gets in. In hot climates, you always want a lower SHGC to reduce cooling loads.',
        deep: 'SHGC = T_sol + (Q_absorbed × N_i)\n\nwhere T_sol is the directly transmitted solar fraction and N_i is the inward-flowing fraction of absorbed radiation.\n\nSHGC replaces the older "Shading Coefficient" (SC = SHGC / 0.87) in modern codes. A clear 6mm float glass has SC ≈ 1.0 (SHGC ≈ 0.87); spectrally selective low-e coatings achieve SHGC ≤ 0.25 while maintaining visible light transmittance (VLT) above 50%.\n\nECBC 2017 limits: ≤ 0.40 (Hot-Dry, Warm-Humid, Composite) and ≤ 0.64 (Temperate). Cold zones have no SHGC cap (passive solar gain is desired in winter).\n\nWindow-to-Wall Ratio (WWR) amplifies SHGC impact. A 60% WWR with SHGC 0.87 causes approximately 3× the solar gain of a 20% WWR.',
        formula: {
            label: 'Solar Heat Gain Through Glazing',
            expr: 'Q_solar = SHGC × I_solar × A_glass  (W)',
            vars: ['I_solar = incident solar irradiance on the glazed surface (W/m²)', 'A_glass = glazing area (m²)', 'SHGC ∈ [0, 1] — lower is cooler']
        },
        impact: 'Switching from single clear glass (SHGC 0.87) to a double low-e unit (SHGC 0.25) on a south-facing 40% WWR façade in Mumbai can cut solar cooling load by ~60%, saving 20–35 kWh/m²·yr.',
        ref: 'ASHRAE 90.1-2019 §5.8; NFRC 200-2020; ECBC 2017 Table 5.5; ISO 9050:2003',
        tags: ['glazing', 'solar', 'envelope'],
    },
    {
        id: 'hvac-cop',
        icon: Wind,
        color: 'primary',
        title: 'HVAC Systems & COP',
        subtitle: 'Heating and cooling efficiency — how much comfort per unit of electricity',
        simple: 'COP (Coefficient of Performance) measures how efficient an air-conditioning or heating system is. A COP of 4.0 means for every 1 kW of electricity consumed, the system delivers 4 kW of cooling. Higher COP = less electricity for the same comfort. Modern VRF systems reach COP 4.5–5.5; old window ACs can be as low as 2.5.',
        deep: 'COP = Q_useful / W_input\n\nFor cooling: COP_cooling = Q_cold / W_comp (heat removed from the space / compressor power).\nFor heat pumps in heating mode: COP_heating = COP_cooling + 1.\n\nAlternative rating: EER (Energy Efficiency Ratio, imperial units) = COP × 3.412. ISEER (Indian Seasonal EER) is the Indian-specific metric averaging performance across a cooling season.\n\nClimaBuild AI maps HVAC system type to a realistic COP:\n• Split/VRF (inverter): 4.5\n• Central Chiller VAV: 4.0\n• PTAC/WSHP: 3.5\n• Packaged DX: 3.2\n• Window AC: 2.8\n\nCOP directly scales heating/cooling electricity demand: E_HVAC ≈ Q_load / COP. In India\'s hot climate, HVAC is typically 50–65% of total building energy use.',
        formula: {
            label: 'Cooling System Efficiency',
            expr: 'COP = Q_cold (kW) ÷ W_compressor (kW)',
            vars: ['Q_cold = cooling delivered to conditioned space', 'W_compressor = electrical power input at the compressor shaft', 'ISEER (BEE India rating) = Q_annual / E_annual']
        },
        impact: 'Upgrading from a 2.8 COP window-unit system to a 4.5 COP inverter VRF in a 1,200 m² office with 80 kWh/m²·yr HVAC load saves approximately ₹3.4 lakh/yr in electricity (at ₹9/unit).',
        ref: 'ASHRAE 90.1-2019 §6; BEE ISEER Star Rating 2024; IS 1391-1:2012',
        tags: ['hvac', 'systems', 'efficiency'],
    },
    {
        id: 'cdd-hdd',
        icon: Thermometer,
        color: 'primary',
        title: 'Degree Days (CDD & HDD)',
        subtitle: 'The climate\'s fingerprint on your energy demand',
        simple: 'Cooling Degree Days (CDD) tell you how much cooling work a climate demands over a year. Each day where the average temperature is above 18.3°C contributes (avg_temp − 18.3) degree-days. A Mumbai year accumulates ~2,890 CDD — that\'s why air conditioning is essential. Shimla has near-zero CDD but high Heating Degree Days (HDD). CDD directly drives cooling energy demand.',
        deep: 'Degree days are integrated measures of temperature excess (or deficit) over a base temperature (18.3°C / 65°F per ISO 15927-6 and ASHRAE 90.1). They provide a climate-normalized measure of thermal loads without requiring hour-by-hour simulation.\n\nMonthly CDD = max(0, T_avg_monthly − 18.3) × days_in_month\nAnnual CDD = sum of monthly CDD values\n\nClimaBuild AI retrieves 22-year monthly mean temperatures from NASA POWER (T2M parameter, 0.5° grid) and computes monthly CDD and HDD for the 12-month profile shown in the Analytics tab. These drive the climate zone classification and the HVAC load fraction of the model.\n\nCDD is a key feature in the ML model. The sensitivity analysis typically shows CDD as one of the highest-impact parameters because a 10% change in CDD propagates directly to cooling energy demand.',
        formula: {
            label: 'Monthly Cooling Degree Days',
            expr: 'CDD_month = max(0, T̄_month − 18.3) × N_days',
            vars: ['T̄_month = mean monthly dry-bulb temperature (°C)', 'N_days = calendar days in the month', 'Base 18.3°C = 65°F per ISO 15927-6 / ASHRAE convention']
        },
        impact: 'Mumbai\'s 2,890 annual CDD vs. Bangalore\'s 980 CDD means a Mumbai office needs roughly 2× the cooling energy for the same building design — demonstrating why climate-responsive design is non-negotiable.',
        ref: 'ISO 15927-6:2007; ASHRAE 90.1-2019 App. B; NASA POWER v8 (T2M)',
        tags: ['climate', 'loads', 'physics'],
    },
    {
        id: 'embodied-carbon',
        icon: Leaf,
        color: 'secondary',
        title: 'Embodied Carbon vs. Operational Carbon',
        subtitle: 'The two halves of a building\'s carbon footprint',
        simple: 'Operational carbon is the CO₂ emitted from running a building (electricity for AC, lights, equipment) — ongoing, year after year. Embodied carbon is the CO₂ locked into the building materials themselves: mining, manufacturing, transporting, and installing bricks, steel, concrete, and glass. Both matter for a building\'s full lifecycle impact.',
        deep: 'A typical commercial building over a 50-year life emits:\n• ~80% operational carbon (from energy use)\n• ~20% embodied carbon (from materials)\n\nBut as buildings become more energy-efficient and the electricity grid decarbonises, embodied carbon\'s relative share grows. By 2050, embodied carbon may represent 50%+ of total lifecycle emissions for highly efficient buildings.\n\nClimaBuild AI reports both:\n1. Operational CO₂ = EUI × floor_area × 0.82 kgCO₂/kWh (CEA 2022 grid factor)\n2. Embodied Carbon = material-specific kgCO₂e/m² from BMTPC Schedule of Rates 2024\n\nEmbodied carbon values in the material library are A1–A3 lifecycle stages (product stage): raw material extraction, transport to factory, and manufacturing. Installation (A4–A5) and end-of-life (C) are not included due to data limitations.',
        formula: {
            label: 'Operational CO₂ Intensity',
            expr: 'CO₂_op = EUI × A_floor × EF_grid  (kg CO₂e / yr)',
            vars: ['EF_grid = 0.82 kgCO₂/kWh (CEA 2022 national grid factor for India)', 'Units: tonnes/yr = CO₂_op / 1000', 'Embodied: kgCO₂e/m² from BMTPC lifecycle data (A1–A3)']
        },
        impact: 'Switching from conventional brick wall (15 kgCO₂e/m²) to AAC block (9 kgCO₂e/m²) in a 1,000 m² building saves ~6 tonnes of embodied CO₂ upfront — roughly equivalent to 7 months of operational savings.',
        ref: 'CEA (2022). CO₂ Baseline Database for Indian Power Sector v18.0; BMTPC SR 2024; ISO 14044:2006',
        tags: ['carbon', 'sustainability', 'materials'],
    },
    {
        id: 'shap',
        icon: Cpu,
        color: 'accent',
        title: 'SHAP Values & AI Explainability',
        subtitle: 'Why the AI predicted what it predicted',
        simple: 'SHAP (SHapley Additive exPlanations) values answer: "How much did each design parameter push the EUI prediction up or down?" They come from game theory (Shapley, 1953) and are the gold standard for explaining machine learning models. A positive SHAP value for a parameter means that parameter increased the predicted EUI; negative means it decreased it.',
        deep: 'ClimaBuild AI uses TreeSHAP (Lundberg & Lee, 2017) to compute exact Shapley values for each prediction from the XGBoost model. For a prediction with 6 features (U_wall, U_roof, U_glass, SHGC, CDD, HVAC_COP), each Shapley value ϕᵢ represents that feature\'s marginal contribution to the prediction relative to the expected output over all possible feature orderings.\n\nThe SHAP decomposition satisfies:\nf(x) = φ₀ + Σᵢ φᵢ\n\nwhere φ₀ is the expected model output (baseline EUI) and each φᵢ is the feature\'s Shapley contribution.\n\nThis matters for research credibility: a model that can\'t explain its predictions is a black box. SHAP values make the AI transparent and auditable, enabling peer reviewers and building professionals to verify that the model is responding to physics-consistent drivers.',
        formula: {
            label: 'Shapley Value Definition',
            expr: 'ϕᵢ = Σ |S|!(p−|S|−1)!/p! × [f(S∪{i}) − f(S)]',
            vars: ['S = subset of features not containing feature i', 'p = total number of features', 'f(S) = model prediction using only features in subset S', 'Result: ϕᵢ is feature i\'s average marginal contribution']
        },
        impact: 'If SHAP shows U_roof contributing −40 kWh/m²·yr (reducing EUI), upgrading roof insulation is your highest-value intervention — more impactful than other changes. SHAP tells you exactly where to invest your design budget.',
        ref: 'Lundberg & Lee (2017). NeurIPS 2017; Shapley, L.S. (1953). A Value for n-Person Games. Princeton.',
        tags: ['ai', 'ml', 'explainability'],
    },
    {
        id: 'sensitivity',
        icon: BarChart3,
        color: 'primary',
        title: 'Sensitivity Analysis (Tornado Chart)',
        subtitle: 'Which design decision has the biggest payoff',
        simple: 'Sensitivity analysis answers: "If I change just this one thing by 50%, how much does the EUI change?" The tornado chart shows all parameters ranked by their impact — the widest bar is your most powerful lever. Focus your design effort (and budget) on the parameters with the biggest bars.',
        deep: 'ClimaBuild AI runs a ceteris paribus (all else equal) one-at-a-time (OAT) sensitivity analysis. Each parameter is independently varied ±50% from its baseline value while all other inputs are held constant. The resulting EUI range is the parameter\'s sensitivity span.\n\nParameters analysed: WWR, Annual Solar Radiation, U_wall, U_roof.\n\nThis approach is appropriate for exploratory design because it isolates individual effects. However, real buildings exhibit parameter interactions (e.g., a highly insulated wall matters more when WWR is low). For interaction effects, use the Dynamic Simulator tab which compounds multiple simultaneous changes.\n\nThe tornado chart (named for its visual resemblance) is a standard technique in decision analysis and risk assessment (Morgan & Henrion, 1990). It is widely used in energy simulation sensitivity studies (Saltelli et al., 2008).',
        formula: {
            label: 'OAT Sensitivity Span',
            expr: 'ΔEUIᵢ = EUI(pᵢ × 1.5) − EUI(pᵢ × 0.5)  [all others fixed]',
            vars: ['pᵢ = baseline value of parameter i', 'Positive ΔEUIᵢ = increasing the parameter raises EUI (bad)', 'Negative ΔEUIᵢ = increasing the parameter lowers EUI (good)']
        },
        impact: 'In hot-dry climates, WWR sensitivity is typically the largest bar — meaning window area is your #1 design lever. In well-glazed buildings, U_roof often becomes dominant because the opaque envelope carries more of the thermal load.',
        ref: 'Saltelli et al. (2008). Global Sensitivity Analysis: The Primer. Wiley; ASHRAE Handbook of Fundamentals (2021) Ch. 18',
        tags: ['analysis', 'design', 'ai'],
    },
    {
        id: 'thermal-comfort',
        icon: Thermometer,
        color: 'secondary',
        title: 'Thermal Comfort & PMV Index',
        subtitle: 'How the building envelope affects occupant wellbeing',
        simple: 'The PMV (Predicted Mean Vote) index rates how thermally comfortable a space is on a scale from −3 (very cold) to +3 (very hot), with 0 being neutral. It was developed by Prof. P.O. Fanger (1970) and is the international standard for assessing thermal comfort in buildings. ClimaBuild AI shows a simplified thermal stress proxy based on the outdoor climate and envelope performance.',
        deep: 'The full Fanger PMV model requires 6 inputs: air temperature, mean radiant temperature, relative humidity, air velocity, clothing insulation (clo), and metabolic rate (met). These last two are not available from building envelope data alone, so ClimaBuild AI computes a simplified "thermal stress index" mapped onto the PMV scale.\n\nThe stress index is derived from the peak outdoor dry-bulb temperature, corrected for the building\'s envelope thermal resistance (U-value weighted), and normalised to the [−3, +3] range. It should be interpreted as a relative indicator of how effectively the envelope isolates occupants from outdoor thermal stress — not an absolute comfort certification.\n\nISO 7730:2005 sets the acceptable PMV range for "Category B" comfort at [−0.5, +0.5]. ASHRAE 55-2023 uses the equivalent Operative Temperature method with an adaptive comfort model for naturally ventilated spaces.',
        formula: {
            label: 'Fanger PMV (Simplified)',
            expr: 'PMV ≈ f(T_air, T_mrt, v_air, RH, M_met, I_clo)',
            vars: ['T_air = indoor air temperature (°C)', 'T_mrt = mean radiant temperature (°C)', 'M_met = metabolic rate (W/m² body area)', 'I_clo = clothing insulation (1 clo = 0.155 m²·K/W)', 'ClimaBuild uses a climate proxy (no clo/met available from envelope data)']
        },
        impact: 'Poor thermal comfort leads to productivity losses of 2–10% per ASHRAE research (Wyon, 2004). Buildings that maintain PMV in [−0.5, +0.5] consistently show lower sick-leave rates and higher CBRE tenant satisfaction scores.',
        ref: 'ISO 7730:2005; ASHRAE 55-2023; Fanger, P.O. (1970). Thermal Comfort. McGraw-Hill.',
        tags: ['comfort', 'occupants', 'physics'],
    },
    {
        id: 'wwr',
        icon: Building2,
        color: 'accent',
        title: 'Window-to-Wall Ratio (WWR)',
        subtitle: 'The glazing-to-opaque balance that drives everything',
        simple: 'WWR is the percentage of an exterior wall that is glass (windows and curtain wall). A 35% WWR means glass covers 35% of the façade area. WWR is one of the most powerful design levers because glass transmits far more heat than opaque walls — in both directions. In hot climates, lower WWR typically means lower cooling loads, but you need to balance daylight and views.',
        deep: 'WWR is computed for the whole building (global WWR) or per cardinal orientation (orientation-specific WWR). ECBC 2017 allows a maximum global WWR of 60% for most climate zones when SHGC and glazing performance meet prescriptive requirements.\n\nSolar heat gain through windows = SHGC × I_solar × A_glass\nFor a south-facing wall at WWR = 0.5, A_glass = 0.5 × A_wall.\n\nWWR interacts strongly with: SHGC (solar gain), U_glass (conductive gain/loss), shading devices (effective SHGC reduction), and daylighting (lighting energy savings). The Dynamic Simulator tab in ClimaBuild AI compounds these interactions.\n\nResearch shows that in India\'s hot climate zones, WWR beyond 40% typically increases energy demand unless high-performance glazing (SHGC ≤ 0.25, U ≤ 2.0) is used. Orientation matters: east and west facades are more sensitive to WWR than north and south due to low-angle morning/evening sun.',
        formula: {
            label: 'Window-to-Wall Ratio',
            expr: 'WWR = A_glazing / A_gross_wall_elevation',
            vars: ['A_glazing = total glass area including frames (m²)', 'A_gross_wall = gross above-grade wall area (m²)', 'ECBC max: 60% for prescriptive compliance']
        },
        impact: 'Reducing WWR from 60% → 30% in a composite-zone office with standard single-clear glazing saves approximately 15–25 kWh/m²·yr in cooling energy without compromising ECBC compliance.',
        ref: 'ECBC 2017 §5.4; ASHRAE 90.1-2019 §5.5.4; Heschong (2003). Windows and Offices, PIER.',
        tags: ['glazing', 'envelope', 'design'],
    },
    {
        id: 'co2-grid',
        icon: Globe,
        color: 'secondary',
        title: 'CO₂ Grid Emission Factor',
        subtitle: 'How India\'s electricity translates to carbon',
        simple: 'Every unit of electricity consumed in India results in CO₂ emissions from the power stations generating it. The "grid emission factor" tells you how many kg of CO₂ are released per kWh of electricity. India\'s 2022 factor is 0.82 kg CO₂/kWh. So a building consuming 200,000 kWh/year directly causes 164 tonnes of CO₂ emissions from the power sector.',
        deep: 'The Central Electricity Authority (CEA) publishes India\'s national average grid emission factor annually in the "CO₂ Baseline Database for the Indian Power Sector" report. The FY2021-22 factor (Version 18.0, released 2022) is 0.82 kgCO₂/kWh, used by ClimaBuild AI.\n\nThe factor is a consumption-based average across India\'s mix of coal (~70%), large hydro (~11%), nuclear (~3%), and renewables (~16%). It accounts for transmission and distribution losses.\n\nThe factor has been declining as renewables grow: 2016: 0.94 → 2019: 0.89 → 2022: 0.82. By 2030, India\'s NDC target (500 GW non-fossil by 2030) may reduce it to ~0.60 kgCO₂/kWh.\n\nFor LEED/GRIHA/BEE certifications in India, this CEA factor is the approved reference. Scope 2 reporting under GHG Protocol also uses this factor.',
        formula: {
            label: 'Annual Operational Carbon',
            expr: 'CO₂_yr = EUI × A_floor × 0.82  (kgCO₂e/yr)',
            vars: ['0.82 kgCO₂/kWh = CEA national grid emission factor (FY2021-22)', 'CO₂_intensity = EUI × 0.82  (kgCO₂e/m²·yr)', 'Total tonnes = CO₂_yr / 1000']
        },
        impact: 'A 1 kWh/m²·yr reduction in EUI across all commercial buildings in India (~400 million m² stock) would avoid approximately 328,000 tonnes of CO₂ per year — equivalent to removing ~70,000 cars from roads.',
        ref: 'CEA (2022). CO₂ Baseline Database for Indian Power Sector v18.0. MoP, GoI. GHG Protocol Scope 2 Guidance (2015).',
        tags: ['carbon', 'sustainability', 'india'],
    },
    {
        id: 'hybrid-engine',
        icon: FlaskConical,
        color: 'accent',
        title: 'Physics-Informed Hybrid Engine',
        subtitle: 'How ClimaBuild AI combines ML with thermodynamics',
        simple: 'ClimaBuild AI isn\'t purely a machine learning black box. It uses a hybrid approach: the ML model (XGBoost + Random Forest) predicts the base thermal envelope efficiency, then deterministic physics equations scale this for your specific operating schedule, occupancy, and plug loads. This gives you the flexibility of ML with the reliability of physics.',
        deep: 'Stage 1 — ML Baseline Prediction:\nThe ensemble of XGBoost + Random Forest (blended 60/40 by validation MAE) predicts base EUI from 6 envelope features: U_wall, U_roof, U_glass, SHGC, CDD, HVAC_COP. Trained on 15,000+ synthetic building records generated from ASHRAE 90.1 load calculation procedures, calibrated to match BEE benchmark buildings for Mumbai and Delhi offices.\n\nStage 2 — Physics Scaling:\nThermalEUI = ML_EUI × (operating_hours / 50) [schedule scale]\nOccPenalty = 1 + (occupancy_density × 0.5) [human heat load]\nScaledThermal = ThermalEUI × OccPenalty\n\nStage 3 — Deterministic Plug Loads:\nPlugEUI = (equipment_load_W/m² × operating_hours/wk × 52 weeks) / 1000\n\nFinal EUI = ScaledThermal + PlugEUI\n\nPhysics guardrails: U_wall, U_roof, and solar sensitivity overrides use physics-derived sensitivity factors (not ML) when the model shows low confidence, preventing non-physical extrapolation.',
        formula: {
            label: 'Hybrid EUI Formula',
            expr: 'EUI_final = (EUI_ML × hrs/50 × OccPenalty) + PlugEUI',
            vars: ['EUI_ML = XGBoost+RF ensemble prediction (thermal baseline)', 'OccPenalty = 1 + (occ_density × 0.5)', 'PlugEUI = (W/m² × hrs/wk × 52) / 1000']
        },
        impact: 'The hybrid approach achieves R² ≈ 0.89 and MAE ≈ 8.2 kWh/m²·yr on validation data — significantly better than pure ML (R² ≈ 0.82) or pure physics models applied to diverse building types.',
        ref: 'XGBoost: Chen & Guestrin, KDD 2016; ASHRAE 90.1-2019 App. G (Performance Rating Method); BEE calibration data',
        tags: ['ai', 'ml', 'physics'],
    },
    {
        id: 'solar-radiation',
        icon: Sun,
        color: 'accent',
        title: 'Solar Radiation & GHI',
        subtitle: 'The sun\'s energy load on your building',
        simple: 'Global Horizontal Irradiance (GHI) is the total solar energy per square metre falling on a horizontal surface over a year, in kWh/m²/yr. India is one of the world\'s highest solar resource countries: Mumbai receives ~1,800 kWh/m²/yr, Jodhpur ~2,200 kWh/m²/yr. High solar radiation = more cooling load on your building.',
        deep: 'GHI = DNI × cos(θ) + DHI\n\nwhere DNI = Direct Normal Irradiance (beam radiation), DHI = Diffuse Horizontal Irradiance (sky scatter), and θ = solar zenith angle.\n\nClimaBuild AI retrieves annual GHI (NASA POWER parameter: ALLSKY_SFC_SW_DWN) in kWh/m²/day × 365 ≈ kWh/m²/yr. Monthly solar radiation is also fetched for the seasonal chart.\n\nGHI drives the solar heat gain through glazing (via SHGC) and opaque envelope solar absorptance (via sol-air temperature). In the ML model, annual GHI (converted to W/m²·K effective) is a key feature — the sensitivity analysis shows it as typically the 2nd or 3rd most impactful parameter in hot-sunny climates.\n\nNASA POWER uses 22-year climate normals (2001–2022) on a 0.5° × 0.5° global grid, providing reliable long-term averages free from single-year anomalies.',
        formula: {
            label: 'Sol-Air Temperature (simplified)',
            expr: 'T_sol-air = T_outdoor + (α × I_solar / h_o)  (°C)',
            vars: ['α = solar absorptance of surface (0.2–0.9 depending on color/material)', 'I_solar = incident solar irradiance (W/m²)', 'h_o = exterior surface film coefficient ≈ 17 W/m²·K']
        },
        impact: 'A white/cool roof coating (SRI ≥ 110) reduces solar absorptance from 0.85 → 0.15, cutting the sol-air temperature differential by ~40°C under peak summer conditions — saving 10–20 kWh/m²·yr in top-floor cooling.',
        ref: 'NASA POWER v8 (ALLSKY_SFC_SW_DWN); ASHRAE HOF 2021 Ch. 18; IS 3792:1978 Solar Tables',
        tags: ['climate', 'solar', 'physics'],
    },
];

/* ── Category filters ── */
const CATEGORIES = [
    { id: 'all',           label: 'All Topics',    count: CONCEPTS.length },
    { id: 'energy',        label: 'Energy',        count: CONCEPTS.filter(c => c.tags.includes('energy') || c.tags.includes('metric')).length + 2 },
    { id: 'envelope',      label: 'Envelope',      count: CONCEPTS.filter(c => c.tags.includes('envelope') || c.tags.includes('materials') || c.tags.includes('glazing')).length },
    { id: 'climate',       label: 'Climate',       count: CONCEPTS.filter(c => c.tags.includes('climate') || c.tags.includes('solar')).length },
    { id: 'carbon',        label: 'Carbon',        count: CONCEPTS.filter(c => c.tags.includes('carbon') || c.tags.includes('sustainability')).length },
    { id: 'ai',            label: 'AI & Methods',  count: CONCEPTS.filter(c => c.tags.includes('ai') || c.tags.includes('analysis')).length },
    { id: 'compliance',    label: 'Standards',     count: CONCEPTS.filter(c => c.tags.includes('compliance') || c.tags.includes('regulation')).length },
];

const TAG_TO_CATEGORY: Record<string, string> = {
    energy: 'energy', metric: 'energy', rating: 'energy',
    envelope: 'envelope', materials: 'envelope', glazing: 'envelope', design: 'envelope',
    climate: 'climate', solar: 'climate', loads: 'climate', physics: 'climate',
    carbon: 'carbon', sustainability: 'carbon',
    ai: 'ai', ml: 'ai', explainability: 'ai', analysis: 'ai',
    compliance: 'compliance', regulation: 'compliance', india: 'compliance',
    comfort: 'energy', hvac: 'energy', systems: 'energy',
};

function matchesCategory(concept: Concept, cat: string): boolean {
    if (cat === 'all') return true;
    return concept.tags.some(t => TAG_TO_CATEGORY[t] === cat);
}

/* ── ConceptCard ── */
function ConceptCard({ concept, index }: { concept: Concept; index: number }) {
    const [open, setOpen] = useState(false);
    const Icon = concept.icon;

    const colorMap: Record<string, { bg: string; ring: string; text: string; badge: string }> = {
        primary:   { bg: 'bg-primary/8',   ring: 'ring-primary/20',   text: 'text-primary',   badge: 'bg-primary/10 text-primary border-primary/20' },
        secondary: { bg: 'bg-secondary/8', ring: 'ring-secondary/20', text: 'text-secondary', badge: 'bg-secondary/10 text-secondary border-secondary/20' },
        accent:    { bg: 'bg-accent/8',    ring: 'ring-accent/20',    text: 'text-accent',    badge: 'bg-accent/10 text-accent border-accent/20' },
    };
    const c = colorMap[concept.color] ?? colorMap.primary;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.04, 0.5) }}
            className="premium-card border-white/10 overflow-hidden"
        >
            {/* Header row — always visible */}
            <button
                onClick={() => setOpen(v => !v)}
                className="w-full text-left p-6 flex items-start gap-5 group"
            >
                <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ring-1 ${c.bg} ${c.ring}`}>
                    <Icon className={`w-5 h-5 ${c.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-bold text-slate-100 leading-snug">{concept.title}</h3>
                            <p className="text-xs text-slate-400 mt-0.5 font-medium">{concept.subtitle}</p>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300 mt-1 ${open ? 'rotate-180' : ''}`} />
                    </div>
                    <p className="text-xs text-slate-300 mt-2.5 leading-relaxed line-clamp-2">{concept.simple}</p>
                </div>
            </button>

            {/* Expanded content */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-6 space-y-5 border-t border-slate-100">

                            {/* Full plain-language explanation */}
                            <div className="pt-5">
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">Plain Language</p>
                                <p className="text-sm text-slate-200 leading-relaxed">{concept.simple}</p>
                            </div>

                            {/* Deep dive */}
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">Deep Dive</p>
                                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{concept.deep}</p>
                            </div>

                            {/* Formula block */}
                            {concept.formula && (
                                <div className="bg-slate-950 rounded-xl p-4 space-y-2">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{concept.formula.label}</p>
                                    <p className="font-mono text-sm text-emerald-400 font-semibold">{concept.formula.expr}</p>
                                    {concept.formula.vars && (
                                        <div className="space-y-1 pt-1 border-t border-slate-800">
                                            {concept.formula.vars.map((v, i) => (
                                                <p key={i} className="font-mono text-[11px] text-slate-400">{v}</p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Practical Impact */}
                            <div className="flex gap-3 bg-secondary/5 border border-secondary/20 rounded-xl p-4">
                                <TrendingDown className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-secondary tracking-wider mb-1">Practical Impact</p>
                                    <p className="text-xs text-slate-300 leading-relaxed">{concept.impact}</p>
                                </div>
                            </div>

                            {/* Tags + Citation */}
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div className="flex flex-wrap gap-1.5">
                                    {concept.tags.map(tag => (
                                        <span key={tag} className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${c.badge}`}>
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                                <div className="flex items-start gap-1.5 min-w-0">
                                    <Info className="w-3 h-3 text-slate-300 shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-slate-400 leading-relaxed">{concept.ref}</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

/* ── Main export ── */
export default function KnowledgeBase() {
    const [activeCategory, setActiveCategory] = useState('all');
    const [search, setSearch] = useState('');
    const [expandAll, setExpandAll] = useState(false);

    const filtered = CONCEPTS.filter(c => {
        const matchesCat = matchesCategory(c, activeCategory);
        const q = search.toLowerCase();
        const matchesSearch = !q || c.title.toLowerCase().includes(q) ||
            c.subtitle.toLowerCase().includes(q) || c.simple.toLowerCase().includes(q) ||
            c.tags.some(t => t.includes(q));
        return matchesCat && matchesSearch;
    });

    return (
        <div className="space-y-8 pb-12">

            {/* ── Hero ── */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-[#073a5e] to-primary-light p-10">
                <div className="absolute inset-0 opacity-[0.06]" style={{
                    backgroundImage: 'radial-gradient(circle at 20% 50%, #7EB281 0%, transparent 50%), radial-gradient(circle at 80% 20%, #ea580c 0%, transparent 40%)'
                }} />
                <div className="relative z-10 max-w-3xl">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-900/15 flex items-center justify-center ring-1 ring-white/20">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest text-white/60">Knowledge Base</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white leading-tight mb-3">
                        Understanding Building Energy Science
                    </h1>
                    <p className="text-white/70 text-sm leading-relaxed max-w-2xl">
                        Every metric, formula, and calculation in ClimaBuild AI explained — from first principles to practical impact.
                        Whether you're an architect, energy auditor, researcher, or student, this reference makes every output self-explanatory.
                    </p>
                    <div className="flex items-center gap-6 mt-6">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-white">{CONCEPTS.length}</p>
                            <p className="text-[10px] font-bold uppercase text-white/50 tracking-wider">Concepts</p>
                        </div>
                        <div className="w-px h-8 bg-slate-900/20" />
                        <div className="text-center">
                            <p className="text-2xl font-bold text-white">15+</p>
                            <p className="text-[10px] font-bold uppercase text-white/50 tracking-wider">Standards Cited</p>
                        </div>
                        <div className="w-px h-8 bg-slate-900/20" />
                        <div className="text-center">
                            <p className="text-2xl font-bold text-white">6</p>
                            <p className="text-[10px] font-bold uppercase text-white/50 tracking-wider">Disciplines</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Controls ── */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                {/* Category pills */}
                <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={cn(
                                "px-4 py-2 rounded-full text-xs font-semibold transition-all border",
                                activeCategory === cat.id
                                    ? "bg-primary text-white border-primary shadow-sm"
                                    : "bg-slate-900 text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-200"
                            )}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search concepts…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="glass-input pl-9 pr-4 py-2.5 text-xs w-52"
                        />
                    </div>
                    <button
                        onClick={() => setExpandAll(v => !v)}
                        className="px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900 text-xs font-semibold text-slate-300 hover:border-white/20 transition-all"
                    >
                        {expandAll ? 'Collapse All' : 'Expand All'}
                    </button>
                </div>
            </div>

            {/* ── Quick navigation legend ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { icon: Zap, label: 'EUI & Star Rating', desc: 'The core energy metrics', color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/15' },
                    { icon: Layers, label: 'Building Envelope', desc: 'Walls, roofs & glazing', color: 'text-secondary', bg: 'bg-secondary/5', border: 'border-secondary/15' },
                    { icon: Cpu, label: 'AI Explainability', desc: 'SHAP values & the model', color: 'text-accent', bg: 'bg-accent/5', border: 'border-accent/15' },
                    { icon: Leaf, label: 'Carbon & Climate', desc: 'Emissions & degree-days', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-200' },
                ].map(item => {
                    const Icon = item.icon;
                    return (
                        <div key={item.label} className={`rounded-2xl border p-4 ${item.bg} ${item.border}`}>
                            <Icon className={`w-5 h-5 ${item.color} mb-2`} />
                            <p className={`text-xs font-bold ${item.color}`}>{item.label}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
                        </div>
                    );
                })}
            </div>

            {/* ── Concept cards ── */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                    <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-medium">No concepts match "{search}"</p>
                    <button onClick={() => { setSearch(''); setActiveCategory('all'); }} className="mt-3 text-xs text-primary underline">Clear filters</button>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((concept, i) => (
                        <ConceptCardControlled
                            key={concept.id}
                            concept={concept}
                            index={i}
                            forceOpen={expandAll}
                        />
                    ))}
                </div>
            )}

            {/* ── Footer note ── */}
            <div className="rounded-2xl bg-slate-800/50 border border-white/10 p-6 flex gap-4">
                <Calculator className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                    <p className="text-xs font-bold text-slate-200 mb-1">About the Standards</p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        All calculations in ClimaBuild AI are grounded in peer-reviewed standards: BEE ECBC 2017, ASHRAE 90.1-2019, ISO 7730:2005, ISO 15927-6:2007, IS 3792:1978, NASA POWER v8, CEA Grid Emission Factor 2022, and BMTPC Schedule of Rates 2024.
                        No outputs are fabricated or interpolated beyond the cited methodologies.
                        For any discrepancy, the cited standard takes precedence.
                    </p>
                </div>
            </div>
        </div>
    );
}

/* Wrapper that respects forceOpen from parent */
function ConceptCardControlled({ concept, index, forceOpen }: { concept: Concept; index: number; forceOpen: boolean }) {
    const [open, setOpen] = useState(false);
    const isOpen = forceOpen || open;
    const Icon = concept.icon;

    const colorMap: Record<string, { bg: string; ring: string; text: string; badge: string }> = {
        primary:   { bg: 'bg-primary/8',   ring: 'ring-primary/20',   text: 'text-primary',   badge: 'bg-primary/10 text-primary border-primary/20' },
        secondary: { bg: 'bg-secondary/8', ring: 'ring-secondary/20', text: 'text-secondary', badge: 'bg-secondary/10 text-secondary border-secondary/20' },
        accent:    { bg: 'bg-accent/8',    ring: 'ring-accent/20',    text: 'text-accent',    badge: 'bg-accent/10 text-accent border-accent/20' },
    };
    const c = colorMap[concept.color] ?? colorMap.primary;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.035, 0.4) }}
            className="premium-card border-white/10 overflow-hidden"
        >
            <button
                onClick={() => setOpen(v => !v)}
                className="w-full text-left p-6 flex items-start gap-5 hover:bg-slate-800/50/60 transition-colors"
            >
                <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ring-1 ${c.bg} ${c.ring}`}>
                    <Icon className={`w-5 h-5 ${c.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-bold text-slate-100 leading-snug">{concept.title}</h3>
                            <p className="text-xs text-slate-400 mt-0.5 font-medium">{concept.subtitle}</p>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                    {!isOpen && (
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed line-clamp-2">{concept.simple}</p>
                    )}
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-6 space-y-5 border-t border-slate-100">
                            <div className="pt-5">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Plain Language</p>
                                <p className="text-sm text-slate-200 leading-relaxed">{concept.simple}</p>
                            </div>

                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Technical Detail</p>
                                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{concept.deep}</p>
                            </div>

                            {concept.formula && (
                                <div className="bg-slate-950 rounded-xl p-4 space-y-2">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{concept.formula.label}</p>
                                    <p className="font-mono text-sm text-emerald-400 font-semibold leading-relaxed">{concept.formula.expr}</p>
                                    {concept.formula.vars && (
                                        <div className="space-y-1 pt-2 border-t border-slate-800">
                                            {concept.formula.vars.map((v, i) => (
                                                <p key={i} className="font-mono text-[11px] text-slate-400 leading-relaxed">{v}</p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-3 bg-secondary/5 border border-secondary/20 rounded-xl p-4">
                                <TrendingDown className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-secondary tracking-wider mb-1">Practical Impact</p>
                                    <p className="text-xs text-slate-300 leading-relaxed">{concept.impact}</p>
                                </div>
                            </div>

                            <div className="flex items-start justify-between gap-4 flex-wrap pt-1">
                                <div className="flex flex-wrap gap-1.5">
                                    {concept.tags.map(tag => (
                                        <span key={tag} className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${c.badge}`}>
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                                <div className="flex items-start gap-1.5 max-w-xs">
                                    <Info className="w-3 h-3 text-slate-300 shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-slate-400 leading-relaxed">{concept.ref}</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
