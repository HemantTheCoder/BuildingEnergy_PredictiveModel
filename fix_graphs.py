import os
import glob

directory = r'c:\Users\heman\OneDrive\Desktop\BuildingEnergy_PredictiveModel-master\frontend\src\components'
files = glob.glob(directory + '/**/*.tsx', recursive=True)

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content.replace('#64748b', '#cbd5e1')
    new_content = new_content.replace('bg-emerald-50', 'bg-emerald-500/20')
    new_content = new_content.replace('bg-amber-50', 'bg-amber-500/20')
    new_content = new_content.replace('bg-orange-50', 'bg-orange-500/20')
    new_content = new_content.replace('bg-red-50', 'bg-red-500/20')
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {file_path}")
