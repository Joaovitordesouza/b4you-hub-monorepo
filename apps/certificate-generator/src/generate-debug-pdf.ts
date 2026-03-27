import { DebugGridService } from './services/debug-grid.service';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const service = new DebugGridService();
  try {
    console.log('Generating debug grid...');
    const pdfBuffer = await service.generateDebugGrid();
    const outputPath = path.join(__dirname, 'debug_grid_result.pdf');
    fs.writeFileSync(outputPath, pdfBuffer);
    console.log('Debug grid generated successfully at:', outputPath);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
