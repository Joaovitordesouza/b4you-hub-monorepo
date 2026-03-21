
import { CloudTasksClient } from '@google-cloud/tasks';

const PROJECT = process.env.GCP_PROJECT || 'b4you-hub';
const REGION = process.env.GCP_REGION || 'us-central1';
const QUEUE = 'evolution-sync';

async function testDefaultClient() {
    console.log('\n--- TESTANDO CLIENTE PADRÃO ---');
    try {
        const client = new CloudTasksClient();
        const parent = client.queuePath(PROJECT, REGION, QUEUE);
        console.log(`Parent: ${parent}`);
        // Tenta apenas listar filas para testar auth e conexão
        const [queues] = await client.listQueues({ parent: `projects/${PROJECT}/locations/${REGION}` });
        console.log(`✅ Sucesso! Filas encontradas: ${queues.length}`);
    } catch (error: any) {
        console.error('❌ Falha no cliente padrão:', error.message);
        if (error.response) {
             console.error('Response Status:', error.response.status);
             console.error('Response Data:', error.response.data);
        }
    }
}

async function testOptimizedClient() {
    console.log('\n--- TESTANDO CLIENTE OTIMIZADO (ATUAL) ---');
    try {
        const client = new CloudTasksClient({
            apiEndpoint: 'us-central1-cloudtasks.googleapis.com',
            fallback: 'rest'
        });
        const parent = client.queuePath(PROJECT, REGION, QUEUE);
        console.log(`Parent: ${parent}`);
        
        // Tenta criar uma task dummy (não vai processar nada pois a URL é fake)
        const task = {
            httpRequest: {
                httpMethod: 'POST' as const,
                url: 'https://example.com/fake',
            }
        };
        
        // Comenta a criação real para não sujar a fila, tenta apenas validar a conexão
        // Mas para validar o erro "Unexpected token <", precisamos tentar uma chamada real
        // Vamos tentar listar filas com esse cliente também
        const [queues] = await client.listQueues({ parent: `projects/${PROJECT}/locations/${REGION}` });
        console.log(`✅ Sucesso! Filas encontradas: ${queues.length}`);
        
    } catch (error: any) {
        console.error('❌ Falha no cliente otimizado:', error.message);
        console.error('Stack:', error.stack);
    }
}

async function run() {
    await testDefaultClient();
    await testOptimizedClient();
}

run();
