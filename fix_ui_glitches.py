import re

# Fix index.css primary color
css_path = r'c:\Users\heman\OneDrive\Desktop\BuildingEnergy_PredictiveModel-master\frontend\src\index.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css_content = f.read()
css_content = css_content.replace('--color-primary: #0f172a;', '--color-primary: #38bdf8; /* Bright Sky Blue */')
with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css_content)

# Fix ResultsDashboard star rating text colors
dash_path = r'c:\Users\heman\OneDrive\Desktop\BuildingEnergy_PredictiveModel-master\frontend\src\components\ResultsDashboard.tsx'
with open(dash_path, 'r', encoding='utf-8') as f:
    dash_content = f.read()

dash_content = dash_content.replace('text-emerald-700', 'text-emerald-400')
dash_content = dash_content.replace('text-amber-600', 'text-amber-400')
dash_content = dash_content.replace('text-amber-700', 'text-amber-400')
dash_content = dash_content.replace('text-orange-600', 'text-orange-400')
dash_content = dash_content.replace('text-orange-700', 'text-orange-400')
dash_content = dash_content.replace('text-red-700', 'text-red-400')

with open(dash_path, 'w', encoding='utf-8') as f:
    f.write(dash_content)

# Fix InputForm bg-slate-900 to bg-white/10 for buttons so they stand out
input_path = r'c:\Users\heman\OneDrive\Desktop\BuildingEnergy_PredictiveModel-master\frontend\src\components\InputForm.tsx'
with open(input_path, 'r', encoding='utf-8') as f:
    input_content = f.read()

# The NASA POWER / EPW buttons logic:
# isAutoMode ? "bg-slate-900 text-slate-100 shadow-sm border-white/10" : "hover:bg-slate-800/50 text-slate-400"
input_content = input_content.replace('bg-slate-900 shadow-sm border-white/10', 'bg-primary/20 text-primary shadow-sm border-primary/30')
input_content = input_content.replace('bg-slate-900 text-slate-100 shadow-sm', 'bg-primary/20 text-primary shadow-sm border-primary/30')

# For the Physics Defaults Applied box:
input_content = input_content.replace('bg-slate-900 border-white/10 p-3', 'bg-slate-800/40 border-white/10 p-3')

with open(input_path, 'w', encoding='utf-8') as f:
    f.write(input_content)

print("Fixed UI colors.")
