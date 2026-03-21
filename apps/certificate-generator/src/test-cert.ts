import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

async function testGenerate() {
  const url = 'http://localhost:8080/generate';
  const data = {
    name: 'João da Silva',
    course: 'Curso de Especialização em IA',
    date: '20 de Março de 2026',
    objective: 'Conclusão com excelência do módulo avançado.'
  };

  try {
    console.log('Sending request to', url);
    const response = await axios.post(url, data, {
      responseType: 'arraybuffer'
    });

    const outputPath = path.join(__dirname, 'test_certificate.pdf');
    fs.writeFileSync(outputPath, response.data);
    console.log('Certificate generated successfully:', outputPath);
  } catch (error: any) {
    if (error.response) {
      console.error('Error response:', error.response.status, error.response.data.toString());
    } else {
      console.error('Error:', error.message);
    }
  }
}

testGenerate();
