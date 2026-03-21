import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

export interface CertificateData {
  name: string;
  course: string;
  date: string;
  objective?: string;
}

export class PdfService {
  private templatePath: string;

  constructor() {
    this.templatePath = path.join(__dirname, '../../assets/template.pdf');
  }

  async generateCertificate(data: CertificateData): Promise<Uint8Array> {
    let pdfDoc: PDFDocument;

    if (fs.existsSync(this.templatePath)) {
      const templateBuffer = fs.readFileSync(this.templatePath);
      pdfDoc = await PDFDocument.load(templateBuffer);
    } else {
      // Fallback: Create a new PDF if template is missing (for initial testing)
      pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([842, 595]); // A4 Landscape
      page.drawText('CERTIFICATE OF COMPLETION', { x: 250, y: 500, size: 30 });
    }

    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Drawing the name
    firstPage.drawText(data.name, {
      x: width / 2 - (font.widthOfTextAtSize(data.name, 36) / 2),
      y: height / 2 + 50,
      size: 36,
      font,
      color: rgb(0, 0, 0),
    });

    // Drawing the course
    firstPage.drawText(data.course, {
      x: width / 2 - (font.widthOfTextAtSize(data.course, 24) / 2),
      y: height / 2 - 20,
      size: 24,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });

    // Drawing the date
    firstPage.drawText(data.date, {
      x: width / 2 - (font.widthOfTextAtSize(data.date, 16) / 2),
      y: height / 2 - 80,
      size: 16,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });

    if (data.objective) {
        firstPage.drawText(data.objective, {
            x: width / 2 - (font.widthOfTextAtSize(data.objective, 14) / 2),
            y: height / 2 - 120,
            size: 14,
            font,
            color: rgb(0.5, 0.5, 0.5),
          });
    }

    return await pdfDoc.save();
  }
}
