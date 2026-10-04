import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export type ReportDay = { date: string; calories: number; protein: number; carbs: number; fat: number };
export type ReportInput = {
  name: string | null;
  from: string;
  to: string;
  target: number | null;
  days: ReportDay[];
  weights: { date: string; kg: number }[];
};

const INK = rgb(0.1, 0.09, 0.08);
const MUTED = rgb(0.37, 0.35, 0.31);
const TURMERIC = rgb(0.89, 0.63, 0.05);

/** The built-in PDF fonts only cover Latin-1; anything else becomes "?" instead of crashing. */
export function latin1(text: string): string {
  return text.replace(/[^\x20-\x7e\xa0-\xff]/g, "?");
}

export async function buildReport(input: ReportInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle("Nutrition report");
  doc.setProducer("Calorie Tracker");
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([595, 842]);
  let y = 790;
  const text = (p: PDFPage, s: string, x: number, size: number, font: PDFFont = regular, color = INK) =>
    p.drawText(latin1(s), { x, y, size, font, color });

  text(page, "Nutrition report", 50, 24, bold);
  y -= 24;
  text(page, `${input.name ? `${input.name} - ` : ""}${input.from} to ${input.to}`, 50, 11, regular, MUTED);
  y -= 30;

  const logged = input.days.filter((d) => d.calories > 0);
  const avg = logged.length ? Math.round(logged.reduce((s, d) => s + d.calories, 0) / logged.length) : 0;
  page.drawRectangle({ x: 50, y: y - 46, width: 495, height: 58, color: TURMERIC, borderColor: INK, borderWidth: 1.5 });
  text(page, `Average ${avg} kcal on ${logged.length} logged day${logged.length === 1 ? "" : "s"}`, 64, 14, bold);
  y -= 20;
  text(page, input.target ? `Daily target ${input.target} kcal` : "No calorie target set", 64, 11);
  y -= 50;

  const header = ["Date", "Calories", "Protein g", "Carbs g", "Fat g"];
  const cols = [50, 200, 290, 380, 470];
  const row = (cells: string[], font: PDFFont) => {
    if (y < 60) {
      page = doc.addPage([595, 842]);
      y = 790;
    }
    cells.forEach((c, i) => text(page, c, cols[i], 10, font));
    y -= 16;
  };
  row(header, bold);
  for (const d of input.days) {
    row([d.date, String(Math.round(d.calories)), d.protein.toFixed(1), d.carbs.toFixed(1), d.fat.toFixed(1)], regular);
  }

  if (input.weights.length) {
    y -= 14;
    row(["Weight", "kg"], bold);
    for (const w of input.weights) row([w.date, w.kg.toFixed(1)], regular);
  }

  for (const p of doc.getPages()) {
    p.drawText("Calorie Tracker. Estimates only; not medical advice.", { x: 50, y: 30, size: 8, font: regular, color: MUTED });
  }
  return doc.save();
}
