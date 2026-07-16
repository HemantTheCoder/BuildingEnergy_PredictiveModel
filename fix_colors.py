import os
import glob
import re

directory = r'c:\Users\heman\OneDrive\Desktop\BuildingEnergy_PredictiveModel-master\frontend\src'
files = glob.glob(directory + '/**/*.tsx', recursive=True)

def replace_colors(text):
    text = re.sub(r'text-slate-900', 'text-slate-50', text)
    text = re.sub(r'text-slate-800', 'text-slate-100', text)
    text = re.sub(r'text-slate-700', 'text-slate-200', text)
    text = re.sub(r'text-slate-600', 'text-slate-300', text)
    text = re.sub(r'text-slate-500', 'text-slate-400', text)
    
    # Also adjust some backgrounds that are too light for dark mode, like bg-slate-50 to bg-slate-800/50
    text = re.sub(r'bg-slate-50\b', 'bg-slate-800/50', text)
    text = re.sub(r'bg-slate-100\b', 'bg-slate-800/60', text)
    text = re.sub(r'bg-white\b', 'bg-slate-900', text)
    text = re.sub(r'border-slate-200', 'border-white/10', text)
    text = re.sub(r'border-slate-300', 'border-white/20', text)
    return text

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = replace_colors(content)
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {file_path}")
