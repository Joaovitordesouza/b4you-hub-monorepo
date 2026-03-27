import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

export class DebugGridService {
  private templatePath: string;

  constructor() {
    this.templatePath = path.join(__dirname, '../assets/base.pdf');
  }

  async generateDebugGrid(): Promise<Uint8Array> {
    if (!fs.existsSync(this.templatePath)) {
      throw new Error('Template not found for debug grid');
    }

    const templateBuffer = fs.readFileSync(this.templatePath);
    const pdfDoc = await PDFDocument.load(templateBuffer);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Draw horizontal lines and labels
    for (let y = 0; y <= height; y += 50) {
      firstPage.drawLine({
        start: { x: 0, y },
        end: { x: width, y },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      });
      firstPage.drawText(y.toString(), {
        x: 5,
        y: y + 2,
        size: 10,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    // Draw vertical lines and labels
    for (let x = 0; x <= width; x += 50) {
      firstPage.drawLine({
        start: { x, y: 0 },
        end: { x, y: height },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      });
      firstPage.drawText(x.toString(), {
        x: x + 2,
        y: 5,
        size: 10,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    // Draw a center line
    firstPage.drawLine({
        start: { x: width / 2, y: 0 },
        end: { x: width / 2, y: height },
        thickness: 1,
        color: rgb(1, 0, 0),
      });

    return await pdfDoc.save();
  }
}
