import os
import glob

directory = r'c:\Users\heman\OneDrive\Desktop\BuildingEnergy_PredictiveModel-master\frontend\src\components'
files = glob.glob(directory + '/**/*.tsx', recursive=True)

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix the /200 bug
    new_content = content.replace('500/200', '500')
    
    # Fix text contrast
    new_content = new_content.replace('text-emerald-700', 'text-emerald-400')
    new_content = new_content.replace('text-emerald-600', 'text-emerald-400')
    new_content = new_content.replace('text-emerald-800', 'text-emerald-300')
    new_content = new_content.replace('text-amber-700', 'text-amber-400')
    new_content = new_content.replace('text-amber-600', 'text-amber-400')
    new_content = new_content.replace('text-yellow-700', 'text-yellow-400')
    new_content = new_content.replace('text-yellow-600', 'text-yellow-400')
    new_content = new_content.replace('text-orange-700', 'text-orange-400')
    new_content = new_content.replace('text-red-700', 'text-red-400')
    new_content = new_content.replace('text-sky-700', 'text-sky-400')
    new_content = new_content.replace('text-blue-700', 'text-blue-400')
    
    # Fix solid backgrounds in badges to translucent
    new_content = new_content.replace('bg-emerald-500 border-emerald-200', 'bg-emerald-500/10 border-emerald-500/30')
    new_content = new_content.replace('bg-emerald-500/20 border-emerald-200', 'bg-emerald-500/10 border-emerald-500/30')
    new_content = new_content.replace('bg-blue-50 border-blue-200', 'bg-blue-500/10 border-blue-500/30')
    new_content = new_content.replace('bg-sky-50 border-sky-200', 'bg-sky-500/10 border-sky-500/30')
    new_content = new_content.replace('bg-yellow-50 border-yellow-200', 'bg-yellow-500/10 border-yellow-500/30')
    new_content = new_content.replace('bg-orange-500/20 border-orange-200', 'bg-orange-500/10 border-orange-500/30')
    new_content = new_content.replace('bg-red-500/20 border-red-200', 'bg-red-500/10 border-red-500/30')
    
    # Fix ResearchContext explicitly
    if 'BEE_BENCHMARKS' in new_content:
        new_content = new_content.replace('textColor: "text-primary"', 'textColor: "text-blue-400"')
        new_content = new_content.replace('color: "bg-primary"', 'color: "bg-blue-400"')

    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {file_path}")
