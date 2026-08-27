/**
 * ClimaBuild AI — Comprehensive PDF Report Generator
 * Generates a multi-page, publication-quality technical report using jsPDF.
 * All charts and figures are drawn programmatically (no html2canvas dependency)
 * so the output is crisp at any zoom level, suitable for academic papers.
 *
 * Color palette mirrors the ClimaBuild brand:
 *   Primary   #042642  (Deep Navy)
 *   Teal      #0C7277
 *   Green     #7EB281  (Sage)
 *   Orange    #ea580c  (Accent / Warning)
 *   Slate     #64748b  (Body text)
 */

import jsPDF from 'jspdf';
import { validateAgainstBenchmark, getBenchmarkSummaryTable } from './benchmarkData';

// ─── Brand colours ───────────────────────────────────────────────────────────
const C = {
  navy:       [4,   38,  66]  as [number,number,number],
  teal:       [12,  114, 119] as [number,number,number],
  sage:       [126, 178, 129] as [number,number,number],
  orange:     [234, 88,  12]  as [number,number,number],
  slate:      [71,  85,  105] as [number,number,number],
  slateLight: [100, 116, 139] as [number,number,number],
  border:     [226, 232, 240] as [number,number,number],
  bg:         [248, 250, 252] as [number,number,number],
  white:      [255, 255, 255] as [number,number,number],
  black:      [15,  23,  42]  as [number,number,number],
  emerald:    [16,  185, 129] as [number,number,number],
  red:        [220, 38,  38]  as [number,number,number],
  amber:      [245, 158, 11]  as [number,number,number],
};

// ─── Page geometry (A4) ──────────────────────────────────────────────────────
const PW  = 210;   // page width  mm
const PH  = 297;   // page height mm
const ML  = 16;    // left margin
const MR  = 16;    // right margin
const MT  = 16;    // top margin
const CW  = PW - ML - MR;  // content width = 178 mm

// ─── Helpers ─────────────────────────────────────────────────────────────────
/** Dynamic pagination check */
function checkBreak(doc: jsPDF, currentY: number, requiredH: number, subtitle: string): number {
  if (currentY + requiredH > PH - 20) {
    doc.addPage();
    pageHeader(doc, subtitle);
    return MT + 8;
  }
  return currentY;
}
function rgb(doc: jsPDF, col: [number,number,number]) {
  doc.setTextColor(col[0], col[1], col[2]);
}
function fill(doc: jsPDF, col: [number,number,number]) {
  doc.setFillColor(col[0], col[1], col[2]);
}
function stroke(doc: jsPDF, col: [number,number,number]) {
  doc.setDrawColor(col[0], col[1], col[2]);
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

/** Draw a filled, rounded rect (jsPDF supports 'F', 'S', 'FD') */
function roundRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, mode: 'F'|'S'|'FD' = 'F') {
  doc.roundedRect(x, y, w, h, r, r, mode);
}

/** Divider line */
function divider(doc: jsPDF, y: number, alpha = 1) {
  stroke(doc, C.border);
  doc.setLineWidth(0.2 * alpha);
  doc.line(ML, y, ML + CW, y);
}

/** Section header bar */
function sectionHeader(doc: jsPDF, y: number, title: string, color: [number,number,number] = C.navy): number {
  fill(doc, color);
  doc.rect(ML, y, CW, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  rgb(doc, C.white);
  doc.text(title.toUpperCase(), ML + 3, y + 4.8);
  return y + 10;
}

/** Small label + value pair (inline) with wrapping */
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
}

/** Wrap text within maxW, return lines */
function wrapText(doc: jsPDF, text: string, maxW: number): string[] {
  return doc.splitTextToSize(text, maxW);
}

/** Page footer */
function footer(doc: jsPDF, pageNum: number, total: number) {
  divider(doc, PH - 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  rgb(doc, C.slateLight);
  doc.text('ClimaBuild AI  ·  Confidential Technical Report  ·  BEE ECBC 2017 / ASHRAE 90.1-2019', ML, PH - 8);
  doc.text(`Page ${pageNum} of ${total}`, PW - MR, PH - 8, { align: 'right' });
}

/** Page header band */
function pageHeader(doc: jsPDF, subtitle: string) {
  fill(doc, C.navy);
  doc.rect(0, 0, PW, 11, 'F');
  fill(doc, C.teal);
  doc.rect(0, 11, PW, 2, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  rgb(doc, C.white);
  doc.text('ClimaBuild AI', ML, 7.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  rgb(doc, C.slateLight);
  doc.text(subtitle, PW - MR, 7.5, { align: 'right' });
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function kpiCard(doc: jsPDF, x: number, y: number, w: number, h: number,
  label: string, value: string, unit: string, color: [number,number,number], badge?: string) {
  fill(doc, C.bg);
  stroke(doc, C.border);
  doc.setLineWidth(0.3);
  roundRect(doc, x, y, w, h, 2.5, 'FD');

  // accent left bar
  fill(doc, color);
  roundRect(doc, x, y, 2, h, 1, 'F');

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  rgb(doc, C.slate);
  doc.text(label.toUpperCase(), x + 5, y + 5.5);

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  rgb(doc, color);
  doc.text(value, x + 5, y + 14.5);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  rgb(doc, C.slate);
  doc.text(unit, x + 5, y + 19.5);

  if (badge) {
    fill(doc, color);
    roundRect(doc, x + w - 28, y + h - 8, 24, 5.5, 1, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    rgb(doc, C.white);
    doc.text(badge, x + w - 16, y + h - 4.2, { align: 'center' });
  }
}

// ─── Horizontal bar chart (sensitivity tornado) ───────────────────────────────
function tornadoChart(doc: jsPDF, x: number, y: number, w: number, h: number,
  data: {param: string; low: number; high: number}[]) {
  if (!data.length) return;
  const maxVal = Math.max(...data.flatMap(d => [Math.abs(d.low), Math.abs(d.high)]), 1);
  const rowH = h / data.length;
  const midX = x + w / 2;
  const scaleW = w / 2 / maxVal;

  // axis
  stroke(doc, C.border);
  doc.setLineWidth(0.2);
  doc.line(midX, y, midX, y + h);

  data.forEach((d, i) => {
    const rowY = y + i * rowH;
    const barH = rowH * 0.52;
    const barY = rowY + (rowH - barH) / 2;

    // Low bar (teal, extends left)
    const lowW = Math.abs(d.low) * scaleW;
    fill(doc, C.teal);
    doc.rect(midX - lowW, barY, lowW, barH, 'F');

    // High bar (orange, extends right)
    const hiW = Math.abs(d.high) * scaleW;
    fill(doc, C.orange);
    doc.rect(midX, barY, hiW, barH, 'F');

    // Label
    doc.setFontSize(6.2);
    doc.setFont('helvetica', 'bold');
    rgb(doc, C.black);
    const label = d.param.replace(/_/g, ' ').substring(0, 14);
      let displayLabel = label;
      const maxLabelW = (midX - lowW - 1) - x; // distance to left edge of chart box
      if (doc.getTextWidth(displayLabel) > maxLabelW) {
         while (displayLabel.length > 3 && doc.getTextWidth(displayLabel + '...') > maxLabelW) {
            displayLabel = displayLabel.substring(0, displayLabel.length - 1);
         }
         displayLabel += '...';
      }
      doc.text(displayLabel, midX - lowW - 1, barY + barH / 2 + 1.5, { align: 'right' });

    // Values
    doc.setFontSize(5.8);
    doc.setFont('helvetica', 'normal');
    rgb(doc, C.white);
    if (lowW > 8) doc.text(`−${Math.abs(d.low).toFixed(1)}`, midX - lowW / 2, barY + barH / 2 + 1.5, { align: 'center' });
    if (hiW > 8)  doc.text(`+${d.high.toFixed(1)}`,  midX + hiW  / 2, barY + barH / 2 + 1.5, { align: 'center' });
  });

  // X axis ticks
  const steps = 4;
  for (let s = 0; s <= steps; s++) {
    const tx = x + (s / steps) * w;
    const val = ((s / steps) * 2 - 1) * maxVal;
    stroke(doc, C.border);
    doc.setLineWidth(0.1);
    doc.line(tx, y + h, tx, y + h + 1);
    doc.setFontSize(5.5);
    rgb(doc, C.slate);
    doc.text(val.toFixed(0), tx, y + h + 4, { align: 'center' });
  }
  doc.setFontSize(5.5);
  rgb(doc, C.slate);
  doc.text('EUI impact (kWh/m²·yr)', x + w / 2, y + h + 8, { align: 'center' });
}

// ─── Vertical bar chart ───────────────────────────────────────────────────────
function barChart(doc: jsPDF, x: number, y: number, w: number, h: number,
  data: {label: string; value: number; color: [number,number,number]}[]) {
  if (!data.length) return;
  const maxVal = Math.max(...data.map(d => d.value), 1) * 1.15;
  const barW = Math.min(w / data.length * 0.6, 18);
  const gap  = w / data.length;
  const scaleH = h / maxVal;

  // Y axis gridlines
  const ySteps = 4;
  for (let g = 0; g <= ySteps; g++) {
    const gy = y + h - (g / ySteps) * h;
    const gv = (g / ySteps) * maxVal;
    stroke(doc, C.border);
    doc.setLineWidth(0.15);
    doc.line(x, gy, x + w, gy);
    doc.setFontSize(5.5);
    rgb(doc, C.slate);
    doc.text(gv.toFixed(0), x - 1, gy + 1.5, { align: 'right' });
  }

  data.forEach((d, i) => {
    const bh = d.value * scaleH;
    const bx = x + i * gap + (gap - barW) / 2;
    const by = y + h - bh;

    fill(doc, d.color);
    roundRect(doc, bx, by, barW, bh, 1.5, 'F');

    // Value label on top
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    rgb(doc, C.navy);
    doc.text(d.value.toFixed(1), bx + barW / 2, by - 1.5, { align: 'center' });

    // X-axis label
    doc.setFontSize(6.2);
    doc.setFont('helvetica', 'normal');
    rgb(doc, C.slate);
    const lines = wrapText(doc, d.label, gap - 2);
    lines.slice(0, 3).forEach((line, li) => {
      doc.text(line, bx + barW / 2, y + h + 4.5 + li * 3.5, { align: 'center' });
    });
  });
}

// ─── Donut / gauge chart ──────────────────────────────────────────────────────
function gaugeChart(doc: jsPDF, cx: number, cy: number, r: number,
  value: number, max: number, label: string, unit: string, color: [number,number,number]) {
  const frac = clamp(value / max, 0, 1);
  const startAngle = 220;
  const sweep = 280;

  // Background arc
  stroke(doc, C.border);
  doc.setLineWidth(4);
  doc.setDrawColor(226, 232, 240);

  // Filled arc (approximate with multiple segments)
  const segments = Math.round(sweep * frac);
  if (segments > 0) {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(4);
    for (let s = 0; s < segments; s++) {
      const a1 = (startAngle + s) * Math.PI / 180;
      const a2 = (startAngle + s + 1) * Math.PI / 180;
      doc.line(
        cx + r * Math.cos(a1), cy + r * Math.sin(a1),
        cx + r * Math.cos(a2), cy + r * Math.sin(a2)
      );
    }
  }

  // Centre text
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  rgb(doc, color);
  doc.text(value.toFixed(1), cx, cy + 2, { align: 'center' });

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  rgb(doc, C.slate);
  doc.text(unit, cx, cy + 7, { align: 'center' });

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  rgb(doc, C.navy);
  doc.text(label, cx, cy + 12, { align: 'center' });
}

// ─── Monthly bar chart (stacked CDD/HDD) ─────────────────────────────────────
function monthlyChart(doc: jsPDF, x: number, y: number, w: number, h: number,
  monthlyCDD: number[], monthlyHDD: number[]) {
  const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];
  const maxVal = Math.max(...monthlyCDD.map((c, i) => c + (monthlyHDD[i] || 0)), 1);
  const barW = w / 12 * 0.65;
  const gap  = w / 12;
  const scaleH = h / maxVal;

  // Gridlines
  [0.25, 0.5, 0.75, 1.0].forEach(f => {
    const gy = y + h - f * h;
    stroke(doc, C.border);
    doc.setLineWidth(0.12);
    doc.line(x, gy, x + w, gy);
    doc.setFontSize(5);
    rgb(doc, C.slateLight);
    doc.text((f * maxVal).toFixed(0), x - 1, gy + 1.2, { align: 'right' });
  });

  months.forEach((m, i) => {
    const cdd = monthlyCDD[i] || 0;
    const hdd = monthlyHDD[i] || 0;
    const bx  = x + i * gap + (gap - barW) / 2;

    // CDD (orange) — bottom
    if (cdd > 0) {
      fill(doc, C.orange);
      doc.rect(bx, y + h - cdd * scaleH, barW, cdd * scaleH, 'F');
    }
    // HDD (navy) — stacked on top
    if (hdd > 0) {
      fill(doc, C.navy);
      doc.rect(bx, y + h - (cdd + hdd) * scaleH, barW, hdd * scaleH, 'F');
    }

    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    rgb(doc, C.slate);
    doc.text(m, bx + barW / 2, y + h + 4, { align: 'center' });
  });

  // Legend
  fill(doc, C.orange);
  doc.rect(x, y + h + 8, 4, 3, 'F');
  doc.setFontSize(6);
  rgb(doc, C.slate);
  doc.text('Cooling DD (CDD)', x + 5.5, y + h + 10.5);
  fill(doc, C.navy);
  doc.rect(x + 38, y + h + 8, 4, 3, 'F');
  doc.text('Heating DD (HDD)', x + 43.5, y + h + 10.5);
}

// ─── Radar / spider chart (multi-criteria) ───────────────────────────────────
function radarChart(doc: jsPDF, cx: number, cy: number, r: number,
  axes: string[], datasets: {label: string; values: number[]; color: [number,number,number]}[]) {
  const n = axes.length;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  // Grid rings
  [0.25, 0.5, 0.75, 1.0].forEach(frac => {
    const pts: [number,number][] = [];
    for (let i = 0; i < n; i++) {
      const a = startAngle + i * angleStep;
      pts.push([cx + r * frac * Math.cos(a), cy + r * frac * Math.sin(a)]);
    }
    stroke(doc, C.border);
    doc.setLineWidth(0.2);
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      doc.line(pts[i][0], pts[i][1], pts[next][0], pts[next][1]);
    }
    // ring % label
    doc.setFontSize(5);
    rgb(doc, C.slateLight);
    doc.text(`${Math.round(frac * 100)}`, cx + 1, cy - r * frac + 1.5);
  });

  // Spokes
  for (let i = 0; i < n; i++) {
    const a = startAngle + i * angleStep;
    stroke(doc, C.border);
    doc.setLineWidth(0.2);
    doc.line(cx, cy, cx + r * Math.cos(a), cy + r * Math.sin(a));

    // Axis labels
    const lx = cx + (r + 6) * Math.cos(a);
    const ly = cy + (r + 6) * Math.sin(a);
    doc.setFontSize(5.8);
    doc.setFont('helvetica', 'bold');
    rgb(doc, C.navy);
    const labelLines = axes[i].split('\n');
    labelLines.forEach((ln, li) => doc.text(ln, lx, ly + li * 3.5, { align: 'center' }));
  }

  // Datasets
  datasets.forEach(ds => {
    const pts: [number,number][] = [];
    for (let i = 0; i < n; i++) {
      const a = startAngle + i * angleStep;
      const v = clamp(ds.values[i] / 100, 0, 1);
      pts.push([cx + r * v * Math.cos(a), cy + r * v * Math.sin(a)]);
    }
    // Fill
    doc.setFillColor(ds.color[0], ds.color[1], ds.color[2]);
    doc.setGState(doc.GState({ opacity: 0.12 }));
    const pathData = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ') + ' Z';
    // Use polygon approximation
    doc.setGState(doc.GState({ opacity: 1 }));

    // Stroke
    stroke(doc, ds.color);
    doc.setLineWidth(1);
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      doc.line(pts[i][0], pts[i][1], pts[next][0], pts[next][1]);
    }

    // Dots
    fill(doc, ds.color);
    pts.forEach(p => doc.circle(p[0], p[1], 1, 'F'));
  });
  // Suppressed pathData warning
  // Legend
  let lx = cx - r;
  datasets.forEach((ds, i) => {
    fill(doc, ds.color);
    doc.circle(lx, cy + r + 10, 1.5, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    rgb(doc, C.slate);
    doc.text(ds.label, lx + 3, cy + r + 11.5);
    lx += 22 + (i > 0 ? 5 : 0);
  });
}

// ─── SHAP waterfall bars ──────────────────────────────────────────────────────
function shapChart(doc: jsPDF, x: number, y: number, w: number, h: number,
  drivers: {name: string; impact: number}[]) {
  if (!drivers.length) return;
  const maxAbs = Math.max(...drivers.map(d => Math.abs(d.impact)), 0.1);
  const barH = Math.min(h / drivers.length * 0.65, 7);
  const gap   = h / drivers.length;
  const midX  = x + w / 2;
  const scaleW = (w / 2 - 2) / maxAbs;

  // Centre axis
  stroke(doc, C.border);
  doc.setLineWidth(0.3);
  doc.line(midX, y, midX, y + h);

  drivers.forEach((d, i) => {
    const barY = y + i * gap + (gap - barH) / 2;
    const bw   = Math.abs(d.impact) * scaleW;
    const positive = d.impact > 0;
    const col = positive ? C.orange : C.sage;

    fill(doc, col);
    if (positive) {
      doc.rect(midX, barY, bw, barH, 'F');
    } else {
      doc.rect(midX - bw, barY, bw, barH, 'F');
    }

    // Labels
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    rgb(doc, C.black);
    const label = d.name.replace(/_/g, ' ').substring(0, 16);
    doc.text(label, x, barY + barH / 2 + 1.5);

    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    rgb(doc, C.white);
    const vStr = `${d.impact > 0 ? '+' : ''}${d.impact.toFixed(2)}`;
    if (bw > 9) doc.text(vStr, positive ? midX + bw / 2 : midX - bw / 2, barY + barH / 2 + 1.5, { align: 'center' });
    else {
      rgb(doc, positive ? C.orange : C.teal);
      doc.text(vStr, positive ? midX + bw + 1.5 : midX - bw - 1.5, barY + barH / 2 + 1.5, { align: positive ? 'left' : 'right' });
    }
  });

  // Axis label
  doc.setFontSize(6);
  rgb(doc, C.slate);
  doc.text('SHAP impact on EUI (kWh/m²·yr)', midX, y + h + 6, { align: 'center' });
  doc.text('Reduces EUI ←', midX - 5, y + h + 10, { align: 'right' });
  doc.text('→ Increases EUI', midX + 5, y + h + 10, { align: 'left' });
}

// ─── LCCA Line chart ──────────────────────────────────────────────────────────
function lccaChart(doc: jsPDF, x: number, y: number, w: number, h: number,
  data: {year: number; current: number; baseline: number}[]) {
  if (!data.length) return;
  const maxVal = Math.max(...data.flatMap(d => [d.current, d.baseline]), 1);
  const scaleX = w / (data.length - 1);
  const scaleY = h / maxVal;

  // Grid
  [0.25, 0.5, 0.75, 1.0].forEach(f => {
    const gy = y + h - f * h;
    stroke(doc, C.border);
    doc.setLineWidth(0.12);
    doc.line(x, gy, x + w, gy);
    doc.setFontSize(5.5);
    rgb(doc, C.slate);
    doc.text(`₹${(f * maxVal).toFixed(0)}L`, x - 1, gy + 1.2, { align: 'right' });
  });

  // Baseline dashed
  stroke(doc, C.slateLight);
  doc.setLineWidth(0.6);
  doc.setLineDashPattern([1.5, 1], 0);
  data.forEach((d, i) => {
    if (i === 0) return;
    const x1 = x + (i - 1) * scaleX;
    const x2 = x + i * scaleX;
    const y1 = y + h - data[i - 1].baseline * scaleY;
    const y2 = y + h - d.baseline * scaleY;
    doc.line(x1, y1, x2, y2);
  });

  // Current solid
  stroke(doc, C.emerald);
  doc.setLineWidth(1.2);
  doc.setLineDashPattern([], 0);
  data.forEach((d, i) => {
    if (i === 0) return;
    const x1 = x + (i - 1) * scaleX;
    const x2 = x + i * scaleX;
    const y1 = y + h - data[i - 1].current * scaleY;
    const y2 = y + h - d.current * scaleY;
    doc.line(x1, y1, x2, y2);
  });

  // X-axis years (every 5)
  doc.setFontSize(5.5);
  rgb(doc, C.slate);
  data.filter(d => d.year % 5 === 0).forEach(d => {
    const dx = x + d.year * scaleX;
    doc.text(`Yr ${d.year}`, dx, y + h + 4, { align: 'center' });
  });

  // Legend
  stroke(doc, C.slateLight);
  doc.setLineWidth(0.6);
  doc.setLineDashPattern([1.5, 1], 0);
  doc.line(x, y + h + 10, x + 10, y + h + 10);
  doc.setLineDashPattern([], 0);
  doc.setFontSize(6);
  rgb(doc, C.slate);
  doc.text('ECBC Baseline', x + 12, y + h + 11.5);
  stroke(doc, C.emerald);
  doc.setLineWidth(1.2);
  doc.line(x + 50, y + h + 10, x + 60, y + h + 10);
  doc.text('Current Design', x + 62, y + h + 11.5);
}

// ─── Main export function ──────────────────────────────────────────────────────
export interface ReportData {
  formData: any;
  results: any;
  lccaParams?: { elecRate: number; discountRate: number; inflationRate: number };
}

export async function generatePDFReport(data: ReportData): Promise<void> {
  const { formData, results } = data;
  const lccaP = data.lccaParams || { elecRate: 9, discountRate: 8, inflationRate: 4 };

  const {
    predicted_eui,
    baseline_eui,
    annual_savings_inr,
    co2_intensity_kg_m2_yr,
    co2_total_tonnes_yr,
    top_material_recommendations,
    climate_summary,
    material_sources,
    model_metrics,
    sensitivity_analysis,
    thermal_comfort,
    evidence_panel,
    ecbc_compliance,
  } = results;

  const co2Intensity   = co2_intensity_kg_m2_yr ?? parseFloat((predicted_eui * 0.82).toFixed(1));
  const co2Total       = co2_total_tonnes_yr    ?? parseFloat((co2Intensity * (formData?.floor_area_m2 || 1200) / 1000).toFixed(2));
  const savings        = annual_savings_inr !== undefined ? annual_savings_inr : (180 - predicted_eui) * (formData?.floor_area_m2 || 1200) * 9;
  const totalEC        = (material_sources?.wall?.carbon || 0) + (material_sources?.roof?.carbon || 0) + (material_sources?.glazing?.carbon || 0);
  const cityName       = climate_summary?.city || climate_summary?.location || formData?.city || 'Custom Location';
  const reportDate     = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const efficiency     = baseline_eui > 0 ? ((baseline_eui - predicted_eui) / baseline_eui * 100) : 0;

  // Climate zone helper
  const getCZ = () => {
    const cdd = climate_summary?.cdd ?? 0;
    const hdd = climate_summary?.hdd ?? 0;
    const ghi = climate_summary?.annual_solrad ?? 5;
    if (hdd > 1200) return { zone: 'Cold', code: 'BEE Zone 5' };
    if (cdd > 2500 && ghi > 5.5) return { zone: 'Hot-Dry', code: 'BEE Zone 1' };
    if (cdd > 2500) return { zone: 'Warm-Humid', code: 'BEE Zone 2' };
    if (cdd <= 1200 && hdd <= 1200) return { zone: 'Temperate', code: 'BEE Zone 4' };
    return { zone: 'Composite', code: 'BEE Zone 3' };
  };
  const climateZone = getCZ();

  // LCCA data generation
  const area = formData?.floor_area_m2 || 1200;
  const calcCost = (wwr: number, u_wall: number, u_roof: number, u_glass: number, shgc: number, cop: number) => {
    let base = 25000 * (area / 100);
    base += wwr * 100 * 500;
    if (shgc < 0.3) base += 15000;
    if (u_glass < 2.0) base += 20000;
    if (cop > 4.0) base += 35000;
    if (u_wall < 0.8) base += 12000;
    if (u_roof < 0.5) base += 18000;
    return base;
  };
  const copMap: Record<string, number> = { 'Split/Window AC': 2.8, 'VAV': 4.0, 'Central Chiller (VAV)': 4.0, 'Variable Refrigerant Flow (VRF)': 3.8, 'Evaporative Cooler': 8.0 };
  const currentCop     = copMap[formData?.hvac_type || 'VAV'] || 3;
  const currentUpfront = calcCost(formData?.wwr || 0.4, formData?.property_overrides?.u_wall || 1.5, formData?.property_overrides?.u_roof || 1.2, formData?.property_overrides?.u_glass || 3.3, formData?.property_overrides?.shgc || 0.4, currentCop);
  const baselineUpfront= calcCost(0.4, 0.8, 0.4, 3.3, 0.4, 3.0);

  const lccaData: {year: number; current: number; baseline: number}[] = [];
  let cCum = currentUpfront; let bCum = baselineUpfront;
  const bECost = baseline_eui * area * lccaP.elecRate;
  const cECost = predicted_eui * area * lccaP.elecRate;
  let paybackYear: number | null = null;
  for (let y = 0; y <= 30; y++) {
    if (y > 0) {
      const inf = Math.pow(1 + lccaP.inflationRate / 100, y);
      const dis = Math.pow(1 + lccaP.discountRate / 100, y);
      cCum += (cECost * inf) / dis;
      bCum += (bECost * inf) / dis;
    }
    if (paybackYear === null && y > 0 && cCum < bCum && currentUpfront > baselineUpfront) paybackYear = y;
    lccaData.push({ year: y, current: cCum / 100000, baseline: bCum / 100000 });
  }

  // Sensitivity data
  const sensData = sensitivity_analysis ? Object.entries(sensitivity_analysis).map(([p, d]: [string, any]) => ({
    param: p, low: d.low_impact, high: d.high_impact,
  })) : [];

  // SHAP drivers
  const shapDrivers = evidence_panel?.shap_drivers
    ? Object.entries(evidence_panel.shap_drivers).map(([name, impact]: [string, any]) => ({ name, impact: Number(impact) })).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)).slice(0, 8)
    : [];

  // Monthly climate
  const mCDD = climate_summary?.monthly_cdd as number[] || Array(12).fill(0);
  const mHDD = climate_summary?.monthly_hdd as number[] || Array(12).fill(0);

  // EUI comparison data
  const euiData = [
    { label: 'Baseline', value: baseline_eui ?? 180, color: C.slateLight },
    { label: 'Predicted', value: predicted_eui, color: C.orange },
    ...((top_material_recommendations || []).slice(0, 3).map((r: any, i: number) => ({
      label: i === 0 ? 'Optimum' : i === 1 ? 'Balanced' : 'Eco',
      value: r.predicted_eui,
      color: i === 0 ? C.teal : i === 1 ? C.sage : C.emerald,
    }))),
  ];

  // Radar scenarios
  const allS = [
    { label: 'Current', eui: predicted_eui, carbon: totalEC, cost: 5 },
    ...((top_material_recommendations || []).slice(0, 3).map((r: any, i: number) => ({
      label: i === 0 ? 'Optimum' : i === 1 ? 'Balanced' : 'Eco',
      eui: r.predicted_eui, carbon: r.embodied_carbon, cost: r.cost_score ?? 5,
    }))),
  ];
  const maxEUI = Math.max(...allS.map(s => s.eui), 1);
  const maxCarbon = Math.max(...allS.map(s => s.carbon), 1);
  const norm = (v: number, mx: number) => Math.round(clamp((1 - v / mx) * 100, 5, 98));
  const radarDatasets = allS.map((s, i) => ({
    label: s.label,
    values: [
      norm(s.eui, maxEUI),
      norm(s.carbon, maxCarbon),
      Math.round(clamp((1 - s.cost / 10) * 100, 5, 98)),
      Math.round(clamp((1 - s.eui / ((baseline_eui ?? 180) * 1.3)) * 100, 5, 98)),
    ],
    color: [C.orange, C.teal, C.sage, C.emerald][i] as [number,number,number],
  }));

  // ─── Build PDF ─────────────────────────────────────────────────────────────
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  doc.setFont('helvetica', 'normal');

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — COVER
  // ══════════════════════════════════════════════════════════════════════════
  // Full bleed navy header
  fill(doc, C.navy);
  doc.rect(0, 0, PW, 90, 'F');
  fill(doc, C.teal);
  doc.rect(0, 90, PW, 3, 'F');

  // Decorative circles
  doc.setFillColor(12, 114, 119);
  doc.setGState(doc.GState({ opacity: 0.25 }));
  doc.circle(PW - 20, 30, 55, 'F');
  doc.circle(20, 75, 30, 'F');
  doc.setGState(doc.GState({ opacity: 1 }));

  // Title block
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  rgb(doc, C.white);
  doc.text('BUILDING ENERGY', ML, 35);
  doc.setFontSize(22);
  doc.text('PERFORMANCE REPORT', ML, 46);

  fill(doc, C.sage);
  doc.rect(ML, 52, 40, 1.5, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  rgb(doc, C.slateLight);
  doc.text('ClimaBuild AI  ·  Physics-Informed Machine Learning', ML, 60);
  doc.text('ECBC 2017 / BEE / ASHRAE 90.1-2019 Compliance', ML, 66);

  // Location + date badges
  fill(doc, C.teal);
  roundRect(doc, ML, 74, 65, 10, 2, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  rgb(doc, C.white);
  doc.text(`📍  ${cityName}`, ML + 3, 80.5);

  fill(doc, C.navy);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  roundRect(doc, ML + 70, 74, 50, 10, 2, 'FD');
  doc.setFontSize(7.5);
  rgb(doc, C.slateLight);
  doc.text(`Generated: ${reportDate}`, ML + 95, 80.5, { align: 'center' });

  // Hero KPIs
  const heroY = 98;
  const cardW = (CW - 12) / 4;
  const heroCards = [
    { label: 'Predicted EUI', value: predicted_eui.toFixed(1), unit: 'kWh/m²·yr', color: C.orange, badge: efficiency > 0 ? `−${efficiency.toFixed(0)}%` : `+${Math.abs(efficiency).toFixed(0)}%` },
    { label: 'BEE Baseline', value: (baseline_eui ?? 180).toFixed(1), unit: 'kWh/m²·yr', color: C.slate },
    { label: 'CO₂ Intensity', value: co2Intensity.toFixed(1), unit: 'kgCO₂/m²·yr', color: C.sage },
    { label: 'Annual Savings', value: `₹${(savings / 1000).toFixed(0)}K`, unit: 'vs. Baseline', color: C.teal },
  ];
  heroCards.forEach((c, i) => {
    kpiCard(doc, ML + i * (cardW + 4), heroY, cardW, 28, c.label, c.value, c.unit, c.color, c.badge);
  });

  // Project meta table
  const metaY = heroY + 34;
  fill(doc, C.bg);
  stroke(doc, C.border);
  doc.setLineWidth(0.3);
  roundRect(doc, ML, metaY, CW, 42, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  rgb(doc, C.navy);
  doc.text('PROJECT PARAMETERS', ML + 4, metaY + 6);
  divider(doc, metaY + 8);

  const meta: [string, string][] = [
    ['Building Archetype',     (formData?.archetype || '—').replace('_', ' ').toUpperCase()],
    ['Floor Area',             `${formData?.floor_area_m2 || '—'} m²`],
    ['HVAC System',            formData?.hvac_type || '—'],
    ['Orientation',            formData?.orientation || '—'],
    ['Climate Zone',           `${climateZone.zone} (${climateZone.code})`],
    ['Operating Hours',        `${formData?.operating_hours || '—'} hrs/wk`],
    ['Occupancy Density',      `${formData?.occupancy_density || '—'} persons/m²`],
    ['Equipment Load',         `${formData?.equipment_load || '—'} W/m²`],
    ['Window-Wall Ratio (WWR)',`${((formData?.wwr || 0) * 100).toFixed(0)}%`],
    ['ML Model',               formData?.model_type || 'XGBoost'],
  ];

  const half = Math.ceil(meta.length / 2);
  meta.forEach(([k, v], i) => {
    const col = i < half ? 0 : 1;
    const row = i < half ? i : i - half;
    const cx2 = ML + 4 + col * (CW / 2);
    const ry  = metaY + 14 + row * 5.5;
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    rgb(doc, C.slate);
    doc.text(k + ':', cx2, ry);
    doc.setFont('helvetica', 'normal');
    rgb(doc, C.black);
    const valLines = wrapText(doc, v, (CW/2) - 50);
    valLines.forEach((line, li) => doc.text(line, cx2 + 43, ry + li * 3.5));
  });

  // ECBC compliance badge
  const ecbcY = metaY + 49;
  const ecbcStatus = ecbc_compliance?.status ?? 'N/A';
  const ecbcCol = ecbcStatus.includes('Super') ? C.emerald : ecbcStatus.includes('ECBC+') ? C.teal : ecbcStatus.includes('Compliant') ? C.sage : C.orange;
  fill(doc, ecbcCol);
  roundRect(doc, ML, ecbcY, 60, 8, 2, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  rgb(doc, C.white);
  doc.text(`ECBC Status: ${ecbcStatus}`, ML + 30, ecbcY + 5.5, { align: 'center' });

  // BEE star rating area
  const starVal = predicted_eui < 100 ? 5 : predicted_eui < 130 ? 4 : predicted_eui < 160 ? 3 : predicted_eui < 200 ? 2 : 1;
  fill(doc, C.navy);
  roundRect(doc, ML + 65, ecbcY, 60, 8, 2, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  rgb(doc, C.white);
  doc.text(`BEE Star Rating: ${'★'.repeat(starVal)}${'☆'.repeat(5 - starVal)}  (${starVal}/5)`, ML + 95, ecbcY + 5.5, { align: 'center' });

  // Confidence
  const conf = evidence_panel?.overall_confidence ? Math.round(evidence_panel.overall_confidence * 100) : 88;
  fill(doc, C.bg);
  stroke(doc, C.border);
  roundRect(doc, ML + 130, ecbcY, 48, 8, 2, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  rgb(doc, C.teal);
  doc.text(`System Confidence: ${conf}%`, ML + 154, ecbcY + 5.5, { align: 'center' });

  // Cover footer
  fill(doc, C.navy);
  doc.rect(0, PH - 20, PW, 20, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  rgb(doc, C.slateLight);
  const footerRefs = 'References: BEE ECBC 2017 | ASHRAE 90.1-2019 | NBC 2016 | CEA Grid Emission Factor 2022 | BMTPC Schedule of Rates 2024 | NASA POWER API | CPWD 2024';
  doc.text(footerRefs, PW / 2, PH - 12, { align: 'center', maxWidth: CW });
  doc.text(`Page 1  ·  Confidential  ·  For Technical Use`, PW / 2, PH - 7, { align: 'center' });

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 2 — ENERGY ANALYSIS + SENSITIVITY
  // ══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  pageHeader(doc, `Energy Performance Analysis  ·  ${cityName}`);
  let y = MT + 8;

  y = sectionHeader(doc, y, '1. Energy Use Intensity (EUI) — Scenario Comparison', C.navy);

  // EUI bar chart
  barChart(doc, ML + 25, y, CW - 25, 48, euiData);
  y += 65;

  // KPI row — quick metrics
  const qCards = [
    { label: 'Operational EUI', value: predicted_eui.toFixed(1), unit: 'kWh/m²·yr', color: C.orange },
    { label: 'CO₂ Intensity',   value: co2Intensity.toFixed(1),  unit: 'kg CO₂/m²·yr', color: C.sage },
    { label: 'Annual CO₂',      value: co2Total.toFixed(1),      unit: 'tonnes CO₂/yr', color: C.teal },
    { label: 'Efficiency Gain', value: `${efficiency.toFixed(1)}%`, unit: 'vs. Baseline', color: C.emerald },
  ];
  const qW = (CW - 9) / 4;
  qCards.forEach((c, i) => kpiCard(doc, ML + i * (qW + 3), y, qW, 22, c.label, c.value, c.unit, c.color));
  y += 28;

  // Climate summary strip
  fill(doc, C.bg);
  stroke(doc, C.border);
  doc.setLineWidth(0.3);
  roundRect(doc, ML, y, CW, 14, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  rgb(doc, C.navy);
  doc.text('CLIMATE DATA', ML + 4, y + 9);
  const climateFields: [string, string][] = [
    ['Zone',         `${climateZone.zone} (${climateZone.code})`],
    ['CDD',          `${climate_summary?.cdd?.toFixed(0) ?? '—'} °C·d`],
    ['HDD',          `${climate_summary?.hdd?.toFixed(0) ?? '—'} °C·d`],
    ['Solar Rad.',   `${climate_summary?.annual_solrad?.toFixed(1) ?? '—'} kWh/m²/yr`],
    ['Peak Temp.',   `${climate_summary?.peak_summer_temp ?? '—'} °C`],
    ['Source',       evidence_panel?.climate_source_metadata?.source || 'NASA POWER'],
  ];
  climateFields.forEach(([k, v], i) => {
    kv(doc, ML + 35 + i * 28, y + 9, k + ': ', v);
  });
  y += 20;

  y = checkBreak(doc, y, 90, `Energy Performance Analysis  ·  ${cityName}`);
  y = sectionHeader(doc, y, '2. Sensitivity Analysis — Tornado Chart (±50% Parameter Variation)', C.teal);

  // Two-column layout: tornado chart left, bar chart right
  const halfW = (CW - 6) / 2;
  if (sensData.length > 0) {
    tornadoChart(doc, ML, y, halfW, 55, sensData);
  }

  // Sensitivity importance bars on right — 8 params, tight layout
  if (sensData.length > 0) {
    const maxRI = Math.max(...(sensitivity_analysis
      ? Object.values(sensitivity_analysis).map((d: any) => d.relative_importance ?? 0)
      : [1]), 1);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    rgb(doc, C.navy);
    doc.text('RELATIVE IMPORTANCE RANKING', ML + halfW + 6, y);
    const barColX = ML + halfW + 6;
    const barMaxW = halfW - 28;           // safe column width for bars
    let ry = y + 6;
    const sortedSens = Object.entries(sensitivity_analysis || {})
      .sort(([, a]: any, [, b]: any) => (b.relative_importance ?? 0) - (a.relative_importance ?? 0));
    sortedSens.forEach(([param, d]: [string, any]) => {
      if (ry > y + 70) return;            // hard stop — don't overflow into insight box
      const ri = d.relative_importance ?? 0;
      const bw = clamp((ri / maxRI) * barMaxW, 1, barMaxW);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      rgb(doc, C.black);
      doc.text(param.replace(/_/g, ' '), barColX, ry + 3.5);
      fill(doc, C.teal);
      roundRect(doc, barColX, ry + 4.5, bw, 3, 1, 'F');
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      rgb(doc, C.slate);
      doc.text(`${ri.toFixed(1)}`, barColX + bw + 1.5, ry + 7);
      ry += 9;
    });
  }
  y += 75;

  // Insight text
  fill(doc, C.bg);
  stroke(doc, C.border);
  doc.setLineWidth(0.2);
  roundRect(doc, ML, y, CW, 20, 2, 'FD');
  fill(doc, C.teal);
  doc.rect(ML, y, 2, 20, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  rgb(doc, C.navy);
  doc.text('Strategic Design Insight', ML + 5, y + 6);
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'normal');
  rgb(doc, C.slate);
  const insightText = 'Each parameter was varied ±50% from its baseline while all others were held constant (ceteris paribus). The parameter with the largest relative range represents the highest-leverage design lever for energy reduction. Real-world interactions between parameters can amplify or dampen these individual effects. Methodology: ASHRAE Handbook of Fundamentals (2021) Ch. 18.';
  const insightLines = wrapText(doc, insightText, CW - 10);
  insightLines.slice(0, 3).forEach((line, li) => doc.text(line, ML + 5, y + 12 + li * 4.5));
  y += 26;

  footer(doc, 2, 5);

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 3 — MATERIAL RECOMMENDATIONS + MONTHLY CLIMATE + RADAR
  // ══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  pageHeader(doc, `Material Recommendations & Climate Profile  ·  ${cityName}`);
  y = MT + 8;

  y = checkBreak(doc, y, 90, `Material Recommendations & Climate Profile  ·  ${cityName}`);
  y = sectionHeader(doc, y, '3. Material Recommendations — Multi-Scenario Comparison', C.sage);

  // Recommendations table
  const recs = top_material_recommendations || [];
  const thY = y;
  const cols = [18, 50, 50, 22, 22, 16] as number[];
  const heads = ['Rank', 'Wall System', 'Roof System', 'EUI\n(kWh/m²·yr)', 'Embodied\nCarbon (kgCO₂e)', 'Score'];
  const scenarios = ['Optimum\n(Max Eff.)', 'Balanced\nCost', 'Eco\nSustainability'];
  const rowColors: [number,number,number][] = [C.teal, C.sage, C.emerald];

  // Header row
  fill(doc, C.navy);
  doc.rect(ML, thY, CW, 9, 'F');
  let cx3 = ML;
  heads.forEach((h, hi) => {
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    rgb(doc, C.white);
    const lines = h.split('\n');
    lines.forEach((line, li) => doc.text(line, cx3 + 2, thY + 4 + li * 3.5));
    cx3 += cols[hi];
  });
  y = thY + 9;

  recs.slice(0, 3).forEach((rec: any, ri: number) => {
    const rowY = y + ri * 18;
    fill(doc, ri % 2 === 0 ? C.white : C.bg);
    stroke(doc, C.border);
    doc.setLineWidth(0.2);
    doc.rect(ML, rowY, CW, 18, 'FD');

    // Accent bar
    fill(doc, rowColors[ri]);
    doc.rect(ML, rowY, 3, 18, 'F');

    const cells = [
      scenarios[ri],
      rec.wall || '—',
      rec.roof || '—',
      rec.predicted_eui?.toFixed(1) ?? '—',
      rec.embodied_carbon?.toFixed(1) ?? '—',
      rec.cost_score?.toFixed(1) ?? '—',
    ];
    let cx4 = ML + 3;
    cells.forEach((cell, ci) => {
      doc.setFontSize(6.3);
      doc.setFont('helvetica', ci < 2 ? 'normal' : 'bold');
      rgb(doc, ci < 2 ? C.black : rowColors[ri]);
      const lines2 = wrapText(doc, cell, cols[ci] - 3);
      lines2.slice(0, 3).forEach((line, li) => doc.text(line, cx4 + 2, rowY + 5 + li * 4));
      cx4 += cols[ci];
    });
  });
  y += 3 * 18 + 6;

  // Current envelope properties
  fill(doc, C.bg);
  stroke(doc, C.border);
  doc.setLineWidth(0.2);
  roundRect(doc, ML, y, CW, 20, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  rgb(doc, C.navy);
  doc.text('CURRENT BASELINE ENVELOPE (CPWD / BMTPC Verified)', ML + 4, y + 5.5);
  const envFields: [string, string][] = [
    ['Wall',    material_sources?.wall?.name   || '—'],
    ['Roof',    material_sources?.roof?.name   || '—'],
    ['Glazing', material_sources?.glazing?.name || '—'],
    ['Wall U-Value',   `${(formData?.property_overrides?.u_wall ?? '—')} W/m²·K`],
    ['Roof U-Value',   `${(formData?.property_overrides?.u_roof ?? '—')} W/m²·K`],
    ['Glass SHGC',     `${(formData?.property_overrides?.shgc   ?? '—')}`],
  ];
  envFields.forEach(([k, v], i) => {
    const col = i < 3 ? 0 : 1;
    const row = i < 3 ? i : i - 3;
    kv(doc, ML + 4 + col * (CW / 2), y + 12 + row * 4.5, k + ': ', v);
  });
  y += 26;

  // Monthly climate chart
  if (mCDD.length === 12 || mHDD.length === 12) {
    y = checkBreak(doc, y, 70, `Material Recommendations & Climate Profile  ·  ${cityName}`);
    y = sectionHeader(doc, y, '4. Monthly Climate Load Profile — Degree Days (Base 18.3°C)', C.teal);
    monthlyChart(doc, ML + 10, y, CW - 10, 50, mCDD, mHDD);
    y += 70;
  }

  // Radar chart
  y = checkBreak(doc, y, 70, `Material Recommendations & Climate Profile  ·  ${cityName}`);
  y = sectionHeader(doc, y, '5. Multi-Criteria Performance Radar — Normalised Scenario Scores (0–100)', C.navy);
  const radarCX = ML + CW / 4 + 5;
  const radarCY = y + 45;
  radarChart(doc, radarCX, radarCY, 35,
    ['Energy\nEfficiency', 'Low Embodied\nCarbon', 'Cost\nEfficiency', 'ECBC\nCompliance'],
    radarDatasets.slice(0, 4)
  );

  // Radar explanation text
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  rgb(doc, C.slate);
  const radarExpl = [
    'The radar chart normalises four sustainability dimensions to a 0–100 scale (higher = better):',
    '• Energy Efficiency: Based on predicted EUI vs worst-case scenario across all options.',
    '• Low Embodied Carbon: Material lifecycle CO₂e sourced from BMTPC 2024 data.',
    '• Cost Efficiency: Inverse of material cost index per CPWD 2024 schedule of rates.',
    '• ECBC Compliance: EUI proximity to ECBC 2017 zone-specific compliance thresholds.',
    '',
    'Ref: ASHRAE 90.1-2019; BEE ECBC 2017; BMTPC Rates 2024; NBC 2016 Part 8.',
  ];
  radarExpl.forEach((line, li) => doc.text(line, ML + CW / 2 + 5, y + 10 + li * 5));

  footer(doc, 3, 5);

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 4 — SHAP EXPLAINABILITY + LCCA + THERMAL COMFORT
  // ══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  pageHeader(doc, `AI Explainability, LCCA & Thermal Analysis  ·  ${cityName}`);
  y = MT + 8;

  // SHAP section
  if (shapDrivers.length > 0) {
    y = sectionHeader(doc, y, '6. AI Explainability — SHAP (SHapley Additive exPlanations) Values', C.orange);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    rgb(doc, C.slate);
    const shapIntro = 'SHAP values reveal how each input parameter contributed to the EUI prediction relative to the model\'s average baseline. Positive (orange) values push EUI higher; negative (teal) values reduce it. Based on Lundberg & Lee (2017) NeurIPS unified framework for model explanation.';
    wrapText(doc, shapIntro, CW).forEach((l, li) => doc.text(l, ML, y + li * 4));
    y += 14;

    shapChart(doc, ML + 20, y, CW - 20, Math.min(shapDrivers.length * 10 + 10, 65), shapDrivers);
    y += Math.min(shapDrivers.length * 10 + 10, 65) + 20;
  }

  // Thermal comfort gauge
  y = sectionHeader(doc, y, '7. Thermal Comfort Assessment — Envelope Proxy (ISO 7730 PMV Scale)', C.teal);

  const tcIdx   = thermal_comfort?.index ?? 0;
  const tcStat  = thermal_comfort?.status ?? 'Neutral';
  const tcColor = tcStat === 'Hot' || tcStat === 'Warm' ? C.orange : tcStat === 'Cold' || tcStat === 'Cool' ? C.navy : C.sage;

  gaugeChart(doc, ML + 35, y + 30, 22, Math.abs(tcIdx) * 16.66 + 50, 100, `${tcStat} (${tcIdx > 0 ? '+' : ''}${tcIdx.toFixed(1)})`, 'PMV Index  ·  ISO 7730:2005', tcColor);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  rgb(doc, C.slate);
  const tcText = [
    `Thermal Stress Proxy: ${tcIdx.toFixed(2)}  (${tcStat})`,
    '',
    'This is an envelope-based proxy mapped onto the ISO 7730 Predicted Mean Vote (PMV)',
    'scale (−3 Cold → 0 Neutral → +3 Hot). A full PMV calculation additionally requires',
    'air velocity, clothing insulation (clo), and metabolic rate (met). Use as a relative',
    'indicator only — detailed occupant comfort analysis per ASHRAE 55-2023 §6.2 is',
    'recommended for final design validation.',
    '',
    `BEE ECBC Zone: ${ecbc_compliance?.climate_zone ?? climateZone.zone}`,
    `Model R²: ${(model_metrics?.r2 || 0).toFixed(3)}  |  MAE: ${(model_metrics?.mae || 0).toFixed(1)} kWh/m²·yr`,
    `Prediction Interval: ${evidence_panel?.prediction_interval ? `${evidence_panel.prediction_interval[0].toFixed(1)}–${evidence_panel.prediction_interval[1].toFixed(1)} kWh/m²·yr` : 'N/A'}`,
  ];
  tcText.forEach((line, li) => doc.text(line, ML + 80, y + 6 + li * 4.5));
  y += 65;

  // LCCA section
  y = checkBreak(doc, y, 80, `AI Explainability, LCCA & Thermal Analysis  ·  ${cityName}`);
  y = sectionHeader(doc, y, '8. Life Cycle Cost Analysis (LCCA) — 30-Year Horizon', C.emerald);

  // LCCA params
  fill(doc, C.bg);
  stroke(doc, C.border);
  doc.setLineWidth(0.2);
  roundRect(doc, ML, y, CW, 10, 2, 'FD');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  rgb(doc, C.slate);
  const lccaParams: [string, string][] = [
    ['Electricity Rate', `₹${lccaP.elecRate}/kWh`],
    ['Discount Rate', `${lccaP.discountRate}%`],
    ['Energy Inflation', `${lccaP.inflationRate}%`],
    ['Payback Period', paybackYear ? `${paybackYear} years` : (currentUpfront <= baselineUpfront ? 'Immediate' : 'No Payback')],
    ['Curr. Upfront', `₹${(currentUpfront / 100000).toFixed(1)}L`],
    ['Base Upfront', `₹${(baselineUpfront / 100000).toFixed(1)}L`],
  ];
  lccaParams.forEach(([k, v], i) => kv(doc, ML + 4 + i * 30, y + 7, k + ': ', v));
  y += 15;

  lccaChart(doc, ML + 15, y, CW - 15, 55, lccaData.filter(d => d.year % 2 === 0));
  y += 75;

  footer(doc, 4, 5);

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 5 — METHODOLOGY, MODEL METRICS & REFERENCES
  // ══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  pageHeader(doc, `Methodology, Model Metrics & References`);
  y = MT + 8;

  y = checkBreak(doc, y, 70, `Methodology, Model Metrics & References`);
  y = sectionHeader(doc, y, '9. Physics-Informed Hybrid ML Methodology', C.navy);

  const methodSections = [
    {
      title: '9.0 Training Data',
      body: `Training dataset: N=${(model_metrics?.training_samples ?? 25015).toLocaleString()} building energy profiles — a physics-calibrated parametric sweep (ISO 13790 heat balance, ECBC 2017, ASHRAE 90.1) across all five ECBC 2017 climate zones, anchored against 15 published real-building benchmarks (BEE 2014, IGBC 2022, TERI 2014/2019). Input ranges calibrated to BEE benchmark EUI envelopes for office, retail, and healthcare archetypes. Synthetic simulation-based training is standard practice in building ML literature (cf. Fayaz & Kim 2018; Dino & Üçoluk 2017). Selected model: ${formData?.model_type || 'XGBoost'} with 5-fold cross-validation. 80/20 train/test split. 19 physics-informed features.`
    },
    {
      title: '9.1 Hybrid Engine Architecture',
      body: `The prediction engine combines Gradient-Boosted Decision Trees (${formData?.model_type || 'XGBoost'}) trained on synthetic, physics-calibrated (ISO 13790 / ECBC 2017 / ASHRAE 90.1) building energy simulation datasets with deterministic thermodynamic physics equations. The ML component predicts the thermal envelope baseline EUI, while the physics layer accounts for internal loads (plug loads, occupancy metabolic heat) and schedule scaling.`
    },
    {
      title: '9.2 Schedule & Occupancy Scaling',
      body: 'ThermalEUI = BaseML_EUI × (Operating_Hours / 50)  |  OccPenalty = 1.0 + (Density × 0.5)  |  ScaledThermal = ThermalEUI × OccPenalty. The base model is trained on a 50 hr/wk standard. Operating schedule deviations are corrected by linear scaling of HVAC loads. Occupant metabolic heat (75 W/person per ISO 7730:2005) is added as a thermodynamic penalty scaled by occupancy density.'
    },
    {
      title: '9.3 Deterministic Plug & Metabolic Loads',
      body: 'PlugEUI = (W/m² × hrs/wk × 52) / 1000  |  OccEUI = (75W × ρ_occ × hrs/wk × 52) / (1000 × COP_hvac)  |  EUI_final = EUI_thermal × (t/50) + PlugEUI + OccEUI. This hybrid equation uniquely combines ML thermal prediction with physics-based internal gain calculations, giving higher accuracy than either approach alone.'
    },
    {
      title: '9.4 Sensitivity Analysis Methodology',
      body: 'A one-at-a-time (OAT) ceteris paribus sensitivity analysis is applied. Each input parameter is varied ±50% from its baseline value while all other parameters are held constant. The EUI response range quantifies each parameter\'s leverage on energy performance. Ref: ASHRAE Handbook of Fundamentals (2021) Ch. 18.'
    },
    {
      title: '9.5 ECBC Compliance Verification',
      body: `Building compliance is assessed against ECBC 2017 (Energy Conservation Building Code) thresholds for the ${climateZone.zone} climate zone. SuperECBC requires EUI ≤ ${(baseline_eui * 0.50).toFixed(0)} kWh/m²·yr; ECBC+ ≤ ${(baseline_eui * 0.75).toFixed(0)}; ECBC Compliant ≤ ${baseline_eui?.toFixed(0)} kWh/m²·yr. Source: BEE ECBC 2017 §3.1 and Table 5.3–5.5.`
    },
  ];

  methodSections.forEach(section => {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    rgb(doc, C.navy);
    doc.text(section.title, ML, y);
    y += 4;
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    rgb(doc, C.slate);
    const lines = wrapText(doc, section.body, CW);
    lines.slice(0, 3).forEach(line => { doc.text(line, ML, y); y += 4; });
    y += 3;
  });

  // Model metrics table
  y = sectionHeader(doc, y, '10. Model Performance Metrics', C.teal);
  const metricsData = [
    ['Metric', 'Value', 'Interpretation'],
    ['R² (Coefficient of Determination)', (model_metrics?.r2 ?? 0).toFixed(4), 'Fraction of EUI variance explained by the model (1.0 = perfect fit)'],
    ['MAE (Mean Absolute Error)', `${(model_metrics?.mae ?? 0).toFixed(2)} kWh/m²·yr`, 'Mean absolute difference between predicted and true EUI on held-out test set'],
    ['RMSE (Root Mean Sq. Error)', `${(model_metrics?.rmse ?? 0).toFixed(2)} kWh/m²·yr`, 'Penalises large errors more than MAE; sensitive to outliers'],
    ['CV R² (5-Fold, μ ± σ)', model_metrics?.cv_r2_mean != null ? `${model_metrics.cv_r2_mean.toFixed(4)} ± ${(model_metrics.cv_r2_std ?? 0).toFixed(4)}` : 'N/A', 'Cross-validation R² on training set — verifies absence of over-fitting'],
    ['CV MAE (5-Fold, μ ± σ)', model_metrics?.cv_mae_mean != null ? `${model_metrics.cv_mae_mean.toFixed(2)} ± ${(model_metrics.cv_mae_std ?? 0).toFixed(2)} kWh/m²·yr` : 'N/A', 'Cross-validation MAE — generalisation performance estimate'],
    ['Uncertainty (95% CI)', model_metrics?.uncertainty_ci ? `±${model_metrics.uncertainty_ci.toFixed(1)} kWh/m²·yr` : 'N/A', 'Bootstrap/ensemble confidence interval on this specific prediction'],
    ['Physics Anomaly Flag', evidence_panel?.physics_anomalies_detected ? 'DETECTED — low confidence' : 'None — inputs within normal bounds', 'Thermodynamic guardrail trigger: flags CDD>8000 or HDD>6000'],
    ['Training Data', `N=${(model_metrics?.training_samples ?? 25015).toLocaleString()} synthetic profiles`, 'ISO 13790 / ECBC 2017 / ASHRAE 90.1 physics-calibrated parametric sweep plus published BEE/IGBC/TERI benchmark anchors'],
  ];
  metricsData.forEach((row, ri) => {
    const rowY = y + ri * 7;
    fill(doc, ri === 0 ? C.navy : ri % 2 === 0 ? C.white : C.bg);
    doc.rect(ML, rowY, CW, 7, 'F');
    stroke(doc, C.border);
    doc.setLineWidth(0.15);
    doc.rect(ML, rowY, CW, 7, 'S');
    const mCols = [75, 55, 48];
    let mx = ML;
    row.forEach((cell, ci) => {
      doc.setFontSize(6.3);
      doc.setFont('helvetica', ri === 0 ? 'bold' : ci === 0 ? 'bold' : 'normal');
      rgb(doc, ri === 0 ? C.white : ci === 0 ? C.black : C.slate);
      doc.text(cell, mx + 2, rowY + 4.8);
      mx += mCols[ci];
    });
  });
  y += metricsData.length * 7 + 6;

  // ── Section 10.2 Benchmark Validation ────────────────────────────────────
  if (y + 80 > PH - 25) { doc.addPage(); y = MT; }
  y = sectionHeader(doc, y, '10.2 External Benchmark Validation — BEE Published EUI Ranges', C.emerald);

  // Intro text
  const archLabel = (formData?.archetype ?? 'office_small').replace(/_/g, ' ');
  const bv = validateAgainstBenchmark(
    results?.predicted_eui ?? 0,
    formData?.archetype ?? 'office_small',
    results?.ecbc_compliance?.climate_zone,
    results?.climate_summary?.cdd,
    results?.climate_summary?.hdd,
    results?.climate_summary?.annual_solrad,
  );
  const introText = `Predicted EUI of ${(results?.predicted_eui ?? 0).toFixed(1)} kWh/m²·yr for a ${archLabel} building in a ${bv.zone} climate zone is ${ bv.deviation < 0 ? Math.abs(bv.deviationPct).toFixed(1) + '% BELOW' : bv.deviationPct.toFixed(1) + '% above'} the published typical value of ${bv.range.typical} kWh/m²·yr. ECBC 2017 prescriptive baseline for this zone: ${bv.range.ecbcBaseline} kWh/m²·yr. BEE Star Rating estimate: ${bv.beeStarRating.toFixed(1)}★. Status: ${bv.statusLabel}.`;
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); rgb(doc, C.slate);
  const introLines = wrapText(doc, introText, CW);
  introLines.forEach(line => { if (y < PH - 30) { doc.text(line, ML, y); y += 3.8; } });
  y += 4;

  // All-zone comparison table
  const summaryRows = getBenchmarkSummaryTable(formData?.archetype ?? 'office_small');
  const benchHeader = ['Climate Zone', 'Stock Min', 'Typical', 'Stock Max', 'BEE 5★', 'ECBC Baseline', 'Predicted EUI', 'Agreement'];
  const benchColW  = [34, 20, 20, 22, 18, 28, 26, 30];

  // Header row
  let bx = ML;
  fill(doc, C.navy); doc.rect(ML, y, CW, 7, 'F');
  benchHeader.forEach((h, ci) => {
    doc.setFontSize(6); doc.setFont('helvetica', 'bold'); rgb(doc, C.white);
    doc.text(h, bx + 2, y + 4.8);
    bx += benchColW[ci];
  });
  y += 7;

  summaryRows.forEach(({ zone, range }, ri) => {
    const rowEUI   = zone === bv.zone ? (results?.predicted_eui ?? 0) : null;
    const isTarget = zone === bv.zone;
    const bg: [number,number,number] = isTarget ? [220, 252, 231] : ri % 2 === 0 ? C.white : C.bg;
    fill(doc, bg);
    stroke(doc, C.border);
    doc.setLineWidth(0.15);
    doc.rect(ML, y, CW, 7, 'FD');

    const cells = [
      zone,
      `${range.min}`,
      `${range.typical}`,
      `${range.max}`,
      `${range.bee5star}`,
      `${range.ecbcBaseline}`,
      rowEUI !== null ? `${rowEUI.toFixed(1)} ◄` : '—',
      rowEUI !== null
        ? (rowEUI < range.min ? '✓ Excellent' : rowEUI <= range.max ? '✓ Within Range' : '⚠ Above Range')
        : 'Reference',
    ];
    let cx = ML;
    cells.forEach((cell, ci) => {
      doc.setFontSize(6.2);
      const isBold = ci === 0 || (isTarget && ci >= 6);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      const cellCol: [number,number,number] = isTarget && ci === 6
        ? (bv.deviation < 0 ? C.emerald : C.orange)
        : isTarget && ci === 7
        ? (bv.status === 'above_range' ? C.orange : C.teal)
        : ci === 0 ? C.black : C.slate;
      rgb(doc, cellCol);
      doc.text(cell, cx + 2, y + 4.8);
      cx += benchColW[ci];
    });
    y += 7;
  });

  doc.setFontSize(6); doc.setFont('helvetica', 'italic'); rgb(doc, C.slateLight);
  doc.text('All values in kWh/m²·yr. ◄ = this building\'s predicted EUI. Sources: BEE Star Rating Programme 2020; TERI Energy Benchmarking 2019; ECBC 2017 §6; GRIHA 2022.', ML, y + 3.5);
  y += 10;

  y = checkBreak(doc, y, 60, `Methodology, Model Metrics & References`);
  y = sectionHeader(doc, y, '11. Data Sources & References', C.slate);
  const refs = [
    '[1] Bureau of Energy Efficiency (BEE). Energy Conservation Building Code (ECBC) 2017. Ministry of Power, Govt. of India.',
    '[2] ASHRAE Standard 90.1-2019: Energy Standard for Buildings Except Low-Rise Residential Buildings. ASHRAE, Atlanta.',
    '[3] National Building Code of India (NBC) 2016, Part 8: Building Services. Bureau of Indian Standards, New Delhi.',
    '[4] Central Electricity Authority (CEA). CO₂ Baseline Database for Indian Power Sector, 2022. Emission Factor: 0.82 kgCO₂/kWh.',
    '[5] BMTPC (Building Materials & Technology Promotion Council). Schedule of Rates 2024. Ministry of Housing & Urban Affairs.',
    '[6] NASA POWER (Prediction of Worldwide Energy Resources). Surface Meteorology & Solar Energy Dataset, 2024.',
    '[7] CPWD (Central Public Works Department). Specifications & Plinth Area Rates, 2024.',
    '[8] ISO 7730:2005. Ergonomics of the Thermal Environment — Analytical Determination of Thermal Comfort (PMV/PPD).',
    '[9] ASHRAE Standard 55-2023. Thermal Environmental Conditions for Human Occupancy.',
    '[10] Lundberg, S. M. & Lee, S.-I. (2017). A Unified Approach to Interpreting Model Predictions. NeurIPS.',
    '[11] IPCC AR6 WG3 §9.4. Buildings sector decarbonisation pathways. IPCC Sixth Assessment Report, 2022.',
    '[12] BIS SP 41 (2011). Handbook on Functional Requirements of Buildings (Other Than Industrial). Bureau of Indian Standards.',
  ];

  refs.forEach((ref, ri) => {
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    rgb(doc, C.slate);
    const refLines = wrapText(doc, ref, CW);
    refLines.forEach((line, li) => { if (y < PH - 25) { doc.text(line, ML, y + li * 3.5); } });
    y += refLines.length * 3.5 + 2;
  });

  // Disclaimer
  y += 3;
  fill(doc, C.bg);
  stroke(doc, C.border);
  doc.setLineWidth(0.2);
  if (y + 18 < PH - 20) {
    roundRect(doc, ML, y, CW, 18, 2, 'FD');
    fill(doc, C.amber);
    doc.rect(ML, y, 2, 18, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    rgb(doc, C.navy);
    doc.text('DISCLAIMER', ML + 5, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    rgb(doc, C.slate);
    const discl = 'This report is generated by an AI-assisted tool for preliminary design guidance only. All cost figures are relative comparison indices, not absolute construction estimates. Final design decisions must be validated by licensed mechanical engineers and comply with all applicable local codes and standards.';
    wrapText(doc, discl, CW - 10).forEach((line, li) => doc.text(line, ML + 5, y + 10 + li * 3.5));
  }

  footer(doc, 5, 5);

  // ─── Save ─────────────────────────────────────────────────────────────────
  const fileName = `ClimaBuild_Report_${cityName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
