import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { PdfService } from './services/pdf.service';
import { DebugGridService } from './services/debug-grid.service';
import { StorageService } from './services/storage.service';

const app = express();
const port = process.env.PORT || 8080;
const pdfService = new PdfService();
const debugGridService = new DebugGridService();
const storageService = new StorageService();

const API_KEY = process.env.INTERNAL_API_KEY || 'b4you-internal-secret-key-v1';

// Authentication Middleware
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
  }

  const token = authHeader.split(' ')[1];
  if (token !== API_KEY) {
    return res.status(403).json({ error: 'Forbidden: Invalid API Key' });
  }

  next();
};

app.use(cors());
app.use(bodyParser.json());

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Protect all endpoints below this line
app.use(authMiddleware);

app.get('/debug-grid', async (req, res) => {
  try {
    const pdfBuffer = await debugGridService.generateDebugGrid();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=debug_grid.pdf');
    res.send(Buffer.from(pdfBuffer));
  } catch (error) {
    console.error('Error generating debug grid:', error);
    res.status(500).json({ error: 'Failed to generate debug grid' });
  }
});

app.post('/generate', async (req, res) => {
  try {
    const { name, course, date, objective } = req.body;

    if (!name || !course || !date) {
      return res.status(400).json({ error: 'Missing required fields: name, course, date' });
    }

    const pdfBuffer = await pdfService.generateCertificate(req.body);

    const downloadUrl = await storageService.uploadCertificate(pdfBuffer, course, name);

    return res.status(200).json({
      success: true,
      message: 'Certificate generated successfully',
      url: downloadUrl
    });

  } catch (error: any) {
    console.error('Error generating certificate:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Certificate generator service listening on port ${port}`);
});
