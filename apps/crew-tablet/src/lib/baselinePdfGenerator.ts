import type { BandPoint } from "../components/BandChart";
import { SYNDROME_ALERT_Z } from "../components/SyndromeStrip";
import { earthRangeText, type EarthRuleView } from "./earth";
import { fmt, fmtDelay, fmtRange, fmtSigned, humanise, unitLabel } from "./format";
import {
  crewRoles,
  EARTH_LABEL,
  LEVEL_COPY,
  type IndicatorMeta,
  PATTERN_COPY,
  PERSONAL_LABEL,
  SPACE_LABEL,
} from "./meta";
import type { CrewDay, LoadedScenario, Reading } from "./types";

export interface BaselinePdfParams {
  scenario: LoadedScenario;
  dayNumber: number;
  crewId: string;
  indicator: string;
  meta: IndicatorMeta;
  reading: Reading;
  earth?: EarthRuleView | null;
  member?: CrewDay;
  points: BandPoint[];
  syndrome: { day: number; z: number }[];
}

export interface GeneratedPdfResult {
  blob: Blob;
  url: string;
  filename: string;
  sizeBytes: number;
  download: () => void;
}

/* -------------------------------------------------------------------------- */
/* Palette and page geometry                                                   */
/* -------------------------------------------------------------------------- */

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 46;
const CONTENT_W = PAGE_W - M * 2;
const BOTTOM = 76;

const COLORS = {
  ink: "#102d40",
  ink2: "#294655",
  muted: "#526977",
  line: "#ccd6ce",
  lineStrong: "#7d9299",
  surface: "#fbfcf7",
  surface2: "#eef2ec",
  navy: "#102d40",
  accent: "#006e73",
  accentSoft: "#e6f1ef",
  magenta: "#a13e78",
  ok: "#16794a",
  watch: "#8f6106",
  act: "#b3401f",
  escalate: "#a51f4c",
  white: "#ffffff",
} as const;

function rgb(hex: string, alpha?: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  if (typeof alpha === "number") {
    return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`;
  }
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`;
}

function fill(hex: string): string {
  return rgb(hex);
}

function stroke(hex: string): string {
  return rgb(hex, 1);
}

function levelColor(level: string): string {
  if (level === "act") return COLORS.act;
  if (level === "escalate") return COLORS.escalate;
  if (level === "watch") return COLORS.watch;
  return COLORS.ok;
}

/* -------------------------------------------------------------------------- */
/* Text helpers                                                               */
/* -------------------------------------------------------------------------- */

/** Sanitize text for the standard PDF Type1 fonts (no Unicode beyond ASCII). */
function sanitizePdfText(str: string): string {
  if (!str) return "";
  return str
    .replace(/\u00b0C/g, " deg C")
    .replace(/\u00b0/g, " deg")
    .replace(/\u2082/g, "2")
    .replace(/\u00b1/g, "+/-")
    .replace(/\u03bc/g, "u")
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\u00b7/g, " | ")
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201c|\u201d/g, '"')
    .replace(/[\\()]/g, "\\$&")
    .replace(/[^\x20-\x7E]/g, " ");
}

function textWidth(text: string, size: number, bold = false): number {
  return text.length * size * (bold ? 0.56 : 0.52);
}

function wrapText(text: string, maxWidth: number, size: number, bold = false): string[] {
  const maxChars = Math.max(8, Math.floor(maxWidth / (size * (bold ? 0.56 : 0.52))));
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!word) continue;
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    if (word.length > maxChars) {
      let rest = word;
      while (rest.length > maxChars) {
        lines.push(rest.slice(0, maxChars));
        rest = rest.slice(maxChars);
      }
      current = rest;
    } else {
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function truncate(text: string, maxWidth: number, size: number, bold = false): string {
  const maxChars = Math.max(4, Math.floor(maxWidth / (size * (bold ? 0.56 : 0.52))));
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

/* -------------------------------------------------------------------------- */
/* Low-level zero-dependency PDF 1.4 writer                                   */
/* -------------------------------------------------------------------------- */

class PdfDocument {
  private header = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  private nextObjNum = 7;
  private pages: { contentStream: Uint8Array; images: string[] }[] = [];
  private imageObjects: {
    name: string;
    objNum: number;
    width: number;
    height: number;
    jpeg: Uint8Array;
  }[] = [];

  public addImage(jpegBytes: Uint8Array, width: number, height: number): string {
    const name = `Im${this.imageObjects.length + 1}`;
    const objNum = this.nextObjNum++;
    this.imageObjects.push({ name, objNum, width, height, jpeg: jpegBytes });
    return name;
  }

  public addPage(contentStream: string, imagesUsed: string[] = []) {
    const enc = new TextEncoder();
    this.pages.push({ contentStream: enc.encode(contentStream), images: imagesUsed });
  }

  public buildBytes(): Uint8Array {
    const enc = new TextEncoder();
    const allObjs: { num: number; data: Uint8Array }[] = [];

    allObjs.push({ num: 1, data: enc.encode("<< /Type /Catalog /Pages 2 0 R >>") });

    allObjs.push({
      num: 3,
      data: enc.encode("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),
    });
    allObjs.push({
      num: 4,
      data: enc.encode("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"),
    });
    allObjs.push({
      num: 5,
      data: enc.encode("<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>"),
    });
    allObjs.push({
      num: 6,
      data: enc.encode("<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>"),
    });

    for (const img of this.imageObjects) {
      const headerStr = `<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.jpeg.length} >>\nstream\n`;
      const footerStr = "\nendstream";
      const hBytes = enc.encode(headerStr);
      const fBytes = enc.encode(footerStr);
      const combined = new Uint8Array(hBytes.length + img.jpeg.length + fBytes.length);
      combined.set(hBytes, 0);
      combined.set(img.jpeg, hBytes.length);
      combined.set(fBytes, hBytes.length + img.jpeg.length);
      allObjs.push({ num: img.objNum, data: combined });
    }

    const pageObjNums: number[] = [];
    for (const p of this.pages) {
      const streamObjNum = this.nextObjNum++;
      const pageObjNum = this.nextObjNum++;
      pageObjNums.push(pageObjNum);

      const sHead = enc.encode(`<< /Length ${p.contentStream.length} >>\nstream\n`);
      const sFoot = enc.encode("\nendstream");
      const sData = new Uint8Array(sHead.length + p.contentStream.length + sFoot.length);
      sData.set(sHead, 0);
      sData.set(p.contentStream, sHead.length);
      sData.set(sFoot, sHead.length + p.contentStream.length);
      allObjs.push({ num: streamObjNum, data: sData });

      let xobjDict = "";
      if (p.images.length > 0) {
        const entries = p.images
          .map((imgName) => {
            const found = this.imageObjects.find((i) => i.name === imgName);
            return found ? `/${imgName} ${found.objNum} 0 R` : "";
          })
          .filter(Boolean)
          .join(" ");
        xobjDict = ` /XObject << ${entries} >>`;
      }

      const pageDef = enc.encode(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R /F4 6 0 R >>${xobjDict} >> /Contents ${streamObjNum} 0 R >>`,
      );
      allObjs.push({ num: pageObjNum, data: pageDef });
    }

    const kidsStr = pageObjNums.map((n) => `${n} 0 R`).join(" ");
    allObjs.push({
      num: 2,
      data: enc.encode(`<< /Type /Pages /Kids [${kidsStr}] /Count ${pageObjNums.length} >>`),
    });

    allObjs.sort((a, b) => a.num - b.num);

    const headerBytes = enc.encode(this.header);
    const bodyChunks: Uint8Array[] = [];
    const offsets: number[] = [];

    let currentPos = headerBytes.length;
    for (const obj of allObjs) {
      offsets.push(currentPos);
      const head = enc.encode(`${obj.num} 0 obj\n`);
      const foot = enc.encode("\nendobj\n");
      bodyChunks.push(head, obj.data, foot);
      currentPos += head.length + obj.data.length + foot.length;
    }

    const xrefPos = currentPos;
    const maxNum = allObjs[allObjs.length - 1]?.num ?? 0;
    let xrefStr = `xref\n0 ${maxNum + 1}\n0000000000 65535 f \n`;

    const offsetMap = new Map<number, number>();
    for (let i = 0; i < allObjs.length; i++) {
      const item = allObjs[i];
      if (item) offsetMap.set(item.num, offsets[i] ?? 0);
    }
    for (let n = 1; n <= maxNum; n++) {
      const off = offsetMap.get(n) ?? 0;
      xrefStr += `${off.toString().padStart(10, "0")} 00000 n \n`;
    }

    const trailerStr = `trailer\n<< /Size ${maxNum + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
    const xrefBytes = enc.encode(xrefStr);
    const trailerBytes = enc.encode(trailerStr);

    let totalLen = headerBytes.length + xrefBytes.length + trailerBytes.length;
    for (const chunk of bodyChunks) totalLen += chunk.length;

    const finalBytes = new Uint8Array(totalLen);
    let offset = 0;
    finalBytes.set(headerBytes, offset);
    offset += headerBytes.length;
    for (const chunk of bodyChunks) {
      finalBytes.set(chunk, offset);
      offset += chunk.length;
    }
    finalBytes.set(xrefBytes, offset);
    offset += xrefBytes.length;
    finalBytes.set(trailerBytes, offset);

    return finalBytes;
  }
}

/* -------------------------------------------------------------------------- */
/* Content page with a vertical cursor                                        */
/* -------------------------------------------------------------------------- */

class PdfPage {
  public readonly commands: string[] = [];
  public readonly images: string[] = [];
  public y: number;

  constructor(startY = 740) {
    this.y = startY;
  }

  public rect(x: number, y: number, w: number, h: number, fillHex?: string, strokeHex?: string) {
    if (fillHex) this.commands.push(`${fill(fillHex)} ${x} ${y} ${w} ${h} re f`);
    if (strokeHex) {
      this.commands.push(`0.7 w ${stroke(strokeHex)} ${x} ${y} ${w} ${h} re S`);
    }
  }

  public text(
    value: string,
    x: number,
    y: number,
    size: number,
    font: 1 | 2 | 3 | 4,
    color: string,
    align: "left" | "center" | "right" = "left",
  ) {
    const safe = sanitizePdfText(value);
    let drawX = x;
    if (align !== "left") {
      const width = textWidth(safe, size, font === 2 || font === 4);
      drawX = align === "right" ? x - width : x - width / 2;
    }
    this.commands.push(
      `BT /F${font} ${size} Tf ${fill(color)} ${drawX.toFixed(2)} ${y.toFixed(2)} Td (${safe}) Tj ET`,
    );
  }

  public line(x1: number, y1: number, x2: number, y2: number, color = COLORS.line, width = 0.7) {
    this.commands.push(`${width} w ${stroke(color)} ${x1} ${y1} m ${x2} ${y2} l S`);
  }

  public image(name: string, x: number, y: number, w: number, h: number) {
    this.commands.push(`q ${w} 0 0 ${h} ${x} ${y} cm /${name} Do Q`);
    this.images.push(name);
  }
}

/* -------------------------------------------------------------------------- */
/* Report layout                                                              */
/* -------------------------------------------------------------------------- */

interface ReportContext {
  scenarioTitle: string;
  scenarioName: string;
  originLabel: string;
  crewId: string;
  crewRole: string;
  dayNumber: number;
  meta: IndicatorMeta;
  reading: Reading;
  earth?: EarthRuleView | null;
  member?: CrewDay;
  pattern: string;
  card: CrewDay["card"] | undefined;
  cardSource: string;
  reportId: string;
  generatedUtc: string;
}

class ReportBuilder {
  public readonly pages: PdfPage[] = [];
  public current: PdfPage;
  private readonly ctx: ReportContext;

  constructor(ctx: ReportContext) {
    this.ctx = ctx;
    this.current = this.newPage(false);
  }

  public newPage(continued: boolean): PdfPage {
    const page = new PdfPage();
    const { crewId, dayNumber, meta } = this.ctx;

    page.rect(0, 792, PAGE_W, PAGE_H - 792, COLORS.navy);
    page.rect(0, 783, PAGE_W, 9, COLORS.accentSoft);
    page.text("LIGHTMINUTE", M, 816, 16, 2, COLORS.white);
    page.text("Crew health decision support", M, 803, 7, 1, "#c5d2d5");
    page.text("PERSONAL BASELINE REPORT", PAGE_W - M, 812, 7.5, 2, COLORS.white, "right");
    page.text(
      `Mission day ${dayNumber} · Crew ${crewId}`,
      PAGE_W - M,
      800,
      7,
      1,
      "#c5d2d5",
      "right",
    );
    page.text(
      "SYNTHETIC DATA  ·  DECISION SUPPORT  ·  NOT A MEDICAL DEVICE  ·  NO DIAGNOSIS",
      PAGE_W / 2,
      786.5,
      5.6,
      2,
      COLORS.accent,
      "center",
    );

    if (continued) {
      page.text(
        `${meta.label} · Crew ${crewId} · Mission day ${dayNumber} (continued)`,
        M,
        754,
        8,
        1,
        COLORS.muted,
      );
      page.line(M, 747, PAGE_W - M, 747, COLORS.line);
      page.y = 732;
    } else {
      page.y = 762;
    }

    this.pages.push(page);
    return page;
  }

  public ensure(height: number) {
    if (this.current.y - height < BOTTOM) {
      this.current = this.newPage(true);
    }
  }

  public section(title: string, caption?: string) {
    this.ensure(58);
    this.current.y -= 12;
    this.current.rect(M, this.current.y - 9, 3, 11, COLORS.accent);
    this.current.text(title, M + 10, this.current.y, 10.5, 2, COLORS.ink);
    this.current.y -= 19;
    if (caption) {
      this.paragraph(caption, { size: 7.4, leading: 9.5, color: COLORS.muted });
      this.current.y -= 2;
    }
    this.current.y -= 8;
  }

  public paragraph(
    text: string,
    opts: {
      size?: number;
      leading?: number;
      color?: string;
      bold?: boolean;
      indent?: number;
      maxWidth?: number;
    } = {},
  ) {
    const size = opts.size ?? 8.2;
    const leading = opts.leading ?? 11;
    const color = opts.color ?? COLORS.ink2;
    const indent = opts.indent ?? 0;
    const maxWidth = opts.maxWidth ?? CONTENT_W - indent;
    const lines = wrapText(text, maxWidth, size, opts.bold === true);
    for (const line of lines) {
      this.ensure(leading);
      this.current.text(
        line,
        M + indent,
        this.current.y,
        size,
        opts.bold ? 2 : 1,
        color,
      );
      this.current.y -= leading;
    }
  }

  public bullet(marker: string, text: string, tone: string = COLORS.accent) {
    const indent = 18;
    const size = 8.2;
    const leading = 10.8;
    const lines = wrapText(text, CONTENT_W - indent, size, false);
    this.ensure(lines.length * leading + 4);
    this.current.text(marker, M, this.current.y, 7.4, 2, tone);
    let first = true;
    for (const line of lines) {
      if (!first) this.ensure(leading);
      this.current.text(line, M + indent, this.current.y, size, 1, COLORS.ink2);
      this.current.y -= leading;
      first = false;
    }
    this.current.y -= 3;
  }

  public table(headers: string[], widths: number[], rows: string[][]) {
    const pad = 6;
    const lineH = 10;
    const rowHeights = rows.map((cells) => {
      let maxLines = 1;
      cells.forEach((cell, index) => {
        const width = (widths[index] ?? 60) - pad * 2;
        maxLines = Math.max(maxLines, wrapText(cell, width, 7.7).length);
      });
      return Math.max(18, maxLines * lineH + 8);
    });
    const total = 19 + rowHeights.reduce((a, b) => a + b, 0);
    this.ensure(total + 6);

    const top = this.current.y;
    this.current.rect(M, top - 19, CONTENT_W, 19, COLORS.surface2, COLORS.line);
    let x = M;
    headers.forEach((header, index) => {
      const width = widths[index] ?? 60;
      this.current.text(header.toUpperCase(), x + pad, top - 13, 6.4, 2, COLORS.muted);
      x += width;
      if (index < headers.length - 1) {
        this.current.line(x, top, x, top - 19, COLORS.line, 0.5);
      }
    });
    this.current.y = top - 19;

    rows.forEach((cells, rowIndex) => {
      const height = rowHeights[rowIndex] ?? 18;
      if (rowIndex % 2 === 1) {
        this.current.rect(M, this.current.y - height, CONTENT_W, height, COLORS.surface);
      }
      let cellX = M;
      cells.forEach((cell, index) => {
        const width = widths[index] ?? 60;
        const lines = wrapText(cell, width - pad * 2, 7.7);
        let cellY = this.current.y - 12;
        lines.forEach((line) => {
          this.current.text(line, cellX + pad, cellY, 7.7, 1, COLORS.ink2);
          cellY -= lineH;
        });
        cellX += width;
        if (index < cells.length - 1) {
          this.current.line(cellX, this.current.y, cellX, this.current.y - height, COLORS.line, 0.5);
        }
      });
      this.current.line(M, this.current.y, PAGE_W - M, this.current.y, COLORS.line, 0.5);
      this.current.y -= height;
    });
    this.current.line(M, this.current.y, PAGE_W - M, this.current.y, COLORS.line);
    this.current.y -= 8;
  }

  public kpiRow(
    items: { label: string; value: string; sub: string; color?: string }[],
  ) {
    const gap = 8;
    const width = (CONTENT_W - gap * (items.length - 1)) / items.length;
    const height = 58;
    this.ensure(height + 10);
    const top = this.current.y;
    items.forEach((item, index) => {
      const x = M + index * (width + gap);
      this.current.rect(x, top - height, width, height, COLORS.surface, COLORS.line);
      this.current.rect(x, top - height, 3, height, item.color ?? COLORS.accent);
      this.current.text(item.label, x + 10, top - 14, 6.1, 2, COLORS.muted);
      const valueSize = item.value.length > 18 ? 10 : 13.5;
      this.current.text(
        truncate(item.value, width - 18, valueSize, true),
        x + 10,
        top - 34,
        valueSize,
        2,
        item.color ?? COLORS.ink,
      );
      this.current.text(
        truncate(item.sub, width - 18, 6.4),
        x + 10,
        top - 47,
        6.4,
        1,
        COLORS.muted,
      );
    });
    this.current.y = top - height - 14;
  }

  public callout(title: string, body: string, footnote: string, tone: string) {
    const bodyLines = wrapText(body, CONTENT_W - 24, 8);
    const footLines = footnote ? wrapText(footnote, CONTENT_W - 24, 6.6) : [];
    const height = 22 + bodyLines.length * 10 + footLines.length * 8.5 + 12;
    this.ensure(height + 8);
    const top = this.current.y;
    this.current.rect(M, top - height, CONTENT_W, height, COLORS.accentSoft, tone);
    this.current.rect(M, top - height, 3, height, tone);
    this.current.text(title, M + 14, top - 15, 8.4, 2, tone);
    let y = top - 28;
    for (const line of bodyLines) {
      this.current.text(line, M + 14, y, 8, 1, COLORS.ink2);
      y -= 10;
    }
    y -= 2;
    for (const line of footLines) {
      this.current.text(line, M + 14, y, 6.6, 1, COLORS.muted);
      y -= 8.5;
    }
    this.current.y = top - height - 14;
  }

  public footer() {
    const total = this.pages.length;
    this.pages.forEach((page, index) => {
      page.line(M, 62, PAGE_W - M, 62, COLORS.line);
      page.text("LIGHTMINUTE · Personal baseline report", M, 49, 6.5, 2, COLORS.ink2);
      page.text(
        "Synthetic data · Decision support · Not a medical device",
        PAGE_W / 2,
        49,
        6.3,
        1,
        COLORS.muted,
        "center",
      );
      page.text(`Page ${index + 1} of ${total}`, PAGE_W - M, 49, 6.5, 2, COLORS.ink2, "right");
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Chart rendering                                                            */
/* -------------------------------------------------------------------------- */

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const parts = dataUrl.split(",");
  const base64 = parts[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

async function renderTrendChartToJpeg(
  points: BandPoint[],
  selectedDay: number,
  meta: IndicatorMeta,
  earth: EarthRuleView | null | undefined,
  width = 1100,
  height = 360,
): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new Uint8Array();

  const usable = points.filter(
    (p): p is { day: number; reading: Reading } =>
      Boolean(p.reading) && Number.isFinite(p.reading?.value),
  );

  ctx.fillStyle = COLORS.surface;
  ctx.fillRect(0, 0, width, height);

  const padLeft = 66;
  const padRight = 26;
  const padTop = 44;
  const padBottom = 46;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const values: number[] = [];
  for (const p of usable) {
    values.push(p.reading.value);
    if (p.reading.ci95) values.push(p.reading.ci95[0], p.reading.ci95[1]);
  }
  if (earth?.low !== null && earth?.low !== undefined) values.push(earth.low);
  if (earth?.high !== null && earth?.high !== undefined) values.push(earth.high);
  if (values.length === 0) values.push(0, 100);

  let minVal = Math.min(...values);
  let maxVal = Math.max(...values);
  if (minVal === maxVal) {
    minVal -= 1;
    maxVal += 1;
  }
  const valuePad = (maxVal - minVal) * 0.12;
  minVal = Math.max(0, minVal - valuePad);
  maxVal += valuePad;

  const x = (index: number) =>
    padLeft + (usable.length > 1 ? (index / (usable.length - 1)) * plotW : plotW / 2);
  const y = (value: number) =>
    padTop + plotH - ((value - minVal) / (maxVal - minVal)) * plotH;

  ctx.font = "12px Helvetica, Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= 4; i++) {
    const val = minVal + (i / 4) * (maxVal - minVal);
    const gy = y(val);
    ctx.strokeStyle = "#dfe6df";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padLeft, gy);
    ctx.lineTo(width - padRight, gy);
    ctx.stroke();
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(val.toFixed(meta.decimals), padLeft - 12, gy);
  }

  ctx.fillStyle = COLORS.muted;
  ctx.font = "bold 11px Helvetica, Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(unitLabel(meta.unit), padLeft, 20);

  // Earth reference band or ceiling.
  if (earth && (earth.low !== null || earth.high !== null)) {
    const high = earth.high;
    const low = earth.low;
    if (high !== null && low !== null) {
      ctx.fillStyle = "rgba(161, 62, 120, 0.10)";
      ctx.fillRect(padLeft, y(high), plotW, Math.max(1, y(low) - y(high)));
      ctx.strokeStyle = "rgba(161, 62, 120, 0.55)";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.moveTo(padLeft, y(high));
      ctx.lineTo(width - padRight, y(high));
      ctx.moveTo(padLeft, y(low));
      ctx.lineTo(width - padRight, y(low));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = COLORS.magenta;
      ctx.font = "bold 11px Helvetica, Arial, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`Earth range · ${earthRangeText(earth, unitLabel(meta.unit), meta.decimals)}`, width - padRight, y(high) - 8);
    } else if (high !== null) {
      ctx.strokeStyle = "rgba(161, 62, 120, 0.6)";
      ctx.lineWidth = 1.4;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.moveTo(padLeft, y(high));
      ctx.lineTo(width - padRight, y(high));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = COLORS.magenta;
      ctx.font = "bold 11px Helvetica, Arial, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`Earth ceiling · ${high} ${unitLabel(meta.unit)}`, width - padRight, y(high) - 8);
    }
  }

  // Personal 95% band.
  if (usable.length > 0) {
    ctx.fillStyle = "rgba(0, 110, 115, 0.13)";
    ctx.beginPath();
    usable.forEach((p, index) => {
      const top = p.reading.ci95 ? p.reading.ci95[1] : p.reading.value;
      if (index === 0) ctx.moveTo(x(index), y(top));
      else ctx.lineTo(x(index), y(top));
    });
    for (let index = usable.length - 1; index >= 0; index--) {
      const p = usable[index];
      if (!p) continue;
      const bottom = p.reading.ci95 ? p.reading.ci95[0] : p.reading.value;
      ctx.lineTo(x(index), y(bottom));
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 110, 115, 0.35)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // Personal mean line.
  const baselinePoints = usable.filter((p) => typeof p.reading.baseline === "number");
  if (baselinePoints.length > 1) {
    ctx.strokeStyle = COLORS.lineStrong;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    baselinePoints.forEach((p, index) => {
      const px = x(usable.indexOf(p));
      const py = y(p.reading.baseline ?? p.reading.value);
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Observed trajectory.
  ctx.strokeStyle = COLORS.accent;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  usable.forEach((p, index) => {
    if (index === 0) ctx.moveTo(x(index), y(p.reading.value));
    else ctx.lineTo(x(index), y(p.reading.value));
  });
  ctx.stroke();

  usable.forEach((p, index) => {
    const px = x(index);
    const py = y(p.reading.value);
    const selected = p.day === selectedDay;
    if (selected) {
      ctx.fillStyle = "rgba(179, 64, 31, 0.18)";
      ctx.beginPath();
      ctx.arc(px, py, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.act;
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.white;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.fillStyle = COLORS.accent;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = selected ? COLORS.act : COLORS.muted;
    ctx.font = selected
      ? "bold 11px Helvetica, Arial, sans-serif"
      : "10px Helvetica, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(`D${p.day}`, px, height - 30);
  });

  const selected = usable.find((p) => p.day === selectedDay);
  if (selected) {
    const px = x(usable.indexOf(selected));
    const py = y(selected.reading.value);
    const label = `Day ${selected.day}: ${fmt(selected.reading.value, meta.decimals)} ${unitLabel(meta.unit)}`;
    ctx.font = "bold 12px Helvetica, Arial, sans-serif";
    const boxW = ctx.measureText(label).width + 20;
    const boxH = 26;
    const boxX = Math.min(width - padRight - boxW, Math.max(padLeft, px - boxW / 2));
    const boxY = Math.max(4, py - 44);
    ctx.fillStyle = COLORS.navy;
    roundRect(ctx, boxX, boxY, boxW, boxH, 5);
    ctx.fill();
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, boxX + boxW / 2, boxY + boxH / 2);
  }

  return dataUrlToBytes(canvas.toDataURL("image/jpeg", 0.94));
}

async function renderSyndromeChartToJpeg(
  syndrome: { day: number; z: number }[],
  selectedDay: number,
  width = 1100,
  height = 240,
): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new Uint8Array();

  ctx.fillStyle = COLORS.surface;
  ctx.fillRect(0, 0, width, height);

  const usable = syndrome.filter((p) => Number.isFinite(p.z));
  const padLeft = 52;
  const padRight = 26;
  const padTop = 22;
  const padBottom = 38;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxZ = Math.max(SYNDROME_ALERT_Z + 0.5, ...usable.map((p) => p.z), 1);
  const minZ = Math.min(-1, ...usable.map((p) => p.z));
  const x = (index: number) =>
    padLeft + (usable.length > 1 ? (index / (usable.length - 1)) * plotW : plotW / 2);
  const y = (z: number) => padTop + plotH - ((z - minZ) / (maxZ - minZ)) * plotH;

  ctx.strokeStyle = "#dfe6df";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padLeft, y(0));
  ctx.lineTo(width - padRight, y(0));
  ctx.stroke();

  ctx.strokeStyle = "rgba(179, 64, 31, 0.65)";
  ctx.lineWidth = 1.4;
  ctx.setLineDash([7, 5]);
  ctx.beginPath();
  ctx.moveTo(padLeft, y(SYNDROME_ALERT_Z));
  ctx.lineTo(width - padRight, y(SYNDROME_ALERT_Z));
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = COLORS.act;
  ctx.font = "bold 11px Helvetica, Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(
    `alert z ${SYNDROME_ALERT_Z.toFixed(2)} (demo parameter)`,
    width - padRight,
    y(SYNDROME_ALERT_Z) - 6,
  );

  ctx.fillStyle = COLORS.muted;
  ctx.font = "11px Helvetica, Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText("0", padLeft - 10, y(0));

  if (usable.length > 0) {
    ctx.fillStyle = "rgba(0, 110, 115, 0.14)";
    ctx.beginPath();
    ctx.moveTo(padLeft, y(0));
    usable.forEach((p, index) => ctx.lineTo(x(index), y(p.z)));
    ctx.lineTo(x(usable.length - 1), y(0));
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    usable.forEach((p, index) => {
      if (index === 0) ctx.moveTo(x(index), y(p.z));
      else ctx.lineTo(x(index), y(p.z));
    });
    ctx.stroke();

    const selectedIndex = usable.findIndex((p) => p.day === selectedDay);
    const index = selectedIndex >= 0 ? selectedIndex : usable.length - 1;
    const point = usable[index];
    if (point) {
      ctx.fillStyle = point.z >= SYNDROME_ALERT_Z ? COLORS.act : COLORS.accent;
      ctx.beginPath();
      ctx.arc(x(index), y(point.z), 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.white;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    usable.forEach((p, index) => {
      ctx.fillStyle = p.day === selectedDay ? COLORS.act : COLORS.muted;
      ctx.font = p.day === selectedDay
        ? "bold 10px Helvetica, Arial, sans-serif"
        : "9px Helvetica, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(`D${p.day}`, x(index), height - 27);
    });
  } else {
    ctx.fillStyle = COLORS.muted;
    ctx.font = "12px Helvetica, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("No syndrome score for this crew yet.", width / 2, height / 2);
  }

  return dataUrlToBytes(canvas.toDataURL("image/jpeg", 0.94));
}

/* -------------------------------------------------------------------------- */
/* Main export                                                                */
/* -------------------------------------------------------------------------- */

export async function generatePersonalBaselinePdf(
  params: BaselinePdfParams,
): Promise<GeneratedPdfResult> {
  const { scenario, dayNumber, crewId, indicator, meta, reading, earth, member, points, syndrome } =
    params;

  const role = crewRoles(scenario.doc)[crewId] ?? "Crew member";
  const scenarioTitle = scenario.doc.title ?? scenario.doc.name ?? "Mission scenario";
  const scenarioName = scenario.doc.name ?? "scenario";
  const card = member?.card;
  const pattern = reading.lens?.pattern ?? "routine";
  const patternTitle = humanise(pattern);
  const patternDesc = PATTERN_COPY[pattern] ?? "All available lenses agree for this reading.";
  const level = member?.level ?? "info";
  const levelCopy = LEVEL_COPY[level] ?? LEVEL_COPY.info;
  const unit = unitLabel(reading.unit ?? meta.unit);
  const cardSource = member?.card_source ?? "not available";
  const generatedUtc = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
  const reportId = `LM-BLR-${scenarioName}-C${crewId}-D${String(dayNumber).padStart(2, "0")}-${indicator}`
    .replace(/[^A-Za-z0-9-]/g, "-")
    .toUpperCase();

  const trendJpeg = await renderTrendChartToJpeg(points, dayNumber, meta, earth);
  const syndromeJpeg = await renderSyndromeChartToJpeg(syndrome, dayNumber);

  const doc = new PdfDocument();
  const trendImgName = doc.addImage(trendJpeg, 1100, 360);
  const syndromeImgName = doc.addImage(syndromeJpeg, 1100, 240);

  const ctx: ReportContext = {
    scenarioTitle,
    scenarioName,
    originLabel: scenario.originLabel,
    crewId,
    crewRole: role,
    dayNumber,
    meta,
    reading,
    earth,
    member,
    pattern,
    card,
    cardSource,
    reportId,
    generatedUtc,
  };

  const report = new ReportBuilder(ctx);
  const page1 = report.current;

  /* --------------------------------------------------------------- Page 1 */
  page1.text("PERSONAL BASELINE", M, 748, 7, 2, COLORS.accent);
  page1.text(meta.label, M, 724, 21, 2, COLORS.ink);
  page1.text(
    `Crew ${crewId} (${role}) · ${scenarioTitle}`,
    M,
    708,
    8.4,
    1,
    COLORS.muted,
  );
  page1.line(M, 699, PAGE_W - M, 699, COLORS.line);

  const metaColumns = [M, M + 168, M + 336];
  const metaItems: { label: string; value: string }[] = [
    { label: "Mission day", value: `Day ${dayNumber}` },
    { label: "Generated (UTC)", value: generatedUtc },
    { label: "Data source", value: scenario.originLabel },
    { label: "Scenario", value: scenarioTitle },
    { label: "Report ID", value: reportId },
    { label: "Card source", value: cardSource },
  ];
  metaItems.forEach((item, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = metaColumns[col] ?? M;
    const labelY = 687 - row * 22;
    page1.text(item.label.toUpperCase(), x, labelY, 6.1, 2, COLORS.muted);
    page1.text(
      truncate(item.value, 158, 7.0),
      x,
      labelY - 10,
      7.0,
      1,
      COLORS.ink2,
    );
  });
  page1.line(M, 649, PAGE_W - M, 649, COLORS.line);
  page1.y = 636;

  const baselineText =
    typeof reading.baseline === "number" && Number.isFinite(reading.baseline)
      ? `${fmt(reading.baseline, meta.decimals)} ${unit}`
      : "Not exposed";
  const bandText = reading.ci95
    ? `${fmtRange(reading.ci95, meta.decimals)} ${unit}`
    : "Not available";
  report.kpiRow([
    {
      label: "TODAY'S READING",
      value: `${fmt(reading.value, meta.decimals)} ${unit}`.trim(),
      sub: `Mission day ${dayNumber}`,
      color: COLORS.accent,
    },
    {
      label: "PERSONAL 95% BAND",
      value: bandText,
      sub: `${reading.n_seen ?? "—"} days observed`,
      color: COLORS.accent,
    },
    {
      label: "DEVIATION",
      value: `${fmtSigned(reading.z, 2)} z`,
      sub: `p = ${typeof reading.p === "number" ? reading.p.toFixed(3) : "—"}`,
      color: COLORS.accent,
    },
    {
      label: "URGENCY",
      value: levelCopy.label,
      sub: `Card: ${cardSource}`,
      color: levelColor(level),
    },
  ]);

  report.section("Measurement summary");
  report.table(
    ["Measure", "Value", "Source"],
    [150, 210, 143],
    [
      [`Today's reading (day ${dayNumber})`, `${fmt(reading.value, meta.decimals)} ${unit}`, "Engine reading"],
      ["Personal baseline mean", baselineText, "N-of-1 posterior"],
      ["95% personal band", bandText, "Student-t predictive"],
      ["Deviation from baseline", `${fmtSigned(reading.z, 2)} sigma`, "Before update"],
      ["Posterior p-value", typeof reading.p === "number" ? reading.p.toFixed(3) : "—", "Student-t predictive"],
      ["Days observed", String(reading.n_seen ?? "—"), "Conjugate update"],
      ["HRP risk family", humanise(reading.hrp_risk), "Reading metadata"],
      ["Hazard", humanise(reading.hazard), "Reading metadata"],
    ],
  );

  report.section(
    "Three-lens assessment",
    "Earth, space-adapted and personal rules are shown side by side. This report does not recompute any engine value.",
  );
  const earthVerdict = EARTH_LABEL[reading.lens?.earth ?? ""] ?? "No rule cited";
  const earthBasis = earth
    ? `${earthRangeText(earth, unit, meta.decimals)} · ${earth.status}` +
      (earth.source ? ` · ${earth.source}` : "")
    : "No cited Earth range for this indicator.";
  const spaceVerdict = SPACE_LABEL[reading.lens?.space ?? ""] ?? "No verified rule yet";
  const spaceBasis =
    reading.lens?.space === "no_rule" || !reading.lens?.space
      ? "No verified space-adapted rule for this indicator. No threshold is invented."
      : "Rule supplied by the engine for this mission context.";
  const personalVerdict = PERSONAL_LABEL[reading.lens?.personal ?? ""] ?? "No personal estimate";
  const personalBasis = reading.ci95
    ? `95% band ${fmtRange(reading.ci95, meta.decimals)} ${unit} · ${reading.n_seen ?? "—"} days observed.`
    : "No personal band available for this reading.";
  report.table(
    ["Lens", "Verdict", "Basis"],
    [96, 146, 261],
    [
      ["Earth rule", earthVerdict, earthBasis],
      ["Space-adapted", spaceVerdict, spaceBasis],
      ["Personal baseline", personalVerdict, personalBasis],
    ],
  );

  report.callout(
    `PATTERN · ${patternTitle.toUpperCase()}`,
    patternDesc,
    "Deterministic engine verdict. The explanation layer may clarify it but cannot change the level.",
    COLORS.accent,
  );

  /* --------------------------------------------------------------- Page 2 */
  report.current = report.newPage(true);
  report.section(
    "Longitudinal telemetry",
    `Last ${points.length} mission days for ${meta.label.toLowerCase()}. The shaded band is the personal 95% predictive interval; the dashed grey line is the learned baseline.`,
  );
  report.current.image(trendImgName, M, report.current.y - 158, CONTENT_W, 158);
  report.current.y -= 158 + 8;
  report.paragraph(
    `Figure 1. Observed ${meta.label.toLowerCase()} against the personal band and the cited Earth rule. The selected day is marked in coral.`,
    { size: 6.8, leading: 8.5, color: COLORS.muted },
  );
  report.current.y -= 4;

  report.section(
    "Combined syndrome score",
    `Four signals moving together are stronger evidence than one spike. The alert line is z ${SYNDROME_ALERT_Z.toFixed(2)} and is labelled a demo parameter in the knowledge base.`,
  );
  report.current.image(syndromeImgName, M, report.current.y - 112, CONTENT_W, 112);
  report.current.y -= 112 + 8;
  report.paragraph(
    "Figure 2. Directional syndrome score for this crew member. A value above the alert line is a pattern worth checking, not a diagnosis.",
    { size: 6.8, leading: 8.5, color: COLORS.muted },
  );

  report.section("Decision card");
  if (card) {
    report.paragraph(card.headline, { size: 11.5, leading: 14, bold: true, color: COLORS.ink });
    report.current.y -= 2;
    report.paragraph(
      `Level: ${levelCopy.label} · Confidence: ${card.confidence} · Source: ${cardSource}`,
      { size: 7.2, leading: 9, color: COLORS.muted, bold: true },
    );
    report.current.y -= 3;
    report.paragraph("What changed", { size: 7.2, leading: 9, bold: true, color: COLORS.accent });
    report.paragraph(card.what_changed, { size: 8.2, leading: 10.8 });
    report.paragraph("Why it matters", { size: 7.2, leading: 9, bold: true, color: COLORS.accent });
    report.paragraph(card.why_it_matters, { size: 8.2, leading: 10.8 });

    report.current.y -= 2;
    report.paragraph("Do now", { size: 7.2, leading: 9, bold: true, color: COLORS.accent });
    card.do_now.forEach((item, index) => {
      report.bullet(String(index + 1).padStart(2, "0"), item, COLORS.accent);
    });
  } else {
    report.paragraph("No decision card is available for this crew member on this mission day.");
  }

  /* --------------------------------------------------------------- Page 3 */
  report.current = report.newPage(true);
  report.section("Monitoring and escalation");
  report.paragraph("Monitor", { size: 7.2, leading: 9, bold: true, color: COLORS.watch });
  if (card?.monitor.length) {
    card.monitor.forEach((item) => report.bullet("-", item, COLORS.watch));
  } else {
    report.paragraph("No monitoring criteria in the card for this day.");
  }

  report.paragraph("Escalate if", { size: 7.2, leading: 9, bold: true, color: COLORS.escalate });
  if (card?.escalate_if.length) {
    card.escalate_if.forEach((item) => report.bullet("!", item, COLORS.escalate));
  } else {
    report.paragraph("No escalation criteria in the card for this day.");
  }

  const groundMessage = card?.ground_message ?? "No ground message for this day.";
  const budget = member?.routing?.message_budget_chars ?? 140;
  report.section("Message to ground");
  report.paragraph(
    `Queued with the card's routing metadata. Expected reply time: ${
      member?.routing ? fmtDelay(member.routing.expected_reply_s) : "not available"
    }. Message budget: ${budget} characters.`,
    { size: 7.4, leading: 9.5, color: COLORS.muted },
  );
  report.callout(
    `GROUND MESSAGE · ${groundMessage.length}/${budget} CHARACTERS`,
    groundMessage,
    "The verifier rejects any ground message above the character budget. Withheld fields never enter this report.",
    COLORS.accent,
  );

  report.section("Evidence and traceability");
  report.table(
    ["Field", "Value"],
    [130, 373],
    [
      ["Card citations", card?.citations.length ? card.citations.join(", ") : "No citations in this card."],
      ["Data classification", "Synthetic mission data · no personal identifiable health data"],
      ["Engine invariant", "The deterministic engine decides numbers and urgency; the explanation layer only explains."],
      ["Scenario source", scenario.originLabel],
      ["Report ID", reportId],
      ["Generated (UTC)", generatedUtc],
    ],
  );

  report.paragraph(
    "Limitations: this is a synthetic prototype for decision support. It is not a diagnosis, not a medical device and not a substitute for a flight surgeon. Personal baselines need several days of data before the personal lens judges; the UI shows a learning state until then. Cited evidence is listed in kb/evidence.yaml and is not reproduced in full here.",
    { size: 7.1, leading: 9.2, color: COLORS.muted },
  );
  report.callout(
    "SAFETY NOTICE",
    "Not a medical device. No diagnosis and no medication dose. Use mission protocols and escalate to the flight surgeon when the card says to.",
    "LIGHTMINUTE · NASA Space Apps Challenge 2026 prototype",
    COLORS.escalate,
  );

  report.section("Reproducibility and privacy");
  report.bullet(
    "01",
    "Every number in this report is rendered from the engine payload; the PDF layer does not recompute health values.",
  );
  report.bullet(
    "02",
    "PDF generation happens locally in the browser. The file is not uploaded and no account is required.",
  );
  report.bullet(
    "03",
    "Synthetic mission data only. No personal health identifiers are stored in this report.",
  );

  report.footer();

  for (const page of report.pages) {
    doc.addPage(page.commands.join("\n"), page.images);
  }

  const pdfBytes = doc.buildBytes();
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const filename = `LIGHTMINUTE_Personal_Baseline_Report_Crew${crewId}_Day${String(dayNumber).padStart(2, "0")}_${indicator}.pdf`;

  const download = () => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 150);
  };

  return {
    blob,
    url,
    filename,
    sizeBytes: pdfBytes.length,
    download,
  };
}
