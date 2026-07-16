import sys
import re

pdf_path = r'c:\Users\heman\OneDrive\Desktop\BuildingEnergy_PredictiveModel-master\frontend\src\lib\pdfReportGenerator.ts'

with open(pdf_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update colors for contrast
content = content.replace('slate:      [100, 116, 139]', 'slate:      [71, 85, 105]')
content = content.replace('slateLight: [148, 163, 184]', 'slateLight: [100, 116, 139]')

# 2. Add checkBreak helper function
check_break_code = '''
/** Dynamic pagination check */
function checkBreak(doc: jsPDF, currentY: number, requiredH: number, subtitle: string): number {
  if (currentY + requiredH > PH - 20) {
    doc.addPage();
    pageHeader(doc, subtitle);
    return MT + 8;
  }
  return currentY;
}
'''
content = content.replace('// --- Helpers -----------------------------------------------------------------', 
                          '// --- Helpers -----------------------------------------------------------------' + check_break_code)

# 3. Update kv function to wrap text
old_kv = '''/** Small label + value pair (inline) */
function kv(doc: jsPDF, x: number, y: number, label: string, value: string, labelCol = C.slate, valCol = C.black) {
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  rgb(doc, labelCol);
  doc.text(label, x, y);
  doc.setFont('helvetica', 'normal');
  rgb(doc, valCol);
  doc.text(value, x + doc.getTextWidth(label) + 1.5, y);
}'''

new_kv = '''/** Small label + value pair (inline) with wrapping */
function kv(doc: jsPDF, x: number, y: number, label: string, value: string, labelCol = C.slate, valCol = C.black) {
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  rgb(doc, labelCol);
  doc.text(label, x, y);
  doc.setFont('helvetica', 'normal');
  rgb(doc, valCol);
  const startX = x + doc.getTextWidth(label) + 1.5;
  const maxW = Math.max(10, PW - MR - startX); // Don't overflow right margin
  const lines = doc.splitTextToSize(String(value), maxW);
  doc.text(lines, startX, y);
}'''
content = content.replace(old_kv, new_kv)

# 4. Tornado chart text truncation
# Find: doc.text(label, midX - lowW - 1, barY + barH / 2 + 1.5, { align: 'right' });
# Replace with: label wrapping/truncation
old_tornado_text = "doc.text(label, midX - lowW - 1, barY + barH / 2 + 1.5, { align: 'right' });"
new_tornado_text = '''
      let displayLabel = label;
      const maxLabelW = (midX - lowW - 1) - x; // distance to left edge of chart box
      if (doc.getTextWidth(displayLabel) > maxLabelW) {
         while (displayLabel.length > 3 && doc.getTextWidth(displayLabel + '...') > maxLabelW) {
            displayLabel = displayLabel.substring(0, displayLabel.length - 1);
         }
         displayLabel += '...';
      }
      doc.text(displayLabel, midX - lowW - 1, barY + barH / 2 + 1.5, { align: 'right' });
'''
content = content.replace(old_tornado_text, new_tornado_text)

# 5. Add dynamic checkBreak to major sections
# Section 2
content = content.replace("y = sectionHeader(doc, y, '2. Sensitivity Analysis", "y = checkBreak(doc, y, 90, Energy Performance Analysis  ·  );\\n  y = sectionHeader(doc, y, '2. Sensitivity Analysis")
# Section 3
content = content.replace("y = sectionHeader(doc, y, '3. Material Recommendations", "y = checkBreak(doc, y, 90, Material Recommendations & Climate Profile  ·  );\\n  y = sectionHeader(doc, y, '3. Material Recommendations")
# Monthly Climate
content = content.replace("y = sectionHeader(doc, y, '4. Monthly Climate Load", "y = checkBreak(doc, y, 70, Material Recommendations & Climate Profile  ·  );\\n    y = sectionHeader(doc, y, '4. Monthly Climate Load")
# Radar
content = content.replace("y = sectionHeader(doc, y, '5. Multi-Criteria Performance", "y = checkBreak(doc, y, 70, Material Recommendations & Climate Profile  ·  );\\n  y = sectionHeader(doc, y, '5. Multi-Criteria Performance")

# LCCA section
content = content.replace("y = sectionHeader(doc, y, '8. Life Cycle Cost Analysis", "y = checkBreak(doc, y, 80, AI Explainability, LCCA & Thermal Analysis  ·  );\\n    y = sectionHeader(doc, y, '8. Life Cycle Cost Analysis")
# Operational vs Embodied
content = content.replace("y = sectionHeader(doc, y, '9. Carbon Equivalency", "y = checkBreak(doc, y, 60, AI Explainability, LCCA & Thermal Analysis  ·  );\\n  y = sectionHeader(doc, y, '9. Carbon Equivalency")

# 6. Material Table wrap limit (slice(0, 2) -> slice(0, 3))
content = content.replace("lines2.slice(0, 2).forEach((line, li)", "lines2.slice(0, 3).forEach((line, li)")
content = content.replace("insightLines.slice(0, 2).forEach((line, li)", "insightLines.slice(0, 3).forEach((line, li)")

# SHAP wrap
content = content.replace("wrapText(doc, shapIntro, CW).forEach((l, li) => doc.text(l, ML, y + li * 4));", "wrapText(doc, shapIntro, CW).slice(0, 4).forEach((l, li) => doc.text(l, ML, y + li * 4));")

with open(pdf_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied dynamic bounds and contrast fixes to pdfReportGenerator.ts")
