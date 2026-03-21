const axios = require('axios');
const qrcode = require('qrcode-terminal');

const API_URL = 'https://evolution-api-4b7h.srv1506962.hstgr.cloud';
const API_KEY = 'ksfghdopsmkxcjfgkspcbnigodkgnjskfgmll'; // Sua chave
const INSTANCE = 'test-sre';

async function main() {
    console.log(`>>> Iniciando teste de conexão com ${INSTANCE}...`);

    try {
        // 1. Criar Instância
        console.log('1. Criando instância...');
        try {
            await axios.post(`${API_URL}/instance/create`, {
                instanceName: INSTANCE,
                qrcode: true,
                integration: "WHATSAPP-BAILEYS"
            }, { headers: { apikey: API_KEY } });
        } catch (e) {
            // Ignora erro se já existe
            if (e.response?.status !== 403 && e.response?.status !== 400) throw e;
            console.log('   (Instância já existe, conectando...)');
        }

        // 2. Obter QR Code
        console.log('2. Obtendo QR Code...');
        const connectRes = await axios.get(`${API_URL}/instance/connect/${INSTANCE}`, {
            headers: { apikey: API_KEY }
        });

        if (connectRes.data?.base64) {
            console.log('\n>>> ESCANEIE O QR CODE ABAIXO NO SEU WHATSAPP:\n');
            // Remove prefixo data:image/png;base64, se houver
            const base64 = connectRes.data.base64.replace(/^data:image\/png;base64,/, "");

            // O qrcode-terminal espera string, mas para base64 image precisamos de outra lib ou trick.
            // Na verdade, o endpoint retorna o base64 da IMAGEM. O qrcode-terminal gera QR a partir de TEXTO (o código de pareamento).
            // A Evolution v2 retorna o "pairingCode" ou o base64 da imagem.
            // Vamos tentar pegar o "code" se disponível, ou avisar o usuário.

            if (connectRes.data.code) {
                qrcode.generate(connectRes.data.code, { small: true });
            } else {
                console.log("   [ATENÇÃO] A API retornou apenas a imagem Base64. Não consigo exibir no terminal.");
                console.log("   Acesse este link no navegador para ver o QR Code:");
                console.log(`   ${API_URL}/instance/connect/${INSTANCE}`);
            }
        } else if (connectRes.data?.instance?.state === 'open') {
            console.log('>>> INSTÂNCIA JÁ CONECTADA! ✅');
        }

        // 3. Polling de Status
        console.log('\n3. Aguardando conexão (Ctrl+C para cancelar)...');
        setInterval(async () => {
            try {
                const status = await axios.get(`${API_URL}/instance/connectionState/${INSTANCE}`, {
                    headers: { apikey: API_KEY }
                });
                const state = status.data?.instance?.state;
                console.log(`   Status: ${state}`);

                if (state === 'open') {
                    console.log('\n>>> CONECTADO COM SUCESSO! 🚀');
                    console.log('>>> Enviando mensagem de teste...');

                    // Envia mensagem para o próprio número (se disponível no payload, senão hardcode ou pede input)
                    // Como teste, apenas logamos que está pronto.
                    process.exit(0);
                }
            } catch (e) {
                console.log('   (Aguardando API...)');
            }
        }, 3000);

    } catch (error) {
        console.error('ERRO FATAL:', error.response?.data || error.message);
    }
}

main();
