import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

export interface ElementLayout {
  x?: number;
  y?: number;
  size?: number;
  align?: 'left' | 'center' | 'right';
}

export interface CertificateLayout {
  name: ElementLayout;
  course: ElementLayout;
  date: ElementLayout;
}

export interface CertificateData {
  name: string;
  course: string;
  date: string;
  objective?: string;
  layout?: CertificateLayout;
}

export class PdfService {
  private templatePath: string;

  constructor() {
    this.templatePath = path.join(__dirname, '../assets/base.pdf');
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
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Refinamento de texto (Title Case)
    const toTitleCase = (str: string) => 
        str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

    const refinedName = toTitleCase(data.name);
    const refinedCourse = data.course.toUpperCase().startsWith('CURSO DE') 
        ? toTitleCase(data.course.replace(/CURSO DE /i, ''))
        : toTitleCase(data.course);
    const refinedDate = data.date.toLowerCase();

    const layout = data.layout || {
      name: { y: 395, size: 32, align: 'center' },
      course: { y: 300, size: 20, align: 'center' },
      date: { x: 582, y: 76, size: 12, align: 'left' } // Simetria cravada: 421 + (421 - 260) = 582
    };

    // Helper para simular Flexbox (Justify Content)
    const getX = (text: string, size: number, currentFont: any, layoutObj: ElementLayout) => {
      const textWidth = currentFont.widthOfTextAtSize(text, size);
      const align = layoutObj.align || 'center';
      
      if (align === 'left') {
        return layoutObj.x !== undefined ? layoutObj.x : (width / 2) - (textWidth / 2);
      } else if (align === 'right') {
        return layoutObj.x !== undefined ? layoutObj.x - textWidth : (width / 2) - (textWidth / 2);
      } else { // center
        return layoutObj.x !== undefined ? layoutObj.x - (textWidth / 2) : (width / 2) - (textWidth / 2);
      }
    };

    // Drawing the name (Destaque Principal)
    firstPage.drawText(refinedName, {
      x: getX(refinedName, layout.name.size || 32, font, layout.name),
      y: layout.name.y || 395,
      size: layout.name.size || 32,
      font,
      color: rgb(0, 0, 0),
    });

    // Drawing the course (Hierarquia Secundária)
    firstPage.drawText(refinedCourse, {
      x: getX(refinedCourse, layout.course.size || 20, fontRegular, layout.course),
      y: layout.course.y || 300,
      size: layout.course.size || 20,
      font: fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });

    // Drawing the date (Discreta no Rodapé)
    firstPage.drawText(refinedDate, {
      x: getX(refinedDate, layout.date.size || 12, fontRegular, layout.date),
      y: layout.date.y || 76,
      size: layout.date.size || 12,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });

    if (data.objective) {
        const refinedObjective = toTitleCase(data.objective);
        firstPage.drawText(refinedObjective, {
            x: width / 2 - (fontRegular.widthOfTextAtSize(refinedObjective, 12) / 2),
            y: height / 2 - 120,
            size: 12,
            font: fontRegular,
            color: rgb(0.5, 0.5, 0.5),
          });
    }

    return await pdfDoc.save();
  }
}
