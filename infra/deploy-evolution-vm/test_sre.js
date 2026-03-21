const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:8080';
const INSTANCE_NAME = 'debug_final';

async function runTest() {
    console.log(`--- Iniciando Teste de Estresse (Node.js): ${INSTANCE_NAME} ---`);

    let API_KEY = '';
    try {
        const envContent = fs.readFileSync(path.join(process.env.HOME, 'deploy-evolution-vm/.env'), 'utf8');
        const match = envContent.match(/AUTHENTICATION_API_KEY=(.*)/);
        if (match) API_KEY = match[1].trim();
    } catch (e) {
        console.error('ERRO: Não foi possível ler o arquivo .env.');
        process.exit(1);
    }

    const headers = {
        'apikey': API_KEY,
        'Content-Type': 'application/json'
    };

    try {
        // 1. Criar
        console.log(`[1/3] Criando instância ${INSTANCE_NAME}...`);
        const createResp = await axios.post(`${BASE_URL}/instance/create`, {
            instanceName: INSTANCE_NAME,
            qrcode: true
        }, { headers });
        console.log(`Resposta Create: ${createResp.status}`);

        // 2. Delay
        console.log('[2/3] Aguardando 5 segundos para estabilização...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 3. Connect
        console.log('[3/3] Recuperando QR Code via /instance/connect...');
        const connectResp = await axios.get(`${BASE_URL}/instance/connect/${INSTANCE_NAME}`, { headers });
        
        if (connectResp.status === 200 && connectResp.data.base64) {
            console.log('\nSUCESSO: QR CODE GERADO EM BASE64!');
        } else {
            console.log(`\nFALHA: Resposta inesperada (Status ${connectResp.status})`);
            console.log(JSON.stringify(connectResp.data, null, 2));
        }
    } catch (e) {
        console.error(`\nERRO: ${e.message}`);
        if (e.response) {
            console.error('Detalhes:', JSON.stringify(e.response.data, null, 2));
        }
    }
}

runTest();
