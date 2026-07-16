import sys

dash_path = r'c:\Users\heman\OneDrive\Desktop\BuildingEnergy_PredictiveModel-master\frontend\src\components\ResultsDashboard.tsx'
with open(dash_path, 'r', encoding='utf-8') as f:
    dash_content = f.read()

# Boost remaining contrast
dash_content = dash_content.replace('text-slate-500', 'text-slate-300')
dash_content = dash_content.replace('text-slate-600', 'text-slate-200')
dash_content = dash_content.replace('text-slate-400', 'text-slate-200')
dash_content = dash_content.replace('text-slate-800', 'text-slate-100')
dash_content = dash_content.replace('text-emerald-800', 'text-emerald-200')
dash_content = dash_content.replace('text-emerald-600', 'text-emerald-300')

with open(dash_path, 'w', encoding='utf-8') as f:
    f.write(dash_content)

pdf_path = r'c:\Users\heman\OneDrive\Desktop\BuildingEnergy_PredictiveModel-master\frontend\src\lib\pdfReportGenerator.ts'
with open(pdf_path, 'r', encoding='utf-8') as f:
    pdf_content = f.read()

# Make sure the PDF correctly prints EPW city
pdf_content = pdf_content.replace("const cityName       = formData?.city || climate_summary?.city || 'Unknown Location';", "const cityName       = climate_summary?.city || climate_summary?.location || formData?.city || 'Custom Location';")
with open(pdf_path, 'w', encoding='utf-8') as f:
    f.write(pdf_content)

print("Boosted contrast and fixed PDF city name.")
