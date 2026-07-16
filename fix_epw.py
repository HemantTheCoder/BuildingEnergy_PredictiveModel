import sys

epw_path = r'c:\Users\heman\OneDrive\Desktop\BuildingEnergy_PredictiveModel-master\backend\epw_parser.py'

with open(epw_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if "cdd = sum([max(0, t - 18.3) for t in temperatures]) / 24.0" in line:
        new_lines.append("        # Standard daily mean CDD/HDD\n")
        new_lines.append("        cdd = 0.0\n")
        new_lines.append("        hdd = 0.0\n")
        new_lines.append("        for i in range(0, len(temperatures), 24):\n")
        new_lines.append("            day_temps = temperatures[i:i+24]\n")
        new_lines.append("            if len(day_temps) == 0: break\n")
        new_lines.append("            t_mean = sum(day_temps) / len(day_temps)\n")
        new_lines.append("            cdd += max(0, t_mean - 18.3)\n")
        new_lines.append("            hdd += max(0, 18.3 - t_mean)\n")
        skip = True
    elif skip and "hdd =" in line:
        pass
    elif "monthly_cdd.append(" in line:
        new_lines.append("                # Calculate monthly CDD/HDD using daily means\n")
        new_lines.append("                m_cdd = sum(max(0, sum(month_slice[d:d+24])/24.0 - 18.3) for d in range(0, len(month_slice), 24) if month_slice[d:d+24])\n")
        new_lines.append("                m_hdd = sum(max(0, 18.3 - sum(month_slice[d:d+24])/24.0) for d in range(0, len(month_slice), 24) if month_slice[d:d+24])\n")
        new_lines.append("                monthly_cdd.append(round(m_cdd, 1))\n")
    elif "monthly_hdd.append(" in line:
        new_lines.append("                monthly_hdd.append(round(m_hdd, 1))\n")
    else:
        new_lines.append(line)
        skip = False

with open(epw_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print("Updated epw_parser.py")
