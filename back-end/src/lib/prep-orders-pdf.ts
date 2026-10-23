import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fontkit from '@pdf-lib/fontkit';
import {
  PDFDocument,
  type PDFFont,
  type PDFPage,
  rgb,
  type RGB,
} from 'pdf-lib';
import type { RestaurantPrepBatch } from './order-request-window.js';

export type PrepPdfMeal = {
  recipientName: string;
  workLocation?: string | null;
  notes: string | null;
  items: Array<{ itemName: string }>;
};

export type PrepPdfOrder = {
  orderCode: string;
  companyName: string;
  requesterName: string;
  fulfillmentType: 'PICKUP' | 'DELIVERY' | null;
  quantity: number;
  isSpecial?: boolean;
  meals: PrepPdfMeal[];
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.resolve(__dirname, '../../assets');

/** Verde da plataforma: hsl(152 51% 47%) */
const BRAND = rgb(59 / 255, 181 / 255, 124 / 255);
const BRAND_DARK = rgb(28 / 255, 110 / 255, 74 / 255);
const BRAND_SOFT = rgb(232 / 255, 246 / 255, 239 / 255);
const INK = rgb(8 / 255, 24 / 255, 32 / 255);
const MUTED = rgb(100 / 255, 116 / 255, 128 / 255);
const BORDER = rgb(226 / 255, 232 / 255, 236 / 255);
const WHITE = rgb(1, 1, 1);
const PAGE_BG = rgb(250 / 255, 251 / 255, 252 / 255);

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 36;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const HEADER_HEIGHT = 92;
const FOOTER_HEIGHT = 28;
const CARD_PAD = 22;
const CARD_GAP = 18;
const MEAL_GAP = 10;
function fulfillmentLabel(type: PrepPdfOrder['fulfillmentType']): string {
  if (type === 'DELIVERY') return 'Entrega';
  if (type === 'PICKUP') return 'Retirada';
  return 'Não informado';
}

function batchLabel(batch: RestaurantPrepBatch): string {
  return batch === 'morning' ? 'Lote da manhã' : 'Lote da tarde';
}

function formatBrDate(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function loadAsset(relativePath: string): Buffer {
  return readFileSync(path.join(ASSETS_DIR, relativePath));
}

type TextOpts = {
  font: PDFFont;
  size: number;
  color?: RGB;
  maxWidth?: number;
};

function wrapLines(text: string, opts: TextOpts): string[] {
  const maxWidth = opts.maxWidth ?? CONTENT_WIDTH;
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (opts.font.widthOfTextAtSize(next, opts.size) <= maxWidth) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function measureWrapped(text: string, opts: TextOpts, lineGap = 3): number {
  const lines = wrapLines(text, opts);
  return lines.length * (opts.size + lineGap) - lineGap;
}

export async function buildPrepOrdersPdf(input: {
  menuDateIso: string;
  batch: RestaurantPrepBatch;
  orders: PrepPdfOrder[];
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const font = await doc.embedFont(loadAsset('fonts/OpenSans-Regular.ttf'), {
    subset: true,
  });
  const fontBold = await doc.embedFont(loadAsset('fonts/OpenSans-Bold.ttf'), {
    subset: true,
  });

  const totalMeals = input.orders.reduce((sum, o) => sum + o.quantity, 0);
  const pages: PDFPage[] = [];

  function addPage(): PDFPage {
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      color: PAGE_BG,
    });
    return page;
  }

  let page = addPage();
  let y = PAGE_HEIGHT - MARGIN;

  function ensureSpace(needed: number) {
    const bottom = MARGIN + FOOTER_HEIGHT + 8;
    if (y - needed < bottom) {
      page = addPage();
      y = PAGE_HEIGHT - MARGIN;
      drawHeader();
    }
  }

  function drawTextAt(
    text: string,
    x: number,
    baseline: number,
    opts: TextOpts,
  ) {
    page.drawText(text, {
      x,
      y: baseline,
      size: opts.size,
      font: opts.font,
      color: opts.color ?? INK,
    });
  }

  function drawHeader() {
    const headerY = PAGE_HEIGHT - HEADER_HEIGHT;
    page.drawRectangle({
      x: 0,
      y: headerY,
      width: PAGE_WIDTH,
      height: HEADER_HEIGHT,
      color: BRAND,
    });
    page.drawRectangle({
      x: 0,
      y: headerY,
      width: 6,
      height: HEADER_HEIGHT,
      color: BRAND_DARK,
    });

    const textX = MARGIN + 8;

    drawTextAt('Marmita', textX, headerY + 60, {
      font: fontBold,
      size: 11,
      color: WHITE,
    });
    drawTextAt('Pedidos para impressão', textX, headerY + 38, {
      font: fontBold,
      size: 18,
      color: WHITE,
    });

    const subtitle = `${formatBrDate(input.menuDateIso)}  ·  ${batchLabel(input.batch)}  ·  ${input.orders.length} pedido(s)  ·  ${totalMeals} marmita(s)`;
    drawTextAt(subtitle, textX, headerY + 18, {
      font,
      size: 10,
      color: WHITE,
    });

    y = headerY - 24;
  }

  function estimateCardHeight(order: PrepPdfOrder): number {
    const innerWidth = CONTENT_WIDTH - CARD_PAD * 2 - 8;
    let h = CARD_PAD;
    h += 22; // badge + company row
    h += 10;
    h += 16; // meta
    h += 14; // divider
    for (const meal of order.meals) {
      const items = meal.items.map((i) => i.itemName).join(', ') || 'Sem itens';
      const nameW = fontBold.widthOfTextAtSize(`${meal.recipientName}:`, 10);
      h +=
        measureWrapped(items, {
          font,
          size: 10,
          maxWidth: Math.max(40, innerWidth - 16 - nameW - 4),
        }, 3) + MEAL_GAP;
      if (meal.workLocation?.trim()) {
        h += measureWrapped(`Local: ${meal.workLocation.trim()}`, {
          font,
          size: 9,
          maxWidth: innerWidth - 20,
        }, 2) + 4;
      }
      if (meal.notes?.trim()) {
        h += measureWrapped(`Obs.: ${meal.notes.trim()}`, {
          font,
          size: 9,
          maxWidth: innerWidth - 20,
        }, 3) + 4;
      }
    }
    h += CARD_PAD;
    return h;
  }

  function drawBadge(label: string, x: number, top: number): number {
    const size = 10;
    const padX = 8;
    const padY = 4;
    const w = fontBold.widthOfTextAtSize(label, size) + padX * 2;
    const h = size + padY * 2;
    page.drawRectangle({
      x,
      y: top - h,
      width: w,
      height: h,
      color: BRAND_SOFT,
      borderColor: BRAND,
      borderWidth: 0.8,
    });
    drawTextAt(label, x + padX, top - h + padY, {
      font: fontBold,
      size,
      color: BRAND_DARK,
    });
    return w;
  }

  function drawCard(order: PrepPdfOrder) {
    const height = estimateCardHeight(order);
    ensureSpace(height + CARD_GAP);
    const cardTop = y;
    const cardBottom = y - height;

    page.drawRectangle({
      x: MARGIN,
      y: cardBottom,
      width: CONTENT_WIDTH,
      height,
      color: WHITE,
      borderColor: BORDER,
      borderWidth: 1,
    });
    // Accent bar on the left
    page.drawRectangle({
      x: MARGIN,
      y: cardBottom,
      width: 4,
      height,
      color: BRAND,
    });

    let cy = cardTop - CARD_PAD;
    const contentX = MARGIN + CARD_PAD + 8;
    const innerWidth = CONTENT_WIDTH - CARD_PAD * 2 - 8;

    let badgeCursorX = contentX;
    const codeBadgeW = drawBadge(`#${order.orderCode}`, badgeCursorX, cy);
    badgeCursorX += codeBadgeW + 8;
    if (order.isSpecial) {
      const specialW = drawBadge('Especial', badgeCursorX, cy);
      badgeCursorX += specialW + 8;
    }
    const badgeW = badgeCursorX - contentX - 8;
    const company = order.companyName;
    const companySize = 12;
    const companyX = contentX + badgeW + 10;
    const companyMax = innerWidth - badgeW - 10;
    const companyLines = wrapLines(company, {
      font: fontBold,
      size: companySize,
      maxWidth: companyMax,
    });
    let companyY = cy - 14;
    for (const line of companyLines) {
      drawTextAt(line, companyX, companyY, {
        font: fontBold,
        size: companySize,
        color: INK,
      });
      companyY -= companySize + 2;
    }
    cy = Math.min(cy - 22, companyY) - 10;

    const meta = `Solicitante: ${order.requesterName}  ·  ${fulfillmentLabel(order.fulfillmentType)}  ·  ${order.quantity} marmita(s)`;
    const metaLines = wrapLines(meta, {
      font,
      size: 9.5,
      maxWidth: innerWidth,
    });
    for (const line of metaLines) {
      drawTextAt(line, contentX, cy - 9.5, {
        font,
        size: 9.5,
        color: MUTED,
      });
      cy -= 9.5 + 3;
    }
    cy -= 12;

    // Divider inside card
    page.drawLine({
      start: { x: contentX, y: cy },
      end: { x: MARGIN + CONTENT_WIDTH - CARD_PAD, y: cy },
      thickness: 0.6,
      color: BORDER,
    });
    cy -= 16;

    for (const meal of order.meals) {
      const items = meal.items.map((i) => i.itemName).join(', ') || 'Sem itens';
      // Bullet as filled circle (avoids unicode issues even with custom font)
      page.drawCircle({
        x: contentX + 3,
        y: cy - 6,
        size: 2.2,
        color: BRAND,
      });
      const namePart = `${meal.recipientName}:`;
      const nameW = fontBold.widthOfTextAtSize(namePart, 10);
      const mx = contentX + 10;
      drawTextAt(namePart, mx, cy - 10, {
        font: fontBold,
        size: 10,
        color: INK,
      });
      const itemLines = wrapLines(items, {
        font,
        size: 10,
        maxWidth: innerWidth - 12 - nameW - 4,
      });
      if (itemLines.length === 0) itemLines.push('Sem itens');
      drawTextAt(itemLines[0]!, mx + nameW + 4, cy - 10, {
        font,
        size: 10,
        color: INK,
      });
      cy -= 14;
      for (let i = 1; i < itemLines.length; i++) {
        drawTextAt(itemLines[i]!, mx + nameW + 4, cy - 10, {
          font,
          size: 10,
          color: INK,
        });
        cy -= 14;
      }

      if (meal.workLocation?.trim()) {
        const locLines = wrapLines(`Local: ${meal.workLocation.trim()}`, {
          font,
          size: 9,
          maxWidth: innerWidth - 20,
        });
        for (const line of locLines) {
          drawTextAt(line, contentX + 16, cy - 9, {
            font,
            size: 9,
            color: MUTED,
          });
          cy -= 9 + 3;
        }
      }

      if (meal.notes?.trim()) {
        const noteLines = wrapLines(`Obs.: ${meal.notes.trim()}`, {
          font,
          size: 9,
          maxWidth: innerWidth - 20,
        });
        for (const line of noteLines) {
          drawTextAt(line, contentX + 16, cy - 9, {
            font,
            size: 9,
            color: MUTED,
          });
          cy -= 9 + 3;
        }
      }
      cy -= MEAL_GAP;
    }

    y = cardBottom - CARD_GAP;
  }

  drawHeader();

  for (const order of input.orders) {
    drawCard(order);
  }

  // Footers on all pages
  const totalPages = pages.length;
  for (const [i, p] of pages.entries()) {
    p.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: FOOTER_HEIGHT + 10,
      color: PAGE_BG,
    });
    p.drawLine({
      start: { x: MARGIN, y: FOOTER_HEIGHT + 6 },
      end: { x: PAGE_WIDTH - MARGIN, y: FOOTER_HEIGHT + 6 },
      thickness: 0.6,
      color: BORDER,
    });
    p.drawText('Pedertractor & Tractorcomponents', {
      x: MARGIN,
      y: 12,
      size: 8.5,
      font: fontBold,
      color: BRAND_DARK,
    });
    const pageLabel = `Página ${i + 1} de ${totalPages}`;
    const pw = font.widthOfTextAtSize(pageLabel, 9);
    p.drawText(pageLabel, {
      x: PAGE_WIDTH - MARGIN - pw,
      y: 12,
      size: 9,
      font,
      color: MUTED,
    });
  }

  return doc.save();
}
