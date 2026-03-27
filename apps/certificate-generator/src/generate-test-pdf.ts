import { PdfService } from './services/pdf.service';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const service = new PdfService();
  const data = {
    name: 'JOSE MATHEUS MOTA',
    course: 'CURSO DE INTELIGÊNCIA ARTIFICIAL APLICADA',
    date: '24 DE MARÇO DE 2026',
  };

  try {
    console.log('Generating test certificate...');
    const pdfBuffer = await service.generateCertificate(data);
    const outputPath = path.join(__dirname, 'result_certificate.pdf');
    fs.writeFileSync(outputPath, pdfBuffer);
    console.log('Test certificate generated successfully at:', outputPath);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
