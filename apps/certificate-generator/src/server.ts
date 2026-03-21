import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { PdfService, CertificateData } from './services/pdf.service';

const app = express();
const port = process.env.PORT || 8080;
const pdfService = new PdfService();

app.use(cors());
app.use(bodyParser.json());

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.post('/generate', async (req, res) => {
  try {
    const { name, course, date, objective } = req.body;

    if (!name || !course || !date) {
      return res.status(400).json({ error: 'Missing required fields: name, course, date' });
    }

    const data: CertificateData = { name, course, date, objective };
    const pdfBuffer = await pdfService.generateCertificate(data);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=certificate_${name.replace(/\s+/g, '_')}.pdf`);
    res.send(Buffer.from(pdfBuffer));
  } catch (error) {
    console.error('Error generating certificate:', error);
    res.status(500).json({ error: 'Failed to generate certificate' });
  }
});

app.listen(port, () => {
  console.log(`Certificate generator service listening on port ${port}`);
});
